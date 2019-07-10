import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import alertARMTemplate from "./alert.json"

export class MetricAlertPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Metric Alert Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            const resource = util.parseResource(await this._ctx.Ingredient.properties.source.valueAsync(this._ctx));

            if (!resource.resource || !params["source-type"] || !params["timeAggregation"] || !params["metricName"])
                this._logger.error("The source, source-type, timeAggregation, and metricName parameters are required for metric alert ingredients.");

            const sourceType = params["source-type"].value;
            this._logger.log(`resource type: ${sourceType}, resource rg: ${resource.resourceGroup}, resource name: ${resource.resource}`);

            params["source-rg"] = { "value": resource.resourceGroup };
            params["source-name"] = { "value": resource.resource };

            //Generate alertName param as env + region + "alert" + source resource + time aggregation (max, min, etc.) + metric name + alert type (static, dynamic). 
            //Alert names can be up to 128 characaters long in Azure.
            //Ex) deveusalert-sbwounds-maximum-throttledrequests-dynamic
            const timeAggregation = params["timeAggregation"].value;
            const metricName = params["metricName"].value;
            const sourceName = resource.resource;
            const alertType = params["alertType"].value;
            const tempName = '-' + sourceName + '-' + timeAggregation + '-' + metricName + '-' + alertType;
            const alertName = util.create_resource_name("alert", tempName, true);            
            this._logger.log(alertName);
            params["alertName"] = { "value": alertName };

            await helper.DeployTemplate(this._name, alertARMTemplate, params, await util.resource_group())

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}