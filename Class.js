/**
 * Class.js is the distillation of my ideas on how to implement private data in
 * ES 6 environments. This will be the 4th major distillation, each representing
 * a different idea on how to accomplish the goal. This time, it's based on the
 * idea of creating an exotic object that is a normal property of the instance.
 */

const PrivateStore = require("./lib/PrivateStore");

if (!("Class" in Symbol)) {
	Object.defineProperty(Symbol, "Class", {
		enumerable: true,
		value: {}
	});
	Object.defineProperties(Symbol.Class, {
		privateKey: {
			enumerable: true,
			value: Symbol("Class.privateKey")
		},
		protectedKey: {
			enumerable: true,
			value: Symbol("Class.protectedKey")
		},
		classObject: {
			enumerable: true,
			value: Symbol("Class.classObject")
		},
		privateMembers: {
			enumerable: true,
			value: Symbol("Class.privateMembers")
		},
		protectedMembers: {
			enumerable: true,
			value: Symbol("Class.protectedMembers")
		},
		instance: {
			enumerable: true,
			value: Symbol("Class.instance")
		},
		static: {
			enumerable: true,
			value: Symbol("Class.static")
		},
		constructor: {
			enumerable: true,
			value: Symbol("Class.Constructor")
		}
	});
}

function getCleanStack(offset = 0) {
	let limit = Error.stackTraceLimit;
	Error.stackTraceLimit = 50;

	let retval = Error().stack.split('\n');
	while (!retval[0].includes("getCleanStack"))
		retval.shift();

	Error.stackTraceLimit = limit;

	return retval.slice(1 + offset);
}

