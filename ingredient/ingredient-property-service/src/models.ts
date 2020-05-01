//import { BakeVariable } from '@azbake/core'

export const enum SearchOperator {
    None = 0,
    Contains = 1,
    Equals = 2
}

// export class PropertyIdentifier {
//     constructor(name: string, identifier: string) {
//         this._name = name;
//         this._identifier = identifier;
//     }

//     private _name: string;
//     private _identifier: string;

//     public get Name(): string {
//         return this._name;
//     }
//     public get Identifier(): string {
//         return this._identifier;
//     }
// }

// export class VersionedPropertyIdentifier extends PropertyIdentifier {
//     private _version: string;

//     constructor(name: string, identifier: string, version: string) {
//         super(name, identifier);
//         this._version = version;
//     }

//     public get Version(): string {
//         return this._version;
//     }
// }

// export class SecretIdentifier extends VersionedPropertyIdentifier {
//     constructor(name: string, identifier: string, version: string) {
//         super(name, identifier, version);
//     }
// }

// export class EncryptionKeyIdentifier extends VersionedPropertyIdentifier {
//     constructor(name: string, identifier: string, version: string) {
//         super(name, identifier, version);
//     }
// }


// export class CertificateIdentifier extends VersionedPropertyIdentifier {
//     constructor(name: string, identifier: string, version: string) {
//         super(name, identifier, version);
//     }
// }
export enum KeyType {
    EllipticCurve = "EC",
    Rsa = "RSA"
}
export enum EllipticCurveType {
    P256 = "P-256",
    P384 = "P-384",
    P521 = "P-521",
    P256K = "P-256K"
}

export enum KeyOperations {
    Encrypt = "encrypt",
    Decrypt = "decrypt",
    //EncryptAndDecrypt = Encrypt | Decrypt,
    Sign = "sign",
    Verify = "verify",
    //SignAndVerify = Sign | Verify,
    Wrap = "wrapKey",
    Unwrap = "unwrapKey",
    //WrapAndUnwrap = Wrap | Unwrap,
    //All = EncryptAndDecrypt | SignAndVerify | WrapAndUnwrap
    All = "all"
}

