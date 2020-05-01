import { PropertyServicePlugIn } from './plugin'
import { PropertyServiceClientUtils } from './functions'

exports.plugin = PropertyServicePlugIn
exports.pluginNS = "@azbake/ingredient-property-service" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = PropertyServiceClientUtils
exports.functionsNS = "propertyservice" //bake.yaml expressions can access your functions via "myutils.my_function()"