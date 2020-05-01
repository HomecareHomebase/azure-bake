import { BakeVariable, Logger } from '@azbake/core'
import { PropertyServiceClient } from './serviceclient'
import { Property, Secret, EncryptionKey, Certificate } from './client/models/index'
import {
    IPropertyConfiguration, IPropertyCreateConfiguration, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration,
    ISecretConfiguration, ISecretCreateConfiguration, ISecretUpdateConfiguration, ISecretDeleteConfiguration,
    IEncryptionKeyConfiguration, IEncryptionKeyCreateConfiguration, IEncryptionKeyImportConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration,
    ICertificateConfiguration, ICertificateCreateConfiguration, ICertificateImportConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration,
    IOperationConfiguration,
    ConfigurationValueResolver
} from './configuration';

import { SearchOperator } from './models';

export abstract class ServerOperation<TCreate, TImport, TUpdate, TDelete> {
    protected readonly _logger: Logger;
    protected readonly _client: PropertyServiceClient
    protected readonly _configuration: IOperationConfiguration<TCreate, TImport, TUpdate, TDelete>;
    private readonly _resolver: ConfigurationValueResolver;

    protected constructor(logger: Logger, client: PropertyServiceClient, resolver: ConfigurationValueResolver, configuration: IOperationConfiguration<TCreate, TImport, TUpdate, TDelete>) {

        if (!logger) {
            throw new Error('logger is null.')
        }
        if (!client) {
            throw new Error('client is null.')
        }
        if (!resolver) {
            throw new Error('resolver is null.')
        }
        if (!configuration) {
            throw new Error('configuration is null.')
        }

        this._logger = logger;
        this._client = client;
        this._resolver = resolver;
        this._configuration = configuration;
    }

    abstract get TypeName(): string

    public async Execute(): Promise<void> {
        await this.CreateImpl()
        await this.ImportImpl()
        await this.UpdateImpl()
        await this.DeleteImpl()
    }

    protected abstract async Create(index: number, configuration: TCreate): Promise<void>
    protected abstract async Import(index: number, configuration: TImport): Promise<void>
    protected abstract async Update(index: number, configuration: TUpdate): Promise<void>
    protected abstract async Delete(index: number, configuration: TDelete): Promise<void>

    protected async ResolveBakeVariable(bakeVariable: BakeVariable): Promise<any> {

        if (!bakeVariable) {
            throw new Error('bakeVariable is null.')
        }

        if (typeof bakeVariable == 'string') {
            let value: string = bakeVariable;
            return value;
        }

        return await this._resolver.GetPropertyValue(bakeVariable);;
    }
    private async CreateImpl(): Promise<void> {

        const config: TCreate[] | undefined = this._configuration.create;

        if (!config || config.length == 0) {
            return;
        }

        this.LogOperationHeader(true, 'Create');

        for (let index = 0; index < config.length; index++) {
            await this.Create(index, config[index]);
        }

        this.LogOperationHeader(false, 'Create');
    }

    private async ImportImpl(): Promise<void> {

        let config: TImport[] | undefined = this._configuration.import;

        if (!config || config.length == 0) {
            return;
        }

        this.LogOperationHeader(true, 'Import');

        for (let index = 0; index < config.length; index++) {
            await this.Import(index, config[index]);
        }

        this.LogOperationHeader(false, 'Import');
    }

    private async UpdateImpl(): Promise<void> {

        let config: TUpdate[] | undefined = this._configuration.update;

        if (!config || config.length == 0) {
            return;
        }

        this.LogOperationHeader(true, 'Update');

        for (let index = 0; index < config.length; index++) {
            await this.Update(index, config[index]);
        }

        this.LogOperationHeader(false, 'Update');
    }

    private async DeleteImpl(): Promise<void> {

        let config: TDelete[] | undefined = this._configuration.delete;

        if (!config || config.length == 0) {
            return;
        }

        this.LogOperationHeader(true, 'Delete');

        for (let index = 0; index < config.length; index++) {
            await this.Delete(index, config[index]);
        }

        this.LogOperationHeader(false, 'Delete');
    }

    protected LogOperationHeader(begin: boolean, operation: string) {

        if (!operation) {
            throw new Error('operation is null.')
        }

        var msg = `${this.TypeName} ${operation}: ${begin ? 'Begin' : 'End'} Processing`;
        this._logger.log(msg.cyan);
    }

