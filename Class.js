/*******************************************************************************
 * Class.js is a tool for generating JavaScript constructor functions that
 * can create fully encapsulated instance objects with an inheritance chain
 * similar to what one would expect from an object-oriented language without
 * requiring a cross-compiler or incurring much performance overhead.
 * @module java-class
 * @author Ranando D. King
 * @version 3.0.0
 * @copyright 2014 Ranando D. King
 * @license Apache 2.0
 ******************************************************************************/

/*
	Let's start by figuring out which version of JavaScript we're working with.
	The module system we use at the bottom will depend on whether or not we
	have ES6 support.
 */
var hasES6 = (function() { 
	var retval = false;

	try {
		eval("(...args) => {};"); //If this throws, then no ES6.
		retval = true;
		console.warn("ES6 support detected. You might want to use the ES6 version!");
	} catch(e) {};

	return retval;
})();

var hasSymbol = (typeof(Symbol) == "function");

/*
	These are data keys that help define the Class. Public scope isn't listed
	here because the Public scope of a Class is its prototype, and the Public
	Static scope for the Class is the type constructor function that was
	generated.
*/
if (hasSymbol) {
	var METADATA = Symbol("METADATA"),
		PRIVATESCOPE = Symbol("PRIVATESCOPE"),
		PROTECTEDSCOPE = Symbol("PROTECTEDSCOPE"),
		PROTECTEDSTATICSCOPE = Symbol("PROTECTEDSTATICSCOPE"),
		PUBLICSCOPE = Symbol("PUBLICSCOPE"),
		PUBLICSTATICSCOPE = Symbol("PUBLICSTATICSCOPE"),
		STATICSCOPE = Symbol("STATICSCOPE"),
		SUPERPROTO = Symbol("SUPERPROTO"),
		CLASSINSTANCE = Symbol("CLASSINSTANCE"),
		STATICCONTAINER = Symbol("STATICCONTAINER")
		PRIVATECONTAINER = Symbol("PRIVATECONTAINER");

}
else {
	var METADATA = "__$METADATA$__",
		PRIVATESCOPE = "__$PRIVATESCOPE$__",
		PROTECTEDSCOPE = "__$PROTECTEDSCOPE$__",
		PROTECTEDSTATICSCOPE = "__$PROTECTEDSTATICSCOPE$__",
		PUBLICSCOPE = "__$PUBLICSCOPE$__",
		PUBLICSTATICSCOPE = "__$PUBLICSTATICSCOPE$__",
		STATICSCOPE = "__$STATICSCOPE$__",
		SUPERPROTO = "__$SUPERPROTO$__",
		CLASSINSTANCE = "__$CLASSINSTANCE$__",
		STATICCONTAINER = "__$STATICCONTAINER$__",
		PRIVATECONTAINER = "__$PRIVATECONTAINER$__";
}

//List of words reserved for use in a Class definition object.
// var DefinitionKeys = [ "Mode", "Implements", "Mixins", "Extends",
// 					   "Events", "Constructor", "StaticConstructor",
// 					 ];
// var ModifierFns = [ "Private", "Protected", "Public", "Static", "Final",
// 					"Abstract", "Property", "Delegate", "Type"
// 				  ];
// var MetadataKeys = [ "name", "inheritsFrom", "classMode", "interface",
//  					 "isClass", "isInstance"
// 				   ];
var ReservedKeys = [ "Mode", "Implements", "Mixins", "Extends",
					 "Events", "Constructor", "StaticConstructor",
					 METADATA
				   ];

/**
 * Enum - Provides the ability to use syntax-checked enumeration values.
 *
 * @typedef {Object} Enum
 */
var Enum = require("./Enum");

/**
 * WeakMap - Provides an ES5 shim for the features of ES6 WeakMaps.
 *
 * @typedef {Object} WeakMap
 */
var WeakMap = require("./WeakMap");

/**
 * Functor - An alternative to Function.bind that grants runtime flexibility
 * over the bound result.
 *
 * @typedef {Object} Functor
 */
var Functor = require("./Functor");

/**
 * Interface - An object that defines a contract regarding the publicly useable
 * API of a corresponding class.
 *
 * @typedef {Object} Interface
 */
var Interface = require("./Interface");

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

var MetaData = new WeakMap();
var Instances = new WeakMap();

/**
 * Since Box is common logic between the ES5 and ES6 versions, it has been
 * moved out of this source so it can be used by both version of the library.
 */
