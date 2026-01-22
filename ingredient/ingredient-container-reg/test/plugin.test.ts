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

import { ContainerRegPlugin } from '../src/plugin'
import { ContainerRegUtils } from '../src/functions'

// Require the compiled modules to verify exports
const containerRegIndex = require('../dist/index')

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
            type: '@azbake/ingredient-container-reg',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-container-reg index exports', () => {
    it('exports plugin', () => {
        expect(containerRegIndex.plugin).to.not.be.undefined
        expect(typeof containerRegIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(containerRegIndex.pluginNS).to.equal('@azbake/ingredient-container-reg')
    })

    it('exports functions', () => {
        expect(containerRegIndex.functions).to.not.be.undefined
        expect(typeof containerRegIndex.functions).to.equal('function')
        expect(containerRegIndex.functions.name).to.equal('ContainerRegUtils')
    })

    it('exports functionsNS', () => {
        expect(containerRegIndex.functionsNS).to.equal('acr')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = containerRegIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = containerRegIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('ContainerRegUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates container registry resource name using coreutils without region', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devacrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new ContainerRegUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devacrtst')
            expect(mockUtils.create_resource_name.calledWith('acr', null, false)).to.be.true
        })

        it('returns the acr profile name from coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodacrmyapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new ContainerRegUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('prodacrmyapp')
        })
    })
})

describe('ContainerRegPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys container registry template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            params.set('acrSku', new BakeVariable('Basic'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                acrName: { value: 'mycontainerregistry' },
                acrSku: { value: 'Basic' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Container Registry deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                acrName: { value: 'mycontainerregistry' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Container Registry deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const source = new BakeVariable('my-acr-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                acrName: { value: 'mycontainerregistry' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const ingredient = createIngredient(params)
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

                expect(capturedCtx).to.not.be.null
                expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes correct resource group to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('my-acr-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.firstCall.args[3]).to.equal('my-acr-rg')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('my-container-registry', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-container-registry', params)).to.be.true
        })

        it('uses coreutils from IngredientManager', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('mycontainerregistry'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('deploys with multiple parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('acrName', new BakeVariable('myacr'))
            params.set('acrSku', new BakeVariable('Premium'))
            params.set('adminUserEnabled', new BakeVariable('true'))
            params.set('location', new BakeVariable('eastus'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                acrName: { value: 'myacr' },
                acrSku: { value: 'Premium' },
                adminUserEnabled: { value: 'true' },
                location: { value: 'eastus' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ContainerRegPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.acrName).to.deep.equal({ value: 'myacr' })
            expect(capturedParams.acrSku).to.deep.equal({ value: 'Premium' })
            expect(capturedParams.adminUserEnabled).to.deep.equal({ value: 'true' })
            expect(capturedParams.location).to.deep.equal({ value: 'eastus' })
        })
    })
})
