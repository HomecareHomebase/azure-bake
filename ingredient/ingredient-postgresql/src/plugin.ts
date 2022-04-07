import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import PublicAccessARMTemplate from "./PublicAccessArm.json" 
import PrivateAccessARMTemplate from "./PrivateAccessArm.json"

export class PostgreSQLDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
        this._helper = new ARMHelper(this._ctx);
    }

    _helper: ARMHelper;

    public async Execute(): Promise<void> {
        try {
            var params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            var ARMTemplate = (params.access.value == "public") ? PublicAccessARMTemplate
                : (params.access.value == "private") ? PrivateAccessARMTemplate
                : null;
            
            if (ARMTemplate == null) throw new Error("Parameter 'access' must be set to \"public\" or \"private\".");
        } catch (error){
            this._logger.error('Bake validation failed: ' + error)
            throw error;
        }

        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.parameters)

            await this._helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())

        } catch(error){
            this._logger.error('Deployment failed: ' + error)
            throw error
        }
    }
}