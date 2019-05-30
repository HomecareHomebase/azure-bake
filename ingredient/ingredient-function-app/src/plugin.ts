import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class FunctionAppPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('Function App Plugin Logging: ' + this._ingredient.properties.source);

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters);

            //parse resource group names out of the resource names and populate the arm params accordingly
            const hostResource =  util.parseResource(params["planName"].value);
            const storageResource =  util.parseResource(params["storageAccountName"].value);
            const aiResource =  util.parseResource(params["appInsightsName"].value);

            params["planName"] = {"value": hostResource.resource};
            params["planRG"] = {"value": (hostResource.resourceGroup || util.resource_group())};
            params["storageAccountName"] = {"value": storageResource.resource};
            params["storageAccountRG"] = {"value": (storageResource.resourceGroup || util.resource_group())};
            params["appInsightsName"] = {"value": aiResource.resource};
            params["appInsightsRG"] = {"value": (aiResource.resourceGroup || util.resource_group())};


            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group());

        } catch(error){
            this._logger.error('deployment failed: ' + error);
            throw error;
        }
    }
}