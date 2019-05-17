import fs from 'fs'
import { BaseIngredient, BakeVariable } from "@azbake/core"
import { promisify } from 'util';
import { exec as exec_from_child_process } from 'child_process';
import Replace from 'replace-in-file';
const exec = promisify(exec_from_child_process);

export class KubernetesPlugin extends BaseIngredient {
    
    public async Execute(): Promise<void> {
        try {
            let k8sYamlPath = await this._ingredient.properties.source.valueAsync(this._ctx);            
            if (!await promisify(fs.exists)(k8sYamlPath)){
                throw "file/path not found: " + k8sYamlPath
            }
            await this.replaceTokens(k8sYamlPath);
            let testDeployment = this._ingredient.properties.parameters.get("testDeployment");
            let k8sConfigPath = this._ingredient.properties.parameters.get("config");
            let configParam = "";
            if (k8sConfigPath){
                configParam = `--kubeconfig=${await k8sConfigPath.valueAsync(this._ctx)}`;
            }
            let { stdout } = await exec(`kubectl apply ${configParam} -f ${k8sYamlPath}`);
            this._logger.log(`stdout: ${stdout}`);
            if (testDeployment && await testDeployment.valueAsync(this._ctx)){
                ({ stdout } = await exec(`kubectl get ${configParam} services`));
                this._logger.log(`stdout: ${stdout}`);
                ({ stdout } = await exec(`kubectl.exe delete ${configParam} -f ${k8sYamlPath}`));
                this._logger.log(`stdout: ${stdout}`);
            }
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
    private async replaceTokens(path: any): Promise<void>{
        // TODO: If replacement goes global, instead of just k8s ingredient, then this next line seems bad
        // const fileTypesFilter = ["yaml","yml","json"] // from https://kubernetes.io/docs/concepts/configuration/overview/
        const openingDelimiter = "{{"
        const closingDelimiter = "}}"
        console.log(path);        
        if(await this.isDirectory(path)){
            path = path + "/*"
        }
        console.log(path);
        const envKeys : RegExp[] = []
        const envVals : string[] = []

        let upperedVars : Map<string, BakeVariable> = new Map<string, BakeVariable>()
        for (const [k,v] of this._ctx.Environment.variables) {
            upperedVars.set(k.toUpperCase(),v)
        }
        // Merge tokens. Tokens win in cases of clashing keys
        for (const [k,v] of this._ctx.Ingredient.properties.tokens) {
            upperedVars.set(k.toUpperCase(),v)
        }
        for (const [k,v] of upperedVars) {
            const value = await v.valueAsync(this._ctx)
            envKeys.push(new RegExp(openingDelimiter+k+closingDelimiter,"g"))
            envVals.push(value || "")
        }
        const options = {
            files: path,
            from: envKeys,
            to: envVals,
            // allowEmptyPaths: true,
        };
        try {
            await Replace(options)
        }
        catch (error) {
            this._logger.error('Error occurred:', error)
        }
    }
    private async isDirectory(path: any): Promise<boolean>{
        return (await promisify(fs.lstat)(path)).isDirectory()
    }
}