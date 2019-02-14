import { DeploymentContext } from "./deployment-context";
import { IBakeResource } from "./bake-interfaces"

export class BaseUtility {
    constructor(ctx: DeploymentContext) {
        this.context = ctx
    }
    context : DeploymentContext
    
    // Function for splitting resource strings formatted as "<resourceGroup>/<resourceName>"
    public parseResource(azureResource: string): IBakeResource {
        const value = azureResource.split('/');

        let returnValue: IBakeResource = { 
            resourceGroup: value.length > 1? value[0] : '',
             resource: value.length > 1? value[1] : value[0]
            };
            
        return returnValue;
    }
}