var Box = (require("./lib/Box"))(Privilege, hasES6);
var Utils = (require("./lib/utils"))(Box, Privilege, hasES6);

var modifyBox = Utils.modifyBox;
var extend = Utils.extend;
var extendIf = Utils.extendIf;

/**
 * ClassDefError - An exception class used to flag errors in Class definitions.
 *
 * @class ClassDefError
 * @extends Error
 * @param {string} message - String content of the error message to be printed
 * when thrown.
 * @param {string} key - Key in the Class definition object where the errors was
 * found.
 */
function ClassDefError(message, key) {
	this.name = "ClassDefError";
	this.key = key;
	this.message = (key?"Class - While processing '" + key + "' - ": "") + message;
}
ClassDefError.prototype = SyntaxError.prototype;

/**
 * ClassError - An exception class used to flag runtime errors in Class.
 *
 * @class ClassError
 * @extends Error
 * @param {string} message - String content of the error message to be printed
 * when thrown.
 */
function ClassError(message) {
	this.name = "ClassError";
	this.message = "Class - While running: " + message;
}
ClassError.prototype = Error.prototype;

/**
 * Checks to see if the parameter is a function that's not one of the the 
 * special types provided by this library.
 * 
 * @param {*} obj - the value being tested.
 * @returns {boolean} - true iff obj is a function, but not a Class, Enum,
 * Interface, or Attribute.
 */
function isSimpleFunction(obj) {
	return ((obj instanceof Function) &&
			!(obj.isClass || obj.isEnum || obj.isInterface || obj.isAttribute));
}

/**
 * Checks to see if the parameter is a constructor function.
 *  
 * @param {*} obj - the value being tested.
 * @returns {Object} - true iff obj is a function with a prototype object that has
 * a constructor matching itself and at least 1 other property.
 */
function isConstructor(obj) {
	return ((obj instanceof Function) &&
			obj.hasOwnProperty('prototype') &&
			(obj.prototype instanceof Object) &&
			obj.prototype.hasOwnProperty('constructor') &&
			(obj.prototype.constructor === obj) &&
			Object.getOwnPropertyNames(obj).length > 1);
}

/**
 * Checks to see if the parameter is a function implemented in native code.
 * 
 * @param {*} obj - the value being tested.
 * @returns {Object} - true iff obj is a function with a toString() value
 * matching the pattern for a native code function.
 */
function isNativeFunction(obj) {
	return ((obj instanceof Function) &&
			/^function\s+\w+\(\)\s+{\s+\[native\s+code\]\s+}$/.test(obj.toString()));
}

function isValidType(type, value) {
	return ((value === null) || (value === undefined) ||
			(type.isInterface && type.isImplementedBy(value)) ||
			(type.isClass && (value instanceof type)) ||
			((type === Function) && (value instanceof Function)) ||
			((type === Date) && (value instanceof Date)) ||
			((type === String) && (typeof value == "string")) ||
			((typeof type == "string") && (type.toLowerCase() == typeof value)));
}

/**
 * Constructor for a simple type used to hold changing construction metadata.
 * 
 * @param {Object} name - User-given name for the class.
 * @param {Object} owner - Public instance of the Class being constucted.
 * @param {Object} scopes - Object containing all the member scope objects.
 */
function ClassArgs(name, owner, scopes) {
	if (!(this instanceof ClassArgs)) {
		throw new ClassError("ClassArgs is a constructor. You must use 'new'.");
	}
	this.className = name;
	this.owner = owner;
	this.childDomain = {};
	this.scopes = scopes;
	this.topDomain = owner;
	this.native = null;
}

/**
 * Creates the private, protected, and public instance domains.
 *
 * @param {Object} owner - the "this" of the current Class being constructed.
 * @param {Object} childDomain - the private domain of the a descendant Class
 * requesting the current Class's construction.
 * @param {Object} topDomain - the "this" of the top-level descendant that
 * started this construction chain.
 */
