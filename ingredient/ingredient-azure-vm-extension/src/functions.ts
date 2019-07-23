import {BaseUtility, IngredientManager} from '@azbake/core'
import { VirtualMachineExtensions  } from "@azure/arm-compute";
import {VirtualMachineExtensionUpdate } from "@azure/arm-compute/src/models"
import {ComputeManagementClientContext} from "@azure/arm-compute";

export class VirtualMachineExtensionsUtils extends BaseUtility {

    public create_resource_name() {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = util.create_resource_name("ni", null, false);
        return name;
    }   

    public async get(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();
        
        let client = new ComputeManagementClientContext(this.context.AuthToken,this.context.Environment.authentication.subscriptionId);        
        const vm = new VirtualMachineExtensions(client);                
        let response = await vm.get(rg, vmName, vmExtensionName) ;                     
        return response;
    }   
    public async list(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        let client = new ComputeManagementClientContext(this.context.AuthToken,this.context.Environment.authentication.subscriptionId);        
        const vm = new VirtualMachineExtensions(client);                
        let response = await vm.list(rg, vmName) ;                     
        return response;
    }   

    public async delete(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        let client = new ComputeManagementClientContext(this.context.AuthToken,this.context.Environment.authentication.subscriptionId);        
        const vm = new VirtualMachineExtensions(client);            
        let response = await vm.deleteMethod(rg, vmName, vmExtensionName) ;                     
        return response;
    }   

    
    public async update(rg: string, vmName: string, vmExtensionName: string, extensionParameters: VirtualMachineExtensionUpdate) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        let client = new ComputeManagementClientContext(this.context.AuthToken,this.context.Environment.authentication.subscriptionId);        
        const vm = new VirtualMachineExtensions(client);                          
        let response = await vm.update(rg, vmName, vmExtensionName, extensionParameters) ;                     
        return response;
    }   
}

