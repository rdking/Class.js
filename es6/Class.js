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
 * 
 * Description:
 * Class.js (npm-alias: java-class) is my attempt to bring private & protected 
 * fields to the otherwise public-only "class" keyword.
 */

//-----------------------------------------------------------------------------

console.log("ES6 Class loading...");
console.log(`Class already exists? ${typeof(Class) === "function"}`);
/*
	Let's start by figuring out which version of JavaScript we're working with.
	If we don't have ES6 support, this approach is entirely useless!
 */
(function proveES6Support() { 
	try {
		eval("(...args) => {};"); //If this throws, then no ES6.
	} catch(e) {
		throw("Silly rabbit! You need the ES5 version!");
	};
})();

var ProtectedMembers = Symbol("protected");
var Instance = Symbol("instance");


/**
 * Enum - Provides the ability to use syntax-checked enumeration values.
 *
 * @typedef {Object} Enum
 */
var Enum = require("../Enum");

/**
 * Privilege - An enumeration of the possible privilege levels of Class members.
 * Defaults to "None"
 *
 * @typedef {Enum} Privilege
 * @prop {number} None - Specifies an unmarked privilege state.
 * @prop {number} Public - Marks the member as world visible.
 * @prop {number} Protected - Marks the member as descendant visible.
 * @prop {number} Private - Marks the member as exclusively for the defined Class.
 * @prop {number} Link - Marks scope members that refer to a member in another scope.
 */
var Privilege = new Enum("None", [ "None", "Public", "Protected", "Private", "Link" ]);

/**
 * ClassModes - An enumeration of the inheritability of defined Class types.
 *
 * @typedef {Enum} ClassModes
 * @prop {number} Default - Sets unrestricted inheritability for the new Class.
 * @prop {number} Abstract - Sets required inheritability for the new Class.
 * @prop {number} Final - Restricts all inheritability of the new Class.
 */
var ClassModes = new Enum("Default", ["Default", "Abstract", "Final"]);

var Box = (require("../lib/Box"))(Privilege, true);
var { modifyBox, extend, extendIf } = (require("../lib/utils"))(Box, Privilege, true);

function buildClass(parts) {
	var classDef = `(class ${parts.name} ${(parts.Extends)?"extends " + parts.Extends.name:""} {\n`;
	if (parts.Constructor) {
		var ctor;
		if ((parts.Constructor instanceof Box) &&
			(parts.Constructor.isPublic)
			(parts.Constructor.value instanceof Function)) {
			ctor = parts.Constructor.value;
		}
	}
	classDef += `})`;

	return eval(classDef);
}

/**
 * Converts an ES5-style Class.js definition into its corresponding ES6
 * components.
 * @param {String} [name] 
 * @param {Object} definition 
 */
function parseES5(name, definition) {
	var retval = {
		pvtScope: {},
		protList: [],
		classMode: ClassModes.Default
	};
	var classParts = { members: [] };

	if (name instanceof Object) {
		definition = name;
		name = "";
	}

	classParts.name = name;

	var keys = Object.keys(definition);
	for (var i=0; i<keys.length; ++i) {
		var key = keys[i];

		switch(key) {
			case "Mode":
				retval.classMode = definition;
				break;
			case "Implements":
				classParts.Implements = definition.Implements;
				break;	
			case "Mixins":
				classParts.Mixins = definition.Mixins;
				break;
			case "Extends":
				classParts.Extends = definition.Extends;
				break;
			case "Events":
				classParts.Events = definition.Events;
				break;
			case "Constructor":
				classParts.Constructor = definition.Constructor;
				break;
			case "StaticConstructor":
				classParts.StaticConstructor = definition.StaticConstructor;
				break;
			default: 
				classParts.members.push(definition[key]);
		}
	}

	retval.pubScope = buildClass(classParts);
	return retval;
}

/**
 * Generates an ES6 class with private and protected scopes.
 * @param {Object} pvtScope - Contains all private/protected members and their 
 * 	initial values.
 * @param {Array} [protList] - Names of the keys in pvtScope to be shared with
 *  descendant classes. Optional.
 * @param {ClassModes} [classMode] - Inheritability of the new Class.
 * @param {*} pubScope - An ES6 class or constructor function.
 * @returns {function} the constructor for the new Class
 */
