import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"

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

            await helper.DeployAlert(this._name, await util.resource_group(),  resource.resource, params )

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}