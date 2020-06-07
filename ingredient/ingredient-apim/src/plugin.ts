import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { LoggerCreateOrUpdateOptionalParams, AuthorizationServerCreateOrUpdateOptionalParams, UserCreateOrUpdateOptionalParams, GroupCreateOrUpdateOptionalParams, PropertyCreateOrUpdateOptionalParams, PropertyContract, LoggerContract, GroupCreateParameters, UserCreateParameters, AuthorizationServerContract, PolicyContract, SubscriptionCreateParameters, ProductContract, ProductCreateOrUpdateOptionalParams, ProductPolicyCreateOrUpdateOptionalParams, SubscriptionCreateOrUpdateOptionalParams } from "@azure/arm-apimanagement/esm/models";
import ApimTemplate from "./apim-deploy.json"
let request = require('async-request')

interface IApimAuthServer{
    id: string
    data: AuthorizationServerContract
}

interface IApimUser{
    id: string
    data: UserCreateParameters
    groups?: Array<string>
}

interface IApimGroup{
    id: string
    data: GroupCreateParameters
}

interface IApimLogger{
    appInsightsName: string
    clean: boolean
    data: LoggerContract
}

interface IApimNamedValue{
    id: string
    data: PropertyContract
}

interface IApimOptions {
    apiWaitTime: number
}

interface IApimProduct {
    id: string
    data: ProductContract
    apis?: Array<string>
    groups?: Array<string>
    policy?: PolicyContract
    subscriptions?: Array<IApimSubscription>
}

interface IApimSubscription {
    id: string
    user?: string
}

export class ApimPlugin extends BaseIngredient {

    private     resource_group:     string      = ""
    private     resource_name:      string      = ""
    private     apim_client:        ApiManagementClient | undefined
    private     apim_options:       IApimOptions | undefined
    private     deployArm:          boolean      = true

    public async Execute(): Promise<void> {
        try {
            
            await this.Setup()
            await this.DeployArmTemplate()
            await this.BuildNamedValues()
            await this.BuildGroups()
            await this.BuildUsers()
            await this.BuildProducts()
            await this.BuildLoggers()
            await this.BuildAuthServers()
        } catch(error){
            this._logger.error('APIM Plugin: ' + error)
            throw error
        }
    }

    private async Setup(): Promise<boolean> {

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

        let source = await this._ingredient.properties.source.valueAsync(this._ctx)

        let rgOverride : string
        rgOverride = await util.resource_group();

        if (source) {
            // if source is being supplied then APIM is deployed. The ingredient is being used to deploy things like named values for specific API's
            this.deployArm = false

            let bakeResource = util.parseResource(source)
            this.resource_group = bakeResource.resourceGroup || rgOverride
            this.resource_name = bakeResource.resource
        }
        else {
            this.resource_group = rgOverride

            let apimServiceName = this._ingredient.properties.parameters.get('apimServiceName')

            if(apimServiceName){
                this.resource_name = await apimServiceName.valueAsync(this._ctx)
            }
        }

        if (!this.resource_group) {
            this._logger.log('APIM Plugin: resourceGroup can not be empty')
            return false
        }
        if (!this.resource_name) {
            this._logger.log('APIM Plugin: resourceName can not be empty')
            return false
        }

        this._logger.log('APIM Plugin: Binding APIM to resource: ' + this.resource_group + '\\' + this.resource_name);
        this.apim_client = new ApiManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)

        if (this.apim_client == null) {
            this._logger.log('APIM Plugin: APIM client is null')
            return false
        }

        let optionParam =this._ctx.Ingredient.properties.parameters.get('options') || undefined
        if (optionParam){
            this.apim_options = await optionParam.valueAsync(this._ctx) || <IApimOptions>{}
        }
        else{
            this.apim_options = <IApimOptions>{}
        }

        if (this.apim_options){
            this.apim_options.apiWaitTime = this.apim_options.apiWaitTime <= 0 || !this.apim_options.apiWaitTime ? 120 : this.apim_options.apiWaitTime
        }

