const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://fhadmin:!Quiz1234@mongocluster-ajeeo.azure.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true });



exports.ConnectDB = function () {
  client.connect(err => {
    const collection = client.db("QuizDB").collection("Questions");
    // perform actions on the collection object
    collection.find()

    var query = {}

    collection.find(query).toArray(function(err, result) {
      if (err) throw err;
      //console.log(result);
    });

    client.close();
  });
}