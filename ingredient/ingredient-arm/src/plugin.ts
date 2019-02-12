import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core";
import * as fs from 'fs'
// import { ResourceManagementClient } from "@azure/arm-resources"
import { ARMHelper } from "@azbake/arm-helper";


export class CustomArmIngredient extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)        
    }

    public async Execute(): Promise<void> {

        let source: string = this._ingredient.properties.source.value(this._ctx)
        let chk = fs.existsSync(source)
        if (!chk) {
            this._logger.error('could not locate arm template: ' + source)
            return
        }

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

        try {

            this._logger.log('deployment for custom arm template: ' + source)

            const helper = new ARMHelper(this._ctx)

            //build the properties as a standard object.
            let props = helper.BakeParamsToARMParams(this._name, this._ingredient.properties.parameters)

            let buffer = fs.readFileSync(source)
            let contents = buffer.toString()
            await helper.DeployTemplate(this._name, JSON.parse(contents), props, util.resource_group());

        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }

    }
}