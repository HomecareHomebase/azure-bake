
export class BakeData {

    private static _currentPackage : any
    private static _cli: any

    public static setPackage(source: any, cli: any): void {
        this._currentPackage = source
        this._cli = cli
    }

    public static get Environment(): any {
        return this._currentPackage.Environment
    }
    
    public static get Config(): any {
        return this._currentPackage.Config
    }
    public static get CLI(): any {
        return this._cli
    }
}