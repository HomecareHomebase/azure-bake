import {BaseUtility, IngredientManager} from '@azbake/core'
import { ResourceManagementClient } from '@azure/arm-resources';

export class FunctionAppUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("fa", null, true);
        return name;
    }

    public async get_host_name(name: string): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const token: any = this.context.AuthToken

        let client = new ResourceManagementClient(token, this.context.Environment.authentication.subscriptionId);

        let faResource = await client.resources.get(await util.resource_group(), "Microsoft.Web", "", "sites", name, "2018-11-01");

        return faResource.properties.hostNames[0];
    }
}

