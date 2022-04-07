import {BaseUtility, IngredientManager} from '@azbake/core'
import { NetworkManagementClient } from '@azure/arm-network';
import { SubnetsGetResponse } from '@azure/arm-network/esm/models';

export class PostgreSQLDBUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("pgsql", null, true);
        return name;
    }

    public create_resource_uri(): string {
        return this.create_resource_name() + ".postgres.database.azure.com"; 
    }

    public async get_resource_group(): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const resourceGroup = await util.resource_group();

        this.context._logger.debug(`PostgreSQLDBUtils.get_resource_group() returned ${JSON.stringify(resourceGroup)}`);

        return resourceGroup;
    }

    public async get_subnet(resourceGroup: string, vnetName: string, subnetName: string): Promise<SubnetsGetResponse> {
        const token: any = this.context.AuthToken

        var client = new NetworkManagementClient(token, this.context.Environment.authentication.subscriptionId);
        let subnet = await client.subnets.get(resourceGroup, vnetName, subnetName)

        this.context._logger.debug(`PostgreSQLDBUtils.get_subnet() returned ${JSON.stringify(subnet)}`);

        return subnet
    }
}

