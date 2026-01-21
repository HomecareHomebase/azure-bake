import { expect } from 'chai'
import 'mocha'
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const systemRoot = path.resolve(__dirname, '..')
const cliPath = path.join(systemRoot, 'src', 'index.ts')

function runCli(args: string[]) {
    return spawnSync(process.execPath, ['-r', 'ts-node/register', cliPath, ...args], {
        cwd: systemRoot,
        env: { ...process.env },
        encoding: 'utf8'
    })
}

describe('bake CLI parsing', () => {
    it('prints help with no args', () => {
        const result = runCli([])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('bake [command] [options] <image|file>')
        expect(result.stdout).to.contain('optional environment variables')
    })

    it('requires runtime for mix', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-cli-'))
        const bakeFile = path.join(tempDir, 'bake.yaml')
        fs.writeFileSync(bakeFile, 'name: temp\nshortName: tmp\nversion: 1.0.0\nrecipe: {}\n')

        const result = runCli(['mix', bakeFile, '--name', 'test'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('mix')
        expect(result.stdout).to.contain('--runtime')
    })

    it('requires name for mix', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bake-cli-'))
        const bakeFile = path.join(tempDir, 'bake.yaml')
        fs.writeFileSync(bakeFile, 'name: temp\nshortName: tmp\nversion: 1.0.0\nrecipe: {}\n')

        const result = runCli(['mix', bakeFile, '--runtime', 'latest'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('mix')
        expect(result.stdout).to.contain('--name')
    })

    it('shows help for serve when required auth params are missing', () => {
        const result = runCli(['serve', 'dummy-image'])
        expect(result.status).eq(0)
        expect(result.stdout).to.contain('serve')
        expect(result.stdout).to.contain('BAKE_AUTH_SUBSCRIPTION_ID')
    })
})