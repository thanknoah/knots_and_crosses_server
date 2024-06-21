// Variables
const { createServer } = require('http');
const { Server } = require('socket.io');

// Intialization
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: [
       'GET',
       'POST'
    ]
  }
})


class initalizeRoomService {
   constructor(rooms) {
      this.rooms = rooms;
   }

   getRoomsId() {
      let ids = []

      this.rooms.map((e) => { ids.push(e.id) })
      return ids;
   }

   getRoomProperty(id) {
      let property = {}

      this.rooms.map(room => {
         if (room.id == id) {
            property = room;
         }
      });

      return property;
   }

   getUsers(id) {
      let users = []

      this.rooms.map(room => {
         if (room.id == id) {
            room.nicknames.forEach(element => {
               users.push(element);
            })
         }
      });

      return users;
   }

   getRoomPopulation(id) {
      let users = [];

      this.rooms.map(room => {
         if (room.id == id) {
            room.nicknames.forEach(user => {
                users.push(user);
            });
         }
      });

      return users.length;
   }

   getRooms() {
      return this.rooms;
   }

   insertRoom(id) {
      this.rooms.push({
        id: id,
        nicknames: [],
        XO: ["X", "O"],
        board: ["", "", "",
                "", "", "",
                "", "", ""
        ],
        turn: null,
        gameStarted: false,
        won: false
      });
   }

   addPlayer(name, id) {
      this.rooms.map(element => {
          if (element.id == id) {
              element.nicknames.push(name);
          }
      });
   }
 
   removePlayer(name, id) {
      this.rooms.map(room => {
          if (room.id == id) {
              room.nicknames.forEach((element, x) => {
                  if (element == name) {
                     console.log(element.nicknames);
                     room.nicknames.splice(x);
                  }
              });
          }
      });
   }

   resetBoard(id) {
      this.rooms.map(room => {
         if (room.id == id){
            for (let x = 0; x < room.board.length; x++) {
                room.board[x] = "";
            }
         }
      })
   }

   availableRoom() {
      let avail = [];

      this.rooms.forEach(room => {
         if (room.nicknames.length != 2) {
            avail.push(room.id);
         }
      });

      if (!avail) return null;

      return avail[Math.floor(Math.random() * avail.length)];
   }

   getLastId() {
      return this.rooms.length;
   }

   isBoardFull(board) {
      let isFull = true;

      board.forEach(e => {
         if (e == "") isFull = false;
      });

      return isFull;
   }

   checkWin(properties, id) {
      var winCombos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
   
      winCombos.forEach(possible => {
          possible.forEach((num, i) => {
            let first = properties.board[possible[0]];
            let second = properties.board[possible[1]];
            let third = properties.board[possible[2]];

            if (first == "X" && second == "X" && third == "X" && properties.won == false) {
                console.log("X")
                properties.won = true;
                properties.gameStarted = false;

                rooms.resetBoard(id);

                io.to(id).emit("message", "Round has been won by " + properties.nicknames[properties.XO.indexOf(first)]);
                io.to(id).emit("boardUpdate", properties.board)

                setInterval(() => {
                  properties.won = false
                  properties.gameStarted = true;
                }, 5000);
            }

            if (first == "O" && second == "O" && third == "O" && properties.won == false) {
               console.log("O")
               properties.won = true;
               properties.gameStarted = false;

               rooms.resetBoard(id);

               io.to(id).emit("message", "Round has been won by " + properties.nicknames[properties.XO.indexOf(first)]);
               io.to(id).emit("boardUpdate", properties.board)
  

               setInterval(() => {
                 properties.won = false
                 properties.gameStarted = true;
               }, 5000);
            }

            if (rooms.isBoardFull(properties.board)) {
               properties.won = true;
               properties.gameStarted = false;

               rooms.resetBoard(id);

               io.to(id).emit("message", "Round has not been won!");
               io.to(id).emit("boardUpdate", properties.board);

               setInterval(() => {
                  properties.won = false
                  properties.gameStarted = true;
                }, 5000);
            }
          });
      });
   }
}

let rooms = new initalizeRoomService([]);
httpServer.listen(3001);

console.log(httpServer)

// On connect (is in lobby)
io.on("connection", (socket) => {
    // Config
    let socket_id = socket.id;
    let nickname = "";
    let id;

    // When user registers username
    socket.on("nickname", data => {
        nickname = data

        // Join game or create room
        let availableRoom = rooms.availableRoom();
        
        if (!availableRoom) {
           id = rooms.getLastId() + 1
           rooms.insertRoom(id);
           rooms.addPlayer(nickname, id);
           socket.join(id);
        }

        if (availableRoom) {
           id = availableRoom;
           rooms.addPlayer(nickname, id);
           socket.join(id);
        }

        let properties = rooms.getRoomProperty(id);
        
        // Show message that player has joined
        setTimeout(() => {
           io.to(id).emit("message", nickname + " has joined the server.");
           io.to(id).emit("playerListUpdate", rooms.getUsers(id));
           io.to(socket_id).emit("setName", properties.XO[properties.nicknames.length-1]);
        }, 500)
  
        // Check if match is started && Win
        setInterval(() => {
           if (rooms.getRoomPopulation(id) == 2 && properties.gameStarted == false && properties.won == false) {
              properties.gameStarted = true
              properties.turn = Math.round(Math.random());
           }

           if (properties.gameStarted == true && rooms.getRoomPopulation(id) == 2) {
               io.to(id).emit("message", "It is Player " + properties.nicknames[properties.turn] + "'s turn");
           }

           rooms.checkWin(properties, id);
        }, 1000);

        // Main Game Handler
        socket.on("turn", data => {
           if (data.name == properties.XO[properties.turn] && properties.gameStarted == true && properties.board[data.id] == "") {
              properties.board[data.id] = properties.XO[properties.turn];

              if (properties.turn == 1) {
                  properties.turn = 0;
              } else {
                  properties.turn = 1;
              }
              
              io.to(id).emit("boardUpdate", properties.board);
              io.to(id).emit("message", "It is Player " + properties.nicknames[properties.turn] + "'s turn");
           } else if (data.name != properties.XO[properties.turn]) {
               socket.emit("error", "It is not your turn!");
           } else if (properties.board[data.id] != "") {
               socket.emit("error", "That box is covered already!");
           }
        });

        // If a player disconnectes
        socket.on("disconnect", () => {
            gameStarted = false;
            rooms.removePlayer(nickname, id);
            rooms.resetBoard(id);

            io.to(id).emit("message", nickname + " Has left the server");
            io.to(id).emit("playerListUpdate", rooms.getUsers(id));
            io.to(id).emit("boardUpdate", properties.board)

            console.log(properties.board);
            console.log(rooms.getUsers(id));

            setTimeout(() => {
               io.to(id).emit("message", "Waiting for new opponent..");
            }, 2000);
        });
    })

});
