import { expect } from 'chai'
import 'mocha'
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const systemRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(systemRoot, '..')
const cliPath = path.join(systemRoot, 'src', 'index.ts')
const recipePath = path.join(repoRoot, 'tests', 'fixtures', 'recipes', 'e2e.yaml')
const recipeArg = recipePath.split(path.sep).join('/')
const outputPath = path.join(path.dirname(recipePath), 'e2e.out')

describe('bake CLI E2E', () => {
    beforeEach(() => {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }
    })

    afterEach(() => {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
        }
    })

    it('runs a local recipe and writes output', () => {
        const result = spawnSync(process.execPath, [
            '-r',
            'ts-node/register',
            cliPath,
            'serve',
            recipeArg,
            '--skip-auth',
            'true'
        ], {
            cwd: systemRoot,
            env: { ...process.env },
            encoding: 'utf8'
        })

        expect(result.status).eq(0)
        expect(fs.existsSync(outputPath)).eq(true)
        expect(fs.readFileSync(outputPath, 'utf8')).eq('ok:hello')
    })
})