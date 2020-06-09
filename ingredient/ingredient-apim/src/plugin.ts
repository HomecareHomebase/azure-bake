import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { MonitorManagementClient } from "@azure/arm-monitor"
import { ApiManagementServiceResource, IdentityProviderType, IdentityProviderContract, IdentityProviderCreateOrUpdateOptionalParams, LoggerCreateOrUpdateOptionalParams, AuthorizationServerCreateOrUpdateOptionalParams, UserCreateOrUpdateOptionalParams, GroupCreateOrUpdateOptionalParams, PropertyCreateOrUpdateOptionalParams, PropertyContract, LoggerContract, GroupCreateParameters, UserCreateParameters, AuthorizationServerContract, PolicyContract, SubscriptionCreateParameters, ProductContract, ProductCreateOrUpdateOptionalParams, ProductPolicyCreateOrUpdateOptionalParams, SubscriptionCreateOrUpdateOptionalParams } from "@azure/arm-apimanagement/esm/models";
import { DiagnosticSettingsResource, DiagnosticSettingsCreateOrUpdateResponse } from "@azure/arm-monitor/esm/models";

interface IApim extends ApiManagementServiceResource{
    apimServiceName: string
}

interface IApimDiagnostics extends DiagnosticSettingsResource{
    name: string
}

interface IApiIdentityProvider extends IdentityProviderContract{
    id: IdentityProviderType
}

interface IApimAuthServer extends AuthorizationServerContract{
    id: string
}

interface IApimUser extends UserCreateParameters{
    id: string
    groups?: Array<string>
}

interface IApimGroup extends GroupCreateParameters{
    id: string
}

interface IApimLogger extends LoggerContract{
    appInsightsName: string
    cleanKeys: boolean
}

interface IApimNamedValue extends PropertyContract{
    id: string
}

interface IApimProduct extends ProductContract{
    id: string
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

    public async Execute(): Promise<void> {
        try {
            
            if(await this.Setup())
            {
                await this.BuildAPIM()
                await this.BuildDiagnostics()
                await this.BuildNamedValues()
                await this.BuildGroups()
                await this.BuildUsers()
                await this.BuildProducts()
                await this.BuildLoggers()
                await this.BuildAuthServers()
                await this.BuildIdentityProviders()
            }
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
            let bakeResource = util.parseResource(source)
            this.resource_group = bakeResource.resourceGroup || rgOverride
            this.resource_name = bakeResource.resource
        }
        else {
            this.resource_group = rgOverride

            let apimParam  = this._ingredient.properties.parameters.get('apimService')

            if (apimParam) {
                let apim :IApim = await apimParam.valueAsync(this._ctx)

                if (apim){
                    apim.apimServiceName = (await (new BakeVariable(apim.apimServiceName)).valueAsync(this._ctx)) 

                    this.resource_name = apim.apimServiceName
                }
            }
        }

        if (!this.resource_group) {
            this._logger.error('APIM Plugin: resourceGroup can not be empty')
            return false
        }
        if (!this.resource_name) {
            this._logger.error('APIM Plugin: resourceName can not be empty')
            return false
        }

        this._logger.log('APIM Plugin: Binding APIM to resource: ' + this.resource_group + '\\' + this.resource_name);
        this.apim_client = new ApiManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)

        if (this.apim_client == null) {
            this._logger.error('APIM Plugin: APIM client is null')
            return false
        }