    protected LogOperationMessage(success: boolean, operation: string, index: number, identifier: any, message: string) {

        if (!operation) {
            throw new Error('operation is null.')
        }
        if (!identifier) {
            throw new Error('identifier is null.')
        }
        if (!message) {
            throw new Error('message is null.')
        }

        var msg = `${this.TypeName} ${operation}: [${index}][${message.magenta}]: ${identifier}`;

        if (success) {
            this._logger.log(msg);
        } else {
            this._logger.error(msg);
        }
    }

    protected DatesEqual(date1: Date | undefined, date2: Date | undefined): boolean {
        if (!date1) {
            return !date2;
        }

        if (!date2) {
            return false;
        }

        var d1 = new Date(date1);
        var d2 = new Date(date1);

        return d1.getTime() == d2.getTime();
    }

    protected GetIdentifier(name: string, id: string | undefined, version: string | undefined = undefined): string {

        if (!name) {
            throw new Error('name is null.')
        }
        if (!id) {
            throw new Error('id is null.')
        }

        if (version && version != '') {
            return `Identifier: ${name}\/${id}\/${version}`.green;
        }
        return `Identifier: ${name}\/${id}`.green;
    }
    protected GetConfiguration(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator | null = null): string {

        if (!name) {
            throw new Error('name is null.')
        }

        let selectorValue: string = '';
        if (selectors) {
            selectorValue = Object.keys(selectors)
                .map((k) => `${k}=${selectors[k]}`)
                .join(', ');
        }

        if (operator) {
            return `Search Criteria: ${operator} - ${name} - ${selectorValue}`.yellow;
        }
        return `Search Criteria: ${name} - ${selectorValue}`.yellow;
    }
}


export class PropertyOperation extends ServerOperation<IPropertyCreateConfiguration, any, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration> {

    constructor(logger: Logger, client: PropertyServiceClient, resolver: ConfigurationValueResolver, configuration: IPropertyConfiguration) {
        super(logger, client, resolver, configuration)

    }

    get TypeName(): string {
        return "Property";
    }

    protected async Create(index: number, configuration: IPropertyCreateConfiguration): Promise<void> {

        let name: string = await this.ResolveBakeVariable(configuration.name);

        this.LogOperationMessage(true, 'Create', index, this.GetConfiguration(name, configuration.selectors), 'Processing the property create operation.');

        // Exists
        let property = await this._client.SearchSingleProperty(name, configuration.selectors);
        if (!property) {
            // Create
            await this.CreateProperty(index, configuration);
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(property.name, property.id), 'The property already exists.');
        await this.UpdateProperty(index, configuration, property, 'Create');
    }

    protected async Import(index: number, configuration: any): Promise<void> {
        throw new Error("Import is not supported for property types.");
    }

    protected async Update(index: number, configuration: IPropertyUpdateConfiguration): Promise<void> {

        this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(await configuration.target.name, await configuration.target.selectors), 'Processing update operation');

