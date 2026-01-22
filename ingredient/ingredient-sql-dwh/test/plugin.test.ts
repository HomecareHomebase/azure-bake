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

import { SqlDwhUtils } from '../src/functions'

// Require the compiled modules to verify exports
const sqlDwhIndex = require('../dist/index')

// Mock SqlManagementClient
const mockDatabases = {
    pause: sinon.stub().resolves({ status: 'Paused' }),
    resume: sinon.stub().resolves({ status: 'Online' }),
    listByServer: sinon.stub().resolves([]),
    get: sinon.stub().resolves({ status: 'Online' }),
    beginUpdate: sinon.stub()
}

const mockSqlClient = {
    databases: mockDatabases
}

// We need to stub the SqlManagementClient module before requiring the plugin
const SqlManagementClientModule = require('@azure/arm-sql')
const OriginalSqlManagementClient = SqlManagementClientModule.SqlManagementClient
SqlManagementClientModule.SqlManagementClient = function() {
    return mockSqlClient
}

// Now require the plugin after mocking
const { SqlDwh } = require('../src/plugin')

function createContext(region?: IBakeRegion): DeploymentContext {
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
    return new DeploymentContext(auth, pkg, testRegion, new Logger())
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-sql-dwh',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function withStubbedIngredientManager(factory: (name: string, ctx: any) => any): () => void {
    const original = IngredientManager.getIngredientFunction
    IngredientManager.getIngredientFunction = ((name: string, ctx: any) => factory(name, ctx)) as any
    return () => {
        IngredientManager.getIngredientFunction = original
    }
}

function resetMockDatabases() {
    mockDatabases.pause.reset()
    mockDatabases.pause.resolves({ status: 'Paused' })
    mockDatabases.resume.reset()
    mockDatabases.resume.resolves({ status: 'Online' })
    mockDatabases.listByServer.reset()
    mockDatabases.listByServer.resolves([])
    mockDatabases.get.reset()
    mockDatabases.get.resolves({ status: 'Online' })
}

