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

import { MetricAlertPlugin } from '../src/plugin'
import { MetricAlertUtils } from '../src/functions'

// Require the compiled modules to verify exports
const metricAlertIndex = require('../dist/index')

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

    const testRegion: IBakeRegion = region || { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-metric-alert',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-metric-alert index exports', () => {
    it('exports plugin', () => {
        expect(metricAlertIndex.plugin).to.not.be.undefined
        expect(typeof metricAlertIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(metricAlertIndex.pluginNS).to.equal('@azbake/ingredient-metric-alert')
    })

    it('exports functions', () => {
        expect(metricAlertIndex.functions).to.not.be.undefined
        expect(typeof metricAlertIndex.functions).to.equal('function')
        expect(metricAlertIndex.functions.name).to.equal('MetricAlertUtils')
    })

    it('exports functionsNS', () => {
        expect(metricAlertIndex.functionsNS).to.equal('metricalert')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = metricAlertIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = metricAlertIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('MetricAlertUtils', () => {
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
            const utils = new MetricAlertUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })
})

describe('MetricAlertPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with correct name', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new MetricAlertPlugin('test-name', ingredient, ctx)

            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
        })

        it('stores ingredient reference', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)

            expect(plugin._ingredient).to.equal(ingredient)
        })
    })

    describe('Execute', () => {
        it('deploys metric alert successfully with valid parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployAlert = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployAlert.called).to.be.true
        })

        it('passes correct resource name to DeployAlert', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedResourceName: string = ''
            const mockDeployAlert = sandbox.stub().callsFake((name, rg, resourceName) => {
                capturedResourceName = resourceName
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedResourceName).to.equal('myeventhub')
        })

        it('passes correct resource group to DeployAlert', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('my-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedResourceGroup: string = ''
            const mockDeployAlert = sandbox.stub().callsFake((name, rg) => {
                capturedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedResourceGroup).to.equal('my-resource-group')
        })

        it('passes params to DeployAlert', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.Storage/storageAccounts'))
            params.set('timeAggregation', new BakeVariable('Total'))
            params.set('metricName', new BakeVariable('Transactions'))
            params.set('threshold', new BakeVariable('100'))
            
            const source = new BakeVariable('[myresourcegroup]/mystorage')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'mystorage' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployAlert = sandbox.stub().callsFake((name, rg, resourceName, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.Storage/storageAccounts' },
                'timeAggregation': { value: 'Total' },
                'metricName': { value: 'Transactions' },
                'threshold': { value: '100' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams['source-type'].value).to.equal('Microsoft.Storage/storageAccounts')
            expect(capturedParams['timeAggregation'].value).to.equal('Total')
            expect(capturedParams['metricName'].value).to.equal('Transactions')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Metric alert deployment failed')
            const mockDeployAlert = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Metric alert deployment failed')
            }
        })

        it('logs source type and resource details', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.Web/sites'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('Http5xx'))
            
            const source = new BakeVariable('[production-rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'production-rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployAlert = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.Web/sites' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'Http5xx' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // The plugin should execute successfully and parse resource
            expect(mockUtils.parseResource.called).to.be.true
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedDeploymentName: string = ''
            const mockDeployAlert = sandbox.stub().callsFake((name) => {
                capturedDeploymentName = name
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployAlert: mockDeployAlert,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('my-alert-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedDeploymentName).to.equal('my-alert-deployment')
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const paramError = new Error('Parameter conversion failed')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().rejects(paramError)
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('handles resource group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Resource group resolution failed')
            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().rejects(rgError)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'Microsoft.EventHub/namespaces' },
                'timeAggregation': { value: 'Average' },
                'metricName': { value: 'IncomingMessages' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Resource group resolution failed')
            }
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.EventHub/namespaces'))
            params.set('timeAggregation', new BakeVariable('Average'))
            params.set('metricName', new BakeVariable('IncomingMessages'))
            
            const source = new BakeVariable('[myresourcegroup]/myeventhub')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'myeventhub' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedCtx: any = null
            const ARMHelperStub = sandbox.stub().callsFake((ctxArg: any) => {
                capturedCtx = ctxArg
                return {
                    DeployAlert: sandbox.stub().resolves({}),
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                        'source-type': { value: 'Microsoft.EventHub/namespaces' },
                        'timeAggregation': { value: 'Average' },
                        'metricName': { value: 'IncomingMessages' }
                    })
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new MetricAlertPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })
    })
})
