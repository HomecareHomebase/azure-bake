import { BakePackage, IBakeRegion, IIngredient, IBakeAuthentication } from "./bake-loader";
import {BakeEval} from './bake-library'
import {IngredientFactory} from './ingredients'
import {Logger} from './logger'
import {red, cyan} from 'colors'
import { DeploymentContext } from "./deployment-context"
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth"
import {ResourceManagementClient, ResourceManagementModels, ResourceManagementMappers} from "@azure/arm-resources"
import { ResourceGroup } from "@azure/arm-resources/esm/models";

export class BakeRunner {
    constructor(bPackage: BakePackage, logger? : Logger){

        this._package = bPackage
        this._logger = logger || new Logger()
        this._AuthCreds = <msRestNodeAuth.TokenCredentialsBase>{}
    }

    _package: BakePackage
    _logger: Logger
    _AuthCreds: msRestNodeAuth.TokenCredentialsBase

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

            let client = new ResourceManagementClient(ctx.AuthToken, ctx.Environment.authentication.subscriptionId)

            let rgExists = false
            try {
                let chkResult = await client.resourceGroups.checkExistence(rg_name)
                rgExists = chkResult.body                
            }
            catch{}

            if (!rgExists){

                ctx.Logger.log('Setting up resource group ' + cyan(rg_name))
                await client.resourceGroups.createOrUpdate(rg_name, <ResourceGroup>{
                    location: region_name
                })
            }

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

    public async login(): Promise<boolean> {

        this._logger.log("logging into azure...")
        var result = await this._package.Authenticate( async (auth) =>{

            //TODO, new login does not support certificate SP login.
            try {
                this._AuthCreds =  await msRestNodeAuth
                .loginWithServicePrincipalSecret(auth.serviceId, auth.secretKey, auth.tenantId)
                return true;
            }
            catch(err){
                this._logger.error(red("login failed: " + err.message))
                return false
            }
        })

        return result
    }

    public async bake(regions: Array<IBakeRegion>): Promise<void> {

        if (this._package.Config.parallelRegions) {
            let tasks: Array<Promise<boolean>> = []

            regions.forEach(region=>{
                let ctx = new DeploymentContext(this._AuthCreds, this._package, region,
                    new Logger(this._logger.getPre().concat(region.name)))
                let task = this._bakeRegion(ctx)
                tasks.push(task)    
            })
            let results = await Promise.all(tasks)    
            let allResultsGood : boolean = true
            results.forEach(result=>{if (!result)allResultsGood = false})
            if (!allResultsGood) {
                throw new Error('Not all regions deployed successfully')
            }

        } else {
            let count = regions.length
            for(let i=0; i < count;++i){
                let region = regions[i]
                let ctx = new DeploymentContext(this._AuthCreds, this._package, region, 
                    new Logger(this._logger.getPre().concat(region.name)))
                await this._bakeRegion(ctx)
            } 
        }
    }
}