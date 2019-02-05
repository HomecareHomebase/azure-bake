import { ResourceManagementClient } from "@azure/arm-resources";
import { Deployment, DeploymentProperties } from "@azure/arm-resources/esm/models";
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core";

import hostarm from './host-arm.json';

export class HostNames extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }

    public async Execute(): Promise<void> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        try {

            //build the properties as a standard object.
            let props : any = {};

            const serverFarm = util.parseResource(this._ctx.Ingredient.properties.source.value(this._ctx));

            let params: any = {};
            this._ingredient.properties.parameters.forEach( (v,n)=>
            {
                params[n] = {
                    "value": v.value(this._ctx)
                };
            });

            const keyVault = util.parseResource(params["keyvault"].value);
            const certName = params["certificate"].value;

            this._logger.log(`Keyvault resource group: ${keyVault.resourceGroup}, name: ${keyVault.resource}`);
            this._logger.log(`Certifacte name: ${certName}`)

            //todo fix how we get the webapp.
            const appName = util.create_resource_name("webapp", null, true);
            const hostName = `${ util.create_resource_name("trfmgr", null, false)}.trafficmanager.net`; // util.create_resource_name("hostname", null, true);
            this._logger.log(`Deploying host name: ${hostName}, Web App: ${appName}`)

            props["webapp_name"] = { "value": appName };
            props["host_name"] = { "value": hostName };
            props["app_service_rg"] = { "value": serverFarm.resourceGroup };
            props["app_service_name"] = { "value": serverFarm.resource };
            props["keyvault_rg"] = { "value": keyVault.resourceGroup };
            props["keyvault_name"] = { "value": keyVault.resource };
            props["cert_name"] = { "value": certName };

            let deployment = <Deployment>{
                properties : <DeploymentProperties>{
                    template: hostarm,
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

            this._logger.log('Finished deploying custom host names');
        }
        catch (error) {
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }
}