import { BaseUtility, IngredientManager } from '@azbake/core'
import { ApplicationInsightsManagementClient } from '@azure/arm-appinsights'

export class AppInsightsUtils extends BaseUtility {

    public create_resource_name(name: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        const appInsightsName = util.create_resource_name("ai", name, false);
        return appInsightsName;
    }

    public async get_instrumentation_key(name: string, rg: string | null = null): Promise<string> {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let appInsightsName = await util.get_app_insights_name(name)
        let resource_group = rg || await util.get_app_insights_resource_group(name)

        const client = new ApplicationInsightsManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.components.get(resource_group, appInsightsName);

        let key: string = ""
        if (response.instrumentationKey) {
            key = response.instrumentationKey || ""
        }
        return key
    }
}