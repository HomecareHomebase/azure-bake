import { BaseIngredient, IngredientManager } from "@azbake/core";
import { IIngredient, DeploymentContext } from "@azbake/core";
import type { ARMHelper } from "@azbake/arm-helper";

import profile from './trf-mgr.json';
import endpoint from './endpoint.json';
import { TrafficUtils } from './functions';
import stockAlerts from "./stockAlerts.json"

export class TrafficManager extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }
    
    _helper?: ARMHelper;

    private getHelper(): ARMHelper {
        if (!this._helper) {
            const { ARMHelper } = require("@azbake/arm-helper");
            this._helper = new ARMHelper(this._ctx);
        }
        return this._helper!;
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
    
            const helper = this.getHelper();
            let props = await helper.BakeParamsToARMParamsAsync(this._name, this._ctx.Ingredient.properties.parameters);
            props["name"] = {"value": trfutil.get_profile() };

            props = await helper.ConfigureDiagnostics(props);

            await helper.DeployTemplate(`${this._name}-profile`, profile, props, await util.resource_group());

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

            // read parameters to get the source-type.
            let temp: any = {};
            for ( const[n,v] of this._ingredient.properties.parameters){
                temp[n] = {
                    "value": await v.valueAsync(this._ctx)
                };
            }

            let props: any = {};

            const profileName = trfutil.get_profile();
            const epName = util.create_resource_name("ep", null, true);

            this._logger.log(`profile name: ${profileName}, endpoint name: ${epName}`);
            props["profile-name"] = { "value": profileName };
            props["ep-name"] = { "value": epName };

            const resource = util.parseResource(await this._ctx.Ingredient.properties.source.valueAsync(this._ctx));
            const sourceType = temp["source-type"].value;
            this._logger.log(`resource type: ${sourceType}, resource rg: ${resource.resourceGroup}, resource name: ${resource.resource}`);
            props["source-rg"] = { "value": resource.resourceGroup };
            props["source-name"] = { "value": resource.resource };
            props["source-type"] = temp["source-type"];

            const primaryRG = await util.resource_group(null, true, util.primary_region());
        
            const helper = this.getHelper();
            await helper.DeployTemplate(`${this._name}-endpoint`, endpoint, props, primaryRG);

            let alertTarget = profileName
            let alertOverrides = this._ingredient.properties.alerts
            await helper.DeployAlerts(this._name, await primaryRG, alertTarget, stockAlerts, alertOverrides)
            
        } catch(error){
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }

    }
}
