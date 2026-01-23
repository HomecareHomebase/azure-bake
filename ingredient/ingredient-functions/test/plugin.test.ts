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

import { FunctionsUtils } from '../src/functions'

// Require the compiled modules to verify exports
const functionsIndex = require('../dist/index')

function loadPlugin(): any {
    const resolved = require.resolve('../src/plugin')
    delete require.cache[resolved]
    return require(resolved).FunctionsPlugin
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

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-functions',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-functions index exports', () => {
    it('exports plugin', () => {
        expect(functionsIndex.plugin).to.not.be.undefined
        expect(typeof functionsIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(functionsIndex.pluginNS).to.equal('@azbake/ingredient-functions')
    })

    it('exports functions', () => {
        expect(functionsIndex.functions).to.not.be.undefined
        expect(typeof functionsIndex.functions).to.equal('function')
        expect(functionsIndex.functions.name).to.equal('FunctionsUtils')
    })

    it('exports functionsNS', () => {
        expect(functionsIndex.functionsNS).to.equal('functions')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = functionsIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = functionsIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('FunctionsUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates function app resource name using coreutils with shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobfamyapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionsUtils(ctx)
            const result = utils.create_resource_name('myapp')

            expect(result).to.equal('devglobfamyapp')
            expect(mockUtils.create_resource_name.calledWith('fa', 'myapp', false)).to.be.true
        })

        it('creates function app resource name without shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobfa')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new FunctionsUtils(ctx)
            const result = utils.create_resource_name('')

            expect(result).to.equal('devglobfa')
            expect(mockUtils.create_resource_name.calledWith('fa', '', false)).to.be.true
        })
    })
})

describe('FunctionsPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys function app template using default resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('funcAppName', new BakeVariable('myfuncapp'))
            
            const source = new BakeVariable('myregistry.azurecr.io/myimage:latest')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                funcAppName: { value: 'myfuncapp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const FunctionsPlugin = loadPlugin()
            const plugin = new FunctionsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('uses custom resource group when funcAppResourceGroup is provided', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('funcAppName', new BakeVariable('myfuncapp'))
            params.set('funcAppResourceGroup', new BakeVariable('custom-rg'))
            
            const source = new BakeVariable('myregistry.azurecr.io/myimage:latest')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                funcAppName: { value: 'myfuncapp' },
                funcAppResourceGroup: { value: 'custom-rg' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const FunctionsPlugin = loadPlugin()
            const plugin = new FunctionsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify deployment was called with custom resource group
            expect(mockDeployTemplate.called).to.be.true
            const deployCall = mockDeployTemplate.getCall(0)
            expect(deployCall.args[3]).to.equal('custom-rg')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('funcAppName', new BakeVariable('myfuncapp'))
            
            const source = new BakeVariable('myregistry.azurecr.io/myimage:latest')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Functions deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                funcAppName: { value: 'myfuncapp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const FunctionsPlugin = loadPlugin()
            const plugin = new FunctionsPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Functions deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('funcAppName', new BakeVariable('myfuncapp'))
            
            const source = new BakeVariable('myregistry.azurecr.io/myimage:v1')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                funcAppName: { value: 'myfuncapp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const FunctionsPlugin = loadPlugin()
            const plugin = new FunctionsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('sets funcAppResourceGroup parameter from resolved value', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('funcAppName', new BakeVariable('myfuncapp'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('resolved-default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                funcAppName: { value: 'myfuncapp' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const FunctionsPlugin = loadPlugin()
            const plugin = new FunctionsPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // The resourceGroup should be set to the resolved default value
            expect(mockDeployTemplate.called).to.be.true
            const deployCall = mockDeployTemplate.getCall(0)
            expect(deployCall.args[3]).to.equal('resolved-default-rg')
        })
    })
})
