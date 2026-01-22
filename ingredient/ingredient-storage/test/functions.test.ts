import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IngredientManager,
    Logger
} from '@azbake/core'

import { StorageUtils, BakeStorageAccount, BakeStorageContainer } from '../src/functions'

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

describe('StorageUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates storage resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobsttst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new StorageUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobsttst')
            expect(mockUtils.create_resource_name.calledWith('st', null, false)).to.be.true
        })
    })

    describe('get_primary_key', () => {
        it('returns primary key from storage account', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: [
                            { value: 'primary-key-123' },
                            { value: 'secondary-key-456' }
                        ]
                    })
                }
            }

            const StorageManagementClientStub = sandbox.stub().returns(mockStorageClient)
            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').callsFake(StorageManagementClientStub)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_primary_key('mystorageaccount')

            expect(result).to.equal('primary-key-123')
        })

        it('returns empty string when keys array is empty', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: undefined
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_primary_key('mystorageaccount')

            expect(result).to.equal('')
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: [{ value: 'key1' }]
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            await utils.get_primary_key('mystorageaccount', 'custom-rg')

            expect(mockStorageClient.storageAccounts.listKeys.calledWith('custom-rg', 'mystorageaccount')).to.be.true
        })
    })

    describe('get_secondary_key', () => {
        it('returns secondary key from storage account', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: [
                            { value: 'primary-key-123' },
                            { value: 'secondary-key-456' }
                        ]
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_secondary_key('mystorageaccount')

            expect(result).to.equal('secondary-key-456')
        })

        it('returns empty string when keys array is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: undefined
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_secondary_key('mystorageaccount')

            expect(result).to.equal('')
        })
    })

    describe('get_primary_connectionstring', () => {
        it('builds connection string using primary key', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: [{ value: 'my-primary-key' }]
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_primary_connectionstring('mystorageaccount')

            expect(result).to.equal('DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=my-primary-key;')
        })
    })

    describe('get_secondary_connectionstring', () => {
        it('builds connection string using secondary key', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockStorageClient = {
                storageAccounts: {
                    listKeys: sandbox.stub().resolves({
                        keys: [
                            { value: 'primary-key' },
                            { value: 'my-secondary-key' }
                        ]
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_secondary_connectionstring('mystorageaccount')

            expect(result).to.equal('DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=my-secondary-key;')
        })
    })

    describe('get_storageaccount', () => {
        it('returns BakeStorageAccount with properties', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEndpoints = {
                blob: 'https://mystorageaccount.blob.core.windows.net/',
                table: 'https://mystorageaccount.table.core.windows.net/'
            }

            const mockStorageClient = {
                storageAccounts: {
                    getProperties: sandbox.stub().resolves({
                        primaryEndpoints: mockEndpoints
                    }),
                    listKeys: sandbox.stub().resolves({
                        keys: [{ value: 'account-key' }]
                    })
                }
            }

            const armStorage = require('@azure/arm-storage')
            sandbox.stub(armStorage, 'StorageManagementClient').returns(mockStorageClient)

            const utils = new StorageUtils(ctx)
            const result = await utils.get_storageaccount('test-rg', 'mystorageaccount')

            expect(result).to.be.instanceOf(BakeStorageAccount)
            expect(result.name).to.equal('mystorageaccount')
            expect(result.rg).to.equal('test-rg')
            expect(result.key).to.equal('account-key')
            expect(result.endpoints).to.deep.equal(mockEndpoints)
        })
    })

    describe('add_delete_policy', () => {
        it('creates a delete policy with default filters', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('delete-all', true, 90)

            expect(rule.name).to.equal('delete-all')
            expect(rule.enabled).to.equal(true)
            expect(rule.definition).to.exist

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters.blobTypes).to.deep.equal(['blockBlob'])
            expect(filters).to.not.have.property('prefixMatch')
            expect(filters).to.not.have.property('blobIndexMatch')
            expect(definition.actions.baseBlob.deleteProperty.daysAfterModificationGreaterThan).to.equal(90)
        })

        it('creates a delete policy with prefixMatch filter', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('delete-logs', true, 30, {
                prefixMatch: ['logs/', 'temp/']
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters.prefixMatch).to.deep.equal(['logs/', 'temp/'])
        })

        it('creates a delete policy with blobIndexMatch filter', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('delete-tagged', true, 14, {
                blobIndexMatch: [{ name: 'status', op: '==', value: 'archived' }]
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters.blobIndexMatch).to.deep.equal([{ name: 'status', op: '==', value: 'archived' }])
        })

        it('creates a delete policy with custom blobTypes', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('delete-all-types', true, 30, {
                blobTypes: ['blockBlob', 'appendBlob']
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters.blobTypes).to.deep.equal(['blockBlob', 'appendBlob'])
        })

        it('creates a disabled delete policy', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('disabled-policy', false, 60)

            expect(rule.enabled).to.equal(false)
        })

        it('creates delete policy with all optional filters', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('full-filter', true, 7, {
                prefixMatch: ['data/temp/', 'cache/'],
                blobIndexMatch: [
                    { name: 'env', op: '==', value: 'dev' },
                    { name: 'type', op: '==', value: 'log' }
                ],
                blobTypes: ['blockBlob', 'appendBlob']
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters.prefixMatch).to.deep.equal(['data/temp/', 'cache/'])
            expect(filters.blobIndexMatch).to.have.length(2)
            expect(filters.blobTypes).to.deep.equal(['blockBlob', 'appendBlob'])
        })

        it('ignores empty prefixMatch array', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('no-prefix', true, 30, {
                prefixMatch: []
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters).to.not.have.property('prefixMatch')
        })

        it('ignores empty blobIndexMatch array', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('no-tags', true, 30, {
                blobIndexMatch: []
            })

            const definition: any = rule.definition
            const filters: any = definition.filters
            expect(filters).to.not.have.property('blobIndexMatch')
        })
    })

    describe('create_policy', () => {
        it('creates a policy from multiple rules', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const ruleA = utils.add_delete_policy('delete-5', true, 5)
            const ruleB = utils.add_delete_policy('delete-30', false, 30, { prefixMatch: ['archive/'] })
            const ruleC = utils.add_delete_policy('delete-90', true, 90)
            const policy = utils.create_policy(ruleA, ruleB, ruleC)

            expect(policy.rules).to.have.length(3)
            expect(policy.rules).to.deep.equal([ruleA, ruleB, ruleC])
        })

        it('creates an empty policy with no rules', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const policy = utils.create_policy()

            expect(policy.rules).to.deep.equal([])
        })

        it('creates a policy with a single rule', () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const rule = utils.add_delete_policy('single-rule', true, 7)
            const policy = utils.create_policy(rule)

            expect(policy.rules).to.have.length(1)
            expect(policy.rules![0]).to.equal(rule)
        })
    })

    describe('get_container', () => {
        it('returns null when endpoints are undefined', async () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const account: BakeStorageAccount = {
                endpoints: undefined,
                name: 'testaccount',
                rg: 'testrg',
                key: 'testkey'
            }

            const result = await utils.get_container(account, 'mycontainer')

            expect(result).to.be.null
        })

        it('returns null when blob endpoint is undefined', async () => {
            const ctx = createContext()
            const utils = new StorageUtils(ctx)

            const account: BakeStorageAccount = {
                endpoints: { blob: undefined },
                name: 'testaccount',
                rg: 'testrg',
                key: 'testkey'
            }

            const result = await utils.get_container(account, 'mycontainer')

            expect(result).to.be.null
        })
    })

    describe('BakeStorageAccount class', () => {
        it('initializes with default values', () => {
            const account = new BakeStorageAccount()

            expect(account.name).to.equal('')
            expect(account.rg).to.equal('')
            expect(account.key).to.equal('')
            expect(account.endpoints).to.be.undefined
        })

        it('allows setting properties', () => {
            const account = new BakeStorageAccount()
            account.name = 'myaccount'
            account.rg = 'myrg'
            account.key = 'mykey'
            account.endpoints = { blob: 'https://test.blob.core.windows.net/' }

            expect(account.name).to.equal('myaccount')
            expect(account.rg).to.equal('myrg')
            expect(account.key).to.equal('mykey')
            expect(account.endpoints).to.deep.equal({ blob: 'https://test.blob.core.windows.net/' })
        })
    })

    describe('BakeStorageContainer class', () => {
        it('initializes with undefined values', () => {
            const container = new BakeStorageContainer()

            expect(container.account).to.be.undefined
            expect(container.container).to.be.undefined
        })

        it('allows setting properties', () => {
            const account = new BakeStorageAccount()
            account.name = 'myaccount'

            const container = new BakeStorageContainer()
            container.account = account
            container.container = 'mycontainer'

            expect(container.account).to.equal(account)
            expect(container.container).to.equal('mycontainer')
        })
    })
})