function initialize(classArgs) {
	//First, create a private domain and populate it..
	var owner = classArgs.owner;
	var childDomain = classArgs.childDomain;
	var topDomain = classArgs.topDomain;
	var scopes = classArgs.scopes;
	var privateDomain = {};

	//Put a flag on it so it can be identified as a private domain object.
	Object.defineProperties(privateDomain, {
		"Self": {
			configurable: true,
			value: owner
		},
		"Super": {
			value: (function() {
				var retval = (function Super() {
					var base = MetaData.get(Object.getPrototypeOf(owner).constructor).definition.Extends;
					var isNative = isNativeFunction(base);
					var args = Array.prototype.slice.call(arguments, ~~isNative);
					//This is ugly, but it preserves the objects that may have been passed in.
					var parent = eval('new base(' + ((args.length) ? 'args[' + Object.keys(args).join('], args[') + ']' : '') + ')');

					if (isNative) {
						//Send this upstream to be used by the overconstructor...
						classArgs.native = parent;
						Object.setPrototypeOf(Object.getPrototypeOf(classArgs.owner), base.prototype);
					}
				}).bind(owner, classArgs);

				Object.setPrototypeOf(retval, scopes[SUPERPROTO]);
				return retval;
			})()
		},
		"Delegate" : {
			value: function Delegate(fn) {
				return new Functor(this, fn);
			}
		},
		"Sibling": {
			value: function Sibling(other) {
				var retval;
				if (other instanceof Object.getPrototypeOf(this.Self).constructor)
					retval = Instances.get(other);

				return retval;
			}
		}
	});

	expandScope(privateDomain, scopes[PRIVATESCOPE], null, true);

	//If there's a child domain, construct the protected domain and attach it.
	if (childDomain) {
		var protectedDomain = {};
		expandScope(protectedDomain, scopes[PROTECTEDSCOPE]);
		childDomain.__proto__ = protectedDomain;
	}

	return privateDomain;
}

/**
 * The Class instance constructor, not to be confused with the type-specific
 * constructor provided in the Class definition. This constructor stages the
 * Class instance and calls the constructor in the Class definition.
 *
 * @param {Object} classArgs - Object containing initialization chain information.
 * @param {Object} classArgs.scopes - Object containing all the member scope objects.
 * @param {Object=} classArgs.childDomain - the private scope instance from a descendant Class.
 * @param {Object=} classArgs.owner - the public instance reference being constructed.
 * @returns {Object} - The fully constructed instance of the desired class.
 */
