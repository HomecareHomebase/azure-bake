import {ApimPlugin} from './plugin'
import {ApimUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ApimPlugin
exports.pluginNS = "@azbake/ingredient-apim" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = ApimUtils
exports.functionsNS = "apim" //bake.yaml expressions can access your functions via "myutils.my_function()"
