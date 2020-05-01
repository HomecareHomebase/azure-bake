## Changelogs
* [@azbake/ingredient-service-bus-queue](./CHANGELOG.md)

## Overview
The Service Bus Queue ingredient is a plugin. When included in a recipe, it creates or updates a service bus queue.

This ingredient does not deploy a service bus namespace. It expects the namespace to already exist.  The namespace can be created in another recipe or within the same recipe.

## Usage

### Recipe
```yaml
name: service-bus-queue-test
shortName: sbqueuetest
version: 0.1.0
ingredients:
  - "@azbake/ingredient-service-bus-queue@~0"
resourceGroup: true
#rgOverride: "" 
variables:
  serviceBusNamespaceName: test-service-bus
  serviceBusQueueName: test-service-bus-queue-1
  queueResourceGroup: test-rg
  lockDuration: PT1M
  maxSizeInMegabytes: 1024
  requiresDuplicateDetection: False
  requiresSession: False
  defaultMessageTimeToLive: P10675199DT2H48M5.4775807S
  deadLetteringOnMessageExpiration: False
  duplicateDetectionHistoryTimeWindow: PT10M
  maxDeliveryCount: 10
  autoDeleteOnIdle: P10675199DT2H48M5.4775807S
  enablePartitioning: False
  enableExpress: False
recipe:
  queues:
    properties:
      type: "@azbake/ingredient-service-bus-queue"
      source: ./arm.json
      parameters:
        serviceBusNamespaceName: "[coreutils.variable('serviceBusNamespaceName')]"
        serviceBusQueueName: "[coreutils.variable('serviceBusQueueName')]"
        resourceGroup: "[coreutils.variable('queueResourceGroup')]"
        lockDuration: "[coreutils.variable('lockDuration')]"
        maxSizeInMegabytes: "[coreutils.variable('maxSizeInMegabytes')]"
        requiresDuplicateDetection: "[coreutils.variable('requiresDuplicateDetection')]"
        requiresSession: "[coreutils.variable('requiresSession')]"
        defaultMessageTimeToLive: "[coreutils.variable('defaultMessageTimeToLive')]"
        deadLetteringOnMessageExpiration: "[coreutils.variable('deadLetteringOnMessageExpiration')]"
        duplicateDetectionHistoryTimeWindow: "[coreutils.variable('duplicateDetectionHistoryTimeWindow')]"
        maxDeliveryCount: "[coreutils.variable('maxDeliveryCount')]"
        autoDeleteOnIdle: "[coreutils.variable('autoDeleteOnIdle')]"
        enablePartitioning: "[coreutils.variable('enablePartitioning')]"
        enableExpress: "[coreutils.variable('enableExpress')]"
```

| property / parameter|required|description|
|---------|--------|-----------|
| serviceBusNamespaceName | Yes | Name of the Service Bus namespace. |
| serviceBusQueueName | Yes | Name of the Queue. |
| resourceGroup | No | Name of the resource group. When set, it overrides the resource group of the Bake recipe deployment context. |
| lockDuration | No | ISO 8601 timespan duration of a peek-lock; that is, the amount of time that the message is locked for other receivers. The maximum value for LockDuration is 5 minutes; the default value is 1 minute. |
| maxSizeInMegabytes | No | The maximum size of the queue in megabytes, which is the size of memory allocated for the queue. Default is 1024. |
| requiresDuplicateDetection | No | A value indicating if this queue requires duplicate detection. |
| requiresSession| No | A value that indicates whether the queue supports the concept of sessions. |
| defaultMessageTimeToLive | No | ISO 8601 default message timespan to live value. This is the duration after which the message expires, starting from when the message is sent to Service Bus. This is the default value used when TimeToLive is not set on a message itself. |
| deadLetteringOnMessageExpiration | No | A value that indicates whether this queue has dead letter support when a message expires. |
| duplicateDetectionHistoryTimeWindow | No | ISO 8601 timeSpan structure that defines the duration of the duplicate detection history. The default value is 10 minutes. |
| maxDeliveryCount | No | The maximum delivery count. A message is automatically deadlettered after this number of deliveries. default value is 10. |
| autoDeleteOnIdle | No | ISO 8061 timeSpan idle interval after which the queue is automatically deleted. The minimum duration is 5 minutes. |
| enablePartitioning | No | A value that indicates whether the queue is to be partitioned across multiple message brokers. |
| enableExpress | No | A value that indicates whether Express Entities are enabled. An express queue holds a message in memory temporarily before writing it to persistent storage. |


For additional details, see 

[Service Bus Queue SDK Documentation](https://docs.microsoft.com/en-us/dotnet/api/microsoft.servicebus.messaging.queuedescription?view=azure-dotnet)

[Microsoft.ServiceBus Namespaces/Queues Template Reference](https://docs.microsoft.com/en-us/azure/templates/microsoft.servicebus/2017-04-01/namespaces/queues)

