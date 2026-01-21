// @ts-nocheck
import { expect } from 'chai'
import 'mocha'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
    BakeVariable,
    DeploymentContext,
    Logger,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient
} from '@azbake/core'

const Module = require('module')
require('ts-node').register({ transpileOnly: true })

const pkgRoot = process.cwd()
const pkgJsonPath = path.join(pkgRoot, 'package.json')
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
const packageName = pkgJson.name || ''

const pluginIndexPath = path.join(pkgRoot, 'src', 'index.ts')
const pluginSourcePath = path.join(pkgRoot, 'src', 'plugin.ts')
const hasPluginSource = fs.existsSync(pluginSourcePath)
const pluginSource = hasPluginSource ? fs.readFileSync(pluginSourcePath, 'utf8') : ''

const usesArmHelper = pluginSource.includes('ARMHelper')
const usesChildProcess = pluginSource.includes('child_process') || pluginSource.includes('execSync')
const usesApim = pluginSource.includes('ApiManagementClient') || pluginSource.includes('got')
const usesPropertyService = pluginSource.includes('PropertyService')
const usesStorageBlob = pluginSource.includes('BlobServiceClient') || pluginSource.includes('@azure/storage-blob') || pluginSource.includes('StorageUtils')

const shouldExecute = usesArmHelper && !usesChildProcess && !usesApim && !usesPropertyService && !usesStorageBlob

type ArmHelperCall = {
    deploymentName: string
    params: Record<string, { value: any }>
}

const armHelperState = {
    calls: [] as ArmHelperCall[],
    deploys: [] as Array<{ deploymentName: string; resourceGroup: string }>
}

class FakeArmHelper {
    private _ctx: DeploymentContext
    constructor(ctx: DeploymentContext) {
        this._ctx = ctx
    }

    public async BakeParamsToARMParamsAsync(deploymentName: string, params: Map<string, BakeVariable>): Promise<any> {
        const props: Record<string, { value: any }> = {}
        for (const [name, variable] of params) {
            props[name] = { value: await variable.valueAsync(this._ctx) }
        }
        const snapshot = JSON.parse(JSON.stringify(props))
        armHelperState.calls.push({ deploymentName, params: snapshot })
        return new Proxy(props, {
            get: (target, prop) => {
                if (typeof prop === 'string' && !(prop in target)) {
                    return { value: '' }
                }
                return (target as any)[prop]
            }
        })
    }

    public async DeployTemplate(deploymentName: string, _template: any, _params: any, resourceGroup: string): Promise<void> {
        armHelperState.deploys.push({ deploymentName, resourceGroup })
    }

    public async DeployAlerts(): Promise<void> {
        return
    }

    public async DeployAlert(): Promise<void> {
        return
    }

    public async ConfigureDiagnostics(armParameters: any): Promise<any> {
        return armParameters
    }

    public GenerateTags(): any {
        return {}
    }
}

function createUtilStub() {
    return new Proxy(
        {},
        {
            get: (_target, prop) => {
                if (prop === 'current_region_primary') {
                    return () => true
                }
                if (prop === 'parseResource') {
                    return (source: string) => ({ resourceGroup: 'rg', resource: source || 'resource' })
                }
                if (prop === 'resource_group' || prop === 'get_resource_group') {
                    return async () => 'rg'
                }
                if (prop === 'create_resource_name' || prop === 'get_resource_name') {
                    return (prefix: string, name?: string) => `${prefix}-${name || 'name'}`
                }
                return async () => ''
            }
        }
    )
}

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
    return new DeploymentContext(auth, pkg, region, new Logger())
}

function stubModuleLoad() {
    const originalLoad = Module._load
    const noopFn: any = new Proxy(
        function () {
            return {}
        },
        {
            get: () => noopFn,
            apply: () => ({}),
            construct: () => ({})
        }
    )

    Module._load = function (request: string, parent: any, isMain: boolean) {
        if (request === '@azbake/arm-helper') {
            return { ARMHelper: FakeArmHelper }
        }
        if (request === './functions.js') {
            return originalLoad('./functions', parent, isMain)
        }
        if (request === '@azure/arm-sql') {
            return {
                SqlManagementClient: class {
                    public databases = {
                        listByServer: async () => [],
                        pause: async () => ({ status: 'Paused' }),
                        resume: async () => ({ status: 'Online' }),
                        get: async () => ({ status: 'Online' }),
                        beginUpdate: async () => ({})
                    }
                },
                SqlManagementModels: {},
                SqlManagementMappers: {}
            }
        }
        if (request === 'got') {
            return async () => ({ statusCode: 200, body: '{}' })
        }
        if (request.startsWith('@azure/')) {
            return new Proxy(
                {},
                {
                    get: () => noopFn
                }
            )
        }
        return originalLoad(request, parent, isMain)
    }

    return () => {
        Module._load = originalLoad
    }
}

describe(`ingredient contract: ${packageName}`, () => {
    if (!packageName.startsWith('@azbake/ingredient-') || !hasPluginSource) {
        it('skips packages without a plugin entrypoint', function () {
            this.skip()
        })
        return
    }

    it('exports plugin and namespace', () => {
        const restoreLoad = stubModuleLoad()
        try {
            const resolved = require.resolve(pluginIndexPath)
            delete require.cache[resolved]
            const mod = require(resolved)
            expect(mod).to.have.property('plugin')
            expect(mod).to.have.property('pluginNS')
            expect(mod.pluginNS).to.equal(packageName)
        } finally {
            restoreLoad()
        }
    })

    it('evaluates parameters on execute when safe', async function () {
        if (!shouldExecute) {
            this.skip()
        }

        armHelperState.calls.length = 0
        armHelperState.deploys.length = 0

        const restoreLoad = stubModuleLoad()
        const corePath = require.resolve('@azbake/core', { paths: [pkgRoot] })
        const coreModule = require(corePath)
        const originalGetIngredientFunction = coreModule.IngredientManager.getIngredientFunction

        try {
            coreModule.IngredientManager.getIngredientFunction = (() => createUtilStub()) as any

            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-ingredient-'))
            const templatePath = path.join(tempDir, 'template.json')
            fs.writeFileSync(templatePath, JSON.stringify({ resources: [] }, null, 2))

            const ctx = createContext()
            const parameters = new Map([
                ['sample', new BakeVariable('[ctx.Environment.environmentCode]')]
            ])

            if (pluginSource.includes('source-type')) {
                parameters.set('source-type', new BakeVariable('Microsoft.Web/sites'))
            }

            if (pluginSource.includes("Parameter 'access'")) {
                parameters.set('access', new BakeVariable('public'))
            }

            const ingredient: IIngredient = {
                properties: {
                    type: packageName,
                    source: new BakeVariable(templatePath),
                    parameters,
                    tokens: new Map(),
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }

            const resolved = require.resolve(pluginIndexPath)
            delete require.cache[resolved]
            const mod = require(resolved)
            const Plugin = mod.plugin
            const instance = new Plugin('sample', ingredient, ctx)
            await instance.Execute()

            expect(armHelperState.calls.length).to.be.greaterThan(0)
            const firstCall = armHelperState.calls[0]
            expect(firstCall.params.sample.value).to.equal('tst0')
        } finally {
            coreModule.IngredientManager.getIngredientFunction = originalGetIngredientFunction
            restoreLoad()
        }
    })
})
