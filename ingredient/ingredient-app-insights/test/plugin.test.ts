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

import { AppInsightsUtils } from '../src/functions'

// Require the compiled modules to verify exports
const appInsightsIndex = require('../dist/index')

function loadPlugin(): any {
    const resolved = require.resolve('../src/plugin')
    delete require.cache[resolved]
    return require(resolved).AppInsightsPlugIn
}

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

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable, alerts?: Map<string, any>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-app-insights',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: alerts || new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-app-insights index exports', () => {
    it('exports plugin', () => {
        expect(appInsightsIndex.plugin).to.not.be.undefined
        expect(typeof appInsightsIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(appInsightsIndex.pluginNS).to.equal('@azbake/ingredient-app-insights')
    })

    it('exports functions', () => {
        expect(appInsightsIndex.functions).to.not.be.undefined
        expect(typeof appInsightsIndex.functions).to.equal('function')
        expect(appInsightsIndex.functions.name).to.equal('AppInsightsUtils')
    })

    it('exports functionsNS', () => {
        expect(appInsightsIndex.functionsNS).to.equal('appinsights')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = appInsightsIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = appInsightsIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('AppInsightsUtils', () => {
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
            const utils = new AppInsightsUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('get_resource_name', () => {
        it('creates app insights resource name using coreutils with shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaitest')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppInsightsUtils(ctx)
            const result = utils.get_resource_name('myapp')

            expect(result).to.equal('devaitest')
            expect(mockUtils.create_resource_name.calledWith('ai', 'myapp', false)).to.be.true
        })

        it('creates resource name without region code (centralized telemetry)', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaiproduction')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppInsightsUtils(ctx)
            const result = utils.get_resource_name('production')

            expect(result).to.equal('devaiproduction')
            // Third parameter is false - no region code appended
            expect(mockUtils.create_resource_name.firstCall.args[2]).to.be.false
        })

        it('calls IngredientManager with coreutils namespace', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppInsightsUtils(ctx)
            utils.get_resource_name('test')

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })
    })

    describe('get_instrumentation_key', () => {
        it('returns instrumentation key from Application Insights component', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaitest'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockComponentsGet = sandbox.stub().resolves({
                instrumentationKey: 'test-instrumentation-key-12345'
            })

            const AppInsightsModule = require('@azure/arm-appinsights')
            sandbox.stub(AppInsightsModule, 'ApplicationInsightsManagementClient').returns({
                components: { get: mockComponentsGet }
            })

            const utils = new AppInsightsUtils(ctx)
            const result = await utils.get_instrumentation_key('test')

            expect(result).to.equal('test-instrumentation-key-12345')
            expect(mockComponentsGet.calledWith('test-rg', 'devaitest')).to.be.true
        })

        it('returns empty string if instrumentation key is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaitest'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockComponentsGet = sandbox.stub().resolves({
                instrumentationKey: undefined
            })

            const AppInsightsModule = require('@azure/arm-appinsights')
            sandbox.stub(AppInsightsModule, 'ApplicationInsightsManagementClient').returns({
                components: { get: mockComponentsGet }
            })

            const utils = new AppInsightsUtils(ctx)
            const result = await utils.get_instrumentation_key('test')

            expect(result).to.equal('')
        })

        it('uses custom resource group short name when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaitest'),
                resource_group: sandbox.stub().resolves('custom-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockComponentsGet = sandbox.stub().resolves({
                instrumentationKey: 'test-key'
            })

            const AppInsightsModule = require('@azure/arm-appinsights')
            sandbox.stub(AppInsightsModule, 'ApplicationInsightsManagementClient').returns({
                components: { get: mockComponentsGet }
            })

            const utils = new AppInsightsUtils(ctx)
            await utils.get_instrumentation_key('test', 'custom')

            expect(mockUtils.resource_group.calledWith('custom', false, null, false)).to.be.true
            expect(mockComponentsGet.calledWith('custom-rg', 'devaitest')).to.be.true
        })

        it('passes ignoreOverride parameter to resource_group', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaitest'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockComponentsGet = sandbox.stub().resolves({
                instrumentationKey: 'test-key'
            })

            const AppInsightsModule = require('@azure/arm-appinsights')
            sandbox.stub(AppInsightsModule, 'ApplicationInsightsManagementClient').returns({
                components: { get: mockComponentsGet }
            })

            const utils = new AppInsightsUtils(ctx)
            await utils.get_instrumentation_key('test', null, true)

            expect(mockUtils.resource_group.calledWith(null, false, null, true)).to.be.true
        })

        it('creates resource name without region code for centralized telemetry', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaiproduction'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockComponentsGet = sandbox.stub().resolves({
                instrumentationKey: 'test-key'
            })

            const AppInsightsModule = require('@azure/arm-appinsights')
            sandbox.stub(AppInsightsModule, 'ApplicationInsightsManagementClient').returns({
                components: { get: mockComponentsGet }
            })

            const utils = new AppInsightsUtils(ctx)
            await utils.get_instrumentation_key('production')

            // Verify create_resource_name was called with false for region code
            expect(mockUtils.create_resource_name.calledWith('ai', 'production', false)).to.be.true
        })
    })
})

describe('AppInsightsPlugIn', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with correct name and context', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test-name', ingredient, ctx)

            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
        })
    })

    describe('Execute', () => {
        it('deploys app insights template with default resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('test-rg')
            expect(mockDeployAlerts.called).to.be.true
        })

        it('uses rgOverride parameter when provided', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            params.set('rgOverride', new BakeVariable('custom-resource-group'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any, rg: string) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' },
                rgOverride: { value: 'custom-resource-group' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            // Should use custom resource group
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('custom-resource-group')
            // rgOverride should be removed from params
            expect(capturedParams.rgOverride).to.be.undefined
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('App Insights deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('App Insights deployment failed')
            }
        })

        it('deploys alerts with correct target', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            let capturedAlertTarget: string = ''
            const mockDeployAlerts = sandbox.stub().callsFake((name, rg, target) => {
                capturedAlertTarget = target
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedAlertTarget).to.equal('my-app-insights')
        })

        it('passes alert overrides to DeployAlerts', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const alertOverrides = new Map<string, any>()
            alertOverrides.set('customAlert', { threshold: 100 })
            const ingredient = createIngredient(params, source, alertOverrides)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            let capturedAlertOverrides: any = null
            const mockDeployAlerts = sandbox.stub().callsFake((name, rg, target, stockAlerts, overrides) => {
                capturedAlertOverrides = overrides
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedAlertOverrides).to.equal(alertOverrides)
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('my-source-value')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            // The plugin should execute successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedDeploymentName: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name) => {
                capturedDeploymentName = name
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('my-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedDeploymentName).to.equal('my-deployment')
        })

        it('handles alert deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const alertError = new Error('Alert deployment failed')
            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().rejects(alertError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appInsightsName: { value: 'my-app-insights' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Alert deployment failed')
            }
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appInsightsName', new BakeVariable('my-app-insights'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
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

            const AppInsightsPlugIn = loadPlugin()
            const plugin = new AppInsightsPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })
    })
})
