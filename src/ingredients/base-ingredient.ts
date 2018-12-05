import { IBakeConfig, IIngredient, IBakeRegion } from "../bake-loader";
import cli from 'azcli-npm'
import { Logger } from "../logger";
import * as colors from 'colors'

export class BaseIngredient {

    constructor(name: string, config: IBakeConfig, ingredient: IIngredient, azcli: cli, region: IBakeRegion, logger: Logger) {

        this._name = name
        this._config = config
        this._ingredient = ingredient
        this._cli = azcli
        this._region = region
        this._logger = new Logger(logger.getPre().concat(name))

        this._logger.log('adding ingredient type[' + colors.cyan(ingredient.properties.type) +'] template[' + colors.cyan(ingredient.properties.template) + ']')
    }

    _config: IBakeConfig
    _ingredient: IIngredient
    _cli : cli
    _region: IBakeRegion
    _logger: Logger
    _name: string

    public async Execute(): Promise<string> {

        return this._name

    }

}