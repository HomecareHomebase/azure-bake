import fs from 'fs'
import path from 'path'
import { BaseIngredient, BakeVariable, IngredientManager, TagGenerator } from "@azbake/core"
import { promisify } from 'util';
import { exec as exec_from_child_process, execSync } from 'child_process';
const replace = require('replace-in-file');
const YAML = require('yaml');
const YAMLTYPES = require('yaml/types');
const retryCount = 3;
var baseRetryDelay = 10000;

const exec = promisify(exec_from_child_process);

export class KubernetesPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {

        //k8s only executes against the primary/first region.. ignore all other regions
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
        if (!util.current_region_primary()) {
            return
        }

        let kubeConfigParam;

        const kubeconfigFilename = Math.random().toString(36).substring(7) + '.yaml'
        try {

            //store the config file as an env var so that it can be used by utils
            process.env.BAKE_KCONFIG = kubeconfigFilename;

            let k8sYamlPath = await this._ingredient.properties.source.valueAsync(this._ctx);
            if (!await promisify(fs.exists)(k8sYamlPath)) {
                throw "file/path not found: " + k8sYamlPath
            }

            kubeConfigParam = await this.getKubeConfigParameter(kubeconfigFilename);
            let retryDelay = baseRetryDelay;

            await this.replaceTokens(k8sYamlPath);
            await this.addTagsAsMetadata(k8sYamlPath);
            await this.debugLog(k8sYamlPath);

            let currentRetry = 0;

            let retryErrors = this._ingredient.properties.parameters.get("retryErrors") || false;

            if (retryErrors)
            {
                for (;;)
                {
                    try {                        
                        await this.ExecuteKubeCtl(k8sYamlPath, kubeConfigParam);
    
                        break;                                    
                    } 
                    catch (error)
                    {
                        currentRetry++;
                        this._logger.warn('retrying in ' + retryDelay / 1000 + ' seconds due to: ' + error)
    
                        if (currentRetry > retryCount )
                        {
                            throw error;
                        }
    
                        await this.Sleep(retryDelay)
    
                        //Back off 10s, 30s, 70s
                        retryDelay = retryDelay * 2 + baseRetryDelay
                    }                
                }
            }
            else
            {
                await this.ExecuteKubeCtl(k8sYamlPath, kubeConfigParam);
            }            
        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
        finally {
            if (kubeConfigParam) {
                try {
                    await promisify(fs.unlink)(kubeconfigFilename)
                } catch (error) {
                    this._logger.error(error)
                }
            }
        }        
    }

    private async ExecuteKubeCtl(k8sYamlPath: any, kubeConfigParam: any): Promise<void> {
        let testDeployment = this._ingredient.properties.parameters.get("testDeployment");
        let deleteDeployment = this._ingredient.properties.parameters.get("deleteDeployment");
        let kubectlFlags = this._ingredient.properties.parameters.get("kubectlFlags");

        let flags = kubectlFlags ? await kubectlFlags.valueAsync(this._ctx) : "";

        let execString = `kubectl apply ${kubeConfigParam} -f ${k8sYamlPath} ${flags}`;
        if (deleteDeployment && await deleteDeployment.valueAsync(this._ctx)){
            execString = `kubectl delete ${kubeConfigParam} -f ${k8sYamlPath} --ignore-not-found=true ${flags}`;
        }

        const stdout = execSync(execString);
        this._logger.log(`${stdout}`);
        if (testDeployment && await testDeployment.valueAsync(this._ctx)) {
            const stdout = execSync(`kubectl.exe delete ${kubeConfigParam} -f ${k8sYamlPath}`);
            this._logger.log(`${stdout}`);
        }

        let delaymsParam = this._ingredient.properties.parameters.get("delayms") || undefined;

        if (delaymsParam)
        {
            let delayms: number = await delaymsParam.valueAsync(this._ctx);
            if (delayms > 0 )
            {
                this._logger.log('Waiting for a delay of ' + delayms + "ms");
                await this.Sleep(delayms);
            }
                
        }
    }

    private async debugLog(path: any): Promise<void> {

        this._logger.debug("Dumping content of: " + path);
        var fileList: string[] = []
        if (await this.isDirectory(path)) {
            fileList = this.getAllFiles(path, /\.yaml$/, fileList);
        }
        else {
            fileList.push(path)
        }

        fileList.forEach( async (file)=> {

            this._logger.debug("YAML [" + file +"] content before publish")
            const fileData = fs.readFileSync(file, 'utf8');
            this._logger.debug(fileData)
        })
        
        this._logger.debug("Finished debug content dump");
    }

    private async addTagsAsMetadata(path: any): Promise<void> {

        const tagGen = new TagGenerator(this._ctx);
        const tags = tagGen.GenerateTags();

        var fileList: string[] = []
        if (await this.isDirectory(path)) {
            fileList = this.getAllFiles(path, /\.yaml$/, fileList);
        }
        else {
            fileList.push(path)
        }

        fileList.forEach( async (file)=> {
            this.addTagsToFile(file, tags)
        })
    }

    private addTagsToFile(file: string, tags: any): void {

        this._logger.log("Adding tag annotations to: " + file);
        const fileData = fs.readFileSync(file, 'utf8');
        const docs = YAML.parseAllDocuments(fileData);

        let fileContent = "";

        docs.forEach((doc: any) => {
            
            if (doc.contents == null){
                return;
            }

            this.addTagsToYamlDocument(doc, tags)

            //check for doc errors
            if (doc.errors.length > 0) {

                doc.errors.forEach((error: any)=> {
                    error.makePretty();
                    this._logger.error("YAML error: " + error.message);
                })
            }

            const yamlContent = doc.toString();
            fileContent += yamlContent;
            fileContent += '\r\n---\r\n'
        });

        fs.writeFileSync(file, fileContent);
    }


