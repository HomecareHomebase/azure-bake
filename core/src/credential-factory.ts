/**
 * Credential Factory - Abstraction layer for Azure authentication
 * 
 * This module provides a unified interface for creating both:
 * - Legacy ms-rest credentials (ApplicationTokenCredentials from @azure/ms-rest-nodeauth)
 * - Modern TokenCredential (from @azure/identity)
 * 
 * Phase 7.1 of the upgrade plan: introduce auth abstraction with no behavior change.
 * The factory ensures the same env var inputs produce equivalent auth behavior.
 */

import { IBakeAuthentication } from './bake-interfaces'
import { Logger } from './logger'

/**
 * Result of credential creation containing both legacy and modern credentials.
 * During the migration, code can use whichever type is needed.
 */
export interface BakeCredentials {
    /**
     * Legacy ms-rest-nodeauth credentials for older Azure SDK clients.
     * This is the ApplicationTokenCredentials instance used by @azure/arm-* v4 and earlier.
     */
    legacyCredentials: any

    /**
     * Modern TokenCredential for newer Azure SDK clients.
     * This is the ClientSecretCredential instance from @azure/identity.
     */
    modernCredentials: any

    /**
     * The tenant ID used for authentication.
     */
    tenantId: string

    /**
     * The subscription ID for resource operations.
     */
    subscriptionId: string
}

/**
 * Options for credential creation.
 */
export interface CredentialFactoryOptions {
    /**
     * Optional logger for auth-related messages.
     */
    logger?: Logger

    /**
     * If true, skip actual Azure login (for testing/mocked scenarios).
     */
    skipAuth?: boolean
}

/**
 * Error thrown when credential creation fails.
 */
export class CredentialFactoryError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message)
        this.name = 'CredentialFactoryError'
    }
}

/**
 * Factory for creating Azure credentials from Bake authentication config.
 * 
 * This abstraction allows the codebase to migrate from legacy @azure/ms-rest-nodeauth
 * to modern @azure/identity incrementally, without changing external behavior.
 * 
 * Usage:
 * ```typescript
 * const factory = new CredentialFactory()
 * const credentials = await factory.createCredentials(auth)
 * 
 * // For legacy clients:
 * new LegacyClient(credentials.legacyCredentials, subscriptionId)
 * 
 * // For modern clients:
 * new ModernClient(credentials.modernCredentials, subscriptionId)
 * ```
 */
export class CredentialFactory {
    private _logger: Logger

    constructor(options?: CredentialFactoryOptions) {
        this._logger = options?.logger || new Logger()
    }

    /**
     * Creates credentials from the Bake authentication configuration.
     * 
     * Returns both legacy and modern credential objects so that callers
     * can use whichever is appropriate for their SDK version.
     * 
     * @param auth - The Bake authentication configuration containing SP details
     * @param options - Optional configuration for the credential creation
     * @returns Promise resolving to BakeCredentials containing both credential types
     * @throws CredentialFactoryError if credential creation fails
     */
    async createCredentials(
        auth: IBakeAuthentication,
        options?: CredentialFactoryOptions
    ): Promise<BakeCredentials> {
        const effectiveOptions = { ...options }
        const skipAuth = effectiveOptions.skipAuth ?? auth.skipAuth

        if (skipAuth) {
            this._logger.log('Skipping Azure authentication (skipAuth=true)')
            return this._createSkippedCredentials(auth)
        }

        // Validate required auth parameters
        this._validateAuthConfig(auth)

        try {
            // Create legacy credentials (current behavior)
            const legacyCredentials = await this._createLegacyCredentials(auth)

            // Create modern credentials (for future migration)
            const modernCredentials = await this._createModernCredentials(auth)

            return {
                legacyCredentials,
                modernCredentials,
                tenantId: auth.tenantId,
                subscriptionId: auth.subscriptionId
            }
        } catch (error: any) {
            const message = `Azure authentication failed: ${error.message || error}`
            this._logger.error(message)
            throw new CredentialFactoryError(message, error)
        }
    }

    /**
     * Creates legacy credentials using @azure/ms-rest-nodeauth.
     * This preserves the current authentication behavior.
     */
    private async _createLegacyCredentials(auth: IBakeAuthentication): Promise<any> {
        // Dynamic import to avoid hard dependency at module load time
        const msRestNodeAuth = await import('@azure/ms-rest-nodeauth')
        
        return await msRestNodeAuth.loginWithServicePrincipalSecret(
            auth.serviceId,
            auth.secretKey,
            auth.tenantId
        )
    }

