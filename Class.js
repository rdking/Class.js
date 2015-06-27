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

if (module && exports && module.exports === exports) {
    if (!Enum)
        Enum = require('./Enum');

    if (!Functor)
        Functor = require('./Functor');

    if (!WeakMap)
        WeakMap = require('./WeakMap');
}

//Another polyfill....
if (!(Object.setPrototypeOf instanceof Function)) {
    Object.defineProperty(Object, "setPrototypeOf", {
        value: function(obj, proto) {
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
        value: function(obj) {
            if (!(typeof obj == "object") || Array.isArray(obj))
                throw new Error("Object.getPrototypeOf: Parameter is not an object!");

            return obj.__proto__;
        }
    });
}

var Class = (function() {
    var Privilege = new Enum("Public", [ "Public", "Protected", "Private" ]);
    var Box = (function() {
        var internal = new WeakMap();
        var $$$ = function Box(priv, _static, final, property, delegate, value) {
            internal.set(this, {
                isPrivate: (priv == Privilege.Private),
                isProtected: (priv == Privilege.Protected),
                isPublic: (priv == Privilege.Public),
                isFinal: final,
                isStatic: _static,
                isProperty: property,
                isDelegate: delegate,
                value: value
            });

            if (this.isProperty && this.isFinal)
                throw new Error("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

            if (this.isPrivate && this.isStatic && this.Property)
            	throw new Error("What exactly is the use-case for a Private Static Property? Doesn't make sense, so NO!");

            return this;
        };

        Object.defineProperties($$$.prototype, {
            isBox: {
               enumerable: true,
               value: true
            },
            isPrivate: {
                enumerable: true,
                get: function() { return internal.get(this).isPrivate; },
                set: function(val) {
                    internal.get(this).isPrivate = val;
                    internal.get(this).isProtected &= !val;
                    internal.get(this).isPublic &= !val;
                }
            },
            isProtected: {
                enumerable: true,
                get: function() { return internal.get(this).isProtected; },
                set: function(val) {
                    internal.get(this).isProtected = val;
                    internal.get(this).isPrivate &= !val;
                    internal.get(this).isPublic &= !val;
                }
            },
            isPublic: {
                enumerable: true,
                get: function() { return internal.get(this).isPublic; },
                set: function(val) {
                    internal.get(this).isPrivate &= !val;
                    internal.get(this).isProtected &= !val;
                    internal.get(this).isPublic = val;
                }
            },
            isStatic: {
                enumerable: true,
                get: function() { return internal.get(this).isStatic; },
                set: function(val) { internal.get(this).isStatic = val; }
            },
            isFinal: {
                enumerable: true,
                get: function() { return internal.get(this).isFinal; },
                set: function(val) { internal.get(this).isFinal = val; }
            },
            isProperty: {
                enumerable: true,
                get: function() { return internal.get(this).isProperty; },
                set: function(val) { internal.get(this).isProperty = val; }
            },
            isDelegate: {
                enumerable: true,
                get: function() { return internal.get(this).isDelegate; },
                set: function(val) { internal.get(this).isDelegate = val; }
            },
            value: {
                enumerable: true,
                get: function() { return internal.get(this).value; }
            }
        });

        Object.seal($$$);
        return $$$;
    })();

    var Unbox = function(dest, source, _this, shallow, ignore) {
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
                        if (!dest[i].hasOwnProperty[key]) {
                            dest[i][key] = true;
                            ExpandScopeElement(dest[i], currentScope, key, _this);
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

    var BlendMixins = function(list, instance) {
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

    var InheritFrom = function(_class, def, protScope, statScope) {
        _class.prototype = _class.prototype || {};

        if (def && def.Extends) {
            //If it's a non-final Class.js class.
            if (def.Extends.isClass) {
                if (def.Extends.classMode === Class.ClassModes.Final)
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

                        if (value.isBox && value.isStatic && !statScope.hasOwnProperty(key)) {
                            statScope[key] = true;
                            ExpandScopeElement(statScope, inherited, key, statScope);
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

    var CollectEvents = function(_class) {
        var retval = [];

        var obj = _class;
        do {
            var events = obj.RegisteredEvents || [];
            for (var i=0; i<events.length; ++i)
                retval.push(events[i]);

            obj = obj.InheritsFrom;
        } while (obj);

        return retval;
    };

    var RegisterEvents = function(_class, def, priv) {
        var eventArray = def.Events;

        if (eventArray && !Array.isArray(eventArray))
            throw new Error("The Class Event list must be an array.");

        Object.defineProperty(_class, 'RegisteredEvents', { value: eventArray });

        //Collect all the events
        var eventList = CollectEvents(_class);
        var EventEnum = (eventList.length)?new Enum(eventList[0], eventList):null;

        //We do it this way to prevent the base scope's events from binding to all
        //child scopes!
        var getEvents = function() {
            return EventEnum;
        };

        //Make sure the Events enum is defined on every scope!
        Object.defineProperty(priv, "Events", { get: getEvents });
        Object.defineProperty(_class, "Events", { get: getEvents });
        Object.defineProperty(_class.prototype, "Events", { get: getEvents });
        Object.defineProperty(def, "Events", { get: getEvents });
    };

    var Extend = function(dest, src) {
        var proto = Object.getPrototypeOf(dest);
        if (!(proto === Function.prototype))
            Object.setPrototypeOf(dest, null);

        var makeExtendProperty = function makeExtendProperty(obj, key) {
            if (!obj.hasOwnProperty(key))
                Object.defineProperty(obj, key, {
                    enumerable: true,
                    get: function extendGetter() { return src[key]; },
                    set: function extendSetter(val) { src[key] = val }
                });
        }

        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                makeExtendProperty(dest, key);
            }
        }

        if (!(proto === Function.prototype))
            Object.setPrototypeOf(dest, proto);
    };

    var Super = function(_this, instance, self) {
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
                Object.defineProperty(inheritance, "__isInheritedDomain", {
                    configurable: true,
                    value: true
                });
                args.splice(0, 3);
                args.push(self || _this);
                args.push(inheritance);
            }

            //Instantiate a new copy of the base class
            var inst = Object.create(base.prototype);
            //Make the base class aware we're picking up goodies
            if (base.isClass || base.isClassInstance)
                inst.inheritance = inheritance;
            //Call the constructor
            base.apply(inst, args);
            //Get rid of the evidence that we peeked at the parent.
            delete inheritance.__isInheritedDomain;
            if (base.isClass || base.isClassInstance)
                delete inst.inheritance;
            //Attach our inheritance as the prototype of the child's inheritance... if there is one.
            if (_this.inheritance)
                Object.setPrototypeOf(_this.inheritance, inheritance);
            //Attach the inheritance to our domain. Now we know everything!
            Object.setPrototypeOf(instance, inheritance);
            //Attach the fully expanded base instance as the new prototype of this instance.
            Object.setPrototypeOf(_this, inst);
            //If we don't have a super constructor, create a dummy stub for it.
            if (!instance.Super)
                Object.defineProperty(instance, "Super", {
                    enumerable: true,
                    value: instance.Delegate(function() { this.Super(); }, true)
                });

            //Now attach our inheritance to it.
            Extend(instance.Super, inheritance);
        }

        delete _this._superClass;
    };

    var ExpandScopeElement = function(dest, scope, key, _this) {
        if (dest.hasOwnProperty(key) && (scope[key] instanceof Box)) {
            var prop = scope[key];
            var isFn = (prop.value instanceof Function && !prop.value.isClass);
            var isFinal = prop.isFinal || isFn;

            //Handle the default case. The privilege level doesn't matter for that.
            var propConfig = {
                enumerable: true,
                configurable: !prop.isFinal
            };

            if (prop.isProperty) {
                propConfig.configurable = false;

                if (_this) {
                    if ((prop.value.get instanceof Function) && prop.value.get.isFunctor)
                        propConfig.get = prop.value.get.rescope(_this);
                    else
                        propConfig.get = prop.value.get;

                    if ((prop.value.set instanceof Function) && prop.value.set.isFunctor)
                        propConfig.set = prop.value.set.rescope(_this);
                    else
                        propConfig.set = prop.value.set;
                }
                else {
                    if (prop.value.get)
                        propConfig.get = prop.value.get;

                    if (prop.value.set)
                        propConfig.set = prop.value.set;

                    if (prop.value.value) {
                        propConfig.writable = prop.value.wrtable;

                        if ((prop.value.value instanceof Function) && prop.value.value.isFunctor)
                            propConfig.value = prop.value.value.rescope(_this);
                        else
                            propConfig.value = prop.value.value;
                    }
                }
            }
            else {
                propConfig.writable = !isFinal;

                if ((prop.value instanceof Function) && prop.value.isFunctor)
                    propConfig.value = prop.value.rescope(_this);
                else
                    propConfig.value = prop.value;
                
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
        var protectedScope = {};
        var publicScope = {};
        var classConstructor;
        var _classMode = Class.ClassModes.Default;

        var initialize = function(_this, childDomain, self) {
        	//Build the class instance container for this instance.
            var domain = createScope(_this);
            //We need to manually attach the Event enum.
            Object.defineProperties(domain, {
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
                            throw new ReferenceError("The class of the parameter does not have the class of the current instance as an Ancestor!\nCannot retrieve private scope!");
                        return retval;
                    }
                },
                "Events": { enumerable: true, value: definition.Events },
             	"Delegate": {
                    enumerable: true,
                    value: function(name, unsealed) {
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

            //Create a copy of the class scope for the current instance.
            instances.set(_this, domain);

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

                    //Make sure the child knows who its parent is.
                    Object.defineProperty(childDomain, "__name", { value: name });
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
                }
            }
            
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

        var createScope = function(_this) {
            var retval = {};

            Object.defineProperty(retval, "__isClassDomain", { enumerable: true, value: true });
            Object.defineProperty(retval, "__name", { enumerable: true, value: name || "<anonymous>" });
            
            Unbox(retval, definition, _this, false, ["Extends", "Events"]);
            //Unbox(_this, publicScope, _this, false, ["Extends", "Events"]);

            return retval;
        };

        var makeRedirect = function(prop, dest, key) {
            var isProtected = (dest === protectedScope);
        	var propConfig = {
        		enumerable: true
        	};

            var getRedirect = function() {
                var instance = ((prop.isStatic && this.__isClassDomain)?staticScope:
                                ((this.__isClassDomain)?this:instances.get(this))) || staticScope;
                var retval = instance[key];

                //If we're returning a function, make sure it's called against the correct object!
                if ((retval instanceof Function) && !retval.isClass && !retval.isFunctor)
                    retval = new Functor(instance, retval);

                return retval;
            };

            var setRedirect = function(val) {
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
        	dest[key] = new Box(prop.isPublic?Privilege.Public: (prop.isProtected?Privilege.Protected:Privilege.Private),
        						prop.isStatic, false, true, false, propConfig);
        };

        //Allows construction from private static scope
        var createInstance = function() {
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
        var hasInterface = function(iface) {
            if (!iface.isInterface)
                throw new TypeError("Classes only implement Interface objects!");

            return iface.isImplementedBy(definition);
        };

        //Parses the definition parameter.
        var generateScopes = function(_class) {
            var hasInterfaces = false;

            //User controlled extra data space.
            //definition.Tag = {};

            for (var key in definition) {
                if (definition.hasOwnProperty(key)) {
                    var prop = definition[key];

                    // If the prop isn't boxed, then Box it as public.
                    if (!(prop instanceof Box)) {
                        prop = new Box(Privilege.Public, false, false, false, false, prop);
                        definition[key] = prop;
                    }

                    //There are a few special keys to contend with....
                    switch(key) {
                        case "Mode":
                            if (Class.ClassModes.isMember(prop.value))
                                _classMode = prop.value;
                            else
                                throw new SyntaxError("Invalid Mode set for this Class!");
                            
                            continue;
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
                            continue;
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
                            continue;
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
                        	continue;
                        case "StaticConstructor":
                        	if ((prop instanceof Box) &&
                        	    (prop.isPrivate || prop.isProtected ||
                        	   	 prop.isProperty || prop.isFinal || prop.isStatic)) {
                        		throw "The static construct can only be marked Public!" +
                        			  "Other privilege levels are not allowed.";
                            }

                            continue;
                    }

                    //If it's a static element, move it to staticScope, and remap
                    //it as a property referencing the staticScope.
                    if (prop.isStatic) {
                        staticScope[key] = prop;
                        delete definition[key];
                        makeRedirect(prop, definition, key);
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

                    //Expand all static properties since they won't change and always
                    //need to be available.
                	ExpandScopeElement(staticScope, staticScope, key);
                	ExpandScopeElement(_class, _class, key);
                }
            }

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
                var prop = new Box(Privilege.Public, true, false, false, false, hasInterface);
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
                \n\
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
                if (this.InheritsFrom) {\n\
                    Super(this, instance, self);\n\
                }\n\
                \n\
                if (definition.Mixins)\n\
                    BlendMixins(definition.Mixins, instance);\n\
                \n\
                Object.seal(instance);\n\
                \n\
                var args = [].slice.call(arguments, 0, argc);\n\
                \n\
                if (classConstructor && !childDomain)\n\
                    classConstructor.value.apply(instance, args);\n\
            }\n\
            else if (classConstructor)\n\
                throw new Error(\"Constructor '" + name + "' is not accessible!\");\n\
            \n\
            return this;\n\
        }");

        //Set up the scope containers.
        generateScopes($$);

        InheritFrom($$, definition, protectedScope, staticScope);

        RegisterEvents($$, definition, staticScope);

        Object.defineProperties($$, {
            "isClass": { value: true },
            "classMode": { get: function() { return _classMode; }}
        });
        Object.defineProperty($$.prototype, "isClassInstance", { value: true });

        if (definition.StaticConstructor) {
        	definition.StaticConstructor.value.call(staticScope, $$);

            //A Static constructor can only be run once for the entire class definition!
            delete definition.StaticConstructor;
        }

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
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isPrivate = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else
                    retval = new Box(Privilege.Private, false, false, false, false, val);

                return retval;
            }
        },        
        "Protected": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isProtected = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else
                    retval = new Box(Privilege.Protected, false, false, false, false, val);

                return retval;
            }
        },
        "Public": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    if (!val.isPublic && !val.isProtected && !val.isPrivate) {
                        retval = val;
                        retval.isPublic = true;
                    }
                    else
                        throw new Error("\"Public\", \"Protected\", and \"Private\" are mutually exclusive!");
                }
                else
                    retval = new Box(Privilege.Public, false, false, false, false, val);

                return retval;
            }
        },
        "Static": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isStatic = true;
                }
                else
                    retval = new Box(null, true, false, false, false, val);

                return retval;
            }
        },
        "Final": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isFinal = true;
                }
                else
                    retval = new Box(null, false, true, false, false, val);

                return retval;
            }
        },
        "Property": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;

                if (val instanceof Box) {
                    retval = val;
                    retval.isProperty = true;
                }
                else
                    retval = new Box(null, false, false, true, false, val);

                return retval;
            }
        },
        "Delegate": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(val) {
                var retval = null;
                
                if (val instanceof Box) {
                    if (val.value instanceof Function) {
                        retval = val;
                        retval.isDelegate = true;
                    }
                    else
                        throw new SyntaxError("Only member functions can be Delegates!");
                }
                else if ((val instanceof Function) && !val.isClass)
                    retval = new Box(null, false, false, false, true, val);
                else
                    throw new SyntaxError("Only member functions can be Delegates!");

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