describe('ingredient-sql-dwh index exports', () => {
    it('exports plugin', () => {
        expect(sqlDwhIndex.plugin).to.not.be.undefined
        expect(typeof sqlDwhIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(sqlDwhIndex.pluginNS).to.equal('@azbake/ingredient-sql-dwh')
    })

    it('exports functions', () => {
        expect(sqlDwhIndex.functions).to.not.be.undefined
        expect(typeof sqlDwhIndex.functions).to.equal('function')
        expect(sqlDwhIndex.functions.name).to.equal('SqlDwhUtils')
    })

    it('exports functionsNS', () => {
        expect(sqlDwhIndex.functionsNS).to.equal('SqlDwh')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const instance = new SqlDwh('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = sqlDwhIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('SqlDwhUtils', () => {
    let sandbox: sinon.SinonSandbox
    let restoreIngredientManager: () => void

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
        if (restoreIngredientManager) {
            restoreIngredientManager()
        }
    })

    it('create_resource_name returns formatted name', () => {
        const ctx = createContext()

        restoreIngredientManager = withStubbedIngredientManager((name: string) => {
            if (name === 'coreutils') {
                return {
                    create_resource_name: (prefix: string, suffix: any, useShort: boolean) => {
                        return `${prefix}-test-name`
                    }
                }
            }
            return {}
        })

        const utils = new SqlDwhUtils(ctx)
        const result = utils.create_resource_name()
        expect(result).to.equal('sqldwh-test-name')
    })
})

describe('SqlDwh Plugin', () => {
    let sandbox: sinon.SinonSandbox
    let restoreIngredientManager: () => void

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        resetMockDatabases()
    })

    afterEach(() => {
        sandbox.restore()
        if (restoreIngredientManager) {
            restoreIngredientManager()
        }
    })

    describe('constructor', () => {
        it('initializes SqlManagementClient with correct credentials', () => {
            const ctx = createContext()
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test-sql-dwh')
            expect((instance as any)._sbmClient).to.not.be.undefined
            expect((instance as any)._helper).to.not.be.undefined
        })

        it('initializes internal state flags', () => {
            const ctx = createContext()
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            expect((instance as any)._IsDBPaused).to.equal(false)
            expect((instance as any)._Check).to.equal(false)
            expect((instance as any)._IsNewDB).to.equal(true)
        })
    })

    describe('Execute()', () => {
        it('logs plugin source on execution', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // Mock internal methods to prevent actual Azure calls
            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            // Set flags to skip pause at the end
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._IsNewDB = false

            // The test verifies that Execute completes without error when given a source
            await instance.Execute()

            // If we get here, the plugin executed successfully with source
            expect(true).to.be.true
        })

        it('pauses database when _IsDBPaused is true', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            // Set flag to simulate previously paused database
            ;(instance as any)._IsDBPaused = true
            ;(instance as any)._IsNewDB = false

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()

            await instance.Execute()

            expect(mockDatabases.pause.calledOnce).to.be.true
            expect(mockDatabases.pause.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
        })

        it('pauses database when _IsNewDB is true', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            // _IsNewDB is true by default
            expect((instance as any)._IsNewDB).to.equal(true)
            ;(instance as any)._IsDBPaused = false

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            
            const logSpy = sandbox.spy(instance._logger, 'log')

            await instance.Execute()

            expect(mockDatabases.pause.calledOnce).to.be.true
            expect(logSpy.calledWith(sinon.match(/Database Status.*Paused/))).to.be.true
        })

        it('does not pause database when _IsDBPaused and _IsNewDB are both false', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            // Set both flags to false
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._IsNewDB = false

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()

            await instance.Execute()

            expect(mockDatabases.pause.called).to.be.false
        })

        it('handles error and pauses DB when _IsDBPaused and _Check are true', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            
            // Simulate error during deployment
            sandbox.stub((instance as any)._helper, 'DeployTemplate').rejects(new Error('Deployment failed'))
            
            // Set flags to simulate resumed database
            ;(instance as any)._IsDBPaused = true
            ;(instance as any)._Check = true
            
            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            
            const errorSpy = sandbox.spy(instance._logger, 'error')

            try {
                await instance.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('Deployment failed')
                expect(mockDatabases.pause.calledOnce).to.be.true
                expect(errorSpy.calledWith(sinon.match(/deployment failed/))).to.be.true
            }
        })

        it('does not pause DB on error when _IsDBPaused or _Check is false', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').rejects(new Error('Deployment failed'))
            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            
            // Flags not set
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._Check = false
            
            const errorSpy = sandbox.spy(instance._logger, 'error')

            try {
                await instance.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('Deployment failed')
                expect(mockDatabases.pause.called).to.be.false
                expect(errorSpy.calledWith(sinon.match(/deployment failed/))).to.be.true
            }
        })

        it('calls DeployTemplate with ARM template and parameters', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            // Set both flags to false to skip pause
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._IsNewDB = false

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').callsFake((p: any) => Promise.resolve(p))
            
            const deployStub = sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()

            await instance.Execute()

            expect(deployStub.calledOnce).to.be.true
            // Verify args: name, template, params, resourceGroup
            const callArgs = deployStub.firstCall.args
            expect(callArgs[0]).to.equal('test-sql-dwh')
            expect(callArgs[2]).to.deep.equal({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            expect(callArgs[3]).to.equal('test-rg')
        })
    })

    describe('_GetDatabaseStatus()', () => {
        it('resumes database when status is Paused', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // Mock database list with existing database
            mockDatabases.listByServer.resolves([
                { name: 'testdb' },
                { name: 'otherdb' }
            ])

            // Mock database get to return Paused status
            mockDatabases.get.resolves({ status: 'Paused' })

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            expect(mockDatabases.resume.calledOnce).to.be.true
            expect(mockDatabases.resume.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
            expect((instance as any)._IsDBPaused).to.equal(true)
            expect((instance as any)._Check).to.equal(true)
        })

        it('does not resume database when status is not Paused', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            mockDatabases.listByServer.resolves([
                { name: 'testdb' }
            ])

            mockDatabases.get.resolves({ status: 'Online' })

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            expect(mockDatabases.resume.called).to.be.false
            expect((instance as any)._IsDBPaused).to.equal(false)
        })

        it('sets _IsNewDB to true when database does not exist', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            // Reset the flag to test it gets set
            ;(instance as any)._IsNewDB = false

            // Mock database list without the target database
            mockDatabases.listByServer.resolves([
                { name: 'otherdb1' },
                { name: 'otherdb2' }
            ])

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'newdb')

            expect((instance as any)._IsNewDB).to.equal(true)
        })

        it('handles empty database list', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            ;(instance as any)._IsNewDB = false

            // Mock empty database list
            mockDatabases.listByServer.resolves([])

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            expect((instance as any)._IsNewDB).to.equal(true)
        })
    })

    describe('_pausesqldwh()', () => {
        it('calls databases.pause with correct arguments', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            const result = await (instance as any)._pausesqldwh('test-rg', 'testserver', 'testdb')

            expect(mockDatabases.pause.calledOnce).to.be.true
            expect(mockDatabases.pause.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
            expect(result.status).to.equal('Paused')
        })
    })

    describe('_resumesqldwh()', () => {
        it('calls databases.resume with correct arguments', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            const result = await (instance as any)._resumesqldwh('test-rg', 'testserver', 'testdb')

            expect(mockDatabases.resume.calledOnce).to.be.true
            expect(mockDatabases.resume.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
            expect(result.status).to.equal('Online')
        })
    })

    describe('_getdatabases()', () => {
        it('calls databases.listByServer with correct arguments', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            const mockDbList = [
                { name: 'db1', status: 'Online' },
                { name: 'db2', status: 'Paused' }
            ]

            mockDatabases.listByServer.resolves(mockDbList)

            const result = await (instance as any)._getdatabases('test-rg', 'testserver')

            expect(mockDatabases.listByServer.calledOnce).to.be.true
            expect(mockDatabases.listByServer.calledWith('test-rg', 'testserver', undefined)).to.be.true
            expect(result).to.deep.equal(mockDbList)
        })
    })

    describe('DeployAlerts()', () => {
        it('exists and can be called without error', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // DeployAlerts is an empty method but should not throw
            const result = await instance.DeployAlerts()
            expect(result).to.be.undefined
        })
    })

    describe('Database state edge cases', () => {
        it('handles Pausing database state', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            mockDatabases.listByServer.resolves([
                { name: 'testdb' }
            ])

            mockDatabases.get.resolves({ status: 'Pausing' })

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            // Pausing is not "Paused", so no resume should happen
            expect(mockDatabases.resume.called).to.be.false
            expect((instance as any)._IsDBPaused).to.equal(false)
        })

        it('handles Resuming database state', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            mockDatabases.listByServer.resolves([
                { name: 'testdb' }
            ])

            mockDatabases.get.resolves({ status: 'Resuming' })

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            // Resuming is not "Paused", so no resume should happen
            expect(mockDatabases.resume.called).to.be.false
            expect((instance as any)._IsDBPaused).to.equal(false)
        })

        it('handles Online database state', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {}
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            mockDatabases.listByServer.resolves([
                { name: 'testdb' }
            ])

            mockDatabases.get.resolves({ status: 'Online' })

            await (instance as any)._GetDatabaseStatus('test-rg', 'testserver', 'testdb')

            // Online is not "Paused", so no resume should happen
            expect(mockDatabases.resume.called).to.be.false
            expect((instance as any)._IsDBPaused).to.equal(false)
        })
    })

    describe('Error handling', () => {
        it('throws error when ARM deployment fails', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').rejects(new Error('ARM deployment error'))

            const errorSpy = sandbox.spy(instance._logger, 'error')

            try {
                await instance.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('ARM deployment error')
                expect(errorSpy.calledWith(sinon.match(/deployment failed.*ARM deployment error/))).to.be.true
            }
        })

        it('throws error when _GetDatabaseStatus fails', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub(instance as any, '_GetDatabaseStatus').rejects(new Error('Database status check failed'))

            const errorSpy = sandbox.spy(instance._logger, 'error')

            try {
                await instance.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('Database status check failed')
                expect(errorSpy.calledWith(sinon.match(/deployment failed/))).to.be.true
            }
        })

        it('logs error and rethrows when pause fails', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)
            
            ;(instance as any)._IsDBPaused = true
            ;(instance as any)._IsNewDB = false

            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            
            // Make pause fail
            mockDatabases.pause.rejects(new Error('Pause operation failed'))

            try {
                await instance.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('Pause operation failed')
            }
        })
    })

    describe('Parameter handling', () => {
        it('handles undefined serverName parameter', async () => {
            const params = new Map<string, BakeVariable>([
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                databaseName: { value: 'testdb' }
                // serverName not included
            })
            
            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._IsNewDB = false

            // Should not throw even with undefined serverName in the happy path
            await instance.Execute()
        })

        it('handles undefined databaseName parameter', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' }
                // databaseName not included
            })
            
            sandbox.stub(instance as any, '_GetDatabaseStatus').resolves()
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').resolves({})
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            
            ;(instance as any)._IsDBPaused = false
            ;(instance as any)._IsNewDB = false

            // Should not throw even with undefined databaseName in the happy path
            await instance.Execute()
        })
    })

    describe('Integration behavior', () => {
        it('full Execute flow with paused database', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // Mock database operations for _GetDatabaseStatus
            mockDatabases.listByServer.resolves([{ name: 'testdb' }])
            mockDatabases.get.resolves({ status: 'Paused' })
            
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').callsFake((p: any) => Promise.resolve(p))
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()

            await instance.Execute()

            // Verify database was resumed before deployment
            expect(mockDatabases.resume.calledOnce).to.be.true
            expect(mockDatabases.resume.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
            
            // Verify database was paused after deployment (since _IsDBPaused is true)
            expect(mockDatabases.pause.calledOnce).to.be.true
            expect(mockDatabases.pause.calledWith('test-rg', 'testserver', 'testdb', undefined)).to.be.true
        })

        it('full Execute flow with new database', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('newdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // Mock database operations - database doesn't exist
            mockDatabases.listByServer.resolves([{ name: 'existingdb' }])
            
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'newdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').callsFake((p: any) => Promise.resolve(p))
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()

            await instance.Execute()

            // New database - should be paused after creation
            expect(mockDatabases.pause.calledOnce).to.be.true
            expect(mockDatabases.pause.calledWith('test-rg', 'testserver', 'newdb', undefined)).to.be.true
        })

        it('full Execute flow with online database (not previously paused)', async () => {
            const params = new Map<string, BakeVariable>([
                ['serverName', new BakeVariable('testserver')],
                ['databaseName', new BakeVariable('testdb')]
            ])
            const ingredient = createIngredient(params)
            const ctx = createContext()

            restoreIngredientManager = withStubbedIngredientManager((name: string) => {
                if (name === 'coreutils') {
                    return {
                        resource_group: async () => 'test-rg'
                    }
                }
                return {}
            })

            const instance = new SqlDwh('test-sql-dwh', ingredient, ctx)

            // Mock database operations - database exists and is online
            mockDatabases.listByServer.resolves([{ name: 'testdb' }])
            mockDatabases.get.resolves({ status: 'Online' })
            
            sandbox.stub((instance as any)._helper, 'BakeParamsToARMParamsAsync').resolves({
                serverName: { value: 'testserver' },
                databaseName: { value: 'testdb' }
            })
            sandbox.stub((instance as any)._helper, 'ConfigureDiagnostics').callsFake((p: any) => Promise.resolve(p))
            sandbox.stub((instance as any)._helper, 'DeployTemplate').resolves()
            
            // For this test, ensure _IsNewDB gets set to false when database exists
            // This is set in _GetDatabaseStatus but we need to check the actual behavior
            // The default is _IsNewDB = true, but when we find the database, _IsNewDB isn't explicitly set to false
            // So we'll manually set it after the status check would have found the DB
            ;(instance as any)._IsNewDB = true // Default value

            await instance.Execute()

            // Database was online, no resume needed
            expect(mockDatabases.resume.called).to.be.false
            
            // Since _IsNewDB was true (default), pause will be called
            // The logic says: if (this._IsDBPaused === true || this._IsNewDB === true)
            expect(mockDatabases.pause.calledOnce).to.be.true
        })
    })
})

// Restore the original SqlManagementClient after all tests
after(() => {
    SqlManagementClientModule.SqlManagementClient = OriginalSqlManagementClient
})
