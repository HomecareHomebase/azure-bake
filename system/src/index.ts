#!/usr/bin/env node


import { ShellRunner } from 'azcli-npm'
import {IBakeRegion, Logger} from '@azbake/core'
import {BakePackage} from './bake-loader'
import {BakeRunner} from './bake-runner'
import * as fs from 'fs'
import * as path from 'path'
import * as ps from 'process'
import * as os from 'os'
import {Buffer} from 'buffer'

import * as minimist from 'minimist'

let bake_version = require('../package.json').version
process.env['npm_package_version'] = bake_version

//store the root path to bake so we can use it later with ingredient loading
let rootPath = path.join(__dirname, '../')
process.env['npm_root_path'] = rootPath

let argv = minimist(process.argv.slice(2))
let cmd: string = ""
let target: string = ""
let args: bakeArgs = <bakeArgs>{}    
let tmpFile = path.join( os.tmpdir(), 'bake.env' )
let runtimeVersion: string = "latest"
let recipeName: string = ""

interface bakeArgs {
    skipAuth: string
    envName: string
    envCode: string
    envRegions: string
    subId: string
    tenantId: string
    serviceId: string
    serviceKey?: string
    serviceCert?: string
    variables?: string
    logLevel?: string
}


function displayHelp() {
    console.log('')
    console.log('bake [command] [options] <image|file>')
    console.log('commands:')

    console.log('')
    console.log('serve\t--- Serve a pre-built image recipe or local bake yaml config')
    console.log('<image>\t\t: docker recipe image to download and deploy')
    console.log('<file>\t\t: bake yaml file to deploy')

    console.log('')
    console.log('mix\t--- Mix a recipe into a docker image for publishing')
    console.log('<file>\t\t: bake yaml file to mix into a recipe image. The entire parent folder will get copied into the image')
    console.log('--runtime\t\t: which bake runtime to mix against (latest, v1.0.0, etc)')
    console.log('--name\t\t: Name of the recipe image (docker tag)')

    console.log('')
    console.log('optional options for [serve]')
    console.log('')
    console.log('skip-auth\t\t: skip azure login for recipes that dont need it')
    console.log('env-name\t\t: Full environment name for deployment')
    console.log('env-code\t\t: 4 letter environment code (used for resource naming)')
    console.log('regions\t\t\t: [{"name":"East US","code":"eus","shortName":"eastus"}]')
    console.log('sub\t\t\t: Azure Subscription Id')
    console.log('tenant\t\t\t: Azure AAD tenant for Service Principal authentication')
    console.log('serviceid\t\t: Azure Service Principal Id')
    console.log('key\t\t\t: Azure Service Principal secret key')
    console.log('cert\t\t\t: Azure Service Principal PEM cert file (overrides secret key)')
    console.log('variables\t\t: Path to local yaml file of key:value pairs for global variables')
    console.log('loglevel\t\t\t: Log levels are debug, info, warn, and error (from most to least verbosity).  Info is the default.')

    console.log('')
    console.log('optional environment variables (instead of above parameters):')
    console.log('')
    console.log('BAKE_ENV_NAME\t\t\t: Full environment name for deployment')
    console.log('BAKE_ENV_CODE\t\t\t: 4 letter environment code (used for resource naming)')
    console.log('BAKE_ENV_REGIONS\t\t: [{"name":"East US","code":"eus","shortName":"eastus"}]')
    console.log('BAKE_AUTH_SKIP\t: skip azure login for recipes that dont need it')
    console.log('BAKE_AUTH_SUBSCRIPTION_ID\t: Azure Subscription Id')
    console.log('BAKE_AUTH_TENANT_ID\t\t: Azure AAD tenant for Service Principal authentication')
    console.log('BAKE_AUTH_SERVICE_ID\t\t: Azure Service Principal Id')
    console.log('BAKE_AUTH_SERVICE_KEY\t\t: Azure Service Principal secret key')
    console.log('BAKE_AUTH_SERVICE_CERT\t\t: Azure Service Principal PEM cert file (overrides secret key)')
    console.log('BAKE_VARIABLES\t\t\t: Path to local yaml file of key:value pairs for global variables')
    console.log('BAKE_LOG_LEVEL\t\t\t: Log levels are debug, info, warn, and error (from most to least verbosity).  Info is the default.')
    console.log('')
    canExecute = false
}

