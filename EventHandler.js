var Class = require("./Class");
var Private = Class.Private;
var Protected = Class.Protected;
var Public = Class.Public;
var Static = Class.Static;
var Final = Class.Final;
var Property = Class.Property;

var EventHandler = new Class("EventHandler", {
	listeners: Private({}),
	
	addEventListener: Public(function addEventListener(evnt, fn) {
		if (fn instanceof Function) {
			if (!this.listeners.hasOwnProperty(evnt))
				this.listeners[evnt] = { once: false, handlers:[] };
				
			this.listeners[evnt].handlers.push(fn);
		}
		else
			throw TypeError("Only functions can be event handlers!");		
	}),
	addEventListenerOnce: Public(function addEventListenerOnce(evnt, fn) {
		if (fn instanceof Function) {
			if (!this.listeners.hasOwnProperty(evnt))
				this.listeners[evnt] = [{ once: true, handler:fn }];
            else
                this.listeners[evnt].push({ once: true, handler: fn});
		}		
		else
			throw TypeError("Only functions can be event handlers!");		
	}),
	removeEventListener: Public(function removeEventListener(evnt, fn) {
		if (this.listeners.hasOwnProperty(evnt)) {
            var handlers = this.listeners[evnt];
			var index = -1;
            
            while ((++index < handlers.length) && (handlers[index].handler !== fn));
			
			if (index  < handlers.length)
				this.listeners[evnt].splice(index, 1);
		}
	}),
	fireEvent: Public(function fireEvent(evnt, params) {
		if (this.listeners.hasOwnProperty(evnt)) {
			var handlers = this.listeners[evnt];
			
            console.log("Processing event: " + evnt);
			for (var i=0; i<handlers.length; ++i)
				handlers[i].handler(params);
		}
	})
});

module.exports = EventHandler;