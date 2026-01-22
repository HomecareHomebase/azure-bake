import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakeAuthentication,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger
} from '@azbake/core'

import { PropertyServicePlugIn } from '../src/plugin'
import * as clientModule from '../src/client'
import { Authenticator } from '../src/client'

// Require the index module to verify exports (CommonJS)
const propertyServiceIndex = require('../src/index')

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = new Logger(['test'], 'info')
    
    logger.log = (msg: string) => { logs.push(msg); }
    logger.error = (msg: string) => { errors.push(msg); }
    logger.debug = (msg: string) => { logs.push(msg); }

    return { logger, logs, errors }
}

function createContext(source?: BakeVariable, customToken?: string | null): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'pkg',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'Dev',
        environmentCode: 'dev',
        regions: [{ name: 'East', shortName: 'east', code: 'eus' }],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'service',
            secretKey: 'secret',
            certPath: '',
            skipAuth: true
        },
        variables: new Map(),
        logLevel: 'info'
    }

    const pkg: IBakePackage = {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }

    const defaultSource = source || new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any)

    const ingredient: IIngredient = {
        properties: {
            type: '@azbake/ingredient-property-service',
            source: defaultSource,
            parameters: new Map<string, BakeVariable>(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    const { logger } = createLogger()
    const context = new DeploymentContext({} as any, pkg, env.regions[0] as IBakeRegion, logger, ingredient)
    
    // Set custom auth token if provided
    if (customToken !== undefined) {
        (context as any)._customAuthToken = customToken
        Object.defineProperty(context, 'CustomAuthToken', {
            get: () => customToken,
            configurable: true
        })
    }

    return context
}

function createIngredient(source?: BakeVariable): IIngredient {
    const params = new Map<string, BakeVariable>()
    params.set('properties', new BakeVariable({
        create: [{ name: 'prop1', value: 'val1' }]
    } as any))
    
    return {
        properties: {
            type: '@azbake/ingredient-property-service',
            source: source || new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-property-service index exports', () => {
    it('exports plugin', () => {
        expect(propertyServiceIndex.plugin).to.not.be.undefined
        expect(typeof propertyServiceIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(propertyServiceIndex.pluginNS).to.equal('@azbake/ingredient-property-service')
    })

    it('plugin can be constructed from export', () => {
        const context = createContext(undefined, 'test-token')
        const ingredient = createIngredient()

        const Plugin = propertyServiceIndex.plugin
        const instance = new Plugin('test-plugin', ingredient, context)

        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test-plugin')
    })
})

describe('PropertyServiceSource', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Parse', () => {
        it('parses valid source with baseUrl and resourceUrl', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com',
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, 'test-token')

            const result = await clientModule.PropertyServiceSource.Parse(context)

            expect(result.baseUrl).to.equal('https://api.example.com')
            expect(result.resourceUrl).to.equal('https://resource.example.com')
        })

        it('rejects when source is null', async () => {
            const source = new BakeVariable(null as any)
            const context = createContext(source, 'test-token')

            try {
                await clientModule.PropertyServiceSource.Parse(context)
                expect.fail('Expected rejection')
            } catch (error) {
                expect(error).to.contain('properties.source is null')
            }
        })

        it('rejects when baseUrl is missing', async () => {
            const source = new BakeVariable({
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, 'test-token')

            try {
                await clientModule.PropertyServiceSource.Parse(context)
                expect.fail('Expected rejection')
            } catch (error) {
                expect(error).to.contain('does not contain a baseUrl')
            }
        })

        it('rejects when resourceUrl is missing', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com'
            } as any)
            const context = createContext(source, 'test-token')

            try {
                await clientModule.PropertyServiceSource.Parse(context)
                expect.fail('Expected rejection')
            } catch (error) {
                expect(error).to.contain('does not contain a resourceUrl')
            }
        })

        it('rejects when baseUrl is empty string', async () => {
            const source = new BakeVariable({
                baseUrl: '',
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, 'test-token')

            try {
                await clientModule.PropertyServiceSource.Parse(context)
                expect.fail('Expected rejection')
            } catch (error) {
                expect(error).to.contain('does not contain a baseUrl')
            }
        })

        it('rejects when resourceUrl is empty string', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com',
                resourceUrl: ''
            } as any)
            const context = createContext(source, 'test-token')

            try {
                await clientModule.PropertyServiceSource.Parse(context)
                expect.fail('Expected rejection')
            } catch (error) {
                expect(error).to.contain('does not contain a resourceUrl')
            }
        })
    })
})

