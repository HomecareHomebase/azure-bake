// import { ICreateConfiguration, IUpdateConfiguration, IDeleteVersionedConfiguration, IOperationConfiguration } from "./base";

// export interface ICertificateCreateConfiguration extends ICreateConfiguration {
//     value: Uint8Array
//     subject: string
//     validityInMonths?: number
//     password?: string
//     emails?: Array<string>
//     dnsNames?: Array<string>
//     upns?: Array<string>
// }
// export interface ICertificateUpdateConfiguration extends IUpdateConfiguration, ICertificateCreateConfiguration {
// }
// export interface ICertificateDeleteConfiguration extends IDeleteVersionedConfiguration {
// }
// export interface ICertificateConfiguration
//     extends IOperationConfiguration<ICertificateCreateConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration> {
// }