function validateParams() {

    let logger = new Logger()

    if (argv._.findIndex(x=>x == 'serve') >= 0) {
        cmd = "serve"
    } else if (argv._.findIndex(x=>x == 'mix') >= 0) {
        cmd = "mix"
    }else {
        displayHelp()
        return
    }


    if (argv._.indexOf('serve') >= 0)
        argv._.splice( argv._.indexOf('serve'), 1)
    if (argv._.indexOf('mix') >= 0)
        argv._.splice( argv._.indexOf('mix'), 1)
    if (argv._.length == 0)
    {
        displayHelp()
        return
    }

    target = argv._[0]


    if (cmd == "serve"){

        args.skipAuth = argv['skip-auth'] || process.env.BAKE_AUTH_SKIP || "false"
        args.envName = argv['env-name'] || process.env.BAKE_ENV_NAME || "default"
        args.envCode = argv['env-code'] || process.env.BAKE_ENV_CODE || "de000"
        args.envRegions = argv['regions'] || process.env.BAKE_ENV_REGIONS || '[{"name":"Global","code":"glob","shortName":"global"}]'
        args.subId = argv['sub'] || process.env.BAKE_AUTH_SUBSCRIPTION_ID || ""
        args.tenantId = argv['tenant'] || process.env.BAKE_AUTH_TENANT_ID || ""
        args.serviceId = argv['serviceid'] || process.env.BAKE_AUTH_SERVICE_ID || ""
        args.serviceKey = argv['key'] || process.env.BAKE_AUTH_SERVICE_KEY
        args.serviceCert = argv['cert'] || process.env.BAKE_AUTH_SERVICE_CERT
        args.variables = argv['variables'] || process.env.BAKE_VARIABLES
        args.logLevel = argv['loglevel'] || process.env.BAKE_LOG_LEVEL

        if (args.skipAuth.toLocaleLowerCase() === 'false' && (
            !args.envName ||
            !args.envCode ||
            !args.envRegions ||
            !args.subId ||
            !args.tenantId ||
            !args.serviceId ||
            (!args.serviceKey && !args.serviceCert))) {
                displayHelp()
                return
        }

        process.env.BAKE_ENV_NAME = args.envName
        process.env.BAKE_ENV_CODE = args.envCode
        process.env.BAKE_ENV_REGIONS = args.envRegions
        process.env.BAKE_AUTH_SKIP = args.skipAuth
        process.env.BAKE_AUTH_SUBSCRIPTION_ID = args.subId
        process.env.BAKE_AUTH_TENANT_ID = args.tenantId
        process.env.BAKE_AUTH_SERVICE_ID = args.serviceId
        process.env.BAKE_AUTH_SERVICE_KEY = args.serviceKey || ""
        process.env.BAKE_AUTH_SERVICE_CERT = args.serviceCert || ""
        process.env.BAKE_VARIABLES = args.variables || ""
        process.env.BAKE_LOG_LEVEL = args.logLevel || ""

        if (fs.existsSync(target)) {
            cmd = "run" //will serve a local yaml config file
        }

    }

    if (cmd == "mix"){
        if (!argv.runtime){
            displayHelp()
            return
        }
        runtimeVersion = argv.runtime

        if (!argv.name){
            displayHelp()
            return
        }
        recipeName = argv.name

        if (!fs.existsSync(target)) {
            displayHelp()
            return
        }
    }
}

