import {red, green, blue, yellow, magenta} from 'colors'

export class Logger {
    constructor(pre?: string[], logLevel?: string) {
        this._pre = pre || []
        this._logLevel = logLevel || 'info'
    }

    _pre: string[]
    _logLevel: string

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

    public getLogLevel(): string {
        return this._logLevel
    }


    public debug(msg?: any, ...args: any[]): void {
        if (this._logLevel == 'debug')
            console.error(green(this.getDt()) + magenta(this.getPreStr() + msg), ...args)
    }

    public log(msg?: any, ...args: any[]): void {
        if (this._logLevel == 'debug' || this._logLevel == 'info')
            console.log(green(this.getDt()) + blue(this.getPreStr()) + msg, ...args)
    }
    public warn(msg?: any, ...args: any[]) : void {
        if (this._logLevel == 'debug' || this._logLevel == 'info' || this._logLevel == 'warn')
            console.warn(green(this.getDt()) + yellow(this.getPreStr() + msg), ...args)
    }
    public error(msg?: any, ...args: any[]) : void {
        if (this._logLevel == 'debug' || this._logLevel == 'info' || this._logLevel == 'warn' || this._logLevel == 'error')
            console.error(green(this.getDt()) + red(this.getPreStr() + msg), ...args)
    }



}