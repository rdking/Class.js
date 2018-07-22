/* keywords:
 *    private, protected, public //privilege levels
 *    static                     //owned by constructor
 *    const                      //immutable values (not methods)
 *    final                      //immutable methods
 *
 * modes: //Inheritance/Instantiation restrictions. One of the Class.Modes values:
 *    Default,   //No restrictions
 *    Abstract,  //Cannot instantiate. Must inherit to use.
 *    Final      //Cannot inherit. Must instantiate to use.
 */

var Class = require('../Class');
console.log("\n\nTesting a class extending a Native Constructor....");
var Test = Class(class Test extends Array {
    static [Class.DECLARATION]() {
        return {
            ['private foo']: 1,
            ['protected bar']: 'fubar',
            ['private foobar']: undefined,
            ['static private counter']: 0,
            ['protected final method']() {}
        };
    }
    constructor() {
		super();
        this[foobar] = `${this[bar]} ${++this[foo]}`;
		++this.constructor[counter];
    }
	
	["example"]() { console.log("It exists!"); }
    
    nextFoo() { ++this[foo]; }
    
    toString() {
        this[foobar] = `${this[bar]} ${++this[foo]}`;
    	console.log(`foobar = ${this[foobar]}`);
    }

	showCounter() { console.log(`counter = ${this.constructor[counter]}`); }
});

var test = new Test();
test.toString();
test.nextFoo();
test.toString();
test.showCounter();
console.log(`test is an array: ${Array.isArray(test)}`)

console.log("\n\nTesting a class extending a class extending a Native Constructor....");
var SubTest = Class(class SubTest extends Test {
    static [Class.DECLARATION]() {
        return {
            ['public why']: 'Because I can!',
            ['private who']: `It's me! Who else would I be?`
        };
    }

    constructor() {
        super();
        this[bar] = "Overwriten by Subclass!";
    }

    toString() {
        console.log(`SubClass[bar] = ${this[bar]};`);
    }

    baseToString() {
        return super.toString();
    }
});

var subTest = new SubTest();
subTest.toString();
subTest.nextFoo();
subTest.toString();
subTest.showCounter();
subTest.baseToString();
console.log(`subTest is an array: ${Array.isArray(subTest)}`)

console.log("\n\nTesting a simple class heirarchy with no native inheritance....");
var Parent = Class(class Parent {
    static [Class.DECLARATION]() {
        return {
            ["private magic"]: 42
        };
    }

    printParent() {
        console.log(`Parent magic = ${this[magic]}`);
    }
});

var Child = Class(class Child extends Parent {
    static [Class.DECLARATION]() {
        return {
            ["private magic"]: 43
        };
    }

    printChild() {
        console.log(`Child magic = ${this[magic]}`);
    }
});

var GrandChild = Class(class GrandChild extends Child {
    static [Class.DECLARATION]() {
        return {
            ["private magic"]: 44
        };
    }

    printGrandChild() {
        console.log(`GrandChild magic = ${this[magic]}`);
    }
});

console.log("\n\ntesting Parent instance....");
var p = new Parent();
p.printParent();

console.log("\n\ntesting Child instance....");
var c = new Child();
c.printParent();
c.printChild();

console.log("\n\ntesting GrandChild instance....");
var gc = new GrandChild();
gc.printParent();
gc.printChild();
gc.printGrandChild();
