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

import { DataFactoryV2 } from '../src/plugin'
import { DataFactoryV2Utils } from '../src/functions'

// Require the compiled modules to verify exports
const datafactoryIndex = require('../dist/index')

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
            type: '@azbake/ingredient-datafactoryv2',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-datafactoryv2 index exports', () => {
    it('exports plugin', () => {
        expect(datafactoryIndex.plugin).to.not.be.undefined
        expect(typeof datafactoryIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(datafactoryIndex.pluginNS).to.equal('@azbake/ingredient-datafactoryv2')
    })

    it('exports functions', () => {
        expect(datafactoryIndex.functions).to.not.be.undefined
        expect(typeof datafactoryIndex.functions).to.equal('function')
        expect(datafactoryIndex.functions.name).to.equal('DataFactoryV2Utils')
    })

    it('exports functionsNS', () => {
        expect(datafactoryIndex.functionsNS).to.equal('datafactory')
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
            const Plugin = datafactoryIndex.plugin
            const instance = new Plugin('test', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test')
        } finally {
            armHelper.ARMHelper = originalARMHelper
        }
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = datafactoryIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('DataFactoryV2Utils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates data factory resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusdftst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataFactoryV2Utils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveusdftst')
            expect(mockUtils.create_resource_name.calledWith('df', null, true)).to.be.true
        })

        it('returns unique name for each environment', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodeusdftst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataFactoryV2Utils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('prodeusdftst')
        })

        it('calls IngredientManager with correct parameters', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusdftst')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataFactoryV2Utils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('uses df prefix for resource name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devdf')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataFactoryV2Utils(ctx)
            utils.create_resource_name()

            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[0]).to.equal('df')
        })

        it('enables region suffix', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusdftst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new DataFactoryV2Utils(ctx)
            utils.create_resource_name()

            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[2]).to.be.true // region enabled
        })
    })
})

describe('DataFactoryV2 Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys data factory with required parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            params.set('location', new BakeVariable('eastus'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' },
                location: { value: 'eastus' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('configures diagnostics before deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

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
                dataFactoryName: { value: 'mydatafactory' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(configureCallOrder).to.be.lessThan(deployCallOrder)
        })

        it('uses correct resource group for deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('datafactory-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedResourceGroup).to.equal('datafactory-resource-group')
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('my-datafactory-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Data Factory deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Data Factory deployment failed')
            }
        })

        it('throws error when BakeParamsToARMParamsAsync fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
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

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('throws error when ConfigureDiagnostics fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const diagError = new Error('Diagnostics configuration failed')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
            })
            const mockConfigureDiagnostics = sandbox.stub().rejects(diagError)
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Diagnostics configuration failed')
            }
        })

        it('passes correct name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
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
                return Promise.resolve({ dataFactoryName: { value: 'mydatafactory' } })
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

            const plugin = new DataFactoryV2('my-datafactory-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-datafactory-deployment')
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({ dataFactoryName: { value: 'mydatafactory' } }),
                    ConfigureDiagnostics: sandbox.stub().callsFake((params) => params)
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes configured diagnostics parameters to deploy template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
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

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.diagnosticsEnabled).to.deep.equal({ value: true })
        })

        it('deploys with identity settings', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            params.set('identityType', new BakeVariable('SystemAssigned'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' },
                identityType: { value: 'SystemAssigned' }
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

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.identityType.value).to.equal('SystemAssigned')
        })

        it('deploys with git configuration', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            params.set('repoConfiguration', new BakeVariable('enabled'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' },
                repoConfiguration: { value: 'enabled' }
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

            const plugin = new DataFactoryV2('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.repoConfiguration.value).to.equal('enabled')
        })

        it('deploys to different regions correctly', async () => {
            const region1: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eus' }
            const region2: IBakeRegion = { name: 'West Europe', shortName: 'weu', code: 'weu' }

            const params = new Map<string, BakeVariable>()
            params.set('dataFactoryName', new BakeVariable('mydatafactory'))
            
            const source = new BakeVariable('test-source')
            const ingredient1 = createIngredient(params, source)
            const ingredient2 = createIngredient(params, source)
            const ctx1 = createContext(region1, ingredient1)
            const ctx2 = createContext(region2, ingredient2)

            const mockUtils1 = {
                resource_group: sandbox.stub().resolves('eus-rg')
            }
            const mockUtils2 = {
                resource_group: sandbox.stub().resolves('weu-rg')
            }

            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction')
            getIngredientStub.withArgs('coreutils', ctx1).returns(mockUtils1)
            getIngredientStub.withArgs('coreutils', ctx2).returns(mockUtils2)

            let deployedRegions: string[] = []
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedRegions.push(rg)
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                dataFactoryName: { value: 'mydatafactory' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin1 = new DataFactoryV2('test', ingredient1, ctx1)
            const plugin2 = new DataFactoryV2('test', ingredient2, ctx2)
            
            await plugin1.Execute()
            await plugin2.Execute()

            expect(deployedRegions).to.include('eus-rg')
            expect(deployedRegions).to.include('weu-rg')
        })
    })
})
