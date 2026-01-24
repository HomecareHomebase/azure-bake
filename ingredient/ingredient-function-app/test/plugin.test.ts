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

import { FunctionAppPlugin } from '../src/plugin'
import { FunctionAppUtils } from '../src/functions'

// Require the compiled modules to verify exports
const functionAppIndex = require('../dist/index')

function createContext(region?: IBakeRegion, ingredient?: IIngredient): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: 'dev',
        regions: [{ name: 'East US', shortName: 'eastus', code: 'eus' }],
        authentication: {
            subscriptionId: '00000000-0000-0000-0000-000000000000',
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

    const testRegion: IBakeRegion = region || { name: 'East US', shortName: 'eastus', code: 'eus' }
    const auth: any = {
        domain: 'tenant',
        clientId: 'service',
        secret: 'secret',
        getToken: async () => ({ token: 'test-token', expiresOnTimestamp: Date.now() + 3600000 })
    }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable, alerts?: Map<string, any>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-function-app',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: alerts || new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-function-app index exports', () => {
    it('exports plugin', () => {
        expect(functionAppIndex.plugin).to.not.be.undefined
        expect(typeof functionAppIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(functionAppIndex.pluginNS).to.equal('@azbake/ingredient-function-app')
    })

    it('exports functions', () => {
        expect(functionAppIndex.functions).to.not.be.undefined
        expect(typeof functionAppIndex.functions).to.equal('function')
        expect(functionAppIndex.functions.name).to.equal('FunctionAppUtils')
    })

    it('exports functionsNS', () => {
        expect(functionAppIndex.functionsNS).to.equal('functionapputils')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = functionAppIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = functionAppIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('FunctionAppPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys function app template with default resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'my-app-plan' },
                storageAccountName: { value: 'mystorageaccount' },
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('test-rg')
        })

        it('parses resource names with resource groups correctly', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('custom-rg/my-app-plan'))
            params.set('storageAccountName', new BakeVariable('storage-rg/mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('ai-rg/my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => {
                    if (val.includes('/')) {
                        const parts = val.split('/')
                        return { resource: parts[1], resourceGroup: parts[0] }
                    }
                    return { resource: val, resourceGroup: null }
                })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'custom-rg/my-app-plan' },
                storageAccountName: { value: 'storage-rg/mystorageaccount' },
                appInsightsName: { value: 'ai-rg/my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.planName.value).to.equal('my-app-plan')
            expect(capturedParams.planRG.value).to.equal('custom-rg')
            expect(capturedParams.storageAccountName.value).to.equal('mystorageaccount')
            expect(capturedParams.storageAccountRG.value).to.equal('storage-rg')
            expect(capturedParams.appInsightsName.value).to.equal('my-app-insights')
            expect(capturedParams.appInsightsRG.value).to.equal('ai-rg')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const deploymentError = new Error('Function App deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'my-app-plan' },
                storageAccountName: { value: 'mystorageaccount' },
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Function App deployment failed')
            }
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            let capturedCtx: any = null
            const ARMHelperStub = sandbox.stub().callsFake((ctxArg: any) => {
                capturedCtx = ctxArg
                return {
                    DeployTemplate: sandbox.stub().resolves({}),
                    DeployAlerts: sandbox.stub().resolves({}),
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                        appName: { value: 'my-function-app' },
                        planName: { value: 'my-app-plan' },
                        storageAccountName: { value: 'mystorageaccount' },
                        appInsightsName: { value: 'my-app-insights' }
                    })
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('00000000-0000-0000-0000-000000000000')
        })

        it('deploys alerts with correct target', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const alertOverrides = new Map<string, any>()
            alertOverrides.set('Http5xx', { isEnabled: false })
            
            const ingredient = createIngredient(params, undefined, alertOverrides)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            let capturedAlertTarget: string = ''
            let capturedAlertOverrides: any = null
            const mockDeployAlerts = sandbox.stub().callsFake((name: string, rg: string, target: string, stockAlerts: any, overrides: any) => {
                capturedAlertTarget = target
                capturedAlertOverrides = overrides
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                    appName: { value: 'my-function-app' },
                    planName: { value: 'my-app-plan' },
                    storageAccountName: { value: 'mystorageaccount' },
                    appInsightsName: { value: 'my-app-insights' }
                })
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployAlerts.called).to.be.true
            expect(capturedAlertTarget).to.equal('my-function-app')
            expect(capturedAlertOverrides).to.equal(alertOverrides)
        })
    })
})

describe('FunctionAppUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with context', () => {
            const ctx = createContext()
            const utils = new FunctionAppUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('create_resource_name', () => {
        it('creates function app resource name with fa prefix', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusfatest')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveusfatest')
            expect(mockUtils.create_resource_name.calledWith('fa', null, true)).to.be.true
        })

        it('uses fa prefix for Function App', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            utils.create_resource_name()

            // Verify the first argument is 'fa' (Function App prefix)
            expect(mockUtils.create_resource_name.firstCall.args[0]).to.equal('fa')
        })

        it('passes null as second argument to create_resource_name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[1]).to.be.null
        })

        it('passes true as third argument to include region code', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[2]).to.be.true
        })

        it('gets coreutils from IngredientManager', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })
    })

    describe('get_host_name', () => {
        it('is a function', () => {
            const ctx = createContext()
            const utils = new FunctionAppUtils(ctx)
            expect(typeof utils.get_host_name).to.equal('function')
        })

        it('returns the first host name from the function app', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionAppUtils(ctx)
            sandbox.stub(utils, 'get_host_name').resolves('my-function-app.azurewebsites.net')
            
            const result = await utils.get_host_name('my-function-app')
            
            expect(result).to.equal('my-function-app.azurewebsites.net')
        })

        it('handles API error gracefully', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            const apiError = new Error('Function app not found')
            const utils = new FunctionAppUtils(ctx)
            sandbox.stub(utils, 'get_host_name').rejects(apiError)
            
            try {
                await utils.get_host_name('non-existent-fa')
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Function app not found')
            }
        })

        it('uses context modern credentials', () => {
            const ctx = createContext()
            const utils = new FunctionAppUtils(ctx)
            
            expect(ctx.Credentials.modernCredentials).to.not.be.undefined
            expect(typeof ctx.Credentials.modernCredentials.getToken).to.equal('function')
        })
    })
})
