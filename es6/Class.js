/*
 * Filename: Class.js
 * Created By: Ranando D. King
 * License: Apache 2.0
 *
 * Copyright 2014 Ranando D. King
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * 		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
 * Class.js (npm-alias: java-class) is my attempt to bring private & protected 
 * fields to the otherwise public-only "class" keyword.
 */
var Protected = Symbol("protected");
var Instance = Symbol("instance");

/**
 * Generates an ES6 class with private and protected scopes.
 * @param {Object} pvtScope - Contains all private/protected members and their 
 * 	initial values.
 * @param {Array} [protList] - Names of the keys in pvtScope to be shared with
 *  descendant classes. Optional.
 * @param {*} pubScope - An ES6 class or constructor function.
 * @returns {function} the constructor for the new Class
 */
function Class(pvtScope, protList, pubScope) {
	var keys = Object.keys(pvtScope);
	var privateNames = {};
	var protectedNames = {};
	var Constructor = Symbol("constructor");

	/* Create a Symbol for every private name declared */
	for (let i=0; i<keys.length; ++i) {
		let key = keys[i];
		privateNames[key] = Symbol(key);
	}

	if (!protList && !pubScope) {
		throw TypeError("A class definition must be the 2nd or 3rd parameter.");
	}

	if (!pubScope) {
		pubScope = protList;
		protList = [];
	}
	
	protList = protList || [];

	/* Map the protected keys into another object. */
	for (let i=0; i<protList.length; ++i) {
		let key = protList[i];
		if (key in privateNames) {
			Object.defineProperty(protectedNames, key, {
				enumerable: true,
				get: function getName() { return privateNames[key]; }
			});
		}
	}
	
	/**
	 * Inject a callout into the constructor so we can setup monitoring and
	 * the private scope. Make sure to return the proxy instead of "this",
	 */
	var isExtension = /^class\s+\w+\s+extends\s+\w+/.test(pubScope.toString());
	var defString = pubScope.toString().replace(/(\s*)constructor(\s*\(((?:\s*,?\s*\w+)*)\)\s*{(\s*))(super\(.*?\);?\s*)?/,
		"$1constructor$2$5var retval = initPrivateScope(this);$4retval[Constructor]($3);$4return retval;$1}$1\[Constructor\]$2");
	if (defString == pubScope.toString()) { //Didn't have a constructor to modify
		defString = pubScope.toString().replace(/^(function\s+\w+\(((?:\s*,?\s*\w+)*)\)\s*{(\s*))/, "$1initPrivateScope(this);$3");
	}
	if (defString == pubScope.toString()) { //Wasn't a function declaration
		var replacement = `$1constructor() {$2\t${(isExtension)?"super();$2\t":""}return initPrivateScope(this);$2}$2$3`;
		defString = pubScope.toString().replace(/^(class\s.+?{(\s*))(\w+)/, replacement);
	}
	if (defString == pubScope.toString()) {
		throw TypeError('This class definition makes no sense! Give me a "class" or a "function" definition.');
	}

	with(privateNames) {
		//Ensures the private scope is fully initialized before construction
		function initPrivateScope(instance) {
			instance = createInstanceProxy(instance, privateNames);

			if (Protected in instance) {
				var protNames = instance[Protected];
				if (Object.getPrototypeOf(privateNames) !== protNames) {
					Object.setPrototypeOf(privateNames, protNames);
					Object.setPrototypeOf(protectedNames, protNames);
				}
				delete instance[Protected];
			}
	
			for (let i=0; i<keys.length; ++i) {
				let key = keys[i];
				if (key in pvtScope)
					instance[privateNames[key]] = pvtScope[key];
			}

			instance[Protected] = protectedNames;
			return instance;
		}
		
		eval(`_class = ${defString.toString()};`);
		return createClassProxy(_class);
	}
};

function createClassProxy(_class) {
	var handler = {
		apply(target) {
			throw TypeError(`Class constructor ${target.name} cannot be invoked without 'new'`);
		},
		construct(target, args, newTarget) {
			var retval = Reflect.construct(target, args, newTarget);

			if (target.prototype === newTarget.prototype)
				delete retval[Protected];	//Clean up our mess before returning.

			return retval;
		}
	}
	
	return new Proxy(_class, handler);
}

function createInstanceProxy(instance, privateNames) {
	var handler = {
		slots: {
			type: Object.getPrototypeOf(instance).constructor.name,
			privateScope: {},
			privateNames
		},
		get(target, key, receiver) {
			var retval;
			if (Object.values(this.slots.privateNames).indexOf(key) >= 0) {
				retval = this.slots.privateScope[key];
			}
			else {
				retval = Reflect.get(target, key, receiver);
			}
			return retval;
		},
		isExtensible(target, key) {
			return true;
		},
		preventExtensions(target) {
			Reflect.preventExtensions(instance);
			return false;
		},
		set(target, key, value, receiver) {
			var retval;
			if (Object.values(this.slots.privateNames).indexOf(key) >= 0) {
				this.slots.privateScope[key] = value;
			}
			else {
				retval = Reflect.set(target, key, value, receiver);
			}
			return retval;
		}
	}
	
	return new Proxy(instance, handler);
}

if (typeof(module) == "object") {
	module.exports = Class;
}
else {
	try {
		export default Class;
	}
	catch(e) {}
}
