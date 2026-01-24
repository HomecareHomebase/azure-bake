import { BaseUtility, IngredientManager } from '@azbake/core'
import { SearchManagementClient } from '@azure/arm-search'

export class SearchUtils extends BaseUtility {

    public create_resource_name(useRegionCode: boolean = true): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const ais_profile = util.create_resource_name("ais", null, useRegionCode);
                     
        this.context._logger.debug(`SearchUtils.create_resource_name() returned ${ais_profile}`);

        return ais_profile;
    }

    public async get_primary_admin_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const credential = this.context.Credentials.modernCredentials;

        const client = new SearchManagementClient(credential, this.context.Environment.authentication.subscriptionId);

        let response = await client.adminKeys.get(resource_group, name)

        let key: string = ""

        if (response)
        {
            key = response.primaryKey || ""
        }

        this.context._logger.debug(`SearchUtils.get_primary_admin_key() returned ${key}`);

        return key
    }

    public async get_secondary_admin_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const credential = this.context.Credentials.modernCredentials;

        const client = new SearchManagementClient(credential, this.context.Environment.authentication.subscriptionId);

        let response = await client.adminKeys.get(resource_group, name)

        let key: string = ""

        if (response)
        {
            key = response.secondaryKey || ""
        }
        
        this.context._logger.debug(`SearchUtils.get_secondary_admin_key() returned ${key}`);

        return key
    }
}