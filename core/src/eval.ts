import { DeploymentContext } from "./deployment-context";
import { IngredientManager, BakeVariable } from ".";

export class BakeEval {

        public static Eval(variable: BakeVariable , ctx: DeploymentContext): Function | null {

            let check = variable.Code.trim()
            //check if data is surrounded with [] to denote an eval
            if (!check.startsWith('[') || !check.endsWith(']')){
                return null
            }

            let data = check.substr(1, check.length-2)
            let evaled = this.compile(data, ctx)
            return evaled

        }

        private static compile(data: string, ctx: DeploymentContext) : Function {
            let utilStr = IngredientManager.buildUtilWrapperEval("ctx","funcWrapper")   
            let func = new Function('ctx', 'funcWrapper', utilStr + "\n return(" + data +")")
            return func

        }
}