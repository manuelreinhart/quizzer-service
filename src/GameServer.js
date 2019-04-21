var WebSocketServer = require('websocket').server;
var http = require('http');
const port = process.env.port || 8080;

var PlayRoom = require('./PlayRoom')
var PlayersDB = require('./PlayersDB')
var QuestionsDB = require('./QuestionsDB')

class GameServer {   

    constructor() {
        this.PlayRooms1 = [];    
        this.PlayRooms2 = [];    
        this.PlayRooms3 = [];     
        setInterval(() => {
            console.log("Actual Playrooms: ", this.PlayRooms1.length + this.PlayRooms2.length + this.PlayRooms3.length);
        }, 5000);

    }
    StartServer() {
        let _this = this;
        this.PlayerDB = new PlayersDB();
        this.QuestionDB = new QuestionsDB();
        this.PlayerDB.Connect();
        this.QuestionDB.Connect();

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
                this.GetHighScores(connection, obj);
            }

            console.log('Received Message: ' + message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }

    }

    StartQuiz(connection, obj) {
        let _this = this;
        let playerId = obj.playerId;
        let playerName = obj.params[0];
        let difficulty = obj.params[1];

        //todo validate params
        if (difficulty == null || difficulty < 1 || difficulty > 3) {
            this.SendError(connection, "Difficulty must be between 1 and 3", obj.id);
            return;
        }

        let player = {
            Connection: connection,
            ID: playerId,
            Name: playerName
        }

        this.PlayerDB.InsertPlayer(playerId, playerName);
              
        let gameRoom = this['PlayRooms' + difficulty].slice(-1)[0]; //get last room
        if (gameRoom == null || gameRoom.IsJoinable() == false) {
            //create new room
            gameRoom = new PlayRoom(); 
            gameRoom.Difficulty = difficulty;
            gameRoom.PlayerDB = this.PlayerDB;
            gameRoom.QuestionDB = this.QuestionDB;  
            gameRoom.RoomID = Math.round(Math.random() * 0xFFFFFF);                 
            this['PlayRooms' + difficulty].push(gameRoom);
            gameRoom.eventEmitter.on('GameEnd', roomID => {
                let indx = _this['PlayRooms' + difficulty].map(pr => pr.RoomID).indexOf(roomID);
                if (indx != -1) {
                    this['PlayRooms' + difficulty].splice(indx, 1);
                }                        
            });

            //console.log("PlayRoom2 count", this.PlayRooms2.length);
        }

        this.SendCallback(connection, obj.id);  

        gameRoom.JoinRoom(player);      
    }

    GetHighScores(connection, obj) {
       this.PlayerDB.GetAllPlayers().then(players => {
           
        let highscore = players.map(p => {
            return {
                Name: p.PlayerName,
                Score: p.Score,
                Games: p.PlayedGames

            }
        }).sort((a, b) => {
            return a.Score - b.Score;
        })
        this.SendCallback(connection, obj.id, [highscore]);
       });

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