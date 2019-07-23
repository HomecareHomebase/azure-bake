import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import  ARMTemplate  from "./arm.json"
import { utils } from "mocha";

export class VirtualMachineExtensions extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Virtual Machine Extensions Plugin Logging: ' + this._ingredient.properties.source)

            let vmext = IngredientManager.getIngredientFunction("vmextensionsutility", this._ctx)
           let value = await vmext.get('test-rg','CustomScript')
           this._logger.log(value)
            
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}