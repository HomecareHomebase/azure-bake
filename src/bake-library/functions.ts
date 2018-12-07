import {BakeVariable} from './bake-variable'
import { DeploymentContext } from '../deployment-context';

let ctx : DeploymentContext
export function setContext(context: DeploymentContext) {
    ctx = context
}

export function current_region() {
    return ctx.Region
}

export function resource_group() {
    let override = ctx.Config.rgOverride
    if (override) {
        return override.value(ctx)
    } else {
        return create_resource_name("", null, true)
    }
}
export function variable(key: string, def?: string): string {
    if (ctx.Config.variables) {
        let v: BakeVariable = ctx.Config.variables.get(key) || new BakeVariable(def || "")
        return v.value(ctx)    
    } else {
        return ""
    }
}

export function create_resource_name(resType: string, name: string | null = null, useRegionCode: boolean = true, suffix: string = ""): string {
    let env = ctx.Environment.environmentCode
    let rgn = ctx.Region.code
    let pkg = ctx.Config.shortName

    //NOT to be used for VM names (15 max chars, use :TODO:)
    //24 total characters to support most resource types
    //rgn = 4
    //env = 4
    //resType = 3
    //suffix: 3
    //pkg = 10

    if (!useRegionCode)
        rgn = ""

    pkg = name || pkg

    return (env + rgn + resType + pkg + suffix).toLocaleLowerCase()
}

export function create_storage_name(name: string | null = null, suffix: string = "") {
    return create_resource_name("st", name, true, suffix)
}