
var PlayRoom = require('./PlayRoom')
var WebSocketServer = require('websocket').server;
var http = require('http');
const port = process.env.port || 8080;


class GameServer {        
    constructor() {

    }
    StartServer() {
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
                if (message.type === 'utf8') {

                    let obj = JSON.parse(message.utf8Data);

                    let answer = {
                        id: 0,
                        methodName: "Callback",
                        params: []                        
                    }

                    if (!obj)
                        connection.sendUTF("Error: Message should be a valid JSON format");

                    if (obj.methodName == "StartQuiz") {
                        answer.id = obj.id;
                        answer.params = [obj.methodName, "Endgegner"];
                        connection.sendUTF(JSON.stringify(answer));
                    }
                    else if (obj.methodName == "StopQuiz") {
                        answer.id = obj.id;
                        answer.params = [obj.methodName, 123456];
                        connection.sendUTF(JSON.stringify(answer));
                    }
                    else if (obj.methodName == "AnswerQuizQuestion") {
                        answer.id = obj.id;
                        answer.params = [obj.methodName, true];
                        connection.sendUTF(JSON.stringify(answer));
                    }
                    else if (obj.methodName == "GetHighscore") {
                        answer.id = obj.id;
                        answer.params = [obj.methodName, [1,2,3,4]];
                        connection.sendUTF(JSON.stringify(answer));
                    }

                    else {
                        connection.sendUTF("no valid methodName");
                    }

                    console.log('Received Message: ' + message.utf8Data);
                    //connection.sendUTF(message.utf8Data);
                }
                else if (message.type === 'binary') {
                    console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                    connection.sendBytes(message.binaryData);
                }
            });
            connection.on('close', function(reasonCode, description) {
                console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
            });
        });
        

    }

    


}
exports.GameServer = GameServer