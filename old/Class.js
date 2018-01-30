/*******************************************************************************
 * Class.js is a tool for generating JavaScript constructor functions that
 * can create fully encapsulated instance objects with an inheritance chain
 * similar to what one would expect from an object-oriented language without
 * requiring a cross-compiler or incurring much performance overhead.
 * @module java-class
 * @author Ranando D. King
 * @version 3.0.0
 ******************************************************************************/
'use strict'

/*
	These are data keys that help define the Class. Public scope isn't listed
	here because the Public scope of a Class is its prototype, and the Public
	Static scope for the Class is the type constructor function that was
	generated.
*/
var METADATA = "__$METADATA$__",
	PRIVATESCOPE = "__$PRIVATESCOPE$__",
	PROTECTEDSCOPE = "__$PROTECTEDSCOPE$__",
	STATICSCOPE = "__$STATICSCOPE$__";

//List of words reserved for use in a Class definition object.
var DefinitionWords = [ "Mode", "Implements", "Mixins", "Extends",
						"Events", "Constructor", "StaticConstructor",
						"Self", "Sibling", "Delegate"];
var ReservedWords = [ "Mode", "Implements", "Mixins", "Extends",
					  "Events", "Constructor", "StaticConstructor",
					  "Self", "Sibling", "Delegate", "__name",
					  "isClass", "classMode", "inheritsFrom",
					  "getInterface", "isClassInstance", "__static" ];

/**
 * Enum - Provides the ability to use syntax-checked enumeration values.
 *
 * @typedef {Object} Enum
 */
var Enum = require("Enum");

/**
 * WeakMap - Provides an ES5 shim for the features of ES6 WeakMaps.
 *
 * @typedef {Object} WeakMap
 */
var WeakMap = require("WeakMap");

/**
 * Privilege - An enumeration of the possible privilege levels of Class members.
 * Defaults to "None`"
 *
 * @typedef {Enum} Privilege
 * @prop {number} None - Specifies an unmarked privilege state.
 * @prop {number} Public - Marks the member as world visible.
 * @prop {number} Protected - Marks the member as descendant visible.
 * @prop {number} Private - Marks the member as exclusively for the defined Class.
 */
var Privilege = new Enum("None", [ "Public", "Protected", "Private", "None" ]);

/**
 * ClassModes - An enumeration of the inheritability of defined Class types.
 *
 * @typedef {Enum} ClassModes
 * @prop {number} Default - Sets unrestricted inheritability for the new Class.
 * @prop {number} Abstract - Sets required inheritability for the new Class.
 * @prop {number} Final - Restricts all inheritability of the new Class.
 */
var ClassModes = new Enum("Default", ["Default", "Abstract", "Final"]);

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
	this.message = (key?"While processing '" + key + "' - ": "") + message;
}
ClassDefError.prototype = Error.prototype;

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
	this.message = "While running: " + message;
}
ClassError.prototype = Error.prototype;

