import {BaseUtility, IngredientManager} from '@azbake/core'

export class StorageUtils extends BaseUtility {

    public get_profile(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }
    
    public get_region(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_region = util.current_region()
        return st_region
    }

    public get_primary_region(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_primary_region = util.current_region_primary()
        return st_primary_region
    }
}

    
}