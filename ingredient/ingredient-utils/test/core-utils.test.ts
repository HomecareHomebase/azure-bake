import { expect } from 'chai'
import 'mocha'

import { CoreUtils } from '../src/functions'
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

function createContext(region: IBakeRegion): DeploymentContext {
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
        regions: [
            { name: 'East', shortName: 'east', code: 'eus' },
            { name: 'West', shortName: 'west', code: 'wus' }
        ],
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
            type: '@azbake/ingredient-utils',
            source: new BakeVariable('source'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    return new DeploymentContext({} as any, pkg, region, new Logger(), ingredient)
}

describe('ingredient-utils core helpers', () => {
    it('detects the primary region', () => {
        const primaryContext = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const primaryUtils = new CoreUtils(primaryContext)

        expect(primaryUtils.current_region_primary()).to.eq(true)

        const secondaryContext = createContext({ name: 'West', shortName: 'west', code: 'wus' })
        const secondaryUtils = new CoreUtils(secondaryContext)

        expect(secondaryUtils.current_region_primary()).to.eq(false)
    })

    it('formats resource group names deterministically', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = await utils.resource_group('app')
        expect(rg).to.equal('RG_APP_EUS_DEV')
    })

    it('converts primitive helpers and flags', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toNumber('0042')).to.equal(42)
        expect(utils.toString(123)).to.equal('123')
        expect(utils.toBoolean('true')).to.equal(true)
        expect(utils.toBoolean('1')).to.equal(true)
        expect(utils.toBoolean('false')).to.equal(false)
        expect(utils.toJsonString({ a: 1 })).to.equal('{"a":1}')
        expect(utils.is_current_environment_code('dev')).to.equal(true)
        expect(utils.is_current_environment_code('prod')).to.equal(false)
    })

    it('resolves primary, secondary, and current regions', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.current_region()).to.deep.equal({ name: 'East', shortName: 'east', code: 'eus' })
        expect(utils.primary_region()).to.deep.equal({ name: 'East', shortName: 'east', code: 'eus' })
        expect(utils.secondary_region()).to.deep.equal({ name: 'West', shortName: 'west', code: 'wus' })

        ctx.Environment.regions = [{ name: 'Solo', shortName: 'solo', code: 'sol' }]
        expect(utils.secondary_region()).to.deep.equal({ name: 'Solo', shortName: 'solo', code: 'sol' })
    })

    it('resolves variables by region and case-insensitive keys', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map([
            ['Foo', new BakeVariable('bar')],
            ['east__color', new BakeVariable('blue')],
            ['west__color', new BakeVariable('green')],
            ['fallback', new BakeVariable('fallback')]
        ])

        const utils = new CoreUtils(ctx)
        expect(await utils.variable('foo', 'default')).to.equal('bar')
        expect(await utils.variable('missing', 'default')).to.equal('default')
        expect(await utils.regionVariable('color', 'default')).to.equal('blue')
        expect(
            await utils.regionVariable('color', 'default', { name: 'West', shortName: 'west', code: 'wus' })
        ).to.equal('green')
        expect(await utils.if_then_variable('missing', 'fallback', 'default')).to.equal('fallback')
    })

    it('builds resource names and identifiers consistently', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.create_resource_name('app', 'svc', true, '01')).to.equal('deveusappsvc01')
        expect(utils.create_resource_name('app', 'svc', false, '01')).to.equal('devappsvc01')
        expect(
            utils.create_region_resource_name('app', 'svc', { name: 'West', shortName: 'west', code: 'wus' }, '02')
        ).to.equal('devwusappsvc02')

        expect(utils.create_storage_name('data')).to.equal('deveusstdata')
        expect(utils.create_app_svc_name()).to.equal('deveusappsvcpkg')

        expect(utils.get_resource_group('web', true)).to.equal('RG_WEB_EUS_DEV')
        expect(utils.get_resource_group('web', false)).to.equal('RG_WEB_DEV')
        expect(utils.get_app_svc_name('web')).to.equal('RG_WEB_EUS_DEV/deveusappsvcweb')
        expect(utils.get_cert_name('web')).to.equal('RG_WEB_EUS_DEV/deveuscertweb')

        expect(await utils.get_ingredient_source()).to.equal('source')
        expect(await utils.resource_group('override', true, null, true)).to.equal('RG_OVERRIDE_EUS_DEV')
    })

    it('prefers rgOverride when configured', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.rgOverride = new BakeVariable('RG_OVERRIDE')
        const utils = new CoreUtils(ctx)

        expect(await utils.resource_group()).to.equal('RG_OVERRIDE')
        expect(await utils.resource_group('ignored', true, null, true)).to.equal('RG_IGNORED_EUS_DEV')
    })
})