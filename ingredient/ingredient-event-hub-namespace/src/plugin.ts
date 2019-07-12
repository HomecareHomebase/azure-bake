import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
import stockAlerts from "./stockAlerts.json"
import { EventHubNamespaceUtils } from "./functions.js";
import { stringify } from "querystring";

export class EventHubNamespacePlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Event Hub Namespace Plugin Logging: ')

            const helper = new ARMHelper(this._ctx);
                    
            //var stockAlertsMap = this.objToVariableMap(stockAlerts)
            var stockAlertsMap = this.objToVariableMap(stockAlerts.ServerErrors)
            //let mergedAlerts = new Map([...stockAlertsMap, ...this._ingredient.properties.alerts]);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            //let alertParams = await helper.BakeParamsToARMParamsAsync(this._name, mergedAlerts)
            let stockAlertParams = await helper.BakeParamsToARMParamsAsync(this._name, stockAlertsMap)
            //let overriddenAlertParams = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.alerts)

            //let mergedAlertParams = {...stockAlertParams, ...overriddenAlertParams};
            //let mergedAlertParams = {...overriddenAlertParams, ...stockAlertParams};
            //let mergedAlertParams = this.mergeDeep(stockAlertParams, overriddenAlertParams)

            if (!params["diagnosticsEnabled"])
                params["diagnosticsEnabled"] = {"value": "yes"}

            if (params["diagnosticsEnabled"].value == "yes") {
                const ehnUtils = new EventHubNamespaceUtils(this._ctx);

                var diagnosticsEventHubNamespace = ehnUtils.get_resource_name("diagnostics");
                params["diagnosticsEventHubNamespace"] = {"value": diagnosticsEventHubNamespace};
              
                var diagnosticsEventHubNamespaceResourceGroup: string

                diagnosticsEventHubNamespaceResourceGroup = await util.resource_group("diagnostics");

                params["diagnosticsEventHubNamespaceResourceGroup"] = {"value": diagnosticsEventHubNamespaceResourceGroup};                
            }

            //await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
            let metricTarget = params["eventHubNamespaceName"].value
            //await helper.DeployAlerts(this._name, alertParams, await util.resource_group(), metricTarget)
            await helper.DeployAlerts(this._name, stockAlertParams, await util.resource_group(), metricTarget)

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }

    private objToVariableMap(obj: any) {
        let strMap = new Map<string,BakeVariable>();

        //support variables being empty, or not defined in the YAML.
        if (obj == null || undefined)
        {
            return strMap
        }

        for (let k of Object.keys(obj)) {
            strMap.set(k, new BakeVariable(obj[k]));
        }
        return strMap;
    }


    /**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
private isObject(item:any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
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