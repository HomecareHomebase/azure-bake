import { DeploymentContext, IIngredient, BakeVariable, Logger } from '@azbake/core'

export class ConfigurationValueResolver {

    private readonly _ctx: DeploymentContext
    private readonly _logger: Logger
    private readonly _ingredient: IIngredient

    constructor(logger: Logger, ctx: DeploymentContext, ingredient: IIngredient) {
        this._logger = logger;
        this._ctx = ctx;
        this._ingredient = ingredient;
    }

    public async GetPropertyByType<T>(type: string): Promise<T | null> {
        let typeParameters = this._ingredient.properties.parameters.get(type)
        if (!typeParameters) {
            this._logger.debug(`Configuration property type [${type}] is null`)
            return null;
        }

        let value: T = await this.GetPropertyValue<T>(typeParameters);
        this._logger.debug(`Configuration property type [${type}] is ${JSON.stringify(value)}}`)

        return value;
    }

    public async GetPropertyValue<T>(bakeVariable: BakeVariable): Promise<T> {
        let value: T = await bakeVariable.valueAsync(this._ctx);
        return value;
    }
}
