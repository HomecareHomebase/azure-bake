import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core";
import { ResourceManagementClient } from "@azure/arm-resources"

export class WebAppContainer extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)        
    }

    public async Execute(): Promise<void> {
        // try {
            // let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            // this._logger.log('Custom Plugin Logging: ' + this._ingredient.properties.source)
        // } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}