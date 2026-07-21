

# Changelogs
* [@azbake/ingredient-property-service](./CHANGELOG.md)

# Overview

The Property Service ingredient is a plugin for bake.  When included in a recipe, this plugin will allow the pipeline to manage properties and secrets in the Property Service. You can add, update, and delete properties and secrets by specifying the `name` and `selectors` for each property or secret.

Encryption keys and certificates are not supported at this time.

# Usage

## Property Service Configuration

### Ingredient Source

The ingredient's `source` field specifies the `baseUrl` and `resourceUrl` fields. Both of these fields are required.

* The `baseUrl` is a fully qualified url for the Property Service.
* The `resourceUrl` is a fully qualified url to the Azure Application Registeration.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        # URL to the property service.
        baseUrl: https://propertyservice.com
        # URL to the application registration for the property service.
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
~~~

### Parameters

The ingredient's parameters field allow you to define an array of `properties` and and array of `secrets`. Within these arrays you define the `create`, `update`, `delete` operations to be executed against the Property Service.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      # Define property and secret operations.
      parameters:
        # Property create, update, and delete operations.
        properties:
          create:
          update:
          delete:
        # Secret create, update, and delete operations.
        secrets:
          create:
          update:
          delete:
~~~

### Variables

All of the configuration values within the `create`, `update`, and `delete` operations support BakeVariables. You can define the BakeVariables within the `variables` section of the ingredient and reference the variables inside your `create`, `update`, and `delete` operations. Before the operation is executed, the BakeVariables are resolved to their respective value.

Defining `variables` is optional. If you choose to use `variables`, they must have a unique key. You can place just about anything within a BakeVariables value.

In the following example a `create` operation is defined with the `name`, `value`, `selectors`, `contentType`, and `expirationDate` being resolved to the bake `variables` defined. The `activeDate` is not using a bake variable.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
 # Define your variables to be used in your create, update, and delete operations below.
variables:
  property-name: property-name
  property-value: property-value
  property-selectors:
    key1: value1
    key2: value2
  property-contentType: text/plain
  property-expirationDate: 2020-12-20 11:00:00
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          create:
            # Access your variables by using the coreutils.variables function and specifying the variable name.
            - name: "[coreutils.variable('property-name')]"
              value: "[coreutils.variable('property-value')]"
              selectors: "[coreutils.variable('property-selectors')]"
              contentType: "[coreutils.variable('property-contentType')]"
              expirationDate: "[coreutils.variable('property-expirationDate')]"
              # You can use literal values and variables together.
              activeDate: 2020-06-20 11:00:00
~~~

The above `create` operation will resolve the `variables` to the following values:

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
 # Define your variables to be used in your create, update, and delete operations below.
variables:
  property-name: property-name
  property-value: property-value
  property-selectors:
    key1: value1
    key2: value2
  property-contentType: text/plain
  property-expirationDate: 2020-12-20 11:00:00
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          create:
             # The above create operation will resolve to the following values:
            - name: property-name
              value: property-value
              selectors:
                key1: value1
                key2: value2
              contentType: text/plain
              expirationDate: 2020-12-20 11:00:00
              activeDate: 2020-06-20 11:00:00
~~~

## Property Operations

Properties contain values that are non-sensitive. Whenever you define a property, you must give the property a `name` and a `value`.

While the `selectors` are optional, You will likely want to define selectors for your property so that you can easily query and manage it.

You would not define `selectors` when you have a value that does not change from entity to entity. Another use case for not defining `selectors` is to use that property as the default property, were you create a default property and if an entity needs to override the default you create a property specific to said entity.

Within the `properties` parameter you define what operations to execute. The `properties` parameter supports executing `create`, `update`, or `delete` operations.

### Property Create Operation

The `create` operation allows you to create a property. If the property already exists, it will be updated. If the property matches a property already stored in the Property Service, the operation will not be executed.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `name`           | String            | X        | The name of the property. |
| `value`          | String            | X        | The value of the property. |
| `selectors`      | String Dictionary |          | The selectors of the property. |
| `contentType`    | String            |          | The content-type of the  property value. |
| `expirationDate` | Date              |          | The expiration date of the property in UTC. |
| `activeDate`     | Date              |          | The active date of the property in UTC. |

 _NOTE:_ The `name` and `selectors` combination must be unique.

#### Property Create Validation

