import { BaseIngredient, IngredientManager } from "@azbake/core";
import { IIngredient,  DeploymentContext } from "@azbake/core";
import { ARMHelper } from "@azbake/arm-helper";

import hostarm from './host-arm.json';

export class HostNames extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }

    public async Execute(): Promise<void> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        try {
            const helper = new ARMHelper(this._ctx);

            //build the properties as a standard object.
            let props : any = {};
            const hostName = await this._ctx.Ingredient.properties.source.valueAsync(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters);
            

            const appName = util.create_resource_name("webapp", null, true);
            this._logger.log(`Deploying host name: ${hostName}, Web App: ${appName}`)
            props["webapp_name"] = { "value": appName };
            props["host_name"] = { "value": hostName };

            const certificate = util.parseResource(params["certificate"].value);
            this._logger.log(`Binding certificate: ${certificate.resource}, Resource Group: ${ certificate.resourceGroup }`);
            props["cert_rg"] = { "value": certificate.resourceGroup };
            props["cert_name"] = { "value": certificate.resource };

            props["location"] = { "value": util.current_region().name };

            await helper.DeployTemplate(this._name, hostarm, props, await util.resource_group());
        }
        catch (error) {
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }
}