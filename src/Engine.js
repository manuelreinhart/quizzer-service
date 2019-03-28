var Players = require('./Players')
var GameServer = require('./GameServer')






function Start() {
    console.log("Start Engine");

    Players.ConnectDB();

    var gameServer = new GameServer.GameServer();
    gameServer.StartServer();    


}

exports.Start = Start





