import { EventHubPlugin} from './plugin'
import { EventHubUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = EventHubPlugin
exports.pluginNS = "@azbake/ingredient-event-hub" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = EventHubUtils
exports.functionsNS = "eventhub" //bake.yaml expressions can access your functions via "myutils.my_function()"
