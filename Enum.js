/*
 * Filename: Enum.js
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

var Class = require("./Class");

var Enum = function Enum(defValName, params) {
    var $ = Class(class EnumType {
        static [Symbol.Class.privateMembers]() {
            return {
                [Symbol.Class.instance]: {
                    value: null
                }
            };
        }

        constructor(param) {
            var self = this;
            var n, v;
        
            if ((param !== null) && (param !== undefined)) {
                var n;
                var v;
                if ((typeof(param) == "object") && ("name" in param) && ("value" in param)) {
                    n = param.name;
                    v = param.value;
                }
                else {
                    n = param;
                    v = param;
                }
        
                try {
                    this.value = v;
                    if (n === v)
                        n = undefined;
                }
                catch (err1) {
                    try {
                        this.name = n;
                        if (n === v)
                            v = undefined;
                    }
                    catch (err2) {
                        throw new Error("Parameter '" + param + "' is not a name or value match for any member of this Enum!");
                    }
                }
                
                if (((n === undefined) && (this.$value !== v)) ||
                    ((v === undefined) && (this.name != n)) ||
                    ((n !== undefined) && (v !== undefined) &&
                     ((this.$value !== v) || (this.name != n))))
                    throw new Error("Parameter '" + param + "' is not a name or value match for any member of this Enum!");
                else if (Object.isFrozen($))
                    self = $[this.name];
            }
            else {
                self = $[defValName];
            }
        
            return self;
        }

        static isMember(obj) {
            var retval = false;
            
            if (obj && obj.isEnum)
                retval = (params[obj.name] === obj.$value);
            
            return retval;
        }

        static get isEnumType() { return true; }

        static memberByName(mName) {
            var retval = null;
            if (params.hasOwnProperty(mName))
                retval = new $(mName);

            return retval;
        }

        isEnum() { return true; }

        valueOf() { return this.$value; }

        get name() {
            var retval;
            for (var key in params) {
                if (params.hasOwnProperty(key) && (params[key] === this.$value)) {
                    retval = key;
                    break;
                }
            }

            return retval;
        }

        set name(n) {
            if (params.hasOwnProperty(n))
                this.$value = params[n];
            else
                throw new Error("Element name '" + n + "' is not a member of this Enum!");
        }

        get value() { return this.$value; }

        set value(v) {
            if (this.$value != v) {
                for (var key in params)
                    if (params.hasOwnProperty(key) && (params[key] === v)) {
                        this.$value = v;
                        break;
                    }

                if (this.$value != v)
                    throw new Error("Element value '" + v + "' is not a member of this Enum!");
            }
        }

        toString() {
            return this.$value.toString() + " (" + this.name +")";
        }

        valueOf() {
            return this.$value;
        }

        toJSON() {
            return { name: this.name, value: this.$value };
        }
    });

	var validDefault = false;
	
	var addEnum = function(key, value) {
		Object.defineProperty($, key, {
			enumerable: true,
			configurable: false,
			writable: false,
			value: new $(value)
		});

        Object.freeze($[key]);
	};
    
	if (Array.isArray(params)) {
		var len = params.length;
		for (var i=0; i<len; ++i) {
			var key = params[i];
			validDefault |= (key === defValName);
			params[key] = i;		//re-attach the index to params as a key:value pair.
			delete params[i];		//remove the array element.
			addEnum(key, i);
		}		
	}
	else {
		for (var key in params) {
			if (params.hasOwnProperty(key)) {
				validDefault |= (key === defValName);
				addEnum(key, params[key]);
			}
		}
	}
	
	if (!validDefault)
		throw new Error("Default value '" + defValName + "' is not a member of this Enum!");
	
	Object.seal($.prototype);
	Object.freeze($);

	return $;
};

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = Enum;
