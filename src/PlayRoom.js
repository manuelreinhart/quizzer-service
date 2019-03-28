const colyseus = require("colyseus");

module.exports = class PlayRoom extends colyseus.Room {
    // When room is initialized
    onInit (options) {
        console.log("OnInit")
     }

    // Checks if a new client is allowed to join. (default: `return true`)
    requestJoin (options, isNew) {
        console.log("onRequestJoin")
        return true;
     }

    // Authorize client based on provided options before WebSocket handshake is complete
    onAuth (options) {
        console.log("onAuth")
     }

    // When client successfully join the room
    onJoin (client, options, auth) { 
        console.log("onJoin")
    }

    // When a client sends a message
    onMessage (client, message) { 
        console.log("onMessage", message)
    }

    // When a client leaves the room
    onLeave (client, consented) {
        console.log("onLeave")
     }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose () { 
        console.log("onDispose")
    }
}