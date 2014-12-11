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

var Class = (function() {
    var Privilege = new Enum("Public", [ "Public", "Protected", "Private" ]);
    var Box = (function() {
        var internal = new WeakMap();
        var $$$ = function Box(priv, _static, final, property, value) {
            internal.set(this, {
                isPrivate: (priv == Privilege.Private),
                isProtected: (priv == Privilege.Protected),
                isPublic: (priv == Privilege.Public),
                isFinal: final,
                isStatic: _static,
                isProperty: property,
                value: value
            });

            if (this.isProtected && this.isStatic)
                throw new Error("\"Protected Static\" scope is USELESS and therefore not allowed!");

            if (this.isProperty && this.isFinal)
                throw new Error("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

            if (this.isPrivate && this.isStatic && this.Property)
            	throw new Error("What exactly is the use-case for a Private Static Property? Doesn't make sense, so NO!");

            return this;
        };

        Object.defineProperty($$$.prototype, "isPrivate", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isPrivate; },
            set: function(val) {
                internal.get(this).isPrivate = val;
                internal.get(this).isProtected &= !val;
                internal.get(this).isPublic &= !val;
            },
        });

        Object.defineProperty($$$.prototype, "isProtected", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isProtected; },
            set: function(val) {
                if (this.isStatic && val)
                    throw new Error("\"Protected Static\" scope is USELESS and therefore not allowed!");

                internal.get(this).isProtected = val;
                internal.get(this).isPrivate &= !val;
                internal.get(this).isPublic &= !val;
            },
        });

        Object.defineProperty($$$.prototype, "isPublic", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isPublic; },
            set: function(val) {
                internal.get(this).isPrivate &= !val;
                internal.get(this).isProtected &= !val;
                internal.get(this).isPublic = val;
            },
        });

        Object.defineProperty($$$.prototype, "isStatic", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isStatic; },
            set: function(val) {
                if (this.isProtected && val)
                    throw new Error("\"Protected Static\" scope is USELESS and therefore not allowed!");

                internal.get(this).isStatic = val;
            },
        });

        Object.defineProperty($$$.prototype, "isFinal", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isFinal; },
            set: function(val) { internal.get(this).isFinal = val; },
        });

        Object.defineProperty($$$.prototype, "isProperty", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).isProperty; },
            set: function(val) { internal.get(this).isProperty = val; },
        });

        Object.defineProperty($$$.prototype, "value", {
            enumerable: true,
            configurable: false,
            get: function() { return internal.get(this).value; },
        });

        Object.seal($$$);
        return $$$;
    })();

    var Unbox = function(dest, source, _this, shallow, force, ignore) {
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

        if (!Array.isArray(force))
        	force = [force];

        while (Object.getPrototypeOf(currentScope)) {
            for (var key in currentScope) {
                if ((ignore.indexOf(key) < 0) && currentScope.hasOwnProperty(key)) {
            		for (var i=0; i<dest.length; ++i) {
						force[i] && (dest[i][key] = true);
						ExpandScopeElement(dest[i], currentScope, key, _this);
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

    var InheritFrom = function(_class, def, protScope) {
        if (def && def.Base) {
            if (def.Base.isClass) {
                var inherited = { __isDescendant: true };
                _class.prototype = _class.prototype || {};
                Object.setPrototypeOf(_class.prototype, new def.Base(inherited));
                Object.setPrototypeOf(protScope, inherited);

                Object.defineProperty(_class, 'InheritsFrom', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: def.Base
                });

                Object.defineProperty(_class.prototype, 'InheritsFrom', {
                    enumerable: false,
                    configurable: true,
                    writable: false,
                    value: def.Base
                });
            }
            else
                throw new Error("Sorry. A Class can only inherit from another Class.");
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
            for (var event in obj.RegisteredEvents) {
                if (obj.RegisteredEvents.hasOwnProperty(event))
                    retval.push(obj.RegisteredEvents[event]);
            }

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

        var getEvents = function() {
            if (priv.events === undefined) {
                if (eventList.length > 0)
                    priv.events = new Enum(eventList[0], eventList);
                else
                    priv.events = null;
            }

            return priv.events;
        };

        Object.defineProperty(_class, "Events", { get: getEvents });
        Object.defineProperty(def, "Events", { get: getEvents });
    };

    var Super = function(_this, instance, self) {
        console.log("Called Super!");
        if (_this._superClass) {
            _this._superClass = _this._superClass.InheritsFrom;
        }
        else {
            _this._superClass = _this;
        }

        if (_this._superClass.InheritsFrom) {
        	var base = _this._superClass.InheritsFrom;
            var inheritance = _this.inheritance || { __isInheritedDomain: true };
            var args = [].slice.call(arguments, 0);
            args.splice(0, 2);
          	args.push(self || _this);
            args.push(inheritance);
            Object.defineProperty(instance, "base", {
            	enumerable: true,
            	value: (function() {
                	var inst = Object.create(base.prototype);
                	inst.inheritance = inheritance;

                	base.apply(inst, args);
                	delete inst.inheritance;
                    Object.setPrototypeOf(instance, inheritance);
                    var proto = Object.getPrototypeOf(_this);
                    Object.setPrototypeOf(proto, inst);
                	return inst;
            	})()
            });

            delete _this._superClass;
        }
    };

    var ExpandScopeElement = function(dest, scope, key, _this) {
        if (dest.hasOwnProperty(key) && (scope[key] instanceof Box)) {
            var prop = scope[key];
            var isFn = prop.value instanceof Function;
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
            throw new Error("Error! \"Class\" is a class definition constructor. " +
            				"You must use 'new Class(...)' to use this function!");

        var instances = new WeakMap();
        var staticScope = {};
        var protectedScope = {};
        var constructor;

        var initialize = function(_this, childDomain, self) {
        	//Build the class instance container for this instance.
            var domain = createScope(_this);
            //We need to manually attach the Event enum.
            Object.defineProperties(domain, {
                "Self": { value: self || _this },
                "Events": { value: definition.Events },
	         	"Delegate": {
		        	value: function(name) {
		        		var retval = null;
		        		if (name instanceof Function)
		        			retval = new Functor(this, name);
		        		else if ((typeof name === "string") && (this[name] instanceof Function))
		        			retval = new Functor(this, this[name]);
		        		else
		        			throw new Error("The Delegate parameter must be either the string name of a function in the current object or a function definition!");
		        			
		        		return retval;
		        	}
		        }
            });

            //Create a copy of the class scope for the current instance.
            instances.set(_this, domain);

            if (childDomain) {
                //Unbox all protected elements into childDomain
                if (childDomain.__isInheritedDomain)
					Unbox(childDomain, protectedScope, domain, false, true);
				else {
					//Copy the boxes into the inheriting domain for later unboxing.
					var currentScope = protectedScope;

					while (Object.getPrototypeOf(currentScope)) {
						for (var key in currentScope) {
							if (currentScope.hasOwnProperty(key))
								childDomain[key] = currentScope[key];
						}

						currentScope = Object.getPrototypeOf(currentScope);
					}
				}
            }

            if (!(childDomain && childDomain.__isClassDomain)) {
                //Make sure the public entries point to the appropriate class.
                //var pubDomain = childDomain || domain;
                var proto = Object.getPrototypeOf(_this);
                Unbox(_this, proto, domain/*pubDomain*/, true, true);
            }
        };

        var createScope = function(_this) {
            var retval = {};

            Object.defineProperty(retval, "__isClassDomain", { enumerable: true, value: true });
            Object.defineProperty(retval, "__name", { enumerable: true, value: name || "<anonymous>" });

            Unbox([retval, _this], definition, _this, false, [true, false], ["Base", "Events"]);
//             var currentScope = definition;
//             while (Object.getPrototypeOf(currentScope)) {
//                 for (var key in currentScope) {
//                     if (currentScope.hasOwnProperty(key) && (key != "Base") &&
//                         (key != "Events") && (currentScope[key] instanceof Box)) {
//                         retval[key] = null;
//                         ExpandScopeElement(retval, currentScope, key, _this);
//                         ExpandScopeElement(_this, currentScope, key, _this);
//                     }
//                 }
//
//                 currentScope = Object.getPrototypeOf(currentScope);
//             }
//
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
                if ((retval instanceof Function) && !retval.isFunctor)
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
        						prop.isStatic, false, true, propConfig);
        };

        //Allows construction from private static scope
        var createInstance = function() {
            var instance = Object.create($$.prototype);
            var priv = constructor.isPrivate << 2 + constructor.isProtected << 1 + constructor.isPublic;
            constructor.isPublic = true;
            $$.call(instance, arguments);
            constructor.isPrivate = !!(priv & 4);
            constructor.isProtected = !!(priv & 2);
            constructor.isPrivate = !!(priv & 1);
            return instance;
        };

        //Parses the definition parameter.
        var generateScopes = function(_class) {
            for (var key in definition) {
                if (definition.hasOwnProperty(key)) {
                    var prop = definition[key];

                    // If the prop isn't boxed, then Box it as public.
                    if (!(prop instanceof Box)) {
                        prop = new Box(Privilege.Public, false, false, false, prop);
                        definition[key] = prop;
                    }

                    //There are a few special keys to contend with....
                    switch(key) {
                        case "Base":
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

                            //If it's private, make it available to static methods!
                            if (prop.isPrivate)
                                staticScope.Instance = createInstance;

                            constructor = prop;
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

                    if (prop.isPublic) {
                    	makeRedirect(prop, _class.prototype, key);
                    	makeRedirect(prop, protectedScope, key);

                    	if (prop.isStatic)
                        	makeRedirect(prop, _class, key);
                    }

                    if (prop.isProtected) {
                    	makeRedirect(prop, protectedScope, key);
                    }

                	ExpandScopeElement(staticScope, staticScope, key);
                	ExpandScopeElement(_class, _class, key);
                }
            }
        };


        eval("var $$ = function " + name + "() {\n\
            if (!this.isClassInstance)\n\
                throw new Error(\"This is a class instance generating function.\
You must use 'new " + (name || "<ClassName>") + "(...)' to use this function.\");\n\
            \n\
            console.log(\"Constructor: " + name + "\");\n\
            \n\
            var childDomain = arguments[arguments.length -1];\n\
            var self = arguments[arguments.length -2];\n\
			\n\
            if (!(self && childDomain && ((self.isClass && childDomain.__isClassDomain) ||\n\
        								  childDomain.__isInheritedDomain))) {\n\
				self = null;\n\
				childDomain = null;\n\
            }\n\
            \n\
            if (!constructor ||\n\
                ((constructor instanceof Box) &&\n\
                 (constructor.isPublic ||\n\
                  (childDomain && childDomain.__isClassDomain && constructor.isProtected)))) {\n\
                initialize(this, childDomain, self);\n\
                var instance = instances.get(this);\n\
                \n\
                if (this.InheritsFrom) {\n\
                    Super(this, instance, self);\n\
                }\n\
                \n\
                Object.seal(instance);\n\
                \n\
                var args = [].slice.call(arguments, 0);\n\
                args.pop();\n\
                \n\
                if (constructor)\n\
                    constructor.value.apply(instance, args);\n\
            }\n\
            else if (constructor)\n\
                throw new Error(\"Constructor is not accessible!\");\n\
            \n\
            return this;\n\
        }");

        //Set up the scope containers.
        generateScopes($$);

        InheritFrom($$, definition, protectedScope);

        RegisterEvents($$, definition, staticScope);

        Object.defineProperty($$, "isClass", { value: true });
        Object.defineProperty($$.prototype, "isClassInstance", { value: true });

        if (definition.StaticConstructor) {
        	definition.StaticConstructor.value();

            //A Static constructor can only be run once for the entire class definition!
            delete definition.StaticConstructor;
        }

        Object.seal($$);
        return $$;
    };

    Object.defineProperty(_$, "Private", {
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
                retval = new Box(Privilege.Private, false, false, false, val);

            return retval;
        }
    });

    Object.defineProperty(_$, "Protected", {
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
                retval = new Box(Privilege.Protected, false, false, false, val);

            return retval;
        }
    });

    Object.defineProperty(_$, "Public", {
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
                retval = new Box(Privilege.Public, false, false, false, val);

            return retval;
        }
    });

    Object.defineProperty(_$, "Static", {
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
                retval = new Box(null, true, false, false, val);

            return retval;
        }
    });

    Object.defineProperty(_$, "Final", {
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
                retval = new Box(null, false, true, false, val);

            return retval;
        }
    });

    Object.defineProperty(_$, "Property", {
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
                retval = new Box(null, false, false, true, val);

            return retval;
        }
    });

    Object.seal(_$);
    return _$;
})();

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = Class;
