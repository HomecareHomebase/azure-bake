import {NullPlugin} from './plugin'
import {NullUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = NullPlugin
exports.pluginNS = "@azbake/ingredient-null" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
//exports.functions = NullUtils
//exports.functionsNS = "nullutils" //bake.yaml expressions can access your functions via "myutils.my_function()"
