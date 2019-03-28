var Players = require('./Players')
var Questions = require('./Questions')
var GameServer = require('./GameServer')



function Start() {
    console.log("Start Engine");

    Players.ConnectDB();
    Questions.ConnectDB();

    var gameServer = new GameServer.GameServer();
    gameServer.StartServer();    


}

exports.Start = Start





