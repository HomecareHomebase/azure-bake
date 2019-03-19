import { DeploymentContext } from "./deployment-context";

export class TagGenerator {
    constructor(ctx: DeploymentContext) {
        this._ctx = ctx
    }
    _ctx : DeploymentContext

    public GenerateTags(extraTags: Map<string,string> | null = null) : any
    {
        let tags: any = {}
        if (extraTags){
            extraTags.forEach((v,n)=>{
                tags[n] = v
            })
        }

        tags.envcode = this._ctx.Environment.environmentCode
        tags.environment = this._ctx.Environment.environmentName
        tags.region = this._ctx.Region.name
        tags.recipe = this._ctx.Config.name
        tags.package_version = this._ctx.Config.version
        tags.bake_version = this._ctx.Environment.toolVersion

        //check against pluginVersion be seting, since Ingredient is always set as a default object
        if (this._ctx.Ingredient.pluginVersion){
            tags.ing_version = this._ctx.Ingredient.pluginVersion
            tags.ingredient = this._ctx.Ingredient.properties.type || ""    
        }

        tags.deployment_ts = new Date().toISOString()

        return tags
    }
}