    private addTagsToYamlDocument(doc: any, tags: any): void {
        const docKind = this.getMapValue(doc.contents, 'kind').value.toLowerCase();

        //configmaplist doesn't support annotations since it supports listmeta rather than objectmeta.
        //Apply annotations to the configmaps within the configmaplist instead.
        if (docKind == "configmaplist") {
            var configMapListItems = this.getMapValue(doc.contents, 'items');

            configMapListItems.items.forEach((item: any) => {
                this.addAnnotations(item, tags);
            });
        }
        else {
            this.addAnnotations(doc.contents, tags);

            if (docKind == "deployment") {
                const template = this.getMapValue(this.getMapValue(doc.contents, 'spec'), 'template');
                this.addAnnotations(template, tags);
            }
        }
        

    }

    private addAnnotations(map: any, tags: any) {

        let metadataProp = this.getOrCreateYamlObject(map, 'metadata');
        let annotationProp = this.getOrCreateYamlObject(metadataProp.value, 'annotations');

        for(const property in tags) {
            const value = tags[property];
            this.addAnnotation(annotationProp.value, property, value);
        }
    }

    private getMapValue(map: any, key: string) {
        let kindProp: any = null;
        map.items.forEach((prop: any)=> {
            if (prop.key.value.toLowerCase() == key){
                kindProp = prop;
            }
        });
        if (kindProp == null) return null;
        return kindProp.value;
    }

    private addAnnotation(map: any, name: string, value: string) {
        const annotationHeader = "bake.tag/";
        const annotationName = annotationHeader + name.toLocaleLowerCase();

        let annotation: any = null
        map.items.forEach((prop: any)=>{
            if (prop.key.value.toLowerCase() == annotationName) {
                annotation = prop;
            }
        })

        if (annotation == null) {
            annotation = new YAMLTYPES.Pair(new YAMLTYPES.Scalar(annotationName), new YAMLTYPES.Scalar(value));
            map.items.push(annotation);
        }
        else {
            annotation.value.value = value;
        }
    }

    private getOrCreateYamlObject(map: any, key: string): any {
        let yamlProp: any = null;
        map.items.forEach((prop: any)=> {
            if (prop.key.value.toLowerCase() == key){
                yamlProp = prop;
            }
        });

        if (yamlProp == null) {
            yamlProp = new YAMLTYPES.Pair(new YAMLTYPES.Scalar(key),new YAMLTYPES.YAMLMap({}));
            yamlProp.key.type = 'PLAIN';
            map.items.push(yamlProp);
        }

        if (yamlProp.value == null) {
            yamlProp.value = new YAMLTYPES.YAMLMap({});
        }

        return yamlProp;
    }

    private getAllFiles(dir: any, filter: RegExp, fileList : string[] = []) : string[] {
        const files = fs.readdirSync(dir);
        files.forEach((file)=> {
            
            const filePath = path.join(dir, file);
            const fileStat = fs.lstatSync(filePath);

            if (fileStat.isDirectory()) {
                this.getAllFiles(filePath, filter, fileList);
            }
            else if (filter.test(file))
            {
                fileList.push(filePath);
            }
        });
        return fileList;
    }

    private async getKubeConfigParameter(kubeconfigFilename: string) {
        let configParam = "";
        let b64KubeConfigContent = this._ingredient.properties.parameters.get("kubeconfig");
        if (b64KubeConfigContent) {
            let kubeConfigContent = Buffer.from(await b64KubeConfigContent.valueAsync(this._ctx), 'base64').toString('ascii');
            try {
                await promisify(fs.writeFile)(kubeconfigFilename, kubeConfigContent);
            }
            catch (error) {
                this._logger.log(JSON.stringify(error, null, 2))
            }
            configParam = `--kubeconfig=${kubeconfigFilename}`
        }
        return configParam;
    }

    private async replaceTokens(path: any): Promise<void> {
        const openingDelimiter = "{{"
        const closingDelimiter = "}}"
        // If path is a directory, put a glob selector on it
        if (await this.isDirectory(path)) {
            path = path + "/*"
        }

        const upperedVars: Map<string, BakeVariable> = new Map<string, BakeVariable>()
        for (const [k, v] of this._ctx.Environment.variables) {
            upperedVars.set(k.toUpperCase(), v)
        }
        // Merge tokens. Tokens win in cases of clashing keys
        for (const [k, v] of this._ctx.Ingredient.properties.tokens) {
            upperedVars.set(k.toUpperCase(), v)
        }
        const envKeys: RegExp[] = []
        const envVals: string[] = []
        for (const [k, v] of upperedVars) {
            const value = await v.valueAsync(this._ctx)
            envKeys.push(new RegExp(openingDelimiter + k + closingDelimiter, "g"))
            envVals.push(value || "")
        }
        const options = {
            files: path,
            from: envKeys,
            to: envVals,
            allowEmptyPaths: true
        }
        try {
            const results = replace.sync(options);
        }
        catch (error) {
            this._logger.error('Error occurred:', error)
        }
    }
    private async isDirectory(path: any): Promise<boolean> {
        return (await promisify(fs.lstat)(path)).isDirectory()
    }

    private Sleep(ms: number) : Promise<void> {
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }
}