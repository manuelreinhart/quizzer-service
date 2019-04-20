
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
        if (this.Player1 == null) {            
            this.Player1 = player; 
            console.log("player 1 joined");   
            return true;    
        }

        if (this.Player2 == null) {
            this.Player2 = player;


            console.log("player 2 joined -> Ready to Start")   ;
            this.CallMethod(this.Player1.Connection, "Start", [this.Player2.Name]);
            this.CallMethod(this.Player2.Connection, "Start", [this.Player1.Name]);

            return true;
        }
        
        console.log("Error: Room is full");      

        return false;
        
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