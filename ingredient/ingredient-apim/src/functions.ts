import {BaseUtility, IngredientManager, IBakeRegion} from '@azbake/core'
import { ApiManagementClient, ApiPolicy, Subscription, } from "@azure/arm-apimanagement"
import { SubscriptionGetResponse } from '@azure/arm-apimanagement/esm/models';

export class ApimUtils extends BaseUtility {

    public async get_subscription(resourceGroup: string, resource: string, subscriptionId: string) : Promise<SubscriptionGetResponse> {

        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)
        return subscription
    }   

    public async get_subscription_key(resourceGroup: string, resource: string, subscriptionId: string) : Promise<string> {

        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)
        return subscription.primaryKey
    } 

    public async get_subscription_keySecondary(resourceGroup: string, resource: string, subscriptionId: string) : Promise<string> {

        let apim_client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId)
        let subscription = await apim_client.subscription.get(resourceGroup, resource, subscriptionId)
        return subscription.secondaryKey
    } 
}

