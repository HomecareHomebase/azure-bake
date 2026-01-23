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

import { AcsPlugin } from '../src/plugin'
import { AcsUtils } from '../src/functions'

// Require the compiled modules to verify exports
const acsIndex = require('../dist/index')

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
            type: '@azbake/ingredient-acs',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-acs index exports', () => {
    it('exports plugin', () => {
        expect(acsIndex.plugin).to.not.be.undefined
        expect(typeof acsIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(acsIndex.pluginNS).to.equal('@azbake/ingredient-acs')
    })

    it('exports functions', () => {
        expect(acsIndex.functions).to.not.be.undefined
        expect(typeof acsIndex.functions).to.equal('function')
        expect(acsIndex.functions.name).to.equal('AcsUtils')
    })

    it('exports functionsNS', () => {
        expect(acsIndex.functionsNS).to.equal('acsutils')
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
                DeployTemplate: async () => ({})
            }
        }

        try {
            const Plugin = acsIndex.plugin
            const instance = new Plugin('test', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test')
        } finally {
            armHelper.ARMHelper = originalARMHelper
        }
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = acsIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('AcsUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates ACS resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devacstst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AcsUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devacstst')
            expect(mockUtils.create_resource_name.calledWith('acs', null, false)).to.be.true
        })

        it('returns unique name for each environment', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodacstst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AcsUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('prodacstst')
        })

        it('calls IngredientManager with correct parameters', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devacstst')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AcsUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('uses acs prefix for resource name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devacs')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AcsUtils(ctx)
            utils.create_resource_name()

            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[0]).to.equal('acs')
        })

        it('does not include region suffix in name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devacstst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AcsUtils(ctx)
            utils.create_resource_name()

            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[2]).to.be.false // region disabled
        })
    })

    describe('get_primary_connectionstring', () => {
        it('returns primary connection string from ACS', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: 'Endpoint=https://myacs.communication.azure.com/;AccessKey=xxx'
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_primary_connectionstring('myacs')

            expect(result).to.equal('Endpoint=https://myacs.communication.azure.com/;AccessKey=xxx')
            expect(mockListKeys.calledWith('test-rg', 'myacs')).to.be.true
        })

        it('uses custom resource group when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: 'Endpoint=https://myacs.communication.azure.com/;AccessKey=xxx'
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_primary_connectionstring('myacs', 'custom-rg')

            expect(result).to.equal('Endpoint=https://myacs.communication.azure.com/;AccessKey=xxx')
            expect(mockListKeys.calledWith('custom-rg', 'myacs')).to.be.true
            expect(mockUtils.resource_group.called).to.be.false
        })

        it('returns empty string when primary connection string is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: undefined
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_primary_connectionstring('myacs')

            expect(result).to.equal('')
        })

        it('returns empty string when response has null primaryConnectionString', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: null
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_primary_connectionstring('myacs')

            expect(result).to.equal('')
        })
    })

    describe('get_secondary_connectionstring', () => {
        it('returns secondary connection string from ACS', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryConnectionString: 'Endpoint=https://myacs.communication.azure.com/;AccessKey=yyy'
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_secondary_connectionstring('myacs')

            expect(result).to.equal('Endpoint=https://myacs.communication.azure.com/;AccessKey=yyy')
            expect(mockListKeys.calledWith('test-rg', 'myacs')).to.be.true
        })

        it('uses custom resource group when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryConnectionString: 'Endpoint=https://myacs.communication.azure.com/;AccessKey=yyy'
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_secondary_connectionstring('myacs', 'custom-rg')

            expect(result).to.equal('Endpoint=https://myacs.communication.azure.com/;AccessKey=yyy')
            expect(mockListKeys.calledWith('custom-rg', 'myacs')).to.be.true
            expect(mockUtils.resource_group.called).to.be.false
        })

        it('returns empty string when secondary connection string is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryConnectionString: undefined
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_secondary_connectionstring('myacs')

            expect(result).to.equal('')
        })

        it('returns empty string when response has null secondaryConnectionString', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryConnectionString: null
            })

            const armCommunication = require('@azure/arm-communication')
            sandbox.stub(armCommunication, 'CommunicationServiceManagementClient').returns({
                communicationService: { listKeys: mockListKeys }
            })

            const utils = new AcsUtils(ctx)
            const result = await utils.get_secondary_connectionstring('myacs')

            expect(result).to.equal('')
        })
    })
})

describe('AcsPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys ACS with required parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            params.set('location', new BakeVariable('global'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                communicationServiceName: { value: 'myacs' },
                location: { value: 'global' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('uses correct resource group for deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('acs-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                communicationServiceName: { value: 'myacs' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedResourceGroup).to.equal('acs-resource-group')
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
            const source = new BakeVariable('my-acs-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                communicationServiceName: { value: 'myacs' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('ACS deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                communicationServiceName: { value: 'myacs' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('ACS deployment failed')
            }
        })

        it('throws error when BakeParamsToARMParamsAsync fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
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

            const plugin = new AcsPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('passes correct name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
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
                return Promise.resolve({ communicationServiceName: { value: 'myacs' } })
            })
            const mockDeployTemplate = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('my-acs-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-acs-deployment')
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({ communicationServiceName: { value: 'myacs' } })
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes parameters from ingredient to ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            params.set('dataLocation', new BakeVariable('United States'))
            
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
                    communicationServiceName: { value: 'myacs' },
                    dataLocation: { value: 'United States' }
                })
            })
            const mockDeployTemplate = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(capturedIngredientParams).to.equal(ingredient.properties.parameters)
        })

        it('deploys ACS resource with data location', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            params.set('dataLocation', new BakeVariable('Europe'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedParams: any = null
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                communicationServiceName: { value: 'myacs' },
                dataLocation: { value: 'Europe' }
            })
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedParams = params
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AcsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedParams.dataLocation.value).to.equal('Europe')
        })

        it('handles different regions', async () => {
            const region1: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eus' }
            const region2: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'wus' }

            const params = new Map<string, BakeVariable>()
            params.set('communicationServiceName', new BakeVariable('myacs'))
            
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
                communicationServiceName: { value: 'myacs' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin1 = new AcsPlugin('test', ingredient1, ctx1)
            const plugin2 = new AcsPlugin('test', ingredient2, ctx2)
            
            await plugin1.Execute()
            await plugin2.Execute()

            expect(deployedRegions).to.include('eus-rg')
            expect(deployedRegions).to.include('wus-rg')
        })
    })
})
