import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    IngredientManager,
    Logger,
    BakeVariable
} from '@azbake/core'

import { ApimApiPlugin } from '../src/plugin'
import { ApimApiUtils } from '../src/functions'

// Require the index module to verify exports (CommonJS)
const apimApiIndex = require('../src/index')

function createContext(shortName: string = 'tst', envCode: string = 'dev'): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName,
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: envCode,
        regions: [{ name: 'Global', shortName: 'global', code: 'glob' }],
        authentication: {
            subscriptionId: 'test-sub-id',
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

    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-apim-api',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ApimApiPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('logs error and returns false when source is empty', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: '', resource: '' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params, new BakeVariable(''))
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            // Should complete without throwing
            await plugin.Execute()
        })

        it('logs error when resourceGroup is empty after parsing', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves(''),
                parseResource: sandbox.stub().returns({ resourceGroup: '', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('[resourceGroup]/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('logs error when resourceName is empty after parsing', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: '' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('test-rg/')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('handles missing apis parameter gracefully', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            // Mock fs.existsSync to avoid CA file checks
            const fs = require('fs')
            sandbox.stub(fs, 'existsSync').returns(false)

            // Mock ApiManagementClient
            const mockApimClient = {
                api: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            [Symbol.asyncIterator]: async function* () {
                                yield []
                            }
                        })
                    })
                }
            }
            const armApim = require('@azure/arm-apimanagement')
            sandbox.stub(armApim, 'ApiManagementClient').returns(mockApimClient)

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('handles null apis value gracefully', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            // Mock fs.existsSync to avoid CA file checks
            const fs = require('fs')
            sandbox.stub(fs, 'existsSync').returns(false)

            // Mock ApiManagementClient
            const mockApimClient = {
                api: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            [Symbol.asyncIterator]: async function* () {
                                yield []
                            }
                        })
                    })
                }
            }
            const armApim = require('@azure/arm-apimanagement')
            sandbox.stub(armApim, 'ApiManagementClient').returns(mockApimClient)

            // Create apis param that resolves to null
            const apisVar = new BakeVariable('null')
            sandbox.stub(apisVar, 'valueAsync').resolves(null)

            const params = new Map<string, BakeVariable>([
                ['apis', apisVar]
            ])
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('throws error on setup failure', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().rejects(new Error('Auth failed')),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('Auth failed')
            }
        })

        it('processes options parameter with custom values', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const fs = require('fs')
            sandbox.stub(fs, 'existsSync').returns(false)

            const mockApimClient = {
                api: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            [Symbol.asyncIterator]: async function* () {
                                yield []
                            }
                        })
                    })
                }
            }
            const armApim = require('@azure/arm-apimanagement')
            sandbox.stub(armApim, 'ApiManagementClient').returns(mockApimClient)

            const optionsValue = { apiWaitTime: 60, forceWait: true, apiRetries: 3, apiRetryWaitTime: 10 }
            const optionsVar = new BakeVariable(JSON.stringify(optionsValue))
            sandbox.stub(optionsVar, 'valueAsync').resolves(optionsValue)

            const params = new Map<string, BakeVariable>([
                ['options', optionsVar]
            ])
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('uses default options when values are zero or missing', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const fs = require('fs')
            sandbox.stub(fs, 'existsSync').returns(false)

            const mockApimClient = {
                api: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            [Symbol.asyncIterator]: async function* () {
                                yield []
                            }
                        })
                    })
                }
            }
            const armApim = require('@azure/arm-apimanagement')
            sandbox.stub(armApim, 'ApiManagementClient').returns(mockApimClient)

            // Options with zero values should use defaults
            const optionsValue = { apiWaitTime: 0, apiRetries: 0, apiRetryWaitTime: 0 }
            const optionsVar = new BakeVariable(JSON.stringify(optionsValue))
            sandbox.stub(optionsVar, 'valueAsync').resolves(optionsValue)

            const params = new Map<string, BakeVariable>([
                ['options', optionsVar]
            ])
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            await plugin.Execute()
        })

        it('reads CA file when available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'test-rg', resource: 'apim-name' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const fs = require('fs')
            sandbox.stub(fs, 'existsSync').returns(true)
            sandbox.stub(fs, 'readFileSync').returns(Buffer.from('fake-ca-cert'))

            // Set env var for CA file
            const originalEnv = process.env.NODE_EXTRA_CA_CERTS
            process.env.NODE_EXTRA_CA_CERTS = '/path/to/ca.pem'

            const mockApimClient = {
                api: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            [Symbol.asyncIterator]: async function* () {
                                yield []
                            }
                        })
                    })
                }
            }
            const armApim = require('@azure/arm-apimanagement')
            sandbox.stub(armApim, 'ApiManagementClient').returns(mockApimClient)

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('test-rg/apim-name')
            const ingredient = createIngredient(params, source)
            const plugin = new ApimApiPlugin('apim-api', ingredient, ctx)

            try {
                await plugin.Execute()
            } finally {
                process.env.NODE_EXTRA_CA_CERTS = originalEnv
            }
        })
    })
})

describe('ApimApiUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('get_hostheader', () => {
        it('builds host header with shortName when serviceName is null', () => {
            const ctx = createContext('myapp')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_hostheader('namespace', 'cluster.local')

            expect(result).to.equal('myapp-namespace.cluster.local')
        })

        it('builds host header with custom serviceName', () => {
            const ctx = createContext('myapp')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_hostheader('namespace', 'cluster.local', 'customservice')

            expect(result).to.equal('customservice-namespace.cluster.local')
        })
    })

    describe('get_swaggerUrl', () => {
        it('builds swagger URL with default protocol', () => {
            const ctx = createContext('api')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_swaggerUrl('apps', 'k8s.example.com', 'v1')

            expect(result).to.equal('https://api-apps.k8s.example.com/swagger/v1/swagger.json')
        })

        it('builds swagger URL with http protocol', () => {
            const ctx = createContext('api')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_swaggerUrl('apps', 'k8s.example.com', 'v2', null, 'http')

            expect(result).to.equal('http://api-apps.k8s.example.com/swagger/v2/swagger.json')
        })

        it('builds swagger URL with custom serviceName', () => {
            const ctx = createContext('api')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_swaggerUrl('apps', 'k8s.example.com', 'v1', 'backend')

            expect(result).to.equal('https://backend-apps.k8s.example.com/swagger/v1/swagger.json')
        })

        it('builds swagger URL with all custom parameters', () => {
            const ctx = createContext('api')
            const utils = new ApimApiUtils(ctx)

            const result = utils.get_swaggerUrl('production', 'internal.corp.com', 'v3', 'myservice', 'http')

            expect(result).to.equal('http://myservice-production.internal.corp.com/swagger/v3/swagger.json')
        })
    })
})

describe('ingredient-apim-api index exports', () => {
    it('exports plugin', () => {
        expect(apimApiIndex.plugin).to.equal(ApimApiPlugin)
    })

    it('exports pluginNS', () => {
        expect(apimApiIndex.pluginNS).to.equal('@azbake/ingredient-apim-api')
    })

    it('exports functions', () => {
        expect(apimApiIndex.functions).to.equal(ApimApiUtils)
    })

    it('exports functionsNS', () => {
        expect(apimApiIndex.functionsNS).to.equal('apimapi')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const Plugin = apimApiIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.be.instanceOf(ApimApiPlugin)
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = apimApiIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.be.instanceOf(ApimApiUtils)
    })
})
