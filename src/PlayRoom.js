var events = require('events');
const debug = true;

module.exports = class PlayRoom {
      

    constructor() {
        this.eventEmitter = new events.EventEmitter();      
    }

    IsJoinable() {
        let joinable = this.Player1 == null || this.Player2 == null;
        return joinable;
    }

    JoinRoom(player) {
        let _this = this;

        if (this.Player1 == null) {      
            if (debug)
                console.log("Room ", this.RoomID, ": player 1 joined");    

            player.Index = 1;       
            this.Player1 = player;                                   
                            
            this.RegisterWebsocketEvents(player);

            return true;    
        }

        if (this.Player2 == null) {
            if (debug)
            console.log("Room ", this.RoomID, ": player 2 joined -> Ready to Start")   ;

            player.Index = 2;
            this.Player2 = player;

            this.Player1.Enemy = this.Player2;
            this.Player2.Enemy = this.Player1;
            
            this.RegisterWebsocketEvents(player);
            
            setTimeout(() => {
                this.StartGame();
            }, 1000);            

            return true;
        }
        
        console.log("Room ", this.RoomID, " Error: Room is full");      

        return false;
        
    }    

    RegisterWebsocketEvents(player) {
        let _this = this;
        player.Connection.on('close', function(reasonCode, description) {
            _this.PlayerHasLeft(player, 2);
        }); 
        player.Connection.on('message', function(message) {
            _this.HandleMessage(player, message);
        });
    }

    HandleMessage(player, message) {
        let _this = this;
        let connection = player.Connection;
        if (message.type === 'utf8') {
            if (debug)
                console.log('Received Message: ' + message.utf8Data);

            let obj = JSON.parse(message.utf8Data);            

            if (!obj)
                this.SendError(connection, "Error parsing JSON");

            else if (obj.methodName == "StopQuiz") { 
                _this.SendCallback(connection, obj.id);
                let reason = obj.params[0] | 0;             
                _this.PlayerHasLeft(player, reason);
            }
            else if (obj.methodName == "AnswerQuizQuestion") {                
                let answer = obj.params[0];
                let rightAnswer = this.CheckAnswer(player, answer);
                _this.SendCallback(connection, obj.id, [rightAnswer, 0]);
            }
        }
    }

    PlayerHasLeft(player, reason = 0) {
        //let enemyIndex = player.Index % 2 + 1;
        //let enemy = this['Player' + enemyIndex];
        let enemy = player.Enemy;     

        if (debug)
            console.log("Room ", this.RoomID, ": Player ", player.Name, ' left the game - reason ', reason);

        this.AddScore(player, -20);
        
        if (enemy != null) {
            if (enemy.HasAnswered == true)
                this.AddScore(enemy, enemy.HasRightAnswered ? 10 : -5);

            else
                this.AddScore(enemy, enemy.HasRightAnswered ? 10 : -5);
            
            this.CallMethod(enemy.Connection, "Stopped", [player.Name + ' hat das Spiel verlassen!', reason]);
        }   

        this.EndGame();       
        
    }

    StartGame() {   
        this.GameStarted = true;
        this.GameQuestions = [];
        
        this.Player1.GameScore = 0;
        this.Player2.GameScore = 0;        
        
        this.CallMethod(this.Player1.Connection, "Start", [this.Player2.Name]);
        this.CallMethod(this.Player2.Connection, "Start", [this.Player1.Name]);

        this.PlayerDB.IncrementPlayedGames(this.Player1.ID);
        setTimeout(() => {
            this.PlayerDB.IncrementPlayedGames(this.Player2.ID);
        }, 2000);
        
        setTimeout(() => {
            this.SendQuestion();
        }, 2000);       

    }

    SendQuestion() {
        let _this = this;
        if (this.QuestionNr == null)
            this.QuestionNr = 0;

        if (this.Player1 == null || this.Player2 == null || this.QuestionNr >= 10) {
            this.EndGame();
            return;
        }

        this.QuestionNr++;
        this.Player1.HasAnswered = false;
        this.Player2.HasAnswered = false;
        this.Player1.HasRightAnswered = false;
        this.Player2.HasRightAnswered = false;

        if (this.QuestionTimeout == null) {
            this.QuestionTimeout = setTimeout(() => {
                console.log("Room ", this.RoomID, ": Question Timeout reached!");
                if (this.Player1 != null && this.Player1.HasAnswered == true) {
                    this.AddScore(this.Player1, this.Player1.HasRightAnswered ? 10 : -5);
                    this.AddScore(this.Player2, -10);
                }
                else if (this.Player2 != null && this.Player2.HasAnswered == true) {
                    this.AddScore(this.Player2, this.Player2.HasRightAnswered ? 10 : -5);
                    this.AddScore(this.Player1, -10);
                }
                else {
                    this.AddScore(this.Player1, -10);
                    this.AddScore(this.Player2, -10);
                }                
                this.ResetTimeout();
                this.SendQuestion();

            }, 10000);
        }

        this.QuestionDB.GetRandomQuestion(this.Difficulty, this.GameQuestions).then(question => {
            _this.ActualQuestion = question;
            _this.GameQuestions.push(question._id.toString());
            this.CallMethod(_this.Player1.Connection, "NextQuestion", 
                [question.Question, question.Answer1, question.Answer2, question.Answer3, question.Answer4, _this.Player1.GameScore, _this.Player2.GameScore]);
            this.CallMethod(_this.Player2.Connection, "NextQuestion", 
                [question.Question, question.Answer1, question.Answer2, question.Answer3, question.Answer4, _this.Player2.GameScore, _this.Player1.GameScore]);
        });       
    }

    CheckAnswer(player, answer) {
        player.HasAnswered = true;      
        let rightAnswered = answer == 1;
        player.HasRightAnswered = rightAnswered;        

        if (player.Enemy && player.Enemy.HasAnswered) {            
            if (player.Enemy.HasRightAnswered) {
                this.AddScore(player.Enemy, 20);
            }
            else {
                this.AddScore(player.Enemy, -5);
            }            
            if (player.HasRightAnswered) {
                this.AddScore(player, 10);
            }
            else {
                this.AddScore(player, -5);
            }

            this.ResetTimeout();
            this.SendQuestion();
        }

        return player.HasRightAnswered;
    }

    AddScore(player, score) {
        if (player != null) {
            if (debug)
                console.log('Add Score to ', player.Name, score);

            player.GameScore += score;
            this.PlayerDB.AddScore(player.ID, score);
        }
    }

    EndGame() {
        if (debug)
            console.log('EndGame');

        if (this.Player1 != null && this.Player1.Connection != null) {
            let playerscore = this.Player1.GameScore == null ? 0 : this.Player1.GameScore;
            let enemyscore = 0;
            if (this.Player2 != null && this.Player2.GameScore != null)
                enemyscore = this.Player2.GameScore;
            this.CallMethod(this.Player1.Connection, "EndGame", [playerscore, enemyscore]);
        }
            
        if (this.Player2 != null && this.Player2.Connection != null) {
            let playerscore = this.Player2.GameScore == null ? 0 : this.Player2.GameScore;
            let enemyscore = 0;
            if (this.Player1 != null && this.Player1.GameScore != null)
                enemyscore = this.Player1.GameScore;
            this.CallMethod(this.Player2.Connection, "EndGame", [playerscore, enemyscore]);
        }        
        this.eventEmitter.emit('GameEnd', this.RoomID);
    }

    ResetTimeout() {
        clearTimeout(this.QuestionTimeout);
        this.QuestionTimeout = null;
    }

    SendCallback(con, id, params = []) {
        if (con == null)
            return;

        let answer = {
            id: id,
            methodName: "Callback",
            params: params                  
        }
        con.sendUTF(JSON.stringify(answer));
    }

    CallMethod(con, methodName, params) {
        if (con == null)
            return;

        let obj = {
            id:  Math.round(Math.random() * 0xFFFFFF), //Todo
            methodName: methodName,
            params: params                  
        }
        con.sendUTF(JSON.stringify(obj));
    }

    SendError(con, error, requestId) {
        if (con == null)
            return;

        let obj = {
            id:  Math.round(Math.random() * 0xFFFFFF), //Todo
            methodName: "Error",
            params: [error, requestId]                  
        }
        con.sendUTF(JSON.stringify(obj));
    }
    
}