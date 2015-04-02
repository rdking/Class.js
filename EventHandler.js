var Class = require("./Class");
var Private = Class.Private;
var Protected = Class.Protected;
var Public = Class.Public;
var Static = Class.Static;
var Final = Class.Final;
var Property = Class.Property;

var EventHandler = new Class("EventHandler", {
    //Private members
	listeners: Private({}),
	
    //Private methods
    addListener: Private(function addListener(evnt, fn, once){
		if (fn instanceof Function) {
			if (!this.listeners.hasOwnProperty(evnt))
				this.listeners[evnt] = [];
				
			this.listeners[evnt].push({ once: once, handler: fn });
		}
		else
			throw TypeError("Only functions can be event handlers!");		
    }),
    
	addEventListener: Public(function addEventListener(evnt, fn) {
        this.addListener(evnt, fn, false);
	}),
	addEventListenerOnce: Public(function addEventListenerOnce(evnt, fn) {
        this.addListener(evnt, fn, true);
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
            var keep = [];
			
            console.log("Processing event: " + evnt);
			for (var i=0; i<handlers.length; ++i) {
                var handler = handlers[i];
				handler.handler(params);
                
                if (!handler.once)
                    keep.push(handler);
            }
            
            this.listeners[evnt] = keep;
		}
	})
});

module.exports = EventHandler;