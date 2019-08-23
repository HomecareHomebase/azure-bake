import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class PowershellDsc extends BaseIngredient {
  public async Execute(): Promise<void> {
    try {
      let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
      let vmext = IngredientManager.getIngredientFunction("vmextensionsutility", this._ctx)
      const helper = new ARMHelper(this._ctx)
      let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
      this._logger.log(`Getting params`)
      let settings: any = params['settings'] ? params['settings'].value : undefined
      let protectedSettings: any = params['protectedSettings'] ? params['protectedSettings'].value : undefined
      let resources: any = ARMTemplate.resources
      //Inject settings object into the template      
      if (settings) {
        resources[0].properties.settings = {}
        let values = settings
        let keys = Object.keys(values)
        this._logger.log(`Properties keys: ${keys}`)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]          
          //Add sub object to primary object
          if (values[key] === '[object Object]') {            
            let subkeys = Object.keys(values[key])
            let subValues = values[key]
            this._logger.log(subkeys)
            for (let j = 0; j < subkeys.length; j++) {
              let subkey = subkeys[j]
              resources[0].properties.settings[key][subkey] = subValues[subkey]
            }
          }        
          else {
            resources[0].properties.settings[key] = values[key]            
          }
        }
        //Remove object from parameters to keep deployment eval from failing
        delete params['settings']
      }
      //Inject protectedsettings object into the template
      if (protectedSettings) {
        resources[0].properties.protectedSettings = {}
        let values = protectedSettings
        let keys = Object.keys(values)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]          
          //Add sub object to primary object
          if (values[key] === '[object Object]') {
            let subkeys = Object.keys(values[key])
            let subValues = values[key]
            for (let j = 0; j < subkeys.length; j++) {
              let subkey = subkeys[j]
              resources[0].properties.protectedSettings[key][subkey] = subValues[subkey]
            }
          }
          else {
            resources[0].properties.protectedSettings[key] = values[key]
          }
        }
        //Remove object from parameters to keep deployment eval from failing
        delete params['protectedSettings']
      }
      ARMTemplate.resources = resources      
      await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
    } catch (error) {
      this._logger.error('deployment failed: ' + error)
      throw error
    }
  }
}