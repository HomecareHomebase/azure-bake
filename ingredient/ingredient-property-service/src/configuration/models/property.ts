import { ICreateConfiguration, IDeleteConfiguration, IUpdateConfiguration, IOperationConfiguration } from "./baseConfigurations"

export interface IPropertyCreateConfiguration extends ICreateConfiguration {
    value: string,
    contentType?: string
}
export interface IPropertyUpdateConfiguration extends IUpdateConfiguration {
    value?: string,
    contentType?: string
}
export interface IPropertyDeleteConfiguration extends IDeleteConfiguration {
}
export interface IPropertyConfiguration
    extends IOperationConfiguration<IPropertyCreateConfiguration, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration> {
}