    /**
     * Creates modern credentials using @azure/identity.
     * This enables gradual migration to newer Azure SDK clients.
     */
    private async _createModernCredentials(auth: IBakeAuthentication): Promise<any> {
        // Dynamic import to allow the package to be optional initially
        try {
            const { ClientSecretCredential } = await import('@azure/identity')
            
            return new ClientSecretCredential(
                auth.tenantId,
                auth.serviceId,
                auth.secretKey
            )
        } catch (importError: any) {
            // If @azure/identity is not installed, return null
            // This allows gradual adoption during the migration
            this._logger.log('Note: @azure/identity not available, modern credentials skipped')
            return null
        }
    }

    /**
     * Creates placeholder credentials when auth is skipped.
     * Used for testing and mocked scenarios.
     */
    private _createSkippedCredentials(auth: IBakeAuthentication): BakeCredentials {
        const placeholderCredential = {
            getToken: async () => ({ token: 'skipped-auth-token', expiresOnTimestamp: Date.now() + 3600000 }),
            signRequest: async (request: any) => request
        }

        return {
            legacyCredentials: placeholderCredential,
            modernCredentials: placeholderCredential,
            tenantId: auth.tenantId || 'skipped-tenant',
            subscriptionId: auth.subscriptionId || 'skipped-subscription'
        }
    }

    /**
     * Validates that required authentication parameters are present.
     */
    private _validateAuthConfig(auth: IBakeAuthentication): void {
        const missing: string[] = []

        if (!auth.tenantId) missing.push('tenantId')
        if (!auth.serviceId) missing.push('serviceId')
        if (!auth.secretKey) missing.push('secretKey')
        if (!auth.subscriptionId) missing.push('subscriptionId')

        if (missing.length > 0) {
            throw new CredentialFactoryError(
                `Missing required authentication parameters: ${missing.join(', ')}`
            )
        }
    }

    /**
     * Validates that credentials are working by attempting a token acquisition.
     * This can be used to verify auth configuration before running deployments.
     * 
     * @param credentials - The credentials to validate
     * @returns Promise resolving to true if credentials are valid
     * @throws CredentialFactoryError if token acquisition fails
     */
    async validateCredentials(credentials: BakeCredentials): Promise<boolean> {
        // Test modern credentials if available
        if (credentials.modernCredentials && typeof credentials.modernCredentials.getToken === 'function') {
            try {
                const tokenResponse = await credentials.modernCredentials.getToken(
                    'https://management.azure.com/.default'
                )
                if (!tokenResponse || !tokenResponse.token) {
                    throw new CredentialFactoryError('Token acquisition returned empty result')
                }
                return true
            } catch (error: any) {
                throw new CredentialFactoryError(
                    `Credential validation failed: ${error.message || error}`,
                    error
                )
            }
        }

        // Fall back to legacy credential validation
        if (credentials.legacyCredentials && typeof credentials.legacyCredentials.getToken === 'function') {
            try {
                const tokenResponse = await credentials.legacyCredentials.getToken()
                if (!tokenResponse) {
                    throw new CredentialFactoryError('Legacy token acquisition returned empty result')
                }
                return true
            } catch (error: any) {
                throw new CredentialFactoryError(
                    `Legacy credential validation failed: ${error.message || error}`,
                    error
                )
            }
        }

        // If no credentials have getToken, assume they're placeholder/skipped
        return true
    }
}

/**
 * Helper function to determine if a credential object is a modern TokenCredential.
 * Useful for SDK version detection during migration.
 */
export function isModernCredential(credential: any): boolean {
    return credential && 
           typeof credential.getToken === 'function' &&
           credential.constructor?.name === 'ClientSecretCredential'
}

/**
 * Helper function to determine if a credential object is a legacy ApplicationTokenCredentials.
 */
export function isLegacyCredential(credential: any): boolean {
    return credential && 
           typeof credential.getToken === 'function' &&
           (credential.constructor?.name === 'ApplicationTokenCredentials' ||
            typeof credential.signRequest === 'function')
}
