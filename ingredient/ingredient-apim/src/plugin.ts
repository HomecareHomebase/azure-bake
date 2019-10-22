import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ApiManagementClient, ApiPolicy } from "@azure/arm-apimanagement"
import { ApiCreateOrUpdateParameter, ApiContract, PolicyContract, ApiPolicyCreateOrUpdateOptionalParams, SubscriptionCreateParameters, ProductContract, ProductCreateOrUpdateOptionalParams, ProductPolicyCreateOrUpdateOptionalParams, SubscriptionCreateOrUpdateOptionalParams, ApiVersionSetContract, ApiVersionSetCreateOrUpdateOptionalParams, ApiVersionSetContractDetails } from "@azure/arm-apimanagement/esm/models";
import { RestError, RequestOptionsBase } from "@azure/ms-rest-js"
let request = require('async-request')

interface IApimPolicy {
    operation?: string
    data: PolicyContract
}

interface IApimApiVersion {
    id: string
    data: ApiVersionSetContract
    versions: Array<IApimApi>
}

interface IApimApi {
    id : string
    version: string
    data: ApiCreateOrUpdateParameter
    policies?: Array<IApimPolicy>
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
    private     apim_apis:          Array<ApiContract> | undefined
    private     apim_options:       IApimOptions | undefined

