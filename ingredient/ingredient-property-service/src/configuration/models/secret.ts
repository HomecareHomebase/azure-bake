import { ICreateConfiguration, IDeleteVersionedConfiguration, IUpdateConfiguration, IOperationConfiguration } from './baseConfigurations';

export interface ISecretCreateConfiguration extends ICreateConfiguration {
    value: string,
    contentType?: string
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