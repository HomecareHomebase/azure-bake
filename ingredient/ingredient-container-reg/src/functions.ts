import {BaseUtility, IngredientManager} from '@azbake/core'

export class ContainerRegUtils extends BaseUtility {

    public get_profile(): string {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const acr_profile = util.create_resource_name("acr", null, false);
        return acr_profile;
    }
    
    public get_region(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const acr_region = util.current_region()
        return acr_region
    }

    public get_primary_region(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const acr_primary_region = util.current_region_primary()
        return acr_primary_region
    }
}
