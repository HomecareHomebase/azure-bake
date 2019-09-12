import {BakeVariable, IBakeRegion} from '@azbake/core'
import { DeploymentContext } from '@azbake/core';
import { BaseUtility} from '@azbake/core'

function stringCompareInsensitive(a: string, b: string) : boolean {
    return a.localeCompare(b,undefined, {sensitivity: 'accent'}) === 0;
}


export class CoreUtils extends BaseUtility {

    public toNumber(v: any): number {
        
        let str = v.toString()
        return parseInt(str)
    }

    public toString(v: any): string {
        return v.ToString()
    }

    public toBoolean(v: any): boolean {
        let str = v.ToString().toLocaleLowerCase();
        return (str == "true" || str == "1");
    }

    

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

    public primary_region(): IBakeRegion | null {

        const regions = this.context.Environment.regions;

        if (regions.length < 1)
            return null
        
        return regions[0]
    }

    //if no secondary region defined, return primary as secondary
    public secondary_region(): IBakeRegion | null {

        const regions = this.context.Environment.regions;

        if (regions.length < 2)
            return this.primary_region();
        
        return regions[1]
    }
     
    public async resource_group(name: string | null = null, useRegionCode: boolean = true, region : IBakeRegion | null = null, ignoreOverride: boolean = false): Promise<string> {
        let override = this.context.Config.rgOverride
        if (override && !ignoreOverride) {
            return await override.valueAsync(this.context)
        } else {
            if (region) {
                return this._create_resource_group_name(name,region.code)
            }
            else {
                let rgn = this.context.Region.code
                if (!useRegionCode)
                    rgn = ""
                return this._create_resource_group_name(name,rgn)
            }
        }
    }
    
    public async variable(key: string, def?: string): Promise<any> {
        if (this.context.Config.variables) {

            //we want keys to be case insensitive, so we iterate all keys and find first case-insensitive match
            //means there could be collisions, we don't care, and just use first found.

            for(let variableKey of this.context.Config.variables.entries()){
                if (stringCompareInsensitive(variableKey[0], key)) {
                
                    let v: BakeVariable = this.context.Config.variables.get(variableKey[0]) || new BakeVariable(def || "")
                    return await v.valueAsync(this.context)  
                }
            }

            return def || "";
            
        } else {
            return def || ""
        }
    }

    public create_region_resource_name(resType: string, name: string | null = null, region: IBakeRegion | null, suffix: string = ""): string {
        let rgn = ""
        if (region)
            rgn = region.code

        return this._create_resource_name(resType, name, rgn, suffix)
    }
    
    public create_resource_name(resType: string, name: string | null = null, useRegionCode: boolean = true, suffix: string = ""): string {
        let rgn = this.context.Region.code
        if (!useRegionCode)
            rgn = ""

        return this._create_resource_name(resType, name, rgn, suffix)
    }

    private _create_resource_name(resType: string, name: string | null = null, rgn: string, suffix: string = ""): string {
        let env = this.context.Environment.environmentCode
        let pkg = this.context.Config.shortName
    
        //NOT to be used for VM names (15 max chars, use :TODO:)
        //24 total characters to support most resource types
        //rgn = 4
        //env = 4
        //resType = 3
        //suffix: 3
        //pkg = 10
        
        pkg = name || pkg
    
        return (env + rgn + resType + pkg + suffix).toLocaleLowerCase()
    }

    private _create_resource_group_name(name: string | null = null, rgn: string = ""): string {
        let env = this.context.Environment.environmentCode
        let pkg = this.context.Config.shortName
        
        pkg = name || pkg

        if (rgn)
            rgn = rgn + "_"
    
        return (`rg_${pkg}_${rgn}${env}`).toLocaleUpperCase()
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
        let rgn = this.context.Region.code
        return this._create_resource_group_name(pkgName,rgn)
    }

    public async get_ingredient_source(): Promise<string> {
        return await this.context.Ingredient.properties.source.valueAsync(this.context)
    }
}

