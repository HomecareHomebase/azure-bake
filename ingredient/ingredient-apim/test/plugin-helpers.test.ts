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
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, region, new Logger())
}

function createIngredient(): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-apim',
            source: new BakeVariable('source'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function createPlugin(): ApimPlugin {
    const ctx = createContext()
    return new ApimPlugin('apim', createIngredient(), ctx)
}

describe('ApimPlugin helpers', () => {
    it('populates autoscale defaults from apim instance', async () => {
        const plugin = createPlugin() as any
        plugin.apim = { id: '/subs/1/resourceGroups/rg/providers/Microsoft.ApiManagement/service/apim', location: 'eastus', sku: { name: 'Premium' } }

        const autoscaleSettings = {
            name: 'autoscale-1',
            profiles: [
                {
                    rules: [
                        { metricTrigger: { metricResourceUri: '' } }
                    ]
                }
            ]
        }

        const resolved = await plugin.ResolveAutoscaleSetting(autoscaleSettings)

        expect(resolved.autoscaleSettingResourceName).to.equal('autoscale-1')
        expect(resolved.location).to.equal('eastus')
        expect(resolved.targetResourceUri).to.equal(plugin.apim.id)
        expect(resolved.profiles[0].rules[0].metricTrigger.metricResourceUri).to.equal(plugin.apim.id)
    })

    it('resolves policy content from file link', async () => {
        const plugin = createPlugin() as any
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apim-policy-'))
        const policyPath = path.join(tempDir, 'policy.xml')
        const content = '<policies />'
        fs.writeFileSync(policyPath, content)

        const fileUri = `file:///${policyPath.replace(/\\/g, '/')}`
        const policy = { format: 'xml-link', value: fileUri }

        const resolved = await plugin.ResolvePolicy(policy)

        expect(resolved.format).to.equal('xml')
        expect(resolved.value).to.equal(content)
    })

    it('throws when policy link is not a file', async () => {
        const plugin = createPlugin() as any
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
})