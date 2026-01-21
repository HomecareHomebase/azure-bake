import { expect } from 'chai'
import 'mocha'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { BakeVariable, DeploymentContext, Logger } from '@azbake/core'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '@azbake/core'

import { CustomScriptIngredient } from '../src/plugin'

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
        environmentCode: 'code',
        regions: [],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'id',
            secretKey: 'key',
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
    return new DeploymentContext({} as any, pkg, region, new Logger())
}

describe('ingredient-script', () => {
    it('executes a custom script and passes parameters', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-script-'))
        const scriptPath = path.join(tempDir, 'script.ts')
        const outputPath = path.join(tempDir, 'output.txt')

        const scriptContents = [
            "const fs = require('fs');",
            'function onExecute(ctx, logger, params) {',
            '  fs.writeFileSync(params.outputPath, `done:${params.foo}`);',
            '}'
        ].join('\n')

        fs.writeFileSync(scriptPath, scriptContents)

        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/ingredient-script',
                source: new BakeVariable(scriptPath),
                parameters: new Map([
                    ['outputPath', new BakeVariable(outputPath)],
                    ['foo', new BakeVariable('bar')]
                ]),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const ctx = createContext()
        const plugin = new CustomScriptIngredient('script', ingredient, ctx)

        await plugin.Execute()

        const output = fs.readFileSync(outputPath, 'utf8')
        expect(output).eq('done:bar')
    })
})