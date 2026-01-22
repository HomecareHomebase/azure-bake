import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { DeploymentContext } from '../src/deployment-context'
import { Logger } from '../src/logger'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '../src/bake-interfaces'
import { BakeVariable } from '../src/bake-variable'

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
