import {BaseUtility, IngredientManager} from '@azbake/core'

export class PostgreSQLDBUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("postgresqldb", null, true);
        return name;
    }
}

