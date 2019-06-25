import {BaseUtility, IngredientManager} from '@azbake/core'
import { NetworkManagementClient } from "@azure/arm-network";
export class NetworkInterfaceUtils extends BaseUtility {

    public create_resource_name() {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = util.create_resource_name("ni", null, false);
        return name;
    }   

    public async get(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response;
    }
    public async get_id(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response.id;
    }   

    public async get_mac_address(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response.macAddress;
    }   
    public async get_ip_configurations(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response.ipConfigurations;
    }   
    
    public async get_virtual_machine(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response.virtualMachine;
    }   

    public async get_dns_settings(nicName: string, rg: string | null = null) { 
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const client = new NetworkManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);                
        let response = await client.networkInterfaces.get( resource_group, nicName)                      
        return response.dnsSettings;
    }   
}

