
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./storage.json"
import stockAlerts from "./stockAlerts.json"
import { StorageUtils } from "./functions.js";
import { StorageSharedKeyCredential, BlobServiceClient, ContainerClient } from "@azure/storage-blob"
import ARMTemplateNetwork from "./storageNetwork.json"
import ARMTemplateDataLake from "./storageDatalake.json"
import * as fs from 'fs';

export class StoragePlugIn extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log("Storage ingredient logging");
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            if(params['deploy'] == undefined || params['deploy'].value) 
            {
                if(params['NetworkAcls'])
                {
                    await helper.DeployTemplate(this._name, ARMTemplateNetwork, params, await util.resource_group())
                    //there is a limitation around the copy function in the current architecture
                }
                else if(params['IsHnsEnabled'])
                {
                    await helper.DeployTemplate(this._name, ARMTemplateDataLake, params, await util.resource_group())
                }
                else
                {
                    await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
                }
    
                try 
                {
                    await this.ConfigureDiagnosticSettings(params, util);                
                }
                catch (diagError) {
                    this._logger.debug('diag error: ' + diagError) //some storage types don't support diag settings
                }
    
                let alertTarget = params["storageAccountName"].value
                let alertOverrides = this._ingredient.properties.alerts
                await helper.DeployAlerts(this._name, await util.resource_group(), alertTarget, stockAlerts, alertOverrides)
            }

            let source = await this._ingredient.properties.source.valueAsync(this._ctx);

            if (source) {
                await this.DeploySource(source, params, util);
            }
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }

    private async DeploySource(source: any, params: any, util: any) {
        
        this._logger.log(`Beginning source upload to storage`);

        if(params['container'] == undefined)
        {
            this._logger.error(`Container parameter not specified`);
            return;
        }

        if(params['uploadPath'] == undefined)
        {
            this._logger.error(`Upload Path parameter not specified`);
            return;
        }

        const blobClient = await this.GetBlobServiceClient(params, util);
        const containerClient = blobClient.getContainerClient(params['container'].value);

        // upload single file
        if(source.startsWith("file:///")) {
            var filePath = source.replace("file:///", "");

            await this.UploadFile(containerClient, filePath, params);
        }
        // upload directory
        else {
            for (const fileName of fs.readdirSync(source)) {
                await this.UploadFile(containerClient, `${source}/${fileName}`, params); 
            }
        }    
    }

    private async ConfigureDiagnosticSettings(params: any, util: any) {
        const blobClient = await this.GetBlobServiceClient(params, util);
        const serviceProperties = await blobClient.getProperties()

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
        serviceProperties.blobAnalyticsLogging = {
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
        await blobClient.setProperties(serviceProperties)
    }

    private async GetBlobServiceClient(params: any, util: any): Promise<BlobServiceClient> {
        let accountName: string;
        let accountKey: string;

        accountName = params["storageAccountName"].value;
        const storageUtils = new StorageUtils(this._ctx);
        accountKey = await storageUtils.get_primary_key(accountName, await util.resource_group())
        const credentials = new StorageSharedKeyCredential(accountName, accountKey);
        const blobPrimaryURL = `https://${accountName}.blob.core.windows.net/`;

        return new BlobServiceClient(blobPrimaryURL, credentials);
    }

    private async UploadFile(containerClient: ContainerClient, filePath: string, params: any) {
        const path = require("path");
        const mime = require('mime-types');
        var AdmZip = require("adm-zip");

        if(params['unzip'] != undefined && params['unzip'].value && mime.lookup(filePath) == "application/zip") {
            var zip = new AdmZip(filePath);
            var zipEntries = zip.getEntries();
    
            for (const zipEntry of zipEntries) {
                this._logger.debug(zipEntry.toString());

                await this.UploadBlob(containerClient, zipEntry.name, zipEntry.getData(), params);
            }
        }
        else {
            await this.UploadBlob(containerClient, path.basename(filePath), fs.readFileSync(filePath), params);
        }
    }

    private async UploadBlob(containerClient: ContainerClient, fileName: string, buffer: Buffer, params: any) {
        const mime = require('mime-types');

        const blobName = `${params['uploadPath'].value}/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(buffer, {
             blobHTTPHeaders: {
               blobContentType: mime.lookup(fileName) || 'application/octet-stream'
             }
           });

        this._logger.log(`Upload blob "${fileName}" successfully`, uploadBlobResponse.requestId)
    }
}