import {SqlDB} from './plugin'
import {SqlDBUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = SqlDB
exports.pluginNS = "@azbake/ingredient-sqldb" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = SqlDBUtils
exports.functionsNS = "SqlDB" //bake.yaml expressions can access your functions via "myutils.my_function()"
