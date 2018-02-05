/**
 * Creates the Box definition used by both the ES5 and ES6 versions of Class.js
 * 
 * @param {*} privEnum - The Enum privilege definition
 * @param {*} hasES6 - A flag denoting if ES6 is available
 * @returns {Function} - the Box constructor
 */
function generateBox(privEnum, hasES6) {
	var Privilege = privEnum;

	return (function _Box() {

		var internal = new WeakMap();

		/**
		 * Box - The metadata object used to contain the description of a member of a
		 * defined Class type.
		 *
		 * @class Box
		 * @param {Object} params - Parameter block encoding the state of each flag.
		 * @property {Privilege} params.privilege - The Privilege for this member.
		 * @property {boolean} params.isFinal - Can it be overridden or changed?
		 * @property {boolean} params.isAbstract - Must it be overridden to be used?
		 * @property {boolean} params.isStatic - Is it owned by the Class type?
		 * @property {boolean} params.isProperty - Does it have side effects?
		 * @property {boolean} params.isDelegate - Will it be called externally?
		 * @property {string} params.type - The specific type returned by this member.
		 * @property {*} params.value - The statically assigned value for this member.
		 */
		var retval = function Box(params) {
			internal.set(this, {
				privilege: params.privilege,
				isFinal: !!params.isFinal,
				isAbstract: !!params.isAbstract,
				isStatic: !!params.isStatic,
				isProperty: !!params.isProperty,
				isDelegate: !!params.isDelegate,
				type: params.type,
				value: params.value
			});

			if (this.isProperty && this.isFinal)
				throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

			if (this.isAbstract && this.isProperty)
				throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");

			if (this.isAbstract && this.isFinal)
				throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");

			return this;
		};

		Object.defineProperties(retval.prototype, {
			/**
			 * @memberof Box
			 * @property {boolean} isLocked - Flag signifying whether or not the Box
			 * can be edited further. Once locked, the box cannot be unlocked.
			 */
			isLocked: {
				enumerable: true,
				get: function getIsLocked() { return !!internal.get(this).isLocked; },
				set: function setIsLocked(val) {
					if (val)
						internal.get(this).isLocked = val;
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isBox - Flag identifying that this a Box and not
			 * a JavaScript value.
			 */
			isBox: {
			enumerable: true,
			value: true
			},
			/**
			 * @memberof Box
			 * @property {boolean} noPrivilege - Internal flag set to true when no
			 * privilege level is specified for the member.
			 * @readonly
			 */
			noPrivilege: {
				enumerable: false,
				get: function getNoPrivilege() { return internal.get(this).privilege === Privilege.None; }
			},
			isLink: {
				enumerable: false,
				get: function getIsLink() { return internal.get(this).privilege === Privilege.Link; },
				set: function setIsLink(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val)
							that.privilege = Privilege.Link;
						else if (that.privilege === Privilege.Link)
							that.privilege = Privilege.None;
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {Privilege} privilege - Returns the current privilege enum.
			 */
			privilege: {
				enumerable: true,
				get: function getPrivilege() { return internal.get(this).privilege; },
				set: function setPrivilege(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (Privilege.isMember(val))
							that.privilege = val;
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isPrivate - Flag identifying that this member is
			 * only accessible internally on direct instances the declaring Class
			 * via 'this'.
			 */
			isPrivate: {
				enumerable: true,
				get: function getIsPrivate() { return internal.get(this).privilege === Privilege.Private; },
				set: function setIsPrivate(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.privilege !== Privilege.Private) {
								if (that.privilege === Privilege.None) {
									that.privilege = Privilege.Private;
								}
								else {
									throw new ClassDefError("Member cannot be both 'Private' and '" +
															that.privilege.name + "' at the same time!");
								}
							}
						}
						else if (that.privilege === Privilege.Private) {
							that.privilege = Privilege.None;
						}
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isProtected - Flag identifying that this member
			 * is accessible internally via this in all instances of the declaring
			 * class.
			 */
			isProtected: {
				enumerable: true,
				get: function getIsProtected() { return internal.get(this).privilege === Privilege.Protected; },
				set: function setIsProtected(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.privilege !== Privilege.Protected) {
								if (that.privilege === Privilege.None) {
									that.privilege = Privilege.Protected;
								}
								else {
									throw new ClassDefError("Member cannot be both 'Protected' and '" +
															that.privilege.name + "' at the same time!");
								}

							}
						}
						else if (that.privilege === Privilege.Protected) {
							that.privilege = Privilege.None;
						}
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isPublic - Flag identifying that this member
			 * is accessible externally on all descendants of the declaring class.
			 */
			isPublic: {
				enumerable: true,
				get: function getIsPublic() { return internal.get(this).privilege === Privilege.Public; },
				set: function setIsPublic(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.privilege !== Privilege.Public) {
								if (that.privilege === Privilege.None) {
									that.privilege = Privilege.Public;
								}
								else {
									throw new ClassDefError("Member cannot be both 'Public' and '" +
															that.privilege.name + "' at the same time!");
								}

							}
						}
						else if (that.privilege === Privilege.Public) {
							that.privilege = Privilege.None;
						}
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isStatic - Flag identifying that this member
			 * is accessible via the declared Class type's constructor.
			 */
			isStatic: {
				enumerable: true,
				get: function getIsStatic() { return internal.get(this).isStatic; },
				set: function setIsStatic(val) {
					if (!this.isLocked)
						internal.get(this).isStatic = val;
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isFinal - Flag identifying that this member
			 * cannot be overridden by declarations in subclasses of the declared
			 * Class.
			 */
			isFinal: {
				enumerable: true,
				get: function getIsFinal() { return internal.get(this).isFinal; },
				set: function setIsFinal(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.isProperty)
								throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

							if (that.isAbstract)
								throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");
						}

						that.isFinal = val;
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isAbstract - Flag identifying that this member
			 * must be overridden by declarations in subclasses of the declared
			 * Class.
			 */
			isAbstract: {
				enumerable: true,
				get: function getIsAbstract() { return internal.get(this).isAbstract; },
				set: function setIsAbstract(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.isProperty)
								throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");

							if (that.isFinal)
								throw new ClassDefError("Please make up your mind! Do you want to define it now(\"Final\") or later(\"Abstract\")?");
						}

						that.isAbstract = val;
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isProperty - Flag identifying that this member
			 * uses a getter and/or setter method(s) to define its value.
			 */
			isProperty: {
				enumerable: true,
				get: function getIsProperty() { return internal.get(this).isProperty; },
				set: function setIsProperty(val) {
					var that = internal.get(this);
					if (!that.isLocked) {
						if (val) {
							if (that.isFinal)
								throw new ClassDefError("Isn't this self-contradicting? \"Final Property\" just as allowable as (+1 === -1). Just don't!");

							if (that.isAbstract)
								throw new ClassDefError("Have ye gone daft? How can you override a property that the owning class doesn't even define?");
						}

						that.isProperty = val;
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {boolean} isDelegate - Flag identifying that this member
			 * is prepared to be used as a callback function.
			 */
			isDelegate: {
				enumerable: true,
				get: function getIsDelegate() { return internal.get(this).isDelegate; },
				set: function setIsDelegate(val) {
					if (!this.isLocked)
						internal.get(this).isDelegate = val;
				}
			},
			/**
			 * @memberof Box
			 * @property {string} type - String identifying the data type expected
			 * returned when calling, getting or setting this member.
			 */
			type: {
				enumerable: true,
				get: function getType() { return internal.get(this).type; },
				set: function setType(val) {
					if (!this.isLocked) {
						if (isValidType(val, this.value))
							internal.get(this).type = val;
						else
							throw new ClassDefError("Failed to match type '" + val +"' to value '" + this.value +"'!");
					}
				}
			},
			/**
			 * @memberof Box
			 * @property {Object} value - Default value of member.
			 * @readonly
			 */
			value: {
				enumerable: true,
				get: function getValue() { return internal.get(this).value; }
			},
			/**
			 * Generates a string version of the values in this box for printing in
			 * a log or console.
			 * @memberof Box
			 * @function toString
			 * @returns {string}
			 * @readonly
			 */
			toString: {
				enumerable: true,
				value: function toString() {
					var typeName = "<unknown>";
					if (this.type instanceof Function) {
						if (this.type.isClass) {
							typeName = this.type.__name;
						}
						else {
							typeName = this.type.name;
						}
					}

					var retval = {
						isPrivate: !!this.isPrivate,
						isProtected: !!this.isProtected,
						isPublic: !!this.isPublic,
						isStatic: !!this.isStatic,
						isFinal: !!this.isFinal,
						isProperty: !!this.isProperty,
						isDelegate: !!this.isDelegate,
						type: typeName,
						value: JSON.stringify(this.value)
					}

					return JSON.stringify(retval, null, '\t');
				}
			}
		});

		Object.seal(retval);
		return retval;
	})();
}

if (typeof(module) === "object") {
	//Use require semantics
	module.exports = generateBox;
}
else if (hasES6) {
	//Prevents older engines from throwing.
	try {
		eval("export default generateBox;");
	} catch(e) {
		console.warn("No known means of exporting 'generateBox' function!");
	}
}
else {
	console.warn("No known means of exporting 'generateBox' function!");
}
