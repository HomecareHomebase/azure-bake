import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import LinuxTemplate from "./linux.json"
import WinTemplate from "./windows.json"
export class AzureVm extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Azure VM Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            let osType = params['osType'] || ''
            let winMatch = new RegExp(/windows/ig)
            let linuxMatch = new RegExp(/linux/ig)            
            if (winMatch.exec(osType)) { 
                this._logger.log(`Deploying a Windows VM: ${winMatch.exec(osType)}`)
                await helper.DeployTemplate(this._name, WinTemplate, params, await util.resource_group()) }
            else if (linuxMatch.exec(osType)) {                 
                this._logger.log(`Deploying a Windows VM: ${linuxMatch.exec(osType)}`)
                await helper.DeployTemplate(this._name, WinTemplate, params, await util.resource_group()) }
            else { await helper.DeployTemplate(this._name, WinTemplate, params, await util.resource_group()) }
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}