import {BaseUtility, IngredientManager} from '@azbake/core'
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { ApplicationInsightsManagementClient } from '@azure/arm-appinsights'

export class ApimApiUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("apim", null, false);
        return name;
    }

    public async get_logger(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.create_resource_name()
        let loggerReturn = await client.logger.listByService(resoureGroup, serviceName)
        let loggers = loggerReturn.map(({ name }) => name);
        for (let i = 0; i < loggers.length; i++) {
            let logVal = loggers[i] || ""
            if (logVal.search(match) > -1) { return logVal}
            else { return "" }
        }
    }

    public async get_property(name: string, rg: string, match: string): Promise<any> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let resoureGroup = rg || util.resource_group()
        let serviceName = name || this.create_resource_name()
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
        let serviceName = name || this.create_resource_name()
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
        let serviceName = name || this.create_resource_name()
        let backendReturn = await client.backend.listByService(resoureGroup, serviceName)
        let backends = backendReturn.map(({ name }) => name);
        for (let i = 0; i < backends.length; i++) {
            let backendVal = backends[i] || ""
            if (backendVal.search(match) > -1) { return backendVal}
            else { return "" }
        }
    }
}