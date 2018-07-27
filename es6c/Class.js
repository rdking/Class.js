var PrivateMap = require('./PrivateMap');
var Enum = require("../Enum");
/**
 * ClassModes - An enumeration of the inheritability of defined Class types.
 *
 * @typedef {Enum} ClassModes
 * @prop {number} Default - Sets unrestricted inheritability for the new Class.
 * @prop {number} Abstract - Sets required inheritability for the new Class.
 * @prop {number} Final - Restricts all inheritability of the new Class.
 */
var ClassModes = new Enum("Default", ["Default", "Abstract", "Final"]);

var Class = (function() {
    const isProxy = Symbol("isProxy");
    const ProxyTarget = Symbol("ProxyTarget");
    const This = Symbol("This");
    var privMap = new PrivateMap();
    
    function extend(dest, src) {
        if (!dest || (["object", "function"].indexOf(typeof(dest)) === -1))
            throw new TypeError("Cannot extend a non-object.");

        if (src) {
            let keys = Object.getOwnPropertyNames(src).concat(Object.getOwnPropertySymbols(src));
            
            for (let key of keys) {
                let def = Object.getOwnPropertyDescriptor(src, key);
                Object.defineProperty(dest, key, def);
            }
        }
        return dest;
    }

    function isNativeFunction(obj) {
        obj = obj[ProxyTarget] || obj;
        return ((typeof(obj) == "function") && (obj instanceof Function) &&
                /^function\s+\w+\(\)\s+{\s+\[native\s+code\]\s+}$/.test(obj.toString()));
    }

    function findNativeBase(ancestor) {
        var retval = (isNativeFunction(ancestor)) ? ancestor : false;

        while (ancestor && !retval && (ancestor !== Object)) {
            let proto = ancestor.prototype;
            while (proto && (proto.constructor === ancestor)) {
                proto = Object.getPrototypeOf(proto)
            }
            ancestor = proto.constructor;
            retval = (isNativeFunction(ancestor)) ? ancestor : false;
        }

        return retval;
    }

    function makeLinks(obj) {
        var keys = Object.getOwnPropertyNames(obj)
                         .concat(Object.getOwnPropertySymbols(obj));
        var retval = {};
        
        function getProperty(key) { return obj[key]; }
        function setProperty(key, value) { obj[key] = value; }

        for (let key of keys) {
            Object.defineProperty(retval, key, {
                enumerable: true,
                get: getProperty.bind(undefined, key),
                set: setProperty.bind(undefined, key)
            });
        }

        return retval;
    }
    
    function Super(...args) {
        var parentProto = Object.getPrototypeOf(Object.getPrototypeOf(this));
        var parent = parentProto.constructor;
        var retval = Reflect.construct(parent, args, parent);
        Object.setPrototypeOf(retval, Object.getPrototypeOf(this));
        return retval;
    }

    function findConstructor(c) {
        var cString = (c[ProxyTarget] || c).toString();
        var cProto = c.prototype;
        var regex = /\Wconstructor\s*\(([^]*?)\)\s*\{([^]+\})/;
        var index = cString.search(regex);
        var matches = cString.match(regex);
        var retval = `function ${c.name}() { return privMap.init(Super.call(this)); }`;
        
        if (index > -1) {
            let keys = Object.getOwnPropertyNames(cProto)
                             .concat(Object.getOwnPropertySymbols(cProto));
            retval = `function ${c.name}(${matches[1]}) {${matches[2]}`;
            
            let endIndex = retval.length;
            for (let key of keys) {
                if (key == "constructor")
                    continue;
                let fnRegex = new RegExp(`\\s((get|set|static|async)\\s+)*?(${key}|\\[".*"\\])\\s*\\(`, "m");
                let idx = retval.search(fnRegex);
                if ((idx > 15) && (idx < endIndex)) { //15 -> constructor(){}
                    endIndex = idx;
                }
            }

            if (endIndex === retval.length) { //Remove the end of class brace if we found no other fn's
                retval = retval.substring(0, retval.lastIndexOf("}", endIndex));
            }

            endIndex = retval.lastIndexOf("}", endIndex) + 1;
            retval = retval.substr(0, endIndex);
        }

        if (/\ssuper\(/.test(retval)) {
            retval = retval.replace(/this(\W)/mg, "retval$1")
                           .replace(/(\s)super\(([^;]*)\);/m, `$1var retval = privMap.init(Super.call(this, $2));`)
                           .replace(/\}$/, "\t\treturn retval;\n\t}");
        }
        else if (index > -1) {
            retval = retval.replace(/this(\W)/mg, "retval$1")
                           .replace(/((?:\W)constructor\s+\((?:\w+(?:\s*,\s*\w+)*)?\)\s*\{(\s+))/m, `$1var retval = privMap.init(Super.call(this));$2`)
                           .replace(/\}$/, "\t\treturn retval;\n\t}");
        }
        return retval;        
    }

    var SymbolRef = (function() {
        const storage = [];
        return function SymbolRef(symbol, store) {
            var retval = storage.length;
            if (store) {
                storage.push(symbol);
            }
            else {
                if (symbol in storage) {
                    retval = storage[symbol];
                    delete storage[symbol];
                }
                else {
                    retval = void 0;
                }
            }

            return retval;
        }
    })();

    function fixClass(c, classProto) {
        var keys = Object.getOwnPropertyNames(classProto).
            concat(Object.getOwnPropertySymbols(classProto));
        var retval = `{\n\tconstructor: ${findConstructor(c)}`;

        for (let key of keys) {
            if (key == "constructor")
                continue;

            let def = Object.getOwnPropertyDescriptor(classProto, key);

            if ("value" in def) {
                let val = def.value.toString();
                if (val.indexOf("(") === 0) {
                    if (typeof(key) == "symbol") {
                        let id = SymbolRef(key, true);
                        retval += `,\n\t[SymbolRef(${id})]${val}`;
                    }
                    else {
                        retval += `,\n\t["${key.replace(/"/gm, '\\"')}"]${val}`;
                    }
                }
                else {
                    retval += `,\n\t${val}`;
                }
            }
            else {
                if ("get" in def) {
                    retval += `,\n\t${def.get.toString()}`;
                }
                if ("set" in def) {
                    retval += `,\n\t${def.set.toString()}`;
                }
            }
        }

        let cKeys = Object.getOwnPropertyNames(c)
                          .concat(Object.getOwnPropertySymbols(c))
                          .filter((element) => !(element in retval.constructor) &&
                                                (element !== PrivateMap.DECLARATION));
        if (cKeys.length) {
            let cString = (c[ProxyTarget] || c).toString();
            retval += ',\n\tstatics: {';
            for (let key of cKeys) {
                let first = true;
                let desc = Object.getOwnPropertyDescriptor(c, key);
                
                if (typeof(key) == "symbol") {
                    let id = SymbolRef(key, true);
                    retval += `\n\t\t[SymbolRef(${id})]: {`;
                }
                else {
                    retval += `\n\t\t['${key.replace("'","\\'")}']: {`;
                }
                
                for (let dKey in desc) {
                    let rDKey = dKey.replace(/([\[\]\{\}\(\)\?\*\+\\])/mg, "\\$1");
                    let value = desc[dKey].toString();
                    let rValue = value.replace(/([\[\]\{\}\(\)\?\*\+\\])/mg, "\\$1");
                    let tester = new RegExp(`\\[(["'\\\`])${rDKey}\\1\\]\\s*:\\s*${rValue}`, "m");
                    let colon = ((["get","set","value"].indexOf(dKey) === -1) || tester.test(cString))? ': ' : '';
                    if (!(/^function/.test(value) || /\)\s*=>\s*\{/.test(value))) {
                        value = "function " + value;
                    }
                    retval += `${(first)? '' : ','}\n\t\t\t${dKey}${colon}${value}`;
                    first = false;
                }
                retval += `\n\t\t}`;
            }
            retval += '\n\t}';
        }

        return retval + '\n}';
    }

    var retval = function Class(mod, c) {
        if (!c) {
            c = mod;
            mod = ClassModes.Default;
        }

        if ((typeof(c) != "function") || !(c.prototype && (c.prototype.constructor === c))) {
            throw new TypeError("Must be a constructor function!");
        }

        /* Make a dupe of the original prototype. We can't change the original
         * because we're not sure who owns it. It'd be ok if we could be sure
         * we own it, but we could have received it indirectly. */
        var dupProto = extend({}, c.prototype);
        
        //Drop the constructor. We're going to have to re-create it anyway.
        delete dupProto.constructor;
        //Get the private container for the base class        
        var inherit = privMap.get(Object.getPrototypeOf(c.prototype).constructor) || {};
        if (inherit.modifier === ClassModes.Final)
            throw new TypeError("Cannot extend a final class");
        //Create a new function that will serve as the outer instance constructor.
        var ctorObj = {}; //We'll set this later, but the new constuctor needs it.
        var retval = eval(`(function ${c.name}(...args) {
            var ctor = ctorObj.constructor;
            var cInfo = privMap.get(ctorObj.class);
            if (!(new.target || (this instanceof ctor))) {
                throw new Error("Constructor ${c.name} requires 'new'");
            }
            if (cInfo && (cInfo.modifier === ClassModes.Abstract)) {
                throw new TypeError("Cannot instantiate an abstract class");
            }
            return ctor.apply(this, args) || this;
        })`);

        //Create the proxy handler, because we're making an inverse membrane
        var handler = {
            isExtensible(target, key) {
                return true;
            },
            preventExtensions(target) {
                return false;
            },
            apply(target, context, args) {
                if (context[isProxy]) {
                    retval = target.apply(context, args);//Reflect(target, context, args);
                }
                else {
                    var newContext = new Proxy(context, Object.assign({[isProxy]: true}, handler));
                    privMap.set(newContext, privMap.get(context));
                    var retval = target.apply(newContext, args);//Reflect.apply(target, newContext, args);
                    privMap.delete(newContext);
                    retval = (retval === newContext) ? context : retval;
                }
                return retval;
            },
            get(target, key, receiver) {
                var retval;
                if (key === isProxy) {
                    retval = this[isProxy];
                }
                else if ((Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)) &&
                         (key === ProxyTarget)) {
                    retval = target
                }
                else if (protoData && (PrivateMap.values(protoData.privNames).indexOf(key) >= 0)) {
                    retval = privMap.getKey(receiver, key);
                }
                else if (protoData && (PrivateMap.values(protoData.staticPrivNames).indexOf(key) >= 0)) {
                    retval = privMap.getStaticKey(receiver, key);
                }
                else {
                    retval = Reflect.get(target, key, receiver);
                }

                if ((typeof(retval) == "function") && (retval.name != c.name))
                    retval = new Proxy(retval, Object.assign({[isProxy]: true}, handler));

                return retval;
            },
            set(target, key, value, receiver) {
                var retval = true;
                if (protoData && (PrivateMap.values(protoData.privNames).indexOf(key) >= 0)) {
                    privMap.setKey(receiver, key, value);
                }
                else if (protoData && (PrivateMap.values(protoData.staticPrivNames).indexOf(key) >= 0)) {
                    privMap.setStaticKey(receiver, key, value);
                }
                else {
                    retval = Reflect.set(target, key, value, receiver);
                }
                return retval;
            },
            has(target, key) {
                var retval = true;
                if (protoData && (PrivateMap.values(protoData.privNames).indexOf(key) >= 0)) {
                    retval = privMap.hasKey(target, key);
                }
                else if (protoData && (PrivateMap.values(protoData.staticPrivNames).indexOf(key) >= 0)) {
                    retval = privMap.hasStaticKey(target, key);
                }
                else {
                    retval = Reflect.has(target, key);
                }
                return retval;
            }
        };

        //Copy the DECLARATION function if it exists.
        if (typeof(c[PrivateMap.DECLARATION]) == "function") {
            retval[PrivateMap.DECLARATION] = c[PrivateMap.DECLARATION];
        }

        //Proxy the new constructor.
        retval = new Proxy(retval, Object.assign({[isProxy]: true}, handler));
        ctorObj.class = retval;
        //Make PrivateMap aware of the new class
        privMap.initConstructor(retval);
        //Get the private container for the class
        var protoData = privMap.get(retval);
        
        //Patch up the private container with its inheritance.
        protoData.modifier = mod;
        Object.setPrototypeOf(protoData.privNames, inherit.privNames || {});
        Object.setPrototypeOf(protoData.protNames, inherit.protNames || {});
        Object.setPrototypeOf(protoData.privProto, inherit.privProto || {});
        Object.setPrototypeOf(protoData.staticPrivNames, inherit.staticPrivNames || {});
        Object.setPrototypeOf(protoData.staticProtNames, inherit.staticProtNames || {});
        Object.setPrototypeOf(protoData.staticPubMembers, makeLinks(inherit.staticPubMembers || {}));
        Object.setPrototypeOf(protoData.staticData, makeLinks(inherit.staticData || {}));

        //Everything else we do needs to know about the private symbols
        with (protoData.privNames) with (protoData.staticPrivNames) {
            /* Modify the constructor and rebuild the class's prototype. */
            var result = eval(`(${fixClass(c, dupProto)})`);
            Object.setPrototypeOf(result, Object.getPrototypeOf(c.prototype));

            //Set the internal constructor to the constructor we modified.
            ctorObj.constructor = result.constructor;
            //Set the prototype constructor to the constructor we'll return.
            result.constructor = retval;
            //Proxy the prototype object so we can manipulate private member usage
            ctorObj.constructor.prototype = new Proxy(result, Object.assign({[isProxy]: true}, handler));
            retval.prototype = ctorObj.constructor.prototype;
            
            //Move the static members onto retval
            extend (retval, result.statics);
            extend (retval, protoData.staticPubMembers);
            delete result.statics;
        }

        return retval;
    };

    Object.defineProperties(retval, {
        Modes: {
            value: ClassModes
        },
        DECLARATION: {
            value: PrivateMap.DECLARATION
        }
    });

    return retval;
})();

//Prevents older engines from throwing.
try {
    eval("export default Class;");
} catch(e) {
    try {
        module.exports = Class;
    }
    catch(e) {
        console.warn("No known means of exporting 'Class' namespace!");
    }
}
