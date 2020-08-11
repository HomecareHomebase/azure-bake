import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { DiagnosticCreateOrUpdateOptionalParams, ApiCreateOrUpdateParameter, ApiContract, PolicyContract, ApiPolicyCreateOrUpdateOptionalParams, ProductContract, ApiVersionSetContract, ApiVersionSetCreateOrUpdateOptionalParams, ApiVersionSetContractDetails, DiagnosticContract } from "@azure/arm-apimanagement/esm/models";
import { RestError } from "@azure/ms-rest-js"
import * as fs from 'fs';
let request = require('async-request')

interface IApimApiDiagnostics extends DiagnosticContract{
    name: string
    loggerName?: string
}

interface IApimPolicy extends PolicyContract{
    operation?: string
}

interface IApimApiVersion extends ApiVersionSetContract{
    name: string
    versions: Array<IApimApi>
}

interface IApimApi extends ApiCreateOrUpdateParameter{
    name : string
    version: string
    policies?: Array<IApimPolicy>
    products?: Array<string>
    diagnostics?: Array<IApimApiDiagnostics>
}

interface IApimOptions {
    apiWaitTime: number
    forceWait: boolean
    apiRetries: number
    apiRetryWaitTime: number
}

export class ApimApiPlugin extends BaseIngredient {
    private     resource_group:     string      = ""
    private     resource_name:      string      = ""
    private     apim_client:        ApiManagementClient | undefined
    private     apim_apis:          Array<ApiContract> | undefined
    private     apim_options:       IApimOptions | undefined

    public async Execute(): Promise<void> {
        try {
            
            if(await this.Setup())
            {
                await this.BuildAPIs()
            }
        } catch(error){
            this._logger.error('APIM API Plugin: ' + error)
            throw error
        }
    }

    private async Setup(): Promise<boolean> {
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

        let source = await this._ingredient.properties.source.valueAsync(this._ctx)

        let rgOverride : string
        rgOverride = await util.resource_group();

        if (!source) {
            this._logger.log('APIM API Plugin: Source can not be empty')
            return false
        }

        let bakeResource = util.parseResource(source)
        this.resource_group = bakeResource.resourceGroup || rgOverride
        this.resource_name = bakeResource.resource

        if (!this.resource_group) {
            this._logger.log('APIM API Plugin: resourceGroup can not be empty')
            return false
        }
        if (!this.resource_name) {
            this._logger.log('APIM API Plugin: resourceName can not be empty')
            return false
        }

        this._logger.log('APIM API Plugin: Binding APIM to resource: ' + this.resource_group + '\\' + this.resource_name);
        this.apim_client = new ApiManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)

        if (this.apim_client == null) {
            this._logger.log('APIM API Plugin: APIM client is null')
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
            this.apim_options.apiRetries = this.apim_options.apiRetries <= 0 || !this.apim_options.apiRetries ? 1 : this.apim_options.apiRetries
            this.apim_options.apiRetryWaitTime = this.apim_options.apiRetryWaitTime <= 0 || !this.apim_options.apiRetryWaitTime ? 5 : this.apim_options.apiRetryWaitTime
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

        let apiVersionResponse = await this.apim_client.apiVersionSet.createOrUpdate(this.resource_group, this.resource_name, api.name, api, <ApiVersionSetCreateOrUpdateOptionalParams>{ifMatch:'*'})

        for(let i=0; i< api.versions.length; ++i) {
            let version = api.versions[i]
            await this.BuildAPI(version, apiVersionResponse)
        }
    }

