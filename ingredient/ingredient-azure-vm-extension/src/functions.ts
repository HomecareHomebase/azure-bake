import {BaseUtility, IngredientManager} from '@azbake/core'
import { ComputeManagementClient, VirtualMachineExtensionUpdate } from "@azure/arm-compute";

export class VirtualMachineExtensionsUtils extends BaseUtility {

    public create_resource_name() {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = util.create_resource_name("vmext", null, false);
        return name;
    }   

    public async get(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();
        
        const credentials = this.context.Credentials.modernCredentials

        let client = new ComputeManagementClient(credentials, this.context.Environment.authentication.subscriptionId);        
        const vm = client.virtualMachineExtensions                
        let response = await vm.get(resource_group, vmName, vmExtensionName) ;                     
        return response;
    }   
    
    public async list(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const credentials = this.context.Credentials.modernCredentials

        let client = new ComputeManagementClient(credentials, this.context.Environment.authentication.subscriptionId);        
        const vm = client.virtualMachineExtensions;                
        let response = await vm.list(resource_group, vmName) ;                     
        return response;
    }   

    /*
    public async blah(rg: string, vmName: string, vmExtensionName: string) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        let client = new ComputeManagementClientContext(this.context.AuthToken,this.context.Environment.authentication.subscriptionId);        
        const vm = new VirtualMachineExtensions(client);            
        let response = await vm.deleteMethod(rg, vmName, vmExtensionName) ;                     
        return response;
    }
*/
    public async update(rg: string, vmName: string, vmExtensionName: string, extensionParameters: VirtualMachineExtensionUpdate) {

        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        let resource_group = rg || await util.resource_group();

        const credentials = this.context.Credentials.modernCredentials

        let client = new ComputeManagementClient(credentials, this.context.Environment.authentication.subscriptionId);        
        const vm = client.virtualMachineExtensions;                          
        let response = await vm.beginUpdateAndWait(resource_group, vmName, vmExtensionName, extensionParameters) ;                     
        return response;
    }   
}

