
module.exports = class PlayRoom {
      

    constructor() {


    }

    IsJoinable() {
        let joinable = this.Player1 == null || this.Player2 == null;
        return joinable;
    }

    IsReadyToStart() {
        let ready = this.Player1 != null && this.Player2 != null;
        return ready;
    }

    JoinRoom(player) {
        let _this = this;

        if (this.Player1 == null) {      
            console.log("player 1 joined");    

            player.Index = 1;       
            this.Player1 = player;                       
                            
            this.RegisterWebsocketEvents(player);

            return true;    
        }

        if (this.Player2 == null) {
            console.log("player 2 joined -> Ready to Start")   ;

            player.Index = 2;
            this.Player2 = player;

            this.Player1.Enemy = this.Player2;
            this.Player2.Enemy = this.Player1;
            
            this.RegisterWebsocketEvents(player);
            
            this.StartGame();

            return true;
        }
        
        console.log("Error: Room is full");      

        return false;
        
    }    

    RegisterWebsocketEvents(player) {
        let _this = this;
        player.Connection.on('close', function(reasonCode, description) {
            _this.PlayerHasLeft(player);
        }); 
        player.Connection.on('message', function(message) {
            _this.HandleMessage(player, message);
        });
    }

    HandleMessage(player, message) {
        let _this = this;
        let connection = player.Connection;
        if (message.type === 'utf8') {
            let obj = JSON.parse(message.utf8Data);            

            if (!obj)
                this.SendError(connection, "Error parsing JSON");

            else if (obj.methodName == "StopQuiz") { 
                _this.SendCallback(connection, obj.id);               
                _this.PlayerHasLeft(player);
            }
            else if (obj.methodName == "AnswerQuizQuestion") {
                _this.SendCallback(connection, obj.id);
                let answer = obj.params[0];
                this.CheckAnswer(player, answer);
            }

            console.log('Received Message: ' + message.utf8Data);
        }
    }

    PlayerHasLeft(player) {
        //let enemyIndex = player.Index % 2 + 1;
        //let enemy = this['Player' + enemyIndex];
        let enemy = player.Enemy;
        if (player != null)
            console.log((new Date()) + 'Player ' + player.Name + ' left the game');
        
        if (enemy != null) {
            this.CallMethod(enemy.Connection, "Stopped", [player.Name + ' has left!']);
            this['Player' + enemy.Index] = null;
            //enemy.Connection.close();
        }   

        this['Player' + player.Index] = null;
        
    }

    StartGame() {
        this.CallMethod(this.Player1.Connection, "Start", [this.Player2.Name]);
        this.CallMethod(this.Player2.Connection, "Start", [this.Player1.Name]);

        this.PlayerDB.IncrementPlayedGames(this.Player1.ID);
        setTimeout(() => {
            this.PlayerDB.IncrementPlayedGames(this.Player2.ID);
        }, 1000);
        

        this.SendQuestion();

    }

    SendQuestion() {
        let _this = this;
        if (this.QuestionNr == null)
            this.QuestionNr = 0;

        if (this.Player1 == null || this.Player2 == null || this.QuestionNr >= 3) {
            this.EndGame();
            return;
        }

        this.QuestionNr++;
        this.Player1.HasAnswered = false;
        this.Player2.HasAnswered = false;

        if (this.QuestionTimeout == null) {
            this.QuestionTimeout = setTimeout(() => {
                console.log("Question Timeout reached!");
                if (this.Player1 == null || this.Player1.HasAnswered == false) {

                }
                else if (this.Player2 == null || this.Player2.HasAnswered == false) {

                }
                else {

                }                
                this.ResetTimeout();
                this.SendQuestion();

            }, 10000);
        }

        this.QuestionDB.GetRandomQuestion().then(question => {
            _this.ActualQuestion = question;
            this.CallMethod(_this.Player1.Connection, "NextQuestion", [question.Question, question.Answer1, question.Answer2, question.Answer3, question.Answer4]);
            this.CallMethod(_this.Player2.Connection, "NextQuestion", [question.Question, question.Answer1, question.Answer2, question.Answer3, question.Answer4]);
        });       
    }

    CheckAnswer(player, answer) {
        player.HasAnswered = true;
        if (player.Enemy.HasAnswered) {
            this.ResetTimeout();
            this.SendQuestion();
        }
    }

    EndGame() {
        this.CallMethod(this.Player1.Connection, "EndGame");
        this.CallMethod(this.Player2.Connection, "EndGame");
    }

    ResetTimeout() {
        clearTimeout(this.QuestionTimeout);
        this.QuestionTimeout = null;
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

    SendError(con, error, requestId) {
        let obj = {
            id:  Math.round(Math.random() * 0xFFFFFF), //Todo
            methodName: "Error",
            params: [error, requestId]                  
        }
        con.sendUTF(JSON.stringify(obj));
    }
    
}