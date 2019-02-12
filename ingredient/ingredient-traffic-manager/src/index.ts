import {TrafficManager} from './plugin'
import { TrafficUtils } from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = TrafficManager
exports.pluginNS = "@azbake/ingredient-traffic-manager" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = TrafficUtils
exports.functionsNS = "traffic" //bake.yaml expressions can access your functions via "myutils.my_function()"
