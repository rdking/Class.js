var Class = require("../Class");
Class.InitializeScope((typeof(global) == "object") ? global : window);

//Declare "class SampleBase {}"
var SampleBase = Class("SampleBase", {
    //Private Static Data
    counter: Private(Static(null)),

    //Private Data
    className: Private("Sample"),

    //Private Method
    incrementCounter: Private(function incrementCounter() {
        this.Counter++;
        this.logCounter();
    }),
    logCounter: Private(function logCounter() {
        console.log(`counter: ${this.counter}`);
    }),

    //Protected Property
    Counter: Protected(Property({
        get: function() { return this.counter; },
        set: function(val) {
            if (!isNaN(val)) {
                this.counter = val;
            }
        }
    })),

    //Static Constructor
    StaticConstructor: function() {
        console.log("Initializing SampleBase Static Data...");
        this.counter = 0;
    },

    //Instance Constructor
    Constructor: Public(function() {
        this.incrementCounter();
        console.log("Created SampleBase instance #" + this.Counter);
    })
});

//Declare descendant class Sample as a singleton
var Sample = Class("Sample", {
    Extends: SampleBase,

    //Private Static Data
    instance: Private(Static(null)),

    //Instance Constructor
    Constructor: Private(function() {
        this.Super();
        console.log("Created Sample instance");
    }),

    //Public Static Method
    getInstance: Public(Static(function() {
        //'this' inside a static function refers to the
        //class static scope.
        if (!this.instance) {
            this.instance = this.Instance(new this.Self());
            ++this.instance.Counter;
            console.log(`Created ${this.instance.Counter} instances.`);
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
