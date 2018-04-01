var mocha = require('mocha');
var should = require('should');
var gProto = {};
var gOldProto;

describe('Testing ES6-version Class.js...', () => {
	before(() => {
		//Inject our stuff into a removable prototype of global
		gProto.Class = require('../es6/Class');
		gProto.Enum = require('../Enum');
		gOldProto = global.__proto__;
		global.__proto__ = gProto;
	});
	describe('global', () => {
		it('should exist', () => {
			should.exist(global);
		});
		it('should be self-referencing', () => {
			should.equal(global.global, global);
		});
	});

	describe('Class', () => {
		it('should have a static function property named "InitializeScope"', () => {
			Class.should.have.property('InitializeScope').with.type('function');
		});
	});

	describe('Calling Class.InitializeScope to initialize the global scope....', () => {
		it('should not fail', () => {
			should(Class.InitializeScope(gProto)).not.fail;
		});
	});

	describe('Class', () => {
		it('should have a static function property named "Private"', () => {
			Class.should.have.property('Private').with.type('function');
		});
		it('should have a static function property named "Protected"', () => {
			Class.should.have.property('Protected').with.type('function');
		});
		it('should have a static function property named "Public"', () => {
			Class.should.have.property('Public').with.type('function');
		});
		it('should have a static function property named "Property"', () => {
			Class.should.have.property('Property').with.type('function');
		});
		it('should have a static function property named "Static"', () => {
			Class.should.have.property('Static').with.type('function');
		});
		it('should have a static function property named "Final"', () => {
			Class.should.have.property('Final').with.type('function');
		});
		it('should have a static function property named "Abstract"', () => {
			Class.should.have.property('Abstract').with.type('function');
		});
		it('should have a static function property named "Delegate"', () => {
			Class.should.have.property('Delegate').with.type('function');
		});
		it('should have a static function property named "Type"', () => {
			Class.should.have.property('Type').with.type('function');
		});
		it('should have a static function property named "Modes"', () => {
			Class.should.have.property('Modes').with.type('function');
		});

		describe('Modes', () => {
			it('should have a static number member named "Default"', () => {
				Class.Modes.should.have.property('Default').with.type('object');
			});
			it('should have a static number member named "Abstract"', () => {
				Class.Modes.should.have.property('Abstract').with.type('object');
			});
			it('should have a static number member named "Final"', () => {
				Class.Modes.should.have.property('Final').with.type('object');
			});
		});
	});

	describe('global', () => {
		it('should have a static function property named "Private"', () => {
			should(global).have.property('Private').with.type('function');
		});
		it('should have a static function property named "Protected"', () => {
			should(global).have.property('Protected').with.type('function');
		});
		it('should have a static function property named "Public"', () => {
			should(global).have.property('Public').with.type('function');
		});
		it('should have a static function property named "Property"', () => {
			should(global).have.property('Property').with.type('function');
		});
		it('should have a static function property named "Static"', () => {
			should(global).have.property('Static').with.type('function');
		});
		it('should have a static function property named "Final"', () => {
			should(global).have.property('Final').with.type('function');
		});
		it('should have a static function property named "Abstract"', () => {
			should(global).have.property('Abstract').with.type('function');
		});
		it('should have a static function property named "Delegate"', () => {
			should(global).have.property('Delegate').with.type('function');
		});
		it('should have a static function property named "Type"', () => {
			should(global).have.property('Type').with.type('function');
		});
		it('should have a static function property named "Modes"', () => {
			should(global).have.property('Modes').with.type('function');
		});

		describe('Modes', () => {
			it('should have a static number member named "Default"', () => {
				global.Modes.should.have.property('Default').with.type('object');
			});
			it('should have a static number member named "Abstract"', () => {
				global.Modes.should.have.property('Abstract').with.type('object');
			});
			it('should have a static number member named "Final"', () => {
				global.Modes.should.have.property('Final').with.type('object');
			});
		});
	});

	var SuperClass;
	var SubClass;
	var SubSubClass;
	var FailingClass;
	describe('Testing "Abstract" Class types', () => {
		describe('Creating Class type "SuperClass" ...', () => {
			it('should not fail', () => {
				var superClass = {
					Mode: Modes.Abstract,

					//Private Members
					private1: Private("Successful Test!"),
					private2: Private(Static(42)),
					private3: Private(Property({
						get: function getPrivate3() { return this[private2] * 2; },
						set: function setPrivate3(val) {
							console.log('You tried to set private3 to ' + val + ' ...');
						}
					})),

					//Protected Members
					protected1: Protected('see me?'),
					protected2: Protected(Static('Yes you can!')),
					protected3: Protected(Property({
						get: function getProtected3() {
							return 'Can you ' + this[protected1] + ' ' + this[protected2];
						}
					})),

					//Public Members
					Constructor: Public(function createSuperClassInstance() {
						describe('Constructor', () => {
							var self = this;
							it('should have access to a SuperClass instance called "this"', () => {
								self.should.be.instanceOf(SuperClass);
							})
						})
					}),
					test: Public(Property({
						get: function getTest() {
							return this[private1];
						}
					})),
					memberTests: Public(function() {

					}),
					staticTest: Public(Static(Property({
						get: function getStaticTest() {
							return SuperClass[protected2];
						}
					}))),
					staticTest2: Public(Static(function staticTest2() {
						describe('Testing inside "SuperClass"', () => {
							var should;
							before(()=>{
								should = require('should');
							});
							describe('<Static Scope>', () => {
								it('should be the static scope', () => {
									this.should.equal(SuperClass);
								});
								it('should not have a property called "private1"', () => {
									should(typeof(private1)).equal("symbol");
									this.should.not.have.property(private1);
									should(this[private1]).not.equal("Successful Test!");
								});
								it('should have a property called "private2"', () => {
									should(typeof(private2)).equal("symbol");
									this.should.have.property(private2);
									should(this[private2]).equal(42);
								});
								it('should not have a property called "private3"', () => {
									should(typeof(private3)).equal("symbol");
									this.should.not.have.property(private3);
									should(this[private3]).not.equal(84);
								});
								it('should not have a property called "protected1"', () => {
									should(typeof(protected1)).equal("symbol");
									this.should.not.have.property(protected1);
									should(this[protected1]).not.equal('see me?');
								});
								it('should have a property called "protected2"', () => {
									should(typeof(protected2)).equal("symbol");
									this.should.have.property(protected2);
									should(this[protected2]).equal('Yes you can!');
								});
								it('should not have a property called "protected3"', () => {
									should(typeof(protected3)).equal("symbol");
									this.should.not.have.property(protected3);
									should(this[protected3]).not.equal('Can you see me? Yes you can!');
								});
								it('should not have a property called "Constructor"', () => {
									this.should.not.have.property('Constructor');
								});
								it('should not have a property called "test"', () => {
									this.should.not.have.property('test');
								});
								it('should have a property called "staticTest"', () => {
									this.should.have.property('staticTest');
								});
								it('should have a property called "staticTest2"', () => {
									this.should.have.property('staticTest2');
								});
							});
						});
					}))
				};
				(SuperClass = Class("SuperClass", superClass)).should.not.fail;
			});
			describe('SuperClass', () => {
				it('should be a function', () => {
					SuperClass.should.be.a.function;
				});
				it('should have a prototype object', () => {
					SuperClass.should.have.property('prototype').with.type('object');
				});
				it('should not have a property called "private1"', () => {
					should(typeof(private1)).not.equal("symbol");
					SuperClass.should.not.have.property("private1");
				});
				it('should not have a property called "private2"', () => {
					should(typeof(private2)).not.equal("symbol");
					SuperClass.should.not.have.property("private2");
				});
				it('should not have a property called "private3"', () => {
					should(typeof(private3)).not.equal("symbol");
					SuperClass.should.not.have.property("private3");
				});
				it('should not have a property called "protected1"', () => {
					should(typeof(protected1)).not.equal("symbol");
					SuperClass.should.not.have.property("protected1");
				});
				it('should not have a property called "protected2"', () => {
					should(typeof(protected2)).not.equal("symbol");
					SuperClass.should.not.have.property("protected2");
				});
				it('should not have a property called "protected3"', () => {
					should(typeof(protected3)).not.equal("symbol");
					SuperClass.should.not.have.property("protected3");
				});
				it('should not have a property called "Constructor"', () => {
					SuperClass.should.not.have.property('Constructor');
				});
				it('should not have a property called "test"', () => {
					SuperClass.should.not.have.property('test');
				});
				it('should have a property called "staticTest"', () => {
					SuperClass.should.have.property('staticTest');
				});
				it('should have a property called "staticTest2"', () => {
					SuperClass.should.have.property('staticTest2');
				});
				describe('staticTest', () => {
					it('should equal the string "Yes you can!"', () => {
						should(SuperClass.staticTest).be.type('string').and.equal("Yes you can!");
					});
					after(() => {
						SuperClass.staticTest2();
					});
				});
				describe('prototype', () => {
					it('should not have a property called "private1"', () => {
						SuperClass.prototype.should.not.have.property("private1");
					});
					it('should not have a property called "private2"', () => {
						SuperClass.prototype.should.not.have.property("private2");
					});
					it('should not have a property called "private3"', () => {
						SuperClass.prototype.should.not.have.property("private3");
					});
					it('should not have a property called "protected1"', () => {
						SuperClass.prototype.should.not.have.property("protected1");
					});
					it('should not have a property called "protected2"', () => {
						SuperClass.prototype.should.not.have.property("protected2");
					});
					it('should not have a property called "protected3"', () => {
						SuperClass.prototype.should.not.have.property("protected3");
					});
					it('should not have a property called "Constructor"', () => {
						SuperClass.prototype.should.not.have.property('Constructor');
					});
					it('should have a property called "test"', () => {
						SuperClass.prototype.should.have.property('test');
					});
					it('should not have a property called "staticTest"', () => {
						SuperClass.prototype.should.not.have.property('staticTest');
					});
					it('should not have a property called "staticTest2"', () => {
						SuperClass.prototype.should.not.have.property('staticTest2');
					});
				});
				describe('<Instantiation>', () => {
					it('should throw a SyntaxError', () => {
						(() => {
							new SuperClass();
						}).should.throw(SyntaxError);
					});
				});
			});
		});
	});
	describe('Testing "Default" Class types', () => {
		describe('Creating Class type "SubClass" ...', () => {
			it('should not fail', () => {
				var subClass = {
					Extends: SuperClass,

					//Private members
					scPrivate: Private("What is the ultimate answer to life, the universe, and everything?"),

					//Protected members
					scProtected: Protected("HMWCAWCCIAWCCCW?"),

					//Public members
					scPublic: Public(function scPublic() {
						return this.scPrivate + '\n' + this.private2;
					}),
					scPublicStatic: Public(Static("test")),
					Constructor: Public(function createSubClassInstance(noTest) {
						this.Super();
						if (!noTest) {
							var should;
							describe('Testing inside SubClass...', () => {
								before(()=> {
									should = require('should');
								});
								describe('Constructor', () => {
									it('should have a "this" that is an instance of SubClass', () => {
										should(this).be.an.instanceOf(SubClass);
									});
									it('should not have a property called "private1"', () => {
										should(typeof(private1)).equal("undefined");
									});
									it('should not have a property called "private2"', () => {
										should(typeof(private2)).equal("undefined");
									});
									it('should not have a property called "private3"', () => {
										should(typeof(private3)).equal("undefined");
									});
									it('should have a property called "protected1"', () => {
										should(typeof(protected1)).equal("symbol");
										this.should.have.property(protected1);
									});
									it('should have a property called "protected2"', () => {
										should(typeof(protected2)).equal("symbol");
										this.should.have.property(protected2);
									});
									it('should have a property called "protected3"', () => {
										should(typeof(protected3)).equal("symbol");
										this.should.have.property(protected3);
									});
									it('should not have a property called "Constructor"', () => {
										this.should.not.have.property('Constructor');
									});
									it('should have a property called "test"', () => {
										this.should.have.property('test');
									});
									it('should have a property called "staticTest"', () => {
										SubClass.should.have.property('staticTest');
									});
									it('should have a property called "staticTest2"', () => {
										SubClass.should.have.property('staticTest2');
									});
									it('should have a property called "scPrivate"', () => {
										should(typeof(scPrivate)).equal("symbol");
										this.should.have.property(scPrivate);
									});
									it('should have a property called "scProtected"', () => {
										should(typeof(scProtected)).equal("symbol");
										this.should.have.property(scProtected);
									});
									it('should n have a property called "scPublic"', () => {
										this.should.have.property('scPublic');
									});
									it('should have a property called "scPublicStatic"', () => {
										SubClass.should.have.property('scPublicStatic');
									});
								});
								this.APITests();
							});
						}
					}),
					APITests: Public(function APITests() {
						var self = this;

						describe('Class Instance API', () => {
						});
					})
				};
				(SubClass = Class('SubClass', subClass)).should.not.fail;
			});
			describe('SubClass', () => {
				it('should be a function', () => {
					SubClass.should.be.a.function;
				});
				it('should have a prototype object', () => {
					SubClass.should.have.property('prototype').with.type('object');
				});
				it('should not have a property called "private1"', () => {
					SubClass.should.not.have.property('private1');
				});
				it('should not have a property called "private2"', () => {
					SubClass.should.not.have.property('private2');
				});
				it('should not have a property called "private3"', () => {
					SubClass.should.not.have.property('private3');
				});
				it('should not have a property called "protected1"', () => {
					SubClass.should.not.have.property('protected1');
				});
				it('should not have a property called "protected2"', () => {
					SubClass.should.not.have.property('protected2');
				});
				it('should not have a property called "protected3"', () => {
					SubClass.should.not.have.property('protected3');
				});
				it('should not have a property called "Constructor"', () => {
					SubClass.should.not.have.property('Constructor');
				});
				it('should not have a property called "test"', () => {
					SubClass.should.not.have.property('test');
				});
				it('should have a property called "staticTest"', () => {
					SubClass.should.have.property('staticTest');
				});
				it('should have a property called "staticTest2"', () => {
					SubClass.should.have.property('staticTest2');
				});
				it('should not have a property called "scPrivate"', () => {
					SubClass.should.not.have.property('scPrivate');
				});
				it('should not have a property called "scProtected"', () => {
					SubClass.should.not.have.property('scProtected');
				});
				it('should not have a property called "scPublic"', () => {
					SubClass.should.not.have.property('scPublic');
				});
				it('should have a property called "scPublicStatic"', () => {
					SubClass.should.have.property('scPublicStatic');
				});
				it('should be able to create an instance of itself', () => {
					should(new SubClass()).not.fail;
				});
				describe('staticTest', () => {
					it('should equal the string "Yes you can!"', () => {
						SubClass.staticTest.should.be.type('string').and.
							equal("Yes you can!");
					});
				});
				describe('scPublicStatic', () => {
					it('should equal the string "test"', () => {
						SubClass.scPublicStatic.should.be.type('string').and.
							equal("test");
					});
				});
				describe('prototype', () => {
					it('should not have a property called "private1"', () => {
						SubClass.prototype.should.not.have.property('private1');
					});
					it('should not have a property called "private2"', () => {
						SubClass.prototype.should.not.have.property('private2');
					});
					it('should not have a property called "private3"', () => {
						SubClass.prototype.should.not.have.property('private3');
					});
					it('should not have a property called "protected1"', () => {
						SubClass.prototype.should.not.have.property('protected1');
					});
					it('should not have a property called "protected2"', () => {
						SubClass.prototype.should.not.have.property('protected2');
					});
					it('should not have a property called "protected3"', () => {
						SubClass.prototype.should.not.have.property('protected3');
					});
					it('should not have a property called "Constructor"', () => {
						SubClass.prototype.should.not.have.property('Constructor');
					});
					it('should have a property called "test"', () => {
						SubClass.prototype.should.have.property('test');
					});
					it('should not have a property called "staticTest"', () => {
						SubClass.prototype.should.not.have.property('staticTest');
					});
					it('should not have a property called "staticTest2"', () => {
						SubClass.prototype.should.not.have.property('staticTest2');
					});
					it('should not have a property called "scPrivate"', () => {
						SubClass.prototype.should.not.have.property('scPrivate');
					});
					it('should not have a property called "scProtected"', () => {
						SubClass.prototype.should.not.have.property('scProtected');
					});
					it('should have a property called "scPublic"', () => {
						SubClass.prototype.should.have.property('scPublic');
					});
					it('should not have a property called "scPublicStatic"', () => {
						SubClass.prototype.should.not.have.property('scPublicStatic');
					});
				});
			});
		});
	});
	describe('Testing "Final" Class types', () => {
		describe('Creating Class type "SubSubClass" ...', () => {
			it('should not fail', () => {
				var subSubClass = {
					Extends: SubClass,
					Mode: Modes.Final
				};
				(SubSubClass = Class('SubSubClass', subSubClass)).should.not.fail;
			});
			describe('SubSubClass', () => {
				it('should be a function', () => {
					SubSubClass.should.be.a.function;
				});
				it('should have a prototype object', () => {
					SubSubClass.should.have.property('prototype').with.type('object');
				});
				it('should not have a property called "private1"', () => {
					SubSubClass.should.not.have.property('private1');
				});
				it('should not have a property called "private2"', () => {
					SubSubClass.should.not.have.property('private2');
				});
				it('should not have a property called "private3"', () => {
					SubSubClass.should.not.have.property('private3');
				});
				it('should not have a property called "protected1"', () => {
					SubSubClass.should.not.have.property('protected1');
				});
				it('should not have a property called "protected2"', () => {
					SubSubClass.should.not.have.property('protected2');
				});
				it('should not have a property called "protected3"', () => {
					SubSubClass.should.not.have.property('protected3');
				});
				it('should not have a property called "Constructor"', () => {
					SubSubClass.should.not.have.property('Constructor');
				});
				it('should not have a property called "test"', () => {
					SubSubClass.should.not.have.property('test');
				});
				it('should have a property called "staticTest"', () => {
					SubSubClass.should.have.property('staticTest');
				});
				it('should have a property called "staticTest2"', () => {
					SubSubClass.should.have.property('staticTest2');
				});
				it('should not have a property called "scPrivate"', () => {
					SubSubClass.should.not.have.property('scPrivate');
				});
				it('should not have a property called "scProtected"', () => {
					SubSubClass.should.not.have.property('scProtected');
				});
				it('should not have a property called "scPublic"', () => {
					SubSubClass.should.not.have.property('scPublic');
				});
				it('should have a property called "scPublicStatic"', () => {
					SubSubClass.should.have.property('scPublicStatic');
				});
				it('should be able to create an instance of itself', () => {
					should(new SubSubClass()).not.fail;
				});
				describe('staticTest', () => {
					it('should equal the string "Yes you can!"', () => {
						SubSubClass.staticTest.should.be.type('string').and.
							equal("Yes you can!");
					});
				});
				describe('scPublicStatic', () => {
					it('should equal the string "test"', () => {
						SubSubClass.scPublicStatic.should.be.type('string').and.
							equal("test");
					});
				});
				describe('prototype', () => {
					it('should not have a property called "private1"', () => {
						SubSubClass.prototype.should.not.have.property('private1');
					});
					it('should not have a property called "private2"', () => {
						SubSubClass.prototype.should.not.have.property('private2');
					});
					it('should not have a property called "private3"', () => {
						SubSubClass.prototype.should.not.have.property('private3');
					});
					it('should not have a property called "protected1"', () => {
						SubSubClass.prototype.should.not.have.property('protected1');
					});
					it('should not have a property called "protected2"', () => {
						SubSubClass.prototype.should.not.have.property('protected2');
					});
					it('should not have a property called "protected3"', () => {
						SubSubClass.prototype.should.not.have.property('protected3');
					});
					it('should not have a property called "Constructor"', () => {
						SubSubClass.prototype.should.not.have.property('Constructor');
					});
					it('should have a property called "test"', () => {
						SubSubClass.prototype.should.have.property('test');
					});
					it('should not have a property called "staticTest"', () => {
						SubSubClass.prototype.should.not.have.property('staticTest');
					});
					it('should not have a property called "staticTest2"', () => {
						SubSubClass.prototype.should.not.have.property('staticTest2');
					});
					it('should not have a property called "scPrivate"', () => {
						SubSubClass.prototype.should.not.have.property('scPrivate');
					});
					it('should not have a property called "scProtected"', () => {
						SubSubClass.prototype.should.not.have.property('scProtected');
					});
					it('should have a property called "scPublic"', () => {
						SubSubClass.prototype.should.have.property('scPublic');
					});
					it('should not have a property called "scPublicStatic"', () => {
						SubSubClass.prototype.should.not.have.property('scPublicStatic');
					});
				});
			});
		});
		describe('Creating Class type "FailingClass" ...', () => {
			it('should fail', () => {
				var failingClass = {
					Extends: SubSubClass
				};
				(FailingClass = Class("FailingClass", failingClass)).should.throw;
			});
		});
	});
	after(() => {
		global.__proto__ = gOldProto;
	});
});
