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

    public static Register(moduleName: string):void {

        var module = require(moduleName)
        if (module.plugin){
            IngredientManager.ingredientTypes.set(module.pluginNS, module.plugin)
        }

        if (module.functions){
            IngredientManager.ingredientUtilTypes.set(module.functionsNS, module.functions)
        }
        
    }

    public static CreateIngredient(ingredientType: string, name: string, ingredient: IIngredient, ctx: DeploymentContext ): BaseIngredient | null {

        let type = IngredientManager.ingredientTypes.get(ingredientType)

        if (type){
            return new type(name,ingredient,ctx)
        }
        else {
            return null
        }
    }

    public static BuildUtilWrapperEval(ctx: string, wrapper: string): string {

        let evalStr = ""
        IngredientManager.ingredientUtilTypes.forEach( (utilType, name)=>
        {
            evalStr += "var " + name +"= "+wrapper+"('"+name+"',"+ctx+")\n"
        })
        return evalStr
    }

    public static GetIngredientFunctionWrapper(typeName: string, ctx: DeploymentContext) : any {
       
        let type = IngredientManager.ingredientUtilTypes.get(typeName)
        if (type){
            return new type(ctx)
        }
        else {
            return null
        }
    }
    
}