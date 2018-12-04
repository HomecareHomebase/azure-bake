import {BakeVariable} from './bake-variable'
import {BakeData} from './bake-data'

export function variable(key: string, def?: string): string {
    let v: BakeVariable = BakeData.Config.variables.get(key) || new BakeVariable(def || "")
    return v.value
}