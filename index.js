const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());
app.get("/", (req, res) => {
  res.send("I am the Bluff Server");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

//card ranks to number mapping
const cardRanksMap = {
  0: '2',
  1: '3',
  2: '4',
  3: '5',
  4: '6',
  5: '7',
  6: '8',
  7: '9',
  8: '10',
  9: 'J',
  10: 'Q',
  11: 'K',
  12: 'A',

  13: '2',
  14: '3',
  15: '4',
  16: '5',
  17: '6',
  18: '7',
  19: '8',
  20: '9',
  21: '10',
  22: 'J',
  23: 'Q',
  24: 'K',
  25: 'A',

  26: '2',
  27: '3',
  28: '4',
  29: '5',
  30: '6',
  31: '7',
  32: '8',
  33: '9',
  34: '10',
  35: 'J',
  36: 'Q',
  37: 'K',
  38: 'A',

  39: '2',
  40: '3',
  41: '4',
  42: '5',
  43: '6',
  44: '7',
  45: '8',
  46: '9',
  47: '10',
  48: 'J',
  49: 'Q',
  50: 'K',
  51: 'A'
}



// Store rooms, game state, and cards and players in memory
const rooms = {};
const gameState = {};
const cards = {};
const currentCardRank = {};
const lastPlayedCardCount = {};
const lastActualCards= {};
const lastPlayer = {};
const currentActualCardsonTable = {};
const passes = {};
const bluffwinner = {};


app.get('/rooms',(req,res)=>{
  res.json(rooms)
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // When a player joins a room
  socket.on("join_room", (data) => {
    const { room, playerName } = data;
    let isHost = false;

    // Create the room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = [];
      io.to(socket.id).emit("room_created", room);
      isHost = true;
    }

    // If game is already started or room is full, reject joining
    if (gameState[room] === 1 || rooms[room].length === 4) {
      socket.emit("room_full");
      return;
    }

    // Add the player to the room
    rooms[room].push({
      id: socket.id,
      name: playerName,
      isHost: isHost,
      playernumber: rooms[room].length,
      isTurn: false,
      cardsCount: 0,
      playedCardRank: '',
      playedCardCount: 0,
      playerClaims: '',
    });

    console.log(rooms[room]);

    socket.join(room);
    // Notify other clients about the updated player list
    io.to(room).emit("update_players", rooms[room]);

    // Join the room
   

    // Broadcast a message to the room when a player joins
    io.to(room).emit("receive_message", {
      playerName: "System",
      message: `${playerName} has joined the room.`,
    });
  });

  // When a player sends a chat message
  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  // When the host starts the game
  socket.on("start_game", (room) => {
    console.log("Game Started");

    // Set game state to started
    gameState[room] = 1;
    currentActualCardsonTable[room] = [];
    lastPlayedCardCount[room] = 0;
    lastPlayer[room] = "";
    lastActualCards[room] = [];
    passes[room] = [];
    currentCardRank[room] = "";


    // Distribute 52 playing cards to 4 players using a random number generator
    const allCards = Array.from({ length: 52 }, (_, i) => i);
    const shuffledCards = shuffleArray(allCards);
    const playerHands = distributeCards(shuffledCards);

    // Assign cards to players in the room
    cards[room] = {
      p1: playerHands[0],
      p2: playerHands[1],
      p3: playerHands[2],
      p4: playerHands[3],
    };

    // Determine the player turns based on who has the card '49'
    rooms[room].forEach((player, index) => {
      player.isTurn = cards[room][`p${index + 1}`].includes(51);
      player.cardsCount = 13;
      player.playedCardRank = '';
      player.playedCardCount=0;
      player.playerClaims= '';
      
    });

    // Emit cards to each player
    io.to(rooms[room][0].id).emit("cards", cards[room].p1);
    io.to(rooms[room][1].id).emit("cards", cards[room].p2);
    io.to(rooms[room][2].id).emit("cards", cards[room].p3);
    io.to(rooms[room][3].id).emit("cards", cards[room].p4);

    // Update players with their turns and game state
    io.to(room).emit("update_players", rooms[room]);
    io.to(room).emit("game_started", gameState[room]);
  });


  // When a player plays a card
  socket.on("play_card", (data) => {
    const { room, playerId, cardRank,cardsCount,actualcards } = data;



  
    // Update player's hand and emit the played card to all players
    rooms[room].forEach((player,index) => {
      if (player.id === playerId) {
        player.cardsCount=player.cardsCount-cardsCount;
        player.playedCardRank = cardRank;
        player.playedCardCount=cardsCount;
        player.playerClaims= cardsCount + " " + cardRank+"'s";
        player.isTurn = false;
        rooms[room][(player.playernumber+1)%4].isTurn = true;
        switch(player.playernumber){
          case 0:
            cards[room].p1 = cards[room].p1.filter((card) => !actualcards.includes(card));
            io.to(rooms[room][0].id).emit("cards", cards[room].p1);
            break;
          case 1:
            cards[room].p2 = cards[room].p2.filter((card) => !actualcards.includes(card));
            io.to(rooms[room][1].id).emit("cards", cards[room].p2);
            break;
          case 2:
            cards[room].p3 = cards[room].p3.filter((card) => !actualcards.includes(card));
            io.to(rooms[room][2].id).emit("cards", cards[room].p3);
            break;
          case 3:
            cards[room].p4 = cards[room].p4.filter((card) => !actualcards.includes(card));
            io.to(rooms[room][3].id).emit("cards", cards[room].p4);
            break;
        }
       
      }
    });

    let isGameOver = false;
    let winner = "";
    // Check if the last player has finished their cards and won
    rooms[room].forEach((player,index) => {
      if (player.id==lastPlayer[room] &&player.cardsCount === 0 && (player.id!==playerId)) {

        winner = player.name;
        isGameOver = true;
      }
    });

    if (isGameOver) {
      // Set game state to over
      gameState[room] = 2;

      //update the turns to false
      rooms[room].forEach((player,index) => {
        player.isTurn = false;
      });
      // Emit the winner to all players
      io.to(room).emit("game_over", winner);
      io.to(room).emit("update_players", rooms[room]);
      
    }else{
    // Update the last played card and player
    lastPlayedCardCount[room] = cardsCount;
    lastPlayer[room] = playerId;
    lastActualCards[room] = actualcards;
    currentCardRank[room] = cardRank;
    //add the actual cards to the current cards on table
    currentActualCardsonTable[room] = currentActualCardsonTable[room].concat(actualcards);
    console.log(currentActualCardsonTable[room]);
    
   

 
    // Update players with new game state
    io.to(room).emit("update_players", rooms[room]);
    io.to(room).emit("card_played",  {cardcnt:currentActualCardsonTable[room].length,cardrank:currentCardRank[room]});
    }
  });

 //when player passes the turn;

  socket.on("pass_turn", (data) => {

    const { room, playerId } = data;
    //add the pass player to the passes array if not already present
    if(!passes[room]){
      passes[room] = [];
    }

    if(!passes[room].includes(playerId)){
      passes[room].push(playerId);
    }



   

    //check if all players have passed

    if(passes[room].length === 4){
      //clear the current cards on table
      currentActualCardsonTable[room] = [];
      passes[room] = [];
      //set the turn to the player who played the last card
      rooms[room].forEach((player,index) => {
        player.isTurn = false;
        player.playedCardRank = "";
        player.playedCardCount=0;
        player.playerClaims= '';
        if (player.id === lastPlayer[room]) {
          player.isTurn = true;
         // rooms[room][(player.playernumber+1)%4].isTurn = false;
        }
      });

      let isWin=false;
      let winner="";
      rooms[room].forEach((player,index)=>{
          if(player.cardsCount==0){
           winner=player;
           isWin=true
  
          }
        });
  
  if(isWin){
    io.to(room).emit("game_over", winner);
  
  }
  else{
      // Update players with new game state
      io.to(room).emit("update_players", rooms[room]);
      io.to(room).emit("card_played",  {cardcnt:currentActualCardsonTable[room].length,cardrank:""});
      io.to(rooms[room][0].id).emit("cards", cards[room].p1);
      io.to(rooms[room][1].id).emit("cards", cards[room].p2);
      io.to(rooms[room][2].id).emit("cards", cards[room].p3);
      io.to(rooms[room][3].id).emit("cards", cards[room].p4);
  }
    }

    else{
    // Update player's hand and emit the played card to all players
    rooms[room].forEach((player,index) => {
      if (player.id === playerId) {
        player.isTurn = false;
        player.playedCardRank = "";
        player.playedCardCount=0;
        player.playerClaims= 'Pass';
        rooms[room][(player.playernumber+1)%4].isTurn = true;
      }
    });
  
    // emit the data to all players

    io.to(room).emit("update_players", rooms[room]);
    io.to(rooms[room][0].id).emit("cards", cards[room].p1);
    io.to(rooms[room][1].id).emit("cards", cards[room].p2);
    io.to(rooms[room][2].id).emit("cards", cards[room].p3);
    io.to(rooms[room][3].id).emit("cards", cards[room].p4);
  }

  });

  //when player calls a show/bluff
  socket.on("call_show", (data) => {

    console.log("show called");
   const { room, playerId } = data;

   //update the player who called the show
    rooms[room].forEach((player,index) => {
      if (player.id === playerId) {
        player.isTurn = false;
        player.playedCardRank = "";
        player.playedCardCount=0;
        player.playerClaims= 'Show';
       
      }
    });

    //check if the last played cards are bluff
    let isBluff = false;

    lastActualCards[room].forEach((card,index) => {
      if(cardRanksMap[card]!==currentCardRank[room]){
        isBluff = true;
      }
    });

    //set bluff looser and winner 
    let looser = "";
    let winner = "";
    if(isBluff){
      looser = lastPlayer[room];
      winner = playerId;
    }
    else{
      looser = playerId;
      winner = lastPlayer[room];
    }

    //set the turn to the looser to pick the cards
    rooms[room].forEach((player,index) => {
      player.isTurn = false;
      if (player.id === looser) {
        player.isTurn = true;
      }
    });

    //update bluff winner
    bluffwinner[room] = winner;

    console.log("isBluff: "+isBluff);
    console.log("looser: "+looser);
    console.log("winner: "+winner);
    //send the actual last card to all players
    io.to(room).emit("actual_cards", lastActualCards[room]);
    io.to(room).emit("update_players", rooms[room]);
    //send the bluff result to loser
    io.to(looser).emit("bluff_result", true);
    io.to(rooms[room][0].id).emit("cards", cards[room].p1);
    io.to(rooms[room][1].id).emit("cards", cards[room].p2);
    io.to(rooms[room][2].id).emit("cards", cards[room].p3);
    io.to(rooms[room][3].id).emit("cards", cards[room].p4);
  

  });

  //when bluff looser picks the cards

  socket.on("pick_cards", (data) => {

    const { room, playerId } = data;
    //set the turn to the bluff winner
    rooms[room].forEach((player,index) => {
      player.isTurn = false;
      player.playedCardRank = "";
      player.playedCardCount=0;
      player.playerClaims= '';
      if (player.id === bluffwinner[room]) {
        player.isTurn = true;
      }
    });

    //update the cards of the bluff looser
    rooms[room].forEach((player,index) => {
      if (player.id === playerId) {
        player.cardsCount = player.cardsCount + currentActualCardsonTable[room].length;
        switch(player.playernumber){
          case 0:
            cards[room].p1 = cards[room].p1.concat(currentActualCardsonTable[room]);
            io.to(rooms[room][0].id).emit("cards", cards[room].p1);
            break;
          case 1:
            cards[room].p2 = cards[room].p2.concat(currentActualCardsonTable[room]);
            io.to(rooms[room][1].id).emit("cards", cards[room].p2);
            break;
          case 2:
            cards[room].p3 = cards[room].p3.concat(currentActualCardsonTable[room]);
            io.to(rooms[room][2].id).emit("cards", cards[room].p3);
            break;
          case 3:
            cards[room].p4 = cards[room].p4.concat(currentActualCardsonTable[room]);
            io.to(rooms[room][3].id).emit("cards", cards[room].p4);
            break;
        }
      }
    });

    //clear the current cards on table
    currentActualCardsonTable[room] = [];
    passes[room] = [];
    currentCardRank[room] = "";
    lastPlayedCardCount[room] = 0;
    lastPlayer[room] = "";
    lastActualCards[room] = [];

      //check if anyone have finished his cards
    let isWin=false;
    let winner="";
    rooms[room].forEach((player,index)=>{
        if(player.cardsCount==0){
         winner=player;
         isWin=true

        }
      });

if(isWin){
  io.to(room).emit("game_over", winner);

}
   else{ // Update players with new game state
    io.to(room).emit("update_players", rooms[room]);
    io.to(room).emit("card_played",  {cardcnt:currentActualCardsonTable[room].length,cardrank:""});
    io.to(room).emit("bluff_resolved", false);
    io.to(rooms[room][0].id).emit("cards", cards[room].p1);
    io.to(rooms[room][1].id).emit("cards", cards[room].p2);
    io.to(rooms[room][2].id).emit("cards", cards[room].p3);
    io.to(rooms[room][3].id).emit("cards", cards[room].p4);

   }
    
   

  });

  // When a player disconnects
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);

    // Remove the player from all rooms when they disconnect
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((player) => player.id !== socket.id);
      io.to(room).emit("update_players", rooms[room]);
    }
  });
});

// Utility function to shuffle array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Utility function to distribute cards among players
function distributeCards(cards) {
  const playerHands = [[], [], [], []];
  for (let i = 0; i < cards.length; i++) {
    playerHands[i % 4].push(cards[i]);
  }
  return playerHands;
}

server.listen(3002, () => {
  console.log("SERVER IS RUNNING");
});
