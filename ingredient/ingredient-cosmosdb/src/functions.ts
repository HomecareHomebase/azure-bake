import {BaseUtility, IngredientManager} from '@azbake/core'

export class CosmosUtility extends BaseUtility {

 
    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("cosms", null, true);
        return name;
    }


}

