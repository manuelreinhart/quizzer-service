
var PlayRoom = require('./PlayRoom')
const colyseus = require("colyseus");
const http = require("http");
const port = process.env.port || 443;

class GameServer {        
    constructor() {

    }
    StartServer() {

        var gameServer = new colyseus.Server({
            server: http.createServer(),
            verifyClient: function (info, next) {
                //console.log("verify", next)
                // validate 'info'
                
                next(true);
                
                // - next(false) will reject the websocket handshake
                // - next(true) will accept the websocket handshake
            }
        });

        gameServer.listen(port);

        var testroom = new PlayRoom();

        gameServer.register("chat", testroom)

    }


}
exports.GameServer = GameServer