import { Logger } from "@azbake/core"

import { Property, PropertyAttributes } from "../client/generated-client/models";

import { OperationBase } from ".";
import { IPropertyCreateConfiguration, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration, IPropertyConfiguration } from "../configuration";
import { PropertyClient } from "../client";
import { PropertyType } from "../propertyTypes";

export class PropertyOperation extends OperationBase<IPropertyCreateConfiguration, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration> {

    private readonly _client: PropertyClient;

    constructor(logger: Logger, client: PropertyClient, configuration: IPropertyConfiguration) {
        super(logger, configuration)

        this._client = client;
    }

    get TypeName(): string {
        return PropertyType.Property;
    }

    protected async Create(index: number, configuration: IPropertyCreateConfiguration): Promise<void> {
        // Exists
        const property = await this._client.SearchSingle(configuration.name, configuration.selectors);
        if (!property) {
            // Create
            this.LogOperationMessage(true, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), `Property Not Found`);
            await this._createProperty(index, configuration);
            return;
        }

        // Update
        this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(property.name, property.id), 'Property Found');

        const updateConfiguration: IPropertyUpdateConfiguration = {
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

        await this._updateProperty(index, updateConfiguration, property, 'Create');
    }

    protected async Update(index: number, configuration: IPropertyUpdateConfiguration): Promise<void> {
        // Exists
        const property = await this._client.SearchSingle(configuration.target.name, configuration.target.selectors);
        if (!property) {
            this.LogOperationMessage(false, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'Property Not Found');
            throw new Error(`The property was not found`);
        }

        this.LogOperationMessage(true, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), `Property Found`);

        // Update
        await this._updateProperty(index, configuration, property, 'Update');
    }

    protected async Delete(index: number, configuration: IPropertyDeleteConfiguration): Promise<void> {

        const properties = await this._client.Search(configuration.operator, configuration.name, configuration.selectors);
        if (!properties || properties.length == 0) {
            this.LogOperationMessage(false, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'Property Not Found');
            throw new Error(`The property was not found`);
        }

        const message: string = properties.length == 1 ? 'Property Found' : `Multiple Properties Found (${properties.length})`;
        this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), message);

        for (let index2 = 0; index2 < properties.length; index2++) {
            if (await this._client.Delete(properties[index2].id || "", properties[index2].name)) {
                this.LogOperationMessage(true, 'Delete', index, this.GetIdentifier(properties[index2].name, properties[index2].id), `Property Delete Successful`);
                continue;
            }

            this.LogOperationMessage(false, 'Delete', index, this.GetIdentifier(properties[index2].name, properties[index2].id), 'Property Delete Failed');
            throw new Error(`The property failed to be delete.`);
        }
    }

    private async _createProperty(index: number, configuration: IPropertyCreateConfiguration): Promise<void> {

        const newProperty: Property = {
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
        const createdProperty: Property | null = await this._client.Create(newProperty);
        if (createdProperty) {
            this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(createdProperty.name, createdProperty.id), `Property Create Successful`);
            return
        }

        this.LogOperationMessage(false, 'Create', index, this.GetConfiguration(name, configuration.selectors), `Property Create Failed`);
        throw new Error(`The property failed to be created`);
    }

    private async _updateProperty(index: number, configuration: IPropertyUpdateConfiguration, property: Property, operation: string): Promise<void> {

        // Exists, No updates
        if (this.StringEquals(configuration.name, property.name) &&
            this.StringEquals(configuration.value, property.value) &&
            this.StringEquals(configuration.contentType, property.contentType) &&
            this.SelectorsEqual(configuration.selectors, property.selectors) &&
            this.DatesEqual(configuration.activeDate, property.attributes ? property.attributes.notBefore : undefined) &&
            this.DatesEqual(configuration.expirationDate, property.attributes ? property.attributes.expires : undefined)) {

            this.LogOperationMessage(true, operation, index, this.GetIdentifier(property.name, property.id), `Properties Match`);
            return;
        }

        if (configuration.name) {
            property.name = configuration.name;
        }
        if (configuration.value) {
            property.value = configuration.value;
        }
        if (configuration.contentType) {
            property.contentType = configuration.contentType;
        }
        if (configuration.selectors) {
            property.selectors = configuration.selectors;
        }
        if (!property.attributes) {
            property.attributes = <PropertyAttributes>{}
        }
        if (configuration.activeDate) {
            property.attributes.notBefore = configuration.activeDate;
        }
        if (configuration.expirationDate) {
            property.attributes.expires = configuration.expirationDate;
        }

        // Update
        const updatedProperty: Property | null = await this._client.Update(property);
        if (updatedProperty) {
            this.LogOperationMessage(true, operation, index, this.GetIdentifier(updatedProperty.name, updatedProperty.id), `Property Update Successful`);
            return;
        }

        this.LogOperationMessage(false, operation, index, this.GetIdentifier(property.name, property.id), `Property Updated Failed`);
        throw new Error(`The property failed to be updated`);
    }
}