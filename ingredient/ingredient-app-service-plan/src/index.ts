import {AppServicePlan} from './plugin'
import {AppServicePlanUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = AppServicePlan
exports.pluginNS = "@azbake/ingredient-app-service-plan" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = AppServicePlanUtils
exports.functionsNS = "appserviceplan" //bake.yaml expressions can access your functions via "myutils.my_function()"
