import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { DeploymentContext } from '../src/deployment-context'
import { Logger } from '../src/logger'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '../src/bake-interfaces'
import { BakeVariable } from '../src/bake-variable'
import { BakeCredentials } from '../src/credential-factory'

function createConfig(): IBakeConfig {
    return {
        name: 'test-recipe',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map(),
        owner: 'test-owner'
    }
}

function createEnvironment(): IBakeEnvironment {
    return {
        toolVersion: '2.0.0',
        environmentName: 'dev',
        environmentCode: 'dv',
        regions: [],
        authentication: {
            subscriptionId: 'sub-123',
            tenantId: 'tenant-456',
            serviceId: 'service-789',
            secretKey: 'secret',
            certPath: '',
            skipAuth: true
        },
        variables: new Map(),
        logLevel: 'info'
    }
}

function createPackage(config: IBakeConfig, env: IBakeEnvironment): IBakePackage {
    return {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }
}

function createIngredient(): IIngredient {
    return {
        properties: {
            type: 'test-ingredient',
            source: new BakeVariable('./src'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '1.0.0'
    }
}

function createRegion(): IBakeRegion {
    return { name: 'East US', shortName: 'eastus', code: 'eus' }
}

describe('DeploymentContext', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('initializes with all parameters', () => {
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const region = createRegion()
            const logger = new Logger(['prefix'], 'debug')
            const ingredient = createIngredient()
            const mockAuth = { getToken: sandbox.stub() } as any
            const customToken = 'custom-token-123'

            const ctx = new DeploymentContext(mockAuth, pkg, region, logger, ingredient, customToken)

            expect(ctx.Package).to.equal(pkg)
            expect(ctx.Region).to.equal(region)
            expect(ctx.Logger).to.equal(logger)
            expect(ctx.AuthToken).to.equal(mockAuth)
            expect(ctx.Ingredient).to.equal(ingredient)
            expect(ctx.CustomAuthToken).to.equal(customToken)
        })

        it('initializes with default empty ingredient and null custom token', () => {
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const region = createRegion()
            const logger = new Logger()
            const mockAuth = { getToken: sandbox.stub() } as any

            const ctx = new DeploymentContext(mockAuth, pkg, region, logger)

            expect(ctx.Ingredient).to.deep.equal({})
            expect(ctx.CustomAuthToken).to.equal(null)
        })
    })

    describe('Config getter', () => {
        it('returns the package config', () => {
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const ctx = new DeploymentContext({} as any, pkg, createRegion(), new Logger())

            expect(ctx.Config).to.equal(config)
            expect(ctx.Config.name).to.equal('test-recipe')
            expect(ctx.Config.shortName).to.equal('tst')
        })
    })

    describe('Environment getter', () => {
        it('returns the package environment', () => {
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const ctx = new DeploymentContext({} as any, pkg, createRegion(), new Logger())

            expect(ctx.Environment).to.equal(env)
            expect(ctx.Environment.environmentName).to.equal('dev')
            expect(ctx.Environment.environmentCode).to.equal('dv')
        })
    })

    describe('Package getter', () => {
        it('returns the full bake package', () => {
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const ctx = new DeploymentContext({} as any, pkg, createRegion(), new Logger())

            expect(ctx.Package).to.equal(pkg)
            expect(ctx.Package.Config).to.equal(config)
            expect(ctx.Package.Environment).to.equal(env)
        })
    })

    describe('Region getter', () => {
        it('returns the deployment region', () => {
            const region = createRegion()
            const ctx = new DeploymentContext({} as any, createPackage(createConfig(), createEnvironment()), region, new Logger())

            expect(ctx.Region).to.equal(region)
            expect(ctx.Region.name).to.equal('East US')
            expect(ctx.Region.shortName).to.equal('eastus')
            expect(ctx.Region.code).to.equal('eus')
        })
    })

    describe('Logger getter', () => {
        it('returns the logger instance', () => {
            const logger = new Logger(['test-prefix'], 'debug')
            const ctx = new DeploymentContext({} as any, createPackage(createConfig(), createEnvironment()), createRegion(), logger)

            expect(ctx.Logger).to.equal(logger)
            expect(ctx.Logger.getPre()).to.deep.equal(['test-prefix'])
            expect(ctx.Logger.getLogLevel()).to.equal('debug')
        })
    })

    describe('AuthToken getter', () => {
        it('returns the authentication token credentials', () => {
            const mockAuth = { 
                getToken: sandbox.stub().resolves('token'),
                signRequest: sandbox.stub()
            } as any
            const ctx = new DeploymentContext(mockAuth, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger())

            expect(ctx.AuthToken).to.equal(mockAuth)
        })

        it('returns legacy credentials when BakeCredentials is passed', () => {
            const legacyMock = { getToken: sandbox.stub().resolves('legacy-token') }
            const modernMock = { getToken: sandbox.stub().resolves({ token: 'modern-token' }) }
            const bakeCredentials: BakeCredentials = {
                legacyCredentials: legacyMock,
                modernCredentials: modernMock,
                tenantId: 'test-tenant',
                subscriptionId: 'test-sub'
            }
            const ctx = new DeploymentContext(bakeCredentials, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger())

            expect(ctx.AuthToken).to.equal(legacyMock)
        })
    })

    describe('Credentials getter', () => {
        it('returns BakeCredentials when passed as auth', () => {
            const legacyMock = { getToken: sandbox.stub().resolves('legacy-token') }
            const modernMock = { getToken: sandbox.stub().resolves({ token: 'modern-token' }) }
            const bakeCredentials: BakeCredentials = {
                legacyCredentials: legacyMock,
                modernCredentials: modernMock,
                tenantId: 'test-tenant',
                subscriptionId: 'test-sub'
            }
            const ctx = new DeploymentContext(bakeCredentials, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger())

            expect(ctx.Credentials.legacyCredentials).to.equal(legacyMock)
            expect(ctx.Credentials.modernCredentials).to.equal(modernMock)
            expect(ctx.Credentials.tenantId).to.equal('test-tenant')
            expect(ctx.Credentials.subscriptionId).to.equal('test-sub')
        })

        it('wraps legacy credentials as BakeCredentials when raw credential passed', () => {
            const mockAuth = { 
                getToken: sandbox.stub().resolves('token'),
                signRequest: sandbox.stub()
            } as any
            const config = createConfig()
            const env = createEnvironment()
            const pkg = createPackage(config, env)
            const ctx = new DeploymentContext(mockAuth, pkg, createRegion(), new Logger())

            // AuthToken should return the raw credential
            expect(ctx.AuthToken).to.equal(mockAuth)
            
            // Credentials should wrap it
            expect(ctx.Credentials.legacyCredentials).to.equal(mockAuth)
            expect(ctx.Credentials.modernCredentials).to.equal(mockAuth)
            expect(ctx.Credentials.tenantId).to.equal(env.authentication.tenantId)
            expect(ctx.Credentials.subscriptionId).to.equal(env.authentication.subscriptionId)
        })

        it('uses empty strings for tenantId/subscriptionId when package is undefined', () => {
            const mockAuth = { getToken: sandbox.stub() } as any
            // Create a minimal package without proper environment
            const minimalPkg = {
                Config: createConfig(),
                Environment: {} as IBakeEnvironment,
                Authenticate: async () => true
            }
            const ctx = new DeploymentContext(mockAuth, minimalPkg, createRegion(), new Logger())

            expect(ctx.Credentials.legacyCredentials).to.equal(mockAuth)
            expect(ctx.Credentials.tenantId).to.equal('')
            expect(ctx.Credentials.subscriptionId).to.equal('')
        })
    })

    describe('Ingredient getter', () => {
        it('returns the ingredient when provided', () => {
            const ingredient = createIngredient()
            const ctx = new DeploymentContext({} as any, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger(), ingredient)

            expect(ctx.Ingredient).to.equal(ingredient)
            expect(ctx.Ingredient.properties.type).to.equal('test-ingredient')
        })

        it('returns empty object when not provided', () => {
            const ctx = new DeploymentContext({} as any, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger())

            expect(ctx.Ingredient).to.deep.equal({})
        })
    })

    describe('CustomAuthToken getter/setter', () => {
        it('returns the custom auth token when provided in constructor', () => {
            const ctx = new DeploymentContext(
                {} as any, 
                createPackage(createConfig(), createEnvironment()), 
                createRegion(), 
                new Logger(),
                createIngredient(),
                'initial-token'
            )

            expect(ctx.CustomAuthToken).to.equal('initial-token')
        })

        it('allows setting a new custom auth token', () => {
            const ctx = new DeploymentContext({} as any, createPackage(createConfig(), createEnvironment()), createRegion(), new Logger())

            expect(ctx.CustomAuthToken).to.equal(null)
            
            ctx.CustomAuthToken = 'new-token-456'
            expect(ctx.CustomAuthToken).to.equal('new-token-456')
        })

        it('allows setting custom auth token to null', () => {
            const ctx = new DeploymentContext(
                {} as any, 
                createPackage(createConfig(), createEnvironment()), 
                createRegion(), 
                new Logger(),
                createIngredient(),
                'existing-token'
            )

            expect(ctx.CustomAuthToken).to.equal('existing-token')
            
            ctx.CustomAuthToken = null
            expect(ctx.CustomAuthToken).to.equal(null)
        })
    })
})
