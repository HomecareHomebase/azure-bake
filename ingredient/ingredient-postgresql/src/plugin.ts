import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
// import ARMTemplate from "./arm.json"

export class PostgreSQLDB extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.source)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}