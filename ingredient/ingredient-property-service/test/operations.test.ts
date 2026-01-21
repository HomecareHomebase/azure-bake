import { expect } from 'chai'
import 'mocha'
import 'colors'

import { Logger } from '@azbake/core'

import { SearchOperator } from '../src/models'
import {
    ICreateConfiguration,
    IDeleteConfiguration,
    IOperationConfiguration,
    IPropertyConfiguration,
    ISecretConfiguration,
    IUpdateConfiguration,
    PropertyServiceConfiguration
} from '../src/configuration'
import { Property, Secret } from '../src/client/generated-client/models'
import { ClientFactory, PropertyClient, SecretClient } from '../src/client'
import { OperationBase, OperationFactory, PropertyOperation, SecretOperation } from '../src/operations'

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg)
    } as unknown as Logger

    return { logger, logs, errors }
}

class TestOperation extends OperationBase<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration> {
    public calls: string[] = []

    constructor(logger: Logger, configuration: IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration>) {
        super(logger, configuration)
    }

    get TypeName(): string {
        return 'test'
    }

    protected async Create(index: number, configuration: ICreateConfiguration): Promise<void> {
        this.calls.push(`create-${index}-${configuration.name}`)
    }

    protected async Update(index: number, configuration: IUpdateConfiguration): Promise<void> {
        this.calls.push(`update-${index}-${configuration.target.name}`)
    }

    protected async Delete(index: number, configuration: IDeleteConfiguration): Promise<void> {
        this.calls.push(`delete-${index}-${configuration.name}`)
    }

    public ExposeDatesEqual(configValue: Date | undefined, propertyValue: Date | undefined): boolean {
        return this.DatesEqual(configValue, propertyValue)
    }

    public ExposeStringEquals(configValue: string | undefined, propertyValue: string | undefined): boolean {
        return this.StringEquals(configValue, propertyValue)
    }

    public ExposeSelectorsEqual(
        configValue: { [key: string]: string } | undefined,
        propertyValue: { [key: string]: string } | undefined
    ): boolean {
        return this.SelectorsEqual(configValue, propertyValue)
    }

    public ExposeGetIdentifier(name: string, id: string | undefined, version: string | undefined = undefined): string {
        return this.GetIdentifier(name, id, version)
    }

    public ExposeGetConfiguration(
        name: string,
        selectors: { [key: string]: string } | undefined,
        operator: SearchOperator | null = null
    ): string {
        return this.GetConfiguration(name, selectors, operator)
    }

    public ExposeLogOperationMessage(
        success: boolean,
        operation: string,
        index: number,
        identifier: string,
        message: string
    ): void {
        this.LogOperationMessage(success, operation, index, identifier, message)
    }
}

class FakePropertyClient {
    public created: Property[] = []
    public updated: Property[] = []
    public deleted: Array<{ id: string; name: string; version: string | null }> = []

    public searchSingleResult: Property | null = null
    public searchResult: Property[] | null = null
    public createResult: Property | null = null
    public updateResult: Property | null = null
    public deleteResult = true

    public async SearchSingle(name: string, selectors: { [key: string]: string } | undefined): Promise<Property | null> {
        return this.searchSingleResult
    }

    public async Search(
        operator: SearchOperator,
        name: string,
        selectors: { [key: string]: string } | undefined
    ): Promise<Property[] | null> {
        return this.searchResult
    }

    public async Create(model: Property): Promise<Property | null> {
        this.created.push(model)
        return this.createResult
    }

    public async Update(model: Property): Promise<Property | null> {
        this.updated.push(model)
        return this.updateResult
    }

    public async Delete(id: string, name: string, version: string | null = null): Promise<boolean> {
        this.deleted.push({ id, name, version })
        return this.deleteResult
    }
}

class FakeSecretClient {
    public created: Secret[] = []
    public updated: Secret[] = []
    public deleted: Array<{ id: string; name: string; version: string | null }> = []

    public searchSingleResult: Secret | null = null
    public searchResult: Secret[] | null = null
    public createResult: Secret | null = null
    public updateResult: Secret | null = null
    public deleteResult = true

    public async SearchSingle(name: string, selectors: { [key: string]: string } | undefined): Promise<Secret | null> {
        return this.searchSingleResult
    }

    public async Search(
        operator: SearchOperator,
        name: string,
        selectors: { [key: string]: string } | undefined
    ): Promise<Secret[] | null> {
        return this.searchResult
    }

    public async Create(model: Secret): Promise<Secret | null> {
        this.created.push(model)
        return this.createResult
    }

    public async Update(model: Secret): Promise<Secret | null> {
        this.updated.push(model)
        return this.updateResult
    }

    public async Delete(id: string, name: string, version: string | null = null): Promise<boolean> {
        this.deleted.push({ id, name, version })
        return this.deleteResult
    }
}

