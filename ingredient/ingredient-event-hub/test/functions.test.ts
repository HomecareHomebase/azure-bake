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

import { EventHubUtils } from '../src/functions'

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

describe('EventHubUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates event hub resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobehtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new EventHubUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobehtst')
            expect(mockUtils.create_resource_name.calledWith('eh', null, true)).to.be.true
        })
    })

    describe('get_primary_key', () => {
        it('returns primary key from event hub', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: 'eh-primary-key-123',
                        secondaryKey: 'eh-secondary-key-456',
                        primaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=primarykey',
                        secondaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=secondarykey'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_primary_key('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('eh-primary-key-123')
        })

        it('returns empty string when primaryKey is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: undefined,
                        secondaryKey: 'eh-secondary-key'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_primary_key('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('')
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: 'key1'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            await utils.get_primary_key('my-namespace', 'my-eventhub', 'my-policy', 'custom-rg')

            expect(mockEventHubClient.eventHubs.listKeys.calledWith('custom-rg', 'my-namespace', 'my-eventhub', 'my-policy')).to.be.true
        })

        it('uses default resource group when rg is null', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('auto-resolved-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: 'key1'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            await utils.get_primary_key('my-namespace', 'my-eventhub', 'my-policy', null)

            expect(mockEventHubClient.eventHubs.listKeys.calledWith('auto-resolved-rg', 'my-namespace', 'my-eventhub', 'my-policy')).to.be.true
        })
    })

    describe('get_secondary_key', () => {
        it('returns secondary key from event hub', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: 'eh-primary-key-123',
                        secondaryKey: 'eh-secondary-key-456'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_secondary_key('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('eh-secondary-key-456')
        })

        it('returns empty string when secondaryKey is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryKey: 'eh-primary-key',
                        secondaryKey: undefined
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_secondary_key('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('')
        })

        it('uses custom resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        secondaryKey: 'key2'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            await utils.get_secondary_key('my-namespace', 'my-eventhub', 'my-policy', 'my-custom-rg')

            expect(mockEventHubClient.eventHubs.listKeys.calledWith('my-custom-rg', 'my-namespace', 'my-eventhub', 'my-policy')).to.be.true
        })
    })

    describe('get_primary_connectionstring', () => {
        it('returns primary connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=primarykey;EntityPath=myhub'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_primary_connectionstring('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=primarykey;EntityPath=myhub')
        })

        it('returns empty string when primaryConnectionString is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryConnectionString: undefined
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_primary_connectionstring('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('')
        })

        it('uses custom resource group when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        primaryConnectionString: 'conn'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            await utils.get_primary_connectionstring('my-namespace', 'my-eventhub', 'my-policy', 'custom-rg')

            expect(mockEventHubClient.eventHubs.listKeys.calledWith('custom-rg', 'my-namespace', 'my-eventhub', 'my-policy')).to.be.true
        })
    })

    describe('get_secondary_connectionstring', () => {
        it('returns secondary connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        secondaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=secondarykey;EntityPath=myhub'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_secondary_connectionstring('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=secondarykey;EntityPath=myhub')
        })

        it('returns empty string when secondaryConnectionString is undefined', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        secondaryConnectionString: undefined
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            const result = await utils.get_secondary_connectionstring('my-namespace', 'my-eventhub', 'my-policy')

            expect(result).to.equal('')
        })

        it('uses custom resource group when provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves({
                        secondaryConnectionString: 'conn'
                    })
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)
            await utils.get_secondary_connectionstring('my-namespace', 'my-eventhub', 'my-policy', 'another-rg')

            expect(mockEventHubClient.eventHubs.listKeys.calledWith('another-rg', 'my-namespace', 'my-eventhub', 'my-policy')).to.be.true
        })
    })

    describe('multiple operations reuse get_keys', () => {
        it('handles all key types from single listKeys call', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const fullResponse = {
                primaryKey: 'primary-key',
                secondaryKey: 'secondary-key',
                primaryConnectionString: 'primary-conn-string',
                secondaryConnectionString: 'secondary-conn-string',
                keyName: 'my-policy',
                aliasPrimaryConnectionString: 'alias-primary',
                aliasSecondaryConnectionString: 'alias-secondary'
            }

            const mockEventHubClient = {
                eventHubs: {
                    listKeys: sandbox.stub().resolves(fullResponse)
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubUtils(ctx)

            const primaryKey = await utils.get_primary_key('ns', 'eh', 'policy')
            const secondaryKey = await utils.get_secondary_key('ns', 'eh', 'policy')
            const primaryConn = await utils.get_primary_connectionstring('ns', 'eh', 'policy')
            const secondaryConn = await utils.get_secondary_connectionstring('ns', 'eh', 'policy')

            expect(primaryKey).to.equal('primary-key')
            expect(secondaryKey).to.equal('secondary-key')
            expect(primaryConn).to.equal('primary-conn-string')
            expect(secondaryConn).to.equal('secondary-conn-string')
        })
    })
})
