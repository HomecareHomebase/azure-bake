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
    // Seed writes a value once and is a no-op on every later deployment. It shares the create
    // configuration shape, so name/value/selectors/contentType/dates all apply.
    seed?: Array<TCreate>
    create?: Array<TCreate>
    update?: Array<TUpdate>
    delete?: Array<TDelete>
}