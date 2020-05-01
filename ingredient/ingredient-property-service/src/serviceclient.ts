import { Logger } from '@azbake/core'

import { loginWithServicePrincipalSecret, AzureTokenCredentialsOptions, ApplicationTokenCredentials } from '@azure/ms-rest-nodeauth';

import { HCHBServicesPropertyServiceAPIv1 } from './client/hCHBServicesPropertyServiceAPIv1'
import {
    HCHBServicesPropertyServiceAPIv1Options, PropertyOperationsSearchOptionalParams,
    Property, Secret, EncryptionKey, Certificate,
    SecretOperationsSearchOptionalParams, EncryptionKeyOperationsSearchOptionalParams, CertificateOperationsSearchOptionalParams
} from './client/models/index'

import { SearchOperator } from './models';

export class PropertyServiceClient {

    private readonly _logger: Logger;
    private _client: HCHBServicesPropertyServiceAPIv1;

    public constructor(logger: Logger, baseUrl: string, credentials: ApplicationTokenCredentials) {

        if (!logger) {
            throw new Error('The logger is null.')
        }
        if (!baseUrl) {
            throw new Error('The baseUrl is null.')
        }
        if (!credentials) {
            throw new Error('The credentials is null.')
        }

        this._logger = logger;

        let options: HCHBServicesPropertyServiceAPIv1Options = <HCHBServicesPropertyServiceAPIv1Options>{
            baseUri: baseUrl,
            userAgent: 'azbake-ingredient-property-service/1.0',
        };

        this._client = new HCHBServicesPropertyServiceAPIv1(credentials, options);
    }

    public async SearchSingleProperty(name: string, selectors: { [key: string]: string } | undefined): Promise<Property | null> {

        if (!name) {
            throw new Error('name is null.')
        }

        let properties: Property[] | null = await this.SearchProperties(SearchOperator.Equals, name, selectors);
        if (properties && properties.length == 1) {
            return properties[0];
        }

        return null;
    }
    public async SearchSingleSecret(name: string, selectors: { [key: string]: string } | undefined): Promise<Secret | null> {

        if (!name) {
            throw new Error('name is null.')
        }

        let secrets: Secret[] | null = await this.SearchSecrets(SearchOperator.Equals, name, selectors);
        if (secrets && secrets.length == 1) {
            return secrets[0];
        }

        return null;
    }
    public async SearchSingleEncryptionKey(name: string, selectors: { [key: string]: string } | undefined): Promise<EncryptionKey | null> {

        if (!name) {
            throw new Error('name is null.')
        }

        let encryptionKeys: EncryptionKey[] | null = await this.SearchEncryptionKeys(SearchOperator.Equals, name, selectors);
        if (encryptionKeys && encryptionKeys.length == 1) {
            return encryptionKeys[0];
        }

        return null;
    }
    public async SearchSingleCertificate(name: string, selectors: { [key: string]: string } | undefined): Promise<Certificate | null> {

        if (!name) {
            throw new Error('name is null.')
        }

        let certificates: Certificate[] | null = await this.SearchCertificates(SearchOperator.Equals, name, selectors);
        if (certificates && certificates.length == 1) {
            return certificates[0];
        }

        return null;
    }

