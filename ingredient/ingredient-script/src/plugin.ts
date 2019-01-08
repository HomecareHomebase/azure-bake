import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core"
import * as fs from 'fs'
import * as ts from 'typescript'

export class CustomScriptIngredient extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)  
    }

    public async Execute(): Promise<string> {

        let chk = fs.existsSync(this._ingredient.properties.template)
        if (!chk) {
            this._logger.error('could not locate custom script: ' + this._ingredient.properties.template)
            return this._name
        }

        let buffer = fs.readFileSync(this._ingredient.properties.template)
        let contents = buffer.toString()

        try {
            this._logger.log("Executing custom script: " + this._ingredient.properties.template)

            contents = ts.transpile(contents)
           

            //expose all params as a simple object.
            var params: any = {}
            this._ingredient.properties.parameters.forEach( (v, k)=>
            {
                let val = v.value(this._ctx)
                let n = k +"=" + val
                this._logger.log('param: ' + n) 
                params[k] = val
            })

            let script = contents + "\n onExecute(this._ctx, this._logger, params)"
            eval(script)
        }
        catch(err){
            this._logger.error('script execution failed: ' + err)
            throw err
        }
        finally{
            return this._name
        }
    }
}