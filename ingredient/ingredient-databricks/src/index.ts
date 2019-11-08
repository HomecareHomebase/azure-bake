import {DataBricks} from './plugin'
import {DataBricksUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = DataBricks
exports.pluginNS = "@azbake/ingredient-databricks" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = DataBricksUtils
exports.functionsNS = "DataBricks" //bake.yaml expressions can access your functions via "myutils.my_function()"
