
var PlayRoom = require('./PlayRoom')
var WebSocketServer = require('websocket').server;
var http = require('http');
const port = process.env.port || 8080;


class GameServer {   

    constructor() {
        this.PlayRooms = [];        

    }
    StartServer() {
        let _this = this;

        var server = http.createServer(function(request, response) {
            console.log((new Date()) + ' Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
        
        server.listen(port, function() {
            console.log(new Date() + ' Server is listening on port' + port);
        });

        
        var wsServer = new WebSocketServer({
            httpServer: server,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether or not
            // to accept it.
            autoAcceptConnections: false
        });

        function originIsAllowed(origin) {
            // put logic here to detect whether the specified origin is allowed.
            return true;
        }
        
        wsServer.on('request', function(request) {
            if (!originIsAllowed(request.origin)) {
              // Make sure we only accept requests from an allowed origin
              request.reject();
              console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
              return;
            }
            
            var connection = request.accept(null, request.origin);
            console.log((new Date()) + ' Connection accepted.');
            connection.on('message', function(message) {
                _this.HandleMessage(connection, message);
            });
            connection.on('close', function(reasonCode, description) {
                console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
            });
        });       

    }

    HandleMessage(connection, message) {
        if (message.type === 'utf8') {

            let obj = JSON.parse(message.utf8Data);            

            if (!obj)
                this.SendError(connection, "Error parsing JSON");

            if (obj.methodName == "StartQuiz") {
                this.StartQuiz(connection, obj);                
            }
            else if (obj.methodName == "GetHighscore") {
                answer.id = obj.id;
                answer.params = [obj.methodName, [1,2,3,4]];
                connection.sendUTF(JSON.stringify(answer));
            }

            console.log('Received Message: ' + message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }

    }

    StartQuiz(connection, obj) {
        let playerId = obj.playerId;
        let playerName = obj.params[0];

        let player = {
            Connection: connection,
            ID: playerId,
            Name: playerName
        }
      
        let gameRoom = this.PlayRooms.slice(-1)[0]; //get last room
        if (gameRoom == null || gameRoom.IsJoinable() == false) {
            //create new room
            gameRoom = new PlayRoom();            
            this.PlayRooms.push(gameRoom);
            console.log("PlayRoom count", this.PlayRooms.length);
        }

        this.SendCallback(connection, obj.id);  

        gameRoom.JoinRoom(player);         
            

    }

    SendCallback(con, id, params = []) {
        let answer = {
            id: id,
            methodName: "Callback",
            params: params                  
        }
        con.sendUTF(JSON.stringify(answer));
    }

    CallMethod(con, methodName, params) {
        let obj = {
            id:  Math.round(Math.random() * 0xFFFFFF), //Todo
            methodName: methodName,
            params: params                  
        }
        con.sendUTF(JSON.stringify(obj));
    }

    SendError(con, error, requestId = 0) {
        let obj = {
            id:  Math.round(Math.random() * 0xFFFFFF), //Todo
            methodName: "Error",
            params: [error, requestId]                  
        }
        con.sendUTF(JSON.stringify(obj));
    }

    


}
exports.GameServer = GameServer