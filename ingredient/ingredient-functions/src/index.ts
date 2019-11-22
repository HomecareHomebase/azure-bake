import { FunctionsPlugin} from './plugin'
//import { FunctionsUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = FunctionsPlugin
exports.pluginNS = "@azbake/ingredient-functions" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
//exports.functions = FunctionsUtils
//exports.functionsNS = "functions" //bake.yaml expressions can access your functions via "myutils.my_function()"
