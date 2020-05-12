// import { BaseUtility, DeploymentContext, Logger } from "@azbake/core"

// import { PropertyTypes } from "./models/propertytypes";

// import { Property, Secret, EncryptionKey, Certificate } from "./client/generated-client/models"

// import { ClientFactory, ClientBase, ClientCryptoBase } from "./client"
// import { SearchOperator, PropertyIdentifier, SecretIdentifier, EncryptionKeyIdentifier, CertificateIdentifier, EncryptionAlgorithm } from "./models"

// export class PropertyServiceClientUtils extends BaseUtility {

//     private _clientFactory: ClientFactory | null = null;

//     constructor(ctx: DeploymentContext) {
//         super(ctx)
//     }

//     public async getPropertyIdentifier(name: string, selectors: { [key: string]: string } | undefined): Promise<PropertyIdentifier> {
//         const model: Property = await this.getProperty(name, selectors);
//         return new PropertyIdentifier(model.name, model.id || '');
//     }
//     public async getSecretIdentifier(name: string, selectors: { [key: string]: string } | undefined): Promise<SecretIdentifier> {
//         const model: Secret = await this.getSecret(name, selectors);
//         return new SecretIdentifier(model.name, model.id || '', model.version || '');
//     }
//     public async getEncryptionKeyIdentifier(name: string, selectors: { [key: string]: string } | undefined): Promise<EncryptionKeyIdentifier> {
//         const model: EncryptionKey = await this.getEncryptionKey(name, selectors);
//         return new EncryptionKeyIdentifier(model.name, model.id || '', model.version || '');
//     }
//     public async getCertificateIdentifier(name: string, selectors: { [key: string]: string } | undefined): Promise<CertificateIdentifier> {
//         const model: Certificate = await this.getCertificate(name, selectors);
//         return new CertificateIdentifier(model.name, model.id || '', model.version || '');
//     }

//     public async getPropertyValue(name: string, selectors: { [key: string]: string } | undefined): Promise<string> {
//         return (await this.getProperty(name, selectors)).value;
//     }
//     public async getSecretValue(name: string, selectors: { [key: string]: string } | undefined): Promise<string> {
//         return (await this.getSecret(name, selectors)).value;
//     }
//     public async getEncryptionKeyValue(name: string, selectors: { [key: string]: string } | undefined): Promise<JsonWebKey> {
//         return (await this.getEncryptionKey(name, selectors)).value;
//     }
//     public async getCertificateValue(name: string, selectors: { [key: string]: string } | undefined): Promise<Certificate> {
//         return (await this.getCertificate(name, selectors)).value;
//     }

//     public async getProperty(name: string, selectors: { [key: string]: string } | undefined): Promise<Property> {
//         return await this._getImpl(PropertyTypes.Property, name, selectors);
//     }
//     public async getSecret(name: string, selectors: { [key: string]: string } | undefined): Promise<Secret> {
//         return await this._getImpl(PropertyTypes.Secret, name, selectors);
//     }
//     public async getEncryptionKey(name: string, selectors: { [key: string]: string } | undefined): Promise<EncryptionKey> {
//         return await this._getImpl(PropertyTypes.EncryptionKey, name, selectors);
//     }
//     public async getCertificate(name: string, selectors: { [key: string]: string } | undefined): Promise<Certificate> {
//         return await this._getImpl(PropertyTypes.Certificate, name, selectors);
//     }

//     public async searchProperties(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator = SearchOperator.Equals): Promise<Array<Property> | Property> {
//         return await this._searchImpl(PropertyTypes.Property, name, selectors, operator);
//     }
//     public async searchSecrets(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator = SearchOperator.Equals): Promise<Array<Secret> | Secret> {
//         return await this._searchImpl(PropertyTypes.Secret, name, selectors, operator);
//     }
//     public async searchEncryptionKeys(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator = SearchOperator.Equals): Promise<Array<EncryptionKey> | EncryptionKey> {
//         return await this._searchImpl(PropertyTypes.EncryptionKey, name, selectors, operator);
//     }
//     public async searchCertificates(name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator = SearchOperator.Equals): Promise<Array<Certificate> | Certificate> {
//         return await this._searchImpl(PropertyTypes.Certificate, name, selectors, operator);
//     }



//     public async encryptionKeyEncrypt(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array> {
//         return await this._encryptImpl(PropertyTypes.EncryptionKey, id, name, version, algorithm, value);
//     }
//     public async encryptionKeyDecrypt(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array> {
//         return await this._decryptImpl(PropertyTypes.EncryptionKey, id, name, version, algorithm, value);
//     }


//     public parseRSAKey(): JsonWebKey | null {
//         return null;
//     }


//     private async _getImpl<TModel>(type: PropertyTypes, name: string, selectors: { [key: string]: string } | undefined): Promise<TModel> {

//         let client: ClientBase<TModel> = await this.GetClient(type);
//         const model: TModel | null = await client.SearchSingle(name, selectors);

//         if (!model) {
//             return Promise.reject(`The ${type.toLowerCase()} was not found`);
//         }

//         return model;
//     }
//     private async _searchImpl<TModel>(type: PropertyTypes, name: string, selectors: { [key: string]: string } | undefined, operator: SearchOperator): Promise<Array<TModel> | TModel> {

//         let client: ClientBase<TModel> = await this.GetClient(type);
//         let foundModels: TModel[] | null = await client.Search(operator, name, selectors)

//         if (!foundModels || foundModels.length == 0) {
//             return Promise.reject(`The ${type.toLowerCase()} was not found`);
//         }

//         if (foundModels.length == 1) {
//             return foundModels[0];
//         }

//         return foundModels;
//     }

//     private async _encryptImpl<TModel>(type: PropertyTypes, id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {

//         let client: ClientBase<TModel> = this._clientFactory.CreateClient(type);
//         let cryptoClient: ClientCryptoBase<TModel> = client as ClientCryptoBase<TModel>;
//         if (!cryptoClient) {
//             throw new Error('The type does not support encrypt.')
//         }

//         return await cryptoClient.Encrypt(id, name, version, algorithm, value);
//     }
//     private async _decryptImpl<TModel>(type: PropertyTypes, id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {

//         let client: ClientBase<TModel> = this._clientFactory.CreateClient(type);
//         let cryptoClient: ClientCryptoBase<TModel> = client as ClientCryptoBase<TModel>;
//         if (!cryptoClient) {
//             throw new Error('The type does not support encrypt.')
//         }

//         return await cryptoClient.Decrypt(id, name, version, algorithm, value);
//     }

//     private async GetClient<TModel>(type: PropertyTypes): Promise<ClientBase<TModel>> {
//         const factory: ClientFactory = await this.GetOrCreateClientFactory();
//         return await factory.CreateClient(type);
//     }
//     private async GetOrCreateClientFactory(): Promise<ClientFactory> {
//         if (this._clientFactory == null) {
//             if (!this.context.CustomAuthToken) {
//                 return Promise.reject('The deployment contexts CustomAuthToken is null');
//             }

//             const baseUrl: string = await this.context.Ingredient.properties.source.valueAsync(this.context);
//             if (!baseUrl) {
//                 return Promise.reject('The baseUrl is not found in the ingredients properties.source. Please verify that the properties.source is set to the property services baseUrl in your yaml file.');
//             }

//             const clientFactory = new ClientFactory(this.context.Logger, baseUrl, this.context.CustomAuthToken);

//             if (!this._clientFactory) {
//                 this._clientFactory = clientFactory;
//             }
//         }

//         return this._clientFactory;
//     }
// }
