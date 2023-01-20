import { Logger } from '@azbake/core'

import { ServiceClientCredentials, WebResource } from '@azure/ms-rest-js';

import { HCHBServicesPropertyServiceAPIv1 } from './generated-client/hCHBServicesPropertyServiceAPIv1'
import { HCHBServicesPropertyServiceAPIv1Options } from './generated-client/models/index'

import { SearchOperator } from '../models';

export abstract class ClientBase<TModel>
{
    protected readonly _logger: Logger;
    protected _client: HCHBServicesPropertyServiceAPIv1;

    protected constructor(logger: Logger, baseUrl: string, accessToken: string) {
        this._logger = logger;

        let credentials: ServiceClientCredentials = {
            signRequest(webResource: WebResource): Promise<WebResource> {
                webResource.headers.set('authorization', `Bearer ${accessToken}`);
                return Promise.resolve(webResource);
            }
        };

        let options: HCHBServicesPropertyServiceAPIv1Options = <HCHBServicesPropertyServiceAPIv1Options>{
            baseUri: baseUrl,
            userAgent: 'azbake-ingredient-property-service/1.0',
        };

        this._client = new HCHBServicesPropertyServiceAPIv1(credentials, options);
    }

    public abstract Search(operator: SearchOperator, name: string, selectors: { [key: string]: string } | undefined): Promise<TModel[] | null>;
    public abstract Create(model: TModel): Promise<TModel | null>;
    public abstract Update(model: TModel): Promise<TModel | null>;
    public abstract Delete(id: string, name: string, version: string | null): Promise<boolean>;

    public async SearchSingle(name: string, selectors: { [key: string]: string } | undefined): Promise<TModel | null> {
        let models: TModel[] | null = await this.Search(SearchOperator.Equals, name, selectors);
        if (models && models.length == 1) {
            return models[0];
        }

        return null;
    }

    protected GetSearchName(name: string, selectors: { [key: string]: string } | undefined): string {
        if (!selectors) {
            return name;
        }

        return name + '&' + Object.keys(selectors)
            .map((k) => `selectors[${k}]=${selectors[k]}`)
            .join('&');
    }

    protected LogClientError(type: string, operation: string, status: any, body: any): void {
        this._logger.error(`An error occurred while invoking ${type} ${operation}. Status [${status}] Body [${body}].`)
    }
};