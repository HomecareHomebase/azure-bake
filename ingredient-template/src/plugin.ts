import { BaseIngredient, IngredientManager } from "@azbake/core"

export class MyCustomPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Custom Plugin Logging: ' + this._ingredient.properties.source)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}