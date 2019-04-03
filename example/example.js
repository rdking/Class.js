var Class = require("java-class");

var SampleBase = Class(class SampleBase {
    static [Symbol.Class.privateMembers]() {
        return {
            [Symbol.Class.instance]: {
                className: "Sample",
                incrementCounter() {
                    this.$Counter++;
                    this.$logCounter();
                },
                logCounter() {
                    console.log(`counter: ${this.$counter}`);
                }
            },
            [Symbol.Class.static]: {
                [Symbol.Class.constructor]() {
                    console.log("Initializing SampleBase Static Data...");
                    this.counter = 0;
                },
                counter: null
            }
        }
    }

    static [Symbol.Class.protectedMembers]() {
        return {
            [Symbol.Class.instance]: {
                get Counter() { return this.constructor.$counter; },
                set Counter(val) { isNaN(val) || (this.counter = val); }
            }
        };
    }

    //Instance Constructor
    constructor() {
        this.$incrementCounter();
        console.log("Created SampleBase instance #" + this.Counter);
    }
});

//Declare descendant class Sample as a singleton
var Sample = Class(class Sample extends SampleBase {
    static [Symbol.Class.PrivateMembers]() {
        return {
            [Symbol.Class.static]: {
                canCreate: false,
                instance: null
            }
        };
    }
    //Private Static Data
    constructor() {
        if (!Sample.$canCreate) {
            throw new TypeError("This class is a singleton. Do not use `new`.");
        }
        super();
        console.log("Created Sample instance");
    }

    //Public Static Method
    static getInstance() {
        //'this' inside a static function refers to the
        //class static scope.
        if (!this.instance) {
            this.$canCreate = true;
            this.$instance = new this();
            this.$canCreate = false;
            ++this.$instance.$Counter;
            console.log(`Created ${this.$instance.$Counter} instances.`);
        }

        return this.$instance;
    }

    //Public Instance Method
    getInstanceCount() {
        return this.Counter;
    }
});

var sample = Sample.getInstance();
console.log(sample.getInstanceCount());
