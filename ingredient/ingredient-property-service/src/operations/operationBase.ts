import { Logger } from '@azbake/core'

import { SearchOperator } from '../models';
import { IOperationConfiguration, ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration } from '../configuration';
import { StringUtils } from '../utils/stringUtil';

export abstract class OperationBase<TCreate extends ICreateConfiguration, TUpdate extends IUpdateConfiguration, TDelete extends IDeleteConfiguration> {
    protected readonly _logger: Logger;
    private readonly _configuration: IOperationConfiguration<TCreate, TUpdate, TDelete>;

    protected constructor(logger: Logger, configuration: IOperationConfiguration<TCreate, TUpdate, TDelete>) {
        this._logger = logger;
        this._configuration = configuration;
    }

    abstract get TypeName(): string

    public async Execute(): Promise<void> {
        await this._createImpl()
        await this._updateImpl()
        await this._deleteImpl()
    }

    protected abstract Create(index: number, configuration: TCreate): Promise<void>
    protected abstract Update(index: number, configuration: TUpdate): Promise<void>
    protected abstract Delete(index: number, configuration: TDelete): Promise<void>

    private async _createImpl(): Promise<void> {

        const config: TCreate[] | undefined = this._configuration.create;

        if (!config || config.length == 0) {
            return;
        }
        for (let index = 0; index < config.length; index++) {
            await this.Create(index, config[index]);
        }
    }

    private async _updateImpl(): Promise<void> {

        const config: TUpdate[] | undefined = this._configuration.update;

        if (!config || config.length == 0) {
            return;
        }

        for (let index = 0; index < config.length; index++) {
            await this.Update(index, config[index]);
        }
    }

    private async _deleteImpl(): Promise<void> {

        const config: TDelete[] | undefined = this._configuration.delete;

        if (!config || config.length == 0) {
            return;
        }

        for (let index = 0; index < config.length; index++) {
            await this.Delete(index, config[index]);
        }
    }

    protected LogOperationMessage(success: boolean, operation: string, index: number, identifier: string, message: string) {

        const msg = `${StringUtils.ToTitleCase(this.TypeName)} ${operation}: [${index}][${success ? message.magenta : message}]: ${identifier}`;

        if (success) {
            this._logger.log(msg);
        } else {
            this._logger.error(msg);
        }
    }

    protected DatesEqual(configValue: Date | undefined, propertyValue: Date | undefined): boolean {
        if (!configValue) {
            return true;
        }
        if (!propertyValue) {
            return false;
        }

        const configDate = new Date(configValue);
        const propertyDate = new Date(propertyValue);

        return configDate.getTime() == propertyDate.getTime();
    }


    protected StringEquals(configValue: string | undefined, propertyValue: string | undefined): boolean {
        if (!configValue) {
            return true;
        }
        if (!propertyValue) {
            return false;
        }

        return configValue == propertyValue;
    }

    protected SelectorsEqual(configValue: { [key: string]: string } | undefined, propertyValue: { [key: string]: string } | undefined): boolean {
        if (!configValue) {
            return true;
        }
        if (!propertyValue) {
            return false;
        }

        return Object.entries(configValue).sort().toString() === Object.entries(propertyValue).sort().toString();;
    }

    protected GetIdentifier(name: string, id: string | undefined, version: string | undefined = undefined): string {
        if (version && version != '') {
            return `Identifier: ${name}\/${id}\/${version}`.green;
        }
        return `Identifier: ${name}\/${id}`.green;
    }
    protected GetConfiguration(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator | null = null): string {
        let selectorValue: string = '';
        if (selectors) {
            selectorValue = Object.keys(selectors)
                .map((k) => `${k}=${selectors[k]}`)
                .join(', ');
        }

        if (operator == null) {
            operator = SearchOperator.Equals;
        }

        if (selectors) {
            return `Search Criteria: [${SearchOperator[operator]}][${name}][${selectorValue}]`.yellow;
        }

        return `Search Criteria: [${SearchOperator[operator]}][${name}]`.yellow;
    }
}