import { expect } from 'chai'
import 'mocha'

import { ARMHelper } from '../src/arm-helper'
import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    IngredientManager,
    Logger
} from '@azbake/core'

function createContext(ingredient: IIngredient): DeploymentContext {
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
        environmentCode: 'tst0',
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
    return new DeploymentContext(auth, pkg, region, new Logger(), ingredient)
}

function withStubbedIngredientManager(factory: (name: string) => any): () => void {
    const original = IngredientManager.getIngredientFunction
    IngredientManager.getIngredientFunction = ((name: string) => factory(name)) as any
    return () => {
        IngredientManager.getIngredientFunction = original
    }
}

describe('arm-helper', () => {
    it('evaluates BakeVariables when building ARM params', async () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map([
                    ['foo', new BakeVariable('[ctx.Environment.environmentName]')]
                ]),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = createContext(ingredient)
        const helper = new ARMHelper(ctx)
        const params = await helper.BakeParamsToARMParamsAsync('deploy', ingredient.properties.parameters)

        expect(params.foo.value).to.equal('env')
    })

    it('configures diagnostics when enabled', async () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const restore = withStubbedIngredientManager((name: string) => {
            if (name === 'coreutils') {
                return {
                    resource_group: async (group?: string) => group === 'diagnostics' ? 'diag-rg' : 'rg'
                }
            }
            if (name === 'eventhubnamespace') {
                return {
                    get_resource_name: () => 'diag-ehn'
                }
            }
            return {}
        })

        try {
            const ctx = createContext(ingredient)
            const helper = new ARMHelper(ctx)
            const params = await helper.ConfigureDiagnostics({})

            expect(params.diagnosticsEnabled.value).to.equal('yes')
            expect(params.diagnosticsEventHubNamespace.value).to.equal('diag-ehn')
            expect(params.diagnosticsEventHubResourceGroup.value).to.equal('diag-rg')
        } finally {
            restore()
        }
    })

    it('leaves diagnostics disabled when configured', async () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const restore = withStubbedIngredientManager(() => ({
            resource_group: async () => 'rg',
            get_resource_name: () => 'ehn'
        }))

        try {
            const ctx = createContext(ingredient)
            const helper = new ARMHelper(ctx)
            const params = await helper.ConfigureDiagnostics({ diagnosticsEnabled: { value: 'no' } })

            expect(params.diagnosticsEnabled.value).to.equal('no')
            expect(params.diagnosticsEventHubNamespace).to.equal(undefined)
            expect(params.diagnosticsEventHubResourceGroup).to.equal(undefined)
        } finally {
            restore()
        }
    })

    it('expands alert action groups and sanitizes names', async () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        let tempNameArg: string | undefined
        const restore = withStubbedIngredientManager((name: string) => {
            if (name === 'coreutils') {
                return {
                    create_resource_name: (prefix: string, nameArg: string) => {
                        if (prefix === 'alert') {
                            tempNameArg = nameArg
                        }
                        return `${prefix}-${nameArg}`
                    },
                    get_resource_group: () => 'action-rg'
                }
            }
            return {}
        })

        try {
            const ctx = createContext(ingredient)
            const helper = new ARMHelper(ctx) as any

            let capturedParams: any
            helper.DeployTemplate = async (_name: string, _template: any, params: any) => {
                capturedParams = params
            }

            const params: any = {
                timeAggregation: { value: 'Avg' },
                metricName: { value: 'CPU/%/Total' },
                alertType: { value: 'static' },
                actionGroups: { value: [{ actionGroupShortName: 'ops' }] }
            }

            await helper.DeployAlert('deploy', 'rg', 'target', params)

            expect(tempNameArg).to.include('CPU___Total')
            expect(capturedParams['source-rg'].value).to.equal('rg')
            expect(capturedParams['source-name'].value).to.equal('target')
            expect(capturedParams.actionGroups.value[0].actionGroupId).to.equal(
                '/subscriptions/sub/resourceGroups/action-rg/providers/Microsoft.Insights/actionGroups/act-ops'
            )
            expect(capturedParams.actionGroups.value[0].actionGroupShortName).to.equal(undefined)
        } finally {
            restore()
        }
    })

    it('removes empty action groups', async () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const restore = withStubbedIngredientManager((name: string) => {
            if (name === 'coreutils') {
                return {
                    create_resource_name: (_prefix: string, nameArg: string) => `alert-${nameArg}`,
                    get_resource_group: () => 'action-rg'
                }
            }
            return {}
        })

        try {
            const ctx = createContext(ingredient)
            const helper = new ARMHelper(ctx) as any
            helper.DeployTemplate = async () => undefined

            const params: any = {
                timeAggregation: { value: 'Avg' },
                metricName: { value: 'CPU' },
                alertType: { value: 'static' },
                actionGroups: { value: undefined }
            }

            await helper.DeployAlert('deploy', 'rg', 'target', params)

            expect(params.actionGroups).to.equal(undefined)
        } finally {
            restore()
        }
    })

    it('appends tags recursively and merges existing tags', () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = createContext(ingredient)
        const helper = new ARMHelper(ctx) as any
        helper.GenerateTags = (extraTags: Map<string, string> | null) => {
            const tags: Record<string, string> = { standard: 'tag' }
            if (extraTags) {
                extraTags.forEach((value, key) => {
                    tags[key] = value
                })
            }
            return tags
        }

        const template = {
            resources: [
                { type: 'Custom/thing', tags: { existing: 'tag' } },
                {
                    type: 'Microsoft.Resources/deployments',
                    properties: {
                        template: {
                            resources: [{ type: 'Custom/child', tags: { nested: 'yes' } }]
                        }
                    }
                }
            ]
        }

        const result = helper.AppendStandardTags(template)

        expect(result.resources[0].tags).to.deep.equal({ standard: 'tag', existing: 'tag' })
        expect(result.resources[1].properties.template.resources[0].tags).to.deep.equal({
            standard: 'tag',
            nested: 'yes'
        })
    })

    it('merges nested objects deeply', () => {
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/arm-helper',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = createContext(ingredient)
        const helper = new ARMHelper(ctx) as any
        const target = { a: { b: 1 }, c: 1 }
        const merged = helper.mergeDeep(target, { a: { d: 2 }, e: 3 })

        expect(merged).to.deep.equal({ a: { b: 1, d: 2 }, c: 1, e: 3 })
    })
})
