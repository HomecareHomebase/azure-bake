import * as YAML from 'js-yaml'
import * as fs from 'fs'

export interface IBakeAuthentication {
    tenantId: string,
    serviceId: string,
    secretKey: string,
    certPath: string
}

export interface IBakeEnvironment {
    toolVersion: string,
    authentication: IBakeAuthentication
}

export interface IIngredient {
    type: string,
    template: string,
    parameters: Map<string,string>
}

export interface IRecipe {
    dependsOn: Array<string>
    ingredients: Map<string,IIngredient>
}

export interface IBakeConfig {
    name: string,
    shortName: string,
    version: string
    variables: Map<string,string>
    recipes: Map<string, IRecipe>
}

export class BakePackage {
    constructor(source: string) {

        this._env = <IBakeEnvironment>{}
        this._loadEnvironment()

        this._config = <IBakeConfig>{}
        this._loadPackage(source)
    }

    private _env: IBakeEnvironment
    public get  Environment():IBakeEnvironment {

        //strip auth from the public accessor

        //simple JSON wrap to clone config
        let env = JSON.parse(JSON.stringify(this._env))
        env.authentication = null
        return env
    }

    private _config: IBakeConfig
    public get Config(): IBakeConfig {

        return this._config;
    }

    private _loadEnvironment(): void {

        //load environment variables || defaults into an interface
        this._env.toolVersion = process.env.npm_package_version || "0.0.0"

        this._env.authentication = <IBakeAuthentication>{}
        this._env.authentication.tenantId = process.env.BAKE_AUTH_TENATE_ID || ""
        this._env.authentication.serviceId = process.env.BAKE_AUTH_SERVICE_ID || ""
        this._env.authentication.secretKey = process.env.BAKE_AUTH_SERVICE_KEY || ""
        this._env.authentication.certPath = process.env.BAKE_AUTH_SERVICE_CERT || ""

        //clear out the auth info
        process.env.BAKE_AUTH_SERVICE_ID = process.env.BAKE_AUTH_SERVICE_KEY = 
            process.env.BAKE_AUTH_SERVICE_CERT = process.env.BAKE_AUTH_TENATE_ID =""
    }

    private _validatePackage(config: IBakeConfig) {

        if (!config.name)
         throw new Error('config.name not defined')
         if (!config.shortName)
         throw new Error('config.shortName not defined')
         if (!config.version)
         throw new Error('config.version not defined')
    }

    private objToStrMap(obj: any) {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    }

    private _loadPackage(source: string){

        let file = fs.readFileSync(source, 'utf8')
        let config: IBakeConfig = YAML.load(file)

        //fix up json objects to act as hashmaps.
        config.variables = this.objToStrMap(config.variables)
        config.recipes = this.objToStrMap(config.recipes)
        config.recipes.forEach(recipe=>{
            recipe.dependsOn = recipe.dependsOn || []
            recipe.ingredients = this.objToStrMap(recipe.ingredients || {})
            recipe.ingredients.forEach(ingredient=> {
                ingredient.parameters = this.objToStrMap(ingredient.parameters || {})
            })
        })

        this._validatePackage(config)
        this._config = config
    }

    public Authenticate( callback: (auth:IBakeAuthentication)=>boolean ) : boolean {
        return callback(this._env.authentication)
    }

}