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
	const ClassSignature = Symbol();		//Used to recognize proxy objects
	const signatures = new WeakMap;			//Per class, private store keys
	const protectedMembers = new WeakMap;	//
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
			frames.set(fn, getCleanStack(1))
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
	 * Creates an accessor property from src\[key\] to dest\[name\] that
	 * preserves the value of the context object.
	 * @param {string|Symbol} key - Target key being linked
	 * @param {string|Symbol} name - Friendly name for the target key
	 * @param {Object} src - Object containing the target property
	 * @param {Object} dest - Object to receive the link to src
	 */
	function link(key, name, src, dest) {
		Object.defineProperty(dest, name, {
			get() { return Reflect.get(src, key, this); },
			set(v) { Reflect.set(src, key, v, this); }
		});
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
		if (clazz.hasOwnProperty(Symbol.privateKey))
			throw new TypeError("The constructor function already has a private key!");

		/**
		 * This code substitutes for ClassDefinitionEvaluation. Start by
		 * generating the privateKey and class signature.
		 */
		Object.defineProperties(clazz, {
			[Symbol.privateKey]: {
				value: Symbol(`${clazz.name} Private Key`)
			},
			[Symbol.protectedKey]: {
				value: Symbol(`${clazz.name} Protected Key`)
			}
		});
		signatures.set(clazz, Symbol(`${clazz.name} Signature`));

		/**
		 * We need to link the protected members to the private container with
		 * an accessor. Descendant classes will link back to the protected data
		 * via a Symbol-named accessor property created in that class's private
		 * container.
		 */
		let newTarget = Object.getPrototypeOf(clazz);
		newTarget = BaseClasses.includes(newTarget) ? null : newTarget;
		let hasCProt = clazz.hasOwnProperty(Symbol.Class.protectedMembers);
		let hasBProt = (newTarget !== clazz) && 
						newTarget.hasOwnProperty(Symbol.protectedMembers);
		if (hasCProt || hasBProt) {
			let sProtInit = {};
			let iData = { own: [], inherited: {}, map: {}};
			let sData = { own: [], inherited: {}, map: {}};

			
			if (hasCProt) { //If the class has protected members
				let cPrivData = clazz[Symbol.Class.privateMembers]();
				let cProtData = clazz[Symbol.Class.protectedMembers]();
				
				function stageStatic(cls) {
					if (cProtData.hasOwnProperty(Symbol.Class.static)) {
						let protMembers = cProtData[Symbol.Class.static];
						Object.assign(sProtInit, protMembers);
					}
				}

				stageStatic(clazz);
				
				if (hasBProt) {
					stageStatic(newTarget);
				}

				linkProtected(cProtData, cPrivData, sData);
			}
			if (hasBProt) {
				let pdata = protectedMembers.get(newTarget);

				function makeAccessor(key) {
					let nKey = Symbol();
					data.map[nKey] = pdata.map[key] || key;
					data.inherited[nKey] = {
						enumerable: true,
						get() {
							let target = this[newTarget[Symbol.Class.protectedKey]];
							return Reflect.get(target, key, this); 
						},
						set(v) { 
							let target = this[newTarget[Symbol.Class.protectedKey]];
							Reflect.set(target, key, v, this);
						}
					};
					Object.defineProperty(iProtInit, nKey, data.inherited[nKey]);
				}
				
				for (let key of pdata.own) {
					makeAccessor(key);
				}
				
				for (let key in pdata.inherited) {
					let nKey = Symbol();
					data.map[nKey] = pdata.map[key] || key;
					data.inherited[nKey] = pdata.inherited[key];
					Object.defineProperty(iProtInit, key, pdata.inherited[key]);
				}
			}
		}

		/**
		 * Wrap all the member and static member functions, and stamp them
		 * with the identity for the class. We'll be using that later to
		 * verify permissions and access the correct PrivateStore.
		 */
		for (let obj of [clazz.prototype, clazz]) {
			let keys = Object.getOwnPropertyNames(obj)
				.concat(Object.getOwnPropertySymbols(obj))
				.filter(name => (name == "constructor") ||
					(!Function.prototype.hasOwnProperty(name) &&
						(name != Symbol.classObject)));
			for (let key of keys) {
				let desc = Object.getOwnPropertyDescriptor(obj, key);
				if (desc) {
					for (let prop of ["value", "get", "set"]) {
						if ((prop in desc) && (typeof (desc[prop]) == "function")) {
							//Stamp the class identitiy on the function.
							Object.defineProperty(desc[prop], Symbol.classObject, {
								value: clazz
							});
							//Wrap the function so we can authorize access for it as needed.
							desc[prop] = getWrapper(desc[prop], key == "constructor");
							Object.defineProperty(obj, key, desc);
						}
					}
				}
			}
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
							clazz = callStack[callStack.length - 1][Symbol.classObject];
						}

						if (typeof (clazz) == "function") {
							let pvt = target[clazz[Symbol.privateKey]];
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
							retval = Reflect[handler](...args);
							pvt[sig] = false;
						}
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
		return new Proxy(ctor, {
			filter(obj, keys) {
				let retval = {};
				for (let key of keys) {
					Object.defineProperty(retval, key.substring(1), Object.getOwnPropertyDescriptor(obj, key));
					delete obj[key];
				}
				return retval;
			},
			construct(target, args, newTarget, context) {
				let pvtKey = clazz[Symbol.privateKey];
				let protKey = clazz[Symbol.protectedKey];
				let sig = signatures.get(clazz);
				if (!pvtKey || !protKey || !sig) {
					throw new TypeError("Unsigned class encountered in the inheritance chain.");
				}

				let pvtInit = clazz[Symbol.privateMembers]();
				let protInit = clazz.hasOwnProperty(Symbol.protectedMembers)
					? clazz[Symbol.protectedMembers]()
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
					let pdata = protectedMembers.get(clazz);

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
		});
	}

	return Class;
})();

module.exports = Class;
