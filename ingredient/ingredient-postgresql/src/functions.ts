import {BaseUtility, IngredientManager} from '@azbake/core'
import { NetworkManagementClient } from '@azure/arm-network';
import { Subnet, VirtualNetwork } from '@azure/arm-network/esm/models';
import { PrivateDnsManagementClient, PrivateZone } from '@azure/arm-privatedns';
import { DefaultAzureCredential, ClientSecretCredential,ChainedTokenCredential } from "@azure/identity";
import { RestError } from '@azure/ms-rest-js';

export class PostgreSQLDBUtils extends BaseUtility {
    private token = new ClientSecretCredential(this.context.AuthToken.domain, this.context.AuthToken.clientId, this.context.AuthToken.secret);
    private credential = new ChainedTokenCredential(this.token, new DefaultAzureCredential());
    
    public create_resource_name(): string {
        const util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("pgsql", null, true);
        return name;
    }

    public create_resource_uri(access: string): string {
        const infix = (access == 'private') ? '.private' : '';
        return `${this.create_resource_name()}${infix}.postgres.database.azure.com`; 
    }

    public async get_vnet(virtualNetworkResourceGroup: string, virtualNetworkName: string): Promise<VirtualNetwork>  {
        const client = new NetworkManagementClient(this.credential , this.context.Environment.authentication.subscriptionId);
        const vNet = await client.virtualNetworks.get(virtualNetworkResourceGroup, virtualNetworkName);

        this.context._logger.debug(`PostgreSQLDBUtils.get_vnet() returned ${JSON.stringify(vNet)}`);

        return vNet;
    }

    public async get_subnet(resourceGroup: string, vnetName: string, subnetName: string): Promise<Subnet> {
        const client = new NetworkManagementClient(this.credential, this.context.Environment.authentication.subscriptionId);
        const subnet = await client.subnets.get(resourceGroup, vnetName, subnetName);

        this.context._logger.debug(`PostgreSQLDBUtils.get_subnet() returned ${JSON.stringify(subnet)}`);

        return subnet;
    }

    public async get_private_dns_zone(resourceGroup: string, privateDnsZoneName: string): Promise<PrivateZone | undefined> {
        const client = new PrivateDnsManagementClient(this.credential, this.context.Environment.authentication.subscriptionId);
        let dns: PrivateZone | undefined; 
        try {
            dns = await client.privateZones.get(resourceGroup, privateDnsZoneName);
        }
        catch (error) {
            if (!(this.isRestError(error) && error.code === 'ResourceNotFound' ))
            {
                throw error;
            }
        }

        this.context._logger.debug(`PostgreSQLDBUtils.get_private_dns_zone() returned ${JSON.stringify(dns)}`);
        
        return dns;
    }

    private isRestError(error: RestError | Error | unknown): error is RestError {
        return (<RestError>error).code !== undefined
            && (<RestError>error).name === 'RestError' ;
    }
}
