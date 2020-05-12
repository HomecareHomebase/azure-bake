import { Logger } from "@azbake/core";

import { Secret, PropertyAttributes } from "../client/generated-client/models";

import { OperationBase } from ".";
import { ISecretCreateConfiguration, ISecretUpdateConfiguration, ISecretDeleteConfiguration, ISecretConfiguration } from "../configuration";
import { SecretClient } from "../client";
import { PropertyType } from "../propertyTypes";

export class SecretOperation extends OperationBase<ISecretCreateConfiguration, ISecretUpdateConfiguration, ISecretDeleteConfiguration> {

    private readonly _client: SecretClient;

    constructor(logger: Logger, client: SecretClient, configuration: ISecretConfiguration) {
        super(logger, configuration)

        this._client = client;
    }

    get TypeName(): string {
        return PropertyType.Secret;
    }

    protected async Create(index: number, configuration: ISecretCreateConfiguration): Promise<void> {

        // Exists
        const secret = await this._client.SearchSingle(configuration.name, configuration.selectors);
        if (!secret) {
            // Create
            this.LogOperationMessage(true, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), `Secret Not Found`);
            await this._createSecret(index, configuration);
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(secret.name, secret.id, secret.version), 'Secret Found');

        const updateConfiguration: ISecretUpdateConfiguration = {
            target: {
                name: configuration.name,
                selectors: configuration.selectors
            },
            name: configuration.name,
            value: configuration.value,
            selectors: configuration.selectors,
            contentType: configuration.contentType,
            activeDate: configuration.activeDate,
            expirationDate: configuration.expirationDate
        };

        await this._updateSecret(index, updateConfiguration, secret, 'Create');
    }

    protected async Update(index: number, configuration: ISecretUpdateConfiguration): Promise<void> {

        // Exists
        const secret = await this._client.SearchSingle(configuration.target.name, configuration.target.selectors);
        if (!secret) {
            this.LogOperationMessage(false, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'Secret Not Found');
            throw new Error(`The secret was not found`);
        }

        this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), `Secret Found`);

        // Update
        await this._updateSecret(index, configuration, secret, 'Update');
    }
    protected async Delete(index: number, configuration: ISecretDeleteConfiguration): Promise<void> {

        const secrets = await this._client.Search(configuration.operator, configuration.name, configuration.selectors);
        if (!secrets || secrets.length == 0) {
            this.LogOperationMessage(false, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'Secret Not Found');
            throw new Error(`The secret was not found`);
        }

        const message: string = secrets.length == 1 ? 'Secret Found' : `Multiple Secrets Found (${secrets.length})`;
        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), message);

        for (let index2 = 0; index2 < secrets.length; index2++) {

            const version: string = configuration.allVersions ? '' : secrets[index2].version || '';

            if (await this._client.Delete(secrets[index2].id || '', secrets[index2].name, version)) {
                this.LogOperationMessage(true, 'Delete', index, this.GetIdentifier(secrets[index2].name, secrets[index2].id, version), `Secret Delete Successful`);
                continue;
            }

            this.LogOperationMessage(false, 'Delete', index, this.GetIdentifier(secrets[index2].name, secrets[index2].id, version), 'Secret Delete Failed');
            throw new Error(`The secret failed to be delete`);
        }
    }

    private async _createSecret(index: number, configuration: ISecretCreateConfiguration): Promise<void> {

        const newSecret: Secret = {
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
        const createdSecret: Secret | null = await this._client.Create(newSecret);
        if (createdSecret) {
            this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(createdSecret.name, createdSecret.id, createdSecret.version), `Secret Create Successful`);
            return
        }

        this.LogOperationMessage(false, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), `Secret Create Failed`);
        throw new Error(`The secret failed to be created`);
    }
    private async _updateSecret(index: number, configuration: ISecretUpdateConfiguration, secret: Secret, operation: string): Promise<void> {

        // Exists, No updates
        if (this.StringEquals(configuration.name, secret.name) &&
            this.StringEquals(configuration.value, secret.value) &&
            this.StringEquals(configuration.contentType, secret.contentType) &&
            this.SelectorsEqual(configuration.selectors, secret.selectors) &&
            this.DatesEqual(configuration.activeDate, secret.attributes ? secret.attributes.notBefore : undefined) &&
            this.DatesEqual(configuration.expirationDate, secret.attributes ? secret.attributes.expires : undefined)) {

            this.LogOperationMessage(true, operation, index, this.GetIdentifier(secret.name, secret.id, secret.version), `Secrets Match`);
            return;
        }

        if (configuration.name) {
            secret.name = configuration.name;
        }
        if (configuration.value) {
            secret.value = configuration.value;
        }
        if (configuration.contentType) {
            secret.contentType = configuration.contentType;
        }
        if (configuration.selectors) {
            secret.selectors = configuration.selectors;
        }
        if (!secret.attributes) {
            secret.attributes = <PropertyAttributes>{}
        }
        if (configuration.activeDate) {
            secret.attributes.notBefore = configuration.activeDate;
        }
        if (configuration.expirationDate) {
            secret.attributes.expires = configuration.expirationDate;
        }

        // Update
        const updatedSecret: Secret | null = await this._client.Update(secret);
        if (updatedSecret) {
            this.LogOperationMessage(true, operation, index, this.GetIdentifier(updatedSecret.name, updatedSecret.id, updatedSecret.version), `Secret Update Successful`);
            return;
        }

        this.LogOperationMessage(false, operation, index, this.GetIdentifier(secret.name, secret.id, secret.version), `Secret Update Failed`);
        throw new Error(`The secret failed to be updated`);
    }
}
