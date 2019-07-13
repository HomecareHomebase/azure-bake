import { IIngredient, Logger, DeploymentContext, BakeVariable, TagGenerator, IngredientManager } from '@azbake/core';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Deployment, DeploymentProperties } from '@azure/arm-resources/esm/models';
import { stringify } from 'querystring';
import { AnyCnameRecord } from 'dns';
//import ARMTemplate from "./alert.json"

export class ARMHelper {

    constructor(context: DeploymentContext) {
        this._ctx = context;
        this._ingredient = context.Ingredient;
    }

    _ctx: DeploymentContext;
    _ingredient: IIngredient;

    public async DeployTemplate(deploymentName: string, template: any, params: any, resourceGroup: string): Promise<void> {

        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName), this._ctx.Environment.logLevel);

        try {
            //now iterate through all resources in the template and append our standard tags to any existing tags in the ARM template.
            logger.log('appending standard tags');
            template = this.AppendStandardTags(template);

            logger.log('starting arm deployment for template');

            let deployment = <Deployment>{
                properties: <DeploymentProperties>{
                    template: template,
                    parameters: params,
                    mode: "Incremental",
                    debugSetting: {
                        detailLevel: "requestContent, responseContent"
                    }
                }
            }

            logger.log(`resource group: ${resourceGroup}`);
            logger.debug('template:\n' + JSON.stringify(template, null, 3));
            logger.debug('input params:\n' + JSON.stringify(params, null, 3));

            let client = new ResourceManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

            logger.log('validating deployment...');
            let validate = await client.deployments.validate(resourceGroup, deploymentName, deployment);
            if (validate.error)
            {
                let errorMsg = `Validation failed (${(validate.error.code || 'unknown')})`;
                if (validate.error.target){
                    errorMsg += `\nTarget: ${validate.error.target}`;
                }
                if (validate.error.message) {
                    errorMsg += `\nMessage: ${validate.error.message}`;
                }
                if (validate.error.details){
                    errorMsg += "\nDetails:";
                    validate.error.details.forEach(x=>{
                        errorMsg += `\n${x.message}`;
                    });
                }

                logger.error(errorMsg);
                throw new Error('validate failed');
            }
            logger.log('starting deployment...');
            let result = await client.deployments.createOrUpdate(resourceGroup, deploymentName, deployment);
            if (result._response.status > 299) {
                throw new Error(`ARM Error ${result._response.bodyAsText}`);
            }

            logger.log('deployment finished...');

        } catch(error) {
            logger.error('deployment failed: ' + error);
            throw error;
        }
    }

    public async DeployAlerts(deploymentName: string, resourceGroup: string, alertTarget: string, stockAlerts: any, alertsOverrides: Map<string, BakeVariable>): Promise<void> {
        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName), this._ctx.Environment.logLevel);
        var json = require('./alert.json');

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
        let alertOverridesParams = await this.BakeParamsToARMParamsAsync(deploymentName, alertsOverrides);
        let stockAlertsMap = this.objToVariableMap(stockAlerts);
        let stockAlertsParams = await this.BakeParamsToARMParamsAsync(deploymentName, stockAlertsMap);

        for (let stockAlert in stockAlerts) {
            let stockAlertMap = this.objToVariableMap(stockAlerts[stockAlert]);


            let i: any  | undefined
            i = alertsOverrides.get(stockAlert)

            if (i !== undefined) {
                var b = await i.valueAsync(this._ctx) 
            }

            var c = this.objToVariableMap(b);
            var d = await this.BakeParamsToARMParamsAsync(deploymentName, c);

            let stockAlertParams = await this.BakeParamsToARMParamsAsync(deploymentName, stockAlertMap);
            let alertOverrideParams = alertOverridesParams[stockAlert];

            //let alertARM = await this.BakeParamsToARMParamsAsync(deploymentName, alertOverrideParams);

            let mergedAlertParams = this.mergeDeep(stockAlertParams, d)

            mergedAlertParams["source-rg"] = { "value": resourceGroup };
            mergedAlertParams["source-name"] = { "value": alertTarget };

            let timeAggregation = mergedAlertParams["timeAggregation"].value;
            let metricName = mergedAlertParams["metricName"].value;
            let alertType = mergedAlertParams["alertType"].value;
            let tempName = '-' + alertTarget + '-' + timeAggregation + '-' + metricName + '-' + alertType;
            let alertName = util.create_resource_name("alert", tempName, true);            
            logger.log(alertName);
            mergedAlertParams["alertName"] = { "value": alertName };

            await this.DeployTemplate(deploymentName, json, mergedAlertParams, resourceGroup);
        }
    }

    public async BakeParamsToARMParamsAsync(deploymentName: string, params: Map<string, BakeVariable>): Promise<any> {

        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName));

        let props: any = {};

        for (const [n,v] of params){
            props[n] = {
                "value": await v.valueAsync(this._ctx)
            };
            let log = `${n}=${await v.valueAsync(this._ctx)}`;
            logger.log(`param: ${log}`);
        }
        return props;
    }

    public GenerateTags(extraTags: Map<string,string> | null = null) : any
    {
       var tagGen = new TagGenerator(this._ctx)
       return tagGen.GenerateTags(extraTags)
    }

    private AppendStandardTags(template: any) : any
    {
        let resources: any[] = template.resources;
        resources.forEach( resource => {
            let resourceType = resource.type;

            if (resourceType != 'Microsoft.Resources/deployments')
            {
                let localTags = new Map<string,string>();
                if (resource.tags)
                {
                    Object.keys(resource.tags).forEach(k=>{
                        localTags.set(k,resource.tags[k])
                    })
                }
                resource.tags = this.GenerateTags(localTags)
            } else if (resource.properties.template)
            {
                resource.properties.template = this.AppendStandardTags(resource.properties.template);
            }
        });

        template.resources = resources;
        return template;
    }

    private objToVariableMap(obj: any) {
        let strMap = new Map<string,BakeVariable>();

        //support variables being empty, or not defined in the YAML.
        if (obj == null || undefined)
        {
            return strMap
        }

        for (let k of Object.keys(obj)) {
            strMap.set(k, new BakeVariable(obj[k]));
        }
        return strMap;
    }

    private isObject(item:any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
  
    private mergeDeep(target:any, ...sources:any): any {
        if (!sources.length) return target;
        const source = sources.shift();
    
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
  
        return this.mergeDeep(target, ...sources);
    }
}