        // Exists
        let property = await this._client.SearchSingleProperty(configuration.target.name, configuration.target.selectors);
        if (!property) {
            this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'The specified property was not found.');
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Update', index, this.GetIdentifier(property.name, property.id), `The specified property was found.`);
        await this.UpdateProperty(index, configuration, property, 'Update');
    }

    protected async Delete(index: number, configuration: IPropertyDeleteConfiguration): Promise<void> {

        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'Processing the property delete operation.');

        let properties = await this._client.SearchProperties(configuration.operator, configuration.name, configuration.selectors);
        if (!properties || properties.length == 0) {
            this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'The specified property was not found.');
            return;
        }

        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), `Found ${properties.length} properties.`);

        for (let index2 = 0; index2 < properties.length; index2++) {
            if (await this._client.DeleteProperty(properties[index2].id || "", properties[index2].name)) {
                this.LogOperationMessage(true, 'Delete', index, this.GetIdentifier(properties[index2].name, properties[index2].id), `The property was successfully deleted.`);
                continue;
            }

            this.LogOperationMessage(false, 'Delete', index, this.GetIdentifier(properties[index2].name, properties[index2].id), 'The specified property failed to delete.');
        }
    }

    private async CreateProperty(index: number, configuration: IPropertyCreateConfiguration): Promise<void> {

        let name: string = await this.ResolveBakeVariable(configuration.name);
        let value: string = await this.ResolveBakeVariable(configuration.value);

        let newProperty: Property = {
            name: name,
            value: value,
            selectors: configuration.selectors,
            contentType: configuration.contentType,
            attributes: {
                notBefore: configuration.activeDate,
                expires: configuration.expirationDate
            }
        };

        // Create
        let createdProperty: Property | null = await this._client.CreateProperty(newProperty);
        if (createdProperty) {
            this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(createdProperty.name, createdProperty.id), `The property was successfully created.`);
            return
        }

        this.LogOperationMessage(false, 'Create', index, this.GetConfiguration(name, configuration.selectors), `The property failed to be created.`);
        return;
    }

    private async UpdateProperty(index: number, configuration: IPropertyCreateConfiguration, property: Property, operation: string): Promise<void> {

        let name: string = await this.ResolveBakeVariable(configuration.name);
        let value: string = await this.ResolveBakeVariable(configuration.value);

        // Exists, No updates
        if (name == property.name &&
            value == property.value &&
            configuration.selectors == property.selectors &&
            configuration.contentType == property.contentType &&
            this.DatesEqual(configuration.activeDate, property.attributes.notBefore) &&
            this.DatesEqual(configuration.expirationDate, property.attributes.expires)) {

            this.LogOperationMessage(true, operation, index, this.GetIdentifier(property.name, property.id), `The properties are equal, no update requred.`);
            return;
        }

        property.name = name;
        property.value = value;
        property.selectors = configuration.selectors;
        property.contentType = configuration.contentType;
        property.attributes.notBefore = configuration.activeDate;
        property.attributes.expires = configuration.expirationDate;

        // Update
        let updatedProperty: Property | null = await this._client.UpdateProperty(property);
        if (updatedProperty) {
            this.LogOperationMessage(true, operation, index, this.GetIdentifier(updatedProperty.name, updatedProperty.id), `The property was successfully updated.`);
            return;
        }

        this.LogOperationMessage(false, operation, index, this.GetIdentifier(property.name, property.id), `The property failed to be updated.`);
    }

}


export class SecretOperation extends ServerOperation<ISecretCreateConfiguration, any, ISecretUpdateConfiguration, ISecretDeleteConfiguration> {

    constructor(logger: Logger, client: PropertyServiceClient, resolver: ConfigurationValueResolver, configuration: ISecretConfiguration) {
        super(logger, client, resolver, configuration)

    }

    get TypeName(): string {
        return "Secret";
    }

    protected async Create(index: number, configuration: ISecretCreateConfiguration): Promise<void> {

        this.LogOperationMessage(true, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), 'Processing the secret create operation.');

