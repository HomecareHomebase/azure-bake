import {BaseUtility, IngredientManager} from '@azbake/core'

export class AzureVmUtils extends BaseUtility {

    public create_resource_name(shortName?: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("vm", (shortName != undefined) ? shortName : null, false);
        return name;
    }
   
}