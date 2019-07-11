import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { ApplicationInsightsManagementClient } from '@azure/arm-appinsights'
import ApimTemplate from "./api-management.json"
import { ApimBaseUtil } from "./functions"
import * as idx from "./index"

export class ApimBase extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            this._logger.log(`API Manamgement: Base Logging - ${this._ingredient.properties.source}`)
            let aiClient = new ApplicationInsightsManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);
            let client = new ApiManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            const helper = new ARMHelper(this._ctx);
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            let serviceName = params["apiManagementServiceName"].value
            //Import deployment parameters
            let properties = params["properties"]
            delete params["properties"]
            let loggerProps = params["logger"]
            delete params["logger"]
            //Deploy primary ARM template
            await helper.DeployTemplate(this._name, ApimTemplate, params, await util.resource_group())
            //Deploy named Key/Value pairs
            if (properties) {
                let keys = Object.keys(properties.value)
                let apimRg = await util.resource_group() || ""
                let item = ""
                for (let i = 0; i < keys.length; i++) {
                    item = keys[i]
                    let subProps = properties.value[item]
                    let name = item
                    let propId = name.charAt(0).toLowerCase() + name.slice(1)
                    let tags = subProps["tags"] || ""
                    let isSecret = subProps["isSecret"] || false
                    let value = subProps["key"] || ""
                    await client.property.createOrUpdate(apimRg, serviceName, propId, {
                        displayName: name,
                        id: propId,
                        name: name,
                        tags: tags,
                        secret: isSecret,
                        value: value
                    }
                    ).then((result) => {
                        if (result.eTag && result.displayName == name && result.value == value && result.secret == isSecret) {
                            this._logger.log(`property: Deployed=${name}`)
                        }
                        else {
                            throw `property: Deployment Failed=${name}`
                        }
                    });
                }
            }           

            //Create Logger Connection to Application Insights
            if (loggerProps) {
                let keys = Object.keys(loggerProps.value)
                for (let i = 0; i < keys.length; i++) {
                    let item = keys[i]
                    let loggerVal = loggerProps.value[item] || ""                    
                    let aiRg = loggerVal.resourceGroup || await util.resource_group()
                    let apimRg = await util.resource_group() || ""
                    let aiName = item || ""
                    let currentLoggerCreds: any                    
                    if (loggerVal.type == "applicationInsights") {
                        this._logger.log(`logger: Getting instrumentation key from '${aiName}' in resource group '${aiRg}'`)
                        let response = await aiClient.components.get(aiRg, aiName)
                        let aiKey: string = ""
                        if (response.instrumentationKey) {
                            aiKey = response.instrumentationKey || ""
                        }
                        await client.logger.createOrUpdate(apimRg, serviceName, aiName, {
                            credentials: { instrumentationKey: aiKey },
                            loggerType: 'applicationInsights'
                        }).then((result) => {
                            if (result.eTag && result.name == aiName && result.credentials.instrumentationKey && result.loggerType == loggerVal.type) {
                                this._logger.log(`logger: Deployed ${result.loggerType} connection for '${aiName}' on '${serviceName}'`)
                                currentLoggerCreds = result.credentials.instrumentationKey.replace(/{{|}}/ig, "")
                            }
                            else {
                                throw `logger: ${aiName} was not deployed correctly`
                            }
                        });
                        //Clean logger keys
                        if (loggerVal.clean == undefined || loggerVal.value.clean) {
                            let result = await client.property.listByService(apimRg, serviceName) || ""
                            let propEtag = ""
                            for (let i = 0; i < result.length; i++) {
                                let id = result[i].name || ""
                                let displayName = result[i].displayName || ""
                                let currentLogKey = ""
                                let propTags = result[i].tags || []
                                if (displayName != currentLoggerCreds && displayName.match(/Logger.Credentials-.*/) && result[i].value == aiKey) {
                                    await client.property.getEntityTag(apimRg, serviceName, id).then((result) => { propEtag = result.eTag })
                                    await client.property.deleteMethod(apimRg, serviceName, id, propEtag)
                                        .then((result) => {
                                            this._logger.log(`logger: Removed old key - ${displayName}: ${result._response.status == 200}`)
                                        })
                                        .catch((failure) => {
                                            this._logger.log(`logger: failed to remove AppInsights key: ${displayName}`)
                                        })
                                }
                            }
                        }
                    }
                    else if (loggerVal.value.type == "azureEventHub") {
                        this._logger.log(`Logger: EventHub functionality is yet to be implemented`)
                    }
                }
            }

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}
//https://docs.microsoft.com/en-us/javascript/api/azure-arm-apimanagement/propertycontract?view=azure-node-latest