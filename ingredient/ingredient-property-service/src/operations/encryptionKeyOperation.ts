// import { Logger } from "@azbake/core"

// import { OperationBase } from ".";
// import { IEncryptionKeyCreateConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration, IEncryptionKeyConfiguration } from "../configuration";
// import { EncryptionKeyClient } from "../client";
// import { EncryptionKey, JsonWebKey, PropertyAttributes } from "../client/generated-client/models";
// import { KeyOperations, KeyType, EllipticCurveType } from "../models";
// import { Utils } from "../utils";

// export class EncryptionKeyOperation extends OperationBase<IEncryptionKeyCreateConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration> {

//     private readonly _client: EncryptionKeyClient;

//     constructor(logger: Logger, client: EncryptionKeyClient, configuration: IEncryptionKeyConfiguration) {
//         super(logger, configuration)
//         this._client = client;
//     }

//     get TypeName(): string {
//         return 'EncryptionKey';
//     }

//     protected async Create(index: number, configuration: IEncryptionKeyCreateConfiguration): Promise<void> {

//         // Exists
//         let encryptionKey = await this._client.SearchSingle(configuration.name, configuration.selectors);
//         if (!encryptionKey) {
//             // Create
//             await this._createEncryptionKey(index, configuration);
//             return;
//         }

//         // Update
//         this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(encryptionKey.name, encryptionKey.id, encryptionKey.version), 'The encryptionkey already exists.');

//         await this._updateEncryptionKey(index, configuration, encryptionKey, 'Create');
//     }

//     private GetJsonWebKeyFromConfiguration(configuration: IEncryptionKeyCreateConfiguration): JsonWebKey {

//         let webKey: JsonWebKey = {
//             kty: this.GetKeyType(configuration.keyType),
//             keyOps: this.GetKeyOperations(configuration.keyOperations),
//             crv: this.GetEllipticCurveType(configuration.ellipticCurveType)
//         };

//         if (configuration.value) {
//             webKey.e = Utils.Base64Decode(configuration.value.e);
//             webKey.n = Utils.Base64Decode(configuration.value.n);
//             webKey.d = Utils.Base64Decode(configuration.value.d);
//             webKey.dp = Utils.Base64Decode(configuration.value.dp);
//             webKey.dq = Utils.Base64Decode(configuration.value.dq);
//             webKey.qi = Utils.Base64Decode(configuration.value.qi);
//             webKey.p = Utils.Base64Decode(configuration.value.p);
//             webKey.q = Utils.Base64Decode(configuration.value.q);
//             webKey.k = Utils.Base64Decode(configuration.value.k);
//             webKey.x = Utils.Base64Decode(configuration.value.x);
//             webKey.y = Utils.Base64Decode(configuration.value.y);
//         }

//         return webKey;
//     }



//     private GetEllipticCurveType(ellipticCurveType: EllipticCurveType | undefined): string | undefined {

//         if (!ellipticCurveType) {
//             return undefined;
//         }

//         if (ellipticCurveType == EllipticCurveType.P256 || ellipticCurveType.toString() == "P256") {
//             return "P-256";
//         }

//         if (ellipticCurveType == EllipticCurveType.P256K || ellipticCurveType.toString() == "P256K") {
//             return "P-256K";
//         }

//         if (ellipticCurveType == EllipticCurveType.P384 || ellipticCurveType.toString() == "P384") {
//             return "P-384";
//         }

//         return "P-521";
//     }

//     private GetKeyType(keyType: KeyType): string {

//         if (keyType == KeyType.Rsa || keyType.toString() == "Rsa") {
//             return "RSA";
//         }

//         return "EC";
//     }
//     private GetKeyOperations(keyOperations: KeyOperations[]): string[] {

//         const values: string[] = [];

//         for (let op of keyOperations) {

//             const opString: string = op.toString();

//             if (op == KeyOperations.All || opString == 'All') {
//                 return ['encrypt', 'decrypt', 'sign', 'verify', 'wrapKey', 'unwrapKey'];
//             }

//             if (op == KeyOperations.Encrypt || opString == 'Encrypt') {
//                 values.push('encrypt');
//             }
//             else if (op == KeyOperations.Decrypt || opString == 'Decrypt') {
//                 values.push('decrypt');
//             }
//             else if (op == KeyOperations.Sign || opString == 'Sign') {
//                 values.push('sign');
//             }
//             else if (op == KeyOperations.Verify || opString == 'Verify') {
//                 values.push('verify');
//             }
//             else if (op == KeyOperations.Wrap || opString == 'Wrap') {
//                 values.push('wrapKey');
//             }
//             else if (op == KeyOperations.Unwrap || opString == 'Unwrap') {
//                 values.push('unwrapKey');
//             }
//             else {
//                 throw new Error('The keyOperation is invalid.');
//             }
//         }

//         return values;
//     }

//     protected async Update(index: number, configuration: IEncryptionKeyUpdateConfiguration): Promise<void> {

