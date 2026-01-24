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

import { CosmosUtility } from '../src/functions'

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

describe('CosmosUtility', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates cosmos resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobcosmstst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new CosmosUtility(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobcosmstst')
            expect(mockUtils.create_resource_name.calledWith('cosms', null, true)).to.be.true
        })
    })

    describe('get_primary_key', () => {
        it('returns primary master key from cosmos account', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: 'cosmos-primary-key-123',
                        secondaryMasterKey: 'cosmos-secondary-key-456'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_key('mycosmosaccount')

            expect(result).to.equal('cosmos-primary-key-123')
        })

        it('returns empty string when primaryMasterKey is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: undefined,
                        secondaryMasterKey: 'cosmos-secondary-key'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_key('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: 'key1'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            await utils.get_primary_key('mycosmosaccount', 'custom-rg')

            expect(mockCosmosClient.databaseAccounts.listKeys.calledWith('custom-rg', 'mycosmosaccount')).to.be.true
        })

        it('uses default resource group when rg is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('auto-resolved-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: 'key1'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            await utils.get_primary_key('mycosmosaccount', null)

            expect(mockCosmosClient.databaseAccounts.listKeys.calledWith('auto-resolved-rg', 'mycosmosaccount')).to.be.true
        })
    })

    describe('get_secondary_key', () => {
        it('returns secondary master key from cosmos account', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: 'cosmos-primary-key-123',
                        secondaryMasterKey: 'cosmos-secondary-key-456'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_key('mycosmosaccount')

            expect(result).to.equal('cosmos-secondary-key-456')
        })

        it('returns empty string when secondaryMasterKey is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        primaryMasterKey: 'cosmos-primary-key',
                        secondaryMasterKey: undefined
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_key('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('uses custom resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listKeys: sandbox.stub().resolves({
                        secondaryMasterKey: 'key2'
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            await utils.get_secondary_key('mycosmosaccount', 'my-custom-rg')

            expect(mockCosmosClient.databaseAccounts.listKeys.calledWith('my-custom-rg', 'mycosmosaccount')).to.be.true
        })
    })

    describe('get_primary_connectionstring', () => {
        it('returns primary SQL connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Primary SQL Connection String', connectionString: 'AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=primarykey;' },
                            { description: 'Secondary SQL Connection String', connectionString: 'AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=secondarykey;' },
                            { description: 'Primary Read-Only Connection String', connectionString: 'readonly-conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_connectionstring('mycosmosaccount')

            expect(result).to.equal('AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=primarykey;')
        })

        it('returns empty string when connectionStrings is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: undefined
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('returns empty string when no matching connection string found', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Some Other Connection String', connectionString: 'some-conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('returns empty string when connectionString property is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Primary SQL Connection String', connectionString: undefined }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_primary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('uses custom resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Primary SQL Connection String', connectionString: 'conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            await utils.get_primary_connectionstring('mycosmosaccount', 'custom-rg')

            expect(mockCosmosClient.databaseAccounts.listConnectionStrings.calledWith('custom-rg', 'mycosmosaccount')).to.be.true
        })
    })

    describe('get_secondary_connectionstring', () => {
        it('returns secondary SQL connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Primary SQL Connection String', connectionString: 'primary-conn' },
                            { description: 'Secondary SQL Connection String', connectionString: 'AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=secondarykey;' },
                            { description: 'Primary Read-Only Connection String', connectionString: 'readonly-conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_connectionstring('mycosmosaccount')

            expect(result).to.equal('AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=secondarykey;')
        })

        it('returns empty string when connectionStrings is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: undefined
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('returns empty string when no matching connection string found', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Primary SQL Connection String', connectionString: 'primary-conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('returns empty string when connectionString property is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Secondary SQL Connection String', connectionString: undefined }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            const result = await utils.get_secondary_connectionstring('mycosmosaccount')

            expect(result).to.equal('')
        })

        it('uses custom resource group when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockCosmosClient = {
                databaseAccounts: {
                    listConnectionStrings: sandbox.stub().resolves({
                        connectionStrings: [
                            { description: 'Secondary SQL Connection String', connectionString: 'conn' }
                        ]
                    })
                }
            }

            const utils = new CosmosUtility(ctx)
            sandbox.stub(utils as any, 'createClient').returns(mockCosmosClient)
            await utils.get_secondary_connectionstring('mycosmosaccount', 'another-rg')

            expect(mockCosmosClient.databaseAccounts.listConnectionStrings.calledWith('another-rg', 'mycosmosaccount')).to.be.true
        })
    })
})
