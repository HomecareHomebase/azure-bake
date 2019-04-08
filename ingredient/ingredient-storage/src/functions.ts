import {BaseUtility, IngredientManager} from '@azbake/core'
import { StorageManagementClient } from '@azure/arm-storage'

export class StorageUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }

    public async get_keys(name: string, rg: string | null = null) : Promise<Keys> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new StorageManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.storageAccounts.listKeys(resource_group, name)

        let keys = new Keys()
        if (response.keys)
        {
            keys.primary = response.keys[0].value || ""
            keys.secondary = response.keys[1].value || ""

        }
        return keys
    }
}

export class Keys {
    public primary: string = ""
    public secondary: string = ""
}
    