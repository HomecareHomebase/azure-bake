import { DeploymentContext } from "./deployment-context";
import { IngredientManager } from ".";

export class BakeEval {

        public static Eval(data: string , ctx: DeploymentContext): string {

            let check = data.trim()
            //check if data is surrounded with [] to denote an eval
            if (!check.startsWith('[') || !check.endsWith(']')){
                return data
            }

            data = check.substr(1, check.length-2)

            let evaled = this.compile(data, ctx)
            return evaled

        }

        private static compile(data: string, ctx: DeploymentContext) : string {

            let funcWrapper = IngredientManager.GetIngredientFunctionWrapper
            let utilStr = IngredientManager.BuildUtilWrapperEval("ctx","funcWrapper")   
            return eval(utilStr + "\n" + data)
        }
}