// import { Logger } from '@azbake/core'

// import { Certificate, CertificateOperationsSearchOptionalParams } from './generated-client/models/index'
// import { ClientBase } from './clientbase';

// import { SearchOperator } from '../models';
// import { EncryptionAlgorithm } from '../models/encryptonKey';

// export class CertificateClient extends ClientBase<Certificate> {

//     public constructor(logger: Logger, baseUrl: string, accessToken: string) {
//         super(logger, baseUrl, accessToken);
//     }

//     protected async SearchImpl(operator: number, name: string, selectors: { [key: string]: string; } | undefined): Promise<Certificate[] | null> {

//         let searchOperation = await this._client.certificateOperations.search(this.GetSearchName(name, selectors), operator);
//         if (searchOperation && searchOperation._response.status == 200) {
//             let p: Certificate[] = searchOperation._response.parsedBody;
//             return p;
//         }

//         if (searchOperation && searchOperation._response.status != 404) {
//             this._logger.error('An error occurred while invoking certificate search. Status: ' + searchOperation._response.status)
//         }

//         return null;
//     }
//     protected async CreateImpl(model: Certificate): Promise<Certificate | null> {
//         let createOperation = await this._client.certificateOperations.create(model)

//         if (createOperation._response.status == 200) {
//             let p: Certificate = createOperation._response.parsedBody;
//             return p;
//         }

//         this._logger.error('An error occurred while invoking certificate create. Status [' + createOperation._response.status + '] Body [' + createOperation._response.bodyAsText + '].')
//         return null;
//     }
//     protected async UpdateImpl(model: Certificate): Promise<Certificate | null> {

//         let updateOperation = await this._client.certificateOperations.update(model);

//         if (updateOperation && updateOperation._response.status == 200) {
//             let p: Certificate = updateOperation._response.parsedBody;
//             return p;
//         }

//         if (updateOperation && updateOperation._response.status != 404) {
//             this._logger.error('An error occurred while invoking certificate update. Status: ' + updateOperation._response.status)
//         }

//         return null;
//     }
//     protected async DeleteImpl(id: string, name: string, version: string): Promise<boolean> {
//         let deleteOperation = await this._client.certificateOperations.deleteMethod(version, id, name);

//         if (deleteOperation._response.status == 200) {
//             return true;
//         }

//         this._logger.error('An error occurred while invoking certificate delete. Status [' + deleteOperation._response.status + '] Body [' + deleteOperation._response.bodyAsText + '].')
//         return false;
//     }

//     protected async EncryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {
//         throw new Error("Method not implemented.");
//     }
//     protected async DecryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null> {
//         throw new Error("Method not implemented.");
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
