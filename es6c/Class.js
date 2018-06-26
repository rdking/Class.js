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

        if (src) {
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
    }
    
    function makeLink(field) {
        return  {
            enumerable: true,
            get: function getField() {
                var internal = instances.get(this);
                var retval = internal[field];
                if (typeof(retval) == "function")
                    retval = retval.bind(internal);
                return retval;
            },
            set: function setField(val) { instances.get(this)[field] = val; }
        };
    }

    return function Class(c) {
        var inheritance = prototypes.get(Object.getPrototypeOf(c.prototype).constructor) || {};

        if ((typeof(c) == "function") && (c.prototype && (c.prototype.constructor === c))) {
            let protoData = {
                prot: Object.create({}, inheritance.prot),
                privContext: Object.create({}, inheritance.protContext),
                protContext: Object.create({}, inheritance.protContext)
            };
            
            with (protoData.privContext) {
                c = (function(_c) {
                    let proto = _c.prototype;
                    let pKeys = Object.getOwnPropertyNames(proto).filter(
                        (value) => (['constructor', 'prototype'].indexOf(value) == -1));
                    var retval = eval(`(function ${_c.name}() {
                        if (!new.target) {
                            throw new TypeError("Constructor ${_c.name} requires 'new'");
                        }
                        var args = Array.prototype.slice.call(arguments);
                        var retval = new _c(...args);
                        instances.set(retval, this);
                        return retval;
                    })`);
                    
                    var prototype = retval.prototype;
                    extend(prototype, inheritance.prot);
                        
                    for (let key of pKeys) {
                        let priv = 0;
                        let parts = [key];
                        if (key.includes(' ')) {
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
                                default:
                                    parts.unshift(part);
                                    parts = [parts.join('')];
                            }
                        }
                        
                        var temp = parts[0];
                        var hasEquals = false;
                        if (/^\w+=/.test(temp)) {
                            hasEquals = true;
                            parts = temp.split('=');
                        }

                        var fieldName = parts.shift();
                        var field = (priv) ? Symbol(fieldName) : fieldName;
                        var value = (parts.length) ? eval(parts.join('=')) : void 0;
                        var def = Object.getOwnPropertyDescriptor(proto, key);
                        if (priv && hasEquals && ("value" in def)) {
                            def.value = value;
                        }
                        delete proto[key];
                        var link = makeLink(field);
                        Object.defineProperty(prototype, field, def);
                        
                        switch (priv) {
                            case 2:     //Private
                                Object.defineProperty(protoData.privContext, fieldName, { value: field });
                                break;
                            case 1:     //Protected
                                Object.defineProperty(protoData.prot, field, link);
                                Object.defineProperty(protoData.privContext, fieldName, { value: field });
                                Object.defineProperty(protoData.protContext, fieldName, { value: field });
                                break;
                            default:    //Public
                                Object.defineProperty(proto, field, link);
                                Object.defineProperty(protoData.prot, field, link);
                                break;
                        }
                    }

                    prototypes.set(retval, protoData);
                    prototype.constructor = retval;
                    
                    Object.defineProperty(c, toString, { value: () => {
                        return _c.toString();
                    }});
                    
                    return retval;
                })(eval(`(${c.toString()})`));
            }

            return c;
        }
        else
            throw new TypeError("Must be a constructor function!");
    }
})();

var hasES6 = (function() { 
	var retval = false;

	try {
		eval("(...args) => {};"); //If this throws, then no ES6.
		retval = true;
		console.warn("ES6 support detected. You might want to use the ES6 version!");
	} catch(e) {};

	return retval;
})();

if (hasES6) {
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
}
else {
	console.warn("No known means of exporting 'Class' namespace!");
}
