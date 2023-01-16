import {AcsPlugin} from './plugin'
import {AcsUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = AcsPlugin
exports.pluginNS = "@azbake/ingredient-acs" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = AcsUtils
exports.functionsNS = "acs" //bake.yaml expressions can access your functions via "myutils.my_function()"
