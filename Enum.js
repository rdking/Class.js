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

var Enum = function Enum(defValName, params) {
	var $ = function EnumType(param) {
        var self = this;

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
			
			if (((n === undefined) && (this.value !== v)) ||
				((v === undefined) && (this.name != n)) ||
				((n !== undefined) && (v !== undefined) &&
				 (this.value !== v) && (this.name != n)))
				throw new Error("Parameter '" + param + "' is not a name or value match for any member of this Enum!");
            else if (Object.isFrozen($))
                self = $[this.name];
		}
		else {
			self = $[defValName];
        }

        return self;
	};
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
    
    Object.defineProperties($, {
        isMember: {
            enumerable: true,
            value: function isMember(obj) {
                var retval = false;
               
                if (obj && obj.isEnum)
                    retval = (params[obj.name] === obj.value);
                
                return retval;
            }
        },
        isEnumType: { value: true }
    });
	
	Object.defineProperties($.prototype, {
        "isEnum": { value: true },
        "valueOf": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function() { return this.value; }
        },
        "_value": {
            enumerable: false,
            configurable: false,
            writable: true,
            value: null
        },
        "name": {
            enumerable: true,
            configurable: false,
            get: function() {
                var retval;
                for (var key in params)
                    if (params.hasOwnProperty(key) && (params[key] === this._value)) {
                        retval = key;
                        break;
                    }

                return retval;
            },
            set: function(n) {
                if (params.hasOwnProperty(n))
                    this._value = params[n];
                else
                    throw new Error("Element name '" + n + "' is not a member of this Enum!");
            }
        },
        "value": {
            enumerable: true,
            configurable: false,
            get: function() { return this._value; },
            set: function(v) {
                if (this._value != v) {
                    for (var key in params)
                        if (params.hasOwnProperty(key) && (params[key] === v)) {
                            this._value = v;
                            break;
                        }

                    if (this._value != v)
                        throw new Error("Element value '" + v + "' is not a member of this Enum!");
                }
            }
        },
        "toString": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function() {
                return this._value.toString() + " (" + this.name +")";
            }
        },
        "toJSON": {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function() {
                return { name: this.name, value: this._value };
            }
        }
    });
	
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
