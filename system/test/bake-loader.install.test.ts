import { expect } from 'chai'
import 'mocha'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

import { IngredientManager } from '@azbake/core'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

describe('bake-loader dynamic install', () => {
    it('skips install when ingredients are linked locally', () => {
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-install-'))
        const nodeModules = path.join(tmpRoot, 'node_modules')
        const scopeDir = path.join(nodeModules, '@azbake')
        fs.mkdirSync(scopeDir, { recursive: true })

        const ingredientSource = path.resolve(__dirname, '../../ingredient/ingredient-null')
        const ingredientLink = path.join(scopeDir, 'ingredient-null')
        fs.symlinkSync(ingredientSource, ingredientLink, 'junction')

        const bakeFile = path.join(tmpRoot, 'bake.yaml')
        fs.writeFileSync(
            bakeFile,
            [
                'name: test',
                'shortName: tst',
                'version: 1.0.0',
                'ingredients:',
                '  - "@azbake/ingredient-null@0.0.11"',
                'recipe:',
                '  alpha:',
                '    properties:',
                '      type: "@azbake/ingredient-null"',
                '      source: ./src',
                '      parameters: {}'
            ].join('\n')
        )

        const originalNodePath = process.env.NODE_PATH
        process.env.npm_ingredient_root = nodeModules
        process.env.NODE_PATH = nodeModules
        require('module').Module._initPaths()

        process.env.BAKE_ENV_REGIONS = JSON.stringify([{ name: 'Global', code: 'glob', shortName: 'global' }])
        process.env.BAKE_ENV_NAME = 'env'
        process.env.BAKE_ENV_CODE = 'code'

        const azcliPath = require.resolve('azcli-npm')
        const originalAzcli = require(azcliPath)
        const calls: string[] = []

        class FakeShellRunner {
            private args: string[] = []
            private cmd: string
            constructor(cmd: string) {
                this.cmd = cmd
            }
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
            if (originalNodePath) {
                process.env.NODE_PATH = originalNodePath
            } else {
                delete process.env.NODE_PATH
            }
            require('module').Module._initPaths()
        }

        expect(calls.length).to.eq(0)
    })
})