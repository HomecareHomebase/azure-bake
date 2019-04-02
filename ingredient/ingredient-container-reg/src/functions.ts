import {BaseUtility, IngredientManager} from '@azbake/core'

export class ContainerRegUtils extends BaseUtility {

    public create_resource_name(): string {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const acr_profile = util.create_resource_name("acr", null, false);
        return acr_profile;
    }    
}
