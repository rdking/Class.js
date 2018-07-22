module.exports = (function() {
    const DECLARATION = Symbol("DECLARATION");

    function processObj(ctorFn) {
        let obj = (typeof(ctorFn[DECLARATION]) == "function") ? ctorFn[DECLARATION]() : {};
        let proto = ctorFn.prototype;
        let pKeys = Object.getOwnPropertyNames(obj).concat(
                Object.getOwnPropertySymbols(obj)).filter(
                    (value) => (
                        ((typeof(obj) == "function") ?
                            ['length', 'name', 'arguments', 'prototype', 'toString', 'caller'] :
                            ['constructor', 'prototype']).indexOf(value) == -1));
        let protNames = {};
        let privNames = {};
        let staticPrivNames = {};
        let staticProtNames = {};
        let staticData = {};

        delete ctorFn[DECLARATION];
            
        for (let key of pKeys) {
            let isConst = false;
            let isStatic = false;
            let priv = 0;
            let parts = [key];
            if ((typeof(key) == "string") && (key.includes(' '))) {
                parts = key.split(' ');
            }
            
            while (parts.length > 1) {
                let part = parts.shift();
                switch (part) {
                    case "private":
                        priv = 2;
                        break;
                    case "protected":
                        priv = 1;
                        break;
                    case "public":
                        priv = 0;
                        break;
                    case "const":
                    case "final":
                        isConst = true;
                        break;
                    case "static": 
                        isStatic = true;
                        break;
                    default:
                        parts.unshift(part);
                        parts = [parts.join('')];
                }
            }
                        
            var fieldName = parts[0];
            var field = (priv) ? Symbol(fieldName) : fieldName;
            var def = Object.getOwnPropertyDescriptor(obj, key);
            var pNameDef = {
                writable: true,
                enumerable: true,
                value: field
            };
            if ('value' in def)
                def.writable = !isConst;
            delete obj[key];

            switch (priv) {
                case 1:     //Protected
                    if (isStatic)
                        Object.defineProperty(staticProtNames, fieldName, pNameDef);
                    else
                        Object.defineProperty(protNames, fieldName, pNameDef);
                case 2:     //Private
                    if (isStatic) {
                        Object.defineProperty(staticPrivNames, fieldName, pNameDef);
                        Object.defineProperty(staticData, field, def);
                    }
                    else {
                        Object.defineProperty(privNames, fieldName, pNameDef);
                        Object.defineProperty(obj, field, def);
                    }
                    break;
                default:    //Public
                    Object.defineProperty(proto, field, def);
                    break;
            }
        }

        return Object.seal({
            modifier: undefined,
            privNames,
            protNames,
            privProto: obj,
            staticPrivNames,
            staticProtNames,
            staticData
        });
    }

    function values(obj) {
        var retval = [];

        while (obj !== Object.prototype) {
            retval = retval.concat(Object.values(obj));
            obj = Object.getPrototypeOf(obj);
        }

        return retval;
    }

    var retval = class PrivateMap extends WeakMap {
        initConstructor(ctorFn) {
            this.set(ctorFn, processObj(ctorFn));
        }

        init(obj) {
            if (obj && (typeof(obj) == "object") && (typeof(obj.constructor) == "function")) {
                let classInfo = this.get(obj.constructor);
                this.set(obj, Object.create(classInfo.privProto));
            }
            else {
                throw new ReferenceError("Object's class has not been initialized!");
            }

            //Let's init be pass-through
            return obj;
        }

        validate(obj, key, isStatic, noThrow) {
            var retval = true;

            if (!this.has(obj)) {
                if (!noThrow)
                    throw new ReferenceError("Object's private container has not been initialized!");
                retval = false;
            }

            if ((typeof(obj) == "object") && !this.has(obj.constructor)) {
                if (!noThrow)
                    throw new ReferenceError("Object's class has not been initialized!");
                retval = false;
            }
            
            var field = (isStatic) ? "staticPrivNames" : "privNames";
            if ((typeof(obj) == "object") && (values(this.get(obj.constructor)[field]).indexOf(key) === -1)) {
                if (!noThrow)
                    throw new TypeError("Invalid private field name");
                retval = false;
            }
    
            return retval;
        }

        getKey(obj, key) {
            this.validate(obj, key);
            return this.get(obj)[key];
        }

        setKey(obj, key, value) {
            this.validate(obj, key);
            this.get(obj)[key] = value;
        }

        getStaticKey(obj, key) {
            this.validate(obj, key, true);
            return this.get(obj).staticData[key];
        }

        setStaticKey(obj, key, value) {
            this.validate(obj, key, true);
            this.get(obj).staticData[key] = value;
        }

        hasKey(obj, key) {
            return this.validate(obj, key, false, true);
        }

        hasStaticKey(obj, key) {
            return this.validate(object, key, true, true);
        }
    };
    Object.defineProperty(retval, "DECLARATION", { value: DECLARATION });
    return retval;
})();
