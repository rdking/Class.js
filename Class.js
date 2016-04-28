/*
 * Filename: Class.js
 * Created By: Ranando D. King
 * License: Apache 2.0
 *
 * Copyright 2014 Ranando D. King
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * 		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Enum = Enum || null;
var Functor = Functor || null;
var WeakMap = WeakMap || null;
var Interface = Interface || null;

if (module && exports && module.exports === exports) {
    if (!Enum)
        Enum = require('./Enum');

    if (!Functor)
        Functor = require('./Functor');

    if (!WeakMap)
        WeakMap = require('./WeakMap');

    if (!Interface)
        Interface = require('./Interface');
}

//Another polyfill....
if (!(Object.setPrototypeOf instanceof Function)) {
    Object.defineProperty(Object, "setPrototypeOf", {
        value: function setPrototypeOf(obj, proto) {
            if (!(typeof proto == "object") || Array.isArray(proto))
                throw new Error("Object.setPrototypeOf: Prototype parameter is not an object!");

            if (!(typeof obj == "object") || Array.isArray(obj))
                throw new Error("Object.setPrototypeOf: Inheriting parameter is not an object!");

            obj.__proto__ = proto;
        }
    });
}

if (!(Object.getPrototypeOf instanceof Function)) {
    Object.defineProperty(Object, "getPrototypeOf", {
        value: function getPrototypeOf(obj) {
            if (!(typeof obj == "object") || Array.isArray(obj))
                throw new Error("Object.getPrototypeOf: Parameter is not an object!");

            return obj.__proto__;
        }
    });
}

var Class = (function Class() {
    var proxies = {};
    var Privilege = new Enum("Public", [ "Public", "Protected", "Private" ]);
    var Box = (function Box() {
        var internal = new WeakMap();
        var $$$ = function Box(params) {
            internal.set(this, {
                isPrivate: (params.privilege == Privilege.Private),
                isProtected: (params.privilege == Privilege.Protected),
                isPublic: (params.privilege == Privilege.Public),
                isFinal: !!params.isFinal,
                isAbstract: !!params.isAbstract,
                isStatic: !!params.isStatic,
                isProperty: !!params.isProperty,
                isDelegate: !!params.isDelegate,
                type: params.type,
                value: params.value
            });

            if (this.isProperty && this.isFinal)
                throw new Error("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

            if (this.isPrivate && this.isStatic && this.Property)
            	throw new Error("What exactly is the use-case for a Private Static Property? Doesn't make sense, so NO!");

            if (this.isProperty && this.isAbstract)
                throw new Error("Have ye gone daft? What good is a property that the owning class doesn't even define?");

            if (this.isAbstract && this.isFinal)
                throw new Error("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");

            if (this.isAbstract && this .isStatic)
                throw new Error("Just exactly how do you expect a descendant to redefine something not presented to descendants?");

            return this;
        };

        Object.defineProperties($$$.prototype, {
            isBox: {
               enumerable: true,
               value: true
            },
            isPrivate: {
                enumerable: true,
                get: function getIsPrivate() { return internal.get(this).isPrivate; },
                set: function setIsPrivate(val) {
                    internal.get(this).isPrivate = val;
                    internal.get(this).isProtected &= !val;
                    internal.get(this).isPublic &= !val;
                }
            },
            isProtected: {
                enumerable: true,
                get: function getIsProtected() { return internal.get(this).isProtected; },
                set: function setIsProtected(val) {
                    internal.get(this).isProtected = val;
                    internal.get(this).isPrivate &= !val;
                    internal.get(this).isPublic &= !val;
                }
            },
            isPublic: {
                enumerable: true,
                get: function getIsPublic() { return internal.get(this).isPublic; },
                set: function setIsPublic(val) {
                    internal.get(this).isPrivate &= !val;
                    internal.get(this).isProtected &= !val;
                    internal.get(this).isPublic = val;
                }
            },
            isStatic: {
                enumerable: true,
                get: function getIsStatic() { return internal.get(this).isStatic; },
                set: function setIsStatic(val) { internal.get(this).isStatic = val; }
            },
            isFinal: {
                enumerable: true,
                get: function getIsFinal() { return internal.get(this).isFinal; },
                set: function setIsFinal(val) { internal.get(this).isFinal = val; }
            },
            isAbstract: {
                enumerable: true,
                get: function getIsAbstract() { return internal.get(this).isAbstract; },
                set: function setIsAbstract(val) { internal.get(this).isAbstract = val; }
            },
            isProperty: {
                enumerable: true,
                get: function getIsProperty() { return internal.get(this).isProperty; },
                set: function setIsProperty(val) { internal.get(this).isProperty = val; }
            },
            isDelegate: {
                enumerable: true,
                get: function getIsDelegate() { return internal.get(this).isDelegate; },
                set: function setIsDelegate(val) { internal.get(this).isDelegate = val; }
            },
            type: {
                enumerable: true,
                get: function getType() { return internal.get(this).type; },
                set: function setType(val) { internal.get(this).type = val; }
            },
            value: {
                enumerable: true,
                get: function getValue() { return internal.get(this).value; }
            },
            toString: {
                enumerable: true,
                value: function toString() {
                    var retval = "{";

                    var typeName = "<unknown>";
                    if (this.type instanceof Function) {
                        console.info("Type is a function...");
                        if (this.type.isClass) {
                            console.info("Type is a Class...");
                            typeName = this.type.__name;
                        }
                        else {
                            typeName = this.type.name;
                        }
                    }

                    retval += " isPrivate=" + !!this.isPrivate;
                    retval += " isProtected=" + !!this.isProtected;
                    retval += " isPublic=" + !!this.isPublic;
                    retval += " isStatic=" + !!this.isStatic;
                    retval += " isFinal=" + !!this.isFinal;
                    retval += " isProperty=" + !!this.isProperty;
                    retval += " isDelegate=" + !!this.isDelegate;
                    retval += " type=" + typeName;
                    retval += " value=" + JSON.stringify(this.value);
                    retval += " }";

                    return retval;
                }
            }
        });

        Object.seal($$$);
        return $$$;
    })();

    var isSimpleFunction = function isValidFunction(obj) {
        return ((obj instanceof Function) &&
                !obj.isClass && !obj.isEnum && !obj.isInterface && !obj.isAttribute);
    };
    
    var isNativeConstructor = function isNativeConstructor(fn) {
        return ((fn instanceof Function) && fn.prototype && 
                (fn.prototype.constructor instanceof Function) && 
                (fn.prototype.constructor.toString().indexOf("[native code]") > -1));
    };

    var Unbox = function Unbox(dest, source, _this, shallow, ignore) {
        var currentScope = source;
        var pType = [];

        //Make sure prototyping doesn't interfere with the unboxing.
        if (!Array.isArray(dest))
        	dest = [dest];

        for (var i=0; i<dest.length; ++i) {
        	pType.push(Object.getPrototypeOf(dest[i]));
            Object.setPrototypeOf(dest[i], {});
        }

        if (!Array.isArray(ignore))
        	ignore = [ignore];

        while (Object.getPrototypeOf(currentScope)) {
            for (var key in currentScope) {
                if ((ignore.indexOf(key) < 0) && currentScope.hasOwnProperty(key)) {
            		for (var i=0; i<dest.length; ++i) {
                        if (!(key in pType[i]) || dest[i].__isInheritedDomain) {
                            dest[i][key] = true;
                            ExpandScopeElement(dest[i], currentScope, key, _this);
                        }
                        else if (isSimpleFunction(currentScope[key].value)) {
                            var prev = pType[i][key];

                            if ((typeof(prev) == "object") && prev.hasOwnProperty("get")) {
                                prev = prev.get();
                            }

                            //Since the key already exists in the base, preserve the original value on this.Super
                            if (pType[i].hasOwnProperty("Super")) {
                                Object.defineProperty(pType[i].Super, key, {
                                    enumerable: true,
                                    value: prev
                                });
                            }
                            pType[i][key] = new Functor(dest[i], currentScope[key].value);
                        }
                        else {
                            //It's just a new default property value....
                            pType[i][key] = currentScope[key].value;
                        }
                    }
                }
            }

            if (shallow)
                currentScope = {};

            currentScope = Object.getPrototypeOf(currentScope);
        }

        //Restore the prototype
        for (var i=0; i<dest.length; ++i)
        	Object.setPrototypeOf(dest[i], pType[i]);
    };

    var BlendMixins = function BlendMixins(list, instance) {
        if (Array.isArray(list)) {
            var i = 0;
            try {
                for (; i<list.length; ++i)
                    Extend(instance, list[i]);
            }
            catch(e) {
                throw new TypeError("Members of Mixin at index " + i + " conflict with pre-existing members!");
            }
        }
    };

    var InheritFrom = function InheritFrom(_class, def, protScope, statScope, protStatScope) {
        _class.prototype = _class.prototype || {};

        if (def && def.Extends) {
            //If it's a non-final Class.js class.
            if (def.Extends.isClass) {
                if (def.Extends.classMode === _$.ClassModes.Final)
                    throw new SyntaxError("Cannot extend a Final Class!");
                
                var inherited = {};
                Object.defineProperty(inherited, "__isDescendant", {
                    configurable: true,
                    value: true
                });
                Object.setPrototypeOf(_class.prototype, new def.Extends(inherited));
                delete inherited.__isDescendant;
                
                Object.setPrototypeOf(protScope, inherited);

                //Copy the static inherited parts to staticScope
                for (var key in inherited) {
                    if (inherited.hasOwnProperty(key)) {
                        var value = inherited[key];

                        if (value.isBox) {
                            if (value.isStatic && !statScope.hasOwnProperty(key)) {
                                statScope[key] = true;
                                ExpandScopeElement(statScope, inherited, key, statScope);
                            }
                        }
                        else if (key == "__static") {
                            Object.setPrototypeOf(statScope, value);
                            Object.setPrototypeOf(protStatScope, value);
                        }

                    }
                }

                Object.defineProperty(_class, 'InheritsFrom', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: def.Extends
                });

                Object.defineProperty(_class.prototype, 'InheritsFrom', {
                    enumerable: false,
                    configurable: true,
                    writable: false,
                    value: def.Extends
                });
            }
            else if (def.Extends instanceof Function) {
                if (isNativeConstructor(def.Extends) && !_class.isNativeProxy) {
                    var base = def.Extends;
                    var cName = /function\W+(.+)\W*\(/.exec(base.toString())[1] + "_Proxy";

                    if (proxies.hasOwnProperty(cName)) {
                        def.Extends = proxies[cName];
                    }
                    else {
                        var pubKeys = (Object.getOwnPropertyNames instanceof Function)? Object.getOwnPropertyNames(base): Object.keys(base.prototype);
                        var statKeys = (Object.getOwnPropertyNames instanceof Function)? Object.getOwnPropertyNames(base): Object.keys(base);
                        var cDef = {
                            Extends: base,
                            instance: _$.Private(null),
                            Constructor: _$.Public(function createProxy() {
                                this.instance = new base();
                            }),
                            isNativeProxy: _$.Public(_$.Static(_$.Property({
                                get: function getIsNativeProxy() { return true; }
                            })))
                        };

                        for (var i=0; i<pubKeys.length; ++i) {
                            var key = pubKeys[i];
                            cDef[key] = _$.Public(_$.Property({
                                get: function getProperty() { return this.instance[key]; },
                                set: function setProperty(val) { this.instance[key] = val; }
                            }))
                        }

                        for (var i=0; i<statKeys.length; ++i) {
                            var key = statKeys[i];
                            cDef[key] = _$.Public(_$.Static(_$.Property({
                                get: function getProperty() { return this.instance[key]; },
                                set: function setProperty(val) { this.instance[key] = val; }
                            })))
                        }

                        def.Extends = new Class(cName, cDef);
                    }

                    proxies[cName] = def.Extends;
                    //Go back and try again now that we've built the proxy...
                    InheritFrom(_class, def, protScope, statScope, protStatScope);
                }
                else {
                    Object.setPrototypeOf(_class.prototype, new def.Extends());

                    Object.defineProperty(_class, 'InheritsFrom', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: def.Extends
                    });

                    Object.defineProperty(_class.prototype, 'InheritsFrom', {
                        enumerable: false,
                        configurable: true,
                        writable: false,
                        value: def.Extends
                    });
                }
            }
            else if ((typeof def.Extends === "object") && !Array.isArray(def.Extends)) {
                var tempConstructor = new function tempConstructor() {};
                tempConstructor.prototype = def.Extends;
                Object.setPrototypeOf(_class.prototype, def.Extends);

                Object.defineProperty(_class, 'InheritsFrom', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: tempConstructor
                });

                Object.defineProperty(_class.prototype, 'InheritsFrom', {
                    enumerable: false,
                    configurable: true,
                    writable: false,
                    value: tempConstructor
                });
            }
            else
                throw new Error("A Class can only inherit from another Class, a constructor function, or an object.");
        }
        else {
            //Classes with no parent shouldn't be able to pretend.
            Object.defineProperty(_class, 'InheritsFrom', {
                enumerable: false,
                configurable: false,
                writable: false,
                value: null
            });

            Object.defineProperty(_class.prototype, 'InheritsFrom', {
                enumerable: false,
                configurable: true,
                writable: false,
                value: null
            });
        }
    };

    var CollectEvents = function CollectEvents(_class) {
        var retval = [];

        var obj = _class;
        do {
            var events = obj.RegisteredEvents || [];
            for (var i=0; i<events.length; ++i)
                if (retval.indexOf(events[i]) == -1)
                    retval.push(events[i]);

            obj = obj.InheritsFrom;
        } while (obj);

        return retval;
    };

    var RegisterEvents = function RegisterEvents(_class, def, priv) {
        var eventArray = def.Events;

        if (eventArray && !Array.isArray(eventArray))
            throw new Error("The Class Event list must be an array.");

        Object.defineProperty(_class, 'RegisteredEvents', { value: eventArray });

        //Collect all the events
        var eventList = CollectEvents(_class);
        var EventEnum = (eventList.length)?new Enum(eventList[0], eventList):null;

        //We do it this way to prevent the base scope's events from binding to all
        //child scopes!
        var getEvents = function getEvents() {
            return EventEnum;
        };

        //Make sure the Events enum is defined on every scope!
        Object.defineProperty(priv, "Events", { get: getEvents });
        Object.defineProperty(_class, "Events", { get: getEvents });
        Object.defineProperty(_class.prototype, "Events", { get: getEvents });
        Object.defineProperty(def, "Events", { get: getEvents });
    };

    var Extend = function Extend(dest, src) {
        var proto = Object.getPrototypeOf(dest);
        if (!(proto === Function.prototype))
            Object.setPrototypeOf(dest, null);

        var makeExtendProperty = function makeExtendProperty(obj, dict, key) {
            if (!obj.hasOwnProperty(key))
                Object.defineProperty(obj, key, {
                    enumerable: true,
                    get: function extendGetter() { return dict[key]; },
                    set: function extendSetter(val) { dict[key] = val; }
                });
        };

        var sObj = src;
        var sObjProto = Object.getPrototypeOf(sObj);
        while (!sObjProto || ((sObjProto !== Object) && (sObjProto !== Function))) {
            for (var key in sObj) {
                if (sObj.hasOwnProperty(key)) {
                    makeExtendProperty(dest, sObj, key);
                }
            }

            if (!sObjProto)
                break;

            sObj = sObjProto;
            sObjProto = Object.getPrototypeOf(sObj);
        }

        if (!(proto === Function.prototype))
            Object.setPrototypeOf(dest, proto);
    };

    var Super = function Super(_this, instance, self) {
        if (_this._superClass) {
            _this._superClass = _this._superClass.InheritsFrom;
        }
        else {
            _this._superClass = _this;
        }

        if (_this._superClass.InheritsFrom) {
            var base = _this._superClass.InheritsFrom;
            var inheritance =  {};
            var args = [].slice.call(arguments, 0);

            if (base.isClass || base.isClassInstance) {
                Object.defineProperties(inheritance, {
                    __isInheritedDomain: {
                        configurable: true,
                        value: true
                    }
                });
                args.splice(0, 3);
                args.push(self || _this);
                args.push(inheritance);
            }

            //Instantiate a new copy of the base class
            var inst = Object.create(base.prototype);

            //If the superclass is native, things are a little different...
            if (isNativeConstructor(base)) {
                if (!base.isNativeProxy)
                    throw new Error("WTF? Error while assembling object!");
            }
            else {
                //Make the base class aware we're picking up goodies
                if (base.isClass || base.isClassInstance)
                    inst.inheritance = inheritance;
                //Call the constructor
                base.apply(inst, args);
                //Get rid of the evidence that we peeked at the parent.
                delete inheritance.__isInheritedDomain;
                if (base.isClass || base.isClassInstance)
                    delete inst.inheritance;
                //If there's a child instance waiting for this instance to finish construction...
            }
            if (_this.inheritance) {
                //Attach our inheritance to the inheritance chain.
                Object.setPrototypeOf(_this.inheritance, inheritance);
                //Attach the fully expanded base instance as the new prototype of this instance.
                Object.setPrototypeOf(_this, inst);
            }
            else {
                //Move the default inheritance chain down to the bottom
                var old_proto = Object.getPrototypeOf(_this);

                //Attach the fully expanded base instance as the new prototype of this instance.
                Object.setPrototypeOf(_this, inst);

                var obj = _this;
                var proto = Object.getPrototypeOf(_this);

                //Find the lowest guy on the prototype chain.
                while (Object.getPrototypeOf(proto) != Object.prototype) {
                    obj = proto;
                    proto = Object.getPrototypeOf(proto);
                }

                //Hook the prototype chain down there.
                Object.setPrototypeOf(obj, old_proto);
            }
            //Attach the inheritance to our domain. Now we know everything!
            Object.setPrototypeOf(instance, inheritance);

            //Now, make sure Super is a reference to the unmodified prototype
            //Extend(instance.Super, inheritance);
        }

        delete _this._superClass;
    };

    var ExpandScopeElement = function ExpandScopeElement(dest, scope, key, _this) {
        if (dest.hasOwnProperty(key) && (scope[key] instanceof Box)) {
            var prop = scope[key];
            var isFn = (prop.value instanceof Function && !prop.value.isClass);
            var isFinal = prop.isFinal || isFn;

            //Handle the default case. The privilege level doesn't matter for that.
            var propConfig = {
                enumerable: true,
                configurable: !prop.isFinal
            };

            var validateReturnType = function validateReturnType(obj) {
                var retval;
                if (obj instanceof Function) {
                    retval = function validate_result() {
                        var r2 = obj.apply(undefined, arguments);
                        if ((r2 !== null) &&
                            (r2 !== undefined) &&
                            ((prop.type.isClass && !(r2 instanceof prop.type)) ||
                             (prop.type.isInterface && !prop.type.isImplementedBy(r2)))) {
                            throw new TypeError("Expected type " + prop.type.__name + ". Recevied type " + typeof(r2));
                        }

                        return r2;
                    }
                }
                else
                    retval = obj;

                return retval;
            };

            var validateAssignType = function validateAssignType(obj) {
                var retval = function validate_value(val) {
                    if ((val !== null) &&
                        (val !== undefined) &&
                        ((prop.type.isClass && !(val instanceof prop.type)) ||
                         (prop.type.isInterface && !prop.type.isImplementedBy(val)))) {
                        throw new TypeError("Expected type " + prop.type.__name + ". Recevied type " + typeof(val));
                    }
                    else {
                        if (obj instanceof Function)
                            obj(val);
                        else
                            obj = val;
                    }
                }

                return retval;
            };

            if (prop.isProperty) {
                propConfig.configurable = false;

                if (prop.value.hasOwnProperty("value")) {
                    propConfig.value = prop.value.value;

                    if (isSimpleFunction(propConfig.value))
                        propConfig.writable = true;
                }
                else {
                    if (_this) {
                        if ((prop.value.get instanceof Function) && prop.value.get.isFunctor)
                            propConfig.get = prop.value.get.rescope(_this);
                        else if (isSimpleFunction(prop.value.get))
                            propConfig.get = new Functor(_this, prop.value.get);
                        else
                            propConfig.get = prop.value.get;

                        if (propConfig.get && prop.type)
                            propConfig.get = validateReturnType(propConfig.get);

                        if ((prop.value.set instanceof Function) && prop.value.set.isFunctor)
                            propConfig.set = prop.value.set.rescope(_this);
                        else if (isSimpleFunction(prop.value.set))
                            propConfig.set = new Functor(_this, prop.value.set);
                        else
                            propConfig.set = prop.value.set;

                        if (propConfig.set && prop.type)
                            propConfig.set = validateAssignType(propConfig.set);
                    }
                    else {
                        if (prop.value.get)
                            propConfig.get = prop.value.get;

                        if (propConfig.get && prop.type)
                            propConfig.get = validateReturnType(propConfig.get);

                        if (prop.value.set)
                            propConfig.set = prop.value.set;

                        if (propConfig.set && prop.type)
                            propConfig.set = validateAssignType(propConfig.set);

                        if (prop.value.value) {
                            propConfig.writable = prop.value.wrtable;

                            if ((prop.value.value instanceof Function) && prop.value.value.isFunctor)
                                propConfig.value = prop.value.value.rescope(_this);
                            else
                                propConfig.value = prop.value.value;
                        }
                    }
                }
            }
            else {
                propConfig.writable = !isFinal;
                propConfig.value = prop.value;

                //Special care needs to be used for functions...
                if (isSimpleFunction(prop.value)) {
                    propConfig.writable = !prop.isPrivate && !prop.isStatic && !prop.isFinal;

                    if (prop.value.isFunctor)
                        propConfig.value = prop.value.rescope(_this);

                    if (prop.type)
                        propConfig.value = validateReturnType(propConfig.value);
                }

                if (prop.isDelegate) {
                    if (_this)
                        propConfig.value = new Functor(_this, propConfig.value);
                    else
                        throw new TypeError("Attempted to create a delegate without knowing the owning instance!");
                }
            }

            delete dest[key];
            Object.defineProperty(dest, key, propConfig);
        }
    };

    var _$ = function Class(name, definition) {
        //If we were only supplied 1 argument, and it's not a string, just assume it's the scope.
        if ((arguments.length === 1) && (typeof name !== "string")) {
            definition = name;
            name = "";
        }

        //Yes. Empty classes are valid!
        definition = definition || {};
        //Yes. Anonymous classes are also valid!
        name = name || "";

        if (Object.getPrototypeOf(this).constructor !== _$)
            throw new SyntaxError("Error! \"Class\" is a class definition constructor. " +
                                  "You must use 'new Class(...)' to use this function!");

        var instances = new WeakMap();
        var staticScope = {};
        var protectedStaticScope = {};
        var protectedScope = {};
        var publicScope = {};
        var classConstructor;
        var _classMode = Class.ClassModes.Default;

        var initialize = function initialize(_this, childDomain, self) {
            var domain = {};

            //Construct the base class first, if there is one.
            if (_this.InheritsFrom) {
                Super(_this, domain, self);
            }

            //We need to manually attach the Event enum.
            Object.defineProperties(domain, {
                "InheritsFrom": { enumerable: true, value: definition.Extends },
                "Self": { enumerable: true, value: self || _this },
                "Sibling": {
                    enumerable: true,
                    //Retrieve the private scope of obj if it's class is or descends from ours.
                    value: function getSibling(obj) {
                        var retval = null;
                        var ourProto = Object.getPrototypeOf(this.Self);

                        if (ourProto.isPrototypeOf(obj)) {
                            retval = instances[obj];
                            var sibling = obj;
                            var theirProto = Object.getPrototypeOf(sibling);

                            //Be careful! We don't want access to those things the current instance
                            //shouldn't know about it's sibling!
                            while (theirProto !== ourProto) {
                                retval = Object.getPrototypeOf(retval);
                                sibling = theirProto;
                                theirProto = Object.getPrototypeOf(sibling);
                            }
                        }
                        else
                            throw new ReferenceError("The class of the parameter does not have the class " +
                                                     "of the current instance as an Ancestor!\nCannot retrieve " +
                                                     "private scope!");
                        return retval;
                    }
                },
                "Events": { enumerable: true, value: definition.Events },
             	"Delegate": {
                    enumerable: true,
                    value: function Delegate(name, unsealed) {
                        var retval = null;
                        if (name instanceof Function)
                            retval = new Functor(this, name, unsealed);
                        else if ((typeof name === "string") && (this[name] instanceof Function))
                            retval = new Functor(this, this[name], unsealed);
                        else
                            throw new Error("The Delegate parameter must be either the string name of " +
                                            "a function in the current object or a function definition!");

                        return retval;
                    }
                }
            });

            if (childDomain) {
                //If we have a child domain due to a Super() call, then
                //unbox all protected elements into childDomain
                if (childDomain.__isInheritedDomain) {
                    Unbox(childDomain, protectedScope, domain, true);

                    //If we've got a non-private constructor, pack it in as well.
                    if ((classConstructor instanceof Box) && !classConstructor.isPrivate)
                        Object.defineProperty(childDomain, "Super", {
                            enumerable: true,
                            value: domain.Delegate(classConstructor.value, true)
                        });
                    //Otherwise fake one...
                    else {
                        Object.defineProperty(childDomain, "Super", {
                            enumerable: true,
                            value: domain.Delegate(function dummySuper() {
                                if (this.InheritsFrom)
                                    this.Super();
                            }, true)
                        });
                    }
                }
                //The only way to get here should be because of an InheritFrom() call.
                else {
                    var currentScope = protectedScope;

                    //Copy all of the ancestral properties into child domain.
                    while (Object.getPrototypeOf(currentScope)) {
                        for (var key in currentScope) {
                            if (currentScope.hasOwnProperty(key))
                                childDomain[key] = currentScope[key];
                        }

                        currentScope = Object.getPrototypeOf(currentScope);
                    }

                    childDomain.__static = protectedStaticScope;
                }
            }

            //Build the class instance container for this instance.
            createScope(domain);
            //Create a copy of the class scope for the current instance.
            instances.set(_this, domain);

            //As long as we're not dealing with a call from InheritFrom()
            if (!childDomain || childDomain.__isInheritedDomain) {
                /* Remove the prototype of the current object so we don't get
                   interference while adding public members to it. */
                var oldProto = Object.getPrototypeOf(_this);
                Object.setPrototypeOf(_this, {});

                //Make sure the public entries point to the appropriate class.
                Unbox(_this, publicScope, domain, true);
                
                //Re-attach the prototype
                Object.setPrototypeOf(_this, oldProto);
            }
        };

        var createScope = function createScope(scope) {
            Object.defineProperty(scope, "__isClassDomain", { enumerable: true, value: true });
            Object.defineProperty(scope, "__name", { enumerable: true, value: name || "<anonymous>" });
            
            Unbox(scope, definition, scope, false, ["Extends", "Events"]);
        };

        var makeRedirect = function makeRedirect(prop, dest, key) {
            var isProtected = (dest === protectedScope);
        	var propConfig = {
        		enumerable: true
        	};

            var getRedirect = function getRedirect() {
                var instance = ((prop.isStatic && this.__isClassDomain)?staticScope:
                                ((this.__isClassDomain)?this:instances.get(this))) || staticScope;
                var retval = instance[key];

                //If we're returning a function, make sure it's called against the correct object!
                if ((retval instanceof Function) && !retval.isClass && !retval.isFunctor && !retval.isEnumType)
                    retval = new Functor(instance, retval);

                return retval;
            };

            var setRedirect = function setRedirect(val) {
                var instance = ((prop.isStatic && this.__isClassDomain)?staticScope :
                                ((this.__isClassDomain)?this:instances.get(this))) || staticScope;
                instance[key] = val;
            };

            if (isProtected || (prop.isPublic && !prop.isStatic)) {
                propConfig.get = new Functor(null, getRedirect);

                if (!prop.isFinal)
                    propConfig.set = new Functor(null, setRedirect);
            }
            else {
                propConfig.get = getRedirect;

                if (!prop.isFinal)
                    propConfig.set = setRedirect;
            }

        	//Put a new property on the destination that references the
        	//redirected object.
        	dest[key] = new Box({
                privilege: prop.isPublic?Privilege.Public: (prop.isProtected?Privilege.Protected:Privilege.Private),
                isStatic: prop.isStatic,
                isProperty: true,
                value: propConfig
            });
        };

        //Allows construction from private static scope
        var createInstance = function createInstance() {
            var instance = Object.create($$.prototype);
            var priv = classConstructor.isPrivate << 2 + classConstructor.isProtected << 1 + classConstructor.isPublic;
            classConstructor.isPublic = true;
            $$.call(instance, arguments);
            classConstructor.isPrivate = !!(priv & 4);
            classConstructor.isProtected = !!(priv & 2);
            classConstructor.isPrivate = !!(priv & 1);
            return instance;
        };

        //Test to see if definition matches the given interface.
        var hasInterface = function hasInterface(iface) {
            if (!iface.isInterface)
                throw new TypeError("Classes only implement Interface objects!");

            return iface.isImplementedBy(definition);
        };

        //Ensures proper handling of non-property, non-function members with types.
        var unpackTypedMembers = function unpackTypedMembers() {
            var types = {};

            var typedProperty = function typedProperty(type, skey) {
                return {
                    get: function getTypedProperty() { return this[skey]; },
                    set: function setTypedProperty(val) {
                        if ((val === null) || (val === undefined) ||
                            (type.isClass && (val.__isClassDomain?(val.Self instanceof type):(val instanceof type))) ||
                            (type.isInterface && type.isImplementedBy(val))) {
                            this[skey] = val;
                        }
                        else {
                            if (type.isClass)
                                throw new TypeError("Value must be of type " + type.__name);
                            else
                                throw new TypeError("Value must implement the " + type.__name + " interface");
                        }
                    }
                };
            };

            //Create the storage variables needed by the typed values.
            for (var key in definition) {
                if (definition.hasOwnProperty(key)) {
                    var prop = definition[key];

                    if ((prop instanceof Box) &&
                        !(prop.value instanceof Function) &&
                        !prop.isProperty && prop.type) {

                        var priv = (prop.isPrivate)?Privilege.Private:(prop.isProtected)?Privilege.Protected:Privilege.Public;
                        var skey = "_$_" + key;

                        /**
                            A typed property is really 2 property definitions in one:
                                a storage variable for the value being checked, and
                                a property accessor that gives read/write access
                                to the storage variable
                        */
                        //Create a new box for the storage variable
                        types[skey] = new Box({
                            privilege: Privilege.Private,
                            isStatic: prop.isStatic,
                            isFinal: prop.isFinal,
                            value: prop.value
                        });
                        //Now replace definition[key] with a property definition that accesses the storage variable
                        definition[key] = new Box({
                            privilege: Privilege.Private,
                            isStatic: prop.isStatic,
                            isFinal: prop.isFinal,
                            isProperty: true,
                            value: typedProperty(prop.type, skey)
                        });
                    }
                }
            }

            //Now put the newly created storage variables back into definition
            for (var key in types) {
                if (types.hasOwnProperty(key)) {
                    definition[key] = types[key];
                }
            }
        };

        //Parses the definition parameter.
        var generateScopes = function generateScopes(_class) {
            var hasInterfaces = false;

            //There's some extra work to be done to support type restrictions
            unpackTypedMembers();

            //User controlled extra data space.
            //definition.Tag = {};
            var reservedWords = [ "Mode", "Implements", "Mixins", "Extends",
                                  "Events", "Constructor", "StaticConstructor",
                                  "Self", "Sibling", "Delegate", "__name",
                                  "isClass", "classMode", "inheritsFrom",
                                  "getInterface", "isClassInstance", "__static" ];

            //Pass 1, take care of the definition keywords
            for (var key in definition) {
                if (definition.hasOwnProperty(key) && (reservedWords.indexOf(key) > -1)) {
                    var value = definition[key];
                    var prop = value;

                    // If the prop isn't boxed, then Box it as public.
                    if (!(prop instanceof Box)) {
                        prop = new Box({
                            privilege: Privilege.Public,
                            value: prop
                        });
                        definition[key] = prop;
                    }

                    //There are a few special keys to contend with....
                    switch(key) {
                        case "Mode":
                            if (Class.ClassModes.isMember(prop.value))
                                _classMode = prop.value;
                            else
                                throw new SyntaxError("Invalid Mode set for this Class!");

                            break;
                        case "Implements":
                            if (Array.isArray(prop.value)) {
                                for (var key in prop.value) {
                                    if (prop.value.hasOwnProperty(key)) {
                                        var value = prop.value[key];

                                        if (!value.isInterface)
                                            throw new TypeError ("Invalid interface found in \"Implements\" array!");
                                    }
                                }

                                hasInterfaces = true;
                            }
                            else
                                throw new TypeError("Implements must be an array of Interface objects!");

                            definition[key] = prop.value;
                            //Skip this. We'll handle it later.
                            break;
                        case "Mixins":
                            if (prop.value) {
                                if (!Array.isArray(prop.value))
                                    throw new TypeError("Mixins must be an array of objects!");

                                for (var key in prop.value) {
                                    if (prop.value.hasOwnProperty(key))
                                        if (prop[key] instanceof Function)
                                            throw new TypeError("Mixins must be an array of objects!");
                                }
                            }

                            //Intentional fall through...
                        case "Extends":
                        case "Events":
                            definition[key] = prop.value;
                            //Skip this. We'll handle it later.
                            break;
                        case "Constructor":
                            if (prop instanceof Box) {
                                if (prop.isStatic || prop.isProperty)
                                    throw new Error("The constructor cannot be static or a property!");

                                if (!(prop.value instanceof Function))
                                    throw new Error("The constructor must be a function!");
                            }

                            staticScope.CreateInstance = createInstance;
                            classConstructor = prop;
                            delete definition[key];
                            break;
                        case "StaticConstructor":
                            if ((prop instanceof Box) &&
                                (prop.isPrivate || prop.isProtected ||
                                 prop.isProperty || prop.isFinal || prop.isStatic)) {
                                throw "The static construct can only be marked Public!" +
                                      "Other privilege levels are not allowed.";
                            }

                            value = prop;
                            break;
                        default:
                            throw new Error("The reserved word \"" + key + "\" cannot be an element in the Class definition!");
                    }

                    //Now hide this key from further iteration
                    Object.defineProperty(definition, key, { value: value });
                }
            }

            //Pass 2, Process the definition
            for (var key in definition) {
                if (definition.hasOwnProperty(key) && (reservedWords.indexOf(key) == -1)) {
                    var prop = definition[key];

                    // If the prop isn't boxed, then Box it as public.
                    if (!(prop instanceof Box)) {
                        prop = new Box({
                            privilege: Privilege.Public,
                            value: prop
                        });
                        definition[key] = prop;
                    }

                    //If it's a static element, move it to staticScope, and remap
                    //it as a property referencing the staticScope.
                    if (prop.isStatic) {
                        staticScope[key] = prop;
                        delete definition[key];
                        makeRedirect(prop, definition, key);

                        if (prop.isProtected)
                            makeRedirect(prop, protectedStaticScope, key);
                    }

                    //If it's a public element, make both publicScope and staticScope
                    //map it as a reference to the internal instance.
                    if (prop.isPublic) {
                    	makeRedirect(prop, publicScope, key);
                    	makeRedirect(prop, protectedScope, key);

                        //If it's also static, make another map onto the constructor.
                    	if (prop.isStatic)
                        	makeRedirect(prop, _class, key);
                    }

                    //If it's a protected element, make protectedScope map it as a
                    //reference to the internal instance.
                    if (prop.isProtected) {
                    	makeRedirect(prop, protectedScope, key);
                    }

                    if (prop.isAbstract) {
                        if (_classMode == Class.ClassModes.Final)
                            throw new SyntaxError("A \"Final\" class cannot have an \"Abstract\" method!");
                        _classMode = Class.ClassModes.Abstract;
                    }

                    //Expand all static properties since they won't change and always
                    //need to be available.
                    ExpandScopeElement(protectedStaticScope, protectedStaticScope, key);
                	ExpandScopeElement(staticScope, staticScope, key);
                	ExpandScopeElement(_class, _class, key);
                }
            }

            //Time to inject a Self object onto the staticScope object
            staticScope["Self"] = new Box({
                privilege: Privilege.Private,
                isStatic: true,
                isFinal: true,
                value: _class
            });
            ExpandScopeElement(staticScope, staticScope, "Self");

            //Static scope also needs a Delegate helper
            staticScope["Delegate"] = new Box({
                privilege: Privilege.Private,
                isStatic: true,
                isFinal: true,
                value: function Delegate(name, unsealed) {
                    var retval = null;
                    if (name instanceof Function)
                        retval = new Functor(this, name, unsealed);
                    else if ((typeof name === "string") && (this[name] instanceof Function))
                        retval = new Functor(this, this[name], unsealed);
                    else
                        throw new Error("The Delegate parameter must be either the string name of " +
                                        "a function in the current object or a function definition!");

                    return retval;
                }
            });
            ExpandScopeElement(staticScope, staticScope, "Delegate");

            if (hasInterfaces) {
                var matches = true;
                var lastIndex = -1;
                var ifaces = definition.Interfaces;

                for (var i=0; !matches && (i<ifaces.length); ++i) {
                    lastIndex = i;
                    matches &= hasInterface(ifaces[key]);
                }

                if (!matches)
                    throw new TypeError("Class does not implement interface at index " + lastindex + "!");

                //Make a Static function for hasInterface as "Implements"
                var prop = new Box({
                    privilege: Privilege.Public,
                    isStatic: true,
                    value: hasInterface
                });
                var key = "Implements";
                staticScope[key] = prop;
                makeRedirect(prop, definition, key);
                makeRedirect(prop, _class, key);
                makeRedirect(prop, publicScope, key);
                makeRedirect(prop, protectedScope, key);
                ExpandScopeElement(staticScope, staticScope, key);
            	ExpandScopeElement(_class, _class, key);
            }
        };

        eval("var $$ = function " + name + "() {\n\
            if (!this.isClassInstance)\n\
                throw new Error(\"This is a class instance generating function.\" + \n\
                                \"You must use 'new " + (name || "<ClassName>") +
                                "(...)' to use this function.\");\n\
            \n\
            var childDomain = arguments[arguments.length -1];\n\
            var self = arguments[arguments.length -2];\n\
            var argc = arguments.length - 2;\n\
            \n\
            if (!(childDomain && (childDomain.__isInheritedDomain ||\n\
                                  childDomain.__isDescendant))) {\n\
                childDomain = null;\n\
                self = null;\n\
                argc += 2;\n\
            }\n\
            \n\
            if (self && !self.isClassInstance) {\n\
                self = null;\n\
                ++argc;\n\
            }\n\
            \n\
            if (($$.classMode === Class.ClassModes.Abstract) &&\n\
                (!childDomain || !(childDomain.__isInheritedDomain || childDomain.__isDescendant)))\n\
                throw new SyntaxError(\"Cannot construct an Abstract Class!\");\n\
            \n\
            if (!classConstructor ||\n\
                ((classConstructor instanceof Box) &&\n\
                 (classConstructor.isPublic ||\n\
                  (childDomain && childDomain.__isInheritedDomain && classConstructor.isProtected)))) {\n\
                initialize(this, childDomain, self);\n\
                var instance = instances.get(this);\n\
                \n\
                if (definition.Mixins)\n\
                    BlendMixins(definition.Mixins, instance);\n\
                \n\
                Object.seal(instance);\n\
                \n\
                var args = [].slice.call(arguments, 0, argc);\n\
                \n\
                if (classConstructor) {\n\
                    if (!(childDomain && (childDomain.__isInheritedDomain || childDomain.__isDescendant))) {\n\
                        if (this.InheritsFrom && !this.isNativeProxy) {\n\
                            var hasSuperFirst = /function\\\s+\\\w+\\\s*\\\((\\\w+\\\s*(,\\\s*\\\w+)*)?\\\)\\\s*{\\\s*this\\\s*\\\.\\\s*Super\\\s*\\\(/;\n\
                            var hasSuper = /\\\s*this\\\s*\\\.\\\s*Super\\\s*\\\(/;\n\
                            var constructorString = classConstructor.value.toString();\n\
                            \n\
                            if (!hasSuper.test(constructorString)) {\n\
                                console.warn('Calling this.Super() for you!!!. You should be doing this in your " + name + " constructor!');\n\
                                \n\
                                if (instance.Super.length)\n\
                                    throw new Error('No default constructor available in " + name + "\\\'s super class!');\n\
                                \n\
                                instance.Super();\n\
                            }\n\
                            else {\n\
                                if (!hasSuperFirst.test(constructorString))\n\
                                    console.warn('Super should be the first call in your " + name + " constructor!')\n\
                            }\n\
                        }\n\
                        classConstructor.value.apply(instance, args);\n\
                    }\n\
                }\n\
                else if (this.InheritsFrom) {\n\
                    instance.Super();\n\
                }\n\
            }\n\
            else if (classConstructor)\n\
                throw new Error(\"Constructor '" + name + "' is not accessible!\");\n\
            \n\
            return this;\n\
        }");

        //Set up the scope containers.
        generateScopes($$);

        Object.defineProperties($$, {
            "__name": { value: name },
            "isClass": { value: true },
            "classMode": { get: function getClassMode() { return _classMode; }},
            "inheritsFrom": {
                value: function inheritsFrom(obj) {
                    return (definition.hasOwnProperty("Extends") &&
                            definition.Extends.isClass &&
                            ((definition.Extends === obj) ||
                             (definition.Extends.inheritsFrom(obj))));
                }
            },
            "getInterface": {
                value: function getInterface() {
                    var intDef = {};

                    if ($$.InheritsFrom)
                        intDef.Extends = [ $$.InheritsFrom.getInterface() ];

                    if (definition.Implements && Array.isArray(definition.Implements)) {
                        if (!Array.isArray(intDef.Extends))
                            intDef.Extends = [];

                        for (var i=0; i< definition.Implements.length; ++i)
                            intDef.Extends.push(definition.Implements[i]);
                    }

                    intDef.Properties = {};
                    intDef.Methods = {};

                    for(var elementKey in definition) {
                        if (definition.hasOwnProperty(elementKey)) {
                            var element = definition[elementKey];

                            if ((elementKey != "Constructor") && (elementKey != "StaticConstructor") &&
                                (element.isBox && element.isPublic)) {

                                if (element.isProperty)
                                    intDef.Properties[elementKey] = element.value.hasOwnProperty("set");
                                else
                                    intDef.Methods[elementKey] = element.value.length;
                            }
                        }
                    }

                    return new Interface(name + "_Interface", intDef);
                }
            }
        });

        Object.defineProperty($$.prototype, "isClassInstance", { value: true });
        InheritFrom($$, definition, protectedScope, staticScope, protectedStaticScope);
        RegisterEvents($$, definition, staticScope);

        if (definition.StaticConstructor) {
        	definition.StaticConstructor.value.call(staticScope, $$);

            //A Static constructor can only be run once for the entire class definition!
            delete definition.StaticConstructor;
        }

        Object.seal(staticScope);
        Object.seal($$);
        return $$;
    };
    
    Object.defineProperties(_$, {
        "ClassModes": {
           enumerable: false,
            configurable: false,
            writable: false,
            value: new Enum("Default", ["Default", "Abstract", "Final"])
        },
        "Private": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Private(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isPrivate = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else {
                    retval = new Box({
                        privilege: Privilege.Private,
                        value: val
                    });
                }

                return retval;
            }
        },        
        "Protected": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Protected(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isProtected = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else {
                    retval = new Box({
                        privilege: Privilege.Protected,
                        value: val
                    });
                }

                return retval;
            }
        },
        "Public": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Public(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isPublic = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else {
                    retval = new Box({
                        privilege: Privilege.Public,
                        value: val
                    });
                }

                return retval;
            }
        },
        "Static": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Static(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isStatic = true;
                }
                else {
                    retval = new Box({
                        isStatic: true,
                        value: val
                    });
                }

                return retval;
            }
        },
        "Final": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Final(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isFinal = true;
                }
                else {
                    retval = new Box({
                        isFinal: true,
                        value: val
                    });
                }

                return retval;
            }
        },
        "Abstract": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function abstract(val) {
                var retval = null;
                var nullFunction = new Functor(null, null);

                if (val instanceof Box) {
                    retval = val;
                    val.isAbstract = true;
                    val.value = nullFunction;
                    val.value.fix();
                }
                else {
                    retval = new Box({
                        isAbstract: true,
                        value: nullFunction
                    });
                }

                return retval;
            }
        },
        "Property": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Property(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isProperty = true;
                }
                else {
                    retval = new Box({
                        isProperty: true,
                        value: val
                    });
                }

                return retval;
            }
        },
        "Delegate": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Delegate(val) {
                var retval = null;
                
                if (val instanceof Box) {
                    if (val.value instanceof Function) {
                        retval = val;
                        retval.isDelegate = true;
                    }
                    else
                        throw new SyntaxError("Only member functions can be Delegates!");
                }
                else if ((val instanceof Function) && !val.isClass) {
                    retval = new Box({
                        isDelegate: true,
                        value: val
                    });
                }
                else
                    throw new SyntaxError("Only member functions can be Delegates!");

                return retval;
            }
        },
        "Type": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function Type(type, val) {
                var retval = null;

                var isValid = function isValid(t, v) {
                    return ((v === null) || (v === undefined) ||
                            (t.isInterface && t.isImplementedBy(v)) ||
                            (t.isClass && (v instanceof t)) ||
                            ((t === Function) && (v instanceof Function)) ||
                            ((t === Date) && (v instanceof Date)) ||
                            ((t === String) && (typeof v == "string")) ||
                            ((typeof t == "string") && (t.toLowerCase() == typeof v)));
                };

                if (type && (type.isClass || type.isInterface || (type === Function) ||
                             (type === String) || (type === Date) ||
                             ((typeof type == "string") &&
                              ((type.toLowerCase() == "string") ||
                               (type.toLowerCase() == "number") ||
                               (type.toLowerCase() == "boolean"))))) {
                    if (val instanceof Box) {
                        if (isValid(type, val.value) || val.isProperty || isSimpleFunction(val.value)) {
                            retval = val;
                            retval.type = type;
                        }
                        else if (type.isClass)
                            throw new TypeError("Value must be of type " + type.__name);
                        else
                            throw new TypeError("Value must implement the " + type.__name + " interface");
                    }
                    else if (isValid(type, val)) {
                        retval = new Box({
                            type: type,
                            value: val
                        });
                    }
                    else if (type.isClass)
                        throw new TypeError("Value must be of type " + type.__name);
                    else
                        throw new TypeError("Value must implement the " + type.__name + " interface");
                }
                else
                    throw new TypeError("Type must reference either a Class or an Interface!");

                return retval;
            }
        }
    });




    Object.seal(_$);
    return _$;
})();

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = Class;
