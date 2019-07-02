import {MetricAlertPlugin} from './plugin'
import { MetricAlertUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = MetricAlertPlugin
exports.pluginNS = "@azbake/ingredient-metric-alert" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = MetricAlertUtils
exports.functionsNS = "metricalert" //bake.yaml expressions can access your functions via "myutils.my_function()"
 