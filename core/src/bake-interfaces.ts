import {BakeVariable} from './bake-variable'
import { BaseIngredient } from './base-ingredient';
import { DeploymentContext } from './deployment-context';
import { BaseUtility } from './base-utility';
import { create } from 'domain';

export interface IBakeAuthentication {
    subscriptionId: string
    tenantId: string,
    serviceId: string,
    secretKey: string,
    certPath: string,
    skipAuth:boolean
}

export interface IBakeEnvironment {
    toolVersion: string,
    environmentName: string,
    environmentCode: string,
    regions: Array<IBakeRegion>,
    authentication: IBakeAuthentication
    variables: Map<string, BakeVariable>,
    logLevel: string
}

export interface IIngredientProperties {
    type: string,
    source: BakeVariable,
    parameters: Map<string,BakeVariable>,
    tokens: Map<string,BakeVariable>
}

export interface IIngredientType {
    new (name: string, ingredient: IIngredient, ctx: DeploymentContext): BaseIngredient
}

export interface IBaseUtilityType {
    new(ctx: DeploymentContext): BaseUtility
}

export interface IIngredient {
    properties: IIngredientProperties,
    dependsOn: Array<string>
    pluginVersion: string
}

export interface IBakeConfig {
    name: string,
    shortName: string,
    version: string,
    ingredients?: Array<string>,
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

export interface IBakeResource {
    resourceGroup: string,
    resource: string
}