import { DeploymentContext, IIngredient, BakeVariable, Logger } from '@azbake/core'
import * as Models from './models';

//import { ValidationErrors } from 'fluentvalidation-ts/dist/ValidationErrors';

export class PropertyServiceConfiguration {

    private _properties: IPropertyConfiguration | null = null;
    private _secrets: ISecretConfiguration | null = null;
    private _encryptionKeys: IEncryptionKeyConfiguration | null = null;
    private _certificates: ICertificateConfiguration | null = null;

    public get PropertyConfiguration(): IPropertyConfiguration | null {
        return this._properties;
    }
    public set PropertyConfiguration(value: IPropertyConfiguration | null) {
        this._properties = value;
    }

    public get SecretConfiguration(): ISecretConfiguration | null {
        return this._secrets;
    }
    public set SecretConfiguration(value: ISecretConfiguration | null) {
        this._secrets = value;
    }

    public get EncryptionKeyConfiguration(): IEncryptionKeyConfiguration | null {
        return this._encryptionKeys;
    }
    public set EncryptionKeyConfiguration(value: IEncryptionKeyConfiguration | null) {
        this._encryptionKeys = value;
    }

    public get CertificateConfiguration(): ICertificateConfiguration | null {
        return this._certificates;
    }
    public set CertificateConfiguration(value: ICertificateConfiguration | null) {
        this._certificates = value;
    }

    public get Count(): number {
        return this.PropertyCount + this.SecretCount + this.EncryptionKeyCount + this.CertificateCount
    }

    public get PropertyCount(): number {
        return this.PropertyCreateCount + this.PropertyUpdateCount + this.PropertyDeleteCount
    }
    public get PropertyCreateCount(): number {
        return (this._properties == null || this._properties.create == null) ? 0 : this._properties.create.length;
    }
    public get PropertyUpdateCount(): number {
        return (this._properties == null || this._properties.update == null) ? 0 : this._properties.update.length;
    }
    public get PropertyDeleteCount(): number {
        return (this._properties == null || this._properties.delete == null) ? 0 : this._properties.delete.length;
    }

    public get SecretCount(): number {
        return this.SecretCreateCount + this.SecretUpdateCount + this.SecretDeleteCount
    }
    public get SecretCreateCount(): number {
        return (this._secrets == null || this._secrets.create == null) ? 0 : this._secrets.create.length;
    }
    public get SecretUpdateCount(): number {
        return (this._secrets == null || this._secrets.update == null) ? 0 : this._secrets.update.length;
    }
    public get SecretDeleteCount(): number {
        return (this._secrets == null || this._secrets.delete == null) ? 0 : this._secrets.delete.length;
    }

    public get EncryptionKeyCount(): number {
        return this.EncryptionKeyCreateCount + this.EncryptionKeyImportCount + this.EncryptionKeyUpdateCount + this.EncryptionKeyDeleteCount;
    }
    public get EncryptionKeyCreateCount(): number {
        return (this._encryptionKeys == null || this._encryptionKeys.create == null) ? 0 : this._encryptionKeys.create.length;
    }
    public get EncryptionKeyImportCount(): number {
        return (this._encryptionKeys == null || this._encryptionKeys.import == null) ? 0 : this._encryptionKeys.import.length;
    }
    public get EncryptionKeyUpdateCount(): number {
        return (this._encryptionKeys == null || this._encryptionKeys.update == null) ? 0 : this._encryptionKeys.update.length;
    }
    public get EncryptionKeyDeleteCount(): number {
        return (this._encryptionKeys == null || this._encryptionKeys.delete == null) ? 0 : this._encryptionKeys.delete.length;
    }

    public get CertificateCount(): number {
        return this.EncryptionKeyCreateCount + this.EncryptionKeyImportCount + this.CertificateUpdateCount + this.CertificateDeleteCount;
    }
    public get CertificateCreateCount(): number {
        return (this._certificates == null || this._certificates.create == null) ? 0 : this._certificates.create.length;
    }
    public get CertificateImportCount(): number {
        return (this._certificates == null || this._certificates.import == null) ? 0 : this._certificates.import.length;
    }
    public get CertificateUpdateCount(): number {
        return (this._certificates == null || this._certificates.update == null) ? 0 : this._certificates.update.length;
    }
    public get CertificateDeleteCount(): number {
        return (this._certificates == null || this._certificates.delete == null) ? 0 : this._certificates.delete.length;
    }

