import { DeploymentContext } from "../deployment-context";

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

            var util = require('./functions')
            util.setContext(ctx)
            return eval(data)
        }
}