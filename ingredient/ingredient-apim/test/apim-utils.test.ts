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

import { ApimUtils } from '../src/functions'

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
            subscriptionId: 'test-subscription-id',
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
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

describe('ApimUtils', () => {
    let sandbox: sinon.SinonSandbox
    const originalGetIngredientFunction = IngredientManager.getIngredientFunction

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
        ;(IngredientManager as any).getIngredientFunction = originalGetIngredientFunction
    })

    describe('get_resource_name', () => {
        it('uses coreutils to build a resource name', () => {
            const calls: Array<{ prefix: string; name: string | null; includeRegion: boolean }> = []

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    calls.push({ prefix, name, includeRegion })
                    return 'apim-custom'
                },
                resource_group: async () => 'rg-apim'
            })

            const utils = new ApimUtils(createContext())
            const resourceName = utils.get_resource_name('custom')

            expect(resourceName).to.equal('apim-custom')
            expect(calls).to.deep.equal([{ prefix: 'apim', name: 'custom', includeRegion: false }])
        })

        it('handles null name parameter', () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    return `${prefix}-default`
                },
                resource_group: async () => 'rg-apim'
            })

            const utils = new ApimUtils(createContext())
            const resourceName = utils.get_resource_name(null)

            expect(resourceName).to.equal('apim-default')
        })

        it('handles undefined name parameter', () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    return `${prefix}-default`
                },
                resource_group: async () => 'rg-apim'
            })

            const utils = new ApimUtils(createContext())
            const resourceName = utils.get_resource_name()

            expect(resourceName).to.equal('apim-default')
        })

        it('uses "apim" as the prefix', () => {
            let capturedPrefix = ''
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    capturedPrefix = prefix
                    return `${prefix}-test`
                },
                resource_group: async () => 'rg-apim'
            })

            const utils = new ApimUtils(createContext())
            utils.get_resource_name('test')

            expect(capturedPrefix).to.equal('apim')
        })

        it('passes false for includeRegion parameter', () => {
            let capturedIncludeRegion: boolean | undefined
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    capturedIncludeRegion = includeRegion
                    return 'result'
                },
                resource_group: async () => 'rg'
            })

            const utils = new ApimUtils(createContext())
            utils.get_resource_name('test')

            expect(capturedIncludeRegion).to.equal(false)
        })
    })

    describe('get_resource_group', () => {
        it('uses coreutils to resolve the resource group', async () => {
            const calls: Array<{ name: string; includeRegion: boolean; region: any; useSuffix: boolean }> = []

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-ignored',
                resource_group: async (name: string, includeRegion: boolean, region: any, useSuffix: boolean) => {
                    calls.push({ name, includeRegion, region, useSuffix })
                    return 'rg-apim'
                }
            })

            const utils = new ApimUtils(createContext())
            const resourceGroup = await utils.get_resource_group('apim')

            expect(resourceGroup).to.equal('rg-apim')
            expect(calls).to.deep.equal([{ name: 'apim', includeRegion: true, region: null, useSuffix: true }])
        })

        it('uses default name "apim" when not specified', async () => {
            const calls: Array<{ name: string }> = []

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-ignored',
                resource_group: async (name: string) => {
                    calls.push({ name })
                    return 'rg-default'
                }
            })

            const utils = new ApimUtils(createContext())
            const resourceGroup = await utils.get_resource_group()

            expect(resourceGroup).to.equal('rg-default')
            expect(calls[0].name).to.equal('apim')
        })

        it('passes true for includeRegion parameter', async () => {
            let capturedIncludeRegion: boolean | undefined
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test',
                resource_group: async (name: string, includeRegion: boolean) => {
                    capturedIncludeRegion = includeRegion
                    return 'rg'
                }
            })

            const utils = new ApimUtils(createContext())
            await utils.get_resource_group('test')

            expect(capturedIncludeRegion).to.equal(true)
        })

        it('passes null for region parameter', async () => {
            let capturedRegion: any
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test',
                resource_group: async (name: string, includeRegion: boolean, region: any) => {
                    capturedRegion = region
                    return 'rg'
                }
            })

            const utils = new ApimUtils(createContext())
            await utils.get_resource_group('test')

            expect(capturedRegion).to.equal(null)
        })

        it('passes true for useSuffix parameter', async () => {
            let capturedUseSuffix: boolean | undefined
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test',
                resource_group: async (name: string, includeRegion: boolean, region: any, useSuffix: boolean) => {
                    capturedUseSuffix = useSuffix
                    return 'rg'
                }
            })

            const utils = new ApimUtils(createContext())
            await utils.get_resource_group('test')

            expect(capturedUseSuffix).to.equal(true)
        })
    })

    describe('get_source', () => {
        it('builds the source using resource group and name', async () => {
            const calls: Array<{ name: string; includeRegion: boolean }> = []

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: (prefix: string, name: string | null, includeRegion: boolean) => {
                    calls.push({ name: name || 'apim', includeRegion })
                    return 'apim-source'
                },
                resource_group: async () => 'rg-source'
            })

            const utils = new ApimUtils(createContext())
            const source = await utils.get_source('custom')

            expect(source).to.equal('rg-source/apim-source')
            expect(calls).to.deep.equal([{ name: 'custom', includeRegion: false }])
        })

        it('handles null name parameter', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-default',
                resource_group: async () => 'rg-default'
            })

            const utils = new ApimUtils(createContext())
            const source = await utils.get_source(null)

            expect(source).to.equal('rg-default/apim-default')
        })

        it('handles undefined name parameter', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-default',
                resource_group: async () => 'rg-default'
            })

            const utils = new ApimUtils(createContext())
            const source = await utils.get_source()

            expect(source).to.equal('rg-default/apim-default')
        })

        it('concatenates resource group and resource name with "/"', async () => {
            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'my-apim',
                resource_group: async () => 'my-rg'
            })

            const utils = new ApimUtils(createContext())
            const source = await utils.get_source()

            expect(source).to.include('/')
            expect(source.split('/')[0]).to.equal('my-rg')
            expect(source.split('/')[1]).to.equal('my-apim')
        })
    })

    describe('context logging', () => {
        it('logs debug messages for get_resource_name', () => {
            const ctx = createContext()
            const debugSpy = sandbox.spy(ctx._logger, 'debug')

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'rg-test'
            })

            const utils = new ApimUtils(ctx)
            utils.get_resource_name('test')

            expect(debugSpy.calledWith('ApimUtils.get_resource_name() returned apim-test')).to.be.true
        })

        it('logs debug messages for get_resource_group', async () => {
            const ctx = createContext()
            const debugSpy = sandbox.spy(ctx._logger, 'debug')

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'rg-test'
            })

            const utils = new ApimUtils(ctx)
            await utils.get_resource_group('test')

            expect(debugSpy.calledWith('ApimUtils.get_resource_group() returned rg-test')).to.be.true
        })

        it('logs debug messages for get_source', async () => {
            const ctx = createContext()
            const debugSpy = sandbox.spy(ctx._logger, 'debug')

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'apim-test',
                resource_group: async () => 'rg-test'
            })

            const utils = new ApimUtils(ctx)
            await utils.get_source('test')

            expect(debugSpy.calledWith('ApimUtils.get_source() returned rg-test/apim-test')).to.be.true
        })
    })

    describe('ApimUtils constructor', () => {
        it('stores the context', () => {
            const ctx = createContext()

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => 'test',
                resource_group: async () => 'rg'
            })

            const utils = new ApimUtils(ctx)

            // Access context through the public getter (inherited from BaseUtility)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('method chaining behavior', () => {
        it('get_source calls both get_resource_group and get_resource_name', async () => {
            let resourceGroupCalled = false
            let resourceNameCalled = false

            ;(IngredientManager as any).getIngredientFunction = () => ({
                create_resource_name: () => {
                    resourceNameCalled = true
                    return 'apim'
                },
                resource_group: async () => {
                    resourceGroupCalled = true
                    return 'rg'
                }
            })

            const utils = new ApimUtils(createContext())
            await utils.get_source()

            expect(resourceGroupCalled).to.be.true
            expect(resourceNameCalled).to.be.true
        })
    })
})
