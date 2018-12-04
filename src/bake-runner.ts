import { BakePackage, IRecipe, IBakeRegion, IIngredient } from "./bake-loader";
import cli, { AzError } from 'azcli-npm'
import {BakeEval, BakeData} from './bake-library'
import {IngredientFactory} from './ingredients'
import {Logger} from './logger'
import {red} from 'colors'

export class BakeRunner {
    constructor(bPackage: BakePackage, azcli: cli, logger? : Logger){

        this._package = bPackage
        this._azcli = azcli
        this._logger = logger || new Logger()
    }

    _package: BakePackage
    _azcli: cli
    _logger: Logger

    private async asyncForEach<T>(map: Map<string,T>, callback: (ingredient: T, name: string)=>Promise<void>) {

        let keys = map.keys()
        for(let key of keys){
            let ingredient = map.get(key) || <T>{}
            await callback(ingredient, key)
        }
      }

    private async _executeRecipe(name: string, recipe: IRecipe, region: IBakeRegion, logger: Logger): Promise<string> {

        logger.log('Mixing recipe')
        await this.asyncForEach<IIngredient>(recipe.ingredients, async (ingredient, ingName)=>{

            let exec = IngredientFactory.Build(ingName, ingredient, region, logger)
            if (exec) {
                await exec.Execute()
            }
        })
        logger.log('Finished mixing')
        return name
    }

    private async _executeBakeLoop(recipeNames: string[], finished: string[], region: IBakeRegion, logger: Logger) : Promise<boolean> {

        let recipes = this._package.Config.recipes
        let count = recipeNames.length

        let executing: Array<Promise<string>> = []
        for(let i=0; i<count; ++i){

            let recipeName: string = recipeNames[i]
            let recipe: IRecipe = recipes.get(recipeName) || <IRecipe>{}

            //check if we've already run this
            let idx = finished.findIndex(x=>x==recipeName)
            if (idx >=0) continue

            //check if recipe dependencies are all finished
            let depsDone = true
            recipe.dependsOn.forEach(dep=>{
                let idx = finished.findIndex(x=>x==dep)
                if (idx == -1) {
                    depsDone = false
                }
            })

            if (depsDone){
                let recipeLogger = new Logger(logger.getPre().concat(recipeName))
                let promise = this._executeRecipe(recipeName, recipe, region, recipeLogger)
                executing.push(promise)
            }
        }

        let results = await Promise.all(executing)
        results.forEach(r=>finished.push(r))

        return recipeNames.length != finished.length
    }

    private async _bakeRegion(region: IBakeRegion): Promise<boolean> {

        let regionLogger = new Logger( this._logger.getPre().concat(region.name))
        regionLogger.log('Starting deployment')
        let recipes = this._package.Config.recipes

        //we could build a DAG and execute that way, but we expect the number of recipes in a package to be small enough
        //that a simple unoptimized loop through will work here
        let recipeNames: string[] = []
        recipes.forEach((recipe, name) => {
            recipeNames.push(name)
        })

        let finished: string[] = []
        let loopHasRemaining = await this._executeBakeLoop(recipeNames, finished, region, regionLogger)
        while(loopHasRemaining) {
            loopHasRemaining = await this._executeBakeLoop(recipeNames, finished, region, regionLogger)
        }

        return true
    }

    public login(): boolean {

        this._logger.log("logging into azure...")
        var result = this._package.Authenticate( (auth) =>{
            try {
                if (auth.certPath)
                    this._azcli.loginWithCert(auth.tenantId, auth.serviceId, auth.certPath)
                else
                    this._azcli.login(auth.tenantId, auth.serviceId, auth.secretKey)

                //set the correct subscription

                this._logger.log('Setting subscription Id ' + auth.subscriptionId)
                this._azcli.setSubscription(auth.subscriptionId)

                return true
            } catch(e) {
                var error = <AzError>e
                this._logger.error(red("login failed: " + error.message))
                return false
            }            
        })
        return result
    }

    public async bake(): Promise<void> {

        BakeData.setPackage(this._package, this._azcli)
        
        let region = <IBakeRegion>{
            name: "EastUS",
            shortName: "eus"
        }

        await this._bakeRegion(region)
    }
}