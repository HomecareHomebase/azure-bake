import { IBakeConfig, IIngredient, IBakeRegion } from "../bake-loader";
import cli from 'azcli-npm'
import { Logger } from "../logger";

export abstract class BaseIngredient {

    constructor(name: string, config: IBakeConfig, ingredient: IIngredient, azcli: cli, region: IBakeRegion, logger: Logger) {

        this._name = name
        this._config = config
        this._ingredient = ingredient
        this._cli = azcli
        this._region = region
        this._logger = new Logger(logger.getPre().concat(name))

        this._logger.log('adding ingredient type[' + ingredient.type +'] template[' + ingredient.template + ']')
    }

    _config: IBakeConfig
    _ingredient: IIngredient
    _cli : cli
    _region: IBakeRegion
    _logger: Logger
    _name: string

    public abstract async Execute(): Promise<boolean> 

}