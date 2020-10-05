import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./CosmosServerless.json" 
import ARMTemplateSingle from "./CosmosServerlessSingleRegion.json"
import stockAlerts from "./stockAlerts.json" 


export class CosmosDb extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('CosmosDb Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);
            //build the properties as a standard object.
            let armParameters = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            armParameters = await helper.ConfigureDiagnostics(armParameters);
            if(armParameters["secondaryRegion"])
            {
                await helper.DeployTemplate(this._name, ARMTemplate, armParameters, await util.resource_group());
            }
            else
            {
                await helper.DeployTemplate(this._name, ARMTemplateSingle, armParameters, await util.resource_group());
            }          
// TODO : Add alerts 


        } catch(error){
            this._logger.error('CosmosDb deployment failed: ' + error)
            throw error
        }

    }
}