    public async SearchProperties(operator: SearchOperator, name: string, selectors: { [key: string]: string } | undefined): Promise<Property[] | null> {

        if (!operator) {
            throw new Error('operator is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let searchParameters: PropertyOperationsSearchOptionalParams = this.BuildPropertySearch(name, selectors);
        let searchOperator = this.GetSearchOperatorNumber(operator);

        let searchOperation = await this._client.propertyOperations.search(searchOperator, searchParameters)

        if (searchOperation && searchOperation._response.status == 200) {
            let p: Property[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking property search. Status: ' + searchOperation._response.status)
        }

        return null;
    }
    public async SearchSecrets(operator: SearchOperator, name: string, selectors: { [key: string]: string } | undefined): Promise<Secret[] | null> {

        if (!operator) {
            throw new Error('operator is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let searchParameters: SecretOperationsSearchOptionalParams = this.BuildSecretSearch(name, selectors);
        let searchOperator = this.GetSearchOperatorNumber(operator);

        let searchOperation = await this._client.secretOperations.search(searchOperator, searchParameters)

        if (searchOperation && searchOperation._response.status == 200) {
            let p: Secret[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking secret search. Status: ' + searchOperation._response.status)
        }

        return null;
    }
    public async SearchEncryptionKeys(operator: SearchOperator, name: string, selectors: { [key: string]: string } | undefined): Promise<EncryptionKey[] | null> {

        if (!operator) {
            throw new Error('operator is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let searchParameters: EncryptionKeyOperationsSearchOptionalParams = this.BuildEncryptionKeySearch(name, selectors);
        let searchOperator = this.GetSearchOperatorNumber(operator);

        let searchOperation = await this._client.encryptionKeyOperations.search(searchOperator, searchParameters)

        if (searchOperation && searchOperation._response.status == 200) {
            let p: EncryptionKey[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking encryptionkey search. Status: ' + searchOperation._response.status)
        }

        return null;
    }
    public async SearchCertificates(operator: SearchOperator, name: string, selectors: { [key: string]: string } | undefined): Promise<Certificate[] | null> {

        if (!operator) {
            throw new Error('operator is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let searchParameters: CertificateOperationsSearchOptionalParams = this.BuildCertificateSearch(name, selectors);
        let searchOperator = this.GetSearchOperatorNumber(operator);

        let searchOperation = await this._client.certificateOperations.search(searchOperator, searchParameters)

        if (searchOperation && searchOperation._response.status == 200) {
            let p: Certificate[] = searchOperation._response.parsedBody;
            return p;
        }

        if (searchOperation && searchOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking certificate search. Status: ' + searchOperation._response.status)
        }

        return null;
    }

    public async UpdateProperty(property: Property): Promise<Property | null> {

        if (!property) {
            throw new Error('property is null.')
        }

        let updateOperation = await this._client.propertyOperations.update(property)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: Property = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking property update. Status: ' + updateOperation._response.status)
        }

        return null;
    }
    public async UpdateSecret(secret: Secret): Promise<Secret | null> {

        if (!secret) {
            throw new Error('secret is null.')
        }

        let updateOperation = await this._client.secretOperations.update(secret)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: Secret = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking secret update. Status: ' + updateOperation._response.status)
        }

        return null;
    }
    public async UpdateEncryptionKey(encryptionKey: EncryptionKey): Promise<EncryptionKey | null> {

        if (!encryptionKey) {
            throw new Error('encryptionKey is null.')
        }

        let updateOperation = await this._client.encryptionKeyOperations.update(encryptionKey)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: EncryptionKey = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking encryptionKey update. Status: ' + updateOperation._response.status)
        }

        return null;
    }
    public async UpdateCertificate(certificate: Certificate): Promise<Certificate | null> {

        if (!certificate) {
            throw new Error('certificate is null.')
        }

        let updateOperation = await this._client.certificateOperations.update(certificate)

        if (updateOperation && updateOperation._response.status == 200) {
            let p: Certificate = updateOperation._response.parsedBody;
            return p;
        }

        if (updateOperation && updateOperation._response.status != 404) {
            this._logger.error('An error occurred while invoking certificate update. Status: ' + updateOperation._response.status)
        }

        return null;
    }

    public async CreateProperty(property: Property): Promise<Property | null> {

        if (!property) {
            throw new Error('secret is null.')
        }

        let createOperation = await this._client.propertyOperations.create(property)

        if (createOperation._response.status == 200) {
            let p: Property = createOperation._response.parsedBody;
            return p;
        }

        this._logger.error('An error occurred while invoking property create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
        return null;
    }
    public async CreateSecret(secret: Secret): Promise<Secret | null> {

        if (!secret) {
            throw new Error('secret is null.')
        }

        let createOperation = await this._client.secretOperations.create(secret)

        if (createOperation._response.status == 200) {
            let p: Secret = createOperation._response.parsedBody;
            return p;
        }

        this._logger.error('An error occurred while invoking secret create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
        return null;
    }
    public async CreateEncryptionKey(encryptionKey: EncryptionKey): Promise<EncryptionKey | null> {

        if (!encryptionKey) {
            throw new Error('encryptionKey is null.')
        }

        let createOperation = await this._client.encryptionKeyOperations.create(encryptionKey)

        if (createOperation._response.status == 200) {
            let p: EncryptionKey = createOperation._response.parsedBody;
            return p;
        }

        this._logger.error('An error occurred while invoking encryptionkey create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
        return null;
    }
    public async CreateCertificate(certificate: Certificate): Promise<Certificate | null> {

        if (!certificate) {
            throw new Error('certificate is null.')
        }

        let createOperation = await this._client.certificateOperations.create(certificate)

        if (createOperation._response.status == 200) {
            let p: Certificate = createOperation._response.parsedBody;
            return p;
        }

        this._logger.error('An error occurred while invoking certificate create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
        return null;
    }

    public async DeleteProperty(id: string, name: string): Promise<boolean> {

        if (!id) {
            throw new Error('id is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let deleteOperation = await this._client.propertyOperations.deleteMethod(id, name)

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this._logger.error('An error occurred while invoking property delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
        return false;
    }
    public async DeleteSecret(id: string, name: string, version: string = ''): Promise<boolean> {

        if (!id) {
            throw new Error('id is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let deleteOperation = await this._client.secretOperations.deleteMethod(version, id, name);

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this._logger.error('An error occurred while invoking secret delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
        return false;
    }
    public async DeleteEncryptionKey(id: string, name: string, version: string = ''): Promise<boolean> {

        if (!id) {
            throw new Error('id is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let deleteOperation = await this._client.encryptionKeyOperations.deleteMethod(version, id, name);

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this._logger.error('An error occurred while invoking encryptionkey delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
        return false;
    }
    public async DeleteCertificate(id: string, name: string, version: string = ''): Promise<boolean> {

        if (!id) {
            throw new Error('id is null.')
        }
        if (!name) {
            throw new Error('name is null.')
        }

        let deleteOperation = await this._client.certificateOperations.deleteMethod(version, id, name);

        if (deleteOperation._response.status == 200) {
            return true;
        }

        this._logger.error('An error occurred while invoking certificate delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
        return false;
    }

    private BuildPropertySearch(name: string, selectors: { [key: string]: string } | undefined): PropertyOperationsSearchOptionalParams {

        let selectorString: string = this.BuildSelectorValue(selectors);
        if (selectorString) {
            selectorString = "&" + selectorString
        }

        let search: PropertyOperationsSearchOptionalParams = {
            name: name + selectorString,
        };

        return search;
    }
    private BuildSecretSearch(name: string, selectors: { [key: string]: string } | undefined): SecretOperationsSearchOptionalParams {

        let selectorString: string = this.BuildSelectorValue(selectors);
        if (selectorString) {
            selectorString = "&" + selectorString
        }

        let search: SecretOperationsSearchOptionalParams = {
            name: name + selectorString,
        };

        return search;
    }
    private BuildEncryptionKeySearch(name: string, selectors: { [key: string]: string } | undefined): EncryptionKeyOperationsSearchOptionalParams {

        let selectorString: string = this.BuildSelectorValue(selectors);
        if (selectorString) {
            selectorString = "&" + selectorString
        }

        let search: EncryptionKeyOperationsSearchOptionalParams = {
            name: name + selectorString,
        };

        return search;
    }
    private BuildCertificateSearch(name: string, selectors: { [key: string]: string } | undefined): CertificateOperationsSearchOptionalParams {

        let selectorString: string = this.BuildSelectorValue(selectors);
        if (selectorString) {
            selectorString = "&" + selectorString
        }

        let search: CertificateOperationsSearchOptionalParams = {
            name: name + selectorString,
        };

        return search;
    }
    private BuildSelectorValue(selectors: { [key: string]: string } | undefined): string {

        if (!selectors) {
            return "";
        }

        return Object.keys(selectors)
            .map((k) => `selectors[${k}]=${selectors[k]}`)
            .join('&');
    }
    private GetSearchOperatorNumber(value: SearchOperator): number {
        // HACK: How do enums work in YAML?
        if (value == SearchOperator.Equals || value.toString() == "Equals") {
            return 2;
        }

        if (value == SearchOperator.Contains || value.toString() == "Contains") {
            return 1;
        }

        // None
        return 0;
    }

};

export class PropertyServiceClientAuthenticator {
    private readonly _logger: Logger;

    constructor(logger: Logger) {

        if (!logger) {
            throw new Error('logger is null.')
        }

        this._logger = logger;
    }

    public async Authenticate(): Promise<ApplicationTokenCredentials> {

        // TODO: pull these out.
        const clientId = "";
        const clientSecret = "";
        const domain = "";
        const resource = "";

        const tokenOptions: AzureTokenCredentialsOptions = <AzureTokenCredentialsOptions>{
            tokenAudience: resource
        };

        let credentials: ApplicationTokenCredentials = await loginWithServicePrincipalSecret(clientId, clientSecret, domain, tokenOptions).catch((err) => {
            this._logger.error('Authentication to Azure AD failed: ' + err);
            throw err;
        });

        this._logger.log('Authentication to Azure AD was successful');

        return credentials;
    }
}