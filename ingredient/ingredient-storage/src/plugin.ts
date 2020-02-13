
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./storage.json"
import ARMTemplateNetwork from "./storageNetwork.json"
import stockAlerts from "./stockAlerts.json"
import { StorageUtils } from "./functions.js";
import { StorageManagementClient } from "@azure/arm-storage"
import { ServiceURL, StorageURL, SharedKeyCredential, Aborter } from "@azure/storage-blob"

export class StoragePlugIn extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log("Storage ingredient logging");
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            //let networkAcls = params['NetworkAcls'] ? params['NetworkAcls'].value : undefined;

            if(params['NetworkAcls']){

                await helper.DeployTemplate(this._name, ARMTemplateNetwork, params, await util.resource_group())
                //there is a limitation around the copy function in the current architecture

            }else{
                await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            }

            await this.ConfigureDiagnosticSettings(params, util);

            let alertTarget = params["storageAccountName"].value
            let alertOverrides = this._ingredient.properties.alerts
            await helper.DeployAlerts(this._name, await util.resource_group(), alertTarget, stockAlerts, alertOverrides)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }

    private async ConfigureDiagnosticSettings(params: any, util: any) {
        let accountName: string;
        let accountKey: string;

        //Get blob storage properties
        accountName = params["storageAccountName"].value;
        const storageUtils = new StorageUtils(this._ctx);
        accountKey = await storageUtils.get_primary_key(accountName, await util.resource_group())
        const credentials = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(credentials, {
            // Enable logger when debugging
            // logger: new ConsoleHttpPipelineLogger(HttpPipelineLogLevel.INFO)
        });
        const blobPrimaryURL = `https://${accountName}.blob.core.windows.net/`;
        var serviceURL = new ServiceURL(blobPrimaryURL, pipeline)
        const serviceProperties = await serviceURL.getProperties(Aborter.none);

        //Get Bake variables for diagnostic settings.  Default to "true" (enabled) and 10 days data retention.
        let blobDiagnosticHourlyMetricsEnabled: string = await util.variable("blobDiagnosticHourlyMetricsEnabled") || "true"
        let blobDiagnosticHourlyMetricsRetentionDays = await util.variable("blobDiagnosticHourlyMetricsRetentionDays") || 10
        let blobDiagnosticMinuteMetricsEnabled: string = await util.variable("blobDiagnosticMinuteMetricsEnabled") || "true"
        let blobDiagnosticMinuteMetricsRetentionDays = await util.variable("blobDiagnosticMinuteMetricsRetentionDays") || 10
        let blobDiagnosticLoggingEnabled: string = await util.variable("blobDiagnosticLoggingEnabled") || "true"
        let blobDiagnosticLoggingRetentionDays = await util.variable("blobDiagnosticLoggingRetentionDays") || 10

        //Workaround due to issues using boolean data type for Bake variables
        var boolBlobDiagnosticHourlyMetricsEnabled: boolean = (blobDiagnosticHourlyMetricsEnabled == "true") ? true : false;
        var boolBlobDiagnosticMinuteMetricsEnabled: boolean = (blobDiagnosticMinuteMetricsEnabled == "true") ? true : false;
        var boolBlobDiagnosticLoggingEnabled: boolean = (blobDiagnosticLoggingEnabled == "true") ? true : false;

        //Debug logging of Bake variables
        this._logger.debug("blobDiagnosticHourlyMetricsEnabled:" + boolBlobDiagnosticHourlyMetricsEnabled)
        this._logger.debug("blobDiagnosticHourlyMetricsRetentionDays:" + blobDiagnosticHourlyMetricsRetentionDays)
        this._logger.debug("blobDiagnosticMinuteMetricsEnabled:" + boolBlobDiagnosticMinuteMetricsEnabled)
        this._logger.debug("blobDiagnosticMinuteMetricsRetentionDays:" + blobDiagnosticMinuteMetricsRetentionDays)
        this._logger.debug("blobDiagnosticLoggingEnabled:" + boolBlobDiagnosticLoggingEnabled)
        this._logger.debug("blobDiagnosticLoggingRetentionDays:" + blobDiagnosticLoggingRetentionDays)

        //Configure hourly metric settings
        serviceProperties.hourMetrics = {
            enabled: boolBlobDiagnosticHourlyMetricsEnabled,
            retentionPolicy: {
                days: blobDiagnosticHourlyMetricsRetentionDays,
                enabled: true
            },
            version: "1.0"
        };

        //Azure will error if includeAPIs is set when the metrics diagnostics setting is not enabled
        if (boolBlobDiagnosticHourlyMetricsEnabled) {
            serviceProperties.hourMetrics.includeAPIs = true;
        }

        //Configure minute metric settings
        serviceProperties.minuteMetrics = {
            enabled: boolBlobDiagnosticMinuteMetricsEnabled,
            retentionPolicy: {
                days: blobDiagnosticMinuteMetricsRetentionDays,
                enabled: true
            },
            version: "1.0"
        };

        //Azure will error if includeAPIs is set when the metrics diagnostics setting is not enabled
        if (boolBlobDiagnosticMinuteMetricsEnabled) {
            serviceProperties.minuteMetrics.includeAPIs = true;
        }

        //Configure logging settings
        serviceProperties.logging = {
            deleteProperty: boolBlobDiagnosticLoggingEnabled,
            read: boolBlobDiagnosticLoggingEnabled,
            retentionPolicy: {
                days: blobDiagnosticLoggingRetentionDays,
                enabled: true
            },
            version: "2.0",
            write: boolBlobDiagnosticLoggingEnabled
        };
        
        //Workaround for bug in Azure Javascript SDK.  https://github.com/Azure/azure-sdk-for-js/issues/2909
        if (!serviceProperties.cors) {
            serviceProperties.cors = undefined;
        }

        //Post blob service properties back to Azure
        await serviceURL.setProperties(Aborter.none, serviceProperties);
    }
}