The `create` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `name`           | The value is not null, empty, or white-space. |
| `value`          | The value is not null, empty, or white-space. |
| `expirationDate` | The value is not a date in the past. |
| `activeDate`     | The value is greater than the `expirationDate`, if one is defined. |

#### Property Create Example

In the following example a `create` operation is defined.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          create:
            # The name is required.
            - name: property-name
              # The value is required.
              value: property-value
              selectors:
                key1: value1
                key2: value2
              contentType: text/plain
              expirationDate: 2020-12-20 11:00:00
              activeDate: 2020-06-20 11:00:00
~~~

### Property Update Operations

The `update` operation allows you to update an existing property. If the property matches a property already stored in the Property Service, the operation will not be executed. If the property does not exist on the server an exception will be raised.

The `target` object allows you to specify the `name` and `selectors` of the property you want to update.

| Property       | Data Type         | Required | Description |
|----------------|:------------------|:--------:|:------------------------------------------------------|
| `name`         | String            | X        | The name of the `property`. |
| `selectors`    | String Dictionary |          | The selectors of the `property`. |

Once you have your `target` defined, you need to specify one or more of the values to be updated.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `target`         | Target Object     | X        | The target property to be updated. |
| `name`           | String            |          | The name of the property. |
| `value`          | String            |          | The value of the property. |
| `selectors`      | String Dictionary |          | The selectors of the property. |
| `contentType`    | String            |          | The content-type of the  property value. |
| `expirationDate` | Date              |          | The expiration date of the property in UTC. |
| `activeDate`     | Date              |          | The active date of the property in UTC. |

_NOTE:_ You must specify the `target` and one or more of the properties to update.

#### Property Update Validation

The `update` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `activeDate`     | The value is greater than the `expirationDate`, if one is defined. |
| `target`         | The target's `name` is not null, empty, or white-space. |
| `target`         | One or more property values have been defined. |

#### Property Update Example

In the following example an `update` operation is defined. The system will search for a property with the `name` of _property-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_.

It will update the following values:

* `value` to  _property-updated-value_
* `selectors` to  _key3:value3_ and _key4:value4_
* `contentType` to  _text/json_
* `expirationDate` to  _2030-12-20 11:00:00_

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          update:
            - target:
                # The target name is required.
                name: property-name
                selectors:
                  key1: value1
                  key2: value2
              # You must define one or more of the property values to update.
              value: property-updated-value
              selectors:
                key3: value3
                key4: value4
              contentType: text/json
              expirationDate: 2030-12-20 11:00:00
~~~

In the following example an `update` operation is defined. The system will search for a property with the `name` of _property-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_.

It will update the following values:

* `name` to  _property-updated-name_
* `value` to  _property-updated-value_

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          update:
            - target:
                # The target name is required.
                name: property-name
                selectors:
                  key1: value1
                  key2: value2
              # You must define one or more of the property values to update.
              name: property-updated-name
              value: property-updated-value
~~~

### Property Delete Operations

The `delete` operation allows you to delete properties. If the property does not exist on the server an exception will be raised.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `name`           | String            | X        | The name of the property. |
| `operator`       | SearchOperator    | X        | The type of search to execute. |
| `selectors`      | String Dictionary |          | The selectors of the property. |

The `operator` can be one of the following values:

* `None`: Searches for properties by name only.
* `Equals`: Searches for properties that equal the specified selectors.
* `Contains`: Searches for properties that contain the specified selectors.

NOTE: If the `operator` is `None` then you cannot define any `selectors` and if the `operator` is `Equals` or `Contains` then you must define one or more selectors.

#### Property Delete Validation

The `delete` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `name`           | The value is not null, empty, or white-space. |
| `operator`       | The value is None, Equals, or Contains. |
| `selectors`      | The value is undefined if the `operator` is `None`. |
| `selectors`      | The value contains one or more key value pairs if the `operator` is `Equals` or `Contains`. |

#### Property Delete Example

In the following example a `delete` operation is defined. The system will search for a property with the `name` of _property-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_ and delete the `property`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          delete:
            # The name is required.
            - name: property-name
              # The operator is required.
              operator: Equals
              selectors:
                key1: value1
                key2: value2
~~~

In the following example a `delete` operation is defined. The system will search for a property with the `name` of _property-name_ that has the `selectors` containing to _key1:value1_ and delete the `properties`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          delete:
            # The name is required.
            - name: property-name
              # The operator is required.
              operator: Conatins
              selectors:
                key1: value1
