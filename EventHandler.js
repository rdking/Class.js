var Class = require("./Class");
var Private = Class.Private;
var Protected = Class.Protected;
var Public = Class.Public;
var Static = Class.Static;
var Final = Class.Final;
var Property = Class.Property;

var EventHandler = new Class("EventHandler", {
    //Private members
	listeners: Private(null),
	
    //Private methods
    addListener: Private(function addListener(evnt, fn, once, related){
        if (this.listeners == null)
            this.listeners = {};

		if (fn instanceof Function) {
			if (!this.listeners.hasOwnProperty(evnt))
				this.listeners[evnt] = [];
				
			this.listeners[evnt].push({ once: once, handler: fn, related: related });
		}
		else
			throw TypeError("Only functions can be event handlers!");		
    }),
	removeRelatives: Private(function removeRelatives(relatives) {
		if (Array.isArray(relatives) || (relatives instanceof Array)) {
			for (var i=0; i<relatives.length; ++i) {
                var relative = relatives[i];
                this.removeEventListener(relative.event, relative.method);
            }
		}
	}),
    
    //Protected Methods
    deferCall: Protected(function deferCall(fn, params) {
        setTimeout(this.Delegate(function runDeferredCall() {
            fn.apply(undefined, params);
        }), 0);
    }),

    //Public Methods
	addEventListener: Public(function addEventListener(evnt, fn, related) {
        this.addListener(evnt, fn, false, related);
	}),
	addEventListenerOnce: Public(function addEventListenerOnce(evnt, fn, related) {
        this.addListener(evnt, fn, true, related);
	}),
	removeEventListener: Public(function removeEventListener(evnt, fn, withRelatives) {
        if (this.listeners == null)
            this.listeners = {};

		if (this.listeners.hasOwnProperty(evnt)) {
            var handlers = this.listeners[evnt];
			var index = -1;
            
            while ((++index < handlers.length) && (handlers[index].handler !== fn));
			
			if (index  < handlers.length) {
				var handler = handlers[index];
				this.listeners[evnt].splice(index, 1);
			}

			if (withRelatives)
				this.removeRelatives(handler.related);
		}
	}),
    addRelatedEventListeners: Public(function addRelatedEventListeners(evntList) {
        for (var i=0; i<evntList.length; ++i) {
            var evntHandler = evntList[i];
            var relatives = evntList.slice(0);
            relatives.splice(i, 1);
            this.addEventListener(evntHandler.event, evntHandler.method, relatives);
        }
    }),
    addRelatedEventListenersOnce: Public(function addRelatedEventListenersOnce(evntList) {
        for (var i=0; i<evntList.length; ++i) {
            var evntHandler = evntList[i];
            var relatives = evntList.slice(0);
            relatives.splice(i, 1);
            this.addEventListenerOnce(evntHandler.event, evntHandler.method, relatives);
        }
    }),
    removeAllHandlers: Public(function removeAllHandlers(evnt) {
        if (evnt && this.listeners.hasOwnProperty(evnt))
            this.listeners[evnt] = [];
        else if (!evnt)
            this.listeners = {};
    }),
	fireEvent: Public(function fireEvent(evnt, params) {
        if (this.listeners == null)
            this.listeners = {};

		if (this.listeners.hasOwnProperty(evnt)) {
			var handlers = this.listeners[evnt];
            var keep = [];
			
            console.log("Processing event: " + evnt);
			for (var i=0; i<handlers.length; ++i) {
                var handler = handlers[i];
                //Queue the event to be handled at the next earliest convenience...
				this.deferCall(handler.handler, [ params ]);
                
                if (!handler.once)
                    keep.push(handler);
                else if (handler.related)
                    this.removeRelatives(handler.related);
            }
            
            this.listeners[evnt] = keep;
		}
	}),
	fireEventSync: Public(function fireEvent(evnt, params) {
        if (this.listeners == null)
            this.listeners = {};

		if (this.listeners.hasOwnProperty(evnt)) {
			var handlers = this.listeners[evnt];
            var keep = [];

            console.log("Processing event: " + evnt);
			for (var i=0; i<handlers.length; ++i) {
                var handler = handlers[i];
                //Handle this event now...
				handler.handler(params);

                if (!handler.once)
                    keep.push(handler);
                else if (handler.related)
                    this.removeRelatives(handler.related);
            }

            this.listeners[evnt] = keep;
		}
	})

});

module.exports = EventHandler;
