import {BakeEval} from './eval'
import { DeploymentContext } from './deployment-context';

export class BakeVariable {
    constructor(value?: string){
        this._value = value
    }

    _value?: string

    public value(ctx: DeploymentContext): string {
        return BakeEval.Eval(this._value || "", ctx)
    }
}