function typeConstructor(classArgs) {
	var name = classArgs.className;
	var scopes = classArgs.scopes;
	var childDomain = classArgs.childDomain;
	var self = classArgs.topDomain;
	var metaData = MetaData.get(Object.getPrototypeOf(this).constructor);
	var classConstructor = metaData.Constructor;
	var argc = arguments.length - 1;

	if ((metaData.definition.Mode === ClassModes.Abstract) && 
		(!(Object.getPrototypeOf(classArgs) instanceof ClassArgs)))
		throw new SyntaxError("Cannot construct an Abstract Class!");

	if (!classConstructor || classConstructor.isPublic ||
		(childDomain && classConstructor.isProtected)) {
		var args = Array.prototype.slice.call(arguments, 1);
		var instance = initialize(classArgs);

		if (metaData.Mixins)
			BlendMixins(definition.Mixins, instance);
			
		if (classConstructor) {
			if (!(childDomain && (childDomain.__isInheritedDomain || childDomain.__isDescendant))) {
				if (metaData.definition.Extends) {
					var hasSuperFirst = /function\s+\w+\s*\((\w+\s*(,\s*\w+)*)?\)\s*{\s*this\s*\.\s*Super\s*\(/;
					var hasSuper = /\s*this\s*\.\s*Super\s*\(/;
					var constructorString = classConstructor.value.toString();

					if (!hasSuper.test(constructorString)) {
						console.warn("Calling this.Super() for you!!!. You should be doing this in your " + name + " constructor!");

						if (instance.Super.length)
							throw new Error("No default constructor available in " + name + "\'s super class!");

						Function.prototype.apply.call(instance.Super, instance, args);
					}
					else {
						if (!hasSuperFirst.test(constructorString))
							console.warn("Super should be the first call in your " + name + " constructor!")
					}
				}
				classConstructor.value.apply(instance, args);
			}
		}
		else if (metaData.definition.Extends) {
			Function.prototype.apply.call(instance.Super, instance, args);
		}
	}
	else if (classConstructor)
		throw new Error("Constructor '" + name + "' is not accessible!");

	//Fix Self and make it const.
	var def = Object.getOwnPropertyDescriptor(instance, "Self");
	delete def.configurable;
	def.value = classArgs.native || this;
	Object.defineProperty(instance, "Self", def);
	Instances.set(instance.Self, instance);
	Object.seal(instance);

	return this;
}

/**
 * Creates the actual Object constructor function for the newly declared type.
 * @param {string} name - Name of the new Class type.
 * @param {Object} scopes - Object containing all the member scope objects.
 * @returns {Function} - the newly created Class type constructor.
 */
function generateTypeConstructor(name, scopes) {
	//Just a quick sanity check on that name...
	if (!/^(?!\d)\w\w*$/.test(name))
		throw new ClassError('Invalid name: "' + name + '". Must be a valid JS variable name.');

	var retval = eval("(function " + name + "() {\n" +
		 "	var callErrorString = \"This is a class instance generating function. \" + \n" +
		 "						  \"You must use 'new " + (name || "<ClassName>") + "\" + \n" +
		 "						  \"(...)' to use this function.\"; \n" +
		 "	if (!(this instanceof " + name + ")) {\n" +
		 "		throw new ClassError(callErrorString);\n" +
		 "	}\n" +
		 "	\n" +
		 "	var args = Array.prototype.slice.call(arguments);\n" +
		 "	var arg0 = args[0];\n" +
		 "	var hasClassArgs = arg0 instanceof ClassArgs;\n" +
		 "	var classArgs = new ClassArgs(name, this, scopes);\n" +
		 "	if (hasClassArgs) {\n" +
		 "		Object.setPrototypeOf(classArgs, arg0);\n" +
		 "		classArgs.topDomain = arg0.topDomain;\n" +
		 "		args.shift();\n" +
		 "	}\n" +
		 "	args.unshift(classArgs);\n" +
		 "	\n" +
		 "	var retval = typeConstructor.apply(this, args);\n" +
		 "	if (hasClassArgs) {\n" +
		 "		arg0.native = classArgs.native;\n" +
		 "	}\n" +
		 "	else if (classArgs.native) {\n" +
		 "		retval = classArgs.native;\n" +
		 "		Object.setPrototypeOf(retval, this);\n" +
		 "	}\n" +
		 "	\n" +
		 "	Object.defineProperty(this, CLASSINSTANCE, { value: true });\n" +
		 "	return retval;\n" +
		 "});");

	return retval;
}

/**
 * Validates and filters the keys in the definition, only returning the keys
 * that are directly available in some scope of the completed Class.
 * 
 * @param {Object} definition - The full class definition.
 * @returns {Object} - a new object containing only the definition keys that
 * are neither constructors nor metadata.
 */
function validateDefinitionKeys(definition) {
	var mKey;
	var retval = {};
	var mode;

	for (var key in definition) {
		if (definition.hasOwnProperty(key)) {
			var member = definition[key];

			/*
				If the member isn't an instance of Box, then it's either one of
				the Class definition description keys or it's just a public
				member that's been made public by default.
			*/
			if (!(member instanceof Box)) {
				switch(key) {
					case "Mode":
						//Since we're keeping the metadata, we only validate.
						if (!ClassModes.isMember(member))
							throw new ClassDefError("Invalid Mode!", "Mode");
						mode = member;
						break;
					case "Implements":
						if (Array.isArray(member)) {
							for (mKey in member) {
								if (member.hasOwnProperty(mKey)) {
									if (!member[mKey].isInterface)
										throw new ClassDefError("Invalid interface!", key);
								}
							}
						}
						else
							throw new ClassDefError("Not an array of Interfaces!", key);

						break;
					case "Mixins":
						if (!Array.isArray(member))
							throw new ClassDefError("Not an array!", key);

						for (mKey in member) {
							if (member.hasOwnProperty(mKey)) {
								if (member[mKey] instanceof Function)
									throw new ClassDefError("Cannot mixin functions!", key);
							}
						}
						break;
					case "Extends":
						if (!(member instanceof Function))
							throw new ClassDefError("Cannot extend non-function!", key);
						break;
					case "Events":
						if (!Array.isArray(member))
							throw new ClassDefError("Not an array!", key);

						for (var i = 0; i < member.length; i++) {
							if (typeof member[i] !== "string")
								throw new ClassDefError("Non-string event name!", key);
						}
						break;
					case "Constructor":
					case "StaticConstructor":
						if (!(member instanceof Function))
							throw new ClassDefError("Must be a function!", key);

						definition[key] = modifyBox(null, {isPublic: true}, member);
						break;
					default:
						throw new ClassDefError("Unrecognized key!", key);
				}
			}
			else {
				switch(key) {
					case "Constructor":
						if (member.isStatic)
							throw new ClassDefError("Cannot be Static!", key);

						if (member.isProperty)
							throw new ClassDefError("Cannot be a Property!", key);

						if (member.isAbstract)
							throw new ClassDefError("Cannot be Abstract!", key);

						if (!(member.value instanceof Function))
							throw new ClassDefError("Must be a function!", key);

						break;
					case "StaticConstructor":
						if (member.isPrivate)
							throw new ClassDefError("Cannot be Private!", key);

						if (member.isProtected)
							throw new ClassDefError("Cannot be Protected!", key);

						if (member.isProperty)
							throw new ClassDefError("Cannot be a Property!", key);

						if (member.isAbstract)
							throw new ClassDefError("Cannot be Abstract!", key);

						if (member.isFinal)
							throw new ClassDefError("Cannot be Final!", key);

						if (!(member.value instanceof Function))
							throw new ClassDefError("Must be a function!", key);

						break;
					default:
						if (member.isAbstract && mode === ClassModes.Final)
							throw new ClassDefError('Cannot be "Abstract" in a "Final" Class!', key);

						retval[key] = member;
						//Nothing to do here. It's just good form...
						break;
				}
			}
		}
	}

	return retval;
}

/**
 * Creates an unbound property that will be resolved to reference a property on
 * another object.
 *
 * @param {string} key - name of the the property to target.
 * @returns {Box} A new Box instance posessing an unconfigured link
 */
function createLinkBox(key) {
	return new Box({
		privilege: Privilege.Link,
		value: {
			get: new Functor(null, function getProperty() {
				let p = Instances.get(this);
				return (this && (this !== global)) ? 
					(this[STATICCONTAINER]) ? this[key] : 
					(p) ? p[key] : undefined : undefined;
			}),
			set: new Functor(null, function setProperty(value) {
				let p = Instances.get(this);
				this && (this !== global) && 
					(this[STATICCONTAINER]) ? (this[key] = value) :
					(p && (p[key] = value));
			})
		}
	});
}

/**
 * Makes a copy of an object such that all of the properties on the original
 * referenced on the duplicate via links created with createLinkBox().
 * 
 * @param {Object} src - Object containing members to be linked
 * @param {Object=} dest - Object that the links will be placed in. A new
 * object will be created if not specified.
 * @param {Object=} target - Object that is the link target of the copy. If not
 * specified, src is used.
 * @returns {Object} - a new Object where every own property directly
 * references src.
 */
function cloneAsLinks(src, dest, target) {
	var retval = dest || {};
	target = (target === undefined) ? src : target;

	for (var key in src) {
		if (src.hasOwnProperty(key)) {
			Object.defineProperty(retval, key, unpackBox(createLinkBox(key), target));
		}
	}

	return retval;
}

/**
 * Configures an unpacked link created by createLinkBox and unpacked with
 * unpackBox. This forces the link to target the desired object.
 *
 * @param {Object} container - the object posessing the unconfigured link.
 * @param {string} key - the property name of the unconfigured link.
 * @param {Object} target - the target object that the link should reference.
 */
function resolveLink(container, key, target) {
	var descriptor = Object.getOwnPropertyDescriptor(container, key);

	if (descriptor.get && descriptor.get.isFunctor)
		descriptor.get._this = target;

	if (descriptor.set && descriptor.set.isFunctor)
		descriptor.set._this = target;
}

/**
 * Expands the contents of a Box instance into a JavaScript property definition.
 *
 * @param {Box} box - the Box instance to be expanded
 * @param {Object} target - an object to reference if the Box contains a link.
 * @returns {Object} the property definition to use with Object.defineProperty
 * to create the property described by the Box instance.
 */
function unpackBox(box, target, context) {
	var retval = {
		enumerable: true
	};

	function scopeIt(_fn) {
		var _rval;

		with (context) {
			_rval = eval('(' + _fn.toString() + ')');
		}

		return _rval;
	}

	//If this Box is a property, we need to build it
	if (box.isProperty || box.isLink) {
		retval.get = box.value.get;
		retval.set = box.value.set;

		if (box.isLink) {
			var t = (target && target.isBox) ? target.value : target;
			retval.get && retval.get.isFunctor && (retval.get._this = t);
			retval.set && retval.set.isFunctor && (retval.set._this = t);
		}
		else if (context instanceof Object) {
			if (isSimpleFunction(retval.get)) {
				retval.get = scopeIt(retval.get);
			}
			if (isSimpleFunction(retval.set)) {
				retval.set = scopeIt(retval.set);
			}
		}
	}
	else {
		var value = box.value;
		var isSimpleFn = isSimpleFunction(value);

		if (!box.isFinal && !isSimpleFn)
			retval.writable = true;

		if ((context instanceof Object) && isSimpleFn) {
			value = scopeIt(value);
		}

		if (isSimpleFn) {
			retval.value = new Functor(target, value);
		}
		else {
			retval.value = value;
		}
	}

	return retval;
}

/**
 * Expands the properties described by a scope object onto a destination object
 * targeting all functions to be called from a given context.
 * 
 * @param {Object} dest - the object that will contain the expanded properties.
 * @param {Object} scope - the object containing the Boxed properties.
 * @param {Object} target - the object to be used
 * @param {boolean} addContext - if true and the property is a function, the
 * property is redeclared using dest as its context.
 */
function expandScope(dest, scope, target, addContext) {
	if (!target)
		target = dest;

	if (!scope)
		scope = dest;

	for (var key in scope) {
		if (scope.hasOwnProperty(key) && scope[key].isBox) {
			var unpacked = unpackBox(scope[key], target, (addContext) ? dest : undefined);
			Object.defineProperty(dest, key, unpacked);
		}
	}
}

/**
 * Applies each property of the definition to the appropriate scope. Properties
 * are also created to ensure appropriate references back to the private/static
 * scope. Static scope will be fully expanded by the completion of this function.
 *
 * @param {Object} scopes - the object containing an object for each of the 6
 * possible scopes.
 * @param {object} members - the object containing all of the member elements
 * from the Class definition.
 */
function populateScopes(scopes, members) {
	for (var key in members) {
		if (members.hasOwnProperty(key) && (ReservedKeys.indexOf(key) == -1)) {
			var member = members[key];

			//If it's static, move it to STATICSCOPE.
			if (member.isStatic) {
				Object.defineProperty(scopes[STATICSCOPE], key,
									  unpackBox(member, scopes[STATICSCOPE]));
				scopes[PRIVATESCOPE][key] = createLinkBox(key);

				//Link it to the proper privilege level as well.
				if (!member.isPrivate) {
					Object.defineProperty(scopes[PROTECTEDSTATICSCOPE], key,
										  unpackBox(createLinkBox(key), scopes[STATICSCOPE]));
				}

				if (member.isPublic) {
					Object.defineProperty(scopes[PUBLICSTATICSCOPE], key,
										  unpackBox(createLinkBox(key), scopes[STATICSCOPE]));
				}
			}
			else {
				//If we made it here, it's not static. Put it in PRIVATESCOPE.
				scopes[PRIVATESCOPE][key] = member;

				//Now just figure out where we need to link it.
				if (!member.isPrivate) {
					scopes[PROTECTEDSCOPE][key] = createLinkBox(key);
				}

				if (member.isPublic) {
					scopes[PUBLICSCOPE][key] = createLinkBox(key);
				}
			}
		}
	}

}

/**
 * Creates an object with constant information and adds it to the constructor.
 * @param {Function} This - the Class type constructor.
 * @param {string} name - the name of the Class type.
 * @param {Object} definition - the object passed into the Class factory to
 * produce the new Class type.
 * @param {Object} scopes - an object containing all the scope objects
 */
function generateMetaData(This, name, definition, scopes) {
	var metadata = {};
	Object.defineProperties(metadata, {
		name: {
			enumerable: true,
			value: name
		},
		type: {
			enumerable: true,
			value: This.bind(null, scopes)
		},
		scopes: {
			enumerable: true,
			value: scopes
		},
		Constructor: {
			enumerable: true,
			value: definition.Constructor
		},
		StaticConstructor: {
			enumerable: true,
			value: definition.StaticConstructor
		},
		definition: {
			enumerable: true,
			value: Object.freeze(definition)
		},
		isClass: {
			enumerable: true,
			value: true,
		},
		classMode: {
			enumerable: true,
			get: function getClassMode() {
				return definition.Mode || ClassModes.Default;
			}
		},
		inheritsFrom: {
			enumerable: true,
			value: function inheritsFrom(obj) {
				return (definition.hasOwnProperty("Extends") &&
						definition.Extends.isClass &&
						((definition.Extends === obj) ||
						 (definition.Extends[METADATA].inheritsFrom(obj))));
			}
		},
		interface: {
			enumerable: true,
			value: (function getInterface() {
				var intDef = {};

				if (definition.Extends && !isNativeFunction(definition.Extends))
					intDef.Extends = [ MetaData.get(definition.Extends).interface ];

				if (definition.Implements && Array.isArray(definition.Implements)) {
					if (!Array.isArray(intDef.Extends))
						intDef.Extends = [];

					for (var i=0; i< definition.Implements.length; ++i)
						intDef.Extends.push(definition.Implements[i]);
				}

				intDef.Properties = {};
				intDef.Methods = {};

				for(var elementKey in definition) {
					if (definition.hasOwnProperty(elementKey)) {
						var element = definition[elementKey];

						if ((elementKey != "Constructor") && (elementKey != "StaticConstructor") &&
							(element.isBox && element.isPublic)) {

							if (element.isProperty)
								intDef.Properties[elementKey] = element.value.hasOwnProperty("set");
							else
								intDef.Methods[elementKey] = element.value.length;
						}
					}
				}

				return new Interface(name + "_Interface", intDef);
			})()
		}
	});

	MetaData.set(This, metadata);
	//Object.defineProperty(This.prototype, CLASSINSTANCE, { value: true });
	Object.defineProperty(scopes[STATICSCOPE], "Self", { value: This });
}

/**
 * Creates a new, empty scopes container.
 * 
 * @returns {Object} the new scopes container.
 */
function createScopesContainer() {
	var retval = {};

	retval[STATICSCOPE] = {};
	retval[PRIVATESCOPE] = {};
	retval[PROTECTEDSCOPE] = {};
	retval[PROTECTEDSTATICSCOPE] = {};
	retval[PUBLICSCOPE] = {};
	retval[PUBLICSTATICSCOPE] = {};
	retval[SUPERPROTO] = null;

	return retval;
}

/**
 * Creates a new function object that provides direct access to the constructor,
 * public, and protected methods and getter/setter properties of the base class.
 * 
 * @param {Object} base - The constructor of the parent class.
 * @param {Object} baseScopes - The scopes container for the parent class.
 */
function createSuperProto(base, baseScopes) {
	function getSuperKeys(obj) {
		var retval = [];
		
		while (obj && (typeof(obj) == "object") && (obj !== Object.prototype)) {
			var descKeys = Object.keys(obj).concat(((hasES6)?Object.getOwnPropertySymbols(obj):[]));

			for (var i=0; i<descKeys.length; ++i) {
				var key = descKeys[i];
				var descriptor = Object.getOwnPropertyDescriptor(obj, key);

				if ((descriptor.enumerable) &&
					(!("value" in descriptor) ||
					 (typeof(descriptor.value == "function")))) {
					
					retval.push(key);
				}
			}

			obj = Object.getPrototypeOf(obj);
		}

		return retval;
	}

	function getDescriptor(parent, key) {
		var descriptor = Object.getOwnPropertyDescriptor(parent, key);
		return {
			enumerable: true,
			get: function() {
				return parent[key]; 
			}
		};
	}

	function defineKeys(dest, keys, src) {
		//Copy all of the public keys.
		for (var i=0; i<keys.length; ++i) {
			var key = keys[i];
			if (!(key in retval))
				Object.defineProperty(retval, key, getDescriptor(chain, key));
		}
	}

	var retval = {};
	var chain = base.prototype;
	Object.setPrototypeOf(retval, Function.prototype);

	defineKeys(retval, getSuperKeys(baseScopes[PROTECTEDSCOPE]), chain);
	defineKeys(retval, getSuperKeys(baseScopes[PROTECTEDSTATICSCOPE]), chain);
	defineKeys(retval, getSuperKeys(baseScopes[PUBLICSCOPE]), chain);
	defineKeys(retval, getSuperKeys(baseScopes[PUBLICSTATICSCOPE]), chain);

	return retval;
}

/**
 * Takes care of including the scopes of Mixins and Extends into the Class
 * definition.
 *
 * @param {Object} This - the Class consstructor being constructed.
 * @param {Object} scopes - Object containing the members sorted by scope.
 */
function inherit(This, scopes) {
	var metadata = MetaData.get(This);
	var definition = metadata.definition;
	var extended = definition.Extends || null;
	var mixinList = definition.Mixins || [];

	//First, handle Extends...
	var eMetadata = MetaData.get(extended);
	if (eMetadata && eMetadata.isClass) {
		var extendedScope = eMetadata.scopes;
		Object.setPrototypeOf(scopes[PROTECTEDSTATICSCOPE], extendedScope[PROTECTEDSTATICSCOPE]);
		Object.setPrototypeOf(scopes[PROTECTEDSCOPE], extendedScope[PROTECTEDSCOPE]);
		Object.setPrototypeOf(scopes[PUBLICSTATICSCOPE], extendedScope[PUBLICSTATICSCOPE]);
		Object.setPrototypeOf(scopes[PUBLICSCOPE], extended.prototype);

		//Don't forget to build the Super() prototype
		scopes[SUPERPROTO] = createSuperProto(extended, extendedScope);
	}

	//Then, handle Mixins...
	var mixer = createScopesContainer();
	for (var i=0; i<mixinList.length; ++i) {
		var obj = mixinList[i];

		if (isConstructor(obj)) {
			//The prototype of a constructor is for non-static scope.
			extend(mixer[PRIVATESCOPE], obj.prototype);
			delete mixer[PRIVATESCOPE].constructor;

			cloneAsLinks(obj.prototype, mixer[PROTECTEDSCOPE], mixer[PRIVATESCOPE]);
			cloneAsLinks(obj.prototype, mixer[PUBLICSCOPE], mixer[PRIVATESCOPE]);

			//The constructor itself is static scope. Just remember to ignore 
			//the members of Function itself and prototype.
			var sMixer = {};
			var fKeys = Object.getOwnPropertyNames(Function.prototype);
			fKeys.push('prototype');
			
			extendIf(function(src, key) {
				return (src.hasOwnProperty(key) && (fKeys.indexOf(key) == -1));
			}, obj, sMixer);

			extend(mixer[STATICSCOPE], sMixer);
			cloneAsLinks(sMixer, mixer[PROTECTEDSTATICSCOPE], mixer[STATICSCOPE]);
			cloneAsLinks(sMixer, mixer[PUBLICSTATICSCOPE], mixer[STATICSCOPE]);
		}
		else if (obj instanceof Object) {
			extend(mixer[PRIVATESCOPE], obj);

			cloneAsLinks(obj, mixer[PROTECTEDSCOPE], mixer[PRIVATESCOPE]);
			cloneAsLinks(obj, mixer[PUBLICSCOPE], mixer[PRIVATESCOPE]);
		}
		else
			throw new ClassDefError("Only Objects and Functions can be mixed into a Class!", "Mixins");
	}

	//After all of that, now it's time to join the mixer to the scopes
	var list = [PUBLICSCOPE, PUBLICSTATICSCOPE, PROTECTEDSCOPE, PROTECTEDSTATICSCOPE, PRIVATESCOPE, STATICSCOPE];
	for (var i=0; i<list.length; ++i) {
		var sName = list[i];
		Object.setPrototypeOf(mixer[sName], Object.getPrototypeOf(scopes[sName]));
		Object.setPrototypeOf(scopes[sName], mixer[sName]);
	}

	cloneAsLinks(scopes[PUBLICSCOPE], This.prototype, null);
	Object.setPrototypeOf(This.prototype, Object.getPrototypeOf(scopes[PUBLICSCOPE]));
}

var Class = (function _Class() {
	/**
	 * Class - A constructor factory designed to create functions that
	 * themselves create fully encapsulating, classical classes in JavaScript.
	 * It is not necessary to use 'new' when calling Class(...), but doing so
	 * will not interfere with how Class functions.
	 *
	 * @class Class
	 * @param {string=} name - Name of the new Class constructor function.
	 * @param {object} definition - Object describing the Class structure
	 * @returns {Function} - the new Class type constructor
	 */
	function Class(name, definition) {
		if (this instanceof Class)
			console.warn("No need to use 'new' when declaring a new Class.");

		if (arguments.length === 1) {
			if (typeof name == "object") {
				definition = name;
				name = "";
			}
			else {
				throw new ClassDefError("Where's the Class definition object? At least give me {}!");
			}
		}

		var scopes = createScopesContainer();
		var retval = generateTypeConstructor(name, scopes);
		scopes[STATICSCOPE][STATICCONTAINER] = true;
		scopes[PRIVATESCOPE][PRIVATECONTAINER] = true;
		scopes[PUBLICSTATICSCOPE] = retval;

		populateScopes(scopes, validateDefinitionKeys(definition));
		generateMetaData(retval, name, definition, scopes);
		inherit(retval, scopes);

		return retval;
	}

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

	function Initialize(_global) {
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

	Initialize(Class);
	Object.defineProperties(Class, {
		InitializeScope: {
			enumerable: true,
			value: Initialize
		}
	});

	Object.freeze(Class);
	return Class;
})();

if (typeof(module) === "object") {
	//Use require semantics
	module.exports = Class;
}
else if (hasES6) {
	//Prevents older engines from throwing.
	try {
		eval("export default Class;");
	} catch(e) {
		console.warn("No known means of exporting 'Class' namespace!");
	}
}
else {
	console.warn("No known means of exporting 'Class' namespace!");
}
