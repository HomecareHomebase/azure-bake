import {AvailabilitySetPlugin} from './plugin'
import {AvailabilitySetUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = AvailabilitySetPlugin
exports.pluginNS = "@azbake/ingredient-availability-set" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = AvailabilitySetUtils
exports.functionsNS = "availutils" //bake.yaml expressions can access your functions via "myutils.my_function()"
