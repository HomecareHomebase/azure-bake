import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
	
export class ServiceBusQueuePlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
		try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('ServiceBusQueuePlugin - Logging: ' + this._ingredient.properties.source)
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            let resourceGroup = params["resourceGroup"].value || ( await util.resource_group() );
            delete params["resourceGroup"]

            if(!params["deadLetteringOnMessageExpiration"] || !params["deadLetteringOnMessageExpiration"].value)
                params["deadLetteringOnMessageExpiration"] = {value: false};

            if(!params["requiresDuplicateDetection"] || !params["requiresDuplicateDetection"].value)
                params["requiresDuplicateDetection"] =  {value: false};
            
            if(!params["requiresSession"] || !params["requiresSession"].value)
                params["requiresSession"] = {value: false};
            
            if(!params["enablePartitioning"] || !params["enablePartitioning"].value)
                params["enablePartitioning"] = {value: false};
            
            if(!params["enableExpress"] || !params["enableExpress"].value)
                params["enableExpress"] = {value: false};

            await helper.DeployTemplate(this._name, ARMTemplate, params, resourceGroup)
            
        } catch(error){
            this._logger.error('ServiceBusQueuePlugin - Logging: deployment failed: ' + error)
            throw error
        }
    }
}