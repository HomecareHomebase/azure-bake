import { BaseIngredient, IngredientManager, IIngredient, DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
import { SqlManagementClient, SqlManagementModels, SqlManagementMappers } from "@azure/arm-sql";

export class SqlDwh extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);

        this._sbmClient = new SqlManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)  

        this._helper = new ARMHelper(this._ctx);

    }

    _helper: ARMHelper;
    
    private readonly _sbmClient: SqlManagementClient;

    private _IsDBPaused: Boolean = false;

    private _Check: Boolean = false;

    private _IsNewDB: Boolean = true;

    private async _pausesqldwh(resourcegroup: string, servername: string, databasename: string){

        let answer = await this._sbmClient.databases.pause(resourcegroup,servername,databasename,undefined)

        return answer
    }

    private async _resumesqldwh(resourcegroup: string, servername: string, databasename: string){

        let answer = await this._sbmClient.databases.resume(resourcegroup,servername,databasename,undefined)

        return answer
    }

    private async _getdatabases(resourcegroup: string, servername: string){

        let answer = await this._sbmClient.databases.listByServer(resourcegroup,servername,undefined) 

        return answer
    }

    private async _GetDatabaseStatus(resourcegroup: string, servername: string, databasename: string){

        let getdbs = await this._getdatabases(resourcegroup,servername) 
            
        var dbcheck: string[] = []
        
        getdbs.forEach(function(item){if (item.name===databasename){ dbcheck.push(item.name as string)}})
        
        if (dbcheck.indexOf(databasename) > -1){

             let db = await this._sbmClient.databases.get(resourcegroup,servername,databasename)  
               this._sbmClient.databases.beginUpdate
             if (db.status==="Paused"){
                
             let resumeanswer = await this._resumesqldwh(resourcegroup,servername,databasename)   
                
             this._ctx._logger.log('Database: '+databasename+' has been resumed.')
                
             this._Check = true;
                
             this._IsDBPaused = true;

            }
            else{

                this._IsDBPaused = false;
            }

        }else{
            
            this._IsNewDB = true;
            
        }
        return this._IsDBPaused,this._IsNewDB
    }

    public async DeployAlerts(){
        try{

        }catch{

        }


    }

    public async Execute(): Promise<void> {
        try {           
            
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

            this._ctx._logger.log('SQL Synapse Plugin Logging: ' + this._ingredient.properties.source)

            let params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ctx.Ingredient.properties.parameters)
            
            let servername = params['serverName'] ? params['serverName'].value : undefined;
            let databasename = params['databaseName'] ? params['databaseName'].value : undefined;
            let resourcegroup = await util.resource_group()
            
            let dbstatus = await this._GetDatabaseStatus(resourcegroup,servername,databasename)

            params = await this._helper.ConfigureDiagnostics(params);
            
            await this._helper.DeployTemplate(this._name, ARMTemplate, params, resourcegroup) 

            this._Check = true;
                 
            if (this._IsDBPaused === true || this._IsNewDB === true){
                
                let pauseanswer = await this._pausesqldwh(resourcegroup,servername,databasename)

                this._logger.log('Database Status: '+pauseanswer.status+' ,DB: ' + databasename + ' ,RG:' + resourcegroup + ' ,Svr:' + servername)
           
            }



            

        } catch(error){            
            
            if (this._IsDBPaused === true && this._Check === true){

                 let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
                 this._logger.log('Logical SQL Server Plugin Logging: ' + this._ingredient.properties.source)                 

                 let params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ctx.Ingredient.properties.parameters)
                
                 let servername = params['serverName'] ? params['serverName'].value : undefined;
                 let databasename = params['databaseName'] ? params['databaseName'].value : undefined;
                 let resourcegroup = await util.resource_group()
                
                 let pauseanswer = await this._pausesqldwh(resourcegroup,servername,databasename)

                 this._logger.log('Database Status: '+pauseanswer.status+' ,DB: ' + databasename + ' ,RG:' + resourcegroup + ' ,Svr:' + servername)
           
             }
            
            this._logger.error('deployment failed: ' + error)
            throw error

        }
    }
}