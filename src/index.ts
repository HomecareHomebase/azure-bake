#!/usr/bin/env node


import cli from 'azcli-npm'
import {BakePackage, IBakeRegion} from './bake-loader'
import {BakeRunner} from './bake-runner'
import * as fs from 'fs'
import * as path from 'path'
import * as ps from 'process'

import * as minimist from 'minimist'
import { Logger } from './logger';

let argv = minimist(process.argv.slice(2))

function displayHelp() {
    console.log('')
    console.log('bake [options] -f <bake-file>')
    console.log('options:')
    console.log('')
    console.log('--type\t\t: Force bake deployment to only install ingredients of a specific type')
    console.log('')
    console.log('required environment variables:')
    console.log('')
    console.log('BAKE_ENV_NAME\t\t\t: Full environment name for deployment')
    console.log('BAKE_ENV_CODE\t\t\t: 4 letter environment code (used for resource naming)')
    console.log('BAKE_ENV_REGIONS\t\t: [{"name":"East US","code":"eus","shortName":"eastus"}]')
    console.log('BAKE_AUTH_SUBSCRIPTION_ID\t: Azure Subscription Id')
    console.log('BAKE_AUTH_TENANT_ID\t\t: Azure AAD tenant for Service Principal authentication')
    console.log('BAKE_AUTH_SERVICE_ID\t\t: Azure Service Principal Id')
    console.log('BAKE_AUTH_SERVICE_KEY\t\t: Azure Service Principal secret key')
    console.log('BAKE_AUTH_SERVICE_CERT\t\t: Azure Service Principal PEM cert file (overrides secret key)')
    console.log('BAKE_VARIABLES\t\t\t: YAML data of global bake variables')
    console.log('')
    canExecute = false
}

function validateParams() {

    let logger = new Logger()
    if (!argv.f) {
        displayHelp()
        return
    }

    if (!fs.existsSync(argv.f)) {
        logger.error("Error: " + argv.f + " can not be found")
        displayHelp()
        return
    }

    if (!process.env.BAKE_ENV_NAME) {
        logger.error("Error: " + "BAKE_ENV_NAME is required")
        displayHelp()
        return
    }
    if (!process.env.BAKE_ENV_CODE) {
        logger.error("Error: " + "BAKE_ENV_CODE is required")
        displayHelp()
        return
    }
    if (process.env.BAKE_ENV_CODE.length > 4) {
        logger.error("Error: " + "BAKE_ENV_CODE must be under 4 characters")
        displayHelp()
        return    
    }  
    if (!process.env.BAKE_ENV_REGIONS) {
        logger.error("Error: " + "BAKE_ENV_REGIONS is required")
        displayHelp()
        return
    }

    try {
        let regions : Array<IBakeRegion> = JSON.parse(process.env.BAKE_ENV_REGIONS)
        if (!regions || regions.length == 0) {
            logger.error("Error: " + "BAKE_ENV_REGIONS has no values")
            displayHelp()
            return    
        }

        regions.forEach(region=>{
            if (!region.name || !region.code || !region.shortName) {
                logger.error("Error: " + "BAKE_ENV_REGIONS has invalid values")
                displayHelp()
                return        
            }
        })
    }
    catch (e){
        logger.error("Error: " + "BAKE_ENV_REGIONS is not valid json")
        displayHelp()
        return
    }
 
    if (!process.env.BAKE_AUTH_SUBSCRIPTION_ID) {
        logger.error("Error: " + "BAKE_AUTH_SUBSCRIPTION_ID is required")
        displayHelp()
        return
    }
    if (!process.env.BAKE_AUTH_TENANT_ID) {
        logger.error("Error: " + "BAKE_AUTH_TENANT_ID is required")
        displayHelp()
        return
    }
    if (!process.env.BAKE_AUTH_SERVICE_ID) {
        logger.error("Error: " + "BAKE_AUTH_SERVICE_ID is required")
        displayHelp()
        return
    }
    if (!process.env.BAKE_AUTH_SERVICE_KEY && !process.env.BAKE_AUTH_SERVICE_CERT) {
        logger.error("Error: " + "BAKE_AUTH_SERVICE_KEY or BAKE_AUTH_SERVICE_CERT is required")
        displayHelp()
        return
    }
}

let canExecute:boolean = true
validateParams()

if (canExecute) {

    let bakeFile:string = argv.f || ""
    let typeOverride = argv.type || ""

    if (!fs.existsSync(bakeFile)) {
        console.log("Error: " + bakeFile + " can not be found")
        throw new Error('bakeFile cannot be found')
    }

    //fix up the working folder to base at the bake file
    let basePath = path.dirname(bakeFile)
    if (basePath != ".") {
        ps.chdir(basePath)
        bakeFile = bakeFile.replace(basePath,'')
        if (bakeFile[0] == "/")
            bakeFile = bakeFile.substr(1)    
    }

    let regions: Array<IBakeRegion> = JSON.parse(process.env.BAKE_ENV_REGIONS || "")

    var pkg = new BakePackage(bakeFile)
    var azcli = new cli()
    var runner = new BakeRunner(pkg, azcli)

    var result = runner.login()
    if (result) {
        runner.bake(regions)
    }
}