/*
 * Filename: WeakMap.js
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
var WeakMapShim = function createWeakMapShim() {
	//Unique key bank.
	var keys = [];
	
	var guid = function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
    };
	
	//Constructor
	var $ = function WeakMap(preload) {		
		Object.defineProperty(this, "_id", {
			enumerable: false,
			configurable: false,
			writable: true,
			value: guid()
		});

		var isArray = Array.isArray(preload);
		for (var elementId in preload) {
			if (preload.hasOwnProperty(elementId)) {
				var element = preload[elementId];
				
				if (isArray)
					this.set(element[0], element[1]);
				else 
					this.set(elementId, element);
			}
		}		
	};
	
	Object.defineProperty($.prototype, "get", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (key) {
			var retval;
			if ((typeof key == "object") &&
				key["_#WeakMap#_"] && key["_#WeakMapData#_"] &&
				key["_#WeakMapData#_"][this._id]) {
				retval = key["_#WeakMapData#_"][this._id][keys.indexOf(key["_#WeakMap#_"])];
			}
				
			return retval;
		}			
	});
	
	Object.defineProperty($.prototype, "set", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (key, value) {
			if (typeof key != "object") 
				throw new Error("Invalid Key! WeakMap keys must be Objects!");
				
			//Get a unique value for this key if it doesn't already have one.
			if (!key.hasOwnProperty("_#WeakMap#_")) {
				Object.defineProperty(key, "_#WeakMap#_", {
					enumerable: false,
					configurable: false,
					writable: false,
					value: (function () {
						var retval = null;
						
						do{
							var newKey = guid();
							
							if (keys.indexOf(newKey) == -1) {
								keys.push(newKey);
								retval = newKey;
							}
						} while (retval == null);
						
						return retval;
					})()
				});
			}
			
			//Make sure key has a datastore for the weak map's data.
			if (!key.hasOwnProperty("_#WeakMapData#_")) {
				Object.defineProperty(key, "_#WeakMapData#_", {
					enumerable: false,
					configurable: false,
					writable: false,
					value: {}
				});
			}

			if (!key["_#WeakMapData#_"][this._id])
				key["_#WeakMapData#_"][this._id] = [];
				
			key["_#WeakMapData#_"][this._id][keys.indexOf(key["_#WeakMap#_"])] = value;
		}
	});
	
	Object.defineProperty($.prototype, "has", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (key) {
			var retval = false;
			if ((typeof key != "object") &&
				key["_#WeakMap#_"] && key["_#WeakMapData#_"] &&
				key["_#WeakMapData#_"][this._id]) {
				retval = key["_#WeakMapData#_"][this._id].hasOwnProperty(keys.indexOf(key["_#WeakMap#_"]));
			}
				
			return retval;
		}
	});
	
	Object.defineProperty($.prototype, "delete", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (key) {
			if ((typeof key != "object") &&
				key["_#WeakMap#_"] && key["_#WeakMapData#_"] &&
				key["_#WeakMapData#_"][this._id]) {
				delete key["_#WeakMapData#_"][this._id][keys.indexOf(key["_#WeakMap#_"])];
			}
		}
	});
		
	Object.defineProperty($.prototype, "clear", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function() {
			this._id = guid();
		}
	});
	
	Object.defineProperty($.prototype, "length", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: 1			
	});
	
	Object.seal($);
	return $;
};

var WM;
if (typeof WeakMap != "function")
	WM = WeakMapShim();
else
	WM = WeakMap;

//If some form of require.js exists, export the class
if (module && exports && module.exports === exports)
    module.exports = WM;
