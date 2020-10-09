import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ApiManagementClient, NamedValue } from "@azure/arm-apimanagement"
import { MonitorManagementClient } from "@azure/arm-monitor"
import { BackendContract, BackendCreateOrUpdateOptionalParams, ApiDeleteMethodOptionalParams, ProductDeleteMethodOptionalParams, ApiManagementServiceResource, IdentityProviderContract,
    IdentityProviderCreateOrUpdateOptionalParams, LoggerCreateOrUpdateOptionalParams, AuthorizationServerCreateOrUpdateOptionalParams, UserCreateOrUpdateOptionalParams, GroupCreateOrUpdateOptionalParams,
    LoggerContract, GroupCreateParameters, UserCreateParameters, AuthorizationServerContract, PolicyContract, SubscriptionCreateParameters, ProductContract,
    ProductCreateOrUpdateOptionalParams, ProductPolicyCreateOrUpdateOptionalParams, SubscriptionCreateOrUpdateOptionalParams, NamedValueCreateOrUpdateOptionalParams, NamedValueContract, NamedValueCreateContract, IdentityProviderCreateContract } from "@azure/arm-apimanagement/esm/models";
import { DiagnosticSettingsResource, AutoscaleSettingResource, AutoscaleSettingsCreateOrUpdateResponse } from "@azure/arm-monitor/esm/models";
import * as fs from 'fs';
interface IApim extends ApiManagementServiceResource{
    name: string
}

interface IApimAutoscaleSettings extends AutoscaleSettingResource{
    name: string
}

interface IApimDiagnostics extends DiagnosticSettingsResource{
    name: string
}

interface IApimIdentityProvider extends IdentityProviderCreateContract{
}

interface IApimAuthServer extends AuthorizationServerContract{
    name: string
}

interface IApimUser extends UserCreateParameters{
    name: string
    groups?: Array<string>
}

interface IApimGroup extends GroupCreateParameters{
    name: string
}

interface IApimLogger extends LoggerContract{
    name: string
    cleanKeys: boolean
}

interface IApimNamedValue extends NamedValueCreateContract{
    name: string
}

interface IApimProduct extends ProductContract{
    name: string
    apis?: Array<string>
    groups?: Array<string>
    policy?: PolicyContract
    delete?: boolean
}

interface IApimApi {
    name: string
    delete?: boolean
}

interface IApimSubscription extends SubscriptionCreateParameters{
    name: string
    user?: string
    product?: string
    api?: string
}

interface IApimBackend extends BackendContract{
    name: string
}

export class ApimPlugin extends BaseIngredient {

    private     resource_group:     string      = ""
    private     resource_name:      string      = ""
    private     apim_client:        ApiManagementClient | undefined
    private     apim:               ApiManagementServiceResource | undefined

