import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { DiagnosticCreateOrUpdateOptionalParams, ApiCreateOrUpdateParameter, ApiContract, PolicyContract, ApiPolicyCreateOrUpdateOptionalParams, ProductContract, ApiVersionSetContract, ApiVersionSetCreateOrUpdateOptionalParams, ApiVersionSetContractDetails, DiagnosticContract } from "@azure/arm-apimanagement/esm/models";
import { RestError } from "@azure/ms-rest-js"
let request = require('async-request')

interface IApimDiagnostics{
    id: string
    data: DiagnosticContract
}

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
    products?: Array<string>
    diagnostics?: Array<IApimDiagnostics>
}

interface IApimOptions {
    apiWaitTime: number
}

export class ApimApiPlugin extends BaseIngredient {
    private     resource_group:     string      = ""
    private     resource_name:      string      = ""
    private     apim_client:        ApiManagementClient | undefined
    private     apim_apis:          Array<ApiContract> | undefined
    private     apim_options:       IApimOptions | undefined

    public async Execute(): Promise<void> {
        try {
            
            await this.Setup()
            await this.BuildAPIs()
        } catch(error){
            this._logger.error('APIM API Plugin Error: ' + error)
            throw error
        }
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
        if (api.products) {
            for(let i=0; i < api.products.length; ++i){
                let productId = api.products[i]
                await this.ApplyProduct(productId, api.id)
            }
        }

        if (api.diagnostics) {
            for(let i=0; i < api.diagnostics.length; ++i){
                let diagnostics = api.diagnostics[i]
                await this.ApplyDiagnostics(diagnostics, api.id)
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
            await this.Sleep(1000)
        }

        return false
    }

	private async ApplyDiagnostics(diagnostics: IApimDiagnostics, apiId: string) : Promise<void> {
        if (this.apim_client == undefined) return

        if (diagnostics.data.loggerId) {
            diagnostics.data.loggerId = (await (new BakeVariable(diagnostics.data.loggerId))?.valueAsync(this._ctx))            
        }

        this._logger.log('Applying diagnostics ' + diagnostics.id + " to API " + apiId)

        let apiResponse = await this.apim_client.diagnostic.createOrUpdate(
            this.resource_group,
            this.resource_name,
            diagnostics.id,
            diagnostics.data,
            <DiagnosticCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
            this._logger.log("APIM Error: Could not apply diagnostics " + diagnostics.id + "to API " + apiId)
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

    private async ApplyProduct(productId: string, apiId: string) : Promise<void> {

        if (this.apim_client == undefined) return

        this._logger.log('Assigning APIs: ' + apiId + " to product " + productId)

        let apiResponse = await this.apim_client.productApi.createOrUpdate(this.resource_group, this.resource_name, productId, apiId)
        if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
            this._logger.log("APIM Error: Could not bind API " + apiId + "to product " + productId)
        }
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
            await this.Sleep(1000)
        }

        throw new Error("APIM error => Could not resolve policy content at: " + policy.value)

    }

    private Sleep(ms: number) : Promise<void> {
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }
}
//https://docs.microsoft.com/en-us/javascript/api/azure-arm-apimanagement/propertycontract?view=azure-node-latest