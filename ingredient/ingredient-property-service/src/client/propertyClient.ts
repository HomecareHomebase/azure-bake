import { Logger } from '@azbake/core'

import { Property } from './generated-client/models/index'

import { SearchOperator } from '../models';
import { PropertyType } from '../propertyTypes';
import { ClientBase } from './clientBase';

export class PropertyClient extends ClientBase<Property> {

    public constructor(logger: Logger, baseUrl: string, accessToken: string) {
        super(logger, baseUrl, accessToken);
    }

    public async Search(operator: SearchOperator, name: string, selectors: { [key: string]: string; } | undefined): Promise<Property[] | null> {

        let searchOperation = await this._client.propertyOperations.search(this.GetSearchName(name, selectors), operator)
        if (searchOperation && searchOperation._response.status == 200) {
            let p: Property[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this.LogClientError(PropertyType.Property, 'search', searchOperation._response.status, searchOperation._response.bodyAsText);
        }

        return null;
    }
    public async Create(model: Property): Promise<Property | null> {
        let createOperation = await this._client.propertyOperations.create(model)

        if (createOperation._response.status == 200) {
            let p: Property = createOperation._response.parsedBody;
            return p;
        }

        this.LogClientError(PropertyType.Property, 'create', createOperation._response.status, createOperation._response.bodyAsText);
        return null;
    }
    public async Update(model: Property): Promise<Property | null> {

        let updateOperation = await this._client.propertyOperations.update(model)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: Property = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this.LogClientError(PropertyType.Property, 'update', updateOperation._response.status, updateOperation._response.bodyAsText);
        }

        return null;
    }
    public async Delete(id: string, name: string, version: string | null = null): Promise<boolean> {
        let deleteOperation = await this._client.propertyOperations.deleteMethod(id, name)

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this.LogClientError(PropertyType.Property, 'delete', deleteOperation._response.status, deleteOperation._response.bodyAsText);
        return false;
    }
};