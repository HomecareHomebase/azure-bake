import { BakePackage, IBakeRegion, IBakeConfig, IBakeEnvironment } from "./bake-loader";
import cli from "azcli-npm";
import { Logger } from "./logger";

export class DeploymentContext {
    constructor(bake : BakePackage, region: IBakeRegion, azcli: cli, logger: Logger) {

        this._package = bake
        this._region = region
        this._cli = azcli
        this._logger = logger
    }

    _package: BakePackage
    _region: IBakeRegion
    _cli: cli
    _logger: Logger

    public get Config() : IBakeConfig {
        return this._package.Config
    }

    public get Environment(): IBakeEnvironment {
        return this._package.Environment
    }

    public get CLI(): cli {
        return this._cli
    }

    public get Region(): IBakeRegion {
        return this._region
    }
    
    public get Logger(): Logger {
        return this._logger
    }
}