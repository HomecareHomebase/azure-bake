import { IIngredient, Logger, DeploymentContext, BakeVariable, TagGenerator, IngredientManager, objToVariableMap } from '@azbake/core';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Deployment, DeploymentProperties } from '@azure/arm-resources/esm/models';
import { stringify } from 'querystring';
import { AnyCnameRecord } from 'dns';
import alertTemplate from "./alert.json"
import { RestError } from '@azure/ms-rest-js';

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

            const token: any = this._ctx.AuthToken

            let client = new ResourceManagementClient(token, this._ctx.Environment.authentication.subscriptionId);

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
                        errorMsg += `\n\t${x.message}`;
                        if (x.details) {
                            let dIdx = 0;
                            x.details.forEach(d=>{
                                errorMsg += `\n\tDetail[${dIdx++}]: ${d.code} => ${d.message}`
                            });
                        }
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
            if (error instanceof RestError) error = JSON.stringify(error.body.error.details); // [string]error misses Azure deployment failure messages. 
            logger.error('deployment failed: ' + error); 
            throw error;
        }
    }

    public async DeployAlerts(targetDeploymentName: string, resourceGroup: string, alertTarget: string, stockAlerts: any, alertsOverrides: Map<string, BakeVariable>): Promise<void> {
        let deploymentName:string = 'alerts-' + targetDeploymentName;
        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName), this._ctx.Environment.logLevel);
        
        let alertOverridesParams = await this.BakeParamsToARMParamsAsync(deploymentName, alertsOverrides);
        let stockAlertsMap = objToVariableMap(stockAlerts);
        let stockAlertsParams = await this.BakeParamsToARMParamsAsync(deploymentName, stockAlertsMap);

        for (let stockAlert in stockAlerts) {
            let stockAlertMap = objToVariableMap(stockAlerts[stockAlert]);
            let stockAlertParamsARM = await this.BakeParamsToARMParamsAsync(deploymentName, stockAlertMap);
            let alertOverrideParams: any  | undefined
            alertOverrideParams = alertsOverrides.get(stockAlert)
            
            let mergedAlertParamsARM: any, alertOverrideParamsARM: any;

            if (alertOverrideParams !== undefined) {
                let alertOverrideParamsMap = objToVariableMap(await alertOverrideParams.valueAsync(this._ctx))
                alertOverrideParamsARM = await this.BakeParamsToARMParamsAsync(deploymentName, alertOverrideParamsMap)

                mergedAlertParamsARM = this.mergeDeep(stockAlertParamsARM, alertOverrideParamsARM)
            }
            else {
                mergedAlertParamsARM = stockAlertParamsARM
            }

            await this.DeployAlert(deploymentName, resourceGroup, alertTarget, mergedAlertParamsARM)

        }
    }

    public async DeployAlert(deploymentName: string, resourceGroup: string, alertTarget: string, params: any): Promise<void> {
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
        
        params["source-rg"] = { "value": resourceGroup };
        params["source-name"] = { "value": alertTarget };

        let timeAggregation = params["timeAggregation"].value;
        let metricName:string = params["metricName"].value;
        metricName = metricName.replace(/[/%]/g,'_')  //replace / and % with _.  They are valid metric name character but not valid in alert names.
        let alertType = params["alertType"].value;
        let tempName = '-' + alertTarget + '-' + timeAggregation + '-' + metricName + '-' + alertType;
        let alertName:string = util.create_resource_name("alert", tempName, true);                        
        alertName = alertName.substr(0, 128)    //Azure limits alert names to 128 characters
        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName), this._ctx.Environment.logLevel);
        logger.log(alertName);            
        params["alertName"] = { "value": alertName };

        if (params["actionGroups"])
        {
            if (params["actionGroups"].value) {
                params["actionGroups"].value.forEach(async  (element:any) => {
                    if (element.actionGroupShortName) 
                    {
                        let actionGroupShortName = element.actionGroupShortName;
                        
                        let subscriptionId = this._ctx.Environment.authentication.subscriptionId;
                        let actionResourceGroup = await util.resource_group("actiongroups",false,null,true); 
                        let actionGroup = util.create_resource_name("act", actionGroupShortName, false);

                        let actionGroupId = "/subscriptions/" + subscriptionId + "/resourceGroups/" + actionResourceGroup + "/providers/Microsoft.Insights/actionGroups/" + actionGroup                        

                        element.actionGroupId = actionGroupId; //Add the actionGroupId param
                        delete element.actionGroupShortName; //Remove the actionGroupShortName param
                    }
                });
            }
            else {
                delete params["actionGroups"]; //Remove the actionGroups section if there aren't any specified
            }
        }

        // Don't fail the Bake recipe if there are problems deploying an alert.  Instead, log as a warning and continue.
        try {
            await this.DeployTemplate(deploymentName, alertTemplate, params, resourceGroup);
        } catch (error) {
            logger.warn('Unable to deploy alert.  Continuing deployments.');
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

    public async ConfigureDiagnostics(armParameters: any): Promise<any> {

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        if (!armParameters["diagnosticsEnabled"])
        armParameters["diagnosticsEnabled"] = {"value": "yes"}

        if (armParameters["diagnosticsEnabled"].value == "yes") {
            const ehnUtils = IngredientManager.getIngredientFunction("eventhubnamespace", this._ctx)

            var diagnosticsEventHubNamespace = ehnUtils.get_resource_name("diagnostics");
            armParameters["diagnosticsEventHubNamespace"] = {"value": diagnosticsEventHubNamespace};
        
            var diagnosticsEventHubNamespaceResourceGroup: string

            diagnosticsEventHubNamespaceResourceGroup = await util.resource_group("diagnostics");

            armParameters["diagnosticsEventHubResourceGroup"] = {"value": diagnosticsEventHubNamespaceResourceGroup};                
        }        

        return armParameters;
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