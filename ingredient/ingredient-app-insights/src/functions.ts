import { BaseUtility, IngredientManager } from '@azbake/core'
import { ApplicationInsightsManagementClient } from '@azure/arm-appinsights'

export class AppInsightsUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        const name = util.create_resource_name("ai", null, true);
        return name;
    }

    public async get_instrumentation_key(appInsightsName: string, rg: string): Promise<string> {

        const client = new ApplicationInsightsManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.components.get(rg, appInsightsName);

        let key: string = ""
        if (response.instrumentationKey) {
            key = response.instrumentationKey || ""
        }
        return key
    }
}