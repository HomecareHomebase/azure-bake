import {DataFactoryV2} from './plugin'
import {DataFactoryV2Utils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = DataFactoryV2
exports.pluginNS = "@azbake/ingredient-datafactoryv2" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = DataFactoryV2Utils
exports.functionsNS = "datafactory" //bake.yaml expressions can access your functions via "myutils.my_function()"