//         // Exists
//         let encryptionKey = await this._client.SearchSingle(configuration.target.name, configuration.target.selectors);
//         if (!encryptionKey) {
//             this.LogOperationMessage(false, 'Update', index, this.GetConfiguration(configuration.target.name, configuration.target.selectors), 'The specified encryptionkey was not found.');
//             return;
//         }

//         // Update
//         await this._updateEncryptionKey(index, configuration, encryptionKey, 'Update');

//     }
//     protected async Delete(index: number, configuration: IEncryptionKeyDeleteConfiguration): Promise<void> {

//         let encryptionKeys = await this._client.Search(configuration.operator, configuration.name, configuration.selectors);
//         if (!encryptionKeys || encryptionKeys.length == 0) {
//             this.LogOperationMessage(false, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), 'The specified encryptionkey was not found.');
//             return;
//         }

//         this.LogOperationMessage(true, 'Delete', index, this.GetConfiguration(configuration.name, configuration.selectors, configuration.operator), `Found ${encryptionKeys.length} encryptionkeys`);

//         for (let index2 = 0; index2 < encryptionKeys.length; index2++) {

//             let version: string = encryptionKeys[index2].version || '';
//             if (configuration.allVersions) {
//                 version = '';
//             }

//             if (await this._client.Delete(encryptionKeys[index2].id || '', encryptionKeys[index2].name, version)) {
//                 this.LogOperationMessage(true, 'Delete', index, this.GetIdentifier(encryptionKeys[index2].name, encryptionKeys[index2].id, version), `The encryptionkey was successfully deleted.`);
//                 continue;
//             }

//             this.LogOperationMessage(false, 'Delete', index, this.GetIdentifier(encryptionKeys[index2].name, encryptionKeys[index2].id, version), 'The specified encryptionkey failed to delete.');
//         }
//     }


//     private async _createEncryptionKey(index: number, configuration: IEncryptionKeyCreateConfiguration): Promise<void> {

//         let newEncryptionKey: EncryptionKey = {
//             name: configuration.name,
//             selectors: configuration.selectors,
//             attributes: {
//                 notBefore: configuration.activeDate,
//                 expires: configuration.expirationDate
//             },
//             keySize: configuration.keySize,
//             value: this.GetJsonWebKeyFromConfiguration(configuration)
//         };

//         // Create
//         let createdEncryptionKey: EncryptionKey | null = await this._client.Create(newEncryptionKey);
//         if (createdEncryptionKey) {
//             this.LogOperationMessage(true, 'Create', index, this.GetIdentifier(createdEncryptionKey.name, createdEncryptionKey.id, createdEncryptionKey.version), `The encryptionkey was successfully created.`);
//             return
//         }

//         this.LogOperationMessage(false, 'Create', index, this.GetConfiguration(configuration.name, configuration.selectors), `The encryptionkey failed to be created.`);
//         return;
//     }

//     private async _updateEncryptionKey(index: number, configuration: IEncryptionKeyCreateConfiguration, encryptionKey: EncryptionKey, operation: string): Promise<void> {

//         // Exists, No updates
//         if (configuration.name == encryptionKey.name &&
//             configuration.selectors == encryptionKey.selectors &&
//             configuration.value == encryptionKey.value &&
//             configuration.ellipticCurveType == encryptionKey.value.crv &&
//             configuration.keyOperations == encryptionKey.value.keyOps &&
//             configuration.keySize == encryptionKey.keySize &&
//             configuration.keyType == encryptionKey.value.kty &&
//             this.DatesEqual(configuration.activeDate, encryptionKey.attributes ? encryptionKey.attributes.notBefore : undefined) &&
//             this.DatesEqual(configuration.expirationDate, encryptionKey.attributes ? encryptionKey.attributes.expires : undefined)) {

//             this.LogOperationMessage(true, operation, index, this.GetIdentifier(encryptionKey.name, encryptionKey.id, encryptionKey.version), `The encryptionkey are equal, no update requred.`);
//             return;
//         }

//         encryptionKey.name = configuration.name;
//         encryptionKey.selectors = configuration.selectors;
//         encryptionKey.value = this.GetJsonWebKeyFromConfiguration(configuration);
//         encryptionKey.keySize = configuration.keySize;

//         if (!encryptionKey.attributes) {
//             encryptionKey.attributes = <PropertyAttributes>{}
//         }
//         encryptionKey.attributes.notBefore = configuration.activeDate;
//         encryptionKey.attributes.expires = configuration.expirationDate;

//         // Update
//         let updatedEncryptionKey: EncryptionKey | null = await this._client.Update(encryptionKey);
//         if (updatedEncryptionKey) {
//             this.LogOperationMessage(true, operation, index, this.GetIdentifier(updatedEncryptionKey.name, updatedEncryptionKey.id, updatedEncryptionKey.version), `The encryptionkey was successfully updated.`);
//             return;
//         }

//         this.LogOperationMessage(false, operation, index, this.GetIdentifier(encryptionKey.name, encryptionKey.id, encryptionKey.version), `The encryptionkey failed to be updated.`);
//     }
// }