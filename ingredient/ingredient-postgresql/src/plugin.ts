import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { PostgreSQLDBUtils } from "./functions"
import { VnetData } from "./vnetData"
import PublicAccessARMTemplate from "./PublicAccessArm.json" 
import PrivateAccessARMTemplate from "./PrivateAccessArm.json"
import { Subnet,VirtualNetwork } from "@azure/arm-network/esm/models"

export class PostgreSQLDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
        this._helper = new ARMHelper(this._ctx);
        this._functions = new PostgreSQLDBUtils(this._ctx);
        this._access = this._ingredient.properties.parameters.get("access")?._value.toLowerCase();
    }

    _helper: ARMHelper;
    _functions: PostgreSQLDBUtils; // Might remove this later and put all the "function" logic in the bake yaml.
    private _access: string;


    public async Execute(): Promise<void> {
        try {
            var params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            this.validateBakeParams(params);


        } catch (error){
            this._logger.error('Bake validation failed: ' + error)
            throw error;
        }

        // Set appropriate ARM template based on the access type defined in the Bake YAML
        var ARMTemplate = (this._access == "public") ? PublicAccessARMTemplate
            : (this._access == "private") ? PrivateAccessARMTemplate
            : null;

        const vnetData = await this.getVnetData(params);
        params.vnetData = vnetData;

        if (this._access == "Private")
        {
            // The Private ARM template includes a few Microsoft.Resources/deployments which should be uniquely named
            let timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, "");
            params.virtualNetworkDeploymentName = `virtualNetwork_${timestamp}`;
            params.virtualNetworkLinkDeploymentName = `virtualNetworkLink_${timestamp}`;
            params.privateDnsZoneDeploymentName = `privateDnsZone_${timestamp}`;
        }

        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.parameters)

            await this._helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())

        } catch(error){
            this._logger.error('Deployment failed: ' + error)
            throw error
        }
    }

    public async getVnetData(params: any): Promise<VnetData> {
        //var data: any = {}};
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        let vNet: VirtualNetwork = await this._functions.get_vnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value)
        let subnetPropertiesGet: Subnet = await this._functions.get_subnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value, params.subnetName.value)
        let privateDnsZoneName = this._functions.create_resource_uri(params.access); // todo investigate public equivalent.
        let dnsZone = await this._functions.get_private_dns_zone(params.virtualNetworkResourceGroup.value, privateDnsZoneName)
        let dnsZoneIsNew: boolean = false;

        // if dnsZone doesn't exist, generate its id
        if (dnsZone === undefined)
        {
            dnsZoneIsNew = true;
            dnsZone = { id: `/subscriptions/${this._ctx.Environment.authentication.subscriptionId}/resourceGroups/${params.virtualNetworkResourceGroup.value}` +
                `/providers/Microsoft.Network/privateDnsZones/${privateDnsZoneName}`};
        }
        
        let vnetData: VnetData = {
            value: {
                virtualNetworkName: params.virtualNetworkName.value,
                virtualNetworkId: vNet.id!,
                subnetName: params.subnetName.value,
                virtualNetworkAddressPrefix: subnetPropertiesGet.addressPrefix!,
                virtualNetworkResourceGroupName: params.virtualNetworkResourceGroup.value,
                location: await util.current_region(), // maybe primary_region()?
                subscriptionId: this._ctx.Environment.authentication.subscriptionId,
                subnetProperties: subnetPropertiesGet,
                subnetNeedsUpdate: false,
                isNewVnet: false,
                usePrivateDnsZone: (params.access === "private"),
                isNewPrivateDnsZone: dnsZoneIsNew, 
                privateDnsResourceGroup: params.virtualNetworkResourceGroup.value,
                privateDnsSubscriptionId: this._ctx.Environment.authentication.subscriptionId,
                privateDnsZoneName: privateDnsZoneName,
                linkVirtualNetwork: true,
                Network: {
                    DelegatedSubnetResourceId: subnetPropertiesGet.id!,
                    PrivateDnsZoneArmResourceId: dnsZone.id 
                }
            }
        };

        return vnetData;
    }

    validateBakeParams(params: any) {
        const validAccesses = ["public", "private"];
        if (!validAccesses.includes(this._access)) throw new Error("Parameter 'access' must be set to \"public\" or \"private\".");
        
        // This gets checked by the regular ARM validation anyway but might as well catch it early here.
        if (!params.serverName || !params.administratorLogin || !params.administratorLoginPassword) {
            throw new Error("serverName, administratorLogin, and administratorLoginPassword must be defined in the Bake parameters.");
        }

        // private access requires some special data for subnet
        if (this._access == "private") {
            if (!params.subnetName || !params.virtualNetworkName || !params.virtualNetworkResourceGroup) {
                throw new Error("subnetName, virtualNetworkName, and virtualNetworkResourceGroup must be defined in the Bake Parameters for 'private' access");
            } 
        }
    }

}