function isSimpleFunction(obj) {
	return ((obj instanceof Function) &&
			!(obj.isClass || obj.isEnum || obj.isInterface || obj.isAttribute));
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

function typeConstructor() {
	var classType = this.constructor;
	var name = classType.name;
	var metaData = classType[METADATA];
	var childDomain = arguments[arguments.length -1];
	var self = arguments[arguments.length -2];
	var argc = arguments.length - 2;

	if (!(childDomain && (childDomain.__isInheritedDomain ||
						  childDomain.__isDescendant))) {
		childDomain = null;
		self = null;
		argc += 2;
	}

	if (self && !self.isClassInstance) {
		self = null;
		++argc;
	}

	if ((metaData.classMode === ClassModes.Abstract) &&
		(!childDomain || !(childDomain.__isInheritedDomain || childDomain.__isDescendant)))
		throw new SyntaxError("Cannot construct an Abstract Class!");

	if (!metaData.Constructor ||
		((metaData.Constructor instanceof Box) &&
		 (metaData.Constructor.isPublic ||
		  (childDomain && childDomain.__isInheritedDomain && metaData.Constructor.isProtected)))) {
		initialize(this, childDomain, self);
		var instance = instances.get(this);
		if (metaData.Mixins)
			BlendMixins(definition.Mixins, instance);

		Object.seal(instance);

		var args = [].slice.call(arguments, 0, argc);

		if (classConstructor) {
			if (!(childDomain && (childDomain.__isInheritedDomain || childDomain.__isDescendant))) {
				if (this.InheritsFrom) {
					var hasSuperFirst = /function\s+\w+\s*\((\w+\s*(,\s*\w+)*)?\)\s*{\s*this\s*\.\s*Super\s*\(/;
					var hasSuper = /\s*this\s*\.\s*Super\s*\(/;
					var constructorString = classConstructor.value.toString();

					if (!hasSuper.test(constructorString)) {
						console.warn("Calling this.Super() for you!!!. You should be doing this in your " + name + " constructor!");

						if (instance.Super.length)
							throw new Error("No default constructor available in " + name + "\'s super class!");

						instance.Super();
					}
					else {
						if (!hasSuperFirst.test(constructorString))
							console.warn("Super should be the first call in your " + name + " constructor!")
					}
				}
				classConstructor.value.apply(instance, args);
			}
		}
		else if (this.InheritsFrom) {
			instance.Super();
		}
	}
	else if (classConstructor)
		throw new Error("Constructor '" + name + "' is not accessible!");

	return this;
}

function generateTypeConstructor(name) {
	var callErrorString = "This is a class instance generating function." +
						  "You must use 'new " + (name || "<ClassName>") +
						  "(...)' to use this function.";

	eval("var retval = function " + name + "() {\n" +
		 "	if (!(this instanceof retval)) {\n" +
		 "		throw new ClassError(callErrorString);\n" +
		 "	}\n" +
		 "	\n" +
		 "	return typeConstructor.apply(this, arguments);\n" +
		 "};");

	return retval;
}

function validateDefinitionKeys(definition) {
	var mKey;
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

						if (member.isFinal)
							throw new ClassDefError("Cannot be Final!", key);

						if (!(member.value instanceof Function))
							throw new ClassDefError("Must be a function!", key);

						break;
					default:
						//Nothing to do here. It's just good form...
						break;
				}
			}
		}
	}
}

function generateScopes(obj, definition) {
	var retval = {};
	retval[PRIVATESCOPE] = {};
	retval[PROTECTEDSCOPE] = {};
	retval[STATICSCOPE] = {};

	validateDefinitionKeys(definition);

	return retval;
}

function generateMetaData(obj, name, definition) {
	obj[METADATA] = {
		name: name,
		definition: definition,
		isClass: true,
		classMode: function getClassMode() { return _classMode; },
		inheritsFrom: function inheritsFrom(obj) {
			return (definition.hasOwnProperty("Extends") &&
					definition.Extends.isClass &&
					((definition.Extends === obj) ||
					 (definition.Extends.inheritsFrom(obj))));
		},
		getInterface: function getInterface() {
			var intDef = {};

			if (obj.InheritsFrom)
				intDef.Extends = [ obj.InheritsFrom.getInterface() ];

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
		},
	};

	Object.freeze(obj[METADATA]);
	Object.defineProperty(obj.prototype, "isClassInstance", { value: true });
}

