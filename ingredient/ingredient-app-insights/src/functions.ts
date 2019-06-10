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
        
        //App Insights telemetry will be centralized.  Therefore don't append a region code.  
        //Also, pass in shortname rather than using default.  The default is the package name being deployed but we want the App Insights resource name/group.
        const aiName = util.create_resource_name("ai", shortName, false);
        
        const rgName: string = await util.resource_group(shortName, false);

        const client = new ApplicationInsightsManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.components.get(rgName, aiName);

        let key: string = ""
        if (response.instrumentationKey) {
            key = response.instrumentationKey || ""
        }
        return key
    }
}