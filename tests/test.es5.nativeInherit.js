var assert = require("assert");
var Class = require("../Class");

Class.InitializeScope(global);

var Test = Class("Test", {
	Extends: Array,

	last: Public(Property({
		get: function getLast() {
			console.log("test.length = ",this.Self.length);
			return (this.Self.length) ? this.Self[this.Self.length - 1] : undefined;
		}
	}))
});

var test = new Test();
assert(test instanceof Test);
assert(test instanceof Array);
assert(Array.isArray(test));
assert(test.last == undefined);
test[22] = 22;
console.log("test.last = ", test.last);
assert(test.last === 22);

var SubTest = Class("SubTest", {
	Extends: Test
});

var subTest = new SubTest();
assert(subTest instanceof SubTest);
assert(subTest instanceof Test);
assert(subTest instanceof Array);
assert(Array.isArray(subTest));
