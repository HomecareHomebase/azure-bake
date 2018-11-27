import {BakeEval} from './eval'

export {BakeEval}

export class BakeData {

    private static _currentPackage : any

    public static setPackage(source: any): void {
        this._currentPackage = source
    }

    public static get Environment(): any {
        return this._currentPackage.Environment
    }
    
    public static get Config(): any {
        return this._currentPackage.Config
    }
}