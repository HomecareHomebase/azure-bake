import {WebAppContainer} from './plugin'
import {WebAppUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = WebAppContainer;
exports.pluginNS = "@azbake/ingredient-webapp-container"; //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = WebAppUtils;
exports.functionsNS = "webapp"; //bake.yaml expressions can access your functions via "myutils.my_function()"