describe('Authenticator', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Authenticate', () => {
        it('returns access token on successful authentication', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: 'mock-access-token' })
            }
            
            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').resolves(mockCredentials)

            const result = await authenticator.Authenticate('client-id', 'client-secret', 'domain', 'resource')

            expect(result).to.equal('mock-access-token')
        })

        it('throws error when Azure AD login fails', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').rejects(new Error('Azure AD login failed'))

            try {
                await authenticator.Authenticate('client-id', 'client-secret', 'domain', 'resource')
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Azure AD login failed')
            }
        })

        it('throws error when access token is empty', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: '' })
            }
            
            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').resolves(mockCredentials)

            try {
                await authenticator.Authenticate('client-id', 'client-secret', 'domain', 'resource')
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.contain('access token is null or empty')
            }
        })

        it('throws error when access token is null', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: null })
            }
            
            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').resolves(mockCredentials)

            try {
                await authenticator.Authenticate('client-id', 'client-secret', 'domain', 'resource')
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.contain('access token is null or empty')
            }
        })

        it('uses correct token audience in options', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: 'token' })
            }
            
            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            const loginStub = sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').resolves(mockCredentials)

            await authenticator.Authenticate('client-id', 'client-secret', 'domain', 'https://my-resource.com')

            expect(loginStub.calledOnce).to.be.true
            const options = loginStub.firstCall.args[3]
            expect(options.tokenAudience).to.equal('https://my-resource.com')
        })
    })
})

describe('PropertyServicePlugIn', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates plugin instance with required dependencies', () => {
            const context = createContext()
            const ingredient = createIngredient()

            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            expect(plugin).to.not.be.undefined
            expect(plugin._name).to.equal('test-plugin')
            expect(plugin._ctx).to.not.be.undefined
            expect(plugin._ctx.Environment.environmentName).to.equal('Dev')
        })
    })

    describe('Auth', () => {
        it('calls authenticator with correct parameters', async () => {
            const context = createContext(undefined, 'test-token')
            const ingredient = createIngredient()
            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: 'auth-token' })
            }
            
            const msRestNodeAuth = require('@azure/ms-rest-nodeauth')
            sandbox.stub(msRestNodeAuth, 'loginWithServicePrincipalSecret').resolves(mockCredentials)

            sandbox.stub(clientModule.PropertyServiceSource, 'Parse').resolves({
                baseUrl: 'https://api.example.com',
                resourceUrl: 'https://resource.example.com'
            } as clientModule.PropertyServiceSource)

            const auth: IBakeAuthentication = {
                subscriptionId: 'sub',
                tenantId: 'tenant-id',
                serviceId: 'service-id',
                secretKey: 'secret-key',
                certPath: '',
                skipAuth: false
            }

            const result = await plugin.Auth(auth)

            expect(result).to.equal('auth-token')
        })
    })

    describe('Execute', () => {
        it('throws error when access token is null', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com',
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, null)
            const ingredient = createIngredient()
            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            let caughtError: Error | null = null
            try {
                await plugin.Execute()
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.contain('access token is null or empty')
        })

        it('throws error when access token is empty string', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com',
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, '')
            const ingredient = createIngredient()
            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            let caughtError: Error | null = null
            try {
                await plugin.Execute()
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.contain('access token is null or empty')
        })

        it('logs deployment failure on error', async () => {
            const context = createContext(undefined, 'valid-token')
            const ingredient = createIngredient()
            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            // Force an error during initialization
            sandbox.stub(clientModule.PropertyServiceSource, 'Parse').rejects(new Error('Parse failed'))

            let caughtError: Error | null = null
            try {
                await plugin.Execute()
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.equal('Parse failed')
        })

        it('throws error when operations fail to load', async () => {
            const source = new BakeVariable({
                baseUrl: 'https://api.example.com',
                resourceUrl: 'https://resource.example.com'
            } as any)
            const context = createContext(source, 'valid-token')
            
            // Create ingredient with empty parameters so no operations are created
            const params = new Map<string, BakeVariable>()
            const ingredient: IIngredient = {
                properties: {
                    type: '@azbake/ingredient-property-service',
                    source: source,
                    parameters: params,
                    tokens: new Map(),
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }

            const plugin = new PropertyServicePlugIn('test-plugin', ingredient, context)

            let caughtError: Error | null = null
            try {
                await plugin.Execute()
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.contain('no property types have been specified')
        })
    })
})
