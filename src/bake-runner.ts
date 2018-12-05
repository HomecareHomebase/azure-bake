import { BakePackage, IBakeRegion, IIngredient } from "./bake-loader";
import cli, { AzError } from 'azcli-npm'
import {BakeEval, BakeData} from './bake-library'
import {IngredientFactory} from './ingredients'
import {Logger} from './logger'
import {red, cyan} from 'colors'

export class BakeRunner {
    constructor(bPackage: BakePackage, azcli: cli, logger? : Logger){

        this._package = bPackage
        this._azcli = azcli
        this._logger = logger || new Logger()
    }

    _package: BakePackage
    _azcli: cli
    _logger: Logger

    private async _executeBakeLoop(ingredientNames: string[], finished: string[], region: IBakeRegion, logger: Logger) : Promise<boolean> {

        let recipe = this._package.Config.recipe
        let count = ingredientNames.length

        let executing: Array<Promise<string>> = []
        for(let i=0; i<count; ++i){

            let ingredientName: string = ingredientNames[i]
            let ingredient: IIngredient = recipe.get(ingredientName) || <IIngredient>{}

            //check if we've already run this
            let idx = finished.findIndex(x=>x==ingredientName)
            if (idx >=0) continue

            //check if igredient dependencies are all finished
            let depsDone = true
            ingredient.dependsOn.forEach(dep=>{
                let idx = finished.findIndex(x=>x==dep)
                if (idx == -1) {
                    depsDone = false
                }
            })

            if (depsDone){
                let exec = IngredientFactory.Build(ingredientName, ingredient, region, logger)
                if (exec) {
                    let promise = exec.Execute()
                    executing.push(promise)
                }    
            }
        }

        let results = await Promise.all(executing)
        results.forEach(r=>finished.push(r))

        return ingredientNames.length != finished.length
    }

    private async _bakeRegion(region: IBakeRegion): Promise<boolean> {

        let regionLogger = new Logger( this._logger.getPre().concat(region.name))
        let recipe = this._package.Config.recipe
        regionLogger.log('Baking recipe ' + cyan(this._package.Config.name))

        //we could build a DAG and execute that way, but we expect the number of recipes in a package to be small enough
        //that a simple unoptimized loop through will work here
        let ingredientNames: string[] = []
        recipe.forEach((igredient, name) => {
            ingredientNames.push(name)
        })

        let finished: string[] = []
        let loopHasRemaining = await this._executeBakeLoop(ingredientNames, finished, region, regionLogger)
        while(loopHasRemaining) {
            loopHasRemaining = await this._executeBakeLoop(ingredientNames, finished, region, regionLogger)
        }

        regionLogger.log('Finished baking')
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