    public get HasValues(): boolean {
        return (this.PropertyCount + this.SecretCount + this.EncryptionKeyCount + this.CertificateCount) > 0;
    }
}


export interface IOperationConfiguration<TCreate, TImport, TUpdate, TDelete> {
    create?: Array<TCreate>
    import?: Array<TImport>
    update?: Array<TUpdate>
    delete?: Array<TDelete>
}

// Property
export interface IPropertyConfiguration
    extends IOperationConfiguration<IPropertyCreateConfiguration, any, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration> {
}

export interface IPropertyCreateConfiguration {
    name: BakeVariable // string
    value: BakeVariable // string
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}

export interface IUpdateTargetConfiguration {
    name: string
    selectors?: { [key: string]: string }
}

export interface IPropertyUpdateConfiguration extends IPropertyCreateConfiguration {
    target: IUpdateTargetConfiguration
}
export interface IPropertyDeleteConfiguration {
    operator: Models.SearchOperator
    name: string
    selectors?: { [key: string]: string }
}

// Secrets
export interface ISecretConfiguration
    extends IOperationConfiguration<ISecretCreateConfiguration, any, ISecretUpdateConfiguration, ISecretDeleteConfiguration> {
}
export interface ISecretCreateConfiguration {
    name: string
    value: string
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}
export interface ISecretUpdateConfiguration extends ISecretCreateConfiguration {
    target: IUpdateTargetConfiguration
}
export interface ISecretDeleteConfiguration {
    operator: Models.SearchOperator
    name: string
    selectors?: { [key: string]: string }
    allVersions: boolean
}

// EncryptionKey
export interface IEncryptionKeyConfiguration
    extends IOperationConfiguration<IEncryptionKeyCreateConfiguration, IEncryptionKeyImportConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration> {
}
export interface IEncryptionKeyCreateConfiguration {
    name: string
    keyType: KeyType
    keyOperations: Array<Models.KeyOperations>
    keySize?: number
    ellipticCurveType?: Models.EllipticCurveType,
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}
export interface IEncryptionKeyImportConfiguration {
    name: string
    value: string
    keyType: KeyType
    keyOperations: Array<Models.KeyOperations>
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}
export interface IEncryptionKeyUpdateConfiguration extends IEncryptionKeyCreateConfiguration {
    target: IUpdateTargetConfiguration
}
export interface IEncryptionKeyDeleteConfiguration {
    operator: Models.SearchOperator
    name: string
    selectors?: { [key: string]: string }
}

//Certificate
export interface ICertificateConfiguration
    extends IOperationConfiguration<ICertificateCreateConfiguration, ICertificateImportConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration> {
}
export interface ICertificateCreateConfiguration {
    name: string
    subject: string
    validityInMonths?: number
    password?: string
    emails?: Array<string>
    dnsNames?: Array<string>
    upns?: Array<string>
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}
export interface ICertificateImportConfiguration {
    name: string
    value: string
    password?: string
    selectors?: { [key: string]: string }
    contentType?: string
    expirationDate?: Date
    activeDate?: Date
}
export interface ICertificateUpdateConfiguration extends ICertificateCreateConfiguration {
    target: IUpdateTargetConfiguration
}
export interface ICertificateDeleteConfiguration {
    operator: Models.SearchOperator
    name: string
    selectors?: { [key: string]: string }
}

export class ConfigurationValueResolver {

    private readonly _ctx: DeploymentContext
    private readonly _logger: Logger
    private readonly _ingredient: IIngredient

    constructor(logger: Logger, ctx: DeploymentContext, ingredient: IIngredient) {
        if (!logger) {
            throw new Error('logger is null.')
        }
        if (!ctx) {
            throw new Error('ctx is null.')
        }
        if (!ingredient) {
            throw new Error('ingredient is null.')
        }

        this._logger = logger;
        this._ctx = ctx;
        this._ingredient = ingredient;
    }