    public async Execute(): Promise<void> {
        try {
            
            if(await this.Setup())
            {
                await this.BuildAPIM()
                await this.BuildDiagnostics()
                await this.BuildNamedValues()
                await this.BuildGroups()
                await this.BuildUsers()
                await this.BuildAPIs();
                await this.BuildProducts()
                await this.BuilSubscriptions()
                await this.BuildLoggers()
                await this.BuildAuthServers()
                await this.BuildIdentityProviders()
                await this.BuildAutoscaleSettings()
                await this.BuildBackends()
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
                    apim.name = (await (new BakeVariable(apim.name)).valueAsync(this._ctx)) 

                    this.resource_name = apim.name
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

        this._logger.log('APIM Plugin: Add/Update APIM service: ' + this.resource_name)
        
        let apimData = await this.ResolveApim(apim);

        var response = await this.apim_client.apiManagementService.createOrUpdate
            (
                this.resource_group,
                this.resource_name,
                apimData
            )

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update APIM service " + this.resource_name)
        }

        this.apim = response;
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

        let resourceUri = (await this.apim_client.apiManagementService.get(this.resource_group, this.resource_name)).id;

        if(!resourceUri)
        {
            return
        }

        var monitorClient = new MonitorManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

        let diagnosticsData = await this.ResolveDiagnostics(apimDiagnostics);

        this._logger.log('APIM Plugin: Add/Update APIM diagnostics: ' + apimDiagnostics.name)

        var response = await monitorClient.diagnosticSettings.createOrUpdate
            (
                resourceUri,
                diagnosticsData,
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

        let namedValueData = await this.ResolveNamedValue(namedValue);

        this._logger.log('APIM Plugin: Add/Update APIM named value: ' + namedValue.name)

        var response = await this.apim_client.namedValue.createOrUpdate
            (
                this.resource_group,
                this.resource_name,
                namedValue.name,
                namedValueData,
                <NamedValueCreateOrUpdateOptionalParams>{ifMatch:'*'}
            )

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update named value " + namedValue.name)
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
            group.name,
            group,
            <GroupCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update group " +  group.name)
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

        this._logger.log('APIM Plugin: Add/Update APIM user: ' + user.name)
        
        let response = await this.apim_client.user.createOrUpdate(
            this.resource_group,
            this.resource_name,
            user.name,
            user,
            <UserCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update user " + user.name)
        }

        if (user.groups) {
            this._logger.log('APIM Plugin: Assigning group `' + user.groups.toString() + "` to user `" + user.name + "`")
            
            for(let i=0; i < user.groups.length; ++i){
                let group = user.groups[i]
                let apiResponse = await this.apim_client.groupUser.create(this.resource_group, this.resource_name, group, user.name)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind group " + group + "to user " + user.name)
                }
            }
        }
    }

    private async BuilSubscriptions(): Promise<void> {

        let subscriptionsParam  = this._ingredient.properties.parameters.get('subscriptions')
        if (!subscriptionsParam){
            return
        }

        let subscriptions :IApimSubscription[] = await subscriptionsParam.valueAsync(this._ctx)
        if (!subscriptions){
            return
        }

        for(let i =0; i < subscriptions.length; ++i) {
            let subscription = subscriptions[i];
            await this.BuildSubscription(subscription)
        }       
    }

    private async BuildSubscription(sub: IApimSubscription): Promise<void> {

        if (this.apim_client == undefined) return

        if(sub.user){
            sub.ownerId = (await this.GetUserId(sub.user))
        }

        if (!sub.scope){
            if(sub.product){
                sub.scope = '/products/' + sub.product
            }
            else if(sub.api){
                sub.scope = '/apis/' + sub.api
            }
            else{
                sub.scope = '/apis'
            }
        }

        this._logger.log('APIM Plugin: Add/Update APIM Subscription: ' + sub.name)
        
        let response = await this.apim_client.subscription.createOrUpdate(
            this.resource_group,
            this.resource_name,
            sub.name,
            sub, <SubscriptionCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (response._response.status != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update subscription: " + sub.name)
        }
    }

    private async BuildAPIs(): Promise<void> {
       
        let apisParam  = this._ingredient.properties.parameters.get('apis')
        if (!apisParam){
            return
        }

        let apis :IApimApi[] = await apisParam.valueAsync(this._ctx)
        if (!apis){
            return
        }

        for(let i =0; i < apis.length; ++i) {
            let api = apis[i];

            if(api.delete && api.delete == true) {
                await this.DeleteApi(api)
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

            if(product.delete && product.delete == true) {
                await this.DeleteProduct(product)
            }
            else {
                await this.BuildProduct(product)
            }
        }       
    }

    private async DeleteApi(api: IApimApi): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Deleting APIM API: ' + api.name)
        
        let response = await this.apim_client.api.deleteMethod(
            this.resource_group,
            this.resource_name,
            api.name,
            '*',
            <ApiDeleteMethodOptionalParams>{ifMatch:'*', deleteRevisions:true})

        if (response._response.status  != 200 && response._response.status != 201 && response._response.status != 204) {
            this._logger.error("APIM Plugin: Could not delete API " + api.name)
        }
    }

    private async DeleteProduct(product: IApimProduct): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Deleting APIM product: ' + product.name)
        
        let response = await this.apim_client.product.deleteMethod(
            this.resource_group,
            this.resource_name,
            product.name,
            '*',
            <ProductDeleteMethodOptionalParams>{ifMatch:'*', deleteSubscriptions:true})

        if (response._response.status  != 200 && response._response.status != 201 && response._response.status != 204) {
            this._logger.error("APIM Plugin: Could not delete product " + product.name)
        }
    }

    private async BuildProduct(product: IApimProduct): Promise<void> {
        if (this.apim_client == undefined) return

        this._logger.log('APIM Plugin: Add/Update APIM product: ' + product.name)
        
        let response = await this.apim_client.product.createOrUpdate(
            this.resource_group,
            this.resource_name,
            product.name,
            product,
            <ProductCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update product " + product.name)
        }

        if (product.apis) {
            this._logger.log('APIM Plugin: Assigning APIs `' + product.apis.toString() + "` to product `" + product.name + "`")
            
            for(let i=0; i < product.apis.length; ++i){
                let api = product.apis[i]
                let apiResponse = await this.apim_client.productApi.createOrUpdate(this.resource_group, this.resource_name, product.name, api)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind API " + api + "to product " + product.name)
                }
            }
        }

        if (product.groups) {
            this._logger.log('APIM Plugin: Assigning group `' + product.groups.toString() + "` to product `" + product.name + "`")
            
            for(let i=0; i < product.groups.length; ++i){
                let group = product.groups[i]
                let apiResponse = await this.apim_client.productGroup.createOrUpdate(this.resource_group, this.resource_name, product.name, group)
                
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.error("APIM Plugin: Could not bind group " + group + "to product " + product.name)
                }
            }
        }

