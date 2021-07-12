
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./storage.json"
import stockAlerts from "./stockAlerts.json"
import { StorageUtils } from "./functions.js";
import { StorageSharedKeyCredential, BlobServiceClient, ContainerClient } from "@azure/storage-blob"
import ARMTemplateNetwork from "./storageNetwork.json"
import ARMTemplateDataLake from "./storageDatalake.json"
import * as fs from 'fs';

const path = require("path")

export class StoragePlugIn extends BaseIngredient {
    
    private resourceGroup: string = ""

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log("Storage ingredient logging");
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            // define resource group
            let rgOverrideParam  = this._ingredient.properties.parameters.get('rgOverride')
            if (rgOverrideParam) {
                this.resourceGroup = await rgOverrideParam.valueAsync(this._ctx)
                // remove rgOverride if it exists since its not in the ARM template
                delete params["rgOverride"]
            }
            else {
                this.resourceGroup = await util.resource_group();
            }

            // pull out variables for uploading to storage account and remove from params collection since not present in the ARM template
            let deploy = params['deploy'] === undefined ? true : params['deploy'].value; 
            let container = params['container'] === undefined ? "" : params['container'].value;
            let uploadPath = params['uploadPath'] === undefined ? "" : params['uploadPath'].value;
            let unzip = params['unzip'] === undefined ? false : params['unzip'].value; 

            delete params["deploy"]
            delete params["container"]
            delete params["uploadPath"]
            delete params["unzip"]

            // begin deployment
            if(deploy) 
            {
                if(params['NetworkAcls'])
                {
                    await helper.DeployTemplate(this._name, ARMTemplateNetwork, params, this.resourceGroup)
                    //there is a limitation around the copy function in the current architecture
                }
                else if(params['IsHnsEnabled'])
                {
                    await helper.DeployTemplate(this._name, ARMTemplateDataLake, params, this.resourceGroup)
                }
                else
                {
                    await helper.DeployTemplate(this._name, ARMTemplate, params, this.resourceGroup)
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
                await helper.DeployAlerts(this._name, this.resourceGroup, alertTarget, stockAlerts, alertOverrides)
            }

            let source = await this._ingredient.properties.source.valueAsync(this._ctx);

            if (source) {
                await this.DeploySource(source, container, uploadPath, unzip, params);
            }
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }

    private async ConfigureDiagnosticSettings(params: any, util: any) {
        const blobClient = await this.GetBlobServiceClient(params);
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

    private async DeploySource(source: any, container: string, uploadPath: string, unzip: boolean, params: any) {
        
        this._logger.log(`Beginning source upload to storage`);

        if(source == null)
        {
            this._logger.error(`source parameter not specified`);
            return;
        }

        if(container == null)
        {
            this._logger.error(`container parameter not specified`);
            return;
        }

        if(uploadPath == null)
        {
            this._logger.error(`uploadPath parameter not specified`);
            return;
        }

        if(unzip == null)
        {
            this._logger.error(`unzip parameter not specified`);
            return;
        }

        const blobClient = await this.GetBlobServiceClient(params);
        const containerClient = blobClient.getContainerClient(container);

        // upload single file
        if(source.startsWith("file:///")) {
            var filePath = source.replace("file:///", "");

            await this.UploadFile(containerClient, filePath, uploadPath, unzip);
        }
        // upload directory
        else {
            for (const fileName of walkFilesSync(source)) {
                let normalizedUploadPath = path.join(uploadPath, path.dirname(fileName).replace(path.normalize(source), ''));

                await this.UploadFile(containerClient, fileName, normalizedUploadPath, unzip); 
            }
        }    
    }

    private async GetBlobServiceClient(params: any): Promise<BlobServiceClient> {
        let accountName: string;
        let accountKey: string;

        accountName = params["storageAccountName"].value;
        const storageUtils = new StorageUtils(this._ctx);
        accountKey = await storageUtils.get_primary_key(accountName, this.resourceGroup)
        const credentials = new StorageSharedKeyCredential(accountName, accountKey);
        const blobPrimaryURL = `https://${accountName}.blob.core.windows.net/`;

        return new BlobServiceClient(blobPrimaryURL, credentials);
    }

    private async UploadFile(containerClient: ContainerClient, filePath: string, uploadPath: string, unzip: boolean) {
        const path = require("path");
        const mime = require('mime-types');
        var AdmZip = require("adm-zip");

        if(unzip && mime.lookup(filePath) == "application/zip") {
            var zip = new AdmZip(filePath);
            var zipEntries = zip.getEntries();
    
            for (const zipEntry of zipEntries) {
                this._logger.debug(zipEntry.toString());

                await this.UploadBlob(containerClient, zipEntry.name, zipEntry.getData(), uploadPath);
            }
        }
        else {
            await this.UploadBlob(containerClient, path.basename(filePath), fs.readFileSync(filePath), uploadPath);
        }
    }

    private async UploadBlob(containerClient: ContainerClient, fileName: string, buffer: Buffer, uploadPath: string) {
        const mime = require('mime-types');

        const blobName = `${uploadPath}/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(buffer, {
             blobHTTPHeaders: {
               blobContentType: mime.lookup(fileName) || 'application/octet-stream'
             }
           });

        this._logger.log(`Upload blob "${fileName}" successfully`, uploadBlobResponse.requestId)
    }
}

const walkFilesSync = (dir: fs.PathLike, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
  
      filelist = fs.statSync(path.join(dir, file)).isDirectory()
        ? walkFilesSync(path.join(dir, file), filelist)
        : filelist.concat(path.join(dir, file));
  
    });
  return filelist;
}