function Class(pvtScope, protList, classMode, pubScope) {
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

	switch(arguments.length) {
		case 1:
		case 2:
			var { pvtScope, protList, classMode, pubScope } = parseES5.apply(null, arguments);
			break;
		case 3:
			pubScope = classMode;
			if (Array.isArray(protList)) {
				classMode = ClassModes.Default;
			}
			else {
				classMode = protList;
				protList = []
			}
			break;
		case 4:
			protList = protList || [];
			classMode = classMode || ClassModes.Default;
			break;
	}

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
				var protNames = instance[ProtectedMembers];
				if (Object.getPrototypeOf(privateNames) !== protNames) {
					Object.setPrototypeOf(privateNames, protNames);
					Object.setPrototypeOf(protectedNames, protNames);
				}
				delete instance[ProtectedMembers];
			}
	
			for (let i=0; i<keys.length; ++i) {
				let key = keys[i];
				if (key in pvtScope)
					instance[privateNames[key]] = pvtScope[key];
			}

			instance[ProtectedMembers] = protectedNames;
			return instance;
		}
		
		eval(`_class = ${defString.toString()};`);
		return createClassProxy(_class);
	}
};

/**
 * Private - An access modifier function. Causes val to be encapsulated as
 * only being accessible to direct instances of the class being described.
 *
 * @memberof Class
 * @function
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Private in either case.
 */
function Private(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { privilege: Privilege.Private });
	}
	else {
		retval = modifyBox(null, { privilege: Privilege.Private }, val);
	}

	return retval;
}

/**
 * Protected - An access modifier function. Causes val to be encapsulated as
 * only being accessible to instances of the class being described and its
 * subclasses.
 *
 * @memberof Class
 * @function
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Protected in either case.
 */
function Protected(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { privilege: Privilege.Protected });
	}
	else {
		retval = modifyBox(null, { privilege: Privilege.Protected }, val);
	}

	return retval;
}

/**
 * Public - An access modifier function. Causes val to be encapsulated as
 * being openly accessible from the class being described.
 *
 * @memberof Class
 * @function
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Public in either case.
 */
function Public(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { privilege: Privilege.Public });
	}
	else {
		retval = modifyBox(null, { privilege: Privilege.Public }, val);
	}

	return retval;
}

/**
 * Property - An access modifier function. Requires that val is an object
 * with a getter and/or setter method. These are the only 2 members that are
 * honored in the object.
 *
 * @memberof Class
 * @function
 * @param {Object} val - An object defining the access methods for the
 * property. Must contain at leaset one of the following properties.
 * @prop {function=} val.get - A function that calculates or retrieves the
 * desired value. Takes no parameters.
 * @prop {function=} val.set - A function that performs the needed actions
 * to ensure that val.get returns the desired value. Takes a single
 * parameter.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as a Property in either case.
 */
function Property(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { isProperty: true });
	}
	else {
		retval = modifyBox(null, { isProperty: true }, val);
	}

	return retval;
}

/**
 * Static - An access modifier function. Causes val to be encapsulated as
 * data owned by the constructor function and not the class's prototype.
 *
 * @memberof Class
 * @function
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Static in either case.
 */
function Static(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { isStatic: true });
	}
	else {
		retval = modifyBox(null, { isStatic: true }, val);
	}

	return retval;
}

/**
 * Final - An access modifier function. Causes val to be encapsulated as
 * immutable. If val is a function, it is automatically Final.
 *
 * @memberof Class
 * @function
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Final in either case.
 */
function Final(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { isFinal: true });
	}
	else {
		retval = modifyBox(null, { isFinal: true }, val);
	}

	return retval;
}

/**
 * Abstract - An access modifier function. Causes val to be encapsulated as
 * an undefined method. The parameter val must reference a function.
 *
 * @memberof Class
 * @function
 * @param {function} val - A Boxed or unboxed function.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Abstract in either case.
 */
function Abstract(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { isAbstract: true });
	}
	else {
		retval = modifyBox(null, { isAbstract: true }, val);
	}

	return retval;
}

/**
 * Delegate - An access modifier function. Causes val to be encapsulated as
 * bound method. Attempts to call this method, even after assignment to a
 * variable, will always use the owning Class instance or type definition
 * (if Static) as its scope. The parameter val must reference a function.
 *
 * @memberof Class
 * @function
 * @param {function} val - A Boxed or unboxed function.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as a Delegate method in either case.
 */
