import { BakePackage, IRecipe } from "./bake-loader";
import cli from 'azcli-npm'
import {BakeEval} from './bake-library'

let toposort = require('toposort-class')

export class BakeRunner {
    constructor(bPackage: BakePackage, azcli: cli){

        this._package = bPackage
        this._azcli = azcli
    }

    _package: BakePackage
    _azcli: cli

    private async _executeRecipe(name: string, recipe: IRecipe): Promise<string> {
        return name
    }

    private async _executeBakeLoop(recipeNames: string[], finished: string[]) : Promise<boolean> {

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
                let promise = this._executeRecipe(recipeNames[i], recipe)
                executing.push(promise)
            }
        }

        let results = await Promise.all(executing)
        results.forEach(r=>finished.push(r))

        return recipeNames.length != finished.length
    }

    private _expandGlobalVariables(): void {
        this._package.Config.variables.forEach( (variable, name)=> {

            let expanded = BakeEval.Eval(variable)
            this._package.Config.variables.set(name, expanded)
        })
    }

    public login(): boolean {

        var result = this._package.Authenticate( (auth) =>{
            try {
                if (auth.certPath)
                    this._azcli.loginWithCert(auth.tenantId, auth.serviceId, auth.certPath)
                else
                    this._azcli.login(auth.tenantId, auth.serviceId, auth.secretKey)
                return true
            } catch(e) {
                return false
            }            
        })
        return result
    }

    public async bake(): Promise<void> {

        this._expandGlobalVariables()
        
        let recipes = this._package.Config.recipes

        //we could build a DAG and execute that way, but we expect the number of recipes in a package to be small enough
        //that a simple unoptimized loop through will work here
        let recipeNames: string[] = []
        recipes.forEach((recipe, name) => {
            recipeNames.push(name)
        })

        let finished: string[] = []
        let loopHasRemaining = await this._executeBakeLoop(recipeNames, finished)
        while(loopHasRemaining) {
            loopHasRemaining = await this._executeBakeLoop(recipeNames, finished)
        }
   
    }
}