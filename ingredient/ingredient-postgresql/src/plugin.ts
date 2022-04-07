import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { PostgreSQLDBUtils } from "./functions"
import { VirtualMachineScaleSetDataDisk } from "@azure/arm-compute/esm/models/mappers"
import { VnetData } from "./vnetData"
import PublicAccessARMTemplate from "./PublicAccessArm.json" 
import PrivateAccessARMTemplate from "./PrivateAccessArm.json"

export class PostgreSQLDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
        this._helper = new ARMHelper(this._ctx);
        this._functions = new PostgreSQLDBUtils(this._ctx);
    }

    _helper: ARMHelper;
    _functions: PostgreSQLDBUtils; // Might remove this later and put all the "function" logic in the bake yaml.

    public async Execute(): Promise<void> {
        try {
            var params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            var ARMTemplate = (params.access.value == "public") ? PublicAccessARMTemplate
                : (params.access.value == "private") ? PrivateAccessARMTemplate
                : null;
            
            if (ARMTemplate == null) throw new Error("Parameter 'access' must be set to \"public\" or \"private\".");

            // TODO add a lot more validation here. eg if private and missing vnetname or subnetname or they don't exist
        } catch (error){
            this._logger.error('Bake validation failed: ' + error)
            throw error;
        }

        var vnetData = new VirtualMachineScaleSetDataDisk()
        vnetData.value.subnetProperties = await this._functions.get_subnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value, params.subnetName.value)

        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.parameters)

            await this._helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())

        } catch(error){
            this._logger.error('Deployment failed: ' + error)
            throw error
        }
    }


}