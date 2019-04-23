var GameServer = require('./GameServer')

function Start() {
    console.log("Start Quizz Engine");         

    var gameServer = new GameServer.GameServer();
    gameServer.StartServer();    

}


exports.Start = Start