        return true
    }

    private async BuildAPIM(): Promise<void>{
        if (this.apim_client == undefined) return

        let apimParam  = this._ingredient.properties.parameters.get('apimService')
        if (!apimParam){
            return
        }

        let apim :IApim = await apimParam.valueAsync(this._ctx)
        if (!apim){
            return
        }

        this._logger.log('APIM Plugin: Add/Update APIM service ' + this.resource_name)
        
        if (apim.location) {
            apim.location = (await (new BakeVariable(apim.location)).valueAsync(this._ctx))            
        }
        else{
            apim.location = this._ctx.Region.name
        }

        if(apim.virtualNetworkConfiguration)
        {
            if (apim.virtualNetworkConfiguration.subnetResourceId) {
                apim.virtualNetworkConfiguration.subnetResourceId = (await (new BakeVariable(apim.virtualNetworkConfiguration.subnetResourceId)).valueAsync(this._ctx))            
            }
        }

        var response = await this.apim_client.apiManagementService.createOrUpdate
            (
                this.resource_group,
                this.resource_name,
                apim
            )

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update APIM service " + this.resource_name)
        }
    }

    private async BuildDiagnostics(): Promise<void>{
        if (this.apim_client == undefined) return

        let diagnosticsParam  = this._ingredient.properties.parameters.get('diagnostics')
        if (!diagnosticsParam){
            return
        }

        let apimDiagnostics :IApimDiagnostics = await diagnosticsParam.valueAsync(this._ctx)
        if (!apimDiagnostics){
            return
        }

        this._logger.log('APIM Plugin: Add/Update APIM diagnostics ' + apimDiagnostics.name)

        let resourceUri = (await this.apim_client.apiManagementService.get(this.resource_group, this.resource_name)).id;

        if(!resourceUri)
        {
            return
        }

        if (apimDiagnostics.storageAccountId) {
            apimDiagnostics.storageAccountId = (await (new BakeVariable(apimDiagnostics.storageAccountId)).valueAsync(this._ctx))            
        }

        var monitorClient = new MonitorManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

        var response = await monitorClient.diagnosticSettings.createOrUpdate
            (
                resourceUri,
                apimDiagnostics,
                apimDiagnostics.name
            )

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update APIM diagnostics " + apimDiagnostics.name)
        }
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
                namedValue,
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

        this._logger.log('APIM Plugin: Add/Update APIM group: ' + group.displayName)
        
        let response = await this.apim_client.group.createOrUpdate(
            this.resource_group,
            this.resource_name,
            group.id,
            group,
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
            user,
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
            product,
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

        if (logger.credentials) {
            aiKey = (await (new BakeVariable(logger.credentials["instrumentationKey"])).valueAsync(this._ctx))

            logger.credentials["instrumentationKey"] = aiKey
        }

        if (logger.loggerType == "applicationInsights") {
            this._logger.log('APIM Plugin: Add/Update APIM logger: ' + logger.appInsightsName)
            
            var response = await this.apim_client.logger.createOrUpdate(
                this.resource_group,
                this.resource_name,
                logger.appInsightsName,
                logger,
                <LoggerCreateOrUpdateOptionalParams>{ifMatch:'*'})
            
            if (response._response.status != 200 && response._response.status != 201) {
                this._logger.error(`APIM Plugin: Could not create/update logger for '+ logger.appInsightsName`)
            }

            currentLoggerCreds = response.credentials.instrumentationKey.replace(/{{|}}/ig, "")
        }
        else if (logger.loggerType == "azureEventHub") {
            this._logger.error(`APIM Plugin: Logger EventHub functionality is yet to be implemented`)
        }

        //Clean logger keys
        if (logger.cleanKeys == undefined || logger.cleanKeys) {
            let result = await this.apim_client.property.listByService(this.resource_group, this.resource_name) || ""
            let propEtag = ""
            for (let i = 0; i < result.length; i++) {
                let id = result[i].name || ""
                let displayName = result[i].displayName || ""
                if (displayName != currentLoggerCreds && displayName.match(/Logger.Credentials-.*/) && result[i].value == aiKey) {
                    await this.apim_client.property.getEntityTag(this.resource_group, this.resource_name, id).then((result) => { propEtag = result.eTag })
                    await this.apim_client.property.deleteMethod(this.resource_group, this.resource_name, id, propEtag)
                        .then((result) => {
                            this._logger.log(`APIM Plugin: Logger Cleanup - Removed old key - ${displayName}: ${result._response.status == 200}`)
                        })
                        .catch((failure) => {
                            this._logger.error(`APIM Plugin: Logger Cleanup - failed to remove AppInsights key: ${displayName}`)
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
            authServer,
            <AuthorizationServerCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update auth server " + authServer.id)
        }
    }

    private async BuildIdentityProviders(): Promise<void> {

        let identityProvidersParam  = this._ingredient.properties.parameters.get('identityProviders')
        if (!identityProvidersParam){
            return
        }

        let identityProviders :IApiIdentityProvider[] = await identityProvidersParam.valueAsync(this._ctx)
        if (!identityProviders){
            return
        }

        for(let i =0; i < identityProviders.length; ++i) {
            let identityProvider = identityProviders[i];
            await this.BuildIdentityProvider(identityProvider)
        }       
    }

    private async BuildIdentityProvider(identityProvider: IApiIdentityProvider): Promise<void> {

        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM identity provider: ' + identityProvider.id)

        identityProvider.identityProviderContractType = identityProvider.id

        let response = await this.apim_client.identityProvider.createOrUpdate(
            this.resource_group,
            this.resource_name,
            identityProvider.id,
            identityProvider,
            <IdentityProviderCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update identity provider " + identityProvider.id)
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
}