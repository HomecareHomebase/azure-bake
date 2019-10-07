import {SqlDwh} from './plugin'
import {SqlDwhUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = SqlDwh
exports.pluginNS = "@azbake/ingredient-sql-dwh" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = SqlDwhUtils
exports.functionsNS = "SqlDwh" //bake.yaml expressions can access your functions via "myutils.my_function()"
