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