import {BaseUtility, IngredientManager} from '@azbake/core'
import { ResourceManagementClient } from '@azure/arm-resources';

export class AvailabilitySetUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("avail", null, true);
        return name;
    }
}

