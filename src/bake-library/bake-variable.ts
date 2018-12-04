import {BakeEval} from './eval'

export class BakeVariable {
    constructor(value?: string){
        this._value = value
    }

    _value?: string

    public toString() : string {
        return BakeEval.Eval(this._value || "")
    }

    public get value(): string {
        return this.toString()
    }
}