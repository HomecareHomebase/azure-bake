import {BaseUtility, IngredientManager} from '@azbake/core'

export class EventHubNamespaceUtils extends BaseUtility {

    public get_resource_name(name:string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        //resource type, name, region enabled
        const fullName = util.create_resource_name("ehn", name, true);
        return fullName;
    } 

    public async get_resource_group(): Promise<string> {        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        let override = this.context.Config.rgOverride
        if (override)
            return await override.valueAsync(this.context);
        //resource type, name, region enabled
        else return util.create_resource_name("ehn", "", true);
    }
}

