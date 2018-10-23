/*
 * Add a new "well-known symbol" to:
 * a. define the key where the name of the inheritance data field will be stored, and
 * b. provide a well known
 */
Object.defineProperty(Symbol, "inherit",  { value: Symbol() });

/**
 * Creates a wrapped class definition to allow for the use of private and protected
 * properties
 * @param {class} def - the class for which to enable non-public data.
 * @returns {function} - a function that acts as the class constructor.
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

	var handler = {
		getInheritance: def[Symbol.inherit] || (() => new Object()),
		slots: new WeakMap(),
	};
	var pDef = (new Proxy(def, {
		construct(target, args, newTarget) {
			var retval = Reflect.construct(target, args, newTarget);
			return retval;
		}
	}));
	var retval = Object.assign(function () {
		var retval = new pDef();	
		var proto = Object.getPrototypeOf(retval);
		Object.setPrototypeOf(proto, new Proxy(proto, handler));
		return retval;
	}, {
		name: def.name,
		length: def.length,
		toString() { return def.toString(); }
	});

	Object.defineProperty(retval, Symbol.inherit, { value: Symbol(`${def.name}-Inheritance`) });
	Object.defineProperty(retval, retval[Symbol.inherit], {})
};

Object.defineProperties(module.exports, {

});