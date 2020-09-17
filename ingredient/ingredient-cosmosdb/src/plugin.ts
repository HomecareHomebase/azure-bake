import { BaseIngredient, IngredientManager } from "@azbake/core"

export class CosmosDb extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('CosmosDb Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);
            //build the properties as a standard object.
            let props = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            let buffer = fs.readFileSync(source)
            let contents = buffer.toString()
            await helper.DeployTemplate(this._name, JSON.parse(contents), props, await util.resource_group());


        } catch(error){
            this._logger.error('CosmosDb deployment failed: ' + error)
            throw error
        }

    }
}
