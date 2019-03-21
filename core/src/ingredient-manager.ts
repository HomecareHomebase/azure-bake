import { IIngredient, IIngredientType, IBaseUtilityType } from "./bake-interfaces"
import { stringify } from "querystring"
import { BaseIngredient } from "./base-ingredient"
import {DeploymentContext} from "./deployment-context"
import { BaseUtility } from "./base-utility"

export class IngredientManager {
    
    private static ingredientTypes : Map<string, IIngredientType>
        = new Map<string, IIngredientType>()
    private static ingredientUtilTypes : Map<string,IBaseUtilityType>
        = new Map<string, IBaseUtilityType>() 
    private static ingredientTypesVersions : Map<string, string>
        = new Map<string, string>()

    public static Register(moduleName: string):void {

        var module = require(moduleName)

        if (module.plugin){
            let module_version = require(moduleName + '/package.json').version

            IngredientManager.ingredientTypes.set(module.pluginNS, module.plugin)
            IngredientManager.ingredientTypesVersions.set(module.pluginNS, module_version)
        }

        if (module.functions){
            IngredientManager.ingredientUtilTypes.set(module.functionsNS, module.functions)
        }
        
    }

    public static CreateIngredient(ingredientType: string, name: string, ingredient: IIngredient, ctx: DeploymentContext ): BaseIngredient | null {

        let type = IngredientManager.ingredientTypes.get(ingredientType)
        if (type){
            let plugin = new type(name,ingredient,ctx)
            
            //this is a bit smelly, but allows us to inject package version into the ingredient instance
            plugin._ingredient.pluginVersion = IngredientManager.ingredientTypesVersions.get(ingredientType) || "0.0.0"
            return plugin
        }
        else {
            return null
        }
    }

    public static buildUtilWrapperEval(ctx: string, wrapper: string): string {

        let evalStr = ""
        IngredientManager.ingredientUtilTypes.forEach( (utilType, name)=>
        {
            evalStr += "var " + name +"= "+wrapper+"('"+name+"',"+ctx+")\n"
        })
        return evalStr
    }

    public static getIngredientFunction(typeName: string, ctx: DeploymentContext) : any {
       
        let type = IngredientManager.ingredientUtilTypes.get(typeName)
        if (type){
            return new type(ctx)
        }
        else {
            return null
        }
    }
    
}