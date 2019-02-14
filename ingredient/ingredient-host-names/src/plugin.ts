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

            const serverFarm = util.parseResource(this._ctx.Ingredient.properties.source.value(this._ctx));

            let params = helper.BakeParamsToARMParams(this._name, this._ingredient.properties.parameters);
            const keyVault = util.parseResource(params["keyvault"].value);
            const certName = params["certificate"].value;

            //todo fix how we get the webapp and hostname.
            const appName = util.create_resource_name("webapp", null, true);
            const hostName = params["hostname"].value;
            this._logger.log(`Deploying host name: ${hostName}, Web App: ${appName}`)

            props["webapp_name"] = { "value": appName };
            props["host_name"] = { "value": hostName };
            props["app_service_rg"] = { "value": serverFarm.resourceGroup };
            props["app_service_name"] = { "value": serverFarm.resource };
            props["keyvault_rg"] = { "value": keyVault.resourceGroup };
            props["keyvault_name"] = { "value": keyVault.resource };
            props["vault_secret_name"] = { "value": certName };
            props["cert_name"] = { "value": util.create_resource_name("cert", null, true) };
            props["location"] = { "value": util.current_region().name };

            await helper.DeployTemplate(this._name, hostarm, props, util.resource_group());
        }
        catch (error) {
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }
}