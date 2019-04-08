import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core"
import * as fs from 'fs'
import * as ts from 'typescript'

export class CustomScriptIngredient extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)  
    }

    public async Execute(): Promise<void> {

        let source: any = await this._ingredient.properties.source.valueAsync(this._ctx)

        let chk = fs.existsSync(source)
        if (!chk) {
            this._logger.error('could not locate custom script: ' + source)
            return
        }

        let buffer = fs.readFileSync(source)
        let contents = buffer.toString()

        try {
            this._logger.log("Executing custom script: " + source)

            contents = ts.transpile(contents)
           

            //expose all params as a simple object.
            var params: any = {}
            this._ingredient.properties.parameters.forEach( (v, k)=>
            {
                v.valueAsync(this._ctx).then(val=>{
                    let n = k +"=" + val
                    this._logger.log('param: ' + n) 
                    params[k] = val    
                })
            })

            let script = contents + "\n onExecute(this._ctx, this._logger, params)"
            eval(script)
        }
        catch(err){
            this._logger.error('script execution failed: ' + err)
            throw err
        }
    }
}