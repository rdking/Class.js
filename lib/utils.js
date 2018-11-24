function generateUtils(Box, Privilege, hasES6) {
	/*
		Let's figure out which version of JavaScript we're working with. The module
		system we use at the bottom will depend on whether or not we have ES6
		support.
	*/
	var hasES6 = (function() { 
		var retval = false;

		try {
			eval("(...args) => {};"); //If this throws, then no ES6.
			retval = true;
		} catch(e) {};

		return retval;
	})();

	function modifyBox(box, params, val) {
		box = (box instanceof Box) ? box : new Box({
			privilege: Privilege.Public,
			isFinal: false,
			isAbstract: false,
			isStatic: false,
			isProperty: false,
			isDelegate: false,
			type: null,
			value: val
		});

		extendIf(function(src, key) {
			return (params.hasOwnProperty(key) && (key in box) && (key != "value"));
		}, box, params);

		return box;
	}

	/**
	 * An exteded version of the classic "extend" function that conditionally
	 * copies properties from the source objects based on the result of a predicate
	 * function.
	 * 
	 * @param {Function} predicate - A function that determines whether or not to
	 * copy a given property from a source object onto the destination object. The
	 * predicate should return true if the property should be copied. *
	 * @param {Object} dest - the final container for all the collected properties
	 * @param {...Object} - Objects with properties to be included on dest
	 * @return {type} - dest, with all the new properties added.
	 */
	function extendIf(predicate, dest) {
		var sources = Array.prototype.slice.call(arguments, 2);

		while (sources.length) {
			var src = sources.shift();

			for (var key in src) {
				if (predicate(src, key)) {
					var ddef = Object.getOwnPropertyDescriptor(dest.__proto__, key);
					if (ddef && (typeof(ddef.set) == "function")) {
						dest[key] = src[key];
					}
					else {
						var def = Object.getOwnPropertyDescriptor(src, key);
						Object.defineProperty(dest, key, def);
					}
				}
			}
		}

		return dest;
	}

	/**
	 * extend - The classic extend function that copies the value of properties from
	 * every object arguments[1+] into dest. Shallow copies only. Beware that only
	 * the value of the properties are copied. Side effects will not be copied.
	 *
	 * @param {Object} dest - the final container for all the collected properties
	 * @param {...Object} - Objects with properties to be included on dest
	 * @return {type} - dest, with all the new properties added.
	 */
	function extend(dest) {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(function(src, key) { return src.hasOwnProperty(key); });
		return extendIf.apply(args);
	}

	return {
		modifyBox: modifyBox,
		extend: extend,
		extendIf: extendIf
	};
}

if (typeof(module) === "object") {
	//Use require semantics
	module.exports = generateUtils;
}
else if (hasES6) {
	//Prevents older engines from throwing.
	try {
		eval("export default generateUtils;");
	} catch(e) {
		console.warn("No known means of exporting 'generateBox' function!");
	}
}
else {
	console.warn("No known means of exporting 'generateBox' function!");
}
