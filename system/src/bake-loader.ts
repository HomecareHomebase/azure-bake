import * as YAML from 'js-yaml'
import * as fs from 'fs'
import {BakeVariable, IBakeEnvironment, IBakeConfig, IBakeAuthentication,
    IIngredientProperties, IIngredient, Logger, IngredientManager} from '@azbake/core'
import { ShellRunner } from 'azcli-npm';

export class BakePackage {
    constructor(source: string) {

        this._env = <IBakeEnvironment>{}
        this._loadEnvironment()

        this._config = <IBakeConfig>{}
        this._loadPackage(source)
    }

    private _env: IBakeEnvironment
    public get  Environment():IBakeEnvironment {
        return this._env
    }

    private _config: IBakeConfig
    public get Config(): IBakeConfig {

        return this._config;
    }

    private _loadEnvironment(): void {

        //load environment variables || defaults into an interface
        this._env.toolVersion = process.env.npm_package_version || "0.0.0"

        this._env.environmentName = process.env.BAKE_ENV_NAME || ""
        this._env.environmentCode = process.env.BAKE_ENV_CODE || ""

        this._env.regions = JSON.parse(process.env.BAKE_ENV_REGIONS || "");
        
        this._env.authentication = <IBakeAuthentication>{}
        this._env.authentication.subscriptionId = process.env.BAKE_AUTH_SUBSCRIPTION_ID || ""
        this._env.authentication.tenantId = process.env.BAKE_AUTH_TENANT_ID || ""
        this._env.authentication.serviceId = process.env.BAKE_AUTH_SERVICE_ID || ""
        this._env.authentication.secretKey = process.env.BAKE_AUTH_SERVICE_KEY || ""
        this._env.authentication.certPath = process.env.BAKE_AUTH_SERVICE_CERT || ""

        //clear out the auth info
        process.env.BAKE_AUTH_SUBSCRIPTION_ID = process.env.BAKE_AUTH_SERVICE_ID = 
            process.env.BAKE_AUTH_SERVICE_KEY = process.env.BAKE_AUTH_SERVICE_CERT = 
            process.env.BAKE_AUTH_TENANT_ID =""

        //yaml parse out the global variables.
        try {
            let vars : string = process.env.BAKE_VARIABLES || ""
            let obj  =YAML.safeLoad(vars)
            this._env.variabes = this.objToVariableMap( obj || [] )
        } catch (e) {
            let logger = new Logger()
            logger.error("Failed to load global environment variables")
            logger.error(e)
        }
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

    private objToVariableMap(obj: any) {
        let strMap = new Map<string,BakeVariable>();

        //support variables being empty, or not defined in the YAML.
        if (obj == null || undefined)
        {
            return strMap
        }

        for (let k of Object.keys(obj)) {
            strMap.set(k, new BakeVariable(obj[k]));
        }
        return strMap;
    }

    private _loadPackage(source: string){

        let file = fs.readFileSync(source, 'utf8')
        let config: IBakeConfig = <IBakeConfig>{}

        try{
            config = YAML.load(file)
        } catch(e) {
            let logger = new Logger()
            logger.error("Failed to load bake file: " + source)
            logger.error(e)
            throw e
        }

        //bind all ingredients
        let logger = new Logger()
        logger.log('Downloading ingredients...')
        let ingredients = config.ingredients || new Array<string>()
        ingredients.forEach(ingredientsType=>{

            let cmd = "npm"
            if (process.platform === "win32")
                cmd = "npm.cmd"

            logger.log('- ' + ingredientsType)
            var npm = new ShellRunner(cmd).start()
            npm.arg("install").arg(ingredientsType)
            let er = npm.exec()
            if (er.code != 0){
                console.log(er)
                logger.error("failed to download ingredient: " + ingredientsType)
                throw new Error()
            }
        })

        ingredients.forEach(ingredientType=> {
            let firstIdx = ingredientType.indexOf("@")
            let lastIdx = ingredientType.lastIndexOf("@")
            if (lastIdx != firstIdx) {
                //strip off @<ver> 
                ingredientType = ingredientType.substr(0, lastIdx)
            }
            IngredientManager.Register(ingredientType)
        })
        logger.log('Ingredients loaded')
        
        //start with config vars based on env based vars
        let vars = this.objToVariableMap(config.variables)

        //merge config vars into the env vars (overwriting as needed)
        config.variables = this._env.variabes || new Map<string,BakeVariable>()
        vars.forEach((v,n)=> {
            if (config.variables)
                config.variables.set(n, v)
        })

        //fix up json objects to act as hashmaps.
        config.parallelRegions = config.parallelRegions==undefined? true : config.parallelRegions
        config.rgOverride = new BakeVariable(<any>config.rgOverride);
        config.recipe = this.objToStrMap(config.recipe)
        config.recipe.forEach(ingredient=>{
            let source: any = ingredient.properties.source
            ingredient.properties.source = new BakeVariable( source || "" )
            ingredient.dependsOn = ingredient.dependsOn || []
            ingredient.properties = ingredient.properties || <IIngredientProperties>{}
            ingredient.properties.parameters = this.objToVariableMap(ingredient.properties.parameters || {})
        })

        this._validatePackage(config)
        this._config = config
    }

    public async Authenticate( callback: (auth:IBakeAuthentication)=>Promise<boolean> ) : Promise<boolean> {
        
        try{
            return await callback(this._env.authentication)
        }
        finally{
            //strip auth from the public accessor, except for sub id.

            //simple JSON wrap to clone config
            let env = JSON.parse(JSON.stringify(this._env))
            env.authentication = null
            env.authentication = <IBakeAuthentication>{
                subscriptionId : this._env.authentication.subscriptionId
            }
            this._env = env
        }
    }

}