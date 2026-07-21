import { ICreateConfiguration, IDeleteVersionedConfiguration, IUpdateConfiguration, IOperationConfiguration } from './baseConfigurations';

export interface IConnectionStringSource {
    type: 'storage' | 'cosmos',
    account: string,
    resourceGroup?: string
}
export interface ISecretCreateConfiguration extends ICreateConfiguration {
    value?: string,
    contentType?: string,
    connectionStringFrom?: IConnectionStringSource
}
export interface ISecretUpdateConfiguration extends IUpdateConfiguration {
    value?: string,
    contentType?: string
}
export interface ISecretDeleteConfiguration extends IDeleteVersionedConfiguration {
}
export interface ISecretConfiguration
    extends IOperationConfiguration<ISecretCreateConfiguration, ISecretUpdateConfiguration, ISecretDeleteConfiguration> {
}