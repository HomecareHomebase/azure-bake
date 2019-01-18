import {BakeVariable} from '@azbake/core'
import { DeploymentContext } from '@azbake/core';
import { BaseUtility} from '@azbake/core'


export class CoreUtils extends BaseUtility {

    public current_region() {
        return this.context.Region
    }
    
    public resource_group() {
        let override = this.context.Config.rgOverride
        if (override) {
            return override.value(this.context)
        } else {
            return this.create_resource_name("", null, true)
        }
    }
    public variable(key: string, def?: string): string {
        if (this.context.Config.variables) {
            let v: BakeVariable = this.context.Config.variables.get(key) || new BakeVariable(def || "")
            return v.value(this.context)    
        } else {
            return ""
        }
    }
    
    public create_resource_name(resType: string, name: string | null = null, useRegionCode: boolean = true, suffix: string = ""): string {
        let env = this.context.Environment.environmentCode
        let rgn = this.context.Region.code
        let pkg = this.context.Config.shortName
    
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
    
    public create_storage_name(name: string | null = null, suffix: string = "") {
        return this.create_resource_name("st", name, true, suffix)
    }

    public get_ingredient_source(): string {
        return this.context.Ingredient.properties.source.value(this.context)
    }
}

