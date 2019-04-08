import {BakeEval} from './eval'
import { DeploymentContext } from './deployment-context';
import { IngredientManager } from './ingredient-manager';

export class BakeVariable {
    constructor(value?: string){
        this._value = value
        this._compiled = undefined
    }

    _value?: any
    _compiled: Function | undefined | null

    public get Code(): any {
        return this._value || ""
    }

    public async valueAsync(ctx: DeploymentContext): Promise<any> {

        if (this._compiled == undefined) {
            this._compiled = BakeEval.Eval(this, ctx)
        }

        if (this._compiled == null){
            return this.Code
        }
        else {
            let funcWrapper = IngredientManager.getIngredientFunction
            let result = this._compiled(ctx, funcWrapper)
            let unwrap = await Promise.resolve(result)
            return unwrap
        }
    }
}