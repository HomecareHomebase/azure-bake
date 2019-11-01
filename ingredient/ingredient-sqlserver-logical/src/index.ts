import {SqlServerLogical} from './plugin'
import {SqlServerLogicalUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = SqlServerLogical
exports.pluginNS = "@azbake/ingredient-sqlserver-logical" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = SqlServerLogicalUtils
exports.functionsNS = "sqlserverlogical" //bake.yaml expressions can access your functions via "myutils.my_function()"
