import {BaseUtility, IngredientManager} from '@azbake/core'

export class FunctionsUtils extends BaseUtility {

    public create_resource_name(shortName: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("fa", shortName, false);
        return st_profile;
    }
}