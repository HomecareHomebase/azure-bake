import {BaseUtility, IngredientManager} from '@azbake/core'
import { SqlManagementClient, SqlManagementModels, SqlManagementMappers } from "@azure/arm-sql";
import ARMTemplate from "./arm.json"

export class SqlServerLogicalUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        
        const name = util.create_resource_name("sqlserver", null, false);

        return name
    }

}