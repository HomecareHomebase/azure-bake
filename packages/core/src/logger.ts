import {red, green, blue,yellow} from 'colors'

export class Logger {
    constructor(pre?: string[]) {
        this._pre = pre || []
    }

    _pre : string[]

    private getDt(): string {
        return '[' + new Date().toUTCString() + '] ';
    }

    private getPreStr(): string {
        if (this._pre && this._pre.length > 0) {
            return this._pre.join(' : ') + ' '
        }
        else {
            return ''
        }
    }

    public getPre(): string[] {
        return this._pre
    }

    public log(msg?: any, ...args: any[]) : void {

        console.log(green(this.getDt()) + blue(this.getPreStr()) + msg, ...args)
    }
    public warn(msg?: any, ...args: any[]) : void {

        console.warn(green(this.getDt()) + yellow(this.getPreStr() + msg), ...args)
    }
    public error(msg?: any, ...args: any[]) : void {

        console.error(green(this.getDt()) + red(this.getPreStr() + msg), ...args)
    }

}