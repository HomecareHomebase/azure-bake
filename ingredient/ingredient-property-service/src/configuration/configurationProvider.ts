import { Logger } from "@azbake/core"

import { ConfigurationValueResolver, PropertyServiceConfiguration, IPropertyConfiguration, ISecretConfiguration } from ".";
//IEncryptionKeyConfiguration, ICertificateConfiguration } from ".";

import { VariableResolver } from "./variableResolver";
import { ConfigurationValidator } from "./configurationValidator";
import { SearchOperator } from "../models/searchOperator";
import { IDeleteConfiguration } from "./models/baseConfigurations";

export class ConfigurationProvider {

    private readonly _logger: Logger;
    private readonly _resolver: ConfigurationValueResolver;

    constructor(logger: Logger, resolver: ConfigurationValueResolver) {
        this._logger = logger;
        this._resolver = resolver;
    }

    public async Initialize(): Promise<PropertyServiceConfiguration> {

        const configuration: PropertyServiceConfiguration = await this._loadConfiguration();

        const variableResolver: VariableResolver = new VariableResolver(this._logger, this._resolver);
        await variableResolver.ResolveBakeVariables(configuration);

        const configurationValidator: ConfigurationValidator = new ConfigurationValidator(this._logger);
        await configurationValidator.ValidateConfiguration(configuration);

        return configuration;
    }

    private async _loadConfiguration(): Promise<PropertyServiceConfiguration> {

        this._logger.log('Begin loading configuration'.cyan);

        const configuration: PropertyServiceConfiguration = new PropertyServiceConfiguration();

        configuration.PropertyConfiguration = await this._resolver.GetPropertyByType<IPropertyConfiguration>('properties');
        if (configuration.PropertyConfiguration && configuration.PropertyConfiguration.delete) {
            this._resolveSearchOperator(configuration.PropertyConfiguration.delete);
        }
        this._logger.log(`Loaded Property Configuration: [${configuration.PropertyCount}] Create: ${configuration.PropertyCreateCount}, Update: ${configuration.PropertyUpdateCount},  Delete: ${configuration.PropertyDeleteCount}`);

        configuration.SecretConfiguration = await this._resolver.GetPropertyByType<ISecretConfiguration>('secrets');
        if (configuration.SecretConfiguration && configuration.SecretConfiguration.delete) {
            this._resolveSearchOperator(configuration.SecretConfiguration.delete);
        }
        this._logger.log(`Loaded Secret Configuration: [${configuration.SecretCount}] Create: ${configuration.SecretCreateCount}, Update: ${configuration.SecretUpdateCount},  Delete: ${configuration.SecretDeleteCount}`);

        // configuration.EncryptionKeyConfiguration = await this._resolver.GetPropertyByType<IEncryptionKeyConfiguration>('encryptionKeys');
        // if (configuration.EncryptionKeyConfiguration && configuration.EncryptionKeyConfiguration.delete) {
        //     this._resolveSearchOperator(configuration.EncryptionKeyConfiguration.delete);
        // }
        // this._logger.log(`Loaded EncryptionKey Configuration: [${configuration.EncryptionKeyCount}] Create: ${configuration.EncryptionKeyCreateCount}, Update: ${configuration.EncryptionKeyUpdateCount},  Delete: ${configuration.EncryptionKeyDeleteCount}`);

        // configuration.CertificateConfiguration = await this._resolver.GetPropertyByType<ICertificateConfiguration>('certificates');
        // if (configuration.CertificateConfiguration && configuration.CertificateConfiguration.delete) {
        //     this._resolveSearchOperator(configuration.CertificateConfiguration.delete);
        // }
        // this._logger.log(`Loaded Certificate Configuration: [${configuration.CertificateCount}] Create: ${configuration.CertificateCreateCount}, Update: ${configuration.CertificateUpdateCount},  Delete: ${configuration.CertificateDeleteCount}`);

        this._logger.log(`Loaded [${configuration.Count}] configuration types successfully`);

        this._logger.log('End loading configuration'.cyan);

        return configuration;
    }

    private _resolveSearchOperator(deleteConfiguration: Array<IDeleteConfiguration>): void {
        deleteConfiguration.forEach(config => {
            config.operator = (<any>SearchOperator)[config.operator]
        });
    }
}