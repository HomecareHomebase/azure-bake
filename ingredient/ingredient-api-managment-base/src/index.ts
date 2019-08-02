import { ApimBase } from './plugin'
import { ApimBaseUtil } from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ApimBase
exports.pluginNS = "@azbake/ingredient-api-management-base" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = ApimBaseUtil
exports.functionsNS = "apim-base" //bake.yaml expressions can access your functions via "myutils.my_function()"