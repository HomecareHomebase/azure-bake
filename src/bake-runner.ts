import { BakePackage, IBakeRegion, IIngredient } from "./bake-loader";
import cli, { AzError } from 'azcli-npm'
import {BakeEval} from './bake-library'
import {IngredientFactory} from './ingredients'
import {Logger} from './logger'
import {red, cyan} from 'colors'
import { DeploymentContext } from "./deployment-context";

export class BakeRunner {
    constructor(bPackage: BakePackage, azcli: cli, logger? : Logger){

        this._package = bPackage
        this._azcli = azcli
        this._logger = logger || new Logger()
    }

    _package: BakePackage
    _azcli: cli
    _logger: Logger

    private async _executeBakeLoop(ingredientNames: string[], finished: string[], ctx: DeploymentContext) : Promise<boolean> {

        let recipe = ctx.Config.recipe
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
                let exec = IngredientFactory.Build(ingredientName, ingredient, ctx)
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

    private async _bakeRegion(ctx: DeploymentContext): Promise<boolean> {

        try {
            let util = require('./bake-library/functions')
            util.setContext(ctx)
            
            let rg_name = util.resource_group()
            let region_name = ctx.Region.shortName
            ctx.Logger.log('Setting up resource group ' + cyan(rg_name))
            await ctx.CLI.start().arg('group').arg('create').arg('--location='+region_name).arg('--name='+rg_name).execAsync()

            let recipe = ctx.Config.recipe
            ctx.Logger.log('Baking recipe ' + cyan(ctx.Config.name))

            //we could build a DAG and execute that way, but we expect the number of recipes in a package to be small enough
            //that a simple unoptimized loop through will work here
            let ingredientNames: string[] = []
            recipe.forEach((igredient, name) => {
                ingredientNames.push(name)
            })

            let finished: string[] = []
            let loopHasRemaining = await this._executeBakeLoop(ingredientNames, finished, ctx)
            while(loopHasRemaining) {
                loopHasRemaining = await this._executeBakeLoop(ingredientNames, finished, ctx)
            }

            ctx.Logger.log('Finished baking')
            return true
        } catch(e) {
            ctx.Logger.error(e)
            return false
        }
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

    public async bake(regions: Array<IBakeRegion>): Promise<void> {

        if (this._package.Config.parallelRegions) {
            let tasks: Array<Promise<boolean>> = []

            regions.forEach(region=>{
                let ctx = new DeploymentContext(this._package, region, this._azcli, 
                    new Logger(this._logger.getPre().concat(region.name)))
                let task = this._bakeRegion(ctx)
                tasks.push(task)    
            })
            await Promise.all(tasks)    
        } else {
            let count = regions.length
            for(let i=0; i < count;++i){
                let region = regions[i]
                let ctx = new DeploymentContext(this._package, region, this._azcli, 
                    new Logger(this._logger.getPre().concat(region.name)))
                await this._bakeRegion(ctx)
            } 
        }
    }
}