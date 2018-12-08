Class.js
========

Class.js represents my attempt to add semi-classical object-oriented
programming capacity to JavaScript without altering the language. What this
means is that with Class.js, you can now declare class objects in much the same
way you would expect in languages like Java, C#, and C++ (but sorry, no multiple
inheritance).

Class.js comes in 2 flavors: ES5 & ES6. The ES6 implementation brings new syntax
and is not yet as flexible as the older ES5 version. However, it is a much
lighter implementation (1/10 the code). The features and syntax support of
the ES5 version will be added to the ES6 version as time permits.

ES5 Example:
--------
```javascript
var Class = require("Class.js");        //The class declarator itself.
Class.InitializeScope((typeof(global) == "object") ? global : window);

//Declare "class SampleBase {}"
var SampleBase = new Class("SampleBase", {
    //Private Static Data
    counter: Private(Static(null)),

    //Private Data
    className: Private("Sample");

    //Private Method
    logCounter: Private(function logCounter() {
        console.log(`logCounter: ${this.counter}`);
    }),

    //Protected Property
    Counter: Protected(Property({
        get: function() { return this.counter; },
        set: function(val) {
            if (!isNaN(val)) {
                this.counter = val;
            }
        }
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
    Extends: SampleBase,

    //Private Static Data
    instance: Private(Static(null)),

    //Instance Constructor
    Constructor: Private(function() {
        super();
        console.log("Created Sample instance");
    }),

    //Public Static Method
    getInstance: Public(Static(function() {
        //'this' inside a static function refers to the
        //class static scope.
        if (!this.instance) {
            this.instance = new this.Instance();
            ++this.counter;
            console.log(`Created ${this.counter} instances.`);
        }

        return this.instance;
    })),

    //Public Instance Method
    getInstanceCount: Public(function() {
        return this.Counter;
    })
});

var sample = Sample.getInstance();
console.log(sample.getInstanceCount());
```

ES6 Example (same logic):
--------
```javascript
var Class = require("es6/Class.js");        //The class declarator itself.

//Declare "class SampleBase {}"
var SampleBase = Class(
    //Private members
    {
        counter: 0,  //static isn't yet supported....
        className: "Sample",
        logCounter() {
            console.log(`counter: ${this.counter}`);
        },
        get Counter() { return this[counter]; }, //Protected members are really private.
        set Counter(val) {
            if (!isNaN(val)) {
                this[counter] = val;
            }
        }
    },
    [ "Counter" ], //share this private member with descendants (Protected)
    class SampleBase {
        //Static Constructor isn't yet supported....
        // StaticConstructor() {
        //     this.counter = 0;
        // }

        constructor() {
            this[incrementCounter]();
            console.log("Created SampleBase instance #" + this[counter]);
        }
    }
);

//Declare descendant class Sample as a singleton
var Sample = new class(
    {
        instance: null, //private + static isn't yet supported.
        /* This isn't yet supported
        constructor() {
            super();
            console.log("Created Sample instance");
        }
        */
    },
    class Sample extends SampleBase {
        constructor() {
            super();
        }
        static getInstance() {
            //'this' inside a static function refers to the
            //class static scope.
            if (!this[instance]) {
                /* Internal constructor method ```Instance``` isn't supported yet.
                this[instance] = new this[Instance]();
                */
                this[instance] = new Sample();
                ++this[Counter];
                console.log(`Created ${this[Counter]} instances.`);
            }

            return this[instance];
        }
    )),

    //Public Instance Method
    getInstanceCount: Public(function() {
        return this[Counter];
    })
});

var sample = Sample.getInstance();
console.log(sample.getInstanceCount());
```
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

```javascript
var Functor = require("Functor");

var someObj = {
    count: 7
};

var method = new Functor(someObj, function() {
    console.log(++this.count);
});

window.setTimeout(method, 1000);        //Prints "8" 1 second later
```

Enum.js
=======

Just because I wanted to be able to constrain a list of values, I created an
Enum class as well.

Example
-------

```javascript
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
```

The enum values can be objects as well. Just declare the Enum as an object
instead of an array.

Example
-------

```javascript
var ObjectEnum = new Enum("default", {
    default: { foo: null },
    something: { bar: function() {} },
});
```

A Tutorial on this Class.js Library
===================================

Since this readme can't really convey enough about how to use Class.js, I'm
making a Wiki tutorial to explain the ins and outs of the library.

http://thekingsnotice.blogspot.com/2015/03/oojs-5-re-introducing-classjs.html
