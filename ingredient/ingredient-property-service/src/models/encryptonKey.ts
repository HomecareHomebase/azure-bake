// import { VersionedIdentifierBase } from ".";

// export class EncryptionKeyIdentifier extends VersionedIdentifierBase {
//     constructor(name: string, identifier: string, version: string) {
//         super(name, identifier, version);
//     }
// }

// export enum KeyType {
//     EllipticCurve = "EC",
//     Rsa = "RSA"
// }
// export enum EllipticCurveType {
//     P256 = "P-256",
//     P384 = "P-384",
//     P521 = "P-521",
//     P256K = "P-256K"
// }

// export enum EncryptionAlgorithm {
//     RSAOAEP = "RSA-OAEP",
//     RSA15 = "RSA1_5",
//     RSAOAEP256 = "RSA-OAEP-256"
// }

// export enum KeyOperations {
//     Encrypt = "encrypt",
//     Decrypt = "decrypt",
//     //EncryptAndDecrypt = Encrypt | Decrypt,
//     Sign = "sign",
//     Verify = "verify",
//     //SignAndVerify = Sign | Verify,
//     Wrap = "wrapKey",
//     Unwrap = "unwrapKey",
//     //WrapAndUnwrap = Wrap | Unwrap,
//     //All = EncryptAndDecrypt | SignAndVerify | WrapAndUnwrap
//     All = "all"
// }