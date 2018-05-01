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

/**
 * Creates an equivalent constructor function for an ES6 class given a
 * constructor function.
 * @param {string} ctor - String contents of the constructor function of an
 * ES6-style class. 
 * @returns {string} - an ES6-style equivalent of the same function.
 */
function convertConstructor(ctor) {
	var retval = ctor.replace(/^(?:function\s+)?(?:\w+)?\((.*)\)\s*(?:=>)?\s*{/, "constructor($1) {");

	if (retval == ctor) {
		throw TypeError("The constructor needs to at least be a function!");
	}

	retval = retval.replace(/(\W)this.Super(\W)/, "$1super$2");
	return retval
}

/**
 * Creates an equivalent function definition for an ES6 class givn a function
 * definition.
 * @param {string} fn - String contents of a function.
 * @param {string} name - Name of the re-declared function.
 */
function convertFunction(fn, name) {
	var retval = fn.replace(/^(?:function\s+)?(?:(\w+)\s*)?\((.*)\)\s*(?:=>)?\s*{/, `${name}($2) {`);
	
	if (retval == fn) {
		throw TypeError("The parameter needs to at least be a function!");
	}

	retval = retval.replace(/(\W)this.Super(\W)/, "$1super$2");
	return retval
}

/**
 * Converts an ES5-style class definition into the ES6-style parameters needed
 * by this version of Class.js.
 * @param {Object} parts - contains the compartmentalized definition of the
 * ES6-style class to be constructed.
 */
function buildClass(parts) {
	var classDef = `(class ${parts.name} ${(parts.Extends)?"extends " + parts.Extends.name:""} {\n`;
	if (parts.Constructor) {
		var ctor;
		if ((parts.Constructor instanceof Box) &&
		parts.Constructor.isPublic &&
		(parts.Constructor.value instanceof Function)) {
			ctor = convertConstructor(parts.Constructor.value.toString());
			classDef += `\t${ctor}\n`;
		}
	}

	var memberKeys = Object.keys(parts.members);
	
	for (var i=0; i<memberKeys.length; ++i) {
		var key = memberKeys[i];
		var member = parts.members[key];
		if (member instanceof Box) {
			if (member.isProperty) {
				if (member.value.get) {
					classDef += `\t${(member.isStatic)?"static ": ""}get ${convertFunction(member.value.get.toString(), key)}\n`;
				}
				if (member.value.set) {
					classDef += `\t${(member.isStatic)?"static ": ""}set ${convertFunction(member.value.set.toString(), key)}\n`;
				}
			}
			else if (member.value instanceof Function) {
				classDef += `\t${(member.isStatic)?"static ": ""}${convertFunction(member.value.toString(), key)}\n`;
			}
		}
		else {
			throw TypeError("I think you forgot to apply a privilege level to one of the members");
		}
	}
	
	classDef += `});`;

	return classDef;
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
		staticScope: {},
		protList: [],
		classMode: ClassModes.Default
	};
	var classParts = { members: {} };

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
				retval.classMode = definition.Mode;
				break;
			case "Implements":
				classParts.Implements = definition.Implements;
				break;	
			case "Mixins":
				classParts.Mixins = definition.Mixins;
				break;
			case "Extends":
				classParts.Extends = definition.Extends;
				retval.baseClass = definition.Extends;
				break;
			case "Events":
				classParts.Events = definition.Events;
				break;
			case "Constructor":
				classParts.Constructor = definition.Constructor;
				break;
			case "StaticConstructor":
				var member = definition.StaticConstructor;
				retval.StaticConstructor = (member instanceof Box) ? member.value : member;
				break;
			default: 
				if (definition[key] instanceof Box) {
					var member = definition[key];
					if (member.isPublic) {
						if (member.isStatic) {
							retval.staticScope[key] = member;
						}
						classParts.members[key] = member;
					}
					else {
						retval.pvtScope[key] = member;
						if (member.isProtected) {
							retval.protList.push(key);
						}
					}
				}
				else {
					classParts.members.push(new Box({
						value: definition[key],
						privilege: Privilege.Public
					}));
				}
		}
	}

	retval.pubScopeDef = buildClass(classParts);
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
	var privateNames = {};
	var privateStaticNames = {};
	var protectedNames = {};
	var Constructor = Symbol("constructor");
	var pubScopeDef;
	var baseClass;
	var StaticConstructor;
	var staticScope = {};

	switch(arguments.length) {
		case 1:
		case 2:
			var { pvtScope, staticScope, protList, classMode,
				pubScopeDef, baseClass, StaticConstructor } = parseES5.apply(null, arguments);
			break;
		case 3:
			pubScope = classMode;
			pubScopeDef = pubScope.toString();
				
			if (Array.isArray(protList)) {
				classMode = ClassModes.Default;
			}
			else {
				classMode = protList;
				protList = []
			}
			break;
		case 4:
			pubScopeDef = pubScope.toString();
			protList = protList || [];
			classMode = classMode || ClassModes.Default;
			break;
		default: 
			throw new TypeError("Your request makes no sense!");
	}

	if (!baseClass) {
		if (pubScope && /class\s+\w+\s+extends\s+(\w+)\s*{/.test(pubScope.toString())) {
			baseClass = Object.getPrototypeOf(pubScope.prototype).constructor;
		}
		else {
			baseClass = { constructor: {} };
		}
	}

	var nameMatches = pubScopeDef.match(/(?:(?:function\s+(\w+)\s*\((?:\s*,\s*\w+)*\))|(?:class\s+(\w+)\s*(?:extends\s+\w+)?))\s*{/);
	var name = nameMatches[1] || nameMatches[2];
	var classDefScope = {
		[name]: {},
		[baseClass.name]: baseClass
	};
	var keys = Object.keys(pvtScope);

	/* Create a Symbol for every private name declared */
	for (let i=0; i<keys.length; ++i) {
		let key = keys[i];

		let member = pvtScope[key];
		if ((member instanceof Box) && member.isStatic) {
			privateStaticNames[key] = Symbol(key);
		}
		else {
			privateNames[key] = Symbol(key);
		}
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
		else if (key in privateStaticNames) {
			Object.defineProperty(protectedNames, key, {
				enumerable: true,
				get: function getName() { return privateStaticNames[key]; }
			});
		}
	}
	
	/**
	 * Inject a callout into the constructor so we can setup monitoring and
	 * the private scope. Make sure to return the proxy instead of "this",
	 */
	var isExtension = /class\s+\w+\s+extends\s+\w+/.test(pubScopeDef);
	var defString = pubScopeDef.replace(/(\s*)constructor(\s*\(((?:\s*,?\s*\w+)*)\)\s*{(\s*))(super\(.*?\);?\s*)?/,
		"$1constructor$2$5var retval = initPrivateScope(this);$4retval[Constructor]($3);$4return retval;$1}$1\[Constructor\]$2");
	if (defString == pubScopeDef) { //Didn't have a constructor to modify
		defString = pubScopeDef.replace(/^(function\s+\w+\(((?:\s*,?\s*\w+)*)\)\s*{(\s*))/, "$1initPrivateScope(this);$3");
	}
	if (defString == pubScopeDef) { //Wasn't a function declaration
		var replacement = `$1constructor() {$2\t${(isExtension)?"super();$2\t":""}return initPrivateScope(this);$2}$2$3`;
		defString = pubScopeDef.replace(/(class(?:\s+\w+)?(?:\s+extends\s+\w+)?\s*{(\s*))(\w+)?/, replacement);
	}
	if (defString == pubScopeDef) {
		throw TypeError('This class definition makes no sense! Give me a "class" or a "function" definition.');
	}

	with(classDefScope) with(privateNames) with(privateStaticNames) {
		//Re-evaluate all functions in the private scope to ensure they can be accessed.
		for (key in pvtScope) {
			if (typeof(pvtScope[key]) == "function") {
				var fn = pvtScope[key].toString();

				if (/^\w+\s*\(((,\s*)?\w+)*\)\s*\{/.test(fn)) 
					fn = `function ${fn}`;
				else if (/^async \w+\s*\(((,\s*)?\w+)*\)\s*\{/.test(fn))
					fn = `async function ${fn.substr(6)}`;

				pvtScope[key] = eval(`(${fn})`);
			}
		}
		//Ensures the private scope is fully initialized before construction
		function initPrivateScope(instance) {
			instance = createInstanceProxy({
				instance,
				pvtScope,
				privateNames,
				privateStaticNames
			});

			if (ProtectedMembers in instance) {
				var protNames = instance[ProtectedMembers];
				if (Object.getPrototypeOf(privateNames) !== protNames) {
					Object.setPrototypeOf(privateNames, protNames);
					Object.setPrototypeOf(protectedNames, protNames);
				}
				delete instance[ProtectedMembers];
			}

			instance[ProtectedMembers] = protectedNames;
			return instance;
		}
		
		eval(`classDefScope[name] = ${defString.toString()};`);

		retval = createClassProxy({
			_class: classDefScope[name],
			classMode,
			pvtScope,
			staticScope,
			privateNames,
			privateStaticNames,
			StaticConstructor
		});

		classDefScope[name] = retval;
		return retval;
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

function unboxMember(privateNames, privateStaticNames, scope, dest, key, member) {
	if (member instanceof Box) {
		var def = {
			enumerable: true,
		};

		var _class = (scope instanceof Function)? scope : scope.__proto__.constructor;
		var classScope = {
			[_class.name]: _class
		};

		if (member.isProperty) {
			if (member.value.get instanceof Function) {
				with (classScope) with (privateNames) with (privateStaticNames)
					def.get = eval(`(${member.value.get.toString()})`).bind(scope);
			}
			if (member.value.set instanceof Function) {
				with (classScope) with (privateNames) with (privateStaticNames)
					def.set = eval(`(${member.value.set.toString()})`).bind(scope);
			}
		}
		else if (typeof(member.value) == "function") {
			def.writable = false;
			with (classScope) with (privateNames) with (privateStaticNames)
				def.value = eval(`(${member.value.toString()})`).bind(scope);
		}
		else {
			def.writable = !member.isFinal;
			def.value = member.value;	
		}

		Object.defineProperty(dest, key, def);
	}
	else {
		dest[key] = member;
	}
}

function createClassProxy(params) {
	var { _class, classMode, pvtScope, staticScope, privateNames, 
			privateStaticNames, StaticConstructor } = params;
			
	var handler = {
		slots: {
			type: `Class ${_class.name}`,
			privateStaticScope: {},
		},
		apply(target) {
			throw TypeError(`Class constructor ${target.name} cannot be invoked without 'new'`);
		},
		construct(target, args, newTarget) {
			var retval;
			
			if ((target.prototype.constructor === newTarget) && 
				(classMode === ClassModes.Abstract)) {
				throw new SyntaxError("Cannot construct an abstract class!");
			}

			retval = Reflect.construct(target, args, newTarget);

			if (target.prototype === newTarget.prototype)
				delete retval[ProtectedMembers];	//Clean up our mess before returning.

			return retval;
		},
		get(target, key, receiver) {
			var retval;
			if (Object.values(privateStaticNames).indexOf(key) >= 0) {
				retval = this.slots.privateStaticScope[key];
			}
			else {
				retval = Reflect.get(target, key, receiver);
			}
			return retval;
		},
		set(target, key, value, receiver) {
			var retval = true;
			if (Object.values(privateStaticNames).indexOf(key) >= 0) {
				this.slots.privateStaticScope[key] = value;
			}
			else {
				retval = Reflect.set(target, key, value, receiver);
			}
			return retval;
		},
		has(target, key) {
			var retval = true;
			if (Object.values(privateStaticNames).indexOf(key) >= 0) {
				retval = Reflect.has(this.slots.privateStaticScope, key);
			}
			else {
				retval = Reflect.has(target, key);
			}
			return retval;
		}
	};

	retval = new Proxy(_class, handler);
	_class.prototype.constructor = retval;

	var keys = Object.keys(pvtScope);
	for (let i=0; i<keys.length; ++i) {
		let key = keys[i];
		var member = pvtScope[key];
		var mKey = (key in privateStaticNames) ? privateStaticNames[key] : key;

		if (member && member.isStatic) {
			unboxMember(privateNames, privateStaticNames, retval,
				handler.slots.privateStaticScope, mKey, member);
		}
	}

	keys = Object.keys(staticScope);
	for (let i=0; i<keys.length; ++i) {
		let key = keys[i];
		var member = staticScope[key];
		var mKey = (key in privateStaticNames) ? privateStaticNames[key] : key;

		unboxMember(privateNames, privateStaticNames, retval, retval, mKey, member);
	}

	if (StaticConstructor instanceof Function) {
		StaticConstructor.call(retval);
	}

	return retval;
}

function createInstanceProxy(params) {
	var { instance, pvtScope, privateNames, privateStaticNames } = params;

	var handler = {
		slots: {
			type: Object.getPrototypeOf(instance).constructor.name,
			privateScope: {},
			privateNames,
			privateStaticNames
		},
		get(target, key, receiver) {
			var retval;
			if (Object.values(this.slots.privateNames).indexOf(key) >= 0) {
				retval = this.slots.privateScope[key];
			}
			else if (Object.values(this.slots.privateStaticNames).indexOf(key) >= 0) {
				retval = instance.constructor[key];
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
			var retval = true;
			if (Object.values(this.slots.privateNames).indexOf(key) >= 0) {
				this.slots.privateScope[key] = value;
			}
			else if (Object.values(this.slots.privateStaticNames).indexOf(key) >= 0) {
				instance.constructor[key] = value;
			}
			else {
				retval = Reflect.set(target, key, value, receiver);
			}
			return retval;
		},
		has(target, key) {
			var retval = true;
			if (Object.values(this.slots.privateNames).indexOf(key) >= 0) {
				retval = Reflect.has(this.slots.privateScope, key);
			}
			else if (Object.values(this.slots.privateStaticNames).indexOf(key) >= 0) {
				retval = Reflect.has(instance.constructor, key);
			}
			else {
				retval = Reflect.has(target, key);
			}
			return retval;
		}
	};

	var keys = Object.keys(pvtScope);
	for (let i=0; i<keys.length; ++i) {
		let key = keys[i];
		if ((key in pvtScope) && (key in privateNames)) {
			unboxMember(privateNames, privateStaticNames, instance,
				handler.slots.privateScope, privateNames[key], pvtScope[key]);
		}
	}
	
	return new Proxy(instance, handler);
};

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
