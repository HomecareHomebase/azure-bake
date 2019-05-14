import { BaseIngredient, IngredientManager } from "@azbake/core"

export class FunctionAppPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Function App Plugin Logging: ' + this._ingredient.properties.source)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}