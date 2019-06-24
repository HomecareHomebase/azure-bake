import { IIngredient, Logger, DeploymentContext, BakeVariable, TagGenerator } from '@azbake/core';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Deployment, DeploymentProperties } from '@azure/arm-resources/esm/models';
import { stringify } from 'querystring';
import { AnyCnameRecord } from 'dns';

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
}