var Box = (function _Box() {

	var internal = new WeakMap();

	/**
	 * Box - The metadata object used to contain the description of a member of a
	 * defined Class type.
	 *
	 * @class Box
	 * @param {Object} params - Parameter block encoding the state of each flag.
	 * @property {Privilege} params.privilege - The Privilege for this member.
	 * @property {boolean} params.isFinal - Can it be overridden or changed?
	 * @property {boolean} params.isAbstract - Must it be overridden to be used?
	 * @property {boolean} params.isStatic - Is it owned by the Class type?
	 * @property {boolean} params.isProperty - Does it have side effects?
	 * @property {boolean} params.isDelegate - Will it be called externally?
	 * @property {string} params.type - The specific type returned by this member.
	 * @property {*} params.value - The statically assigned value for this member.
	 */
	var retval = function Box(params) {
		internal.set(this, {
			privilege: params.privilege,
			isFinal: !!params.isFinal,
			isAbstract: !!params.isAbstract,
			isStatic: !!params.isStatic,
			isProperty: !!params.isProperty,
			isDelegate: !!params.isDelegate,
			type: params.type,
			value: params.value
		});

		if (this.isProperty && this.isFinal)
			throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

		if (this.isAbstract && this.isProperty)
			throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");

		if (this.isAbstract && this.isFinal)
			throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");

		return this;
	};

	Object.defineProperties(retval.prototype, {
		/**
		 * @memberof Box
		 * @property {boolean} isLocked - Flag signifying whether or not the Box
		 * can be edited further. Once locked, the box cannot be unlocked.
		 */
		isLocked: {
			enumerable: true,
			get: function getIsLocked() { return !!internal.get(this).isLocked; },
			set: function setIsLocked(val) {
				if (val)
					internal.get(this).isLocked = val;
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isBox - Flag identifying that this a Box and not
		 * a JavaScript value.
		 */
		isBox: {
		   enumerable: true,
		   value: true
		},
		/**
		 * @memberof Box
		 * @property {boolean} noPrivilege - Internal flag set to true when no
		 * privilege level is specified for the member.
		 * @readonly
		 */
		noPrivilege: {
			enumerable: false,
			get: function getNoPrivilege() { return internal.get(this).privilege === Privilege.None; }
		},
		/**
		 * @memberof Box
		 * @property {boolean} isPrivate - Flag identifying that this member is
		 * only accessible internally on direct instances the declaring Class
		 * via 'this'.
		 */
		isPrivate: {
			enumerable: true,
			get: function getIsPrivate() { return internal.get(this).privilege === Privilege.Private; },
			set: function setIsPrivate(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.privilege !== Privilege.Private) {
							if (that.privilege === Privilege.None) {
								that.privilege = Privilege.Private;
							}
							else {
								throw new ClassDefError("Member cannot be both 'Private' and '" +
														that.privilege.name + "' at the same time!");
							}
						}
					}
					else if (that.privilege === Privilege.Private) {
						that.privilege = Privilege.None;
					}
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isProtected - Flag identifying that this member
		 * is accessible internally via this in all instances of the declaring
		 * class.
		 */
		isProtected: {
			enumerable: true,
			get: function getIsProtected() { return internal.get(this).privilege === Privilege.Protected; },
			set: function setIsProtected(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.privilege !== Privilege.Protected) {
							if (that.privilege === Privilege.None) {
								that.privilege = Privilege.Protected;
							}
							else {
								throw new ClassDefError("Member cannot be both 'Protected' and '" +
														that.privilege.name + "' at the same time!");
							}

						}
					}
					else if (that.privilege === Privilege.Protected) {
						that.privilege = Privilege.None;
					}
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isPublic - Flag identifying that this member
		 * is accessible externally on all descendants of the declaring class.
		 */
		isPublic: {
			enumerable: true,
			get: function getIsPublic() { return internal.get(this).privilege === Privilege.Public; },
			set: function setIsPublic(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.privilege !== Privilege.Public) {
							if (that.privilege === Privilege.None) {
								that.privilege = Privilege.Public;
							}
							else {
								throw new ClassDefError("Member cannot be both 'Public' and '" +
														that.privilege.name + "' at the same time!");
							}

						}
					}
					else if (that.privilege === Privilege.Public) {
						that.privilege = Privilege.None;
					}
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isStatic - Flag identifying that this member
		 * is accessible via the declared Class type's constructor.
		 */
		isStatic: {
			enumerable: true,
			get: function getIsStatic() { return internal.get(this).isStatic; },
			set: function setIsStatic(val) {
				if (!this.isLocked)
					internal.get(this).isStatic = val;
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isFinal - Flag identifying that this member
		 * cannot be overridden by declarations in subclasses of the declared
		 * Class.
		 */
		isFinal: {
			enumerable: true,
			get: function getIsFinal() { return internal.get(this).isFinal; },
			set: function setIsFinal(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.isProperty)
							throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

						if (that.isAbstract)
							throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");
					}

					that.isFinal = val;
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isAbstract - Flag identifying that this member
		 * must be overridden by declarations in subclasses of the declared
		 * Class.
		 */
		isAbstract: {
			enumerable: true,
			get: function getIsAbstract() { return internal.get(this).isAbstract; },
			set: function setIsAbstract(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.isProperty)
							throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");

						if (that.isFinal)
							throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");
					}

					that.isAbstract = val;
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isProperty - Flag identifying that this member
		 * uses a getter and/or setter method(s) to define its value.
		 */
		isProperty: {
			enumerable: true,
			get: function getIsProperty() { return internal.get(this).isProperty; },
			set: function setIsProperty(val) {
				var that = internal.get(this);
				if (!that.isLocked) {
					if (val) {
						if (that.isFinal)
							throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

						if (that.isAbstract)
							throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");
					}

					that.isProperty = val;
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {boolean} isDelegate - Flag identifying that this member
		 * is prepared to be used as a callback function.
		 */
		isDelegate: {
			enumerable: true,
			get: function getIsDelegate() { return internal.get(this).isDelegate; },
			set: function setIsDelegate(val) {
				if (!this.isLocked)
					internal.get(this).isDelegate = val;
			}
		},
		/**
		 * @memberof Box
		 * @property {string} type - String identifying the data type expected
		 * returned when calling, getting or setting this member.
		 */
		type: {
			enumerable: true,
			get: function getType() { return internal.get(this).type; },
			set: function setType(val) {
				if (!this.isLocked) {
					if (isValidType(val, this.value))
						internal.get(this).type = val;
					else
						throw new ClassDefError("Failed to match type '" + val +"' to value '" + this.value +"'!");
				}
			}
		},
		/**
		 * @memberof Box
		 * @property {Object} value - Default value of member.
		 * @readonly
		 */
		value: {
			enumerable: true,
			get: function getValue() { return internal.get(this).value; }
		},
		/**
		 * Generates a string version of the values in this box for printing in
		 * a log or console.
		 * @memberof Box
		 * @function toString
		 * @returns {string}
		 * @readonly
		 */
		toString: {
			enumerable: true,
			value: function toString() {
				var typeName = "<unknown>";
				if (this.type instanceof Function) {
					if (this.type.isClass) {
						typeName = this.type.__name;
					}
					else {
						typeName = this.type.name;
					}
				}

				var retval = {
					isPrivate: !!this.isPrivate,
					isProtected: !!this.isProtected,
					isPublic: !!this.isPublic,
					isStatic: !!this.isStatic,
					isFinal: !!this.isFinal,
					isProperty: !!this.isProperty,
					isDelegate: !!this.isDelegate,
					type: typeName,
					value: JSON.stringify(this.value)
				}

				return JSON.stringify(retval, null, '\t');
			}
		}
	});

	Object.seal(retval);
	return retval;
})();

function modifyBox(box, params, val) {
	box = box || new Box({
		privilege: Privilege.Public,
		isFinal: false,
		isAbstract: false,
		isStatic: false,
		isProperty: false,
		isDelegate: false,
		type: null,
		value: val
	});

	for (var key in params) {
		if (params.hasOwnProperty(key) && (key in box) && key != "value")
			box[key] = params[key];
	}

	return box;
}

module.exports = (function Class() {
	/**
	 * Class - A constructor factory designed to create functions that
	 * themselves create fully encapsulating, classical classes in JavaScript.
	 * It is not necessary to use 'new' when calling Class(...), but doing so
	 * will not interfere with how Class functions.
	 *
	 * @class Class
	 * @param {string=} name - Name of the new Class constructor function.
	 * @param {object} definition - Object describing the Class structure.
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

		var retval = generateTypeConstructor(name);
		var scopes = generateScopes(retval, definition);
		generateMetaData(retval, name, definition);
	}

	/**
	 * Private - An access modifier function. Causes val to be encapsulated as
	 * only being accessible to direct instances of the class being described.
	 *
	 * @memberof Class
	 * @function
	 * @param {*} val - A Boxed or unboxed value.
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
	 */
	function Type(type, val) {
		var retval = null;

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
	}

	Initialize(Class);
	Object.defineProperties(Class, {
		Initialize: {
			enumerable: true,
			value: Initialize
		}
	});

	Object.freeze(Class);
	return Class;
})();
