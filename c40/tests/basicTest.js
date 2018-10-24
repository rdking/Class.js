var Class = require("../Class");

var Test = Class(class Test {
	static [Symbol.classData]() {
		return  {
			['private static field1']: "static data", 
			['private field2']: "data", 
			['private static method1']() {}, 
			['private method2']() {}, 
			['protected static field3']: "42", 
			['protected method4']() {}, 
			['protected static field3']: "42", 
			['protected method4']() {}, 
			['static field3']: "42", 
			field3: "data"
		};
	}
})