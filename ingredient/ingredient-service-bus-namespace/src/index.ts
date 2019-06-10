import {ServiceBusNamespace} from './plugin'
import {ServiceBusNamespaceUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ServiceBusNamespace
exports.pluginNS = "@azbake/ingredient-service-bus-namespace" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = ServiceBusNamespaceUtils
exports.functionsNS = "servicebusnamespace" //bake.yaml expressions can access your functions via "myutils.my_function()"