    private async BuildAPI(api: IApimApi, apiVersion: ApiVersionSetContractDetails) : Promise<void> { 
        
        if (this.apim_client == undefined) return

        let apiContract = this.GetApi(api.name)
        if (apiContract) {
            this._logger.log('APIM API Plugin: Updating API ' + api.name + " " + api.version)
        }
        else {
            this._logger.log('APIM API Plugin: Creating API ' + api.name + " " + api.version)

        }

        if (api.serviceUrl) {
            api.serviceUrl = (await (new BakeVariable(api.serviceUrl)).valueAsync(this._ctx))            
        }

        if (api.value) {
            api.value = (await (new BakeVariable(api.value)).valueAsync(this._ctx))
        }
        
        let apimOptions = (this.apim_options || <IApimOptions>{});

        let blockResult = await this.BlockForApi(api, apimOptions)

        if (!blockResult) {
            throw new Error("APIM API Plugin: Could not fetch API source => " + api.value)
        }

        for(let i=0; i <= apimOptions.apiRetries; ++i) {
            let apiRevisionId : string
            try {
                api.apiVersion = api.version
                api.apiVersionSetId = apiVersion.id
                api.apiVersionSet = apiVersion
                let result = await this.apim_client.api.createOrUpdate(this.resource_group, this.resource_name, api.name, api, {ifMatch : '*'})
                this._logger.log("APIM API Plugin: API " + result.displayName + " published")
                apiRevisionId = result.apiRevision || ""

                break; 
            } catch (error) {
                if (i == apimOptions.apiRetries) {
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
                else {
                    await this.Sleep(apimOptions.apiRetryWaitTime * 1000);
                }
            }
        }

        if (api.policies) {
            for(let i=0; i < api.policies.length; ++i){
                let policy = api.policies[i]
                await this.ApplyAPIPolicy(policy, api.name)
            }
        }
        if (api.products) {
            for(let i=0; i < api.products.length; ++i){
                let productId = api.products[i]
                await this.ApplyProduct(productId, api.name)
            }
        }

        if (api.diagnostics) {
            for(let i=0; i < api.diagnostics.length; ++i){
                let diagnostics = api.diagnostics[i]
                await this.ApplyApiDiagnostics(diagnostics, api.name)
            }
        }
    }

    private async BlockForApi(api: IApimApi, apiOptions: IApimOptions): Promise<boolean> {

        if (api.format != "openapi-link" &&
            api.format != "swagger-link-json" &&
            api.format != "wadl-link-json" &&
            api.format != "wsdl-link") {
            return true
        }

        let blockTime = (this.apim_options || <IApimOptions>{}).apiWaitTime

        this._logger.debug('APIM API Plugin: Waiting for API for ' + blockTime + ' seconds.');

        // if we are forcing wait time, then just wait the entire time up front. Useful for changing API for
        // same version on services that are already deployed. ie (overriding v1 for development)
        if (apiOptions.forceWait){
            this._logger.debug('Force wait for ' + apiOptions.apiWaitTime + ' seconds.');
            await this.Sleep(apiOptions.apiWaitTime * 1000);
        }

        for(let i=0; i < blockTime; ++i) {
            let response: any | undefined;

            try {
                response = await request(api.value);
            } catch(error) {
                this._logger.error('APIM API Plugin: Error waiting for API: ' + error)
            }

            if(response && (response.statusCode >= 200 && response.statusCode < 400)) {
                this._logger.debug('APIM API Plugin: API found with response code ' + response.statusCode + ' at: ' + api.value);
                return true;
            }
            else {
                this._logger.debug('APIM API Plugin: API not found with response code ' + response.statusCode + '. Sleeping for 1s.');
                await this.Sleep(1000);
            }
        }

        return false;
    }

	private async ApplyApiDiagnostics(diagnostics: IApimApiDiagnostics, apiId: string) : Promise<void> {
        if (this.apim_client == undefined) return

        if (diagnostics.loggerId) {
            diagnostics.loggerId = (await (new BakeVariable(diagnostics.loggerId)).valueAsync(this._ctx))            
        }
        else if (diagnostics.loggerName){
            let logger = await this.apim_client.logger.get(this.resource_group, this.resource_name, diagnostics.loggerName);

            if(logger.id){
                diagnostics.loggerId = logger.id   
            }
        }

        this._logger.log('APIM API Plugin: Applying diagnostics ' + diagnostics.name + " to API " + apiId)

        let apiResponse = await this.apim_client.apiDiagnostic.createOrUpdate(
            this.resource_group,
            this.resource_name,
            apiId,
            diagnostics.name,
            diagnostics,
            <DiagnosticCreateOrUpdateOptionalParams>{ifMatch:'*'})
        
        if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
            this._logger.error("APIM API Plugin: Could not apply diagnostics " + diagnostics.name + "to API " + apiId)
        }
    }

    private async ApplyAPIPolicy(policy: IApimPolicy, apiId: string) : Promise<void> {

        if (this.apim_client == undefined) return

        let operation = policy.operation || "base"

        this._logger.log("APIM API Plugin: Applying API Policy for API: " + apiId + " operation: " + operation)
        let policyData = await this.ResolvePolicy(policy)

        if (operation == "base") {
            let response = await this.apim_client.apiPolicy.createOrUpdate(this.resource_group, this.resource_name, apiId, policyData, <ApiPolicyCreateOrUpdateOptionalParams>{ifMatch: '*'})
            if (response._response.status != 200 && response._response.status != 201) {
                this._logger.error("APIM API Plugin: Could not apply API Policy for API " + apiId)
            }
        }
        else {
            let response = await this.apim_client.apiOperationPolicy.createOrUpdate(this.resource_group, this.resource_name, apiId, operation, policyData,<ApiPolicyCreateOrUpdateOptionalParams>{ifMatch: '*'})
            if (response._response.status != 200 && response._response.status != 201) {
                this._logger.error("APIM API Plugin: Could not apply API Policy for API " + apiId + " operation: " + operation)
            }
        }
    }

    private async ApplyProduct(productId: string, apiId: string) : Promise<void> {

        if (this.apim_client == undefined) return

        this._logger.log('APIM API Plugin: Assigning APIs: ' + apiId + " to product " + productId)

        let apiResponse = await this.apim_client.productApi.createOrUpdate(this.resource_group, this.resource_name, productId, apiId)
        if (apiResponse._response.status != 200 && apiResponse._response.status != 201){
            this._logger.error("APIM API Plugin: Could not bind API " + apiId + "to product " + productId)
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

    private async ResolvePolicy(policy: IApimPolicy): Promise<PolicyContract> {

        if (policy.value) {
            policy.value = (await (new BakeVariable(policy.value)).valueAsync(this._ctx))            
        }

        if (policy.format != "rawxml-link" &&
            policy.format != "xml-link") {
                return policy
        }

        let blockTime = (this.apim_options || <IApimOptions>{}).apiWaitTime

        if (policy.value.startsWith("file:///")) {

            let content = fs.readFileSync(policy.value.replace("file:///", "")).toString('utf-8')
            policy.format = "xml";
            policy.value = content;
            return policy;
        }

        for(let i=0; i < blockTime; ++i){
            let response = await request(policy.value)
            if (response.statusCode >= 200 && response.statusCode < 400){
                policy.format = "xml";
                policy.value = response.body;
                return policy
            }
            await this.Sleep(1000)
        }

        throw new Error("APIM API Plugin: Could not resolve policy content at: " + policy.value)
    }

    private Sleep(ms: number) : Promise<void> {
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }
}
//https://docs.microsoft.com/en-us/javascript/api/azure-arm-apimanagement/propertycontract?view=azure-node-latest