var util = require('./functions')

function get(val: string ): string {
    return val
}

export class BakeEval {

        public static Eval(data: string ): string{

            let check = data.trim()
            //check if data is surrounded with [] to denote an eval
            if (!check.startsWith('[') || !check.endsWith(']')){
                return data
            }

            data = check.substr(1, check.length-2)

            let evaled = eval(data)
            return evaled

        }
}