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

    const testRegion: IBakeRegion = region || { name: 'East US', shortName: 'eastus', code: 'eus' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
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

        it('uses default resource group when resource group not specified in resource name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
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

            expect(capturedParams.planRG.value).to.equal('default-rg')
            expect(capturedParams.storageAccountRG.value).to.equal('default-rg')
            expect(capturedParams.appInsightsRG.value).to.equal('default-rg')
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
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
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

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'my-app-plan' },
                storageAccountName: { value: 'mystorageaccount' },
                appInsightsName: { value: 'my-app-insights' }
            })
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                DeployAlerts: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('my-function-app-plugin', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-function-app-plugin', params)).to.be.true
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            
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

            const paramError = new Error('Failed to convert params')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().rejects(paramError)
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
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
                expect(error.message).to.equal('Failed to convert params')
            }
        })

        it('handles resource_group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Could not resolve resource group')
            const mockUtils = {
                resource_group: sandbox.stub().rejects(rgError),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'my-app-plan' },
                storageAccountName: { value: 'mystorageaccount' },
                appInsightsName: { value: 'my-app-insights' }
            })
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
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
                expect(error.message).to.equal('Could not resolve resource group')
            }
        })

        it('deploys ARM template with all parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            params.set('location', new BakeVariable('eastus'))
            
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

            let capturedTemplate: any = null
            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = template
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appName: { value: 'my-function-app' },
                planName: { value: 'my-app-plan' },
                storageAccountName: { value: 'mystorageaccount' },
                appInsightsName: { value: 'my-app-insights' },
                location: { value: 'eastus' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate).to.not.be.null
            expect(capturedParams.appName.value).to.equal('my-function-app')
            expect(capturedParams.planName.value).to.equal('my-app-plan')
        })

        it('deploys ARM template with correct schema', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('function-app'))
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

            let capturedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = template
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                    appName: { value: 'function-app' },
                    planName: { value: 'my-app-plan' },
                    storageAccountName: { value: 'mystorageaccount' },
                    appInsightsName: { value: 'my-app-insights' }
                })
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify template structure
            expect(capturedTemplate.$schema).to.include('deploymentTemplate.json')
            expect(capturedTemplate.resources).to.be.an('array')
            expect(capturedTemplate.resources.length).to.be.greaterThan(0)
            expect(capturedTemplate.resources[0].type).to.equal('Microsoft.Web/sites')
            expect(capturedTemplate.resources[0].kind).to.equal('functionapp')
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function'))
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

            let capturedName: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name: string) => {
                capturedName = name
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                    appName: { value: 'my-function' },
                    planName: { value: 'my-app-plan' },
                    storageAccountName: { value: 'mystorageaccount' },
                    appInsightsName: { value: 'my-app-insights' }
                })
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new FunctionAppPlugin('my-deployment-name', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-deployment-name')
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

        it('deploys alerts with correct resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appName', new BakeVariable('my-function-app'))
            params.set('planName', new BakeVariable('my-app-plan'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('alerts-rg'),
                parseResource: sandbox.stub().callsFake((val: string) => ({ resource: val, resourceGroup: null }))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            let capturedRg: string = ''
            const mockDeployAlerts = sandbox.stub().callsFake((name: string, rg: string) => {
                capturedRg = rg
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

            expect(capturedRg).to.equal('alerts-rg')
        })

        it('handles alert deployment failure', async () => {
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

            const alertError = new Error('Alert deployment failed')
            const mockDeployAlerts = sandbox.stub().rejects(alertError)
            
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
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Alert deployment failed')
            }
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

        it('returns a promise', () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            // Mock ResourceManagementClient
            const mockClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            hostNames: ['my-function-app.azurewebsites.net']
                        }
                    })
                }
            }
            
            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockClient)
            
            const utils = new FunctionAppUtils(ctx)
            const result = utils.get_host_name('my-function-app')
            
            expect(result).to.be.a('promise')
            // Clean up the promise
            result.catch(() => {})
        })

        it('calls ResourceManagementClient with correct parameters', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            let capturedRg: string = ''
            let capturedName: string = ''
            const mockGet = sandbox.stub().callsFake((rg: string, provider: string, parentPath: string, type: string, name: string) => {
                capturedRg = rg
                capturedName = name
                return Promise.resolve({
                    properties: {
                        hostNames: ['my-function-app.azurewebsites.net']
                    }
                })
            })
            
            const mockClient = {
                resources: {
                    get: mockGet
                }
            }
            
            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockClient)
            
            const utils = new FunctionAppUtils(ctx)
            await utils.get_host_name('my-function-app')
            
            expect(capturedRg).to.equal('test-rg')
            expect(capturedName).to.equal('my-function-app')
        })

        it('returns the first host name from the function app', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            const mockClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            hostNames: ['my-function-app.azurewebsites.net', 'secondary.azurewebsites.net']
                        }
                    })
                }
            }
            
            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockClient)
            
            const utils = new FunctionAppUtils(ctx)
            const result = await utils.get_host_name('my-function-app')
            
            expect(result).to.equal('my-function-app.azurewebsites.net')
        })

        it('uses Microsoft.Web provider for function apps', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            let capturedProvider: string = ''
            let capturedType: string = ''
            const mockGet = sandbox.stub().callsFake((rg: string, provider: string, parentPath: string, type: string) => {
                capturedProvider = provider
                capturedType = type
                return Promise.resolve({
                    properties: {
                        hostNames: ['test.azurewebsites.net']
                    }
                })
            })
            
            const mockClient = {
                resources: {
                    get: mockGet
                }
            }
            
            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockClient)
            
            const utils = new FunctionAppUtils(ctx)
            await utils.get_host_name('test-fa')
            
            expect(capturedProvider).to.equal('Microsoft.Web')
            expect(capturedType).to.equal('sites')
        })

        it('handles API error gracefully', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
            const apiError = new Error('Function app not found')
            const mockClient = {
                resources: {
                    get: sandbox.stub().rejects(apiError)
                }
            }
            
            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockClient)
            
            const utils = new FunctionAppUtils(ctx)
            
            try {
                await utils.get_host_name('non-existent-fa')
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Function app not found')
            }
        })

        it('uses context auth token for client initialization', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            
                let clientCalled = false
                let capturedSubId: any = null
            
            const armResources = require('@azure/arm-resources')
                const clientStub = sandbox.stub(armResources, 'ResourceManagementClient').callsFake((...args: any[]) => {
                    clientCalled = true
                    capturedSubId = args[1]
                return {
                    resources: {
                        get: sandbox.stub().resolves({
                            properties: {
                                hostNames: ['test.azurewebsites.net']
                            }
                        })
                    }
                }
            })
            
            const utils = new FunctionAppUtils(ctx)
            await utils.get_host_name('test-fa')
            
            expect(clientStub.called).to.be.true
                expect(clientCalled).to.be.true
            expect(capturedSubId).to.equal('test-sub-id')
        })
    })
})
