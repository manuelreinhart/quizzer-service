const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://fhadmin:!Quiz1234@mongocluster-ajeeo.azure.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true });


module.exports = class PlayersDB {
  constructor() {   

  }

  Connect() {
    let _this = this;
    client.connect(err => {      
      _this.collection = client.db("QuizDB").collection("Questions");        
    });
  }

  GetAllQuestions(difficulty = 2) {
    let query = {Difficulty: difficulty};
    return this.collection.find(query).toArray();
  }

  GetRandomQuestion(difficulty = 2) {
    return new Promise((resolve, reject) => {
      this.GetAllQuestions(difficulty).then(allQuestions => {
        var r = Math.floor(Math.random() * allQuestions.length);
        let randomQuestion = allQuestions[r];
        resolve(randomQuestion);
      });
    });
    
  }  


}