function build(){

    let cli = new ShellRunner("docker")

    //fixup to find our root folder to build a docker image against
    let basePath = path.dirname(target)
    if (basePath != ".") {
        ps.chdir(basePath)
        target = target.replace(basePath,'')
        if (target[0] == "/")
        target = target.substr(1)    
    }

    let dockerIgnore = "node_modules"
    fs.writeFileSync(".dockerignore", dockerIgnore)

    let dockerImage = "FROM homecarehomebase/bake:" + runtimeVersion + "\r\n" +
    "WORKDIR /app/bake/package\r\n" +
    "COPY . .\r\n"

    //rename target in container as "bake.yaml" for fixed file execution
    dockerImage = dockerImage + "COPY " + target + " ./bake.yaml\r\n"

    let dockerFile = "Dockerfile"
    fs.writeFileSync(dockerFile, dockerImage)

    console.log('Mixing...' + recipeName)
    cli.start().arg('build').arg("-t=" + recipeName).arg(".").execStream()
    .then(()=>{
        fs.unlinkSync(dockerFile)
        fs.unlinkSync(".dockerignore")
        console.log('Mix Completed.')
    })
    .catch((e)=>{
        fs.unlinkSync(dockerFile)
        fs.unlinkSync(".dockerignore")
        console.error('Failed to mix')
        console.error(e)
    })

    try {
    } catch(err){
    } finally {
    }
}

async function run(): Promise<number> {

    let bakeFile:string = target

    //fix up the working folder to base at the bake file
    let basePath = path.dirname(bakeFile)
    if (basePath != ".") {
        ps.chdir(basePath)
        bakeFile = bakeFile.replace(basePath,'')
        if (bakeFile[0] == "/")
            bakeFile = bakeFile.substr(1)    
    }

    //setup node require to support our ingredient location
    let ingredientPath = path.join(basePath, 'node_modules')
    process.env['npm_ingredient_root'] = ingredientPath

    let sep = ':'
    if (process.platform === "win32") {
        sep = ';'
    }

    process.env.NODE_PATH = path.join(rootPath,'node_modules') + sep + ingredientPath
    require("module").Module._initPaths();

    let regions: Array<IBakeRegion> = JSON.parse(process.env.BAKE_ENV_REGIONS || "")

    var pkg = new BakePackage(bakeFile)
    var runner = new BakeRunner(pkg)

    try{
        var result = await runner.login()
        if (result){
            await runner.bake(regions)
            return 0
        }    
    }
    catch(err){
        console.log(err)
    }
    return 1
}

function deploy(){

    let cli = new ShellRunner("docker")

    fs.writeFileSync(tmpFile, 
        `BAKE_ENV_NAME=${ args.envName }\r\n` +
        `BAKE_ENV_CODE=${ args.envCode }\r\n` +
        `BAKE_ENV_REGIONS=${ args.envRegions }\r\n` +
        `BAKE_AUTH_SKIP=${args.skipAuth}\r\n` +
        `BAKE_AUTH_SUBSCRIPTION_ID=${ args.subId }\r\n` +
        `BAKE_AUTH_TENANT_ID=${ args.tenantId }\r\n` +
        `BAKE_AUTH_SERVICE_ID=${ args.serviceId }\r\n` +
        `BAKE_AUTH_SERVICE_KEY=${( args.serviceKey || "" )}\r\n` +
        `BAKE_AUTH_SERVICE_CERT=${( args.serviceCert || "" )}\r\n` +
        `BAKE_VARIABLES=/app/bake/.env\r\n` +
        `BAKE_LOG_LEVEL=${(args.logLevel || "")}\r\n`
        )
        
    try {

        let runner = cli.arg('run').arg('--rm').arg('-t')
            .arg('--env-file=' + tmpFile);

        if (args.variables) {
            runner = runner.arg(`-v=${args.variables}:/app/bake/.env`)
        }

        runner = runner.arg(target);

        let p = runner.execStream();
        p.then((r)=> {
            deleteEnvFile()
            process.exit(r);
        }).catch((r)=>{
            deleteEnvFile()
            process.exit(15);
        })
    } finally {
    }
}

function deleteEnvFile() {
    fs.unlinkSync(tmpFile)
}

console.log("Bake CLI v" + bake_version)

let canExecute:boolean = true
validateParams()
if (canExecute) {

    if (cmd == "mix") build()
    if (cmd == "serve") deploy()
    if (cmd == "run") run().then(code=> process.exit(code))
}