    public async GetPropertyByType<T>(type: string): Promise<T | null> {

        if (!type) {
            throw new Error('type is null.')
        }

        let typeParameters = this._ingredient.properties.parameters.get(type)
        if (!typeParameters) {
            this._logger.debug(`Configuration property type [${type}] is null.`)
            return null;
        }

        let value: T = await this.GetPropertyValue(typeParameters);
        this._logger.debug(`Configuration property type [${type}] is ${JSON.stringify(value)}}.`)

        return value;
    }

    public async GetPropertyValue(bakeVariable: BakeVariable): Promise<any> {

        if (!bakeVariable) {
            throw new Error('bakeVariable is null.')
        }

        let value: any = await bakeVariable.valueAsync(this._ctx);
        this._logger.debug(`BakeVariable resolved to ${value}}.`)

        return value;
    }
}

export class ConfigurationProvider {

    private readonly _logger: Logger;
    private readonly _resolver: ConfigurationValueResolver;

    constructor(logger: Logger, resolver: ConfigurationValueResolver) {
        if (!logger) {
            throw new Error('logger is null.')
        }
        if (!resolver) {
            throw new Error('resolver is null.')
        }

        this._logger = logger;
        this._resolver = resolver;
    }

    private async ValidateConfiguration(configuration: PropertyServiceConfiguration): Promise<void> {

        if (!configuration) {
            throw new Error('configuration is null.')
        }

        this._logger.log('Begin validating configuration'.cyan);

        if (!configuration.HasValues) {
            throw new Error('no property types have been specified.');
        }

        // if (configuration.PropertyConfiguration && configuration.PropertyConfiguration.create) {
        //     const propertyCreateConfigurationValidator = new Validation.PropertyCreateConfigurationValidator();
        //     let errors: ValidationErrors<IPropertyCreateConfiguration> = propertyCreateConfigurationValidator.validate(configuration.PropertyConfiguration.create[0])

        //     if (errors) {
        //         console.log(errors)
        //     }
        // }



        this._logger.log('Configuration validation was successful');

        this._logger.log('End validating configuration'.cyan);
    }

    public async LoadConfiguration(): Promise<PropertyServiceConfiguration> {

        this._logger.log('Begin loading configuration'.cyan);

        let configuration: PropertyServiceConfiguration = new PropertyServiceConfiguration();

        configuration.PropertyConfiguration = await this._resolver.GetPropertyByType<IPropertyConfiguration>('properties');
        this._logger.log(`Loaded Property Configuration: [${configuration.PropertyCount}] Create: ${configuration.PropertyCreateCount}, Update: ${configuration.PropertyUpdateCount},  Delete: ${configuration.PropertyDeleteCount}`);

        configuration.SecretConfiguration = await this._resolver.GetPropertyByType<ISecretConfiguration>('secrets');
        this._logger.log(`Loaded Secret Configuration: [${configuration.SecretCount}] Create: ${configuration.SecretCreateCount}, Update: ${configuration.SecretUpdateCount},  Delete: ${configuration.SecretDeleteCount}`);

        configuration.EncryptionKeyConfiguration = await this._resolver.GetPropertyByType<IEncryptionKeyConfiguration>('encryptionKeys');
        this._logger.log(`Loaded EncryptionKey Configuration: [${configuration.EncryptionKeyCount}] Create: ${configuration.EncryptionKeyCreateCount}, Import: ${configuration.EncryptionKeyImportCount}, Update: ${configuration.EncryptionKeyUpdateCount},  Delete: ${configuration.EncryptionKeyDeleteCount}`);

        configuration.CertificateConfiguration = await this._resolver.GetPropertyByType<ICertificateConfiguration>('certificates');
        this._logger.log(`Loaded Certificate Configuration: [${configuration.CertificateCount}] Create: ${configuration.CertificateCreateCount}, Import: ${configuration.CertificateImportCount}, Update: ${configuration.CertificateUpdateCount},  Delete: ${configuration.CertificateDeleteCount}`);

        this._logger.log(`Loaded [${configuration.Count}] configuration types successfully.`);

        this._logger.log('End loading configuration'.cyan);

        await this.ValidateConfiguration(configuration);

        return configuration;
    }
}