/*
 * Add a new "well-known symbol" to:
 * a. define the key where the name of the inheritance data field will be stored, and
 * b. define the key where a function containing the data definition can be found.
 */
Object.defineProperty(Symbol, "inherit",  { value: Symbol() });
Object.defineProperty(Symbol, "classData",  { value: Symbol() });

/**
 * Creates a wrapped class definition to allow for the use of private and protected
 * properties
 * @param {class} def - the class for which to enable non-public data.
 * @returns {function} - a function that acts as the class constructor.
 * @description
 * To add data properties and private methods to the class, add a static
 * function to the class with name Symbol.inherit. This function must return an
 * object if it exists.
 * 
 *   class Example {
 *     static [Symbol.classData]() {
 *       return {
 *         ['private static field1']: "static data", 
 *         ['private field2']: "data", 
 *         ['private static method1']() {....}, 
 *         ['private method2']() {....}, 
 *         ['protected static field3']: "42", 
 *         ['protected method4']() {....}, 
 *         ['protected static field3']: "42", 
 *         ['protected method4']() {....}, 
 *         ['static field3']: "42", 
 *         field3: "data"
 *       };
 *     }
 *   }
 */
module.exports = function Class(def) {
	const inheritanceField = `${def.name}-Inheritance`;
	/**
	 * Puts the non-private static members of this class on a derived class.
	 * @param {function} base - Should be the base class being derived from.
	 * @param {Symbol} flag - Should be <classname>[inheritanceField].
	 * @param {function} subClass - Should be the derived class being created.
	 * @returns {boolean} - a true/false flag telling whether or not derived
	 * class creation was detected.
	 */
	function isStaticInheritance(base, flag, subClass) {
		var retval = false;
		if ((flag === base[inheritanceField]) &&
			(typeof(subClass) == "function") &&
			(subClass.prototype instanceof base)) {
			subClass[base[inheritanceField]] = pvt.get(base.prototype).static;
			retval = true;
		}
		return retval;
	}

	/**
	 * Migrates inheritance from base into the prototype of container.
	 * @param {object} obj - the object hosting the inheritance data.
	 * @param {function} base - the constructor of the base class.
	 * @param {object} container - the private container for this class.
	 * @param {boolean} wantStatic - a flag to determine which fields to inherit.
	 */
	function getInheritance(obj, base, container, wantStatic) {
		if (obj[base[inheritanceField]]) {
			let group = (!!wantStatic) ? 'static' : 'nonStatic';
			let inheritable = obj[base[inheritanceField]][group];
			let inheritKeys = Object.getOwnPropertyNames(inheritable);

			//Copy the inheritables into our inheritance.
			for (let key of inheritKeys) {
				Object.defineProperty(container, key, Object.getOwnPropertyDescriptor(inheritable, key));
			}

			if (!wantStatic) {
				delete obj[base[inheritanceField]];
			}
		}

		return container;
	}

	function processInheritables(desc, owner, construct) {
		var pvt = {
			[handler.proxy]: null,
			proto: {},
			ctor: {},
			shared: {
				proto: [],
				ctor: []
			}
		};
		for (let descKey in desc) {
			let tokens = descKey.split(' ');
			let key = tokens.pop();
			let descriptor = Object.getOwnPropertyDescriptor(desc, descKey);

			for (let i=0; i<tokens.length; ++i) {
				switch(tokens[i]) {
					case "private":
						descriptor.private = true;
						break;
					case "protected":
						descriptor.private = true;
						descriptor.shared = true;
						break;
					case "static":
						descriptor.static = true;
						break;
					case "readonly":
						if (("get" in descriptor) || (set in descriptor)) {
							throw new TypeError(`Invalid property modifier "${tokens[i]}" in property ${descKey}`);
						}
						descriptor.writable = false;
						break;
					case "final":
						descriptor.configurable = false;
						break;
					default:
						throw new TypeError(`Invalid property modifier "${tokens[i]}" in property ${descKey}`);
				}
			}

			let dest = (descriptor.static) ? 'ctor' : 'proto';
			if (descriptor.shared || !descriptor.private) {
				pvt.shared[dest].push(key);
			}
			if (!descriptor.private) {
				Object.defineProperty(owner, key, descriptor);
			}
			else if (construct) {
				Object.defineProperty(pvt[dest], key, descriptor);
			}
		}

	}

	const getInheritance = (def[Symbol.inherit] || (() => new Object())).bind(def);
	processInheritables(getInheritance(), def.prototype, true);

	var handler = {
		proxy: Symbol(),
		owner: Symbol(),
		slots: new WeakMap(),
		construct(target, args, newTarget) {
			/* This is a sneaky trick. By sending newly a proxied prototype
			 * via newTarget, I can catch attempts to access private properties
			 * and provide them.
			 */
			var pseudoNT = {
				[handler.owner]: instance,
				__proto__: newTarget.prototype
			};
			handler.slots.set(pseudoNT, processInheritables(getInheritance(), newTarget.prototype, true));
			var instance = Reflect.construct(target, args, {
				prototype: ntProxy
			});
			var retval = new Proxy(instance, handler);
			//We're done snooping around. Put the original prototype back.
			Object.setPrototypeOf(retval, newTarget.prototype);
			//Make sure we can map back and forth from Proxy to target at will.
			handler.slots.set(retval, instance);
			handler.slots.set(instance, handler.slots.get(ntProxy));
			handler.slots.get(instance)[handler.proxy] = retval;
			return retval;
		},
		get(target, prop, receiver) {
			var retval;
			var inst = target;
			if (handler.owner in target) {
				inst = target[handler.owner];
			}

			if (!handler.slots.has(inst)) {
				handler.initPrivate(inst);
			}
			if (prop in inst) {
				retval = Reflect.get(inst, prop, receiver);
			}
			else {
				retval = handler.get(inst)[prop];
			}
			return retval;
		},
		set(target, prop, value, receiver) {
			var retval = false;
			var inst = target;
			if (handler.owner in target) {
				inst = target[handler.owner];
			}

			if (!handler.slots.has(inst)) {
				handler.initPrivate(inst);
			}
			if (prop in inst) {
				retval = Reflect.get(inst, prop, value, receiver);
			}
			else {
				handler.get(inst)[prop] = value;
				retval = true;
			}
			return retval;
		},
		apply(target, thisArg, args) {}
	};
	var pDef = new Proxy(def, handler);
	var _class = Object.assign(function () {
		var retval = new pDef();	
		var proto = Object.getPrototypeOf(retval);
		Object.setPrototypeOf(retval, new Proxy(proto, handler));
		return retval;
	}, {
		name: def.name,
		length: def.length,
		toString() { return def.toString(); }
	});

	Object.defineProperty(_class, Symbol.inherit, { value: Symbol(`${def.name}-Inheritance`) });
	Object.defineProperty(_class, _class[Symbol.inherit], {})
};

Object.defineProperties(module.exports, {

});