import { SearchOperator } from "../../models/searchOperator";

export interface ICreateConfiguration {
    name: string
    selectors?: { [key: string]: string }
    expirationDate?: Date
    activeDate?: Date
}

export interface IUpdateTargetConfiguration {
    name: string
    selectors?: { [key: string]: string }
}

export interface IUpdateConfiguration {
    target: IUpdateTargetConfiguration
    name?: string
    selectors?: { [key: string]: string }
    expirationDate?: Date
    activeDate?: Date
}

export interface IDeleteConfiguration {
    operator: SearchOperator
    name: string
    selectors?: { [key: string]: string }
}

export interface IDeleteVersionedConfiguration extends IDeleteConfiguration {
    allVersions: boolean
}

export interface IOperationConfiguration<TCreate extends ICreateConfiguration,
    TUpdate extends IUpdateConfiguration, TDelete extends IDeleteConfiguration> {
    create?: Array<TCreate>
    update?: Array<TUpdate>
    delete?: Array<TDelete>
}