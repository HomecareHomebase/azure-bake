import { IBakePackage, IBakeRegion, IBakeConfig, IBakeEnvironment } from "./bake-interfaces";
import { Logger } from "./logger";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import { IIngredient } from ".";

export class DeploymentContext {
    constructor(auth: ApplicationTokenCredentials, bake : IBakePackage, 
        region: IBakeRegion, logger: Logger, ingredient: IIngredient = <IIngredient>{}) {

        this._package = bake
        this._region = region
        this._logger = logger
        this._auth = auth
        this._ingredient = ingredient
    }

    _package: IBakePackage
    _ingredient: IIngredient
    _region: IBakeRegion
    _logger: Logger
    _auth: ApplicationTokenCredentials

    public get Config() : IBakeConfig {
        return this._package.Config
    }

    public get Environment(): IBakeEnvironment {
        return this._package.Environment
    }
    public get Package(): IBakePackage {
        return this._package
    }

    public get Region(): IBakeRegion {
        return this._region
    }
    
    public get Logger(): Logger {
        return this._logger
    }

    public get AuthToken(): ApplicationTokenCredentials {
        return this._auth
    }
    
    public get Ingredient(): IIngredient {
        return this._ingredient
    }
}