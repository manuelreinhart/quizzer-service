const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://fhadmin:!Quiz1234@mongocluster-ajeeo.azure.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true });


module.exports = class PlayersDB {
  constructor() {   

  }

  Connect() {
    let _this = this;
    client.connect(err => {      
      _this.collection = client.db("QuizDB").collection("Players");        
    });
  }

  GetAllPlayers() {
    return this.collection.find().toArray()
  }

  InsertPlayer(playerId, playerName, score = null, playedGames = null) {
    let playerQuery = {PlayerID: playerId};
    this.collection.findOne(playerQuery).then(player => {
      if (player == null) {
        player = {
          PlayerID: playerId,
          PlayerName: playerName,
          Score: score == null ? 0 : score,
          PlayedGames: playedGames == null ? 0 : playedGames
        }
        this.collection.insertOne(player);
      }
      else {        
        let newvalues = { $set: {
          PlayerName: playerName, 
          Score: score == null ? player.Score : score,
          PlayedGames: playedGames == null ? player.PlayedGames : playedGames
        } };
        this.collection.updateOne(playerQuery, newvalues, (err, res) => {
          if (err) throw err;
        });
      }
    })    
  }

  AddScore(playerId, score) {
    let playerQuery = {PlayerID: playerId};
    this.collection.findOne(playerQuery).then(player => {
      if (player == null) {

        return;
      }
      let newScore = player.Score + score;
      let newvalues = { $set: {
        Score: newScore
      } };
      this.collection.updateOne(playerQuery, newvalues, (err, res) => {
        if (err) throw err;
      });
    });
  }

  IncrementPlayedGames(playerId, score) {
    let playerQuery = {PlayerID: playerId};
    this.collection.findOne(playerQuery).then(player => {      
      if (player == null) {

        return;
      }     
      let newvalues = { $set: {
        PlayedGames: player.PlayedGames + 1
      } };
      this.collection.updateOne(playerQuery, newvalues, (err, res) => {
        if (err) throw err;
        console.log("Played Games updated");
      });
    });
  }


}

