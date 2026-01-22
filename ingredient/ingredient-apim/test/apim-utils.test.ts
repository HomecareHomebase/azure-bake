import { expect } from 'chai'
import 'mocha'

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
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

describe('ApimUtils', () => {
    const originalGetIngredientFunction = IngredientManager.getIngredientFunction

    afterEach(() => {
        ;(IngredientManager as any).getIngredientFunction = originalGetIngredientFunction
    })

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
})