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
    IngredientManager,
    Logger
} from '@azbake/core'

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