/*
 * Add a new "well-known symbol" to:
 * a. define the key where the name of the inheritance data field will be stored, and
 * b. define the key where a function containing the data definition can be found.
 */
Object.defineProperty(Symbol, "inherit",  { value: Symbol('Class::inherit') });
Object.defineProperty(Symbol, "classData",  { value: Symbol('Class::classData') });
Object.defineProperty(Symbol, "signature", { value: Symbol('Class::signature') });

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
	const signature = Symbol(`${def.name}-Signature`);

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

	function processInheritables(target, desc, pDest, construct) {
		var pvt = {
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
				if (descriptor.static)
					Object.defineProperty(pDest.constructor, key, descriptor);
				else
					Object.defineProperty(pDest, key, descriptor);
			}
			else if (construct) {
				Object.defineProperty(pvt[dest], key, descriptor);
			}
		}

		handler.slots.set(target, pvt);
	}

	function getPrivates(pvt, key) {
		var retval = {};
		Object.assign(retval, pvt[key]);
		Object.assign(retval, { [Symbol.inherit]: pvt.shared[key] });
		return retval;
	}

    function getStackTrace() {
        var retval = {};
        if (Error.hasOwnProperty("prepareStackTrace")) {
            let original = Error.prepareStackTrace;
            function prepareStackTrace(err, trace) {
                var retval;

                err.stackTrace = trace;
                if (typeof(original) == "function") {
                    retval = original.bind(Error)(err, trace);
                    Error.prepareStackTrace = original;
                }

                return retval;
            }
            Error.prepareStackTrace = prepareStackTrace;
            ({ stack: retval.stack, stackTrace: retval.stackTrace } = new Error());
        }
        else {
            retval.stack = (new Error()).stack;
        }

        return retval;
	}
	
	function getRequestingFnSignature() {
		//This only exists because Function.caller has been deprecated.
		//It's only approximate and can be spoofed under the right conditions.
		var retval;
		if (handler.fnStack.length) {
			let err = getStackTrace();
			let currentFn = handler.fnStack[0].target;
			if (err.stackTrace) {
				let frame = err.stackTrace[4];
				let frameFn = (frame) ? frame.getFunction() : undefined;
				let frameFnName = frame.getFunctionName();
				if (((typeof(frameFn) == "function") && (frameFn === currentFn)) || 
					(frameFnName == currentFn.name) ||
					((currentFn.name.length === 0) &&
					 (/<anonymous>/.test(frameFnName)))) {
					retval = currentFn[Symbol.signature];
				}
			}
			else {
				try {
					let frame = err.stack.split('\n')[5];
					let regex = new RegExp(`${currentFn.name || "<anonymous>"}`);
					if (regex.test(frame))
						retval = currentFn[Symbol.signature];
				}
				catch(e) { /* Do Nothing! */ }
			}
		}
		return retval;
	}

	const getInheritables = (def[Symbol.classData] || (() => new Object())).bind(def);

	var handler = {
		proxy: Symbol('handler.proxy'),
		owner: Symbol('handler.owner'),
		slots: new WeakMap(),
		fnStack: [],
		pseudoNT: null,
		canAccessPrivate(target) {
			var retval = this.slots.has(target);
			if (retval) {
				let sig = getRequestingFnSignature();
				retval = (sig === target[Symbol.signature]);
			}
			return retval;
		},
		construct(target, args, newTarget) {
			/* This is a sneaky trick. By sending newly a proxied prototype
			 * via newTarget, I can catch attempts to access private properties
			 * and provide them.
			 */
			this.fnStack.unshift(target);
			var prototype = newTarget.prototype;
			this.pseudoNT = function() {};
			this.pseudoNT[Symbol.signature] = target[Symbol.signature];
			this.pseudoNT.prototype = new Proxy({
				[Symbol.signature]: target[Symbol.signature],
				[this.owner]: instance,
				__proto__: prototype
			}, handler);
			processInheritables(this.pseudoNT, getInheritables(), prototype, true);
			let map = this.slots;
			let pvt = map.get(this.pseudoNT);
			map.set(newTarget, target);
			map.set(target, getPrivates(pvt, 'ctor'));
			map.get(target)[this.proxy] = newTarget;
			var instance = Reflect.construct(target, args, this.pseudoNT);
			var retval = new Proxy(instance, handler);
			instance[Symbol.signature] = target[Symbol.signature];
			//We're done snooping around. Put the original prototype back.
			Object.setPrototypeOf(retval, prototype);
			//Make sure we can map back and forth from Proxy to target or constructor at will.
			map.set(retval, instance);
			map.set(instance, getPrivates(pvt, 'proto'));
			map.get(instance)[this.proxy] = retval;
			map.delete(this.pseudoNT);
			this.pseudoNT = null;
			this.fnStack.unshift();
			return retval;
		},
		get(target, prop, receiver) {
			var retval;

			//Own properties come first...
			if (target.hasOwnProperty(prop)) {
				retval = Reflect.get(target, prop, receiver);
			}
			else {	//Private properties next....
				let priv = this.slots.get(target);
				if (!priv) || getPrivates(this.slots.get(this.pseudoNT), 'proto');
				if (this.canAccessPrivate(p) && priv.hasOwnProperty(prop)) {
					retval = priv[prop];
				}
				else {	//Do the default in every other case
					retval = Reflect.get(target, prop, receiver);
					//We need to return the proxy if it's a constructor request
					if ((prop == "constructor") && this.slots.has(retval)) {
						retval = this.slots.get(retval)[this.proxy];
					}
				}
			}

			if ((typeof(retval) == "function") && (Object.getPrototypeOf(target)[prop] === retval)) {
				retval = new Proxy(retval, handler);
			}

			return retval;
		},
		set(target, prop, value, receiver) {
			var retval;

			//Own properties come first...
			if (target.hasOwnProperty(prop)) {
				retval = Reflect.set(target, prop, value, receiver);
			}
			else {	//Private properties next....
				let priv = handler.slots.get((this.pseudoNT) ? this.pseudoNT : target);
				if (this.canAccessPrivate(target) && priv.hasOwnProperty(prop)) {
					priv[prop] = value;
					retval = true;
				}
				else {	//Do the default in every other case
					retval = Reflect.set(target, prop, value, receiver);
				}
			}
			return retval;
		},
		apply(target, context, args) {
			var branded = (target[Symbol.signature] === context[Symbol.signature])
			branded && this.fnStack.unshift({ target, context });
			var retval = Reflect.apply(target, context, args);
			branded && this.fnStack.shift();
			return retval;
		}
	};

	processInheritables(def.prototype, getInheritables(), def.prototype);

	var keys = Object.getOwnPropertyNames(def.prototype).concat(Object.getOwnPropertySymbols(def.prototype));
	for (let key of keys) {
		if (typeof(def.prototype[key]) == "function") {
			Object.defineProperty(def.prototype[key], Symbol.signature, { value: signature });
		}
	}

	var pDef = new Proxy(def, handler);
	var _class = function () {
		var retval = new pDef();	
		var proto = Object.getPrototypeOf(retval);
		Object.setPrototypeOf(retval, new Proxy(proto, handler));
		return retval;
	};

	Object.defineProperties(_class, {
		constructor: { value: _class },
		prototype: { value: def.prototype },
		name: { value: def.name},
		length: { value: def.length },
		toString: { value: function toString() { return def.toString(); } },
		[Symbol.inherit]: { value: Symbol(`${def.name}-Inheritance`) }
	});
	Object.defineProperty(_class, _class[Symbol.inherit], { value : {} });

	return _class;
};
