import { IBakePackage, IBakeRegion, IBakeConfig, IBakeEnvironment } from "./bake-interfaces";
import { Logger } from "./logger";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

export class DeploymentContext {
    constructor(auth: TokenCredentialsBase, bake : IBakePackage, region: IBakeRegion, logger: Logger) {

        this._package = bake
        this._region = region
        this._logger = logger
        this._auth = auth
    }

    _package: IBakePackage
    _region: IBakeRegion
    _logger: Logger
    _auth: TokenCredentialsBase

    public get Config() : IBakeConfig {
        return this._package.Config
    }

    public get Environment(): IBakeEnvironment {
        return this._package.Environment
    }

    public get Region(): IBakeRegion {
        return this._region
    }
    
    public get Logger(): Logger {
        return this._logger
    }

    public get AuthToken(): TokenCredentialsBase {
        return this._auth
    }
}