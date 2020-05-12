import { Logger, BakeVariable } from "@azbake/core";

import { PropertyServiceConfiguration } from "./propertyServiceConfiguration";
import { ConfigurationValueResolver } from "./configurationValueResolver";

export class VariableResolver {

    private readonly _logger: Logger;
    private readonly _resolver: ConfigurationValueResolver;

    constructor(logger: Logger, resolver: ConfigurationValueResolver) {
        this._logger = logger;
        this._resolver = resolver;
    }

    public async ResolveBakeVariables(configuration: PropertyServiceConfiguration): Promise<void> {

        if (!configuration.HasValues) {
            return;
        }

        this._logger.log('Begin resolving bake variables'.cyan);

        if (configuration.PropertyConfiguration) {
            await this._enumerateAndResolveBakeVariables('properties.create', configuration.PropertyConfiguration.create);
            await this._enumerateAndResolveBakeVariables('properties.update', configuration.PropertyConfiguration.update);
            await this._enumerateAndResolveBakeVariables('properties.delete', configuration.PropertyConfiguration.delete);
        }

        if (configuration.SecretConfiguration) {
            await this._enumerateAndResolveBakeVariables('secrets.create', configuration.SecretConfiguration.create);
            await this._enumerateAndResolveBakeVariables('secrets.update', configuration.SecretConfiguration.update);
            await this._enumerateAndResolveBakeVariables('secrets.delete', configuration.SecretConfiguration.delete);
        }

        // if (configuration.EncryptionKeyConfiguration) {
        //     await this._enumerateAndResolveBakeVariables('encryptionkeys.create', configuration.EncryptionKeyConfiguration.create);
        //     await this._enumerateAndResolveBakeVariables('encryptionkeys.update', configuration.EncryptionKeyConfiguration.update);
        //     await this._enumerateAndResolveBakeVariables('encryptionkeys.delete', configuration.EncryptionKeyConfiguration.delete);
        // }

        // if (configuration.CertificateConfiguration) {
        //     await this._enumerateAndResolveBakeVariables('certificates.create', configuration.CertificateConfiguration.create);
        //     await this._enumerateAndResolveBakeVariables('certificates.update', configuration.CertificateConfiguration.update);
        //     await this._enumerateAndResolveBakeVariables('certificates.delete', configuration.CertificateConfiguration.delete);
        // }

        this._logger.log('Resolving bake variables was successful');

        this._logger.log('End resolving bake variables'.cyan);
    }

    private async _enumerateAndResolveBakeVariables<T>(type: string, configArray: T[] | undefined): Promise<void> {
        if (!configArray) {
            return;
        }

        for (let i = 0; i < configArray.length; ++i) {
            await this._resolveBakeVariable(i, type, configArray[i])
        }
    }

    private async _resolveBakeVariable(index: number, type: string, instance: any | undefined): Promise<void> {

        if (!instance) {
            return;
        }

        const propertyNames: string[] = Object.getOwnPropertyNames(instance);

        for (let propertyName of propertyNames) {

            const objectValue: any = instance[propertyName];
            if (!objectValue || typeof objectValue != 'string') {
                continue;
            }

            const stringValue: string = instance[propertyName].trim();
            if (!stringValue || !stringValue.startsWith('[') || !stringValue.endsWith(']')) {
                continue;
            }

            const bakeVariable = new BakeVariable(stringValue);
            const value: any = await this._resolver.GetPropertyValue<any>(bakeVariable);
            instance[propertyName] = value;


            const isObject: boolean = (!(value instanceof Date) && typeof value == 'object');

            if (this._logger._logLevel != 'debug') {
                this._logger.log(`Resolving bake variable [${type}[${index}].${propertyName}]`);
            }

            if (isObject) {
                this._logger.debug(`Resolving bake variable [${type}[${index}].${propertyName}] to [${JSON.stringify(value)}]`);
            }
            else {
                this._logger.debug(`Resolving bake variable [${type}[${index}].${propertyName}] to [${value}]`);
            }
        }
    }
}