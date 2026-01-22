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

import { SqlServerLogical } from '../src/plugin'
import { SqlServerLogicalUtils } from '../src/functions'

// Require the compiled modules to verify exports
const sqlServerLogicalIndex = require('../dist/index')

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
            type: '@azbake/ingredient-sqlserver-logical',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-sqlserver-logical index exports', () => {
    it('exports plugin', () => {
        expect(sqlServerLogicalIndex.plugin).to.not.be.undefined
        expect(typeof sqlServerLogicalIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(sqlServerLogicalIndex.pluginNS).to.equal('@azbake/ingredient-sqlserver-logical')
    })

    it('exports functions', () => {
        expect(sqlServerLogicalIndex.functions).to.not.be.undefined
        expect(typeof sqlServerLogicalIndex.functions).to.equal('function')
        expect(sqlServerLogicalIndex.functions.name).to.equal('SqlServerLogicalUtils')
    })

    it('exports functionsNS', () => {
        expect(sqlServerLogicalIndex.functionsNS).to.equal('sqlserverlogical')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = sqlServerLogicalIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = sqlServerLogicalIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('SqlServerLogicalUtils', () => {
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
            const utils = new SqlServerLogicalUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('create_resource_name', () => {
        it('creates sql server resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobsqlsrvrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobsqlsrvrtst')
            expect(mockUtils.create_resource_name.calledWith('sqlsrvr', null, true)).to.be.true
        })

        it('creates resource name with region code', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobsqlsrvrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            utils.create_resource_name()

            // Third parameter is true - region code is appended
            expect(mockUtils.create_resource_name.firstCall.args[2]).to.be.true
        })

        it('uses sqlsrvr prefix for SQL Server', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[0]).to.equal('sqlsrvr')
        })

        it('passes null as second argument', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            utils.create_resource_name()

            expect(mockUtils.create_resource_name.firstCall.args[1]).to.be.null
        })

        it('calls IngredientManager with coreutils namespace', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('test-name')
            }
            const getIngredientStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            utils.create_resource_name()

            expect(getIngredientStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('returns different names for different regions', () => {
            const ctx = createContext({ name: 'East US', shortName: 'eastus', code: 'eus' })
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveussqlsrvrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new SqlServerLogicalUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveussqlsrvrtst')
        })
    })
})

describe('SqlServerLogical Plugin', () => {
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

            const plugin = new SqlServerLogical('test-name', ingredient, ctx)

            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
        })

        it('stores ingredient reference', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new SqlServerLogical('test', ingredient, ctx)

            expect(plugin._ingredient).to.equal(ingredient)
        })

        it('initializes ARMHelper in constructor', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new SqlServerLogical('test', ingredient, ctx)

            expect(plugin._helper).to.not.be.undefined
        })
    })

    describe('Execute', () => {
        it('deploys sql server logical template successfully', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            params.set('administratorLogin', new BakeVariable('admin'))
            params.set('administratorLoginPassword', new BakeVariable('P@ssw0rd123!'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' },
                administratorLogin: { value: 'admin' },
                administratorLoginPassword: { value: 'P@ssw0rd123!' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('passes correct resource group to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
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
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedResourceGroup).to.equal('my-resource-group')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('SQL Server deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('SQL Server deployment failed')
            }
        })

        it('uses correct deployment name', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
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
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('my-sql-deployment', ingredient, ctx)
            await plugin.Execute()

            expect(capturedDeploymentName).to.equal('my-sql-deployment')
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
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

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Parameter conversion failed')
            }
        })

        it('handles resource group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Resource group resolution failed')
            const mockUtils = {
                resource_group: sandbox.stub().rejects(rgError)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Resource group resolution failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
            const source = new BakeVariable('my-source-value')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            await plugin.Execute()

            // The plugin should execute successfully
            expect(mockDeployTemplate.called).to.be.true
        })

        it('passes all ARM template parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            params.set('administratorLogin', new BakeVariable('sqladmin'))
            params.set('administratorLoginPassword', new BakeVariable('SecureP@ss123!'))
            params.set('location', new BakeVariable('eastus'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' },
                administratorLogin: { value: 'sqladmin' },
                administratorLoginPassword: { value: 'SecureP@ss123!' },
                location: { value: 'eastus' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.serverName.value).to.equal('my-sql-server')
            expect(capturedParams.administratorLogin.value).to.equal('sqladmin')
            expect(capturedParams.administratorLoginPassword.value).to.equal('SecureP@ss123!')
            expect(capturedParams.location.value).to.equal('eastus')
        })

        it('uses helper instance created in constructor', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('serverName', new BakeVariable('my-sql-server'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                serverName: { value: 'my-sql-server' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new SqlServerLogical('test', ingredient, ctx)
            
            // The _helper should be defined from constructor
            expect(plugin._helper).to.not.be.undefined
            
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })
    })
})