        if (product.policy) {
            this._logger.log('APIM Plugin: Add/Update APIM product policy: ' + product.name)
            
            let policyData = await this.ResolvePolicy(product.policy)
            let policyResponse = await this.apim_client.productPolicy.createOrUpdate(
                this.resource_group,
                this.resource_name,
                product.name,
                policyData,
                <ProductPolicyCreateOrUpdateOptionalParams>{ifMatch:'*'})
            
            if (policyResponse._response.status != 200 && policyResponse._response.status != 201){
                this._logger.error("APIM Plugin: Could not apply policies to product " + product.name)
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

        if (logger.loggerType == "applicationInsights") {
            let loggerData = await this.ResolveLogger(logger);

            this._logger.log('APIM Plugin: Add/Update APIM logger: ' + logger.name)

            let aiKey = logger.credentials["instrumentationKey"];

            var response = await this.apim_client.logger.createOrUpdate(
                this.resource_group,
                this.resource_name,
                logger.name,
                loggerData,
                <LoggerCreateOrUpdateOptionalParams>{ifMatch:'*'})
            
            if (response._response.status != 200 && response._response.status != 201) {
                this._logger.error(`APIM Plugin: Could not create/update logger for '+ logger.appInsightsName`)
            }

            let currentLoggerCreds = response.credentials.instrumentationKey.replace(/{{|}}/ig, "")

            //Clean logger keys
            if (logger.cleanKeys == undefined || logger.cleanKeys) {
                let result = await this.apim_client.namedValue.listByService(this.resource_group, this.resource_name) || ""
                let propEtag = ""
                for (let i = 0; i < result.length; i++) {
                    let id = result[i].name || ""
                    let displayName = result[i].displayName || ""
                    if (displayName != currentLoggerCreds && displayName.match(/Logger.Credentials-.*/) && result[i].value == aiKey) {
                        await this.apim_client.namedValue.getEntityTag(this.resource_group, this.resource_name, id).then((result) => { propEtag = result.eTag })
                        await this.apim_client.namedValue.deleteMethod(this.resource_group, this.resource_name, id, propEtag)
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
        else if (logger.loggerType == "azureEventHub") {
            this._logger.error(`APIM Plugin: Logger EventHub functionality is yet to be implemented`)
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

        let authServerData = await this.ResolveAuthServer(authServer);

        this._logger.log('APIM Plugin: Add/Update APIM auth server: ' + authServer.name)

        let response = await this.apim_client.authorizationServer.createOrUpdate(
            this.resource_group,
            this.resource_name,
            authServer.name,
            authServerData,
            <AuthorizationServerCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update auth server " + authServer.name)
        }
    }

    private async BuildIdentityProviders(): Promise<void> {

        let identityProvidersParam  = this._ingredient.properties.parameters.get('identityProviders')
        if (!identityProvidersParam){
            return
        }

        let identityProviders :IApimIdentityProvider[] = await identityProvidersParam.valueAsync(this._ctx)
        if (!identityProviders){
            return
        }

        for(let i =0; i < identityProviders.length; ++i) {
            let identityProvider = identityProviders[i];
            await this.BuildIdentityProvider(identityProvider)
        }       
    }

    private async BuildIdentityProvider(identityProvider: IApimIdentityProvider): Promise<void> {

        if (this.apim_client == undefined) return

        if(!identityProvider.identityProviderCreateContractType){
            this._logger.error("APIM Plugin: identityProviderContractType is required")
            return
        }

        let identityProviderData = await this.ResolveIdentityProvider(identityProvider);

        this._logger.log('APIM Plugin: Add/Update APIM identity provider: ' + identityProvider.identityProviderCreateContractType)

        let response = await this.apim_client.identityProvider.createOrUpdate(
            this.resource_group,
            this.resource_name,
            identityProvider.identityProviderCreateContractType,
            identityProviderData,
            <IdentityProviderCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update identity provider " + identityProvider.identityProviderCreateContractType)
        }
    }

    private async BuildAutoscaleSettings() : Promise<void> {
        let autoScaleSettingsParam  = this._ingredient.properties.parameters.get('autoScaleSettings')
        if (!this.apim || !autoScaleSettingsParam){
            return
        }

        let autoScaleSettings :IApimAutoscaleSettings[] = await autoScaleSettingsParam.valueAsync(this._ctx)
        if (!autoScaleSettings){
            return
        }

        if (!['Premium', 'Standard'].includes(this.apim.sku.name))
        {
            this._logger.warn('APIM Plugin: Cannot add autoscale settings for sku: ' + this.apim.sku.name + '. Continuing deployment.')
            return;
        }
        
        for(let i =0; i < autoScaleSettings.length; ++i) {
            let autoScaleSetting = autoScaleSettings[i];
            await this.BuildAutoscaleSetting(autoScaleSetting)
        }  
    }

    private async BuildAutoscaleSetting(autoscaleSettings: IApimAutoscaleSettings) : Promise<void> {
        if (this.apim_client == undefined) return

        var monitorClient = new MonitorManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

        let autoscaleSettingsData = await this.ResolveAutoscaleSetting(autoscaleSettings);

        this._logger.log('APIM Plugin: Add/Update APIM autoscale settings: ' + autoscaleSettings.name)

        let response = await monitorClient.autoscaleSettings.createOrUpdate(
            this.resource_group,
            autoscaleSettings.name,
            autoscaleSettingsData,
            <AutoscaleSettingsCreateOrUpdateResponse>{})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update autoscale settings " + autoscaleSettings.name)
        }
    }

    private async BuildBackends() : Promise<void> {
        let backendsParam  = this._ingredient.properties.parameters.get('backends')
        if (!this.apim || !backendsParam){
            return
        }

        let apimBackends :IApimBackend[] = await backendsParam.valueAsync(this._ctx)
        if (!apimBackends){
            return
        }
        
        for(let i =0; i < apimBackends.length; ++i) {
            let apimBackend = apimBackends[i];
            await this.BuildBackend(apimBackend)
        }  
    }

    private async BuildBackend(backend: IApimBackend) : Promise<void> {
        if (this.apim_client == undefined) return

        let backendData = await this.ResolveBackend(backend);

        this._logger.log('APIM Plugin: Add/Update APIM backend: ' + backendData.name)

        let response = await this.apim_client.backend.createOrUpdate(
            this.resource_group,
            this.resource_name,
            backendData.name,
            backendData,
            <BackendCreateOrUpdateOptionalParams>{ifMatch:'*'})

        if (response._response.status  != 200 && response._response.status != 201) {
            this._logger.error("APIM Plugin: Could not create/update backend " + backendData.name)
        }
    }

    private async ResolveApim(apim: IApim) : Promise<ApiManagementServiceResource> {
        if (apim.location) {
            apim.location = (await (new BakeVariable(apim.location)).valueAsync(this._ctx))            
        }
        else{
            apim.location = this._ctx.Region.name
        }

        if (apim.sku) {
            if (apim.sku.name) {
                apim.sku.name = (await (new BakeVariable(apim.sku.name)).valueAsync(this._ctx))            
            }
            if (apim.sku.capacity) {
                apim.sku.capacity = (await (new BakeVariable(apim.sku.capacity.toString())).valueAsync(this._ctx))            
            }
        }

        if(apim.virtualNetworkConfiguration) {
            if (apim.virtualNetworkConfiguration.subnetResourceId) {
                apim.virtualNetworkConfiguration.subnetResourceId = (await (new BakeVariable(apim.virtualNetworkConfiguration.subnetResourceId)).valueAsync(this._ctx))            
            }
        }

        if (apim.additionalLocations && !['Premium'].includes(apim.sku.name)) {
            this._logger.warn('APIM Plugin: Cannot add additional locations for sku: ' + apim.sku.name + '. Continuing deployment.')
            apim.additionalLocations = undefined;
        }

        if (apim.additionalLocations) {
            for(let i =0; i < apim.additionalLocations.length; ++i) {
                let additionalLocation = apim.additionalLocations[i];

                additionalLocation.location = (await (new BakeVariable(additionalLocation.location)).valueAsync(this._ctx)); 
                additionalLocation.sku.name = (await (new BakeVariable(additionalLocation.sku.name)).valueAsync(this._ctx));

                if (additionalLocation.sku.capacity) {
                    additionalLocation.sku.capacity = parseInt(await (new BakeVariable(additionalLocation.sku.capacity.toString())).valueAsync(this._ctx))
                }
                
                if (additionalLocation.virtualNetworkConfiguration) {
                    additionalLocation.virtualNetworkConfiguration.subnetResourceId = (await (new BakeVariable(additionalLocation.virtualNetworkConfiguration.subnetResourceId)).valueAsync(this._ctx));
                }
            } 
        }

        if (apim.hostnameConfigurations) {
            for(let i =0; i < apim.hostnameConfigurations.length; ++i) {
                let hostnameConfiguration = apim.hostnameConfigurations[i];

                hostnameConfiguration.hostName = (await (new BakeVariable(hostnameConfiguration.hostName)).valueAsync(this._ctx));
                hostnameConfiguration.encodedCertificate = (await (new BakeVariable(hostnameConfiguration.encodedCertificate)).valueAsync(this._ctx));
                hostnameConfiguration.certificatePassword = (await (new BakeVariable(hostnameConfiguration.certificatePassword)).valueAsync(this._ctx));

                if (hostnameConfiguration.certificate) {
                    hostnameConfiguration.certificate.expiry = (await (new BakeVariable(hostnameConfiguration.certificate.expiry.toString())).valueAsync(this._ctx));
                    hostnameConfiguration.certificate.thumbprint = (await (new BakeVariable(hostnameConfiguration.certificate.thumbprint)).valueAsync(this._ctx));
                    hostnameConfiguration.certificate.subject = (await (new BakeVariable(hostnameConfiguration.certificate.subject)).valueAsync(this._ctx));
                }
            } 
        }

        if (apim.certificates) {
            for(let i =0; i < apim.certificates.length; ++i) {
                let certificate = apim.certificates[i];

                certificate.encodedCertificate = (await (new BakeVariable(certificate.encodedCertificate)).valueAsync(this._ctx));
                certificate.certificatePassword = (await (new BakeVariable(certificate.certificatePassword)).valueAsync(this._ctx));
                certificate.storeName = (await (new BakeVariable(certificate.storeName)).valueAsync(this._ctx));

                if (certificate.certificate) {
                    certificate.certificate.expiry = (await (new BakeVariable(certificate.certificate.expiry.toString())).valueAsync(this._ctx));
                    certificate.certificate.thumbprint = (await (new BakeVariable(certificate.certificate.thumbprint)).valueAsync(this._ctx));
                    certificate.certificate.subject = (await (new BakeVariable(certificate.certificate.subject)).valueAsync(this._ctx));
                }
            } 
        }

        return apim;
    }

    private async ResolveDiagnostics(apimDiagnostics: IApimDiagnostics) : Promise<DiagnosticSettingsResource> {
        if (apimDiagnostics.eventHubName) {
            apimDiagnostics.eventHubName = (await (new BakeVariable(apimDiagnostics.eventHubName)).valueAsync(this._ctx))            
        }

        if (apimDiagnostics.eventHubAuthorizationRuleId) {
            apimDiagnostics.eventHubAuthorizationRuleId = (await (new BakeVariable(apimDiagnostics.eventHubAuthorizationRuleId)).valueAsync(this._ctx))            
        }

        if (apimDiagnostics.storageAccountId) {
            apimDiagnostics.storageAccountId = (await (new BakeVariable(apimDiagnostics.storageAccountId)).valueAsync(this._ctx))            
        }

        return apimDiagnostics;
    }

    private async ResolveBackend(backend: IApimBackend) : Promise<IApimBackend> { 
        if (backend.name) {
            backend.name = (await (new BakeVariable(backend.name)).valueAsync(this._ctx))            
        }

        if (backend.url) {
            backend.url = (await (new BakeVariable(backend.url)).valueAsync(this._ctx)) 
        }

        return backend;
    }

    private async ResolveNamedValue(namedValue: IApimNamedValue) : Promise<NamedValueCreateContract> {
        if (namedValue.value) {
            namedValue.value = (await (new BakeVariable(namedValue.value)).valueAsync(this._ctx))            
        }

        return namedValue;
    }

    private async ResolveLogger(logger: IApimLogger) : Promise<LoggerContract> { 
        if (logger.name) {
            logger.name = (await (new BakeVariable(logger.name)).valueAsync(this._ctx))            
        }

        if (logger.credentials) {
            let aiKey = (await (new BakeVariable(logger.credentials["instrumentationKey"])).valueAsync(this._ctx))

            logger.credentials["instrumentationKey"] = aiKey
        }

        return logger;
    }

    private async ResolveAuthServer(authServer: IApimAuthServer) : Promise<AuthorizationServerContract> {
        if (authServer.clientRegistrationEndpoint) {
            authServer.clientRegistrationEndpoint = (await (new BakeVariable(authServer.clientRegistrationEndpoint)).valueAsync(this._ctx))            
        }

        if (authServer.authorizationEndpoint) {
            authServer.authorizationEndpoint = (await (new BakeVariable(authServer.authorizationEndpoint)).valueAsync(this._ctx))            
        }

        if (authServer.tokenEndpoint) {
            authServer.tokenEndpoint = (await (new BakeVariable(authServer.tokenEndpoint)).valueAsync(this._ctx))            
        }

        if (authServer.clientId) {
            authServer.clientId = (await (new BakeVariable(authServer.clientId)).valueAsync(this._ctx))            
        }

        if (authServer.clientSecret) {
            authServer.clientSecret = (await (new BakeVariable(authServer.clientSecret)).valueAsync(this._ctx))            
        }

        if (authServer.tokenBodyParameters) {
            for(let i =0; i < authServer.tokenBodyParameters.length; ++i) {
                let tokenBodyParameter = authServer.tokenBodyParameters[i];

                tokenBodyParameter.name = (await (new BakeVariable(tokenBodyParameter.name)).valueAsync(this._ctx));
                tokenBodyParameter.value = (await (new BakeVariable(tokenBodyParameter.value)).valueAsync(this._ctx));
            } 
        }
        
        if (authServer.resourceOwnerUsername) {
            authServer.resourceOwnerUsername = (await (new BakeVariable(authServer.resourceOwnerUsername)).valueAsync(this._ctx))            
        }

        if (authServer.resourceOwnerPassword) {
            authServer.resourceOwnerPassword = (await (new BakeVariable(authServer.resourceOwnerPassword)).valueAsync(this._ctx))            
        }

        return authServer;
    }

    private async ResolveIdentityProvider(identityProvider: IApimIdentityProvider) : Promise<IdentityProviderCreateContract> {
        if (identityProvider.authority) {
            identityProvider.authority = (await (new BakeVariable(identityProvider.authority)).valueAsync(this._ctx))            
        }

        if (identityProvider.clientId) {
            identityProvider.clientId = (await (new BakeVariable(identityProvider.clientId)).valueAsync(this._ctx))            
        }

        if (identityProvider.clientSecret) {
            identityProvider.clientSecret = (await (new BakeVariable(identityProvider.clientSecret)).valueAsync(this._ctx))            
        }

        return identityProvider;
    }

    private async ResolvePolicy(policy: PolicyContract): Promise<PolicyContract> {

        if (policy.value) {
            policy.value = (await (new BakeVariable(policy.value)).valueAsync(this._ctx))            
        }

        if (policy.format != "rawxml-link" &&
            policy.format != "xml-link") {
                return policy
        }

        if (policy.value.startsWith("file:///")) {
            let content = fs.readFileSync(policy.value.replace("file:///", "")).toString('utf-8')
            policy.format = "xml";
            policy.value = content;
            return policy;
        }

        throw new Error("APIM Plugin: Could not resolve policy content at: " + policy.value)
    }
    
    private async ResolveAutoscaleSetting(autoscaleSettings: IApimAutoscaleSettings) : Promise<AutoscaleSettingResource> {
        if (this.apim == undefined || this.apim.id == undefined) return autoscaleSettings

        if(!autoscaleSettings.autoscaleSettingResourceName) {
            autoscaleSettings.autoscaleSettingResourceName = autoscaleSettings.name;
        }

        if(!autoscaleSettings.location) {
            autoscaleSettings.location = this.apim.location;
        }

        if(!autoscaleSettings.targetResourceUri) {
            autoscaleSettings.targetResourceUri = this.apim.id;
        }

        for(let i =0; i < autoscaleSettings.profiles.length; ++i) {
            let autoScaleSettingProfile = autoscaleSettings.profiles[i];
            for(let j =0; j < autoScaleSettingProfile.rules.length; ++j) {
                let autoScaleSettingProfileRule = autoScaleSettingProfile.rules[j];
                autoScaleSettingProfileRule.metricTrigger.metricResourceUri = this.apim.id;
            }
        } 

        return autoscaleSettings;
    }

    private async GetUserId(user?: string) : Promise<string | undefined> {

        if (this.apim_client == undefined) return undefined
        user = user || "Administrator"

        // Administrator is created by default on APIM standup with a name of "1"
        if(user == "Administrator"){
            user = "1"
        }

        let userId = await this.apim_client.user.get(this.resource_group, this.resource_name, user)

        return userId.id
    }
}