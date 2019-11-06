import {BaseUtility, IngredientManager} from '@azbake/core';
import {KeyVaultManagementClient} from 'azure-arm-keyvault';

export class KeyVaultUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("keyvault", null, true);
        return name;
    }
    
}

