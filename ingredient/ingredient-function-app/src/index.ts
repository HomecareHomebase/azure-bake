import {FunctionAppPlugin} from './plugin'
import {FunctionAppUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = FunctionAppPlugin
exports.pluginNS = "function-app-plugin" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = FunctionAppUtils
exports.functionsNS = "functionapputils" //bake.yaml expressions can access your functions via "myutils.my_function()"
