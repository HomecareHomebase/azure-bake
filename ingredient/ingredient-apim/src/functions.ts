import {BaseUtility, IngredientManager, IBakeRegion} from '@azbake/core'
import { ApiManagementClient, ApiPolicy, Subscription, } from "@azure/arm-apimanagement"
import { SubscriptionGetResponse } from '@azure/arm-apimanagement/esm/models';

export class ApimUtils extends BaseUtility {

    public get_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("apim", null, false);

        this.context._logger.debug(`ApimUtils.get_resource_name() returned ${name}`);

        return name;
    }
    
    public async get_source(): Promise<string> {
        let coreutil = IngredientManager.getIngredientFunction("coreutils", this.context);
        var util = new ApimUtils(this.context)

        let resourceGroup = await coreutil.resource_group()
        let resourceName = util.get_resource_name()
        let source =  resourceGroup + "/" + resourceName

        this.context._logger.debug(`ApimUtils.get_source() returned ${source}`);

        return source
    }

    public async get_logger(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.get_resource_name()
        let loggerReturn = await client.logger.listByService(resoureGroup, serviceName)
        let loggers = loggerReturn.map(({ name }) => name);
        for (let i = 0; i < loggers.length; i++) {
            let logVal = loggers[i] || ""
            if (logVal.search(match) > -1) { return logVal}
            else { return "" }
        }
    }

    public async get_namedValue(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.get_resource_name()
        let propReturn = await client.property.listByService(resoureGroup, serviceName)
        let props = propReturn.map(({ name }) => name);
        for (let i = 0; i < props.length; i++) {
            let propVal = props[i] || ""
            if (propVal.search(match) > -1) { 
                await client.property.get(resoureGroup, serviceName, propVal)
                .then((returnVal) => {
                    return returnVal.value
                }); 
            }               
            else { return "" }
        }
    }

    public async get_api(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.get_resource_name()
        let apiReturn = await client.api.listByService(resoureGroup, serviceName)
        let apis = apiReturn.map(({ name }) => name);
        for (let i = 0; i < apis.length; i++) {
            let apiVal = apis[i] || ""
            if (apiVal.search(match) > -1) { return apiVal}
            else { return "" }
        }
    }

    public async get_backend(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.get_resource_name()
        let backendReturn = await client.backend.listByService(resoureGroup, serviceName)
        let backends = backendReturn.map(({ name }) => name);
        for (let i = 0; i < backends.length; i++) {
            let backendVal = backends[i] || ""
            if (backendVal.search(match) > -1) { return backendVal}
            else { return "" }
        }
    }

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

