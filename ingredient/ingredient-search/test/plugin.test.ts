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
import { SearchManagementClient } from '@azure/arm-search'

import { SearchPlugIn } from '../src/plugin'
import { SearchUtils } from '../src/functions'

// Require the compiled modules to verify exports
const searchIndex = require('../dist/index')

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
            type: '@azbake/ingredient-search',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function stubSearchSendOperation(sandbox: sinon.SinonSandbox, response: any) {
    return sandbox.stub(SearchManagementClient.prototype, 'sendOperationRequest').resolves(response)
}

describe('ingredient-search index exports', () => {
    it('exports plugin', () => {
        expect(searchIndex.plugin).to.not.be.undefined
        expect(typeof searchIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(searchIndex.pluginNS).to.equal('@azbake/ingredient-search')
    })

    it('exports functions', () => {
        expect(searchIndex.functions).to.not.be.undefined
        expect(typeof searchIndex.functions).to.equal('function')
        expect(searchIndex.functions.name).to.equal('SearchUtils')
    })

    it('exports functionsNS', () => {
        expect(searchIndex.functionsNS).to.equal('search')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = searchIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = searchIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('SearchPlugIn', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys search service template with default resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            params.set('sku', new BakeVariable('basic'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'my-search-service' },
                sku: { value: 'basic' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('test-rg')
        })

        it('uses rgOverride parameter when provided', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            params.set('sku', new BakeVariable('standard'))
            params.set('rgOverride', new BakeVariable('custom-resource-group'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any, rg: string) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'my-search-service' },
                sku: { value: 'standard' },
                rgOverride: { value: 'custom-resource-group' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            // Should use custom resource group
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('custom-resource-group')
            // rgOverride should be removed from params
            expect(capturedParams.rgOverride).to.be.undefined
            // resource_group should not be called since rgOverride was provided
            expect(mockUtils.resource_group.called).to.be.false
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const deploymentError = new Error('Search service deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'my-search-service' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Search service deployment failed')
            }
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('my-search-plugin', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-search-plugin', params)).to.be.true
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const paramError = new Error('Failed to convert params')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().rejects(paramError)
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Failed to convert params')
            }
        })

        it('handles resource_group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Could not resolve resource group')
            const mockUtils = {
                resource_group: sandbox.stub().rejects(rgError)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                return {}
            })

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'my-search-service' }
            })
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Could not resolve resource group')
            }
        })

        it('deploys with all ARM template parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search-service'))
            params.set('sku', new BakeVariable('standard'))
            params.set('location', new BakeVariable('eastus'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
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
                name: { value: 'my-search-service' },
                sku: { value: 'standard' },
                location: { value: 'eastus' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate).to.not.be.null
            expect(capturedParams.name.value).to.equal('my-search-service')
            expect(capturedParams.sku.value).to.equal('standard')
            expect(capturedParams.location.value).to.equal('eastus')
        })

        it('deploys ARM template with correct schema', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('search-svc'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
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
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('test', ingredient, ctx)
            await plugin.Execute()

            // Verify template structure
            expect(capturedTemplate.$schema).to.include('deploymentTemplate.json')
            expect(capturedTemplate.resources).to.be.an('array')
            expect(capturedTemplate.resources.length).to.be.greaterThan(0)
            expect(capturedTemplate.resources[0].type).to.equal('Microsoft.Search/searchServices')
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('my-search'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
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
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SearchPlugIn('my-deployment-name', ingredient, ctx)
            await plugin.Execute()

            expect(capturedName).to.equal('my-deployment-name')
        })
    })
})

