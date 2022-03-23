import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./FlexibleServerArm.json" // TODO? enable Single Server

export class PostgreSQLDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
        this._helper = new ARMHelper(this._ctx);
    }

    _helper: ARMHelper;

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.source)

            let params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            params = await this._helper.ConfigureDiagnostics(params);

            await this._helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}