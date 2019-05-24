import {BaseUtility, IngredientManager} from '@azbake/core'

export class EventHubNamespaceUtils extends BaseUtility {

    public get_resource_name(shortName: string | null = null): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        //resource type, name, region enabled
        const fullName = util.create_resource_name("ehn", shortName, true);
        return fullName;
    } 

    public async get_resource_group(rgShortName: string | null = null): Promise<string> {        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        let override = this.context.Config.rgOverride
        if (override)
            return await override.valueAsync(this.context);
        //resource type, name, region enabled
        else return util.create_resource_name("", rgShortName, true);
    }
    
    public async get_resource_profile(shortName: string | null = null, rgShortName: string | null = null): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = this.get_resource_name(shortName);
        const rg = await this.get_resource_group(rgShortName);
        return `${rg}/${name}`;
    }

}

