// import { Logger } from '@azbake/core'

// import { HCHBServicesPropertyServiceAPIv1Options } from './generated-client/models/index'

// import { SearchOperator } from '../models';

// export abstract class ClientCryptoBase<TModel> extends ClientBase<TModel> {

//     protected constructor(logger: Logger, baseUrl: string, accessToken: string) {
//         super(logger, baseUrl, accessToken)
//     }

//     public async Encrypt(id: string,
//         name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         value: Uint8Array): Promise<Uint8Array | null> {

//         return await this.EncryptImpl(id, name, version, algorithm, value);
//     }
//     public async Decrypt(id: string, name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         value: Uint8Array): Promise<Uint8Array | null> {

//         return await this.Decrypt(id, name, version, algorithm, value);
//     }
//     public async Sign(id: string,
//         name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         value: Uint8Array): Promise<Uint8Array | null> {

//         return await this.SignImpl(id, name, version, algorithm, value);
//     }
//     public async Verify(id: string,
//         name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         digest: Uint8Array,
//         signature: Uint8Array): Promise<boolean> {

//         return await this.VerifyImpl(id, name, version, algorithm, digest, signature);
//     }
//     public async Wrap(id: string,
//         name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         value: Uint8Array): Promise<Uint8Array | null> {

//         return await this.WrapImpl(id, name, version, algorithm, value);
//     }
//     public async Unwrap(id: string,
//         name: string,
//         version: string,
//         algorithm: EncryptionAlgorithm,
//         value: Uint8Array): Promise<Uint8Array | null> {

//         return await this.UnwrapImpl(id, name, version, algorithm, value);
//     }

//     protected abstract async EncryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null>;
//     protected abstract async DecryptImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null>;
//     protected abstract async SignImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null>;
//     protected abstract async VerifyImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, digest: Uint8Array, signature: Uint8Array): Promise<boolean>;
//     protected abstract async WrapImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null>;
//     protected abstract async UnwrapImpl(id: string, name: string, version: string, algorithm: EncryptionAlgorithm, value: Uint8Array): Promise<Uint8Array | null>;
// };