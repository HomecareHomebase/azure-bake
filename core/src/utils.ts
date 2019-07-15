import { BakeVariable } from "./bake-variable"

export function objToVariableMap(obj: any) {
    let strMap = new Map<string,BakeVariable>();

    //support variables being empty, or not defined in the YAML.
    if (obj == null || undefined)
    {
        return strMap
    }

    for (let k of Object.keys(obj)) {
        strMap.set(k, new BakeVariable(obj[k]));
    }
    return strMap;
}