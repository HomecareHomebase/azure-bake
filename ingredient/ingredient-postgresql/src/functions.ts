import {BaseUtility, IngredientManager} from '@azbake/core'
import { NetworkManagementClient } from '@azure/arm-network';
import { Subnet, VirtualNetwork } from '@azure/arm-network/esm/models';
import { PrivateDnsManagementClient, PrivateZone } from '@azure/arm-privatedns';

export class PostgreSQLDBUtils extends BaseUtility {


    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("pgsql", null, true);
        return name;
    }

    public create_resource_uri(access: string): string {
        let infix = (access === 'private') ? '.private' : '';
        return `${this.create_resource_name()}${infix}.postgres.database.azure.com`; 
    }

    public async get_resource_group(): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const resourceGroup = await util.resource_group();

        this.context._logger.debug(`PostgreSQLDBUtils.get_resource_group() returned ${JSON.stringify(resourceGroup)}`);

        return resourceGroup;
    }

    public async get_vnet(virtualNetworkResourceGroup: string, virtualNetworkName: string): Promise<VirtualNetwork>  {
        const token: any = this.context.AuthToken

        var client = new NetworkManagementClient(token, this.context.Environment.authentication.subscriptionId);
        let vNet = await client.virtualNetworks.get(virtualNetworkResourceGroup, virtualNetworkName);

        this.context._logger.debug(`PostgreSQLDBUtils.get_vnet() returned ${JSON.stringify(vNet)}`);

        return vNet;
    }

    public async get_subnet(resourceGroup: string, vnetName: string, subnetName: string): Promise<Subnet> {
        const token: any = this.context.AuthToken

        var client = new NetworkManagementClient(token, this.context.Environment.authentication.subscriptionId);
        let subnet = await client.subnets.get(resourceGroup, vnetName, subnetName);

        this.context._logger.debug(`PostgreSQLDBUtils.get_subnet() returned ${JSON.stringify(subnet)}`);

        return subnet;
    }

    public async get_private_dns_zone(resourceGroup: string, privateDnsZoneName: string): Promise<PrivateZone> {
        const token: any = this.context.AuthToken

        var client = new PrivateDnsManagementClient(token, this.context.Environment.authentication.subscriptionId);
        let dns = await client.privateZones.get(resourceGroup, privateDnsZoneName);

        this.context._logger.debug(`PostgreSQLDBUtils.get_private_dns_zone() returned ${JSON.stringify(dns)}`);
        
        return dns;
    }
}

