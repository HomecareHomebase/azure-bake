import { BaseUtility, IngredientManager } from '@azbake/core'
import { EventHubManagementClient } from '@azure/arm-eventhub'
import { EventHubsListKeysResponse } from '@azure/arm-eventhub/esm/models';

export class EventHubUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = util.create_resource_name("eh", null, true);
        return name;
    } 

    public async get_primary_key(eventHubNamespaceName: string, eventHubName: string, policyName: string, rg: string | null = null): Promise<string> {

        let response = await this.get_keys(eventHubNamespaceName, eventHubName, policyName, rg)

        let key: string = ""
        if (response.primaryKey) {
            key = response.primaryKey || ""
        }
        return key
    }

    public async get_secondary_key(eventHubNamespaceName: string, eventHubName: string, policyName: string, rg: string | null = null): Promise<string> {

        let response = await this.get_keys(eventHubNamespaceName, eventHubName, policyName, rg)

        let key: string = ""
        if (response.secondaryKey) {
            key = response.secondaryKey || ""
        }
        return key
    }

    public async get_primary_connectionstring(eventHubNamespaceName: string, eventHubName: string, policyName: string, rg: string | null = null): Promise<string> {

        let response = await this.get_keys(eventHubNamespaceName, eventHubName, policyName, rg)

        let connString: string = ""
        if (response.primaryConnectionString) {
            connString = response.primaryConnectionString || ""
        }
        return connString
    }

    public async get_secondary_connectionstring(eventHubNamespaceName: string, eventHubName: string, policyName: string, rg: string | null = null): Promise<string> {

        let response = await this.get_keys(eventHubNamespaceName, eventHubName, policyName, rg)

        let connString: string = ""
        if (response.secondaryConnectionString) {
            connString = response.secondaryConnectionString || ""
        }
        return connString
    }

    private async get_keys(eventHubNamespaceName: string, eventHubName: string, policyName: string, rg: string | null = null): Promise<EventHubsListKeysResponse> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new EventHubManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.eventHubs.listKeys(resource_group, eventHubNamespaceName, eventHubName, policyName)

        return response
    }
}

