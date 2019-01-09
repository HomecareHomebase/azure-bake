import {BakeEval} from './eval'
import { DeploymentContext } from './deployment-context';
import { IngredientManager } from './ingredient-manager';

export class BakeVariable {
    constructor(value?: string){
        this._value = value
        this._compiled = undefined
    }

    _value?: string
    _compiled: Function | undefined | null

    public get Code(): string {
        return this._value || ""
    }

    public value(ctx: DeploymentContext): string {

        if (this._compiled == undefined) {
            this._compiled = BakeEval.Eval(this, ctx)
        }

        if (this._compiled == null){
            return this.Code.trim()
        }
        else {
            let funcWrapper = IngredientManager.getIngredientFunction
            return this._compiled(ctx, funcWrapper)
        }
    }
}