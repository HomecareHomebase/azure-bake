## Follow these basic steps to setup a new ingredient project:

1. Copy the ingredient-template folder into a new location

    a. If creating an HCHB offical ingredient, that should be copied into the ingredient root folder, and renamed approriately.

2. Modify the package.json file and fill out at least the name, which should be a unique npm package.
 
    a. If an offical HCHB ingredient, should be under the @azbake/ moniker

3. Run npm install, and then for each peerDependecy run: npm i "package" --no-save. The --no-save is important as you don't want the peerDependecy to get added as a normal dependency.

    a. The following peerDeps are used:

```js
    npm i "@azbake/core@0.1.*" --no-save
    npm i "@azure/ms-rest-nodeauth@0.8.*" --no-save
```

4. Modify src/index.ts and set the NS properties for the types you are developing.

    a. Functions should set a functiosNS property to the namespace you want to use, as well as set functions to your functions objet.

    b. A Plugin should set pluginNS to your unique plugin namespace, along with the plugin object.

    c. You can define one, or both.

5. Define either your plugin or function code and then run: npm run compile, to make sure everything compiles.

6. When you are ready to publish to an NPM repository, you can run: npm run upload. This will compile, package, version, and publish. You must be logged into the npm repo before executing this for the publish to work.

    a. If developing for our mono-repo offical ingredients. You can not self publish. Instead submit a Pull Request with just your ingredient changes. If accepted it will get auto versioned and published.

## Understanding BakeVariables

Bake.yaml recipe files support a concept of expressions. These are specially formatted string values which describe sandboxed javascript to execute and resolve a value. BakeVariables are used for all variable, and parameter based fields in the recipe; as well as other properties when noted.

Within a plugin, or a function object, you must resolve a property directly if it's a `BakeVariable`, otherwise you will not access the correct value. Resolving a BakeVariable requires the current deployment execution context so that the right resolution can happen:

```js
//ingredient property source is a BakeVairbale. We call BakeVariable.value(ctx) to return
//the correct resolved value so we can use it.
let source: string = this._ingredient.properties.source.value(this._ctx)
```

## Developing a plugin ingredient

A plugin ingredient must extend `BaseIngredient` from "@azbake/core". It must also implement: 

```javascript
public async Execute(): Promise<void>{}
```

Within your execute method you have access to the current deployment context, which implements `DeploymentContext` from "@azbake/core"

```js
this._ctx
```
This will give you access to things like the logger (which is context aware of current region/ingredient/etc.), the bake package config, environment variables (minus login credentials), The current region for the execution (if needed around primary/secondary ingredient logic), The current azure `AuthToken` that can be passed to Azure APIs, as well as the current `Ingredient` object which contains the parameters:

```js
this._ingredient.properties.parameters
this._ingredient.properties.source
```

*note: source and parameter values are BakeVariables and must be resolved with the current context* 

Your plugin will execute with an isolated context for each region that should be deployed ast the environment level, and once for every entry in the bake.yaml file for the recipe.

You can also access function objects of any referenced ingredients from the recipe. `CoreUtils` is always avalible to a recipe, even if not directly included.

```js
let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

```

