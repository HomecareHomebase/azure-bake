import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment, DeploymentProperties, ResourceGroup } from '@azure/arm-resources/esm/models';
import { BaseIngredient, IngredientManager } from "@azbake/core";
import { IIngredient,  DeploymentContext } from "@azbake/core";

import profile from './trf-mgr.json';
import endpoint from './endpoint.json';
import { TrafficUtils } from './functions';

export class TrafficManager extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }

    public async Execute(): Promise<void> {

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        try {
            // deploy the traffic manager profile to the primary region only
            if (util.current_region_primary()) {
                await this.DeployProfile();
            }

            await this.DeployEndpoint();

        } catch(error){
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }

    public async DeployProfile(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
    
            const region = this._ctx.Region.code;
            let trfutil = new TrafficUtils(this._ctx);
    
            this._logger.log('starting arm deployment for traffic manager');
    
            //build the properties as a standard object.
            let props : any = {};
            this._ingredient.properties.parameters.forEach( (v,n)=>
            {
                props[n] = {
                    "value": v.value(this._ctx)
                };
                let p = `${n}=${v.value(this._ctx)}`;
                this._logger.log(`param: ${p}`);
            });
    
            props["name"] = {"value": trfutil.get_profile() };
            
            let deployment = <Deployment>{
                properties : <DeploymentProperties>{
                    template: profile,
                    parameters: props,
                    mode: "Incremental"               
                }
            };
            
            let client = new ResourceManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);
    
            this._logger.log("validating deployment...");
            let validate = await client.deployments.validate(util.resource_group(), this._name, deployment);
            if (validate.error)
            {
                let errorMsg = `Validation failed (${(validate.error.code || "unknown")})`;
                if (validate.error.target){
                    errorMsg = `${errorMsg}\nTarget: ${validate.error.target}`;
                }
                if (validate.error.message) {
                    errorMsg = `${errorMsg}\nMessage: ${validate.error.message}`;
                }
                if (validate.error.details){
                    errorMsg = `${errorMsg}\nDetails:`;
                    validate.error.details.forEach(x=>{
                        errorMsg = `${errorMsg}\n${x.message}`;
                    });
                }
    
                this._ctx.Logger.error(errorMsg);
                throw new Error('validate failed');
            }
            
            this._logger.log("starting deployment...");
            let result = await client.deployments.createOrUpdate(util.resource_group(), this._name, deployment);
            if ( result._response.status >299){
                throw new Error(`ARM error ${result._response.bodyAsText}`);
            }
    
            this._logger.log('deployment finished');

        } catch(error){
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }

    public async DeployEndpoint(): Promise<void> {
        
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            const region = this._ctx.Region.code;
            let trfutil = new TrafficUtils(this._ctx);

            // deploy endpoints to the profile just deployed
            this._logger.log('starting arm deployment for traffic manager endpoint');

            let temp: any = {};
            this._ingredient.properties.parameters.forEach( (v,n)=>
            {
                temp[n] = {
                    "value": v.value(this._ctx)
                };
            });

            let props: any = {};

            const profileName = trfutil.get_profile();
            const epName = util.create_resource_name("ep", null, true);

            this._logger.log(`profile name: ${profileName}, endpoint name: ${epName}`);
            props["profile-name"] = { "value": profileName };
            props["ep-name"] = { "value": epName };

            const source = this._ctx.Ingredient.properties.source.value(this._ctx).split('/');
            const sourceType = temp["source-type"].value;
            this._logger.log(`resource type: ${sourceType}, resource rg: ${source[0]}, resource name: ${source[1]}`);
            props["source-rg"] = { "value": source[0] };
            props["source-name"] = { "value": source[1] };
            props["source-type"] = temp["source-type"];
            
            let deployment = <Deployment>{
                properties : <DeploymentProperties>{
                    template: endpoint,
                    parameters: props,
                    mode: "Incremental"               
                }
            };
            
            let client = new ResourceManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

            this._logger.log("validating deployment...");
            let validate = await client.deployments.validate(util.resource_group(), this._name, deployment);
            if (validate.error)
            {
                let errorMsg = `Validation failed (${(validate.error.code || "unknown")})`;
                if (validate.error.target){
                    errorMsg = `${errorMsg}\nTarget: ${validate.error.target}`;
                }
                if (validate.error.message) {
                    errorMsg = `${errorMsg}\nMessage: ${validate.error.message}`;
                }
                if (validate.error.details){
                    errorMsg = `${errorMsg}\nDetails:`;
                    validate.error.details.forEach(x=>{
                        errorMsg = `${errorMsg}\n${x.message}`;
                    });
                }

                this._ctx.Logger.error(errorMsg);
                throw new Error('validate failed');
            }
            
            this._logger.log("starting deployment...");
            let result = await client.deployments.createOrUpdate(util.resource_group(), this._name, deployment);
            if ( result._response.status >299){
                throw new Error(`ARM error ${result._response.bodyAsText}`);
            }

            this._logger.log('deployment finished');

        } catch(error){
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }

    }
}