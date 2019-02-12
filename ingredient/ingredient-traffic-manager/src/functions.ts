import {BaseUtility, IngredientManager} from '@azbake/core'

export class TrafficUtils extends BaseUtility {

    public get_profile(): string {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const profile = util.create_resource_name("trfmgr", null, false);
        return profile;
    }   
}

