import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import  ARMTemplate  from "./arm.json"
import { utils } from "mocha";

export class VirtualMachineExtensions extends BaseIngredient {
import ARMTemplate from "./arm.json"

export class AzureVMExtension extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Virtual Machine Extensions Plugin Logging: ' + this._ingredient.properties.source)

            let vmext = IngredientManager.getIngredientFunction("vmextensionsutility", this._ctx)
            let value = await vmext.get('test-rg','testvm101','CustomScript')
            this._logger.log('get :' + JSON.stringify(value))
            
            value = await vmext.list('test-rg','testvm101')
            this._logger.log('list :' + JSON.stringify(value))
                        
           // value = await vmext.delete('test-rg','testvm101','CustomScript')
           // this._logger.log('list :' + JSON.stringify(value))
            
            this._logger.log('Azure VM Extension Logging: ' + this._ingredient.properties.source)
            const helper = new ARMHelper(this._ctx)
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            this._ctx._logger.log(`params ${Object.keys(params.settings)}`)

            //stuff to modify ARMTemplate
            let settings = params['settings'].value || undefined
            let protectedSettings: any = params['protectedSettings'].value || undefined

            let resources: any = ARMTemplate.resources

            if(settings)
            {
              let values = settings
              let keys = Object.keys(values)
              for (let i = 0; i < keys.length; i++)
              {
                let key = keys[i]
                //add the settings to ARMTemplate
                this._ctx._logger.log(`${Object.keys(resources[0].properties)}`)
                resources[0].properties.settings[key] = values[key]
              }
            }

            if(protectedSettings)
            {
              let values = protectedSettings
              let keys = Object.keys(values)
              for (let i = 0; i < keys.length; i++)
              {
                let key = keys[i]
                //add the settings to ARMTemplate
                resources[0].properties.protectedSettings[key] = values[key]
              }
            }

            ARMTemplate.resources = resources

            // await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            this._ctx._logger.log(`ARMTemplate ${JSON.stringify(ARMTemplate)}`)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}