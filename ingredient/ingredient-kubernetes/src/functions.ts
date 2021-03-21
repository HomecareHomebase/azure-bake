import {BaseUtility, IngredientManager} from '@azbake/core';
import { exec as exec_from_child_process, execSync } from 'child_process';


export class K8sUtils extends BaseUtility {
    public configmap(path: string, name: string, namespace: string): string {

        const kubeconfigFilename = process.env.BAKE_KCONFIG;
        if (!kubeconfigFilename) {
            this.context._logger.error("kube config not setup (configmap() only works within the kubernetes ingredient plugin execution")
            throw "kube config not setup (configmap() only works within the kubernetes ingredient plugin execution";
        }

        const configParam = `--kubeconfig=${kubeconfigFilename}`;
        
        try {
            const stdout = execSync(`kubectl configmap ${configParam} ${name} --from-file=${path} --namespace ${namespace}`);
            this.context._logger.log(`${stdout}`);
        } catch (error) {
            this.context._logger.error('deployment failed: ' + error)
            throw error
        }
        
        return name;
    }
    
}

