import { IBakePackage, IBakeRegion, IBakeConfig, IBakeEnvironment } from "./bake-interfaces";
import { Logger } from "./logger";
import { IIngredient } from ".";
import { BakeCredentials } from "./credential-factory";

export class DeploymentContext {
    /**
     * Creates a new DeploymentContext.
     * 
     * @param auth - Authentication credentials. Can be:
     *   - BakeCredentials (modern, from CredentialFactory)
     *   - ApplicationTokenCredentials (legacy, from @azure/ms-rest-nodeauth)
     *   - Any object with a getToken method (for testing/mocking)
     * @param bake - The bake package containing config and environment
     * @param region - The deployment region
     * @param logger - Logger instance
     * @param ingredient - Optional ingredient being executed
     * @param customAuthToken - Optional custom auth token for ingredient-specific auth
     */
    constructor(auth: BakeCredentials | any, bake : IBakePackage, 
        region: IBakeRegion = <IBakeRegion>{} , logger: Logger, ingredient: IIngredient = <IIngredient>{}, customAuthToken: string | null = null) {

        this._package = bake
        this._region = region
        this._logger = logger
        this._credentials = this._normalizeCredentials(auth)
        this._ingredient = ingredient
        this._authToken = customAuthToken
    }

    _package: IBakePackage
    _ingredient: IIngredient
    _region: IBakeRegion
    _logger: Logger
    _credentials: BakeCredentials
    _authToken: string | null

    /**
     * Normalizes various credential formats into BakeCredentials.
     * This allows backward compatibility with code that passes raw ApplicationTokenCredentials.
     */
    private _normalizeCredentials(auth: BakeCredentials | any): BakeCredentials {
        // Check if it's already BakeCredentials (has both legacy and modern properties)
        if (auth && 'legacyCredentials' in auth && 'modernCredentials' in auth) {
            return auth as BakeCredentials
        }
        
        // Legacy: wrap raw credential (ApplicationTokenCredentials or mock) as BakeCredentials
        return {
            legacyCredentials: auth,
            modernCredentials: auth, // Same object for now; modern SDK may work with it
            tenantId: this._package?.Environment?.authentication?.tenantId || '',
            subscriptionId: this._package?.Environment?.authentication?.subscriptionId || ''
        }
    }

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

    /**
     * Returns the authentication credentials for use with Azure SDK clients.
     * 
     * For legacy Azure SDK clients (@azure/arm-* v4 and earlier), use this directly:
     *   new ResourceManagementClient(ctx.AuthToken, subscriptionId)
     * 
     * For modern Azure SDK clients (@azure/arm-* v5+), use Credentials.modernCredentials:
     *   new ResourceManagementClient(ctx.Credentials.modernCredentials, subscriptionId)
     * 
     * @returns The legacy credentials object (ApplicationTokenCredentials or compatible)
     */
    public get AuthToken(): any {
        return this._credentials.legacyCredentials
    }

    /**
     * Returns the full BakeCredentials object containing both legacy and modern credentials.
     * Use this when you need access to modern TokenCredential for newer Azure SDK clients.
     */
    public get Credentials(): BakeCredentials {
        return this._credentials
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