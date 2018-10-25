var Class = require("../Class");

function withFn(key, val) {
	var self = arguments.callee;

	function dumpProps(obj) {
		var recursive = false;
		if (self.seen.includes(obj)) {
			recursive = true;
		}
		var retval = obj;
		if (recursive) {
			retval = { ['<< Recursive >>']: true };
			if (typeof(obj) == "function") {
				retval.name = obj.name;
				retval.length = obj.length;
			}
		}
		else if (["function","object"].includes(typeof(obj))) {
			self.seen.push(obj);
			retval = {};
			var descs = Object.getOwnPropertyDescriptors(obj);
			for (let descKey in descs) {
				let desc = descs[descKey];
				if (!desc.enumerable) {
					desc.enumerable = true;
					descKey = `* ${descKey}`;
				}
				Object.defineProperty(retval, descKey, desc);
			}
		}
		return retval;
	}

	var retval = val;
	self.seen = self.seen || [];
	if (typeof(val) == "function") {
		retval = Object.assign({['<< isFunction >>']: true}, dumpProps(val));
	}
	else if (val && (typeof(val) == "object")) {
		retval = Object.assign({}, dumpProps(val));
	}

	return retval;
}

var Test = Class(class Test {
	static [Symbol.classData]() {
		return  {
			['private static field1']: "static data", 
			['private field2']: "data", 
			['private static method1']() {}, 
			['private method2']() {}, 
			['protected static field3']: "42", 
			['protected field4']: null, 
			['protected static method3']() {}, 
			['protected method4']() {}, 
			['static field5']: "42", 
			field6: "data"
		};
	}
});

console.log(`Test = ${JSON.stringify(Test, withFn, '   ')}`);

var test = new Test();
