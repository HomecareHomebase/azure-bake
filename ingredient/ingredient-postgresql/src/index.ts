import {PostgreSQLDB} from './plugin'
import {PostgreSQLDBUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = PostgreSQLDB
exports.pluginNS = "@azbake/ingredient-postgresql" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = PostgreSQLDBUtils
exports.functionsNS = "postgresqldbutils" //bake.yaml expressions can access your functions via "myutils.my_function()"
