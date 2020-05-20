import { Logger } from '@azbake/core'

import { Secret } from './generated-client/models/index'

import { SearchOperator } from '../models';
import { PropertyType } from '../propertyTypes';
import { ClientBase } from './clientBase';

export class SecretClient extends ClientBase<Secret> {

    public constructor(logger: Logger, baseUrl: string, accessToken: string) {
        super(logger, baseUrl, accessToken);
    }

    public async Search(operator: SearchOperator, name: string, selectors: { [key: string]: string; } | undefined): Promise<Secret[] | null> {

        let searchOperation = await this._client.secretOperations.search(this.GetSearchName(name, selectors), operator)
        if (searchOperation && searchOperation._response.status == 200) {
            let p: Secret[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this.LogClientError(PropertyType.Secret, 'search', searchOperation._response.status, searchOperation._response.bodyAsText);
        }

        return null;
    }
    public async Create(model: Secret): Promise<Secret | null> {
        let createOperation = await this._client.secretOperations.create(model)

        if (createOperation._response.status == 200) {
            let p: Secret = createOperation._response.parsedBody;
            return p;
        }

        this.LogClientError(PropertyType.Secret, 'create', createOperation._response.status, createOperation._response.bodyAsText);
        return null;
    }
    public async Update(model: Secret): Promise<Secret | null> {
        let updateOperation = await this._client.secretOperations.update(model)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: Secret = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this.LogClientError(PropertyType.Secret, 'update', updateOperation._response.status, updateOperation._response.bodyAsText);
        }

        return null;
    }
    public async Delete(id: string, name: string, version: string | null): Promise<boolean> {
        if (!version) {
            version = ''
        }

        let deleteOperation = await this._client.secretOperations.deleteMethod(version, id, name);

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this.LogClientError(PropertyType.Secret, 'delete', deleteOperation._response.status, deleteOperation._response.bodyAsText);
        return false;
    }
};
