import { BaseUtility, IngredientManager } from '@azbake/core'
import { ApplicationInsightsManagementClient } from '@azure/arm-appinsights'
import { utils } from 'mocha';

export class AppInsightsUtils extends BaseUtility {

    public get_resource_name(shortName: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        //App Insights telemetry will be centralized.  Therefore don't appenda  region code.
        const appInsightsName = util.create_resource_name("ai", shortName, false);
        return appInsightsName;
    }

    public async get_instrumentation_key(shortName: string, rgShortName: string | null = null): Promise<string> {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        
        //App Insights telemetry will be centralized.  Therefore don't appenda  region code.
        const aiName = util.create_resource_name("ai", shortName, false);
        
        let rgName: string;

        let override = this.context.Config.rgOverride
        if (override) {
            rgName = await override.valueAsync(this.context)
        } else {
            rgName = util.create_resource_name("", rgShortName, false)
        }    

        const client = new ApplicationInsightsManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.components.get(rgName, aiName);

        let key: string = ""
        if (response.instrumentationKey) {
            key = response.instrumentationKey || ""
        }
        return key
    }
}