import tl = require('azure-pipelines-task-lib/task');
import * as path from 'path'
import * as fs from 'fs'
import {Buffer} from 'buffer'
import { IExecOptions } from 'azure-pipelines-task-lib/toolrunner';

export class clitask {

    public static async runMain(){

        try{
            const recipeName: string = tl.getInput('recipe', false)
            const recipeArtifact: string = tl.getInput('recipeArtifact', false)

            if (recipeName && recipeArtifact) {
                throw new Error('Both recipe and bake artifact file are defined, only one can be set')
            }

            if (!recipeArtifact && !recipeName) {
                throw new Error('One of recipe or bake artifact file must be defined')
            }

            this.setupCredentials()
            this.setupEnvironment()

            this.deployImage(recipeName, recipeArtifact)
        } catch (err){
            tl.setResult(tl.TaskResult.Failed, err.message);
        }

    }
    static deployImage(recipe: string, recipeFile: string): void {

        if (recipeFile) {
            let contents = fs.readFileSync(recipeFile)
            recipe = contents.toString()
            console.log('Deploying Bake recipe via Artifact output | ' + recipe)
        }

        let tool = tl.tool('docker')

        let envFile = path.join(tl.getVariable('Agent.TempDirectory') || tl.getVariable('system.DefaultWorkingDirectory') || 'c:/temp/', 'bake.env')

        let envContent = "BAKE_ENV_NAME="+process.env.BAKE_ENV_NAME+"\r\n" +
        "BAKE_ENV_CODE="+process.env.BAKE_ENV_CODE+"\r\n" +
        "BAKE_ENV_REGIONS="+process.env.BAKE_ENV_REGIONS+"\r\n" +
        "BAKE_AUTH_SUBSCRIPTION_ID="+process.env.BAKE_AUTH_SUBSCRIPTION_ID+"\r\n" +
        "BAKE_AUTH_TENANT_ID="+process.env.BAKE_AUTH_TENANT_ID+"\r\n" +
        "BAKE_AUTH_SERVICE_ID="+process.env.BAKE_AUTH_SERVICE_ID+"\r\n" +
        "BAKE_AUTH_SERVICE_CERT="+(process.env.BAKE_AUTH_SERVICE_CERT||"")+"\r\n" +
        "BAKE_AUTH_SERVICE_KEY="+(process.env.BAKE_AUTH_SERVICE_KEY||"")+"\r\n" +
        "BAKE_VARIABLES64="+(process.env.BAKE_VARIABLES64||"")+"\r\n"    

        fs.writeFileSync(envFile,envContent)

        //clear out current env vars now
        process.env.BAKE_ENV_NAME = process.env.BAKE_ENV_CODE = process.env.BAKE_ENV_REGIONs = process.env.BAKE_AUTH_SUBSCRIPTION_ID =
        process.env.BAKE_AUTH_TENANT_ID = process.env.BAKE_AUTH_SERVICE_ID = process.env.BAKE_AUTH_SERVICE_KEY = process.env.BAKE_AUTH_SERVICE_CERT =
        process.env.BAKE_VARIABLES64 = ""

        let p = tool.arg('run').arg('--rm').arg('-t')
                .arg('--env-file=' + envFile)
                .arg(recipe)
                .exec()

            p.then((code)=>{
                this.cleanupAndExit(envFile, code)
            }, (err)=>{
                this.cleanupAndExit(envFile, 2)
            })            
        
    }

    static cleanupAndExit(envFile: string, exitCode: number){
        fs.unlinkSync(envFile)
        if (exitCode != 0)
        {
            tl.setResult(tl.TaskResult.Failed, "Deployment Failed");
            process.exit(exitCode)
        }
    }

    static setupEnvironment(): void {
        let envName: string = tl.getInput('envName', false)
        let envCode: string = tl.getInput('envCode', false)
        let envRegions: string = tl.getInput('envRegions', false)

        if (!envName) {
            envName = process.env.BAKE_ENV_NAME || ""
            if (!envName)
            {
                throw new Error("Environment Name is required");
            }
        }

        if (!envCode){
            envCode = process.env.BAKE_ENV_CODE || ""
            if (!envCode)
            {
                throw new Error("Environment Code is required");
            }
        }

        if (!envRegions) {
            envRegions = process.env.BAKE_ENV_REGIONS || ""
            if (!envRegions)
            {
                throw new Error("Deployment Regions are required");
            }
        }

        //gather up all environment variables.
        let bakeVars : string = ""
        for(let envvar in process.env){
            if (!envvar.toLocaleUpperCase().startsWith("BAKE_") &&
                !envvar.toLocaleUpperCase().startsWith("ENDPOINT_") &&
                !envvar.toLocaleUpperCase().startsWith("INPUT_") )
            bakeVars += envvar + ": '" + process.env[envvar] +"'\n"
        }
        let b64 = Buffer.from(bakeVars, 'ascii').toString('base64')

        console.log('Setting environment for %s (%s)', envName, envCode)
        process.env.BAKE_ENV_NAME = envName
        process.env.BAKE_ENV_CODE = envCode
        process.env.BAKE_ENV_REGIONS = envRegions 
        process.env.BAKE_VARIABLES64 = b64
    }

    static setupCredentials(): void {
        var connectedService: string = tl.getInput("azureConnection", true)

        let servicePrincipalId: string = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalid", false)
        let authType: string = tl.getEndpointAuthorizationParameter(connectedService, 'authenticationType', true)
        let cliPassword: string = ""
        let cliPasswordPath: string = ""
        let servicePrincipalKey: string = ""
        if (authType == "spnCertificate") {
            tl.debug('certificate based endpoint')
            let certificateContent: string = tl.getEndpointAuthorizationParameter(connectedService, "servicePrincipalCertificate", false)
            cliPassword = path.join(tl.getVariable('Agent.TempDirectory') || tl.getVariable('system.DefaultWorkingDirectory'), 'spnCert.pem')
            fs.writeFileSync(cliPassword, certificateContent)
            cliPasswordPath = cliPassword

        }
        else {
            tl.debug('key based endpoint')
            cliPassword = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalkey", false)
            servicePrincipalKey = cliPassword
        }

        var tenantId: string = tl.getEndpointAuthorizationParameter(connectedService, "tenantid", false)
        var subscriptionID: string = tl.getEndpointDataParameter(connectedService, "SubscriptionID", true)

        //assign to env vars so we can pass in later.
        process.env.BAKE_AUTH_SUBSCRIPTION_ID = subscriptionID
        process.env.BAKE_AUTH_TENANT_ID = tenantId
        process.env.BAKE_AUTH_SERVICE_ID = servicePrincipalId
        process.env.BAKE_AUTH_SERVICE_KEY = servicePrincipalKey
        process.env.BAKE_AUTH_SERVICE_CERT = cliPasswordPath

        console.log('Setting up authentication for SUBID=%s TID=%s', subscriptionID, tenantId)
        
    } 
}


clitask.runMain();