    public async Execute(): Promise<void> {
        try {
            
            await this.Setup()
            await this.BuildAPIs()
            await this.BuildProducts()

        } catch(error){
            this._logger.error('APIM Plugin Error: ' + error)
            throw error
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

    private async BuildAPIs(): Promise<void> {
       
        let apisParam  = this._ingredient.properties.parameters.get('apis')
        if (!apisParam){
            return
        }

        let apis :IApimApiVersion[] = await apisParam.valueAsync(this._ctx)
        if (!apis){
            return
        }

        for(let i =0; i < apis.length; ++i) {
            let api = apis[i];
            await this.BuildAPiVersion(api)
        }       
    }

    private async BuildProduct(product: IApimProduct): Promise<void> {

        if (this.apim_client == undefined) return

        this._logger.log('Add/Update APIM product: ' + product.id)
        let response = await this.apim_client.product.createOrUpdate(this.resource_group, this.resource_name, product.id, product.data, <ProductCreateOrUpdateOptionalParams>{ifMatch:'*'})
        if (response._response.status  != 200 && response._response.status != 201) {
            throw Error('APIM Error : Could not create/update product ' + product.id)
        }

        if (product.apis) {
            this._logger.log('Assigning APIs: ' + product.apis.toString() + " to product " + product.id)
            for(let i=0; i < product.apis.length; ++i){
                let api = product.apis[i]
                let apiResponse = await this.apim_client.productApi.createOrUpdate(this.resource_group, this.resource_name, product.id, api)
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.log("APIM Error: Could not bind API " + api + "to product " + product.id)
                }
            }
        }

        if (product.groups) {
            this._logger.log('Assigning Groups: ' + product.groups.toString() + " to product " + product.id)
            for(let i=0; i < product.groups.length; ++i){
                let group = product.groups[i]
                let apiResponse = await this.apim_client.productGroup.createOrUpdate(this.resource_group, this.resource_name, product.id, group)
                if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
                    this._logger.log("APIM Error: Could not bind Group " + group + "to product " + product.id)
                }
            }
        }

        if (product.policy) {
            this._logger.log('Add/Update APIM producy policy: ' + product.id)
            let policyData = await this.ResolvePolicy(product.policy)
            let policyResponse = await this.apim_client.productPolicy.createOrUpdate(this.resource_group, this.resource_name, product.id, policyData, <ProductPolicyCreateOrUpdateOptionalParams>{ifMatch:'*'})
        }

        if (product.subscriptions) {
            
            for(let i=0; i < product.subscriptions.length; ++i){
                let sub = product.subscriptions[i]
                await this.BuildSubscription(sub, product.id)
            }
        }
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

        this._logger.log('Add/Update APIM Subscription : ' + sub.id + " scoped to " + productId)
        let response = await this.apim_client.subscription.createOrUpdate(this.resource_group, this.resource_name, sub.id,params, <SubscriptionCreateOrUpdateOptionalParams>{ifMatch:'*'})
        if (response._response.status != 200 && response._response.status != 201) {
            throw new Error("APIM Error: Could not create/update subscription for product" + productId + " subId: " + sub.id)
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

    private async BuildAPiVersion(api: IApimApiVersion) : Promise<void> { 

        if (this.apim_client == undefined) return

        let apiVersionResponse = await this.apim_client.apiVersionSet.createOrUpdate(this.resource_group, this.resource_name, api.id, api.data, <ApiVersionSetCreateOrUpdateOptionalParams>{ifMatch:'*'})

        for(let i=0; i< api.versions.length; ++i) {
            let version = api.versions[i]
            await this.BuildAPI(version, apiVersionResponse)
        }

    }
    
    private async BuildAPI(api: IApimApi, apiVersion: ApiVersionSetContractDetails) : Promise<void> { 
        
        if (this.apim_client == undefined) return

        let apiContract = this.GetApi(api.id)
        if (apiContract) {
            this._logger.log('Updating API ' + api.id + " " + api.version)
        }
        else {
            this._logger.log('Creating API ' + api.id + " " + api.version)

        }

        api.data = await this.ResolveApi(api.data)
        let blockResult = await this.BlockForApi(api)

        if (!blockResult) {
            throw new Error("APIM error: Could not fetch API source => " + api.data.value)
        }

        let apiRevisionId : string
        try {
            api.data.apiVersion = api.version
            api.data.apiVersionSetId = apiVersion.id
            api.data.apiVersionSet = apiVersion
            let result = await this.apim_client.api.createOrUpdate(this.resource_group, this.resource_name, api.id, api.data, {ifMatch : '*'})
            this._logger.log("API " + result.displayName + " published")
            apiRevisionId = result.apiRevision || ""
                
        } catch (error) {

            if (error instanceof RestError){

                let re: RestError = error
                let msg: string = re.message
                let details: any[] = re.body.details
                details.forEach(e => {
                    msg += "\n" + e.message
                })
                throw msg    
            }
            else {
                throw error
            }
        }

        if (api.policies) {
            for(let i=0; i < api.policies.length; ++i){
                let policy = api.policies[i]
                await this.ApplyAPIPolicy(policy, api.id)
            }
        }

    }

    private async ApplyAPIPolicy(policy: IApimPolicy, apiId: string) : Promise<void> {

        if (this.apim_client == undefined) return

        let operation = policy.operation || "base"

        this._logger.log("Applying API Policy for API: " + apiId + " operation: " + operation)
        let policyData = await this.ResolvePolicy(policy.data)

        if (operation == "base") {
            let response = await this.apim_client.apiPolicy.createOrUpdate(this.resource_group, this.resource_name, apiId, policyData, <ApiPolicyCreateOrUpdateOptionalParams>{ifMatch: '*'})
            if (response._response.status != 200 && response._response.status != 201) {
                throw new Error("APIM Error: Could not apply API Policy for API " + apiId)
            }
        }
        else {
            let response = await this.apim_client.apiOperationPolicy.createOrUpdate(this.resource_group, this.resource_name, apiId, operation, policyData,<ApiPolicyCreateOrUpdateOptionalParams>{ifMatch: '*'})
            if (response._response.status != 200 && response._response.status != 201) {
                throw new Error("APIM Error: Could not apply API Policy for API " + apiId + " operation: " + operation)
            }
        }

    }

    private async BlockForApi(api: IApimApi): Promise<boolean> {

        if (api.data.format != "openapi-link" &&
            api.data.format != "swagger-link-json" &&
            api.data.format != "wadl-link-json" &&
            api.data.format != "wsdl-link") {
            return true
        }

        let blockTime = (this.apim_options || <IApimOptions>{}).apiWaitTime

        for(let i=0; i < blockTime; ++i){
            let response = await request(api.data.value)
            if (response.statusCode >= 200 && response.statusCode < 400){
                return true
            }
            await this.sleep(1000)
        }

        return false
    }

    private GetApi(id: string): ApiContract | null {

        if (this.apim_apis == undefined) return null

        let rApi : ApiContract | null = null
        this.apim_apis.forEach(api => {
            if (api.name == id) {
                rApi = api
            }
        });

        return rApi
    }

    private async ResolveApi(api: ApiCreateOrUpdateParameter) : Promise<ApiCreateOrUpdateParameter> {

        if (api.serviceUrl) {
            api.serviceUrl = (await (new BakeVariable(api.serviceUrl)).valueAsync(this._ctx))            
        }

        if (api.value) {
            api.value = (await (new BakeVariable(api.value)).valueAsync(this._ctx))
        }

        return api
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
            await this.sleep(1000)
        }

        throw new Error("APIM error => Could not resolve policy content at: " + policy.value)

    }

    private async Setup(): Promise<boolean> {

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

        let source = await this._ingredient.properties.source.valueAsync(this._ctx)

        let rgOverride : string
        rgOverride = await util.resource_group();

        if (!source) {
            this._logger.log('APIM Source can not be empty')
            return false
        }

        let bakeResource = util.parseResource(source)
        this.resource_group = bakeResource.resourceGroup || rgOverride
        this.resource_name = bakeResource.resource

        if (!this.resource_group) {
            this._logger.log('APIM resourceGroup can not be empty')
            return false
        }
        if (!this.resource_name) {
            this._logger.log('APIM resourceName can not be empty')
            return false
        }

        this._logger.log('Binding APIM to resource: ' + this.resource_group + '\\' + this.resource_name);
        this.apim_client = new ApiManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)

        if (this.apim_client == null) {
            this._logger.log('APIM client is null')
            return false
        }

        let apis : Array<ApiContract> = new Array<ApiContract>()
        let svcResponse = await this.apim_client.api.listByService(this.resource_group, this.resource_name)
        apis = apis.concat(svcResponse)
        while(svcResponse.nextLink) {
            svcResponse = await this.apim_client.api.listByServiceNext(svcResponse.nextLink)
            apis = apis.concat(svcResponse)
        }
        this.apim_apis = apis

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

    private sleep(ms: number) : Promise<void> {
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }

}