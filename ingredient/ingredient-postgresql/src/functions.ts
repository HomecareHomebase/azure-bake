import {BaseUtility, IngredientManager} from '@azbake/core'

export class PostgreSQLDBUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        const name = util.create_resource_name("pgsql", null, true);
        return name;
    }

    public create_resource_uri(): string {
        return this.create_resource_name() + ".postgres.database.azure.com"; 
    }
}

