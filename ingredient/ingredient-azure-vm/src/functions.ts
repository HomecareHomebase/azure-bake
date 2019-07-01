import {BaseUtility, IngredientManager} from '@azbake/core'
var msRestAzure = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;

export class AzureVmUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("sbn", null, false);
        return name;
    }

    /*public async get_endpoint(nsName: string, rg: string | null = null): Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();
        
        const client = new ServiceBusManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.namespaces.get(resource_group, nsName);
        // client.namespaces.listKeys(resource_group,)

        return response.serviceBusEndpoint || "";
    }

    public async get_primary_key(nsName: string, authRuleName: string, rg: string | null = null) : Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new ServiceBusManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.namespaces.listKeys(resource_group, nsName, authRuleName);

        return response.primaryKey || "";
    }

    public async get_secondary_key(nsName: string, authRuleName: string, rg: string | null = null) : Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new ServiceBusManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.namespaces.listKeys(resource_group, nsName, authRuleName);

        return response.secondaryKey || "";
    }

    public async get_primary_connection_string(nsName: string, authRuleName: string, rg: string | null = null) : Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new ServiceBusManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.namespaces.listKeys(resource_group, nsName, authRuleName);

        return response.primaryConnectionString || "";
    }

    public async get_secondary_connection_string(nsName: string, authRuleName: string, rg: string | null = null) : Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new ServiceBusManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.namespaces.listKeys(resource_group, nsName, authRuleName);

        return response.secondaryConnectionString || "";
    }*/
}