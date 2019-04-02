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
        
        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName));

        try {
            //now iterate through all resources in the template and append our standard tags to any existing tags in the ARM template.
            logger.log('appending standard tags');
            let resources: any[] = template.resources;
            resources.forEach( resource => {
                let localTags = new Map<string,string>();
                if (resource.tags)
                {
                    
                    let map = Object.keys(resource.tags).forEach(k=>{
                        localTags.set(k,resource.tags[k])
                    })
                }
                resource.tags = this.GenerateTags(localTags)
            })
            template.resources = resources

            logger.log('starting arm deployment for template');

            let deployment = <Deployment>{
                properties: <DeploymentProperties>{
                    template: template,
                    parameters: params,
                    mode: "Incremental"
                }
            }

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

    public BakeParamsToARMParams(deploymentName: string, params: Map<string, BakeVariable>): any {

        const logger = new Logger(this._ctx.Logger.getPre().concat(deploymentName));

        let props: any = {};
        params.forEach((v,n) => {
            props[n] = {
                "value": v.value(this._ctx)
            };
            let log = `${n}=${v.value(this._ctx)}`;
            logger.log(`param: ${log}`);
        });

        return props;
    }

    public GenerateTags(extraTags: Map<string,string> | null = null) : any
    {
       var tagGen = new TagGenerator(this._ctx)
       return tagGen.GenerateTags(extraTags)
    }
}