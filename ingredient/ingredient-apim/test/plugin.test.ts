import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger,
    IngredientManager
} from '@azbake/core'

import { ApimPlugin } from '../src/plugin'

function createContext(): DeploymentContext {
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
            subscriptionId: 'sub',
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

    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = {
        domain: 'tenant',
        clientId: 'service',
        secret: 'secret',
        getToken: async () => ({ token: 'test-token', expiresOnTimestamp: Date.now() + 3600000 })
    }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

function createIngredient(params?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-apim',
            source: new BakeVariable('source'),
            parameters: params || new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ApimPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('ResolveApim', () => {
        it('sets default location from context region', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test'
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.location).to.equal('Global')
        })

        it('uses provided location when specified', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                location: 'eastus',
                sku: { name: 'Premium', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test'
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.location).to.equal('eastus')
        })

        it('warns and clears additionalLocations for non-Premium sku', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            const warnSpy = sandbox.spy(plugin._logger, 'warn')

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                additionalLocations: [{ location: 'westus', sku: { name: 'Developer' } }]
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.additionalLocations).to.be.undefined
            expect(warnSpy.calledOnce).to.be.true
        })

        it('resolves additionalLocations for Premium sku', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Premium', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                additionalLocations: [
                    { location: 'westus', sku: { name: 'Premium', capacity: 1 } }
                ]
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.additionalLocations).to.have.lengthOf(1)
            expect(result.additionalLocations[0].location).to.equal('westus')
        })

        it('resolves virtualNetworkConfiguration subnetResourceId', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                virtualNetworkConfiguration: {
                    subnetResourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet'
                }
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.virtualNetworkConfiguration.subnetResourceId).to.contain('subnets/subnet')
        })

        it('resolves hostnameConfigurations', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                hostnameConfigurations: [
                    { 
                        hostName: 'api.test.com', 
                        type: 'Proxy',
                        keyVaultId: 'https://kv.vault.azure.net/secrets/cert'
                    }
                ]
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.hostnameConfigurations[0].hostName).to.equal('api.test.com')
        })

        it('resolves certificates array', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                certificates: [
                    { 
                        encodedCertificate: 'base64cert',
                        certificatePassword: 'password',
                        storeName: 'Root'
                    }
                ]
            }

            const result = await plugin.ResolveApim(apim)
            expect(result.certificates[0].storeName).to.equal('Root')
        })
    })

    describe('ResolveDiagnostics', () => {
        it('resolves eventHubName and storageAccountId', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const diagnostics = {
                name: 'diag',
                eventHubName: 'eventhub',
                eventHubAuthorizationRuleId: '/subs/sub/resourceGroups/rg/providers/Microsoft.EventHub/namespaces/ns/authorizationRules/rule',
                storageAccountId: '/subs/sub/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa'
            }

            const result = await plugin.ResolveDiagnostics(diagnostics)
            expect(result.eventHubName).to.equal('eventhub')
            expect(result.storageAccountId).to.contain('storageAccounts/sa')
        })
    })

    describe('ResolveBackend', () => {
        it('resolves backend name and url', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const backend = {
                name: 'backend-1',
                url: 'https://backend.example.com',
                protocol: 'http'
            }

            const result = await plugin.ResolveBackend(backend)
            expect(result.name).to.equal('backend-1')
            expect(result.url).to.equal('https://backend.example.com')
        })
    })

    describe('ResolveNamedValue', () => {
        it('resolves named value', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const namedValue = {
                name: 'my-value',
                displayName: 'My Value',
                value: 'secret-value'
            }

            const result = await plugin.ResolveNamedValue(namedValue)
            expect(result.value).to.equal('secret-value')
        })
    })

    describe('ResolveLogger', () => {
        it('resolves applicationInsights logger', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const logger = {
                name: 'ai-logger',
                loggerType: 'applicationInsights',
                credentials: {
                    instrumentationKey: 'my-ai-key'
                }
            }

            const result = await plugin.ResolveLogger(logger)
            expect(result.credentials.instrumentationKey).to.equal('my-ai-key')
        })

        it('resolves azureEventHub logger', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const logger = {
                name: 'eh-logger',
                loggerType: 'azureEventHub',
                credentials: {
                    name: 'eventhub-name',
                    connectionString: 'Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=key;SharedAccessKey=value'
                }
            }

            const result = await plugin.ResolveLogger(logger)
            expect(result.credentials.name).to.equal('eventhub-name')
            expect(result.credentials.connectionString).to.contain('servicebus.windows.net')
        })
    })

    describe('ResolveAuthServer', () => {
        it('resolves auth server endpoints and credentials', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const authServer = {
                name: 'oauth-server',
                displayName: 'OAuth Server',
                clientRegistrationEndpoint: 'https://login.example.com/register',
                authorizationEndpoint: 'https://login.example.com/authorize',
                tokenEndpoint: 'https://login.example.com/token',
                clientId: 'client-id',
                clientSecret: 'client-secret',
                grantTypes: ['authorizationCode']
            }

            const result = await plugin.ResolveAuthServer(authServer)
            expect(result.clientId).to.equal('client-id')
            expect(result.clientSecret).to.equal('client-secret')
            expect(result.tokenEndpoint).to.contain('token')
        })

        it('resolves tokenBodyParameters', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const authServer = {
                name: 'oauth-server',
                clientId: 'client',
                tokenBodyParameters: [
                    { name: 'resource', value: 'https://api.example.com' }
                ],
                grantTypes: ['clientCredentials']
            }

            const result = await plugin.ResolveAuthServer(authServer)
            expect(result.tokenBodyParameters[0].name).to.equal('resource')
        })

        it('resolves resourceOwner credentials', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const authServer = {
                name: 'oauth-server',
                clientId: 'client',
                resourceOwnerUsername: 'user',
                resourceOwnerPassword: 'pass',
                grantTypes: ['resourceOwnerPassword']
            }

            const result = await plugin.ResolveAuthServer(authServer)
            expect(result.resourceOwnerUsername).to.equal('user')
            expect(result.resourceOwnerPassword).to.equal('pass')
        })
    })

    describe('ResolveIdentityProvider', () => {
        it('resolves identity provider settings', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const identityProvider = {
                name: 'aad',
                authority: 'https://login.microsoftonline.com/tenant',
                clientId: 'aad-client-id',
                clientSecret: 'aad-client-secret'
            }

            const result = await plugin.ResolveIdentityProvider(identityProvider)
            expect(result.authority).to.contain('login.microsoftonline.com')
            expect(result.clientId).to.equal('aad-client-id')
        })
    })

    describe('ResolvePolicy', () => {
        it('returns policy as-is for non-link formats', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const policy = { format: 'xml', value: '<policies />' }
            const result = await plugin.ResolvePolicy(policy)
            expect(result.format).to.equal('xml')
            expect(result.value).to.equal('<policies />')
        })

        it('reads file content for xml-link format', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apim-policy-'))
            const policyPath = path.join(tempDir, 'policy.xml')
            fs.writeFileSync(policyPath, '<policies><inbound /></policies>')

            const fileUri = `file:///${policyPath.replace(/\\/g, '/')}`
            const policy = { format: 'xml-link', value: fileUri }

            const result = await plugin.ResolvePolicy(policy)
            expect(result.format).to.equal('xml')
            expect(result.value).to.contain('<inbound />')

            fs.unlinkSync(policyPath)
            fs.rmdirSync(tempDir)
        })

        it('reads file content for rawxml-link format', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apim-rawpolicy-'))
            const policyPath = path.join(tempDir, 'raw-policy.xml')
            fs.writeFileSync(policyPath, '<policies><backend /></policies>')

            const fileUri = `file:///${policyPath.replace(/\\/g, '/')}`
            const policy = { format: 'rawxml-link', value: fileUri }

            const result = await plugin.ResolvePolicy(policy)
            expect(result.format).to.equal('xml')
            expect(result.value).to.contain('<backend />')

            fs.unlinkSync(policyPath)
            fs.rmdirSync(tempDir)
        })

        it('throws for http links', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const policy = { format: 'xml-link', value: 'https://example.com/policy.xml' }

            let error: Error | undefined
            try {
                await plugin.ResolvePolicy(policy)
            } catch (e: any) {
                error = e
            }

            expect(error).to.be.instanceOf(Error)
            expect(error?.message).to.contain('Could not resolve policy content')
        })
    })

    describe('ResolveAutoscaleSetting', () => {
        it('returns settings unchanged when apim is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim = undefined

            const settings = { name: 'scale', profiles: [] }
            const result = await plugin.ResolveAutoscaleSetting(settings)
            expect(result).to.equal(settings)
        })

        it('populates defaults from apim instance', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim = { 
                id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim',
                location: 'eastus'
            }

            const settings = {
                name: 'autoscale',
                profiles: [
                    {
                        name: 'default',
                        capacity: { minimum: '1', maximum: '10', default: '1' },
                        rules: [
                            { metricTrigger: { metricResourceUri: '' }, scaleAction: {} }
                        ]
                    }
                ]
            }

            const result = await plugin.ResolveAutoscaleSetting(settings)
            expect(result.autoscaleSettingResourceName).to.equal('autoscale')
            expect(result.location).to.equal('eastus')
            expect(result.targetResourceUri).to.equal(plugin.apim.id)
            expect(result.profiles[0].rules[0].metricTrigger.metricResourceUri).to.equal(plugin.apim.id)
        })
    })

    describe('GetUserId', () => {
        it('returns undefined when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            const result = await plugin.GetUserId('testuser')
            expect(result).to.be.undefined
        })

        it('converts Administrator to id "1"', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    get: sandbox.stub().resolves({ id: '/users/1' })
                }
            }

            const result = await plugin.GetUserId('Administrator')
            expect(plugin.apim_client.user.get.calledWith('rg', 'apim', '1')).to.be.true
            expect(result).to.equal('/users/1')
        })

        it('uses provided username', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    get: sandbox.stub().resolves({ id: '/users/custom-user' })
                }
            }

            const result = await plugin.GetUserId('custom-user')
            expect(plugin.apim_client.user.get.calledWith('rg', 'apim', 'custom-user')).to.be.true
            expect(result).to.equal('/users/custom-user')
        })
    })

    describe('GetArrayFromPagedIterator', () => {
        it('flattens paged results into array', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const mockIterator = {
                byPage: () => ({
                    async *[Symbol.asyncIterator]() {
                        yield [{ name: 'item1' }, { name: 'item2' }]
                        yield [{ name: 'item3' }]
                    }
                })
            }

            const result = await plugin.GetArrayFromPagedIterator(mockIterator as any)
            expect(result).to.have.lengthOf(3)
            expect(result[0].name).to.equal('item1')
            expect(result[2].name).to.equal('item3')
        })
    })

    describe('LogResponseIfError', () => {
        it('logs error for status >= 400', () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            plugin.LogResponseIfError({ status: 400 }, 'Bad request')
            expect(errorSpy.calledWith('Bad request')).to.be.true
        })

        it('logs error for 500 status', () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            plugin.LogResponseIfError({ status: 500 }, 'Server error')
            expect(errorSpy.calledWith('Server error')).to.be.true
        })

        it('does not log for status < 400', () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            plugin.LogResponseIfError({ status: 200 }, 'Should not log')
            expect(errorSpy.called).to.be.false
        })
    })

    describe('Build methods with mocked client', () => {
        it('BuildGroup calls createOrUpdate on group', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                group: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const group = { name: 'developers', displayName: 'Developers' }
            await plugin.BuildGroup(group)

            expect(plugin.apim_client.group.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.group.createOrUpdate.firstCall.args[2]).to.equal('developers')
        })

        it('BuildUser creates user and assigns groups', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                groupUser: {
                    create: sandbox.stub().resolves({})
                }
            }

            const user = { 
                name: 'testuser', 
                email: 'test@test.com',
                firstName: 'Test',
                lastName: 'User',
                groups: ['developers', 'admins'] 
            }
            await plugin.BuildUser(user)

            expect(plugin.apim_client.user.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.groupUser.create.calledTwice).to.be.true
        })

        it('BuildNamedValue calls beginCreateOrUpdateAndWait', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                namedValue: {
                    beginCreateOrUpdateAndWait: sandbox.stub().resolves({})
                }
            }

            const namedValue = { name: 'config-value', displayName: 'Config', value: 'test' }
            await plugin.BuildNamedValue(namedValue)

            expect(plugin.apim_client.namedValue.beginCreateOrUpdateAndWait.calledOnce).to.be.true
        })

        it('BuildSubscription sets scope from product', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                subscription: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const sub: any = { name: 'sub-1', displayName: 'Subscription 1', product: 'starter' }
            await plugin.BuildSubscription(sub)

            expect(sub.scope).to.equal('/products/starter')
            expect(plugin.apim_client.subscription.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildSubscription sets scope from api', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                subscription: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const sub: any = { name: 'sub-2', displayName: 'Subscription 2', api: 'my-api' }
            await plugin.BuildSubscription(sub)

            expect(sub.scope).to.equal('/apis/my-api')
        })

        it('BuildSubscription sets default scope to /apis', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                subscription: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const sub: any = { name: 'sub-3', displayName: 'Subscription 3' }
            await plugin.BuildSubscription(sub)

            expect(sub.scope).to.equal('/apis')
        })

        it('DeleteApi calls delete with correct params', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                api: {
                    beginDeleteAndWait: sandbox.stub().resolves({})
                }
            }

            await plugin.DeleteApi({ name: 'old-api', delete: true })

            expect(plugin.apim_client.api.beginDeleteAndWait.calledOnce).to.be.true
            expect(plugin.apim_client.api.beginDeleteAndWait.firstCall.args[2]).to.equal('old-api')
        })

        it('DeleteProduct calls delete with correct params', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                product: {
                    beginDeleteAndWait: sandbox.stub().resolves({})
                }
            }

            await plugin.DeleteProduct({ name: 'old-product', delete: true })

            expect(plugin.apim_client.product.beginDeleteAndWait.calledOnce).to.be.true
            expect(plugin.apim_client.product.beginDeleteAndWait.firstCall.args[2]).to.equal('old-product')
        })

        it('BuildProduct creates product and assigns apis and groups', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                product: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productApi: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productGroup: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productPolicy: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const product = {
                name: 'premium',
                displayName: 'Premium',
                apis: ['api-1', 'api-2'],
                groups: ['developers'],
                policy: { format: 'xml', value: '<policies />' }
            }

            await plugin.BuildProduct(product)

            expect(plugin.apim_client.product.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.productApi.createOrUpdate.calledTwice).to.be.true
            expect(plugin.apim_client.productGroup.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.productPolicy.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildAuthServer calls createOrUpdate', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                authorizationServer: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const authServer = {
                name: 'auth',
                displayName: 'Auth Server',
                clientId: 'client',
                grantTypes: ['clientCredentials']
            }

            await plugin.BuildAuthServer(authServer)

            expect(plugin.apim_client.authorizationServer.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildIdentityProvider skips when name is missing', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            const errorSpy = sandbox.spy(plugin._logger, 'error')
            plugin.apim_client = {
                identityProvider: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildIdentityProvider({})

            expect(errorSpy.calledWith('APIM Plugin: identityProviderContractType is required')).to.be.true
            expect(plugin.apim_client.identityProvider.createOrUpdate.called).to.be.false
        })

        it('BuildIdentityProvider calls createOrUpdate with name', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                identityProvider: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildIdentityProvider({ name: 'aad', clientId: 'id', clientSecret: 'secret' })

            expect(plugin.apim_client.identityProvider.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildBackend calls createOrUpdate', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim = { id: '/apim', location: 'eastus' }
            plugin.apim_client = {
                backend: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildBackend({ name: 'backend', url: 'https://api.com', protocol: 'http' })

            expect(plugin.apim_client.backend.createOrUpdate.calledOnce).to.be.true
        })
    })

    describe('Build collection methods', () => {
        it('BuildGroups iterates through groups array', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('groups', new BakeVariable([
                { name: 'group1', displayName: 'Group 1' },
                { name: 'group2', displayName: 'Group 2' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                group: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildGroups()

            expect(plugin.apim_client.group.createOrUpdate.calledTwice).to.be.true
        })

        it('BuildUsers iterates through users array', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('users', new BakeVariable([
                { name: 'user1', email: 'u1@test.com', firstName: 'User', lastName: 'One' },
                { name: 'user2', email: 'u2@test.com', firstName: 'User', lastName: 'Two' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                groupUser: {
                    create: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildUsers()

            expect(plugin.apim_client.user.createOrUpdate.calledTwice).to.be.true
        })

        it('BuildNamedValues iterates through namedValues array', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namedValues', new BakeVariable([
                { name: 'val1', displayName: 'Val 1', value: 'v1' },
                { name: 'val2', displayName: 'Val 2', value: 'v2' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                namedValue: {
                    beginCreateOrUpdateAndWait: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildNamedValues()

            expect(plugin.apim_client.namedValue.beginCreateOrUpdateAndWait.calledTwice).to.be.true
        })

        it('BuildAPIs deletes apis marked for deletion', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('apis', new BakeVariable([
                { name: 'api1', delete: true },
                { name: 'api2', delete: false }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                api: {
                    beginDeleteAndWait: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildAPIs()

            expect(plugin.apim_client.api.beginDeleteAndWait.calledOnce).to.be.true
        })

        it('BuildProducts handles both create and delete', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('products', new BakeVariable([
                { name: 'keep-product', displayName: 'Keep' },
                { name: 'delete-product', delete: true }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                product: {
                    createOrUpdate: sandbox.stub().resolves({}),
                    beginDeleteAndWait: sandbox.stub().resolves({})
                },
                productApi: { createOrUpdate: sandbox.stub().resolves({}) },
                productGroup: { createOrUpdate: sandbox.stub().resolves({}) },
                productPolicy: { createOrUpdate: sandbox.stub().resolves({}) }
            }

            await plugin.BuildProducts()

            expect(plugin.apim_client.product.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.product.beginDeleteAndWait.calledOnce).to.be.true
        })

        it('BuilSubscriptions iterates through subscriptions', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('subscriptions', new BakeVariable([
                { name: 'sub1', displayName: 'Sub 1', product: 'prod1' },
                { name: 'sub2', displayName: 'Sub 2', api: 'api1' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                subscription: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuilSubscriptions()

            expect(plugin.apim_client.subscription.createOrUpdate.calledTwice).to.be.true
        })

        it('BuildAuthServers iterates through auth servers', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('authServers', new BakeVariable([
                { name: 'auth1', clientId: 'c1', grantTypes: ['clientCredentials'] }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                authorizationServer: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildAuthServers()

            expect(plugin.apim_client.authorizationServer.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildIdentityProviders iterates through identity providers', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('identityProviders', new BakeVariable([
                { name: 'aad', clientId: 'id', clientSecret: 'secret' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                identityProvider: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildIdentityProviders()

            expect(plugin.apim_client.identityProvider.createOrUpdate.calledOnce).to.be.true
        })

        it('BuildAutoscaleSettings skips for non-Premium/Standard sku', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('autoScaleSettings', new BakeVariable([
                { name: 'scale', profiles: [] }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.apim = { sku: { name: 'Developer' } }
            const warnSpy = sandbox.spy(plugin._logger, 'warn')

            await plugin.BuildAutoscaleSettings()

            expect(warnSpy.calledOnce).to.be.true
        })

        it('BuildBackends iterates through backends', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('backends', new BakeVariable([
                { name: 'backend1', url: 'https://api1.com', protocol: 'http' }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim = { id: '/apim', location: 'eastus' }
            plugin.apim_client = {
                backend: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            await plugin.BuildBackends()

            expect(plugin.apim_client.backend.createOrUpdate.calledOnce).to.be.true
        })
    })

    describe('BuildLogger', () => {
        it('logs error for unsupported logger type', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {}
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            await plugin.BuildLogger({ name: 'logger', loggerType: 'unsupported' })

            expect(errorSpy.calledWith('APIM Plugin: Specified Logger functionality is yet to be implemented')).to.be.true
        })

        it('creates applicationInsights logger and cleans old keys', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                logger: {
                    createOrUpdate: sandbox.stub().resolves({
                        credentials: { instrumentationKey: '{{Logger.Credentials-abc}}' }
                    })
                },
                namedValue: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            async *[Symbol.asyncIterator]() {
                                yield [
                                    { name: 'old-key', displayName: 'Logger.Credentials-old', secret: true },
                                    { name: 'current-key', displayName: 'Logger.Credentials-abc', secret: true }
                                ]
                            }
                        })
                    }),
                    listValue: sandbox.stub().resolves({ value: 'my-ai-key' }),
                    getEntityTag: sandbox.stub().resolves({ eTag: 'etag-123' }),
                    delete: sandbox.stub().resolves({})
                }
            }

            const logger = {
                name: 'ai-logger',
                loggerType: 'applicationInsights',
                credentials: { instrumentationKey: 'my-ai-key' },
                cleanKeys: true
            }

            await plugin.BuildLogger(logger)

            expect(plugin.apim_client.logger.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.namedValue.delete.calledOnce).to.be.true
        })

        it('skips key cleanup when cleanKeys is false', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                logger: {
                    createOrUpdate: sandbox.stub().resolves({
                        credentials: { instrumentationKey: '{{Logger.Credentials-abc}}' }
                    })
                },
                namedValue: {
                    listByService: sandbox.stub()
                }
            }

            const logger = {
                name: 'ai-logger',
                loggerType: 'applicationInsights',
                credentials: { instrumentationKey: 'key' },
                cleanKeys: false
            }

            await plugin.BuildLogger(logger)

            expect(plugin.apim_client.namedValue.listByService.called).to.be.false
        })

        it('handles azureEventHub logger', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                logger: {
                    createOrUpdate: sandbox.stub().resolves({
                        credentials: { connectionString: '{{Logger.Credentials-eh}}' }
                    })
                },
                namedValue: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            async *[Symbol.asyncIterator]() {
                                yield []
                            }
                        })
                    }),
                    listValue: sandbox.stub().resolves({ value: 'conn-string' })
                }
            }

            const logger = {
                name: 'eh-logger',
                loggerType: 'azureEventHub',
                credentials: {
                    name: 'hub',
                    connectionString: 'conn-string'
                }
            }

            await plugin.BuildLogger(logger)

            expect(plugin.apim_client.logger.createOrUpdate.calledOnce).to.be.true
        })
    })

    describe('Setup', () => {
        const originalGetIngredientFunction = IngredientManager.getIngredientFunction

        afterEach(() => {
            ;(IngredientManager as any).getIngredientFunction = originalGetIngredientFunction
        })

        it('returns false when resource_group is empty', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => '',
                resource_group: async () => '',
                parseResource: () => ({ resourceGroup: '', resource: '' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            const result = await plugin.Setup()

            expect(result).to.be.false
            expect(errorSpy.calledWith('APIM Plugin: resourceGroup can not be empty')).to.be.true
        })

        it('returns false when resource_name is empty', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => '',
                resource_group: async () => 'test-rg',
                parseResource: () => ({ resourceGroup: 'test-rg', resource: '' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            const result = await plugin.Setup()

            expect(result).to.be.false
            expect(errorSpy.calledWith('APIM Plugin: resourceName can not be empty')).to.be.true
        })

        it('parses source string to get resource group and name', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'fallback-rg',
                parseResource: (source: string) => {
                    const parts = source.split('/')
                    return {
                        resourceGroup: parts[0],
                        resource: parts[1]
                    }
                }
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('custom-rg/custom-apim')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any

            const result = await plugin.Setup()

            expect(result).to.be.true
            expect(plugin.resource_group).to.equal('custom-rg')
            expect(plugin.resource_name).to.equal('custom-apim')
        })

        it('uses apimService parameter for name when source is empty', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'param-rg',
                parseResource: () => ({ resourceGroup: '', resource: '' })
            })

            const params = new Map<string, BakeVariable>()
            params.set('apimService', new BakeVariable({ name: 'apim-from-param' } as any))

            const ctx = createContext()
            const ingredient = createIngredient(params)
            ingredient.properties.source = new BakeVariable('')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any

            const result = await plugin.Setup()

            expect(result).to.be.true
            expect(plugin.resource_group).to.equal('param-rg')
            expect(plugin.resource_name).to.equal('apim-from-param')
        })

        it('creates APIM client on successful setup', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'test-rg',
                parseResource: () => ({ resourceGroup: 'test-rg', resource: 'test-apim' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('test-rg/test-apim')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any

            const result = await plugin.Setup()

            expect(result).to.be.true
            expect(plugin.apim_client).to.not.be.undefined
        })
    })

    describe('Execute', () => {
        const originalGetIngredientFunction = IngredientManager.getIngredientFunction

        afterEach(() => {
            ;(IngredientManager as any).getIngredientFunction = originalGetIngredientFunction
        })

        it('catches and rethrows errors', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test',
                resource_group: async () => { throw new Error('Setup failed') },
                parseResource: () => ({ resourceGroup: '', resource: '' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            let error: Error | undefined
            try {
                await plugin.Execute()
            } catch (e: any) {
                error = e
            }

            expect(error).to.be.instanceOf(Error)
            expect(error?.message).to.equal('Setup failed')
            expect(errorSpy.calledOnce).to.be.true
        })

        it('does not proceed if Setup returns false', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => '',
                resource_group: async () => '',
                parseResource: () => ({ resourceGroup: '', resource: '' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any

            // Spy on BuildAPIM to ensure it's not called
            const buildApimSpy = sandbox.spy(plugin, 'BuildAPIM')

            await plugin.Execute()

            expect(buildApimSpy.called).to.be.false
        })

        it('calls all build methods in order when Setup succeeds', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test-apim',
                resource_group: async () => 'test-rg',
                parseResource: () => ({ resourceGroup: 'test-rg', resource: 'test-apim' })
            })

            const ctx = createContext()
            const ingredient = createIngredient()
            ingredient.properties.source = new BakeVariable('test-rg/test-apim')
            const plugin = new ApimPlugin('apim', ingredient, ctx) as any

            // Stub all the build methods
            const stubs = {
                BuildAPIM: sandbox.stub(plugin, 'BuildAPIM').resolves(),
                BuildDiagnostics: sandbox.stub(plugin, 'BuildDiagnostics').resolves(),
                BuildNamedValues: sandbox.stub(plugin, 'BuildNamedValues').resolves(),
                BuildGroups: sandbox.stub(plugin, 'BuildGroups').resolves(),
                BuildUsers: sandbox.stub(plugin, 'BuildUsers').resolves(),
                BuildLoggers: sandbox.stub(plugin, 'BuildLoggers').resolves(),
                BuildAPIs: sandbox.stub(plugin, 'BuildAPIs').resolves(),
                BuildProducts: sandbox.stub(plugin, 'BuildProducts').resolves(),
                BuilSubscriptions: sandbox.stub(plugin, 'BuilSubscriptions').resolves(),
                BuildAuthServers: sandbox.stub(plugin, 'BuildAuthServers').resolves(),
                BuildIdentityProviders: sandbox.stub(plugin, 'BuildIdentityProviders').resolves(),
                BuildAutoscaleSettings: sandbox.stub(plugin, 'BuildAutoscaleSettings').resolves(),
                BuildBackends: sandbox.stub(plugin, 'BuildBackends').resolves()
            }

            await plugin.Execute()

            // Verify all methods were called
            expect(stubs.BuildAPIM.calledOnce).to.be.true
            expect(stubs.BuildDiagnostics.calledOnce).to.be.true
            expect(stubs.BuildNamedValues.calledOnce).to.be.true
            expect(stubs.BuildGroups.calledOnce).to.be.true
            expect(stubs.BuildUsers.calledOnce).to.be.true
            expect(stubs.BuildLoggers.calledOnce).to.be.true
            expect(stubs.BuildAPIs.calledOnce).to.be.true
            expect(stubs.BuildProducts.calledOnce).to.be.true
            expect(stubs.BuilSubscriptions.calledOnce).to.be.true
            expect(stubs.BuildAuthServers.calledOnce).to.be.true
            expect(stubs.BuildIdentityProviders.calledOnce).to.be.true
            expect(stubs.BuildAutoscaleSettings.calledOnce).to.be.true
            expect(stubs.BuildBackends.calledOnce).to.be.true
        })
    })

    describe('BuildAPIM', () => {
        it('returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            // Should not throw
            await plugin.BuildAPIM()
        })

        it('returns early when apimService parameter is not set', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = {}

            // Should not throw
            await plugin.BuildAPIM()
        })

        it('calls beginCreateOrUpdateAndWait with resolved apim data', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('apimService', new BakeVariable({
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test'
            } as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'

            const mockApim = { id: '/apim', location: 'Global' }
            plugin.apim_client = {
                apiManagementService: {
                    beginCreateOrUpdateAndWait: sandbox.stub().resolves(mockApim)
                }
            }

            await plugin.BuildAPIM()

            expect(plugin.apim_client.apiManagementService.beginCreateOrUpdateAndWait.calledOnce).to.be.true
            expect(plugin.apim).to.deep.equal(mockApim)
        })

        it('logs error when beginCreateOrUpdateAndWait fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('apimService', new BakeVariable({
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test'
            } as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'

            plugin.apim_client = {
                apiManagementService: {
                    beginCreateOrUpdateAndWait: sandbox.stub().rejects(new Error('API call failed'))
                }
            }

            let error: Error | undefined
            try {
                await plugin.BuildAPIM()
            } catch (e: any) {
                error = e
            }

            expect(error).to.be.instanceOf(Error)
        })
    })

    describe('BuildDiagnostics', () => {
        it('returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildDiagnostics()
        })

        it('returns early when diagnostics parameter is not set', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = {}

            await plugin.BuildDiagnostics()
        })
    })

    describe('BuildLoggers', () => {
        it('returns early when loggers parameter is not set', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = {}

            await plugin.BuildLoggers()
        })

        it('iterates through loggers array', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('loggers', new BakeVariable([
                { name: 'logger1', loggerType: 'applicationInsights', credentials: { instrumentationKey: 'key1' } },
                { name: 'logger2', loggerType: 'applicationInsights', credentials: { instrumentationKey: 'key2' } }
            ] as any))

            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(params), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                logger: {
                    createOrUpdate: sandbox.stub().resolves({
                        credentials: { instrumentationKey: '{{Logger.Credentials-abc}}' }
                    })
                },
                namedValue: {
                    listByService: sandbox.stub().returns({
                        byPage: () => ({
                            async *[Symbol.asyncIterator]() {
                                yield []
                            }
                        })
                    })
                }
            }

            await plugin.BuildLoggers()

            expect(plugin.apim_client.logger.createOrUpdate.calledTwice).to.be.true
        })
    })

    describe('Edge cases', () => {
        it('GetUserId defaults to Administrator when user is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    get: sandbox.stub().resolves({ id: '/users/1' })
                }
            }

            const result = await plugin.GetUserId(undefined)

            expect(plugin.apim_client.user.get.calledWith('rg', 'apim', '1')).to.be.true
            expect(result).to.equal('/users/1')
        })

        it('BuildSubscription sets ownerId when user is specified', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    get: sandbox.stub().resolves({ id: '/users/testuser' })
                },
                subscription: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const sub: any = { name: 'sub-1', displayName: 'Subscription 1', user: 'testuser' }
            await plugin.BuildSubscription(sub)

            expect(sub.ownerId).to.equal('/users/testuser')
        })

        it('ResolveAutoscaleSetting returns unchanged when apim.id is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim = { location: 'eastus' } // No id

            const settings = { name: 'scale', profiles: [] }
            const result = await plugin.ResolveAutoscaleSetting(settings)

            expect(result).to.equal(settings)
        })

        it('ResolveApim handles additionalLocations with virtualNetworkConfiguration', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Premium', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                additionalLocations: [
                    {
                        location: 'westus',
                        sku: { name: 'Premium', capacity: 1 },
                        virtualNetworkConfiguration: {
                            subnetResourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet'
                        }
                    }
                ]
            }

            const result = await plugin.ResolveApim(apim)

            expect(result.additionalLocations[0].virtualNetworkConfiguration.subnetResourceId).to.contain('subnets/subnet')
        })

        it('ResolveApim handles hostnameConfigurations with certificate details', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                hostnameConfigurations: [
                    {
                        hostName: 'api.test.com',
                        type: 'Proxy',
                        encodedCertificate: 'base64cert',
                        certificatePassword: 'password',
                        certificate: {
                            expiry: '2025-01-01',
                            thumbprint: 'ABC123',
                            subject: 'CN=api.test.com'
                        }
                    }
                ]
            }

            const result = await plugin.ResolveApim(apim)

            expect(result.hostnameConfigurations[0].certificate.thumbprint).to.equal('ABC123')
        })

        it('ResolveApim handles certificates with certificate details', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any

            const apim = {
                name: 'test-apim',
                sku: { name: 'Developer', capacity: 1 },
                publisherEmail: 'test@test.com',
                publisherName: 'Test',
                certificates: [
                    {
                        encodedCertificate: 'base64cert',
                        certificatePassword: 'password',
                        storeName: 'Root',
                        certificate: {
                            expiry: '2025-01-01',
                            thumbprint: 'XYZ789',
                            subject: 'CN=ca.test.com'
                        }
                    }
                ]
            }

            const result = await plugin.ResolveApim(apim)

            expect(result.certificates[0].certificate.thumbprint).to.equal('XYZ789')
        })

        it('BuildProduct handles product without apis, groups, or policy', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                product: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productApi: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productGroup: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                productPolicy: {
                    createOrUpdate: sandbox.stub().resolves({})
                }
            }

            const product = {
                name: 'basic',
                displayName: 'Basic'
                // No apis, groups, or policy
            }

            await plugin.BuildProduct(product)

            expect(plugin.apim_client.product.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.productApi.createOrUpdate.called).to.be.false
            expect(plugin.apim_client.productGroup.createOrUpdate.called).to.be.false
            expect(plugin.apim_client.productPolicy.createOrUpdate.called).to.be.false
        })

        it('BuildUser handles user without groups', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.resource_group = 'rg'
            plugin.resource_name = 'apim'
            plugin.apim_client = {
                user: {
                    createOrUpdate: sandbox.stub().resolves({})
                },
                groupUser: {
                    create: sandbox.stub().resolves({})
                }
            }

            const user = {
                name: 'testuser',
                email: 'test@test.com',
                firstName: 'Test',
                lastName: 'User'
                // No groups
            }

            await plugin.BuildUser(user)

            expect(plugin.apim_client.user.createOrUpdate.calledOnce).to.be.true
            expect(plugin.apim_client.groupUser.create.called).to.be.false
        })

        it('BuildBackend returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildBackend({ name: 'backend', url: 'https://api.com', protocol: 'http' })
            // Should not throw
        })

        it('BuildGroup returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildGroup({ name: 'group', displayName: 'Group' })
            // Should not throw
        })

        it('BuildUser returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildUser({ name: 'user', email: 'test@test.com', firstName: 'Test', lastName: 'User' })
            // Should not throw
        })

        it('BuildSubscription returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildSubscription({ name: 'sub', displayName: 'Sub' } as any)
            // Should not throw
        })

        it('BuildProduct returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildProduct({ name: 'prod', displayName: 'Prod' } as any)
            // Should not throw
        })

        it('BuildAuthServer returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildAuthServer({ name: 'auth', clientId: 'id', grantTypes: [] } as any)
            // Should not throw
        })

        it('BuildIdentityProvider returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildIdentityProvider({ name: 'aad', clientId: 'id', clientSecret: 'secret' })
            // Should not throw
        })

        it('BuildLogger returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildLogger({ name: 'logger', loggerType: 'applicationInsights', cleanKeys: false })
            // Should not throw
        })

        it('BuildNamedValue returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildNamedValue({ name: 'nv', displayName: 'NV', value: 'val' })
            // Should not throw
        })

        it('BuildAutoscaleSetting returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.BuildAutoscaleSetting({ name: 'scale', profiles: [] } as any)
            // Should not throw
        })

        it('DeleteApi returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.DeleteApi({ name: 'api', delete: true })
            // Should not throw
        })

        it('DeleteProduct returns early when apim_client is undefined', async () => {
            const ctx = createContext()
            const plugin = new ApimPlugin('apim', createIngredient(), ctx) as any
            plugin.apim_client = undefined

            await plugin.DeleteProduct({ name: 'prod', delete: true } as any)
            // Should not throw
        })
    })
})
