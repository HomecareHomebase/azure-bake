// import { Logger } from '@azbake/core'

// import { EncryptionKey, EncryptOperation, DecryptOperation } from './generated-client/models/index'
// import { ClientCryptoBase } from './clientCryptoBase';

// import { SearchOperator } from '../models';
// import { EncryptionAlgorithm } from '../models/encryptonKey';

// export class EncryptionKeyClient extends ClientCryptoBase<EncryptionKey> {

//     public constructor(logger: Logger, baseUrl: string, accessToken: string) {
//         super(logger, baseUrl, accessToken);
//     }

//     protected async SearchImpl(operator: SearchOperator, name: string, selectors: { [key: string]: string; } | undefined): Promise<EncryptionKey[] | null> {

//         let searchOperation = await this._client.encryptionKeyOperations.search(this.GetSearchName(name, selectors), operator)
//         if (searchOperation && searchOperation._response.status == 200) {
//             let p: EncryptionKey[] = searchOperation._response.parsedBody;
//             return p;
//         }

//         if (searchOperation && searchOperation._response.status != 404) {
//             this._logger.error('An error occurred while invoking encryptionkey search. Status: ' + searchOperation._response.status)
//         }

//         return null;
//     }
//     protected async CreateImpl(model: EncryptionKey): Promise<EncryptionKey | null> {
//         let createOperation = await this._client.encryptionKeyOperations.create(model)

//         if (createOperation._response.status == 200) {
//             let p: EncryptionKey = createOperation._response.parsedBody;
//             return p;
//         }

//         this._logger.error('An error occurred while invoking encryptionkey create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
//         return null;
//     }
//     protected async UpdateImpl(model: EncryptionKey): Promise<EncryptionKey | null> {
//         let updateOperation = await this._client.encryptionKeyOperations.update(model)

//         if (updateOperation && updateOperation._response.status == 200) {
//             let p: EncryptionKey = updateOperation._response.parsedBody;
//             return p;
//         }

//         if (updateOperation && updateOperation._response.status != 404) {
//             this._logger.error('An error occurred while invoking encryptionKey update. Status: ' + updateOperation._response.status)
//         }

//         return null;
//     }
//     protected async DeleteImpl(id: string, name: string, version: string): Promise<boolean> {
//         let deleteOperation = await this._client.encryptionKeyOperations.deleteMethod(version, id, name);

//         if (deleteOperation._response.status == 200) {
//             return true;
//         }

//         this._logger.error('An error occurred while invoking encryptionkey delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
//         return false;
//     }

//     protected async EncryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {

//         let options: EncryptOperation = {
//             algorithm: algorithm,
//             value: value
//         }

//         let encryptOperation = await this._client.encryptionKeyOperations.encrypt(version, id, name, options);
//         if (encryptOperation._response.status == 200) {
//             let cipherBytes: Uint8Array = encryptOperation._response.parsedBody;
//             return cipherBytes;
//         }

//         this._logger.error('An error occurred while invoking encryptionKey encrypt. Status: ' + encryptOperation._response.status)
//         return null;
//     }
//     protected async DecryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {

//         let options: DecryptOperation = {
//             algorithm: algorithm,
//             value: value
//         }

//         let encryptOperation = await this._client.encryptionKeyOperations.decrypt(version, id, name, options);
//         if (encryptOperation._response.status == 200) {
//             let cipherBytes: Uint8Array = encryptOperation._response.parsedBody;
//             return cipherBytes;
//         }

//         this._logger.error('An error occurred while invoking encryptionKey encrypt. Status: ' + encryptOperation._response.status)
//         return null;
//     }

//     protected async SignImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {
//         throw new Error("Method not implemented.");
//     }
//     protected async VerifyImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, digest: Uint8Array, signature: Uint8Array): Promise<boolean> {
//         throw new Error("Method not implemented.");
//     }

//     protected async WrapImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {
//         throw new Error("Method not implemented.");
//     }
//     protected async UnwrapImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {
//         throw new Error("Method not implemented.");
//     }
// };