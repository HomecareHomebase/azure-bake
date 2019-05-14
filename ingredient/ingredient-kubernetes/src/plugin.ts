import { BaseIngredient, IngredientManager } from "@azbake/core"
import { promisify } from 'util';
import { exec as exec_from_child_process } from 'child_process';
const exec = promisify(exec_from_child_process);

export class KubernetesPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let k8sYamlPath = await this._ingredient.properties.source.valueAsync(this._ctx);
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
}