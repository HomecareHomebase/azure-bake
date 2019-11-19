import { ServiceBusQueuePlugin} from './plugin'
//import { ServiceBusQueueUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ServiceBusQueuePlugin
exports.pluginNS = "@azbake/ingredient-service-bus-queue" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
//exports.functions = ServiceBusQueueUtils
//exports.functionsNS = "servicebusqueue" //bake.yaml expressions can access your functions via "myutils.my_function()"
