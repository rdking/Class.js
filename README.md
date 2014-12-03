Class.js
========

Class.js represents my attempt to add semi-classical object-oriented
programming capacity to JavaScript without altering the language. What this
means is that with Class.js, you can now declare class objects in much the same
way you would expect in languages like Java, C#, and C++ (but sorry, no multiple
inheritance).


Example:
--------

~~
var Class = require("Class.js");        //The class declarator itself.
var Private = Class.Private;
var Protected = Class.Protected;
var Public = Class.Public;
var Property = Class.Property;
var Static = Class.Static;
var Final = Class.Final;

//Declare "class SampleBase {}"
var SampleBase = new Class("SampleBase", {
    //Private Static Data
    counter: Private(Static(null)),

    //Private Data
    className: Private("Sample");

    //Private Method
    incrementCounter: Private(function incrementCounter() {
        ++this.counter;
    }),

    //Protected Property
    Counter: Protected(Property({
        get: function() { return counter; }
    })

    //Static Constructor
    StaticConstructor: function() {
        this.counter = 0;
    },

    //Instance Constructor
    Constructor: Public(function() {
        this.incrementCounter();
        console.log("Created SampleBase instance #" + this.counter);
    })
});

//Declare descendant class Sample as a singleton
var Sample = new class("Sample", {
    //Private Static Data
    instance: Private(Static(null)),

    //Instance Constructor
    Constructor: Private(function() {
        console.log("Created Sample instance");
    }),

    //Public Static Method
    getInstance: Public(Static(function() {
        //'this' inside a static function refers to the
        //class static scope.
        if (!this.instance)
            this.instance = new this.Instance();

        return this.instance;
    })),

    //Public Instance Method
    getInstanceCount: Public(function() {
        return this.Counter;
    })
});

var sample = Sample.getInstance();
console.log(sample.getInstanceCount());
~~

WeakMap.js
==========

To implement Class.js, I needed WeakMap support, which isn't always available. I
created a shim to take care of that. Since WeakMaps aren't completely
implementable in pure JavaScript, I created a version that leaks memory as
little as possible. The result is a WeakMap implementation that only leaks a
single GUID string per object stored. Short of this leakage, this WeakMap
should be nearly as secure as the native implementation would be. This WeakMap is
complete as per the current specification.

Functor.js
==========

I also needed a way of reliably being able to ensure that I could call any class
function on its instance. This meant being able to dynamically re-bind function
references. Since Function.bind() doesn't allow the re-binding I needed, I
implemented this little quickie. There's almost no need to use it directly though.
From any class function, "this.Delegate()" will do the work for you. You can
pass it the string name of a class member function or a function definition.

From outside a class instance, Functor can be used to ensure a specific object is
used when a callback is needed.

Example
-------

~~
var Functor = require("Functor");

var someObj = {
    count: 7
};

var method = new Functor(someObj, function() {
    console.log(++this.count);
});

window.setTimeout(method, 1000);        //Prints "8" 1 second later
~~

Enum.js
=======

Just because I wanted to be able to constrain a list of values, I created an
Enum class as well.

Example
-------

~~
var Enum = require("Enum");
var WeekDay = new Enum("Sunday", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

var day = new WeekDay();    //Defaults to "Sunday"
day.value = 2;              //
console.log(day.name);      //Prints "Tuesday"
day.name = "Friday";
console.log(day.value);     //Prints "5"
day.name = "?"              //Throws!
day.value = -1;             //Throws!
console.log(day.isEnum);    //Prints "true"
~~

The enum values can be objects as well. Just declare the Enum as an object
instead of an array.

Example
-------

~~
var ObjectEnum = new Enum("default", {
    default: { foo: null },
    something: { bar: function() {} },
});
~~
