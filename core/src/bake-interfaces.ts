import {BakeVariable} from './bake-variable'

export interface IBakeAuthentication {
    subscriptionId: string
    tenantId: string,
    serviceId: string,
    secretKey: string,
    certPath: string
}

export interface IBakeEnvironment {
    toolVersion: string,
    environmentName: string,
    environmentCode: string,
    authentication: IBakeAuthentication
    variabes: Map<string, BakeVariable>
}

export interface IIngredientProperties {
    type: string,
    template: string,
    parameters: Map<string,BakeVariable>
}

export interface IIngredient {
    properties: IIngredientProperties,
    dependsOn: Array<string>
}

export interface IBakeConfig {
    name: string,
    shortName: string,
    version: string,
    resourceGroup: boolean,
    rgOverride?: BakeVariable,
    parallelRegions?: boolean

    variables?: Map<string,BakeVariable>
    recipe: Map<string, IIngredient>
}

export interface IBakeRegion {
    name: string
    shortName: string
    code: string
}

export interface IBakePackage {
    Config: IBakeConfig,
    Environment: IBakeEnvironment,
    Authenticate( callback: (auth:IBakeAuthentication)=>Promise<boolean> ) : Promise<boolean>
}