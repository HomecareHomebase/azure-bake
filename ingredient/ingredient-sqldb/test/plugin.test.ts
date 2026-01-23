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

import { SqlDB } from '../src/plugin'
import { SqlDBUtils } from '../src/functions'

// Require the compiled modules to verify exports
const sqldbIndex = require('../dist/index')

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
            type: '@azbake/ingredient-sqldb',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-sqldb index exports', () => {
    it('exports plugin', () => {
        expect(sqldbIndex.plugin).to.not.be.undefined
        expect(typeof sqldbIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(sqldbIndex.pluginNS).to.equal('@azbake/ingredient-sqldb')
    })

    it('exports functions', () => {
        expect(sqldbIndex.functions).to.not.be.undefined
        expect(typeof sqldbIndex.functions).to.equal('function')
        expect(sqldbIndex.functions.name).to.equal('SqlDBUtils')
    })

    it('exports functionsNS', () => {
        expect(sqldbIndex.functionsNS).to.equal('SqlDB')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = sqldbIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = sqldbIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('SqlDBUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates sql database resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobsqldbtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlDBUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobsqldbtst')
            expect(mockUtils.create_resource_name.calledWith('sqldb', null, true)).to.be.true
        })

        it('passes correct arguments to coreutils create_resource_name', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('produstsqldbtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlDBUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.calledOnce).to.be.true
            const callArgs = mockUtils.create_resource_name.getCall(0).args
            expect(callArgs[0]).to.equal('sqldb')
            expect(callArgs[1]).to.be.null
            expect(callArgs[2]).to.be.true
        })

        it('retrieves coreutils from IngredientManager', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('testname')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlDBUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
        })
    })

    describe('context property', () => {
        it('stores and exposes the deployment context', () => {
            const ctx = createContext()
            const utils = new SqlDBUtils(ctx)
            
            expect(utils.context).to.equal(ctx)
        })

        it('works with different region configurations', () => {
            const customRegion: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eastus' }
            const ctx = createContext(customRegion)
            const utils = new SqlDBUtils(ctx)
            
            expect(utils.context.Region.name).to.equal('East US')
            expect(utils.context.Region.shortName).to.equal('eus')
            expect(utils.context.Region.code).to.equal('eastus')
        })
    })
})

