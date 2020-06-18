import { BaseUtility, IngredientManager } from '@azbake/core'
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { NetworkManagementClient } from '@azure/arm-network';
import { SubscriptionGetResponse, LoggerGetResponse, PropertyGetResponse } from '@azure/arm-apimanagement/esm/models';
import { SubnetsGetResponse } from '@azure/arm-network/esm/models';

export class ApimUtils extends BaseUtility {

    public get_resource_name(name: string | null = null): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const resourceName = util.create_resource_name("apim", name, false);

        this.context._logger.debug(`ApimUtils.get_resource_name() returned ${resourceName}`);

        return resourceName;
    }

    public async get_resource_group(name: string = "apim"): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const resourceGroup = await util.resource_group(name, true, null, true);

        this.context._logger.debug(`ApimUtils.get_resource_group() returned ${String(resourceGroup)}`);

        return resourceGroup;
    }

    public async get_subnet(resourceGroup: string, vnetName: string, subnetName: string): Promise<SubnetsGetResponse> {
        var client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let subnet = await client.subnets.get(resourceGroup, vnetName, subnetName)

        this.context._logger.debug(`ApimUtils.get_subnet() returned ${JSON.stringify(subnet)}`);

        return subnet
    }

    public async get_logger(resourceGroup: string, apimName: string, loggerId: string): Promise<LoggerGetResponse> {
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let logger = await client.logger.get(resourceGroup, apimName, loggerId)

        this.context._logger.debug(`ApimUtils.get_logger() returned ${JSON.stringify(logger)}`);

        return logger
    }

    public async get_namedValue(resourceGroup: string, apimName: string, namedValueId: string): Promise<PropertyGetResponse> {
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let namedValue = await client.property.get(resourceGroup, apimName, namedValueId)

        this.context._logger.debug(`ApimUtils.get_namedValue() returned ${JSON.stringify(namedValue)}`);

        return namedValue
    }

    public async get_subscription(resourceGroup: string, resource: string, subscriptionId: string) : Promise<SubscriptionGetResponse> {
        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)

        this.context._logger.debug(`ApimUtils.get_subscription() returned ${JSON.stringify(subscription)}`);

        return subscription
    }   

    public async get_subscription_key(resourceGroup: string, resource: string, subscriptionId: string) : Promise<string> {
        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)

        this.context._logger.debug(`ApimUtils.get_subscription_key() returned ${subscription.primaryKey}`);

        return subscription.primaryKey
    } 

    public async get_subscription_keySecondary(resourceGroup: string, resource: string, subscriptionId: string) : Promise<string> {
        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)

        this.context._logger.debug(`ApimUtils.get_subscription_keySecondary() returned ${subscription.secondaryKey}`);

        return subscription.secondaryKey
    } 
}

