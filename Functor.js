/*
 * Filename: Functor.js
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
var Functor = (function() {
    var $$ = function Functor(obj, method, unsealed) {
        var isFixed = false;
        var retval = function functorCall() {
            return method.apply(obj || this, arguments);
        };

        Object.defineProperties(retval, {
            "_this": {
                get: function getThis() { return obj; },
                set: function setThis(val) { !isFixed && (obj = val); }
            },
            "_method": {
                get: function getMethod() { return method; },
                set: function setMethod(val) { !isFixed && (method = val); }
            },
            isFunctor: {
                value: true
            },
            /*apply: {
                enumerable: true,
                value: function apply(owner, params) {
                    if (owner === undefined)
                        owner = obj;

                    method.apply(owner, params);
                }
            },*/
            rescope: {
                value: function rescope(newObj) {
                    return new Functor(newObj, method);
                }
            },
            fix: {
                value: function fix() {
                    isFixed = true;
                    Object.freeze(this);
                }
            }
        });

        if (!unsealed)
            Object.seal(retval);
        return retval;
    };

    Object.seal($$);
    return $$;
})();

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = Functor;
