/*
 * Filename: Attribute.js
 * Created By: Ranando D. King
 * License: Apache 2.0
 *
 * Copyright 2015 Ranando D. King
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

var Class = require("./Class");
var Private = Class.Private;
var Property = Class.Property;

var Attribute = (function() {
    var ExpandScopeElement = function(dest, scope, key, _this) {
        if (dest.hasOwnProperty(key) && scope[key].isBox) {
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
            }

            delete dest[key];
            Object.defineProperty(dest, key, propConfig);
        }
    };

    var makeRedirect = function(prop, dest, key) {
        var isProtected = false;
        var propConfig = {
            enumerable: true
        };

        var getRedirect = function() {
            var instance = instances.get(this);
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
                            prop.isStatic, false, true, propConfig);
    };

    var $$ = function Attribute(name, definition) {
        if (!name || !name.length)
            throw new SyntaxError("Attributes must be assigned a name!");

        if (definition.contains("Constructor"))
            throw new SyntaxError("Attributes are static objects and cannot contain a non-static constructor!");
        
        var scope = new WeakMap();
        
        definition["$source"] = Private(Property({ get: function getSource() { return scope.get(this); } }));

        var Special = { Extends:0, Implements:0, Events:0, Mixins:0, StaticConstructor:0 };

        //attrib is the Class of the Attribute!
        var attrib = Class.call(this, name, definition);

        var _$ = function(obj) {
            var attr = new attrib();
            var instance = {};
            
            scope.set(attr, obj);

            for (var member in definition) {
                if (definition.hasOwnProperty(member) && definition[member]) {
                    if (!(member in Special) && definition[member].isBox) {
                        makeRedirect(definition[member], instance, member);
                        ExpandScopeElement(instance, instance, member, attr);
                    }
                }
            }
            
            instance.prototype = obj;
            
            if (!("$attributes" in instance))
                Object.defineProperty(instance, "$attributes", { value: [] });
            
            instance["$attributes"].push(name);
            Object.seal(instance);
            return instance;
        };

        Object.seal(_$);
        return _$;
    };

    Object.seal($$);
    return $$;
})();

module.exports = Attribute;
