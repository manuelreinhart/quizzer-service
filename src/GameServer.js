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
        this.PlayerDB = new PlayersDB();
        this.QuestionDB = new QuestionsDB();
        this.PlayerDB.Connect();
        this.QuestionDB.Connect();
        this.StartWebsocketServer();
    }

    StartWebsocketServer() {
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
            autoAcceptConnections: false
        });

        function originIsAllowed(origin) {
            return true;
        }
        
        wsServer.on('request', function(request) {
            if (!originIsAllowed(request.origin)) {
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

            console.log('Received Message: ' + message.utf8Data);
            
            let obj;
            try {
                obj = JSON.parse(message.utf8Data);   
            }
            catch {
                this.SendError(connection, "Error parsing JSON");
            }                     

            if (!obj) {
                this.SendError(connection, "Error parsing JSON");
                return;
            }                

            if (!this.IsWhitelistedMethod(obj.methodName)) {
                this.SendError(connection, "MethodName '" + obj.methodName + "' is not allowed!", obj.id);
                return;
            }

            if (obj.methodName == "StartQuiz") {
                this.StartQuiz(connection, obj);                
            }
            else if (obj.methodName == "GetHighscore") {
                this.GetHighScores(connection, obj);
            }

            
        }
    }

    StartQuiz(connection, obj) {
        let _this = this;
        let playerId = obj.playerId;
        let playerName = obj.params[0];
        let difficulty = obj.params[1];

        if (playerId == null || playerId == "") {
            this.SendError(connection, "PlayerID is needed!", obj.id);
            return;
        }

        if (playerName == null || playerName == "") {
            this.SendError(connection, "Name is needed!", obj.id);
            return;
        }

        if (difficulty == null || difficulty < 1 || difficulty > 3) {
            this.SendError(connection, "Difficulty must be between 1 and 3!", obj.id);
            return;
        }

        let player = {
            Connection: connection,
            ID: playerId,
            Name: playerName
        }

        this.PlayerDB.InsertPlayer(playerId, playerName);
              
        let gameRoom = this.GetPlayroom(difficulty);

        this.SendCallback(connection, obj.id);  

        gameRoom.JoinRoom(player);      
    }

    GetPlayroom(difficulty) {
        let _this = this;
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
        }
        return gameRoom;
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

    IsWhitelistedMethod(methodName) {
        let whitelist = [
            "StartQuiz",
            "GetHighscore",
            "StopQuiz",
            "AnswerQuizQuestion"
        ]
        return whitelist.indexOf(methodName) != -1;
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