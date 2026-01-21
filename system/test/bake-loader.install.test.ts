import { expect } from 'chai'
import 'mocha'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { IngredientManager } from '@azbake/core'

describe('bake-loader dynamic install', () => {
    it('installs missing ingredients with legacy-peer-deps', () => {
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-install-'))
        const nodeModules = path.join(tmpRoot, 'node_modules')
        fs.mkdirSync(nodeModules)

        const bakeFile = path.join(tmpRoot, 'bake.yaml')
        fs.writeFileSync(
            bakeFile,
            [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'ingredients:',
                '  - "@azbake/missing-ingredient@1.0.0"',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: missing',
                '      source: ./src',
                '      parameters: {}'
            ].join('\n')
        )

        process.env.npm_ingredient_root = nodeModules
        process.env.BAKE_ENV_REGIONS = JSON.stringify([{ name: 'Global', code: 'glob', shortName: 'global' }])
        process.env.BAKE_ENV_NAME = 'env'
        process.env.BAKE_ENV_CODE = 'code'

        const azcliPath = require.resolve('azcli-npm')
        const originalAzcli = require(azcliPath)
        const calls: string[] = []

        class FakeShellRunner {
            private args: string[] = []
            constructor(private cmd: string) {}
            public start() {
                return this
            }
            public arg(value: string) {
                this.args.push(value)
                return this
            }
            public exec() {
                calls.push([this.cmd, ...this.args].join(' '))
                return { code: 0 }
            }
        }

        require.cache[azcliPath].exports = { ShellRunner: FakeShellRunner }

        const originalRegister = IngredientManager.Register
        IngredientManager.Register = (() => {}) as any

        delete require.cache[require.resolve('../src/bake-loader')]
        const { BakePackage } = require('../src/bake-loader')

        try {
            new BakePackage(bakeFile)
        } finally {
            IngredientManager.Register = originalRegister
            require.cache[azcliPath].exports = originalAzcli
            delete require.cache[require.resolve('../src/bake-loader')]
        }

        expect(calls.length).to.eq(1)
        expect(calls[0]).to.contain('install')
        expect(calls[0]).to.contain('@azbake/missing-ingredient@1.0.0')
        expect(calls[0]).to.contain('--legacy-peer-deps')
    })
})