import { expect } from 'chai'
import 'mocha'

import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger
} from '@azbake/core'

import { SearchOperator } from '../src/models'
import { PropertyType } from '../src/propertyTypes'
import { ClientBase, ClientFactory, PropertyClient, PropertyServiceSource, SecretClient } from '../src/client'

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg)
    } as unknown as Logger

    return { logger, logs, errors }
}

function createContext(source: BakeVariable) {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'pkg',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'Dev',
        environmentCode: 'dev',
        regions: [{ name: 'East', shortName: 'east', code: 'eus' }],
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

    const ingredient: IIngredient = {
        properties: {
            type: '@azbake/ingredient-property-service',
            source,
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    const { logger, logs, errors } = createLogger()
    const context = new DeploymentContext({} as any, pkg, env.regions[0] as IBakeRegion, logger, ingredient)

    return { context, logs, errors }
}

class TestClient extends ClientBase<any> {
    public searchResult: any[] | null = null

    constructor(logger: Logger) {
        super(logger, 'https://base', 'token')
    }

    public async Search(
        operator: SearchOperator,
        name: string,
        selectors: { [key: string]: string } | undefined
    ): Promise<any[] | null> {
        return this.searchResult
    }

    public async Create(model: any): Promise<any | null> {
        return null
    }

    public async Update(model: any): Promise<any | null> {
        return null
    }

    public async Delete(id: string, name: string, version: string | null): Promise<boolean> {
        return false
    }

    public ExposeGetSearchName(name: string, selectors: { [key: string]: string } | undefined): string {
        return this.GetSearchName(name, selectors)
    }

    public ExposeLogClientError(type: string, operation: string, status: any, body: any): void {
        this.LogClientError(type, operation, status, body)
    }
}

describe('property-service client utilities', () => {
    describe('PropertyServiceSource.Parse', () => {
        it('parses base and resource URLs', async () => {
            const { context, logs } = createContext(
                new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any)
            )

            const source = await PropertyServiceSource.Parse(context)

            expect(source.baseUrl).to.equal('https://base')
            expect(source.resourceUrl).to.equal('https://resource')
            expect(logs.some((msg) => msg.includes('baseurl'))).to.equal(true)
            expect(logs.some((msg) => msg.includes('resourceUrl'))).to.equal(true)
        })

        it('rejects when the source is missing', async () => {
            const { context } = createContext(new BakeVariable(null as any))

            let error: unknown = null
            try {
                await PropertyServiceSource.Parse(context)
            } catch (err) {
                error = err
            }

            expect(`${error}`).to.contain('properties.source is null')
        })

        it('rejects when baseUrl is missing', async () => {
            const { context } = createContext(new BakeVariable({ resourceUrl: 'https://resource' } as any))

            let error: unknown = null
            try {
                await PropertyServiceSource.Parse(context)
            } catch (err) {
                error = err
            }

            expect(`${error}`).to.contain('baseUrl element')
        })

        it('rejects when resourceUrl is missing', async () => {
            const { context } = createContext(new BakeVariable({ baseUrl: 'https://base' } as any))

            let error: unknown = null
            try {
                await PropertyServiceSource.Parse(context)
            } catch (err) {
                error = err
            }

            expect(`${error}`).to.contain('resourceUrl element')
        })
    })

    describe('ClientBase helpers', () => {
        it('returns a single search result when exactly one item is found', async () => {
            const { logger } = createLogger()
            const client = new TestClient(logger)
            client.searchResult = [{ id: '1' }]

            const result = await client.SearchSingle('alpha', undefined)
            expect(result).to.deep.equal({ id: '1' })
        })

        it('returns null when the search result is empty or non-unique', async () => {
            const { logger } = createLogger()
            const client = new TestClient(logger)

            client.searchResult = []
            expect(await client.SearchSingle('alpha', undefined)).to.equal(null)

            client.searchResult = [{ id: '1' }, { id: '2' }]
            expect(await client.SearchSingle('alpha', undefined)).to.equal(null)
        })

        it('builds selector search strings deterministically', () => {
            const { logger } = createLogger()
            const client = new TestClient(logger)

            expect(client.ExposeGetSearchName('name', undefined)).to.equal('name')
            expect(client.ExposeGetSearchName('name', { env: 'dev', region: 'west' })).to.equal(
                'name&selectors[env]=dev&selectors[region]=west'
            )
        })

        it('logs formatted client errors', () => {
            const { logger, errors } = createLogger()
            const client = new TestClient(logger)

            client.ExposeLogClientError('property', 'search', 500, 'boom')

            expect(errors.length).to.equal(1)
            expect(errors[0]).to.contain('Status [500]')
        })
    })

    describe('ClientFactory', () => {
        it('creates typed property and secret clients', () => {
            const { logger } = createLogger()
            const factory = new ClientFactory(logger, 'https://base', 'token')

            expect(factory.CreatePropertyClient()).to.be.instanceOf(PropertyClient)
            expect(factory.CreateSecretClient()).to.be.instanceOf(SecretClient)
        })

        it('throws for unsupported client types', () => {
            const { logger } = createLogger()
            const factory = new ClientFactory(logger, 'https://base', 'token')

            expect(() => factory.CreateClient(PropertyType.Certificate)).to.throw('valid client type')
        })
    })

    describe('PropertyClient', () => {
        it('returns search results and skips 404 errors', async () => {
            const { logger, errors } = createLogger()
            const client = new PropertyClient(logger, 'https://base', 'token') as any

            const searchCalls: Array<{ name: string; operator: SearchOperator }> = []
            client._client = {
                propertyOperations: {
                    search: async (name: string, operator: SearchOperator) => {
                        searchCalls.push({ name, operator })
                        return { _response: { status: 200, parsedBody: [{ id: '1', name: 'alpha', value: 'one' }] } }
                    }
                }
            }

            const result = await client.Search(SearchOperator.Equals, 'alpha', { env: 'dev' })
            expect(result).to.deep.equal([{ id: '1', name: 'alpha', value: 'one' }])
            expect(searchCalls[0].name).to.equal('alpha&selectors[env]=dev')
            expect(errors.length).to.equal(0)

            client._client.propertyOperations.search = async () => ({
                _response: { status: 404, bodyAsText: 'not found' }
            })

            const missing = await client.Search(SearchOperator.Equals, 'alpha', undefined)
            expect(missing).to.equal(null)
            expect(errors.length).to.equal(0)
        })

        it('logs errors for failed create/update/delete operations', async () => {
            const { logger, errors } = createLogger()
            const client = new PropertyClient(logger, 'https://base', 'token') as any

            client._client = {
                propertyOperations: {
                    create: async () => ({ _response: { status: 500, bodyAsText: 'boom' } }),
                    update: async () => ({ _response: { status: 404, bodyAsText: 'missing' } }),
                    deleteMethod: async () => ({ _response: { status: 503, bodyAsText: 'down' } })
                }
            }

            expect(await client.Create({ id: '1', name: 'alpha', value: 'one' })).to.equal(null)
            expect(await client.Update({ id: '1', name: 'alpha', value: 'one' })).to.equal(null)
            expect(await client.Delete('1', 'alpha', null)).to.equal(false)
            expect(errors.length).to.equal(2)
        })
    })

    describe('SecretClient', () => {
        it('returns search results and logs errors for failures', async () => {
            const { logger, errors } = createLogger()
            const client = new SecretClient(logger, 'https://base', 'token') as any

            client._client = {
                secretOperations: {
                    search: async () => ({
                        _response: { status: 200, parsedBody: [{ id: '1', name: 'alpha', value: 'secret' }] }
                    }),
                    create: async () => ({ _response: { status: 400, bodyAsText: 'bad' } }),
                    update: async () => ({ _response: { status: 500, bodyAsText: 'boom' } }),
                    deleteMethod: async () => ({ _response: { status: 200 } })
                }
            }

            const result = await client.Search(SearchOperator.Equals, 'alpha', undefined)
            expect(result).to.deep.equal([{ id: '1', name: 'alpha', value: 'secret' }])
            expect(await client.Create({ id: '1', name: 'alpha', value: 'secret' })).to.equal(null)
            expect(await client.Update({ id: '1', name: 'alpha', value: 'secret' })).to.equal(null)
            expect(await client.Delete('1', 'alpha', undefined)).to.equal(true)
            expect(errors.length).to.equal(2)
        })

        it('passes an empty version when none is specified', async () => {
            const { logger } = createLogger()
            const client = new SecretClient(logger, 'https://base', 'token') as any
            const deleteArgs: any[] = []

            client._client = {
                secretOperations: {
                    deleteMethod: async (version: string, id: string, name: string) => {
                        deleteArgs.push(version, id, name)
                        return { _response: { status: 200 } }
                    }
                }
            }

            expect(await client.Delete('1', 'alpha', null)).to.equal(true)
            expect(deleteArgs[0]).to.equal('')
        })
    })
})