function Delegate(val) {
	var retval;

	if (val && val.isBox) {
		retval = modifyBox(val, { isDelegate: true });
	}
	else {
		retval = modifyBox(null, { isDelegate: true }, val);
	}

	return retval;
}

/**
 * Abstract - An access modifier function. Causes val to be tested to see if
 * it matches the given type at definition time and at runtime, both on
 * input and output.
 *
 * @memberof Class
 * @function
 * @param {string|Class} type - A type name string or Class type constructor.
 * @param {*} val - A Boxed or unboxed value.
 * @returns {Box} A new Box instance, or val if it is a Box instance, marked
 * as Type-specific in either case.
 */
function Type(type, val) {
	var retval = null;

	var isValid = function isValid(t, v) {
		return ((v === null) || (v === undefined) ||
				(t.isInterface && t.isImplementedBy(v)) ||
				(t.isClass && (v instanceof t)) ||
				((t === Function) && (v instanceof Function)) ||
				((t === Date) && (v instanceof Date)) ||
				((t === String) && (typeof v == "string")) ||
				((typeof t == "string") && (t.toLowerCase() == typeof v)));
	};

	if (type && (type.isClass || type.isInterface || (type === Function) ||
					(type === String) || (type === Date) ||
					((typeof type == "string") &&
					((type.toLowerCase() === "string") ||
					(type.toLowerCase() === "number") ||
					(type.toLowerCase() === "boolean") ||
					(type.toLowerCase() === "symbol"))))) {
		if (val instanceof Box) {
			if (val.isProperty || isSimpleFunction(val.value) || isValid(type, val.value)) {
				retval = modifyBox(val, { type: type });
			}
			else
				throw new TypeError("Expected value of type '" + type.__name + "'. Found " + val.value);
		}
		else if (isValid(type, val)) {
			retval = modifyBox(null, { type: type }, val);
		}
		else
			throw new TypeError("Expected value of type '" + type.__name + "'. Found " + val);
	}
	else
		throw new TypeError("Type must reference either a Class, an Interface, or an intrinsic type!");

	return retval;
}

Object.defineProperties(Class, {
	InitializeScope: {
		value: function Initialize(_global) {
			Object.defineProperties(_global, {
				Private: {
					enumerable: true,
					value: Private
				},
				Protected: {
					enumerable: true,
					value: Protected
				},
				Public: {
					enumerable: true,
					value: Public
				},
				Property: {
					enumerable: true,
					value: Property
				},
				Static: {
					enumerable: true,
					value: Static
				},
				Final: {
					enumerable: true,
					value: Final
				},
				Abstract: {
					enumerable: true,
					value: Abstract
				},
				Delegate: {
					enumerable: true,
					value: Delegate
				},
				Type: {
					enumerable: true,
					value: Type
				},
				Modes: {
					enumerable: true,
					value: ClassModes
				}
			});
	
			if (!Object.hasOwnProperty("setPrototypeOf")) {
				Object.defineProperty(Object, "setPrototypeOf", {
					enumerable: true,
					writable: true,
					value: function setPrototypeOf(obj, proto) {
						obj.__proto__ = proto;
						return obj;
					}
				})
			}
	
			if (!Object.hasOwnProperty("getPrototypeOf")) {
				Object.defineProperty(Object, "getPrototypeOf", {
					enumerable: true,
					writable: true,
					value: function getPrototypeOf(obj) {
						return obj.__proto__;
					}
				})
			}
		}
	}
});

Class.InitializeScope(Class);

function createClassProxy(_class) {
	var handler = {
		apply(target) {
			throw TypeError(`Class constructor ${target.name} cannot be invoked without 'new'`);
		},
		construct(target, args, newTarget) {
			var retval = Reflect.construct(target, args, newTarget);

			if (target.prototype === newTarget.prototype)
				delete retval[ProtectedMembers];	//Clean up our mess before returning.

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

if (typeof(module) === "object") {
	//Use require semantics
	module.exports = Class;
}
else {
	//Prevents older engines from throwing.
	try {
		eval("export default Class;");
	} catch(e) {
		console.warn("No known means of exporting 'Class' namespace!");
	}
}
