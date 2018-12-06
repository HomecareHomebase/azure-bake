import {BakeVariable} from './bake-variable'
import { DeploymentContext } from '../deployment-context';

let ctx : DeploymentContext
export function setContext(context: DeploymentContext) {
    ctx = context
}

export function variable(key: string, def?: string): string {
    let v: BakeVariable = ctx.Config.variables.get(key) || new BakeVariable(def || "")
    return v.value(ctx)
}

export function create_resource_name(resType: string, sep: string): string {
    let env = ctx.Environment.environmentCode
    return ""
}