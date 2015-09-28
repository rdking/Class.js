/*
 * Filename: Interface.js
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

/*
    Interface Definition Object:
    {
        Extends: [
            interface1,
            interface2, ...
        ],
        Properties: {
            name: writable,
            name: writable, ...
        },
        Methods: {
            name: paramCnt1,
            name: paramCnt2, ...
        }
    }
*/

var WeakMap = require("./WeakMap");

var Interface = (function() {
    var scope = new WeakMap();

    var Extend = function Extend(def, obj) {
        if (obj.hasOwnProperty("Extends") && Array.isArray(obj.Extends)) {
            if (!def.hasOwnProperty("Extends"))
                def.Extends = [];
            
            for (var index in obj.Extends) {
                if (obj.Extends.hasOwnProperty(index)) {
                    var parent = obj.Extends[index];
                    if (def.Extends.indexOf(parent) < 0)
                        def.Extends.push(parent);
                }
            }
        }

        if (obj.hasOwnProperty("Properties")) {
            for (var property in obj.Properties) {
                if (obj.Properties.hasOwnProperty(property)) {
                    var prop = obj.Properties[property];

                    if (!def.hasOwnProperty("Properties"))
                        def.Properties = {};

                    if (def.Properties.hasOwnProperty(property)) {
                        if (def.Properties[property] != prop)
                            throw new TypeError("Conflicting definitions for property '" + property + "'!");
                    }
                    else
                        def.Properties[property] = prop;
                }
            }
        }

        if (obj.hasOwnProperty("Methods")) {
            for (var method in obj.Methods) {
                if (obj.Methods.hasOwnProperty(method)) {
                    var m = obj.Methods[method];

                    if (!def.hasOwnProperty("Methods"))
                        def.Methods = {};

                    if (def.Methods.hasOwnProperty(method)) {
                        if (def.Methods[method] != m)
                            throw new TypeError("Conflicting definitions for method '" + method + "'!");
                    }
                    else
                        def.Methods[method] = m;
                }
            }
        }
    };

    var Inherit = function Inherit(def, obj) {
        if (obj instanceof Interface) {
            Extend(def, obj);
        }
        else
            throw new TypeError("Interfaces can only inherit from   Interfaces!");
    };

    var Flatten = function Flatten(def) {
        var retval = {};

        Extend(retval, def);

        if (Array.isArray(def.Extends)) {
            var count = def.Extends.length;
            for (var i=0; i<count; ++i)
                Inherit(retval, def.Extends[i]);
        }
        else if (def.Extends)
            throw new SyntaxError("Extends must be an array of Interface objects if defined!");

        Object.freeze(retval);
        return retval;
    };

    var $$ = function Interface(name, definition) {
        //If we were only supplied 1 argument, and it's not a string, just assume it's the scope.
        if ((arguments.length === 1) && (typeof name !== "string")) {
            definition = name;
            name = "";
        }

        //Yes. Empty classes are valid!
        definition = definition || {};
        //Yes. Anonymous classes are also valid!
        name = name || "";

        Object.freeze(definition);
        scope.set(this, { raw: definition, flattened: Flatten(definition)});

        Object.freeze(this);
        return this;
    };

    Object.defineProperties($$.prototype, {
        valueOf: {
            get: function getValueOf() { return JSON.stringify(scope.get(this).raw); }
        },
        Properties: {
            enumerable: true,
            get: function getProperties() { return scope.get(this).raw.Properties; }
        },
        Methods: {
            enumerable: true,
            get: function getMethods() { return scope.get(this).raw.Methods; }
        },
        Extends: {
            enumerable: true,
            get: function getExtends() { return scope.get(this).raw.Extends; }
        },
        isInterface: {
            enumerable: true,
            value: true
        },
        isImplementedBy: {
            enumerable: true,
            value: function isImplementedBy(obj) {
                var retval = true;

                if (!obj)
                    throw new TypeError("The obj potentially implementing this interface cannot be null!");

                var test = function test(obj, def, isProp) {
                    var rval = true;
                    for (var member in def) {
                        var test = false;
                        if (def.hasOwnProperty(member)) {
                            console.log("Testing for '" + member + "'...");
                            if (obj.hasOwnProperty(member)) {
                                var box = obj[member];
                                if (box) {
                                    console.log("'"+ member + "' has a value...");
                                    if (box.isBox) {
                                        console.log("'"+ member + "' is Boxed...");
                                        if (box.isPublic) {
                                            console.log("'"+ member + "' is Public...");
                                            if (isProp && box.isProperty) {
                                                console.log("'"+ member + "' is a Property...");
                                                if (def[member]) {
                                                    if (box.value && (box.value.set instanceof Function))
                                                        test |= true;                                                    
                                                }
                                                if (!def[member] || test) {
                                                    if (box.value && (box.value.get instanceof Function))
                                                        test |= true;                                                    
                                                }
                                                
                                            }
                                            else if (!isProp && !box.isProperty) {
                                                console.log("'"+ member + "' is a Method...");
                                                if (box.value && (box.value instanceof Function)) {
                                                    if (box.value.length == def[member])
                                                        test |= true;
                                                }
                                            }
                                        }
                                    }
                                    else if ((box instanceof Function) == !isProp) {
                                        console.log("'"+ member + "' is not Boxed...");
                                        if (!isProp) {
                                            console.log("'"+ member + "' is a Method...");
                                            test |= (def[member] === box.length);
                                        }
                                        else
                                            test |= true;
                                    }
                                }
                                else
                                    test |= isProp;
                            }
                        }

                        console.log("'"+ member + "' does" + (!test? " not": "") + " exist!");
                        rval &= test;
                        if (!retval) break;
                    }

                    return rval;
                };

                if (obj.isClass || obj.isClassInstance)
                    retval = obj.Implements(this);
                else {
                    var container = scope.get(this).flattened;
                    if (this.hasOwnProperty("Properties"))
                        retval &= test(obj, container.Properties, true);

                    if (this.hasOwnProperty("Methods"))
                        retval &= test(obj, container.Methods, false);
                }

                return retval;
            }
        },
        inheritsFrom: {
            enumerable: true,
            value: function inheritsFrom(obj) {
                if (!obj)
                    throw new SyntaxError("The object being tested as an ancestor cannot be null!");

                var definition = scope.get(this).raw;
                var retval = !definition.Extends || (definition.Extends.indexOf(obj) == -1);
                return retval;
            }
        }
    });

    Object.seal($$);
    return $$;
})();

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = Interface;
