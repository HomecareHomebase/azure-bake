import { IBakePackage, IBakeRegion, IIngredient, IBakeAuthentication, BakeEval, IBakeConfig, IngredientManager, TagGenerator} from "@azbake/core";
import {IngredientFactory} from './ingredients'
import {red, cyan} from 'colors'
import { DeploymentContext, Logger } from "@azbake/core"
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth"
import {ResourceManagementClient} from "@azure/arm-resources"
import { ResourceGroup } from "@azure/arm-resources/esm/models";

export class BakeRunner {
    constructor(bPackage: IBakePackage, logger? : Logger){

        this._package = bPackage
        this._logger = logger || new Logger([], bPackage.Environment.logLevel)
        this._AuthCreds = <msRestNodeAuth.ApplicationTokenCredentials>{}
    }

    _package: IBakePackage
    _logger: Logger
    _AuthCreds: msRestNodeAuth.ApplicationTokenCredentials

    private _loadBuiltIns(){

        //register required ingredients
        IngredientManager.Register('@azbake/ingredient-utils')
    }

    private async _executeBakeLoop(ingredientNames: string[], finished: string[], ctx: DeploymentContext) : Promise<boolean> {

        let recipe = ctx.Config.recipe
        let count = ingredientNames.length

        let foundErrors = false
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

                //check if ingredient has a condition
                if (ingredient.properties.condition) {
                    try {
                        let result = await ingredient.properties.condition.valueAsync(ctx)
                        if (!result) {
                            let tmpLogger = new Logger(ctx.Logger.getPre().concat(ingredientName), ctx.Environment.logLevel)
                            tmpLogger.log("Condition check failed...skipping")
                            finished.push(ingredientName)
                            continue
                        }    
                    }
                    catch(e)
                    {
                        this._logger.error("Error running condition check for " + ingredientName + " => " + e);
                        foundErrors = true;
                        finished.push(ingredientName)
                        continue
                    }
                }

                let exec = IngredientFactory.Build(ingredientName, ingredient, ctx)
                if (exec) {

                    let promise = exec.Execute().then(()=>{return ingredientName}).catch((err)=>{
                        this._logger.error(err)
                        foundErrors = true
                        return ingredientName
                    })

                    executing.push(promise)
                } else {
                    this._logger.error("Could not find ingredient type " + ingredient.properties.type + " for " + ingredientName)
                    foundErrors = true
                    finished.push(ingredientName)
                }
            }
        }

        let results = await Promise.all(executing)
        results.forEach(r=>finished.push(r))

        if (foundErrors) {
            throw new Error()
        }

        return ingredientNames.length != finished.length
    }

    private async _bakeRegion(ctx: DeploymentContext): Promise<boolean> {

        try {
            var util = IngredientManager.getIngredientFunction("coreutils", ctx)

            let rg_name = await util.resource_group()
            let region_name = ctx.Region.shortName


            if (ctx.Config.resourceGroup) {
                let client = new ResourceManagementClient(ctx.AuthToken, ctx.Environment.authentication.subscriptionId)
                
                let rgExists = false
                try {
                    let chkResult = await client.resourceGroups.checkExistence(rg_name)
                    rgExists = chkResult.body                
                }
                catch{}
    
                let tagGenerator = new TagGenerator(ctx)
                if (!rgExists){

                    ctx.Logger.log('Setting up resource group ' + cyan(rg_name))

                    await client.resourceGroups.createOrUpdate(rg_name, <ResourceGroup>{
                        tags: tagGenerator.GenerateTags(),
                        location: region_name
                    })
                }
                else {

                    ctx.Logger.log('Updating resource group ' + cyan(rg_name))

                    //for updates we still want to createOrUpdate so that tags can sync
                    //but we need to use the RG location in case it's different in later runs.
                    const rg = await client.resourceGroups.get(rg_name);
                    await client.resourceGroups.createOrUpdate(rg_name, <ResourceGroup>{
                        tags: tagGenerator.GenerateTags(),
                        location: rg.location
                    });
                }


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
            let loopHasRemaining: boolean = true
            while(loopHasRemaining) {
                try{
                    loopHasRemaining = await this._executeBakeLoop(ingredientNames, finished, ctx)
                }
                catch{
                    throw new Error()
                }
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

            if (auth.skipAuth) {
                this._logger.log("Skipping Azure login")
                return true
            }

            //TODO, new login does not support certificate SP login.
            try {
                this._AuthCreds =  await msRestNodeAuth
                .loginWithServicePrincipalSecret(auth.serviceId, auth.secretKey, auth.tenantId)
            }
            catch(err){
                this._logger.error(red("login failed: " + err.message))
                return false
            }

            //check if any ingredients need access to the service principal credientals for custom auth
            let recipe = this._package.Config.recipe

            let ctx = new DeploymentContext(this._AuthCreds, this._package, <IBakeRegion>{},this._logger);

            for (const iterator of recipe) {
                let name = iterator[0];
                let ingredient = iterator[1];

                let exec = IngredientFactory.Build(name, ingredient, ctx)
                ingredient.customAuthToken = exec ? (await exec.Auth(auth)) : null
        }   
            
            return true;
        });

        return result
    }

    public async bake(regions: Array<IBakeRegion>): Promise<void> {

        this._loadBuiltIns()

        if (this._package.Config.parallelRegions) {
            let tasks: Array<Promise<boolean>> = []

            regions.forEach(region=>{
                let ctx = new DeploymentContext(this._AuthCreds, this._package, region,
                    new Logger(this._logger.getPre().concat(region.name), this._package.Environment.logLevel))
                let task = this._bakeRegion(ctx)
                tasks.push(task)    
            })

            try {
                let results = await Promise.all(tasks)    
                let allResultsGood : boolean = true
                results.forEach(result=>{if (!result)allResultsGood = false})
                if (!allResultsGood) {
                    throw new Error('Not all regions deployed successfully')
                }    
            }
            catch{
                throw new Error('Not all regions deployed successfully')
            }

        } else {
            let count = regions.length
            for(let i=0; i < count;++i){
                let region = regions[i]
                let ctx = new DeploymentContext(this._AuthCreds, this._package, region, 
                    new Logger(this._logger.getPre().concat(region.name), this._package.Environment.logLevel))

                try{
                    let r = await this._bakeRegion(ctx)
                    if (!r) {
                        throw new Error('Not all regions deployed successfully') //force failed result code
                    }                  
                }
                catch(err){
                    throw err
                }
            } 
        }
    }
}