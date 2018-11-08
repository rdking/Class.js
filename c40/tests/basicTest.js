var assert = require('assert');
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

	constructor() {
		this.print();
	}

	change() {
		this.field2 = ~~(Math.random() * 1000);
		this.print();
	}

	print() {
		//We need to know if private members are visible here...
		console.log(`field1 = ${this.constructor.field1}`);	
		console.log(`field2 = ${this.field2}`);	
		console.log(`field3 = ${this.constructor.field3}`);	
		console.log(`field4 = ${this.field4}`);	
		console.log(`field5 = ${this.constructor.field5}`);	
		console.log(`field6 = ${this.field6}`);	
		console.log(`method1 = ${this.constructor.method1}`);	
		console.log(`method2 = ${this.method2}`);	
		console.log(`method3 = ${this.constructor.method3}`);	
		console.log(`method4 = ${this.method4}\n\n`);	
	}
});

console.log(`Test = ${JSON.stringify(Test, withFn, '   ')}`);

var test = new Test();
console.log(`test = ${JSON.stringify(test, withFn, '   ')}`);

test.change();
console.log(`this.field2 = ${test.field2}`);