describe('SearchUtils', () => {
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
            const utils = new SearchUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('create_resource_name', () => {
        it('creates search resource name with region code by default', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobaistest')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobaistest')
            expect(mockUtils.create_resource_name.calledWith('ais', null, true)).to.be.true
        })

        it('creates search resource name without region code when specified', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devaistest')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            const result = utils.create_resource_name(false)

            expect(result).to.equal('devaistest')
            expect(mockUtils.create_resource_name.calledWith('ais', null, false)).to.be.true
        })

        it('logs debug message with resource name', () => {
            const ctx = createContext()
            const debugSpy = sandbox.spy(ctx._logger, 'debug')
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobaistest')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            utils.create_resource_name()

            expect(debugSpy.calledWith('SearchUtils.create_resource_name() returned devglobaistest')).to.be.true
        })

        it('uses ais prefix for Azure Search', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            utils.create_resource_name()

            // Verify the first argument is 'ais' (Azure Intelligence Search prefix)
            expect(mockUtils.create_resource_name.firstCall.args[0]).to.equal('ais')
        })

        it('passes null as second argument to create_resource_name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[1]).to.be.null
        })

        it('gets coreutils from IngredientManager', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SearchUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })
    })

    describe('get_primary_admin_key', () => {
        it('is a function', () => {
            const ctx = createContext()
            const utils = new SearchUtils(ctx)
            expect(typeof utils.get_primary_admin_key).to.equal('function')
        })

        it('returns a promise', () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            stubSearchSendOperation(sandbox, { primaryKey: 'primary-key' })
            
            const utils = new SearchUtils(ctx)
            const result = utils.get_primary_admin_key('test-search')
            
            expect(result).to.be.a('promise')
            // Clean up the promise to avoid unhandled rejection
            result.catch(() => {})
        })

        it('uses provided resource group when rg parameter is given', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            const sendOperationStub = stubSearchSendOperation(sandbox, { primaryKey: 'primary-key' })

            const utils = new SearchUtils(ctx)

            const result = await utils.get_primary_admin_key('test-search', 'custom-rg')

            // resource_group should NOT have been called since we provided rg
            expect(mockUtils.resource_group.called).to.be.false
            expect(sendOperationStub.firstCall.args[0].resourceGroupName).to.equal('custom-rg')
            expect(sendOperationStub.firstCall.args[0].searchServiceName).to.equal('test-search')
            expect(result).to.equal('primary-key')
        })

        it('falls back to resource_group() when rg is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('resolved-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            const sendOperationStub = stubSearchSendOperation(sandbox, { primaryKey: 'primary-key' })

            const utils = new SearchUtils(ctx)

            const result = await utils.get_primary_admin_key('test-search', null)

            // resource_group should have been called
            expect(mockUtils.resource_group.called).to.be.true
            expect(sendOperationStub.firstCall.args[0].resourceGroupName).to.equal('resolved-rg')
            expect(sendOperationStub.firstCall.args[0].searchServiceName).to.equal('test-search')
            expect(result).to.equal('primary-key')
        })

        it('returns empty string when response is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            stubSearchSendOperation(sandbox, null)

            const utils = new SearchUtils(ctx)

            const result = await utils.get_primary_admin_key('test-search')
            expect(result).to.equal('')
        })
    })

    describe('get_secondary_admin_key', () => {
        it('is a function', () => {
            const ctx = createContext()
            const utils = new SearchUtils(ctx)
            expect(typeof utils.get_secondary_admin_key).to.equal('function')
        })

        it('returns a promise', () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            stubSearchSendOperation(sandbox, { secondaryKey: 'secondary-key' })
            
            const utils = new SearchUtils(ctx)
            const result = utils.get_secondary_admin_key('test-search')
            
            expect(result).to.be.a('promise')
            // Clean up the promise to avoid unhandled rejection
            result.catch(() => {})
        })

        it('uses provided resource group when rg parameter is given', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            const sendOperationStub = stubSearchSendOperation(sandbox, { secondaryKey: 'secondary-key' })

            const utils = new SearchUtils(ctx)

            const result = await utils.get_secondary_admin_key('test-search', 'custom-rg')

            // resource_group should NOT have been called since we provided rg
            expect(mockUtils.resource_group.called).to.be.false
            expect(sendOperationStub.firstCall.args[0].resourceGroupName).to.equal('custom-rg')
            expect(sendOperationStub.firstCall.args[0].searchServiceName).to.equal('test-search')
            expect(result).to.equal('secondary-key')
        })

        it('falls back to resource_group() when rg is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('resolved-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            const sendOperationStub = stubSearchSendOperation(sandbox, { secondaryKey: 'secondary-key' })

            const utils = new SearchUtils(ctx)

            const result = await utils.get_secondary_admin_key('test-search', null)

            // resource_group should have been called
            expect(mockUtils.resource_group.called).to.be.true
            expect(sendOperationStub.firstCall.args[0].resourceGroupName).to.equal('resolved-rg')
            expect(sendOperationStub.firstCall.args[0].searchServiceName).to.equal('test-search')
            expect(result).to.equal('secondary-key')
        })

        it('returns empty string when response primaryKey is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)
            stubSearchSendOperation(sandbox, null)

            const utils = new SearchUtils(ctx)

            const result = await utils.get_secondary_admin_key('test-search')
            expect(result).to.equal('')
        })
    })
})