        // Exists
        let secret = await this._client.SearchSingleSecret(configuration.name, configuration.selectors);
        if (!secret) {
            // Create
            await this.CreateSecret(index, configuration);
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(secret.name, secret.id, secret.version), 'The secret already exists.');
        await this.UpdateSecret(index, configuration, secret, 'Create');
    }
    protected async Import(index: number, configuration: any): Promise<void> {
        throw new Error("Import is not supported for secret types.");
    }
    protected async Update(index: number, configuration: ISecretUpdateConfiguration): Promise<void> {

        this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'Processing the secret update operation.');

        // Exists
        let secret = await this._client.SearchSingleSecret(configuration.target.name, configuration.target.selectors);
        if (!secret) {
            this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'The specified secret was not found.');
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Update', index, this.GetIdentifier(secret.name, secret.id, secret.version), `The specified secret was found.`);
        await this.UpdateSecret(index, configuration, secret, 'Update');
    }
    protected async Delete(index: number, configuration: ISecretDeleteConfiguration): Promise<void> {

        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'Processing the secret delete operation.');

        let secrets = await this._client.SearchSecrets(configuration.operator, configuration.name, configuration.selectors);
        if (!secrets || secrets.length == 0) {
            this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'The specified secret was not found.');
            return;
        }

        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), `Found ${secrets.length} secrets`);

        for (let index2 = 0; index2 < secrets.length; index2++) {

            let version: string = secrets[index2].version || '';
            if (configuration.allVersions) {
                version = '';
            }

            if (await this._client.DeleteSecret(secrets[index2].id || '', secrets[index2].name, version)) {
                this.LogOperationMessage(true, 'Delete', index, this.GetIdentifier(secrets[index2].name, secrets[index2].id, version), `The secret was successfully deleted.`);
                continue;
            }

            this.LogOperationMessage(false, 'Delete', index, this.GetIdentifier(secrets[index2].name, secrets[index2].id, version), 'The specified secret failed to delete.');
        }
    }

    private async CreateSecret(index: number, configuration: ISecretCreateConfiguration): Promise<void> {

        let newSecret: Secret = {
            name: configuration.name,
            value: configuration.value,
            selectors: configuration.selectors,
            contentType: configuration.contentType,
            attributes: {
                notBefore: configuration.activeDate,
                expires: configuration.expirationDate
            }
        };

        // Create
        let createdSecret: Secret | null = await this._client.CreateSecret(newSecret);
        if (createdSecret) {
            this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(createdSecret.name, createdSecret.id, createdSecret.version), `The secret was successfully created.`);
            return
        }

        this.LogOperationMessage(false, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), `The secret failed to be created.`);
        return;
    }
    private async UpdateSecret(index: number, configuration: ISecretCreateConfiguration, secret: Secret, operation: string): Promise<void> {

        // Exists, No updates
        if (configuration.name == secret.name &&
            configuration.selectors == secret.selectors &&
            configuration.value == secret.value &&
            configuration.contentType == secret.contentType &&
            this.DatesEqual(configuration.activeDate, secret.attributes.notBefore) &&
            this.DatesEqual(configuration.expirationDate, secret.attributes.expires)) {

            this.LogOperationMessage(true, operation, index, this.GetIdentifier(secret.name, secret.id, secret.version), `The secrets are equal, no update requred.`);
            return;
        }

        secret.name = configuration.name;
        secret.selectors = configuration.selectors;
        secret.value = configuration.value;
        secret.contentType = configuration.contentType;
        secret.attributes.notBefore = configuration.activeDate;
        secret.attributes.expires = configuration.expirationDate;

        // Update
        let updatedSecret: Secret | null = await this._client.UpdateSecret(secret);
        if (updatedSecret) {
            this.LogOperationMessage(true, operation, index, this.GetIdentifier(updatedSecret.name, updatedSecret.id, updatedSecret.version), `The secret was successfully updated.`);
            return;
        }

        this.LogOperationMessage(false, operation, index, this.GetIdentifier(secret.name, secret.id, secret.version), `The secret failed to be updated.`);
    }
}

export class EncryptionKeyOperation extends ServerOperation<IEncryptionKeyCreateConfiguration, IEncryptionKeyImportConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration> {

    constructor(logger: Logger, client: PropertyServiceClient, resolver: ConfigurationValueResolver, configuration: IEncryptionKeyConfiguration) {
        super(logger, client, resolver, configuration)

    }

    get TypeName(): string {
        return "EncryptionKey"
    }

    protected async Create(index: number, configuration: IEncryptionKeyCreateConfiguration): Promise<void> {
    }
    protected async Import(index: number, configuration: IEncryptionKeyImportConfiguration): Promise<void> {
    }
    protected async Update(index: number, configuration: IEncryptionKeyUpdateConfiguration): Promise<void> {
    }
    protected async Delete(index: number, configuration: IEncryptionKeyDeleteConfiguration): Promise<void> {
    }

}

export class CertificateOperation extends ServerOperation<ICertificateCreateConfiguration, ICertificateImportConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration> {

    constructor(logger: Logger, client: PropertyServiceClient, resolver: ConfigurationValueResolver, configuration: ICertificateConfiguration) {
        super(logger, client, resolver, configuration)

    }

    get TypeName(): string {
        return "Certificate";
    }

    protected async Create(index: number, configuration: ICertificateCreateConfiguration): Promise<void> {
    }
    protected async Import(index: number, configuration: ICertificateImportConfiguration): Promise<void> {
    }
    protected async Update(index: number, configuration: ICertificateUpdateConfiguration): Promise<void> {
    }
    protected async Delete(index: number, configuration: ICertificateDeleteConfiguration): Promise<void> {
    }
}
