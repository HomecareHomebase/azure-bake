import {BaseUtility, IngredientManager} from '@azbake/core'

export class AzureVmUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("vm", null, false);
        return name;
    }
}