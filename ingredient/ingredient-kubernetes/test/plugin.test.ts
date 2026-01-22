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
    IngredientManager,
    Logger
} from '@azbake/core'

import { KubernetesPlugin } from '../src/plugin'
import { K8sUtils } from '../src/functions'

// Require the index module to verify exports
const k8sIndex = require('../src/index')

function createContext(region?: IBakeRegion, ingredient?: IIngredient, envVars?: Map<string, BakeVariable>): DeploymentContext {
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
        regions: [region || { name: 'East', shortName: 'east', code: 'eus' }],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'service',
            secretKey: 'secret',
            certPath: '',
            skipAuth: true
        },
        variables: envVars || new Map(),
        logLevel: 'info'
    }

    const pkg: IBakePackage = {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }

    const testRegion: IBakeRegion = region || { name: 'East', shortName: 'east', code: 'eus' }
    return new DeploymentContext({} as any, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(source: BakeVariable, params?: Map<string, BakeVariable>, tokens?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-kubernetes',
            source: source,
            parameters: params || new Map(),
            tokens: tokens || new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-kubernetes index exports', () => {
    it('exports plugin', () => {
        expect(k8sIndex.plugin).to.not.be.undefined
        expect(typeof k8sIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(k8sIndex.pluginNS).to.equal('@azbake/ingredient-kubernetes')
    })

    it('exports functions', () => {
        expect(k8sIndex.functions).to.not.be.undefined
        expect(typeof k8sIndex.functions).to.equal('function')
        expect(k8sIndex.functions.name).to.equal('K8sUtils')
    })

    it('exports functionsNS', () => {
        expect(k8sIndex.functionsNS).to.equal('k8s')
    })

    it('plugin can be constructed from export', () => {
        const source = new BakeVariable('/tmp/test.yaml')
        const ingredient = createIngredient(source)
        const ctx = createContext(undefined, ingredient)

        const Plugin = k8sIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = k8sIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('K8sUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
        delete process.env.BAKE_KCONFIG
    })

    describe('configmap', () => {
        it('throws error when BAKE_KCONFIG is not set', () => {
            const ctx = createContext()
            const utils = new K8sUtils(ctx)

            expect(() => utils.configmap('/path/to/files', 'my-configmap', 'default'))
                .to.throw('kube config not setup')
        })

        it('creates configmap using kubectl when BAKE_KCONFIG is set', () => {
            process.env.BAKE_KCONFIG = 'test-kubeconfig.yaml'
            const ctx = createContext()
            const utils = new K8sUtils(ctx)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('configmap/my-configmap created'))

            const result = utils.configmap('/path/to/files', 'my-configmap', 'default')

            expect(result).to.equal('my-configmap')
            expect(execSyncStub.calledOnce).to.be.true
            const cmd = execSyncStub.firstCall.args[0]
            expect(cmd).to.contain('kubectl create configmap')
            expect(cmd).to.contain('--kubeconfig=test-kubeconfig.yaml')
            expect(cmd).to.contain('my-configmap')
            expect(cmd).to.contain('--from-file=/path/to/files')
            expect(cmd).to.contain('--namespace default')
        })

        it('throws error when kubectl command fails', () => {
            process.env.BAKE_KCONFIG = 'test-kubeconfig.yaml'
            const ctx = createContext()
            const utils = new K8sUtils(ctx)

            const childProcess = require('child_process')
            const execError = new Error('kubectl command failed')
            sandbox.stub(childProcess, 'execSync').throws(execError)

            expect(() => utils.configmap('/path/to/files', 'my-configmap', 'default'))
                .to.throw('kubectl command failed')
        })
    })
})

describe('KubernetesPlugin', () => {
    let sandbox: sinon.SinonSandbox
    let tempDir: string

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-k8s-test-'))
    })

    afterEach(() => {
        sandbox.restore()
        delete process.env.BAKE_KCONFIG
        // Cleanup temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                // Clean up files first, then remove directory
                const files = fs.readdirSync(tempDir)
                for (const file of files) {
                    const filePath = path.join(tempDir, file)
                    const stat = fs.statSync(filePath)
                    if (stat.isDirectory()) {
                        const subFiles = fs.readdirSync(filePath)
                        for (const subFile of subFiles) {
                            fs.unlinkSync(path.join(filePath, subFile))
                        }
                        fs.rmdirSync(filePath)
                    } else {
                        fs.unlinkSync(filePath)
                    }
                }
                fs.rmdirSync(tempDir)
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    })

    describe('constructor', () => {
        it('creates instance with correct name', () => {
            const yamlPath = path.join(tempDir, 'test.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const plugin = new KubernetesPlugin('k8s-test', ingredient, ctx)

            expect(plugin._name).to.equal('k8s-test')
        })
    })

    describe('Execute', () => {
        it('skips execution for non-primary regions', async () => {
            const yamlPath = path.join(tempDir, 'test.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source)
            const secondaryRegion: IBakeRegion = { name: 'West', shortName: 'west', code: 'wus' }
            const ctx = createContext(secondaryRegion, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(false)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)

            const childProcess = require('child_process')
            const execSyncSpy = sandbox.spy(childProcess, 'execSync')

            await plugin.Execute()

            // execSync should not be called for non-primary regions
            expect(execSyncSpy.called).to.be.false
        })

        it('throws error when source file does not exist', async () => {
            const source = new BakeVariable('/nonexistent/path/test.yaml')
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error).to.contain('file/path not found')
            }
        })

        it('executes kubectl apply command for valid yaml file', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('configmap/test created'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            expect(execSyncStub.called).to.be.true
            const cmd = execSyncStub.firstCall.args[0]
            expect(cmd).to.contain('kubectl apply')
            expect(cmd).to.contain(`-f ${yamlPath}`)
        })

        it('executes kubectl delete when deleteDeployment is true', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const params = new Map<string, BakeVariable>()
            params.set('deleteDeployment', new BakeVariable('true'))

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source, params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('configmap/test deleted'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            expect(execSyncStub.called).to.be.true
            const cmd = execSyncStub.firstCall.args[0]
            expect(cmd).to.contain('kubectl delete')
            expect(cmd).to.contain('--ignore-not-found=true')
        })

        it('adds kubectl flags when specified', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const params = new Map<string, BakeVariable>()
            params.set('kubectlFlags', new BakeVariable('--dry-run=client'))

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source, params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('ok'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            expect(execSyncStub.called).to.be.true
            const cmd = execSyncStub.firstCall.args[0]
            expect(cmd).to.contain('--dry-run=client')
        })

        it('replaces tokens in yaml files', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: {{NAME}}\ndata:\n  value: {{VALUE}}')

            const tokens = new Map<string, BakeVariable>()
            tokens.set('NAME', new BakeVariable('test-config'))
            tokens.set('VALUE', new BakeVariable('hello-world'))

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source, new Map(), tokens)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            sandbox.stub(childProcess, 'execSync').returns(Buffer.from('ok'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            const content = fs.readFileSync(yamlPath, 'utf8')
            expect(content).to.contain('test-config')
            expect(content).to.contain('hello-world')
        })

        it('processes yaml files in directory', async () => {
            const subDir = path.join(tempDir, 'manifests')
            fs.mkdirSync(subDir)

            fs.writeFileSync(path.join(subDir, 'config1.yaml'), 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config1')
            fs.writeFileSync(path.join(subDir, 'config2.yaml'), 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: config2')

            const source = new BakeVariable(subDir)
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('ok'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            expect(execSyncStub.called).to.be.true
        })

        it('handles kubeconfig parameter', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const params = new Map<string, BakeVariable>()
            const kubeconfigContent = Buffer.from('apiVersion: v1\nkind: Config\nclusters: []').toString('base64')
            params.set('kubeconfig', new BakeVariable(kubeconfigContent))

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source, params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            const execSyncStub = sandbox.stub(childProcess, 'execSync').returns(Buffer.from('ok'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            expect(execSyncStub.called).to.be.true
            const cmd = execSyncStub.firstCall.args[0]
            expect(cmd).to.contain('--kubeconfig=')
        })

        it('adds tags as annotations to deployment yaml', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: test\nspec:\n  template:\n    metadata:\n      labels:\n        app: test')

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            sandbox.stub(childProcess, 'execSync').returns(Buffer.from('ok'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()

            const content = fs.readFileSync(yamlPath, 'utf8')
            expect(content).to.contain('annotations')
            expect(content).to.contain('bake.tag/')
        })

        it('logs and throws error on deployment failure', async () => {
            const yamlPath = path.join(tempDir, 'deployment.yaml')
            fs.writeFileSync(yamlPath, 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test')

            const source = new BakeVariable(yamlPath)
            const ingredient = createIngredient(source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const childProcess = require('child_process')
            sandbox.stub(childProcess, 'execSync').throws(new Error('kubectl failed'))

            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('kubectl failed')
            }
        })
    })
})

describe('ingredient-kubernetes', () => {
    it('builds kubectl commands without executing them', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-k8s-'))
        const yamlPath = path.join(tempDir, 'deployment.yaml')

        fs.writeFileSync(
            yamlPath,
            [
                'apiVersion: v1',
                'kind: ConfigMap',
                'metadata:',
                '  name: test'
            ].join('\n')
        )

        const region: IBakeRegion = { name: 'East', shortName: 'east', code: 'eus' }
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
            regions: [region],
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
                type: '@azbake/ingredient-kubernetes',
                source: new BakeVariable(yamlPath),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = new DeploymentContext({} as any, pkg, region, new Logger(), ingredient)

        const childProcess = require('child_process')
        const originalExecSync = childProcess.execSync
        const commands: string[] = []
        childProcess.execSync = (cmd: string) => {
            commands.push(cmd)
            return Buffer.from('ok')
        }

        const originalGetIngredientFunction = IngredientManager.getIngredientFunction
        IngredientManager.getIngredientFunction = (() => ({
            current_region_primary: () => true
        })) as any

        const { KubernetesPlugin } = require('../src/plugin')

        try {
            const plugin = new KubernetesPlugin('k8s', ingredient, ctx)
            await plugin.Execute()
        } finally {
            childProcess.execSync = originalExecSync
            IngredientManager.getIngredientFunction = originalGetIngredientFunction
        }

        expect(commands.length).to.be.greaterThan(0)
        expect(commands[0]).to.contain('kubectl apply')
        expect(commands[0]).to.contain(`-f ${yamlPath}`)
    })
})