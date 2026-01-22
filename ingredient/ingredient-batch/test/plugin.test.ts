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

import { BatchPlugin } from '../src/plugin'
import { BatchUtils } from '../src/functions'

// Require the compiled modules to verify exports
const batchIndex = require('../dist/index')

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
            type: '@azbake/ingredient-batch',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-batch index exports', () => {
    it('exports plugin', () => {
        expect(batchIndex.plugin).to.not.be.undefined
        expect(typeof batchIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(batchIndex.pluginNS).to.equal('@azbake/ingredient-batch')
    })

    it('exports functions', () => {
        expect(batchIndex.functions).to.not.be.undefined
        expect(typeof batchIndex.functions).to.equal('function')
        expect(batchIndex.functions.name).to.equal('BatchUtils')
    })

    it('exports functionsNS', () => {
        expect(batchIndex.functionsNS).to.equal('batchutils')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        // Mock ARMHelper constructor
        const armHelper = require('@azbake/arm-helper')
        const originalARMHelper = armHelper.ARMHelper
        armHelper.ARMHelper = function() {
            return { BakeParamsToARMParamsAsync: async () => ({}), DeployTemplate: async () => ({}) }
        }

        try {
            const Plugin = batchIndex.plugin
            const instance = new Plugin('test', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test')
        } finally {
            armHelper.ARMHelper = originalARMHelper
        }
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = batchIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('BatchUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates batch resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusbatchtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new BatchUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveusbatchtst')
            expect(mockUtils.create_resource_name.calledWith('batch', null, true)).to.be.true
        })

        it('returns unique name for each environment', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodeusbatchtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new BatchUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('prodeusbatchtst')
        })

        it('calls IngredientManager with correct parameters', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveusbatchtst')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new BatchUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })
    })
})

describe('BatchPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys batch account with required parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
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
                batchAccountName: { value: 'mybatchaccount' },
                location: { value: 'eastus' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('uses correct resource group for deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('batch-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                batchAccountName: { value: 'mybatchaccount' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedResourceGroup).to.equal('batch-resource-group')
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
            const source = new BakeVariable('my-batch-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                batchAccountName: { value: 'mybatchaccount' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Batch deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                batchAccountName: { value: 'mybatchaccount' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Batch deployment failed')
            }
        })

        it('throws error when BakeParamsToARMParamsAsync fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
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

            const plugin = new BatchPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('passes correct name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
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
                return Promise.resolve({ batchAccountName: { value: 'mybatchaccount' } })
            })
            const mockDeployTemplate = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('my-batch-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-batch-deployment')
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({ batchAccountName: { value: 'mybatchaccount' } })
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes parameters from ingredient to ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            params.set('storageAccountName', new BakeVariable('mystorageaccount'))
            params.set('poolAllocationMode', new BakeVariable('BatchService'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedIngredientParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().callsFake((name, ingParams) => {
                capturedIngredientParams = ingParams
                return Promise.resolve({
                    batchAccountName: { value: 'mybatchaccount' },
                    storageAccountName: { value: 'mystorageaccount' },
                    poolAllocationMode: { value: 'BatchService' }
                })
            })
            const mockDeployTemplate = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new BatchPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(capturedIngredientParams).to.equal(ingredient.properties.parameters)
        })

        it('deploys to different regions correctly', async () => {
            const region1: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eus' }
            const region2: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'wus' }

            const params = new Map<string, BakeVariable>()
            params.set('batchAccountName', new BakeVariable('mybatchaccount'))
            
            const source = new BakeVariable('test-source')
            const ingredient1 = createIngredient(params, source)
            const ingredient2 = createIngredient(params, source)
            const ctx1 = createContext(region1, ingredient1)
            const ctx2 = createContext(region2, ingredient2)

            const mockUtils1 = {
                resource_group: sandbox.stub().resolves('eus-rg')
            }
            const mockUtils2 = {
                resource_group: sandbox.stub().resolves('wus-rg')
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
                batchAccountName: { value: 'mybatchaccount' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin1 = new BatchPlugin('test', ingredient1, ctx1)
            const plugin2 = new BatchPlugin('test', ingredient2, ctx2)
            
            await plugin1.Execute()
            await plugin2.Execute()

            expect(deployedRegions).to.include('eus-rg')
            expect(deployedRegions).to.include('wus-rg')
        })
    })
})