describe('SqlDB Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with ARMHelper', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new SqlDB('test-name', ingredient, ctx)
            
            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
            expect(plugin._ctx.Region.name).to.equal(ctx.Region.name)
            // _helper is lazily initialized, so we just check it's initially undefined
            expect(plugin._helper).to.be.undefined
        })

        it('stores ingredient reference', () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new SqlDB('test', ingredient, ctx)
            
            expect(plugin._ingredient).to.equal(ingredient)
        })

        it('handles empty parameters in ingredient', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new SqlDB('empty-params', ingredient, ctx)
            
            expect(plugin._name).to.equal('empty-params')
            expect(plugin._ingredient.properties.parameters.size).to.equal(0)
        })
    })

    describe('Execute', () => {
        it('deploys sql database template with diagnostics', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            params.set('serverName', new BakeVariable('myserver'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                databaseName: { value: 'mydb' },
                serverName: { value: 'myserver' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('SQL DB deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                databaseName: { value: 'mydb' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('SQL DB deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const source = new BakeVariable('my-sql-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                databaseName: { value: 'mydb' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('testdb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                databaseName: { value: 'testdb' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('my-db-ingredient', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-db-ingredient', params)).to.be.true
        })

        it('uses resource group from coreutils', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('custom-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockUtils.resource_group.called).to.be.true
            expect(mockDeployTemplate.getCall(0).args[3]).to.equal('custom-resource-group')
        })

        it('deploys with all ARM template parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            params.set('serverName', new BakeVariable('myserver'))
            params.set('collation', new BakeVariable('SQL_Latin1_General_CP1_CI_AS'))
            params.set('tier', new BakeVariable('Standard'))
            params.set('skuName', new BakeVariable('S0'))
            params.set('maxSizeBytes', new BakeVariable('2147483648'))
            params.set('zoneRedundant', new BakeVariable('false'))
            params.set('enableADS', new BakeVariable('true'))
            params.set('enableVA', new BakeVariable('true'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const armParams = {
                databaseName: { value: 'mydb' },
                serverName: { value: 'myserver' },
                collation: { value: 'SQL_Latin1_General_CP1_CI_AS' },
                tier: { value: 'Standard' },
                skuName: { value: 'S0' },
                maxSizeBytes: { value: 2147483648 },
                zoneRedundant: { value: false },
                enableADS: { value: true },
                enableVA: { value: true }
            }

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves(armParams)
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const paramError = new Error('Parameter conversion failed')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().rejects(paramError)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: sandbox.stub().callsFake((p) => p)
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('handles ConfigureDiagnostics failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const diagError = new Error('Diagnostics configuration failed')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().rejects(diagError)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Diagnostics configuration failed')
            }
        })

        it('works with different region configurations', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const customRegion: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'westus' }
            const ingredient = createIngredient(params)
            const ctx = createContext(customRegion, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('westus-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            expect(ctx.Region.name).to.equal('West US')
        })

        it('passes ARM template to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test-db', ingredient, ctx)
            await plugin.Execute()

            // Verify DeployTemplate was called with correct arguments
            expect(mockDeployTemplate.calledOnce).to.be.true
            const callArgs = mockDeployTemplate.getCall(0).args
            expect(callArgs[0]).to.equal('test-db') // name
            expect(callArgs[1]).to.have.property('$schema') // ARM template
            expect(callArgs[3]).to.equal('test-rg') // resource group
        })

        it('calls methods in correct order', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const callOrder: string[] = []
            const mockDeployTemplate = sandbox.stub().callsFake(() => {
                callOrder.push('DeployTemplate')
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().callsFake(() => {
                callOrder.push('BakeParamsToARMParamsAsync')
                return Promise.resolve({})
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => {
                callOrder.push('ConfigureDiagnostics')
                return Promise.resolve(p)
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(callOrder).to.deep.equal([
                'BakeParamsToARMParamsAsync',
                'ConfigureDiagnostics',
                'DeployTemplate'
            ])
        })

        it('handles diagnostics parameters correctly', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('databaseName', new BakeVariable('mydb'))
            params.set('diagnosticsEnabled', new BakeVariable('yes'))
            params.set('diagnosticsSettingName', new BakeVariable('myDiagSetting'))
            params.set('diagnosticsEventHubNamespace', new BakeVariable('myEventHub'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const originalParams = {
                databaseName: { value: 'mydb' },
                diagnosticsEnabled: { value: 'yes' },
                diagnosticsSettingName: { value: 'myDiagSetting' },
                diagnosticsEventHubNamespace: { value: 'myEventHub' }
            }
            const configuredParams = { ...originalParams, additionalDiagConfig: { value: true } }

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves(originalParams)
            const mockConfigureDiagnostics = sandbox.stub().resolves(configuredParams)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlDB('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockConfigureDiagnostics.calledWith(originalParams)).to.be.true
            // Verify configured params are passed to DeployTemplate
            const deployArgs = mockDeployTemplate.getCall(0).args
            expect(deployArgs[2]).to.deep.equal(configuredParams)
        })
    })
})

describe('SqlDB Plugin integration scenarios', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('supports serverless database tier configuration', async () => {
        const params = new Map<string, BakeVariable>()
        params.set('databaseName', new BakeVariable('serverlessdb'))
        params.set('serverName', new BakeVariable('myserver'))
        params.set('tier', new BakeVariable('GeneralPurpose'))
        params.set('skuName', new BakeVariable('GP_S_Gen5_1'))
        params.set('minCapacity', new BakeVariable('0.5'))
        params.set('autoPauseDelay', new BakeVariable('60'))
        
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const mockUtils = {
            resource_group: sandbox.stub().resolves('test-rg')
        }
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

        const mockDeployTemplate = sandbox.stub().resolves({})
        const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
            databaseName: { value: 'serverlessdb' },
            tier: { value: 'GeneralPurpose' },
            skuName: { value: 'GP_S_Gen5_1' },
            minCapacity: { value: '0.5' },
            autoPauseDelay: { value: '60' }
        })
        const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
        
        const ARMHelperStub = sandbox.stub().returns({
            DeployTemplate: mockDeployTemplate,
            BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
            ConfigureDiagnostics: mockConfigureDiagnostics
        })
        
        const armHelper = require('@azbake/arm-helper')
        sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

        const plugin = new SqlDB('serverless-test', ingredient, ctx)
        await plugin.Execute()

        expect(mockDeployTemplate.called).to.be.true
    })

    it('supports zone redundant configuration', async () => {
        const params = new Map<string, BakeVariable>()
        params.set('databaseName', new BakeVariable('zrdb'))
        params.set('serverName', new BakeVariable('myserver'))
        params.set('tier', new BakeVariable('Premium'))
        params.set('zoneRedundant', new BakeVariable('true'))
        params.set('numberOfReplicas', new BakeVariable('2'))
        
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const mockUtils = {
            resource_group: sandbox.stub().resolves('test-rg')
        }
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

        const mockDeployTemplate = sandbox.stub().resolves({})
        const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
            databaseName: { value: 'zrdb' },
            tier: { value: 'Premium' },
            zoneRedundant: { value: true },
            numberOfReplicas: { value: 2 }
        })
        const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
        
        const ARMHelperStub = sandbox.stub().returns({
            DeployTemplate: mockDeployTemplate,
            BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
            ConfigureDiagnostics: mockConfigureDiagnostics
        })
        
        const armHelper = require('@azbake/arm-helper')
        sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

        const plugin = new SqlDB('zr-test', ingredient, ctx)
        await plugin.Execute()

        expect(mockDeployTemplate.called).to.be.true
    })

    it('supports security features (ADS and VA)', async () => {
        const params = new Map<string, BakeVariable>()
        params.set('databaseName', new BakeVariable('securedb'))
        params.set('serverName', new BakeVariable('myserver'))
        params.set('enableADS', new BakeVariable('true'))
        params.set('enableVA', new BakeVariable('true'))
        
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const mockUtils = {
            resource_group: sandbox.stub().resolves('test-rg')
        }
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

        const mockDeployTemplate = sandbox.stub().resolves({})
        const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
            databaseName: { value: 'securedb' },
            enableADS: { value: true },
            enableVA: { value: true }
        })
        const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
        
        const ARMHelperStub = sandbox.stub().returns({
            DeployTemplate: mockDeployTemplate,
            BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
            ConfigureDiagnostics: mockConfigureDiagnostics
        })
        
        const armHelper = require('@azbake/arm-helper')
        sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

        const plugin = new SqlDB('secure-test', ingredient, ctx)
        await plugin.Execute()

        expect(mockDeployTemplate.called).to.be.true
    })

    it('supports read scale-out configuration', async () => {
        const params = new Map<string, BakeVariable>()
        params.set('databaseName', new BakeVariable('readscaledb'))
        params.set('serverName', new BakeVariable('myserver'))
        params.set('tier', new BakeVariable('Premium'))
        params.set('readScaleOut', new BakeVariable('Enabled'))
        
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const mockUtils = {
            resource_group: sandbox.stub().resolves('test-rg')
        }
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

        const mockDeployTemplate = sandbox.stub().resolves({})
        const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
            databaseName: { value: 'readscaledb' },
            tier: { value: 'Premium' },
            readScaleOut: { value: 'Enabled' }
        })
        const mockConfigureDiagnostics = sandbox.stub().callsFake((p) => p)
        
        const ARMHelperStub = sandbox.stub().returns({
            DeployTemplate: mockDeployTemplate,
            BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
            ConfigureDiagnostics: mockConfigureDiagnostics
        })
        
        const armHelper = require('@azbake/arm-helper')
        sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

        const plugin = new SqlDB('readscale-test', ingredient, ctx)
        await plugin.Execute()

        expect(mockDeployTemplate.called).to.be.true
    })
})