~~~

In the following example a `delete` operation is defined. The system will search for a properties with the `name` of _property-name_ and delete the `properties`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        properties:
          delete:
            # The name is required.
            - name: property-name
              # The operator is required.
              operator: None
~~~

## Secret Operations

Secrets contain values that are sensitive such as a password or api key. Whenever you define a secret, you must give the secret a `name` and a `value`.

While the `selectors` are optional, You will likely want to define selectors for your secret so that you can easily query and manage it.

You would not define `selectors` when you have a value that does not change from entity to entity. Another use case for not defining `selectors` is to use that secret as the default secret, were you create a default secret and if an entity needs to override the default you create a secret specific to said entity.

Within the `secrets` parameter you define what operations to execute. The `secrets` parameter supports executing `seed`, `create`, `update`, or `delete` operations.

### Secret Create Operation

The `create` operation allows you to create a secret. If the secret already exists, it will be updated. If the secret matches a secret already stored in the Property Service, the operation will not be executed.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `name`           | String            | X        | The name of the secret. |
| `value`          | String            | X        | The value of the secret. |
| `selectors`      | String Dictionary |          | The selectors of the secret. |
| `contentType`    | String            |          | The content-type of the  secret value. |
| `expirationDate` | Date              |          | The expiration date of the secret in UTC. |
| `activeDate`     | Date              |          | The active date of the secret in UTC. |

 _NOTE:_ The `name` and `selectors` combination must be unique.

 _NOTE:_ To write a value **once** without overwriting it on later deployments - including
 seeding a Storage/Cosmos connection string via `connectionStringFrom` - use the
 [Secret Seed Operation](#secret-seed-operation) instead of `create`.

#### Secret Create Validation

The `create` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `name`           | The value is not null, empty, or white-space. |
| `value`          | The value is not null, empty, or white-space. |
| `expirationDate` | The value is not a date in the past. |
| `activeDate`     | The value is greater than the `expirationDate`, if one is defined. |

#### Secret Create Example

In the following example a `create` operation is defined.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          create:
            # The name is required.
            - name: secret-name
              # The value is required.
              value: secret-value
              selectors:
                key1: value1
                key2: value2
              contentType: text/plain
              expirationDate: 2020-12-20 11:00:00
              activeDate: 2020-06-20 11:00:00
~~~

### Secret Seed Operation

The `seed` operation writes a secret **once**. Once the secret exists, every later deployment is
a **no-op** - the value is never overwritten. Use it for any secret whose value is owned by an
out-of-band writer after the first deployment, such as a rotation process (e.g. CyberArk) or a
direct `Conjur -> Property Service` sync.

`seed` accepts the same fields as `create` (`name`, `value`, `selectors`, `contentType`,
`expirationDate`, `activeDate`), so a literal value can be seeded in the standard way. It also
supports `connectionStringFrom` and `keyFrom` (secret only) for sourcing a Storage or Cosmos
connection string or primary key. Both are valid only under `seed`, not `create`, and are
mutually exclusive on a single entry.

#### Seeding a Storage or Cosmos Connection String

Instead of a literal `value`, a `seed` entry can source a Storage account or Cosmos account
connection string into the Property Service without you having to look up the key or hard-code
the value. Supply a `connectionStringFrom` source:

| Property        | Data Type | Required | Description |
|-----------------|:----------|:--------:|:------------------------------------------------------|
| `type`          | String    | X        | `storage` or `cosmos`. |
| `account`       | String    | X        | The account resource name (e.g. the value of `storage.create_resource_name()`). |
| `resourceGroup` | String    |          | Optional resource group override for the account. |

Behavior:

* The secret **name** is derived from the account name and is **environment independent** (the
  `dev`/`prd` prefix is stripped), so every consumer of the same account - and any rotation
  automation - agree on a single name such as `stexpl-connectionstring`. Any **region code in the
  account name is retained**, so per-region accounts (e.g. active/active or active/passive) map to
  **distinct** secrets (`euscosmsexpl-connectionstring`, `wuscosmsexpl-connectionstring`) rather
  than colliding on one. You may still supply an explicit `name` to override the derived name -
  for example to converge a single globally-distributed account onto one region-independent name.
* Because it is a `seed`, once the secret exists the operation is a **no-op** - the key is never
  re-read and an existing value (for example one managed by a rotation process) is never
  overwritten. The first deployment seeds it; later deployments, including those of other
  services that share the account, do nothing.
* The connection string is pulled **lazily**, only when the secret needs to be seeded. If the
  source account cannot be read yet (for example a consumer deploying ahead of the resource
  owner), the operation is skipped rather than failing the deployment.

The example below gates the seed with `condition: "[coreutils.current_region_primary()]"`, so it
runs once from the primary region for a single account. For **active/active or active/passive**
topologies with a separate account per region, **omit that condition** so the seed runs in each
region - each region seeds its own account under its own region-qualified name, keeping both
connection strings available.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-storage@~0"
  - "@azbake/ingredient-property-service@~0"
resourceGroup: true
parallelRegions: false
variables:
  storageAccountName: "[storage.create_resource_name()]"
recipe:
  expl-storage:
    properties:
      type: "@azbake/ingredient-storage"
      source: ""
      parameters:
        storageAccountName: "[coreutils.variable('storageAccountName')]"
  expl-seed-connstring:
    properties:
      type: "@azbake/ingredient-property-service"
      condition: "[coreutils.current_region_primary()]"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          seed:
            - connectionStringFrom:
                type: storage
                account: "[coreutils.variable('storageAccountName')]"
              # name auto-derives to stexpl-connectionstring
    dependsOn:
      - expl-storage
~~~

#### Seeding a Storage or Cosmos Primary Key

When a consumer needs the raw account **primary key** rather than a full connection string, use
`keyFrom` instead of `connectionStringFrom`. It behaves identically - the name is derived, the
value is pulled lazily, and the seed is a non-clobbering no-op once the secret exists - but the
seeded value is the account's primary key (`storage.get_primary_key` / `cosmosdbutils.get_primary_key`).

| Property        | Data Type | Required | Description |
|-----------------|:----------|:--------:|:------------------------------------------------------|
| `type`          | String    | X        | `storage` or `cosmos`. |
| `account`       | String    | X        | The account resource name (e.g. the value of `storage.create_resource_name()`). |
| `resourceGroup` | String    |          | Optional resource group override for the account. |

The derived secret **name** is the environment-independent account name with a `-key` suffix
(e.g. `stexpl-key`), following the same env-strip / region-retain rules as `connectionStringFrom`.
`connectionStringFrom` and `keyFrom` are mutually exclusive on a single `seed` entry.

~~~yaml
        secrets:
          seed:
            - keyFrom:
                type: storage
                account: "[coreutils.variable('storageAccountName')]"
              # name auto-derives to stexpl-key
~~~

#### Seeding a Conjur-backed Pipeline Secret

Secrets whose value comes from the pipeline (an ADO secret variable) can be seeded the same way.
Use `create` when the pipeline is the **sole** source of truth - it heals the Property Service
back to the declared value on every deployment.

If the same secret is also written to the Property Service out-of-band - for example a direct
`Conjur -> Property Service` sync that can update faster than the `Conjur -> ADO` variable sync -
then an upsert risks overwriting the fresher value with a lagging pipeline value. Put it under
`seed` so bake writes the secret once and leaves ongoing updates to that writer:

~~~yaml
        secrets:
          seed:
            - name: my-conjur-secret
              value: "[coreutils.variable('MY_ADO_SECRET_VAR')]"
~~~

Use `create` for pipeline-only config that has no other writer; use `seed` for any secret an
external process keeps current in the Property Service.

### Secret Update Operations

The `update` operation allows you to update an existing secret. If the secret matches a secret already stored in the Property Service, the operation will not be executed. If the secret does not exist on the server an exception will be raised.

The `target` object allows you to specify the `name` and `selectors` of the secret you want to update.

| Property       | Data Type         | Required | Description |
|----------------|:------------------|:--------:|:------------------------------------------------------|
| `name`         | String            | X        | The name of the `secret`. |
| `selectors`    | String Dictionary |          | The selectors of the `secret`. |

Once you have your `target` defined, you need to specify one or more of the values to be updated.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `target`         | Target Object     | X        | The target secret to be updated. |
| `name`           | String            |          | The name of the secret. |
| `value`          | String            |          | The value of the secret. |
| `selectors`      | String Dictionary |          | The selectors of the secret. |
| `contentType`    | String            |          | The content-type of the  secret value. |
| `expirationDate` | Date              |          | The expiration date of the secret in UTC. |
| `activeDate`     | Date              |          | The active date of the secret in UTC. |

_NOTE:_ You must specify the `target` and one or more of the secrets to update.

#### Secret Update Validation

The `update` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `activeDate`     | The value is greater than the `expirationDate`, if one is defined. |
| `target`         | The target's `name` is not null, empty, or white-space. |
| `target`         | One or more secret values have been defined. |

#### Secret Update Example

In the following example an `update` operation is defined. The system will search for a secret with the `name` of _secret-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_.

It will update the following values:

* `value` to  secret-updated-value_
* `selectors` to  _key3:value3_ and _key4:value4_
* `contentType` to  _text/json_
* `expirationDate` to  _2030-12-20 11:00:00_

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          update:
            - target:
                # The target name is required.
                name: secret-name
                selectors:
                  key1: value1
                  key2: value2
              # You must define one or more of the secrets values to update.
              value: secret-updated-value
              selectors:
                key3: value3
                key4: value4
              contentType: text/json
              expirationDate: 2030-12-20 11:00:00
~~~

In the following example an `update` operation is defined. The system will search for a secret with the `name` of _secret-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_.

It will update the following values:

* `name` to  _secret-updated-name_
* `value` to  _secret-updated-value_

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          update:
            - target:
                # The target name is required.
                name: secret-name
                selectors:
                  key1: value1
                  key2: value2
              # You must define one or more of the secrets values to update.
              name: secret-updated-name
              value: secret-updated-value
~~~

### Secret Delete Operations

The `delete` operation allows you to delete secrets. If the secret does not exist on the server an exception will be raised.

| Property         | Data Type         | Required | Description |
|------------------|:------------------|:--------:|:------------------------------------------------------|
| `name`           | String            | X        | The name of the secret. |
| `operator`       | SearchOperator    | X        | The type of search to execute. |
| `selectors`      | String Dictionary |          | The selectors of the secret. |
| `allVersions`    | Boolean 		   |          | `true` to delete all version of the `secret`, otherwise it will only delete the current version. |

The `operator` can be one of the following values:

* `None`: Searches for secrets by name only.
* `Equals`: Searches for secrets that equal the specified selectors.
* `Contains`: Searches for secrets that contain the specified selectors.

NOTE: If the `operator` is `None` then you cannot define any `selectors` and if the `operator` is `Equals` or `Contains` then you must define one or more selectors.

#### Secret Delete Validation

The `delete` operation validates the following before the operation is executed.

| Property         | Validation                                    |
|------------------|:----------------------------------------------|
| `name`           | The value is not null, empty, or white-space. |
| `operator`       | The value is None, Equals, or Contains. |
| `selectors`      | The value is undefined if the `operator` is `None`. |
| `selectors`      | The value contains one or more key value pairs if the `operator` is `Equals` or `Contains`. |

#### Secret Delete Example

In the following example a `delete` operation is defined. The system will search for a secret with the `name` of _secret-name_ that has the `selectors` equal to _key1:value1_ and _key2:value2_ and delete all versions of the `secret`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          delete:
            # The name is required.
            - name: secret-name
              # The operator is required.
              operator: Equals
              selectors:
                key1: value1
                key2: value2
              allVersions: true
~~~

In the following example a `delete` operation is defined. The system will search for a secret with the `name` of _secret-name_ that has the `selectors` containing to _key1:value1_ and delete only the latest version of the `secret`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          delete:
            # The name is required.
            - name: secret-name
              # The operator is required.
              operator: Conatins
              selectors:
                key1: value1
              allVersions: false
~~~

In the following example a `delete` operation is defined. The system will search for a secrets with the `name` of _secret-name_ and delete all versions of the `secret`.

~~~yaml
name: Package Example
shortName: expl
version: 1.0.0
ingredients:
  - "@azbake/ingredient-property-service@~0"
resourceGroup: false
parallelRegions: false
variables:
recipe:
  property-service:
    properties:
      type: "@azbake/ingredient-property-service"
      source:
        baseUrl: https://propertyservice.com
        resourceUrl: https://azure.onmicrosoft.com/00000000-0000-0000-0000-000000000000
      parameters:
        secrets:
          delete:
            # The name is required.
            - name: secret-name
              # The operator is required.
              operator: None
              allVersions: true
~~~