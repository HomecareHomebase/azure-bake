import {BaseUtility, IngredientManager} from '@azbake/core'
import { ResourceManagementClient } from '@azure/arm-resources';

export class AvailabilitySetUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("avail", null, true);
        return name;
    }

    public async get_fault_domain_count(): Promise<number> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ResourceManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let availResource = await client.resources.get(await util.resource_group(), "Microsoft.Compute", "", "availabilitySets", name, "2018-06-01");

        return availResource.properties.platformFaultDomainCount;
    }

    public async get_update_domain_count(): Promise<number> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ResourceManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let availResource = await client.resources.get(await util.resource_group(), "Microsoft.Compute", "", "availabilitySets", name, "2018-06-01");

        return availResource.properties.platformUpdateDomainCount;
    }
}

