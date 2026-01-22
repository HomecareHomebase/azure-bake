import { expect } from 'chai'
import 'mocha'
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
    Logger
} from '@azbake/core'

import { ApimApiPlugin } from '../src/plugin'

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

function createIngredient(): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-apim-api',
            source: new BakeVariable('source'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function createPlugin(): ApimApiPlugin {
    const ctx = createContext()
    return new ApimApiPlugin('apim-api', createIngredient(), ctx)
}

describe('ApimApiPlugin helpers', () => {
    it('finds APIs by name', () => {
        const plugin = createPlugin() as any
        const api = { name: 'api-1' }
        plugin.apim_apis = [api]

        expect(plugin.GetApi('api-1')).to.equal(api)
        expect(plugin.GetApi('missing')).to.equal(null)
    })

    it('flattens paged iterators', async () => {
        const plugin = createPlugin() as any

        async function* pages() {
            yield [1, 2]
            yield [3]
        }

        const paged = { byPage: () => pages() }
        const result = await plugin.GetArrayFromPagedIterator(paged)

        expect(result).to.deep.equal([1, 2, 3])
    })

    it('resolves policy content from file link', async () => {
        const plugin = createPlugin() as any
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apim-api-policy-'))
        const policyPath = path.join(tempDir, 'policy.xml')
        const content = '<policies />'
        fs.writeFileSync(policyPath, content)

        const fileUri = `file:///${policyPath.replace(/\\/g, '/')}`
        const policy = { format: 'xml-link', value: fileUri }

        const resolved = await plugin.ResolvePolicy(policy)

        expect(resolved.format).to.equal('xml')
        expect(resolved.value).to.equal(content)
    })

    it('returns policy as-is when not a link format', async () => {
        const plugin = createPlugin() as any
        const policy = { format: 'xml', value: '<policies />' }

        const resolved = await plugin.ResolvePolicy(policy)

        expect(resolved).to.equal(policy)
    })

    it('throws when policy link cannot be resolved', async () => {
        const plugin = createPlugin() as any
        plugin.apim_options = { apiWaitTime: 0 }

        const policy = { format: 'xml-link', value: 'https://example.com/policy.xml' }

        let error: any
        try {
            await plugin.ResolvePolicy(policy)
        } catch (err) {
            error = err
        }

        expect(error).to.be.instanceOf(Error)
        expect(String(error.message || error)).to.contain('Could not resolve policy content')
    })

    it('short-circuits blocking for non-link formats', async () => {
        const plugin = createPlugin() as any
        const api = { format: 'openapi', value: 'https://example.com/swagger.json' }

        const result = await plugin.BlockForApi(api, { apiWaitTime: 0, forceWait: false })

        expect(result).to.equal(true)
    })

    it('returns false when link API cannot be fetched within wait time', async () => {
        const plugin = createPlugin() as any
        plugin.apim_options = { apiWaitTime: 0 }
        const api = { format: 'openapi-link', value: 'https://example.com/swagger.json' }

        const result = await plugin.BlockForApi(api, { apiWaitTime: 0, forceWait: false })

        expect(result).to.equal(false)
    })
})