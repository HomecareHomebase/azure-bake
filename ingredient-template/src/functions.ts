import {BaseUtility, IngredientManager} from '@azbake/core'

export class MyUtils extends BaseUtility {

    public my_function() {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let region = util.current_region()
        this.context.Logger.log("Executing my_function for " + region)
    }   
}

