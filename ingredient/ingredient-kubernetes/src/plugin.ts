import fs from 'fs'
import { BaseIngredient, BakeVariable, IngredientManager } from "@azbake/core"
import { promisify } from 'util';
import { exec as exec_from_child_process } from 'child_process';
const replace = require('replace-in-file');

const exec = promisify(exec_from_child_process);

export class KubernetesPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {

        //k8s only executes against the primary/first region.. ignore all other regions
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
        if (!util.current_region_primary()) {
            return
        }

        const kubeconfigFilename = Math.random().toString(36).substring(7) + '.yaml'
        try {
            let k8sYamlPath = await this._ingredient.properties.source.valueAsync(this._ctx);
            if (!await promisify(fs.exists)(k8sYamlPath)) {
                throw "file/path not found: " + k8sYamlPath
            }
            await this.replaceTokens(k8sYamlPath);
            let testDeployment = this._ingredient.properties.parameters.get("testDeployment");
            let kubeConfigParam = await this.getKubeConfigParameter(kubeconfigFilename);
            try {
                let { stdout } = await exec(`kubectl apply ${kubeConfigParam} -f ${k8sYamlPath}`);
                this._logger.log(`${stdout}`);
                if (testDeployment && await testDeployment.valueAsync(this._ctx)) {
                    ({ stdout } = await exec(`kubectl.exe delete ${kubeConfigParam} -f ${k8sYamlPath}`));
                    this._logger.log(`${stdout}`);
                }
            } finally {
                if (kubeConfigParam) {
                    try {
                        await promisify(fs.unlink)(kubeconfigFilename)
                    } catch (error) {
                        this._logger.error(error)
                    }
                }
            }
        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
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
}