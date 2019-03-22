import {BakeVariable} from '@azbake/core'
import { DeploymentContext } from '@azbake/core';
import { BaseUtility} from '@azbake/core'


export class CoreUtils extends BaseUtility {

    public current_region() {
        return this.context.Region
    }

    public current_region_primary(): boolean {
        // compares the current region to the first region in the array to determine if this is the primary region.
        const regions = this.context.Environment.regions;

        // If there are no regions, exit returning false.
        if (regions.length < 1)
            return false;

        // if current region code matches the first in the array, return true
        return regions[0].code == this.current_region().code;
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

    public create_app_svc_name(): string {
        return this.create_resource_name("appsvc", null, true);
    }

    public get_cert_name(pkgName: string, resourceGroup: string | null = null): string {
        const rg = resourceGroup || this.get_resource_group(pkgName);
        const cert = this.create_resource_name("cert", pkgName, true)

        return `${rg}/${cert}`;
    }
    public create_cert_name(): string {
        return this.create_resource_name("cert", null, true)
    }

    public get_app_svc_name(pkgName: string, resourceGroup: string | null = null): string {
        const rg = resourceGroup || this.get_resource_group(pkgName);
        const appSvc = this.create_resource_name("appsvc", pkgName, true);

        return `${rg}/${appSvc}`;
    }

    public get_resource_group(pkgName: string): string {
        return this.create_resource_name("", pkgName, true);
    }

    public get_ingredient_source(): string {
        return this.context.Ingredient.properties.source.value(this.context)
    }
}

