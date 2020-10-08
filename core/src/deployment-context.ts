import { IBakePackage, IBakeRegion, IBakeConfig, IBakeEnvironment } from "./bake-interfaces";
import { Logger } from "./logger";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import { IIngredient } from ".";

export class DeploymentContext {
    constructor(auth: ApplicationTokenCredentials, bake : IBakePackage, 
        region: IBakeRegion = <IBakeRegion>{} , logger: Logger, ingredient: IIngredient = <IIngredient>{}, customAuthToken: string | null = null) {

        this._package = bake
        this._region = region
        this._logger = logger
        this._auth = auth
        this._ingredient = ingredient
        this._authToken = customAuthToken
    }

    _package: IBakePackage
    _ingredient: IIngredient
    _region: IBakeRegion
    _logger: Logger
    _auth: ApplicationTokenCredentials
    _authToken: string | null

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

    public get CustomAuthToken(): string | null {
        return this._authToken
    }
    public set CustomAuthToken(token: string | null) {
        this._authToken = token;
    }
}