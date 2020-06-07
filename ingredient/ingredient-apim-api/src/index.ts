import { ApimApi } from './plugin'
import { ApimApiUtils } from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ApimApi
exports.pluginNS = "@azbake/ingredient-apim-api" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = ApimApiUtils
exports.functionsNS = "apimapi" //bake.yaml expressions can access your functions via "myutils.my_function()"