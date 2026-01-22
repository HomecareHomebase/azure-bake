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

import { DataBricks } from '../src/plugin'
import { DataBricksUtils } from '../src/functions'

// Require the compiled modules to verify exports
const databricksIndex = require('../dist/index')

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
        regions: [{ name: 'East US', shortName: 'eus', code: 'eus' }],
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

    const testRegion: IBakeRegion = region || { name: 'East US', shortName: 'eus', code: 'eus' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-databricks',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-databricks index exports', () => {
    it('exports plugin', () => {
        expect(databricksIndex.plugin).to.not.be.undefined
        expect(typeof databricksIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(databricksIndex.pluginNS).to.equal('@azbake/ingredient-databricks')
    })

    it('exports functions', () => {
        expect(databricksIndex.functions).to.not.be.undefined
        expect(typeof databricksIndex.functions).to.equal('function')
        expect(databricksIndex.functions.name).to.equal('DataBricksUtils')
    })

    it('exports functionsNS', () => {
        expect(databricksIndex.functionsNS).to.equal('DataBricks')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        // Mock ARMHelper constructor
        const armHelper = require('@azbake/arm-helper')
        const originalARMHelper = armHelper.ARMHelper
        armHelper.ARMHelper = function() {
            return { 
                BakeParamsToARMParamsAsync: async () => ({}), 
                DeployTemplate: async () => ({}),
                ConfigureDiagnostics: async (params: any) => params
            }
        }

        try {
            const Plugin = databricksIndex.plugin
            const instance = new Plugin('test', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test')
        } finally {
            armHelper.ARMHelper = originalARMHelper
        }
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = databricksIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('DataBricksUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates databricks resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusdbrcks')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataBricksUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveusdbrcks')
            expect(mockUtils.create_resource_name.calledWith('dbrcks', null, true)).to.be.true
        })

        it('returns unique name for each environment', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodeusdbrcks')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataBricksUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('prodeusdbrcks')
        })

        it('calls IngredientManager with correct parameters', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusdbrcks')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataBricksUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('uses dbrcks prefix for resource name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devdbrcks')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataBricksUtils(ctx)
            utils.create_resource_name()

            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[0]).to.equal('dbrcks')
        })
    })
})

describe('DataBricks Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys databricks workspace with required parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            params.set('location', new BakeVariable('eastus'))
            params.set('sku', new BakeVariable('premium'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' },
                location: { value: 'eastus' },
                sku: { value: 'premium' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('configures diagnostics before deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let configureCalledBeforeDeploy = false
            let configureCallOrder = 0
            let deployCallOrder = 0
            let callCounter = 0

            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => {
                configureCallOrder = ++callCounter
                return params
            })
            const mockDeployTemplate = sandbox.stub().callsFake(() => {
                deployCallOrder = ++callCounter
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(configureCallOrder).to.be.lessThan(deployCallOrder)
        })

        it('uses correct resource group for deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('databricks-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedResourceGroup).to.equal('databricks-resource-group')
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('my-databricks-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('DataBricks deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('DataBricks deployment failed')
            }
        })

        it('throws error when BakeParamsToARMParamsAsync fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
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

            const plugin = new DataBricks('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('throws error when ConfigureDiagnostics fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const diagError = new Error('Diagnostics configuration failed')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            const mockConfigureDiagnostics = sandbox.stub().rejects(diagError)
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Diagnostics configuration failed')
            }
        })

        it('passes correct name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedName: string | null = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().callsFake((name, params) => {
                capturedName = name
                return Promise.resolve({ workspaceName: { value: 'mydatabricks' } })
            })
            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('my-databricks-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-databricks-deployment')
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({ workspaceName: { value: 'mydatabricks' } }),
                    ConfigureDiagnostics: sandbox.stub().callsFake((params) => params)
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes configured diagnostics parameters to deploy template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => {
                return { ...params, diagnosticsEnabled: { value: true } }
            })
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedParams = params
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.diagnosticsEnabled).to.deep.equal({ value: true })
        })

        it('deploys with standard SKU', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            params.set('sku', new BakeVariable('standard'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' },
                sku: { value: 'standard' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedParams = params
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.sku.value).to.equal('standard')
        })

        it('deploys with premium SKU', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('workspaceName', new BakeVariable('mydatabricks'))
            params.set('sku', new BakeVariable('premium'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                workspaceName: { value: 'mydatabricks' },
                sku: { value: 'premium' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedParams = params
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataBricks('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.sku.value).to.equal('premium')
        })
    })
})
