import { BaseIngredient, IngredientManager, IIngredient, DeploymentContext } from "@azbake/core"
import type { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class SqlDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }
    
    _helper?: ARMHelper;

    private getHelper(): ARMHelper {
        if (!this._helper) {
            const { ARMHelper } = require("@azbake/arm-helper");
            this._helper = new ARMHelper(this._ctx);
        }
        return this._helper!;
    }

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('SQL DB Logging: ' + this._ctx.Ingredient.properties.source)

            const helper = this.getHelper();
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            params = await helper.ConfigureDiagnostics(params);

            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error

        }
    }
}