const Class = (() => {
	const IDENTITY = Symbol();				//Used to test Proxies against non-proxies
	const ClassSignature = Symbol();		//Used to recognize proxy objects
	const signatures = new WeakMap;			//Per class, private store keys
	const protectedMembers = new WeakMap;	//Maps for connecting protected accessors
	const wrappers = new WeakMap;			//Mapping from wrappers to original functions
	const frames = new WeakMap;				//Stack frames for target functions
	const callStack = [];					//Last called monitored functions
	const ctorStack = [];					//Last called constructors

	/**
	 * Wraps a function with a wrapper that captures the call stack
	 * so that this call to a member function can be authorized from
	 * private access.
	 * @param {function} fn - The target function to be wrapped.
	 * @param {boolean} construct - If true, fn is called using `new`.
	 * @returns A wrapped version of the original function.
	 */
	function getWrapper(fn, construct) {
		let retval = function (...args) {
			frames.set(fn, getCleanStack(1));
			callStack.push(fn);
			let retval = (construct) ? Reflect.construct(fn, args, new.target)
									 : fn.call(this, ...args);
			callStack.pop();
			frames.delete(fn);
			return retval;
		}
		
		//Mask the wrapper function to look like the original.
		Object.defineProperties(retval, {
			toString: {
				enumerable: true,
				writable: true,
				value: () => fn.toString()
			},
			name: {
				configurable: true,
				value: fn.name
			},
			length: {
				configurable: true,
				value: fn.length
			}
		});
		retval.prototype = fn.prototype;
		Object.setPrototypeOf(retval, Object.getPrototypeOf(fn));
		wrappers.set(retval, fn);

		return retval;
	}

	/**
	 * Compares the current stack trace to the stack trace for the 
	 * most recently called Class-managed class member function.
	 * @returns A boolean specifying whether or not the test passed.
	 */
	function testStack() {
		let stack = getCleanStack(4);
		let fn = callStack[callStack.length - 1];
		let stack2 = frames.get(fn);
		return !!stack2 && (stack2.join('\n') == stack.join('\n'));
	}

	/**
	 * Creates a property descriptor for an accessor property to access a
	 * target property on a given object.
	 *
	 * @param {Object} src - the object with the target property
	 * @param {string|Symbol} key - name of the target property
	 * @returns {Object} for use with Object.defineProperty.
	 */
	function makeLinkDesc(src, key) {
		return {
			get() { return Reflect.get(src, key, this); },
			set(v) { Reflect.set(src, key, v, this); }
		};
	}

	/**
	 * Creates an accessor property from src\[key\] to dest\[name\] that
	 * preserves the value of the context object.
	 * @param {string|Symbol} key - Target key being linked
	 * @param {string|Symbol} name - Friendly name for the target key
	 * @param {Object} src - Object containing the target property
	 * @param {Object} dest - Object to receive the link to src
	 */
	function link(key, name, src, dest) {
		Object.defineProperty(dest, name, makeLinkDesc(src, key));
	}
	
	/**
	 * Links all protected properties to the private container for use in the
	 * current instance being constructed.
	 * @param {Object} src - The object with the target properties
	 * @param {Object} dest - The object to receive the target properties 
	 * @param {Object} param2 - The metadata object with information about the
	 * properties being targeted.
	 */
	function linkProtected(src, dest, { own, inherited, map }) {
		for (let name of own) {
			link(name, name, src, dest);
		}
		
		Object.assign(src, inherited);
		for (let name in inherited) {
			link(name, map[name], src, dest);
		}
	}

	/**
	 * Ensures the wrapping of all class methods and accessor functions so the stack
	 * trace can be collected consistently.
	 * @param {Function} clazz - constructor of the class whose methods need preparing. 
	 * @param {*} obj - The object holding the methods to prepare.
	 */
	function prepareMethods(clazz, obj) {
		let keys = getRelevantKeys(obj);
		for (let key of keys) {
			let desc = Object.getOwnPropertyDescriptor(obj, key);
			if (desc) {
				for (let prop of ["value", "get", "set"]) {
					let fn = desc[prop];
					if ((prop in desc) && (typeof(fn) == "function")) {
						let construct = key == "constructor";
						
						//Stamp the class identitiy on the function.
						Object.defineProperty(fn, Symbol.Class.classObject, {
							value: clazz
						});
						//Wrap the function so we can authorize access for it as needed.
						desc[prop] = getWrapper(fn, construct);
						Object.defineProperty(obj, key, desc);
						if (construct) {
							let fnKeys = getRelevantKeys(fn);
							for (let fnKey of fnKeys) {
								let fnDesc = Object.getOwnPropertyDescriptor(fn, fnKey);
								Object.defineProperty(desc[prop], fnKey, fnDesc);
							}
							prepareMethods(clazz, desc[prop]);
						}
					}
				}
			}
		}
	}

	/**
	 * Gets all the non-special own keys from an object.
	 * @param {Object} obj - The object from which to retrieve the keys.
	 * @returns {Array} of keys
	 */
	function getRelevantKeys(obj) {
		return Object.getOwnPropertyNames(obj)
					 .concat(Object.getOwnPropertySymbols(obj))
					 .filter(name => (name == "constructor") ||
					 				 (name != "prototype") &&
									 (!Function.prototype.hasOwnProperty(name) &&
									  !Object.values(Symbol.Class).includes(name)));
	}

	function initInheritedProtected(bClazz, bProtKey, protInit, { owner, type, info }) {
		let bInfo = protectedMembers.get(owner);
		let bProtData = bClazz[bProtKey] || {};

		let inherit = (mbrKeys, container, mapHasName) => {
			for (let bMbrKey of mbrKeys) {
				let ufName = mapHasName ? bInfo.map[bMbrKey] : bMbrKey;
				let desc = Object.getOwnPropertyDescriptor(container, bMbrKey);
				let name = Symbol(`${bClazz.name}.$${ufName.toString()}`);
				
				info.map[name] = ufName;
				if (desc) {
					Object.defineProperty(info.inherited, name, desc);
				}
				else {
					link(bMbrKey, name, protInit[type], info.inherited);
				}
			}
		}

		//Map all of the "own" protected members into our inheritance
		inherit(bInfo.own, bProtData);
		//Map all of the "inherited" protected members into our inheritance
		inherit(Object.getOwnPropertySymbols(bInfo.inherited), bInfo.inherited, true);
	}
	
	/**
	 * This is the complete list of every reasonably inheritable class 
	 * in ES, plus Class and null. These base classes represent a stopping point
	 * because its impossible for any of them to have inherited from Class.
	 */
	const BaseClasses = Object.getOwnPropertyNames(global)
							  .filter(name => /^[A-Z]\w+[a-z]$/.test(name) && 
									  (typeof(global[name]) == "function"))
							  .map(name => global[name])
							  .concat([Class, null]);


	function Class(clazz) {
		if (this instanceof Class)
			throw new TypeError("Class is not a constructor.");
		if (typeof (clazz) != "function")
			throw new TypeError("Class requires a constructor function as a parameter");
		if (clazz.hasOwnProperty(Symbol.Class.privateKey))
			throw new TypeError("The constructor function already has a private key!");

		/**
		 * This code substitutes for ClassDefinitionEvaluation. Start by
		 * generating the privateKey and class signature.
		 */
		Object.defineProperties(clazz, {
			[Symbol.Class.privateKey]: {
				value: Symbol(`${clazz.name} Private Key`)
			},
			[Symbol.Class.protectedKey]: {
				value: Symbol(`${clazz.name} Protected Key`)
			}
		});
		signatures.set(clazz, Symbol(`${clazz.name} Signature`));

		/**
		 * Wrap all the member and static member functions, and stamp them
		 * with the identity for the class. We'll be using that later to
		 * verify permissions and access the correct PrivateStore.
		 */
		for (let obj of [clazz.prototype, clazz]) {
			prepareMethods(clazz, obj);
		}

		/**
		 * We need to link the protected members to the private container with
		 * an accessor. Descendant classes will link back to the protected data
		 * via a Symbol-named accessor property created in that class's private
		 * container.
		 */
		let newTarget = Object.getPrototypeOf(clazz);
		newTarget = BaseClasses.includes(newTarget) ? null : 
					newTarget.toString().includes("[native code]") ? null : newTarget;
		let hasCProt = clazz.hasOwnProperty(Symbol.Class.protectedMembers);
		let hasBProt = !!newTarget && (newTarget[IDENTITY] !== clazz) && 
						newTarget[IDENTITY].hasOwnProperty(Symbol.Class.protectedMembers);
		let pvtKey = clazz[Symbol.Class.privateKey];
		let sig = signatures.get(clazz);
		let pvtInit = clazz[Symbol.Class.privateMembers]();
		let pvtData = pvtInit[Symbol.Class.static] || {};
		
		//If this class has non-public properties...
		if (hasCProt || hasBProt || pvtInit.hasOwnProperty(Symbol.Class.static)) {
			Object.defineProperty(clazz, pvtKey, {
				value: new PrivateStore(sig, pvtData)
			});
			
			prepareMethods(clazz, pvtData);
		}		
		
		//If this class has protected properties...
		if (hasCProt || hasBProt) {
			let sInfo = { own: [], inherited: {}, map: {}};
			let iInfo = { own: [], inherited: {}, map: {}};
			let protInit = (clazz[Symbol.Class.protectedMembers] || (() => { return {}; }))();
			let protData = {};

			//Collect info about this class's own protected members
			if (hasCProt) {
				protData = protInit[Symbol.Class.static] || protData;

				let initOwnProtected = (obj, { type, info }) => {
					if (obj.hasOwnProperty(type)) {
						let ownData = obj[type];
						info.own = Object.getOwnPropertyNames(ownData)
										 .concat(Object.getOwnPropertySymbols(ownData));
					}
				}
				
				for (let pair of [{ type: Symbol.Class.static, info: sInfo },
								  { type: Symbol.Class.instance, info: iInfo }]) {
					initOwnProtected(protInit, pair);
				}
			}
			
			//Now collect info about any inherited members
			if (hasBProt) {
				let bClazz = newTarget[IDENTITY];
				let bPvtKey = bClazz[Symbol.Class.privateKey];
				let bProtKey = bClazz[Symbol.Class.protectedKey];
				let bSig = signatures.get(bClazz);
				let bPvtData = bClazz[bPvtKey];
				let protInit = (bClazz[Symbol.Class.protectedMembers] || (() => { return {}; }))();

				bPvtData[bSig] = true;
				try {
					//Pull in all of the static inheritance
					initInheritedProtected(bClazz, bProtKey, protInit, { owner: bClazz, type: Symbol.Class.static, info: sInfo });
					// for (let set of [{ owner: bClazz, type: Symbol.Class.static, info: sInfo },
					// 				  { owner: bClazz.prototype, type: Symbol.Class.instance, info: iInfo }]) {
					// 	initInheritedProtected(bClazz, bProtKey, protInit, set);
					// }
				}
				finally {
					bPvtData[bSig] = false;
				}
			}

			//Link all of the static protected members into the static private data.
			linkProtected(protData, pvtData, sInfo);
			//Add the protected data maps.
			protectedMembers.set(clazz, sInfo);
			protectedMembers.set(clazz.prototype, iInfo);
		}

		const pHandler = new Proxy({}, {
			get(t, handler, r) {
				return (...args) => {
					let [target, prop] = args;
					let retval, clazz;
					let constructing = ctorStack.length > 0;

					if ((handler == "has") && (prop === ClassSignature)) {
						retval = true;
					}
					else if (!constructing && prop && (typeof (prop) == "string")
						&& prop.length && (prop[0] == '$')) {
						//This is an access attempt on a private member!
						if (handler == "get")
							retval = void 0;
						else
							retval = false;

						/**
						 * This is the ES equivalent of getting the [[ClassObject]] from
						 * the environment record. Clumbsy though it may be, it should
						 * work on any platform.
						 */
						if (testStack()) {
							clazz = callStack[callStack.length - 1][Symbol.Class.classObject];
						}

						if (typeof (clazz) == "function") {
							let pvt = target[clazz[Symbol.Class.privateKey]];
							let sig = signatures.get(clazz);

							if (!pvt || !sig) {
								throw new TypeError("Unsigned class encountered.");
							}
							if (["defineProperty", "deleteProperty", "has"].includes(handler)) {
								throw new TypeError(`Attempted "${handler}" on a private field.`);
							}

							console.log(`handler = "${handler}"`);
							args[0] = pvt;
							args[1] = prop.substring(1);
							pvt[sig] = true;
							try {
								retval = Reflect[handler](...args);
							} finally {
								pvt[sig] = false;
							}
						}
					}
					else if (prop === IDENTITY) {
						retval = wrappers.get(target);
					}
					else {
						retval = Reflect[handler](...args);
					}

					return retval;
				}
			}
		});

		let ctor = clazz.prototype.constructor || getWrapper(clazz, true);

		/**
		 * Last step. To make this somewhat ergonomic, were going to hijack
		 * `$` to mean "private" when it's the first characterof the name. it
		 * could just as easily be `_`, but that's already being used publicly. 
		 */
		return new Proxy(ctor, new Proxy({
			filter(obj, keys) {
				let retval = {};
				for (let key of keys) {
					Object.defineProperty(retval, key.substring(1), Object.getOwnPropertyDescriptor(obj, key));
					delete obj[key];
				}
				return retval;
			},
			construct(target, args, newTarget, context) {
				let pvtKey = clazz[Symbol.Class.privateKey];
				let protKey = clazz[Symbol.Class.protectedKey];
				let sig = signatures.get(clazz);
				if (!pvtKey || !protKey || !sig) {
					throw new TypeError("Unsigned class encountered in the inheritance chain.");
				}

				let pvtInit = clazz[Symbol.Class.privateMembers]();
				let protInit = clazz.hasOwnProperty(Symbol.Class.protectedMembers)
					? clazz[Symbol.Class.protectedMembers]()
					: {};
				let rval;
				ctorStack.push(clazz);
				if (context) {
					Reflect.apply(target, context, args);
					rval = context;
				}
				else {
					rval = Reflect.construct(target, args, newTarget);
				}

				Object.hasOwnProperty(rval, pvtKey, {
					value: new PrivateStore(sig, pvtInit[Symbol.Class.instance])
				});

				if (protInit.hasOwnProperty(Symbol.Class.instance)) {
					let pdata = protectedMembers.get(clazz.prototype);

					Object.defineProperty(rval, protKey, {
						value: new PrivateStore(sig, protInit[Symbol.Class.instance])
					});
					linkProtected(rval[protKey], rval[pvtKey], pdata);
				}	

				ctorStack.pop();

				return new Proxy(rval, pHandler);
			},
			apply(target, context, args) {
				let retval;
				if (clazz === target) {
					retval = this.construct(target, args, target, context);
				}
				else {
					retval = Reflect.apply(target, context, args);
				}

				return retval;
			}
		}, {
			get(t, handler, r) {
				return ["constructor", "apply", "filter"].includes(handler)
					? Reflect.get(t, handler, r)
					: (...args) => {
					let [target, prop] = args;
					let retval, clazz;
					let constructing = ctorStack.length > 0;

					if ((handler == "has") && (prop === ClassSignature)) {
						retval = true;
					}
					else if (!constructing && prop && (typeof (prop) == "string")
						&& prop.length && (prop[0] == '$')) {
						//This is an access attempt on a private member!
						if (handler == "get")
							retval = void 0;
						else
							retval = false;

						/**
						 * This is the ES equivalent of getting the [[ClassObject]] from
						 * the environment record. Clumbsy though it may be, it should
						 * work on any platform.
						 */
						if (testStack()) {
							clazz = callStack[callStack.length - 1][Symbol.Class.classObject];
						}

						if (typeof (clazz) == "function") {
							target = wrappers.get(target) || target;
							let pvt = target[clazz[Symbol.Class.privateKey]];
							let sig = signatures.get(clazz);

							if (!pvt || !sig) {
								throw new TypeError("Unsigned class encountered.");
							}
							if (["defineProperty", "deleteProperty", "has"].includes(handler)) {
								throw new TypeError(`Attempted "${handler}" on a private field.`);
							}

							console.log(`handler = "${handler}"`);
							args[0] = pvt;
							args[1] = prop.substring(1);
							pvt[sig] = true;
							try {
								retval = Reflect[handler](...args);
							} finally {
								pvt[sig] = false;
							}
						}
					}
					else if (prop === IDENTITY) {
						retval = wrappers.get(target);
					}
					else {
						retval = Reflect[handler](...args);
					}

					return retval;
				}
			}
		}));
	}

	return Class;
})();

module.exports = Class;
