
// import { KeyOperations, KeyType, EllipticCurveType, SearchOperator } from "../../models";
// import { IOperationConfiguration, ICreateConfiguration, IUpdateConfiguration, IDeleteVersionedConfiguration } from "./base";

// export interface JsonWebKeyConfiguration {
//     n?: string;
//     e?: string;
//     dp?: string;
//     dq?: string;
//     qi?: string;
//     p?: string;
//     q?: string;
//     x?: string;
//     y?: string;
//     d?: string;
//     k?: string;
// }
// export interface IEncryptionKeyCreateConfiguration extends ICreateConfiguration {
//     value?: JsonWebKeyConfiguration
//     keyType: KeyType
//     keyOperations: Array<KeyOperations>
//     keySize?: number
//     ellipticCurveType?: EllipticCurveType
// }
// export interface IEncryptionKeyUpdateConfiguration extends IUpdateConfiguration, ICreateConfiguration {
// }
// export interface IEncryptionKeyDeleteConfiguration extends IDeleteVersionedConfiguration {
// }
// export interface IEncryptionKeyConfiguration
//     extends IOperationConfiguration<IEncryptionKeyCreateConfiguration, IEncryptionKeyUpdateConfiguration, IEncryptionKeyDeleteConfiguration> {
// }