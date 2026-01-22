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

import { AppServicePlan } from '../src/plugin'
import { AppServicePlanUtils } from '../src/functions'

// Require the compiled modules to verify exports
const appServicePlanIndex = require('../dist/index')

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
            type: '@azbake/ingredient-app-service-plan',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: alerts || new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-app-service-plan index exports', () => {
    it('exports plugin', () => {
        expect(appServicePlanIndex.plugin).to.not.be.undefined
        expect(typeof appServicePlanIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(appServicePlanIndex.pluginNS).to.equal('@azbake/ingredient-app-service-plan')
    })

    it('exports functions', () => {
        expect(appServicePlanIndex.functions).to.not.be.undefined
        expect(typeof appServicePlanIndex.functions).to.equal('function')
        expect(appServicePlanIndex.functions.name).to.equal('AppServicePlanUtils')
    })

    it('exports functionsNS', () => {
        expect(appServicePlanIndex.functionsNS).to.equal('appserviceplan')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = appServicePlanIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = appServicePlanIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('AppServicePlanUtils', () => {
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
            const utils = new AppServicePlanUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('create_resource_name', () => {
        it('creates app service plan resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devasptst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppServicePlanUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devasptst')
            expect(mockUtils.create_resource_name.calledWith('asp', null, false)).to.be.true
        })

        it('creates resource name without region code', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devasptst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppServicePlanUtils(ctx)
            utils.create_resource_name()

            // Third parameter is false - no region code appended
            expect(mockUtils.create_resource_name.firstCall.args[2]).to.be.false
        })

        it('uses asp prefix for App Service Plan', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppServicePlanUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[0]).to.equal('asp')
        })

        it('passes null as second argument', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppServicePlanUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[1]).to.be.null
        })

        it('calls IngredientManager with coreutils namespace', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AppServicePlanUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })
    })
})

describe('AppServicePlan Plugin', () => {
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

            const plugin = new AppServicePlan('test-name', ingredient, ctx)

            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
        })

        it('stores ingredient reference', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new AppServicePlan('test', ingredient, ctx)

            expect(plugin._ingredient).to.equal(ingredient)
        })
    })

    describe('Execute', () => {
        it('deploys app service plan template successfully', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            params.set('sku', new BakeVariable('S1'))
            
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
                appServicePlanName: { value: 'my-asp' },
                sku: { value: 'S1' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('passes correct resource group to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('my-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedResourceGroup: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedResourceGroup).to.equal('my-resource-group')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('App Service Plan deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('App Service Plan deployment failed')
            }
        })

        it('deploys alerts with correct target name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp-production'))
            
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
                appServicePlanName: { value: 'my-asp-production' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedAlertTarget).to.equal('my-asp-production')
        })

        it('passes alert overrides to DeployAlerts', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
            const source = new BakeVariable('test-source')
            const alertOverrides = new Map<string, any>()
            alertOverrides.set('CpuPercentage', { threshold: 80 })
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
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedAlertOverrides).to.equal(alertOverrides)
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
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
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('my-asp-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedDeploymentName).to.equal('my-asp-deployment')
        })

        it('handles alert deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
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
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Alert deployment failed')
            }
        })

        it('handles resource group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Resource group resolution failed')
            const mockUtils = {
                resource_group: sandbox.stub().rejects(rgError)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Resource group resolution failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
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
                appServicePlanName: { value: 'my-asp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            // The plugin should execute successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('appServicePlanName', new BakeVariable('my-asp'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedCtx: any = null
            const ARMHelperStub = sandbox.stub().callsFake((ctxArg: any) => {
                capturedCtx = ctxArg
                return {
                    DeployTemplate: sandbox.stub().resolves({}),
                    DeployAlerts: sandbox.stub().resolves({}),
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                        appServicePlanName: { value: 'my-asp' }
                    })
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AppServicePlan('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })
    })
})