describe('property-service operations', () => {
    describe('OperationBase helpers', () => {
        it('executes create, update, and delete sequences', async () => {
            const { logger } = createLogger()
            const config: IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration> = {
                create: [{ name: 'alpha' }],
                update: [{ target: { name: 'beta' } }],
                delete: [{ operator: SearchOperator.Equals, name: 'gamma' }]
            }

            const op = new TestOperation(logger, config)
            await op.Execute()

            expect(op.calls).to.deep.equal(['create-0-alpha', 'update-0-beta', 'delete-0-gamma'])
        })

        it('skips empty configuration sections', async () => {
            const { logger } = createLogger()
            const config: IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration> = {
                create: [] as ICreateConfiguration[],
                update: [] as IUpdateConfiguration[],
                delete: [] as IDeleteConfiguration[]
            }

            const op = new TestOperation(logger, config)
            await op.Execute()

            expect(op.calls.length).to.equal(0)
        })

        it('compares dates, strings, and selectors', () => {
            const { logger } = createLogger()
            const op = new TestOperation(logger, {} as IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration>)

            const date = new Date('2024-01-01T00:00:00Z')
            expect(op.ExposeDatesEqual(undefined, date)).to.equal(true)
            expect(op.ExposeDatesEqual(date, undefined)).to.equal(false)
            expect(op.ExposeDatesEqual(date, new Date('2024-01-01T00:00:00Z'))).to.equal(true)

            expect(op.ExposeStringEquals(undefined, 'value')).to.equal(true)
            expect(op.ExposeStringEquals('value', undefined)).to.equal(false)
            expect(op.ExposeStringEquals('value', 'value')).to.equal(true)
            expect(op.ExposeStringEquals('value', 'other')).to.equal(false)

            const selectorsA = { env: 'dev', region: 'west' }
            const selectorsB = { region: 'west', env: 'dev' }
            const selectorsC = { env: 'prod' }
            expect(op.ExposeSelectorsEqual(selectorsA, selectorsB)).to.equal(true)
            expect(op.ExposeSelectorsEqual(selectorsA, selectorsC)).to.equal(false)
        })

        it('formats identifiers and configuration messages', () => {
            const { logger } = createLogger()
            const op = new TestOperation(logger, {} as IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration>)

            const identifier = op.ExposeGetIdentifier('name', 'id')
            const identifierVersioned = op.ExposeGetIdentifier('name', 'id', 'v1')
            const configWithSelectors = op.ExposeGetConfiguration('name', { env: 'dev' }, SearchOperator.Contains)
            const configWithoutSelectors = op.ExposeGetConfiguration('name', undefined, SearchOperator.Equals)

            expect(identifier).to.contain('Identifier: name/id')
            expect(identifierVersioned).to.contain('Identifier: name/id/v1')
            expect(configWithSelectors).to.contain('Search Criteria')
            expect(configWithSelectors).to.contain('name')
            expect(configWithoutSelectors).to.contain('Search Criteria')
        })

        it('logs success and error messages through the logger', () => {
            const { logger, logs, errors } = createLogger()
            const op = new TestOperation(logger, {} as IOperationConfiguration<ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration>)

            op.ExposeLogOperationMessage(true, 'Create', 0, 'identifier', 'ok')
            op.ExposeLogOperationMessage(false, 'Delete', 1, 'identifier', 'failed')

            expect(logs.length).to.equal(1)
            expect(errors.length).to.equal(1)
        })
    })

    describe('PropertyOperation', () => {
        it('creates a property when one does not exist', async () => {
            const { logger } = createLogger()
            const client = new FakePropertyClient()
            client.searchSingleResult = null
            client.createResult = { id: '1', name: 'alpha', value: 'one' }

            const config: IPropertyConfiguration = {
                create: [{ name: 'alpha', value: 'one', selectors: { env: 'dev' } }]
            }

            const operation = new PropertyOperation(logger, client as unknown as PropertyClient, config)
            await operation.Execute()

            expect(client.created.length).to.equal(1)
            expect(client.updated.length).to.equal(0)
        })

        it('updates a property when values change', async () => {
            const { logger } = createLogger()
            const client = new FakePropertyClient()
            client.searchSingleResult = {
                id: '1',
                name: 'alpha',
                value: 'old',
                selectors: { env: 'dev' },
                contentType: 'text/plain',
                attributes: { notBefore: new Date('2024-01-01T00:00:00Z') }
            }
            client.updateResult = { id: '1', name: 'alpha', value: 'new' }

            const config: IPropertyConfiguration = {
                create: [
                    {
                        name: 'alpha',
                        value: 'new',
                        selectors: { env: 'dev' },
                        contentType: 'text/plain',
                        activeDate: new Date('2024-01-01T00:00:00Z')
                    }
                ]
            }

            const operation = new PropertyOperation(logger, client as unknown as PropertyClient, config)
            await operation.Execute()

            expect(client.updated.length).to.equal(1)
            expect(client.updated[0].value).to.equal('new')
        })

        it('skips updates when properties already match', async () => {
            const { logger } = createLogger()
            const client = new FakePropertyClient()
            client.searchSingleResult = {
                id: '1',
                name: 'alpha',
                value: 'same',
                selectors: { env: 'dev' },
                contentType: 'text/plain'
            }

            const config: IPropertyConfiguration = {
                create: [{ name: 'alpha', value: 'same', selectors: { env: 'dev' }, contentType: 'text/plain' }]
            }

            const operation = new PropertyOperation(logger, client as unknown as PropertyClient, config)
            await operation.Execute()

            expect(client.updated.length).to.equal(0)
        })

        it('throws when delete targets are missing', async () => {
            const { logger } = createLogger()
            const client = new FakePropertyClient()
            client.searchResult = []

            const config: IPropertyConfiguration = {
                delete: [{ operator: SearchOperator.Equals, name: 'alpha', selectors: { env: 'dev' } }]
            }

            const operation = new PropertyOperation(logger, client as unknown as PropertyClient, config)

            let error: Error | null = null
            try {
                await operation.Execute()
            } catch (err) {
                error = err as Error
            }

            expect(error).to.not.equal(null)
        })

        it('deletes all matching properties', async () => {
            const { logger } = createLogger()
            const client = new FakePropertyClient()
            client.searchResult = [
                { id: '1', name: 'alpha', value: 'one' },
                { id: '2', name: 'alpha', value: 'two' }
            ]

            const config: IPropertyConfiguration = {
                delete: [{ operator: SearchOperator.Equals, name: 'alpha', selectors: { env: 'dev' } }]
            }

            const operation = new PropertyOperation(logger, client as unknown as PropertyClient, config)
            await operation.Execute()

            expect(client.deleted.length).to.equal(2)
        })
    })

    describe('SecretOperation', () => {
        it('creates a secret when one does not exist', async () => {
            const { logger } = createLogger()
            const client = new FakeSecretClient()
            client.searchSingleResult = null
            client.createResult = { id: '1', name: 'alpha', value: 'secret', version: 'v1' }

            const config: ISecretConfiguration = {
                create: [{ name: 'alpha', value: 'secret', selectors: { env: 'dev' } }]
            }

            const operation = new SecretOperation(logger, client as unknown as SecretClient, config)
            await operation.Execute()

            expect(client.created.length).to.equal(1)
        })

        it('skips updates when secrets already match', async () => {
            const { logger } = createLogger()
            const client = new FakeSecretClient()
            client.searchSingleResult = {
                id: '1',
                name: 'alpha',
                value: 'same',
                selectors: { env: 'dev' },
                contentType: 'text/plain',
                version: 'v1'
            }

            const config: ISecretConfiguration = {
                create: [{ name: 'alpha', value: 'same', selectors: { env: 'dev' }, contentType: 'text/plain' }]
            }

            const operation = new SecretOperation(logger, client as unknown as SecretClient, config)
            await operation.Execute()

            expect(client.updated.length).to.equal(0)
        })

        it('passes versioned deletes when configured', async () => {
            const { logger } = createLogger()
            const client = new FakeSecretClient()
            client.searchResult = [{ id: '1', name: 'alpha', version: 'v1', value: 'secret' }]

            const config: ISecretConfiguration = {
                delete: [{ operator: SearchOperator.Equals, name: 'alpha', selectors: { env: 'dev' }, allVersions: false }]
            }

            const operation = new SecretOperation(logger, client as unknown as SecretClient, config)
            await operation.Execute()

            expect(client.deleted.length).to.equal(1)
            expect(client.deleted[0].version).to.equal('v1')
        })

        it('passes empty version when deleting all versions', async () => {
            const { logger } = createLogger()
            const client = new FakeSecretClient()
            client.searchResult = [{ id: '1', name: 'alpha', version: 'v2', value: 'secret' }]

            const config: ISecretConfiguration = {
                delete: [{ operator: SearchOperator.Equals, name: 'alpha', selectors: { env: 'dev' }, allVersions: true }]
            }

            const operation = new SecretOperation(logger, client as unknown as SecretClient, config)
            await operation.Execute()

            expect(client.deleted.length).to.equal(1)
            expect(client.deleted[0].version).to.equal('')
        })
    })

    describe('OperationFactory', () => {
        it('creates property and secret operations when configured', () => {
            const { logger, logs } = createLogger()
            const clientFactory = {
                CreatePropertyClient: () => ({}),
                CreateSecretClient: () => ({})
            } as unknown as ClientFactory

            const configuration = new PropertyServiceConfiguration()
            configuration.PropertyConfiguration = { create: [] as any } as IPropertyConfiguration
            configuration.SecretConfiguration = { create: [] as any } as ISecretConfiguration

            const factory = new OperationFactory(logger, clientFactory)
            const operations = factory.CreateOperations(configuration)

            expect(operations.length).to.equal(2)
            expect(logs.some((msg) => msg.includes('Loaded property operation'))).to.equal(true)
            expect(logs.some((msg) => msg.includes('Loaded secret operation'))).to.equal(true)
        })
    })
})