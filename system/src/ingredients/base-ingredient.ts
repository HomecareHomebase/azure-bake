import { IBakeConfig, IIngredient, IBakeRegion, Logger, DeploymentContext } from "@azbake/core";
import cli from 'azcli-npm'
import * as colors from 'colors'

export class BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {

        this._ctx = ctx
        this._name = name
        this._ingredient = ingredient
        this._logger = new Logger(ctx.Logger.getPre().concat(name))
        this._logger.log('adding ingredient type[' + colors.cyan(ingredient.properties.type) +'] template[' + colors.cyan(ingredient.properties.template) + ']')
    }

    _ctx: DeploymentContext
    _logger: Logger
    _ingredient: IIngredient
    _name: string

    public async Execute(): Promise<string> {

        return this._name

    }

}