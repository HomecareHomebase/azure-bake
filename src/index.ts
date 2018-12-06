import cli from 'azcli-npm'
import {BakePackage} from './bake-loader'
import {BakeRunner} from './bake-runner'
import * as fs from 'fs'

import * as minimist from 'minimist'
let argv = minimist(process.argv.slice(2))

function displayHelp() {
    console.log('bake [options] -f <bake-file>')
    console.log('options:')
    console.log('')
    console.log('--type\t\t: Force bake deployment to only install ingredients of a specific type')
    console.log('')
    console.log('required environment variables:')
    console.log('')
    console.log('BAKE_AUTH_SUBSCRIPTION_ID\t\t: Azure Subscription Id')
    console.log('BAKE_AUTH_TENANT_ID\t\t: Azure AAD tenant for Service Principal authentication')
    console.log('BAKE_AUTH_SERVICE_ID\t\t: Azure Service Principal Id')
    console.log('BAKE_AUTH_SERVICE_KEY\t\t: Azure Service Principal secret key')
    console.log('BAKE_AUTH_SERVICE_CERT\t\t: Azure Service Principal PEM cert file (overrides secret key)')
    console.log('BAKE_VARIABLES\t\t: YAML data of global bake variables')
    console.log('')
    canExecute = false
}

let canExecute:boolean = true
if (!argv.f) {
    displayHelp()
}

if (canExecute) {

    let bakeFile = argv.f || ""
    let typeOverride = argv.type || ""

    if (!fs.existsSync(bakeFile)) {
        console.log("Error: " + bakeFile + " can not be found")
        throw new Error('bakeFile cannot be found')
    }

    var pkg = new BakePackage(bakeFile)
    var azcli = new cli()
    var runner = new BakeRunner(pkg, azcli)

    var result = runner.login()
    if (result) {
        runner.bake().then(()=>
        {
        })    
    }
}