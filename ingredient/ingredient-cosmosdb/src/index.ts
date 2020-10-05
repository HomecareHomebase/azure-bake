import {CosmosDb} from './plugin'
import {CosmosUtility} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = CosmosDb
exports.pluginNS = "@azbake/ingredient-cosmosdb" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = CosmosUtility
exports.functionsNS = "cosmosdbutils" //bake.yaml expressions can access your functions via "myutils.my_function()"
