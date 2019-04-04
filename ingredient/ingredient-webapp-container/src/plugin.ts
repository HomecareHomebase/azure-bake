import { BaseIngredient, IngredientManager, BakeVariable, Logger } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core";
import { ARMHelper } from "@azbake/arm-helper";

import arm from './arm.json';
import { WebAppUtils } from './functions';

export class WebAppContainer extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }

    public async Execute(): Promise<void> {

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
        let webapp = new WebAppUtils(this._ctx);

        try {

            var helper = new ARMHelper(this._ctx);

            //build the properties as a standard object.
            let props = helper.BakeParamsToARMParams(this._name, this._ingredient.properties.parameters);

            //get the app service to be used for this web app.
            const resource = util.parseResource(this._ctx.Ingredient.properties.source.value(this._ctx));
            
            this._logger.log(`App service resourceGroup: ${resource.resourceGroup}`);
            this._logger.log(`App service name: ${resource.resource}`);
            props["app_service_rg"] = {"value": resource.resourceGroup};
            props["app_service_name"] = {"value": resource.resource};
            
            const webAppName = webapp.create_profile();
            this._logger.log(`Web application name: ${webAppName}`);
            props["webapp_name"] = { "value": webAppName };

            const webAppRegion = this._ctx.Region.name;
            this._logger.log(`Region for web app: ${webAppRegion}`);
            props["location"] = {"value": webAppRegion};

            var armTemplate = this.setConfigurationTokens(arm);

            await helper.DeployTemplate(this._name, armTemplate, props, util.resource_group());
        } catch(error){
            this._logger.error(`deployment failed: ${error}`);
            throw error;
        }
    }

    private setConfigurationTokens(template: any): any {
        if (this._ingredient.properties.tokens) {
            let tokens: Map<string, BakeVariable> = this._ingredient.properties.tokens;
            tokens.forEach( (v,k) => {
                let value = v.value(this._ctx);
                let log = `${k}=${value}`;
                this._logger.log(`token: ${log}`);

                this.addTokenToTemplate(template, k, value);
            });
        }   
        
        return template;
    }
    private addTokenToTemplate(template: any, tokenName: string, tokenValue: string): void
    {
        let resources: any[] = template.resources;
        resources.forEach( resource => {
            if (resource.type == 'Microsoft.Web/sites') {
                let settings: any[] = resource.properties.siteConfig.appSettings || [];
                let newSettings: any[] = [];
                let alreadyExisting = false;
                settings.forEach(setting => {
                    if (setting.name == tokenName) {
                        setting.value = tokenValue;
                        alreadyExisting = true;
                    }
                    newSettings.push(setting);
                });
                if (!alreadyExisting) {
                    newSettings.push({ name: tokenName, value: tokenValue });
                }
                resource.properties.siteConfig.appSettings = newSettings;
            }
        });
    }
}