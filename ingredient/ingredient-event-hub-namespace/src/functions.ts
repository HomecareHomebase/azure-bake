import {BaseUtility, IngredientManager} from '@azbake/core'

export class EventHubNamespaceUtils extends BaseUtility {

    public create_resource_name(shortName: string | null = null): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        const fullName = util.create_resource_name("ehn", shortName, true);
        return fullName;
    } 

    public async get_resource_profile(shortName: string | null = null, rgName: string | null = null): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = this.create_resource_name(shortName);
        const rg = await util.resource_group();
        return `${rg}/${name}`;
    }
}