        return true
    }

    private async DeployArmTemplate(): Promise<void> {
        if(!this.deployArm)
            return

        const helper = new ARMHelper(this._ctx);
        let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

        //delete properties not in the ARM template
        delete params["options"]
        delete params["namedValues"]
        delete params["products"]
        delete params["groups"]
        delete params["users"]
        delete params["loggers"]
        delete params["authServers"]

        //Deploy primary ARM template
        this._logger.log('APIM Plugin: Deploying ARM template')

        params = await helper.ConfigureDiagnostics(params);
        await helper.DeployTemplate(this._name, ApimTemplate, params, this.resource_group)
    }

    private async BuildNamedValues(): Promise<void> {
        let namedValuesParam  = this._ingredient.properties.parameters.get('namedValues')
        if (!namedValuesParam){
            return
        }

        let namedValues :IApimNamedValue[] = await namedValuesParam.valueAsync(this._ctx)
        if (!namedValues){
            return
        }

        for(let i =0; i < namedValues.length; ++i) {
            let namedValue = namedValues[i];

            await this.BuildNamedValue(namedValue)
        }  
    }

    private async BuildNamedValue(namedValue: IApimNamedValue) : Promise<void> { 
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM named value: ' + namedValue.id)
        
        var response = await this.apim_client.property.createOrUpdate
            (
                this.resource_group,
                this.resource_name,
                namedValue.id,
                namedValue.data,
                <PropertyCreateOrUpdateOptionalParams>{ifMatch:'*'}
            )

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update named value " + namedValue.id)
        }
    }

    private async BuildGroups(): Promise<void> {

        let groupsParam  = this._ingredient.properties.parameters.get('groups')
        if (!groupsParam){
            return
        }

        let groups :IApimGroup[] = await groupsParam.valueAsync(this._ctx)
        if (!groups){
            return
        }

        for(let i =0; i < groups.length; ++i) {
            let group = groups[i];
            await this.BuildGroup(group)
        }       
    }

    private async BuildGroup(group: IApimGroup): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM group: ' + group.data.displayName)
        
        let response = await this.apim_client.group.createOrUpdate(
            this.resource_group,
            this.resource_name,
            group.id,
            group.data,
            <GroupCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update group " +  group.id)
        }
    }

    private async BuildUsers(): Promise<void> {

        let usersParam  = this._ingredient.properties.parameters.get('users')
        if (!usersParam){
            return
        }

        let users :IApimUser[] = await usersParam.valueAsync(this._ctx)
        if (!users){
            return
        }

        for(let i =0; i < users.length; ++i) {
            let user = users[i];
            await this.BuildUser(user)
        }       
    }

    private async BuildUser(user: IApimUser): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM user: ' + user.id)
        
        let response = await this.apim_client.user.createOrUpdate(
            this.resource_group,
            this.resource_name,
            user.id,
            user.data,
            <UserCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update user " + user.id)
        }

        if (user.groups) {
            this._logger.log('APIM Plugin: Assigning group ' + user.groups.toString() + " to user " + user.id)
            
            for(let i=0; i < user.groups.length; ++i){
                let group = user.groups[i]
                let apiResponse = await this.apim_client.groupUser.create(this.resource_group, this.resource_name, group, user.id)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind group " + group + "to user " + user.id)
                }
            }
        }
    }

    private async BuildProducts(): Promise<void> {

        let productsParam  = this._ingredient.properties.parameters.get('products')
        if (!productsParam){
            return
        }

        let products :IApimProduct[] = await productsParam.valueAsync(this._ctx)
        if (!products){
            return
        }

        for(let i =0; i < products.length; ++i) {
            let product = products[i];
            await this.BuildProduct(product)
        }       
    }

    private async BuildProduct(product: IApimProduct): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM product: ' + product.id)
        
        let response = await this.apim_client.product.createOrUpdate(
            this.resource_group,
            this.resource_name,
            product.id,
            product.data,
            <ProductCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update product " + product.id)
        }

        if (product.apis) {
            this._logger.log('APIM Plugin: Assigning APIs ' + product.apis.toString() + " to product " + product.id)
            
            for(let i=0; i < product.apis.length; ++i){
                let api = product.apis[i]
                let apiResponse = await this.apim_client.productApi.createOrUpdate(this.resource_group, this.resource_name, product.id, api)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind API " + api + "to product " + product.id)
                }
            }
        }

        if (product.groups) {
            this._logger.log('APIM Plugin: Assigning group ' + product.groups.toString() + " to product " + product.id)
            
            for(let i=0; i < product.groups.length; ++i){
                let group = product.groups[i]
                let apiResponse = await this.apim_client.productGroup.createOrUpdate(this.resource_group, this.resource_name, product.id, group)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind group " + group + "to product " + product.id)
                }
            }
        }

        if (product.policy) {
            this._logger.log('APIM Plugin: Add/Update APIM product policy: ' + product.id)
            
            let policyData = await this.ResolvePolicy(product.policy)
            let policyResponse = await this.apim_client.productPolicy.createOrUpdate(
                this.resource_group,
                this.resource_name,
                product.id,
                policyData,
                <ProductPolicyCreateOrUpdateOptionalParams>{ifMatch:'*'})
            
            if (policyResponse._response.status != 200 && policyResponse._response.status != 201){
                this._logger.error("APIM Plugin: Could not apply policies to product " + product.id)
            }
        }

        if (product.subscriptions) {
            for(let i=0; i < product.subscriptions.length; ++i){
                let sub = product.subscriptions[i]
                await this.BuildSubscription(sub, product.id)
            }
        }
    }

    private async BuildLoggers(): Promise<void> {
        let loggersParam  = this._ingredient.properties.parameters.get('loggers')
        if (!loggersParam){
            return
        }

        let loggers :IApimLogger[] = await loggersParam.valueAsync(this._ctx)
        if (!loggers){
            return
        }

        for(let i =0; i < loggers.length; ++i) {
            let logger = loggers[i];
            await this.BuildLogger(logger)
        }  
    }

    private async BuildLogger(logger: IApimLogger): Promise<void>{
        if (this.apim_client == undefined) return

        let aiKey: string = ""
        let currentLoggerCreds: any  

        if (logger.appInsightsName) {
            
            logger.appInsightsName = (await (new BakeVariable(logger.appInsightsName)).valueAsync(this._ctx))            
        }

        if (logger.data.credentials) {
            aiKey = (await (new BakeVariable(logger.data.credentials["instrumentationKey"])).valueAsync(this._ctx))

            logger.data.credentials["instrumentationKey"] = aiKey
        }

        if (logger.data.loggerType == "applicationInsights") {
            this._logger.log('APIM Plugin: Add/Update APIM logger: ' + logger.appInsightsName)
            
            var response = await this.apim_client.logger.createOrUpdate(
                this.resource_group,
                this.resource_name,
                logger.appInsightsName,
                logger.data,
                <LoggerCreateOrUpdateOptionalParams>{ifMatch:'*'})
            
            if (response._response.status != 200 && response._response.status != 201) {
                this._logger.error(`APIM Plugin: Could not create/update logger for '+ logger.appInsightsName`)
            }

            currentLoggerCreds = response.credentials.instrumentationKey.replace(/{{|}}/ig, "")
        }
        else if (logger.data.loggerType == "azureEventHub") {
            this._logger.error(`APIM Plugin: Logger EventHub functionality is yet to be implemented`)
        }

        //Clean logger keys
        if (logger.clean == undefined || logger.clean) {
            let result = await this.apim_client.property.listByService(this.resource_group, this.resource_name) || ""
            let propEtag = ""
            for (let i = 0; i < result.length; i++) {
                let id = result[i].name || ""
                let displayName = result[i].displayName || ""
                if (displayName != currentLoggerCreds && displayName.match(/Logger.Credentials-.*/) && result[i].value == aiKey) {
                    await this.apim_client.property.getEntityTag(this.resource_group, this.resource_name, id).then((result) => { propEtag = result.eTag })
                    await this.apim_client.property.deleteMethod(this.resource_group, this.resource_name, id, propEtag)
                        .then((result) => {
                            this._logger.log(`APIM Plugin: : Logger Cleanup - Removed old key - ${displayName}: ${result._response.status == 200}`)
                        })
                        .catch((failure) => {
                            this._logger.error(`APIM Plugin: : Logger Cleanup - failed to remove AppInsights key: ${displayName}`)
                        })
                }
            }
        }
    }

    private async BuildAuthServers(): Promise<void> {

        let authServersParam  = this._ingredient.properties.parameters.get('authServers')
        if (!authServersParam){
            return
        }

        let authServers :IApimAuthServer[] = await authServersParam.valueAsync(this._ctx)
        if (!authServers){
            return
        }

        for(let i =0; i < authServers.length; ++i) {
            let authServer = authServers[i];
            await this.BuildAuthServer(authServer)
        }       
    }

    private async BuildAuthServer(authServer: IApimAuthServer): Promise<void> {

        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM auth server: ' + authServer.id)

        let response = await this.apim_client.authorizationServer.createOrUpdate(
            this.resource_group,
            this.resource_name,
            authServer.id,
            authServer.data,
            <AuthorizationServerCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update auth server " + authServer.id)
        }
    }

    private async ResolvePolicy(policy: PolicyContract): Promise<PolicyContract> {

        if (policy.value) {
            policy.value = (await (new BakeVariable(policy.value)).valueAsync(this._ctx))            
        }

        if (policy.format != "rawxml-link" &&
            policy.format != "xml-link") {
                return policy
        }

        let blockTime = (this.apim_options || <IApimOptions>{}).apiWaitTime

        for(let i=0; i < blockTime; ++i){
            let response = await request(policy.value)
            if (response.statusCode >= 200 && response.statusCode < 400){
                return policy
            }
            await this.Sleep(1000)
        }

        throw new Error("APIM Plugin: Could not resolve policy content at: " + policy.value)
    }

    private async BuildSubscription(sub: IApimSubscription, productId: string): Promise<void> {

        if (this.apim_client == undefined) return

        let params = <SubscriptionCreateParameters> {
            scope : '/products/' + productId,
            displayName: sub.id,
            state: 'active',
            allowTracing: true,
            ownerId: (await this.GetUserId(sub.user))
        }

        this._logger.log('APIM Plugin: Add/Update APIM Subscription : ' + sub.id + " scoped to " + productId)
        let response = await this.apim_client.subscription.createOrUpdate(this.resource_group, this.resource_name, sub.id,params, <SubscriptionCreateOrUpdateOptionalParams>{ifMatch:'*'})
        if (response._response.status != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update subscription for product" + productId + " subId: " + sub.id)
        }
    }

    private async GetUserId(user?: string) : Promise<string | undefined> {

        if (this.apim_client == undefined) return undefined
        user = user || "Administrator"


        let userId: string | undefined
        let result = await this.apim_client.user.listByService(this.resource_group, this.resource_name)
        result.forEach(u=>{
            u.name == user
            userId = u.id
        })

        return userId
    }

    private Sleep(ms: number) : Promise<void> {
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }
}