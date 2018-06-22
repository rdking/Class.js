var Class = (function() {
    var instances = new WeakMap();
    var prototypes = new WeakMap();

    function isNativeFunction(obj) {
        return ((obj instanceof Function) &&
                /^function\s+\w+\(\)\s+{\s+\[native\s+code\]\s+}$/.test(obj.toString()));
    }
    
    function extend(dest, src) {
        if (!dest || (typeof(dest) !== "object"))
            throw new TypeError("Cannot extend a non-object.");

        var proto = Object.getPrototypeOf(src);
        while (!(proto || isNativeFunction(proto.constructor))) {
            for (let key in src) {
                let def = Object.getOwnPropertyDescriptor(src, def);
                Object.defineProperty(dest, key, def);
            }
            src = proto;
            proto = Object.getPrototypeOf(src);
        }
    }
    
    function makeLink(field) {
        return  {
            enumerable: true,
            get: function getField() { return instances.get(this)[field]; },
            set: function setField(val) { instances.get(this)[field] = val; }
        };
    }

    return function Class(c) {
        var pseudoConstructor = function constructor() {
            if (!new.target) {
                throw new TypeError(`Constructor ${c.name} requires 'new'`);
            }
            var args = Array.prototype.slice.call(arguments);
            instances.set(this, new c(...args));
        };
        var inheritance = prototypes.get(Object.getPrototypeOf(c.prototype).constructor) || {};

        pseudoConstructor.prototype.constructor = pseudoConstructor;

        if ((typeof(c) == "function") && (c.prototype && (c.prototype.constructor === c))) {
            let proto = c.prototype;
            let pKeys = Object.keys(proto);
            let priv = 0;
            let protoData = {
                prot: Object.create({}, inheritance.prot),
                privContext: Object.create({}, inheritance.protContext),
                protContext: Object.create({}, inheritance.protContext)
            };

            extend(pseudoConstructor.prototype, inheritance.prot);
            
            for (let key of pKeys) {
                let parts = [key];
                if (key.includes(' ')) {
                    parts = key.split(' ');
                }
                
                while (parts.length > 1) {
                    switch (parts.shift()) {
                        case "private":
                            priv = 2;
                            break;
                        case "protected":
                            priv = 1;
                            break;
                        case "public":
                            priv = 0;
                            break;
                        default:
                            throw new TypeError(`Invalid access modifier`);
                    }
                }
                
                var temp = parts[0];
                if (temp.includes('='))
                    parts = temp.split('=');

                var fieldName = parts.shift();
                var field = (priv) ? Symbol(fieldName) : fieldName;
                var value = (parts.length) ? parts.join('=') : void 0;
                var def = Object.getOwnPropertyDescriptor(proto, key);
                delete proto[key];
                Object.defineProperty(proto, field, def);

                var link = makeLink(field);
                switch (priv) {
                    case 2:     //Private
                        Object.defineProperty(protoData.context, fieldName, { value: field });
                        break;
                    case 1:     //Protected
                        Object.defineProperty(protoData.prot, field, link);
                        Object.defineProperty(protoData.context, fieldName, { value: field });
                        break;
                    default:    //Public
                        Object.defineProperty(protoData.prot, field, link);
                        Object.defineProperty(pseudoConstructor.prototype, fieldName, link);
                        break;
                }
            }
            prototypes.set(pseudoConstructor, protoData);
            with (protoData.privContext) {
                c = eval(c.toString()
            }

            return pseudoConstructor;
        }
        else
            throw new TypeError("Must be a constructor function!");
    }
})();
