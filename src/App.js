import logo from './logo.svg';
import './App.css';
import { Container, Button, Row, Col, Badge, Form, Image } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import tableimage from './tablebg.jpg';
import playerpic from './player.png';
import SelectableImage from './SelectableImage';

import { io } from 'socket.io-client';

const socket = io('http://192.168.29.222:3002/');


const backgroundImage = `url(${tableimage})`;


const cards = [];

const suits = ['hearts', 'clubs', 'diamonds', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const cardShortRank = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
for (const suit of suits) {
  for (let rank of ranks) {
    const id = ranks.indexOf(rank) + 2; // Adjust the id based on your preference
    const name = `${rank}_of_${suit}`;
    const path = `./card/${name}.png`;

    cards.push({
      category: suit,
      id,
      sl: cards.length + 1,
      name,
      path,
    });
  }
}


function App() {

  const [serverStatus, setServerStatus] = useState(0); // State to hold server status


  //Define room and player name for cleint side
  const [isInside, setIsInside] = useState(false);
  const [room, setRoom] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [myPlayerId, setMyPlayerId] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isRankStarter, setIsRankStarter] = useState(false);

  //define other players & gamesteate for client side
  const [players, setPlayers] = useState([]);
  const playersCopy = [...players];
  const [gameState, setGameState] = useState(0);
  const [currentRank, setCurrentRank] = useState('');
  const [wonPlayer, setWonPlayer] = useState(null);

  //define my cards & turns for client side
  const [MyCards, setMyCards] = useState([]);
  const mycardsCopy = [...MyCards];
  const mycardsSorted = mycardsCopy.sort((a, b) => a%13 - b%13);
  const [selectedCards, setSelectedCards] = useState([]);
  const [cardontablecount, setCardOnTableCount] = useState(0);
  const [bluffState, setBluffState] = useState(0);
  const [cardsRevieledInBluffcall, setCardsRevieledInBluffcall] = useState([]);
  const [isblufflooser, setIsBluffLooser] = useState(false);
 

  //check server status from http get request
  useEffect(() => {
    fetch('http://192.168.29.222:3002/')
      .then(res => {
        if (res.ok) {
          return res.text(); // Convert response to text
        } else {
          throw new Error('Server response not OK');
        }
      })
      .then(data => {
        // Check if response data contains "I am the Mafia Server"
        if (data.includes("I am the Bluff Server")) {
          console.log('Received expected response:', data);
          setServerStatus(1); // Set serverStatus to 1 if response contains expected text
        } else {
          console.log('Received unexpected response:', data);
          setServerStatus(0); // Set serverStatus to 0 if response does not contain expected text
        }
      })
      .catch(err => {
        console.error('Error checking server status:', err);
        setServerStatus(0); // Set serverStatus to 0 if there is an error in the fetch request
      });
  }, []);


//define client side functions
  const handleJoinRoom = () => {

    if (room === "" || playerName === "") {
      alert("Please enter room code and player name");
      return;
    }
    else {
      socket.emit("join_room", { room, playerName });
      setIsInside(true);
    }
  }

  const handleRestart = () => {
    
    setGameState(1);
    setIsMyTurn(false);
  
    socket.emit("start_game", room);


  }


  const handleClearTable = () => {

    socket.emit("clear_table", room);



  }

  //if card is not selected then select it else unselect it
  const handleCardClick = (value,isSelected) => {
 
    if (!isSelected) {
      setSelectedCards([...selectedCards, value]);
    } else {
      setSelectedCards(selectedCards.filter((v) => v !== value));
    }
  };

  const handleThroughCard = (cardRank) => {
    socket.emit("play_card", { room, playerId: socket.id, cardRank: cardRank,cardsCount:selectedCards.length ,actualcards:selectedCards });
    setSelectedCards([]);
    setMyCards([]);

  };

  const handlePass = () => {
    socket.emit("pass_turn", { room, playerId: socket.id });
  }
  const handleShow = () => {
    socket.emit("call_show", { room, playerId: socket.id });
  }
  
  const handlePickCards = () => {
    socket.emit("pick_cards", { room, playerId: socket.id });
    setMyCards([]);
  }

  //define socket events
  useEffect(() => {

    const handlecardplayed = (data) => {
      setCardOnTableCount(data.cardcnt);
      console.log(data);
      setCurrentRank(data.cardrank);

    }

    const handleUpdatePlayers = (data) => {

      setSelectedCards([]);
      console.log(data);
      setPlayers(data);
      setMyPlayerId(data.findIndex((element) => { return element.id === socket.id }));

      if (data[data.findIndex((element) => { return element.id === socket.id })]?.isTurn) {
        setIsMyTurn(true);
      }
      else {
        setIsMyTurn(false);
      }

    }

    const handleCards = (data) => {

      console.log("recieved updated cards");
      console.log(data);
      setMyCards(data);
    
    }

    const handleGameStarted = (data) => {

     setGameState(1);	
     setCurrentRank('');
     setCardOnTableCount(0);
     setBluffState(0);
     setIsBluffLooser(false);
     setWonPlayer('');
     setSelectedCards([]);



    }

    const handleActualCards = (data) => {
      setCardsRevieledInBluffcall(data);
      setBluffState(1);
    }

    const handleBluffResolved = (data) => {
      setBluffState(0);
      setIsBluffLooser(false);
    }

    const handleBluffResult = (data) => {
      setIsBluffLooser(data);
    }
    const handleGameOver = (player) => {

    
      setGameState(2);
      setWonPlayer(player);

      //   alert("Game Over " +player.name+" Lost by "+player.cardsCount+" cards");

    }


    socket.on("card_played",handlecardplayed);
    socket.on("actual_cards",handleActualCards);
    socket.on("update_players", handleUpdatePlayers);
    socket.on("cards", handleCards);
    socket.on("game_started", handleGameStarted);
    socket.on("bluff_result", handleBluffResult);
    socket.on("bluff_resolved", handleBluffResolved);
    socket.on("game_over", handleGameOver);
    return () => {
      socket.off("update_players", handleUpdatePlayers);
      socket.off("card_played", handlecardplayed);
      socket.off("actual_cards", handleActualCards);
      socket.off("cards", handleCards);
      socket.off("game_started", handleGameStarted);
      socket.off("bluff_result", handleBluffResult);
      socket.off("bluff_resolved", handleBluffResolved);
      socket.off("game_over", handleGameOver);
    };


  }, []);




  return (
    <>
      {/*if player is outside the game*/}
      {!isInside &&


        <Container className="justify-content-md-center pt-5 d-flex flex-column" style={{ minHeight: '100vh' }}>
          {/* input form for room code and player name in the center of the screen*/}

          <Row className="justify-content-md-center mt-1">
            <center><h1> CARD BLUFF</h1></center>
            <br />
            <Col md="4" sm="12" className='border border-secondary'>
              <Form>
                <Form.Group controlId="formBasicEmail">
                  <Form.Label>Room Code</Form.Label>
                  <Form.Control type="text" placeholder="Enter Room Code" value={room} onChange={(e) => { setRoom(e.target.value) }} />
                </Form.Group>

                <Form.Group controlId="formBasicPassword">
                  <Form.Label>Player Name</Form.Label>
                  <Form.Control type="text" placeholder="Enter Player Name" value={playerName} onChange={(e) => { setPlayerName(e.target.value) }} />
                </Form.Group>



                <Button variant="primary" className='mt-4 mb-4' onClick={handleJoinRoom} disabled={serverStatus == 0 ? true : false}>
                  Join Game
                </Button>


              </Form>
            </Col>
          </Row>



          <div className="mt-auto text-center" style={{ marginBottom: 10 }}>
            <Row className="justify-content-md-center mt-1" style={{ marginBottom: 50 }}>
              <Col md="4" sm="12" >
                <h6>Server Status</h6>
                {serverStatus === 1 ? (
                  <Badge className="bg-success">Server is Online</Badge>
                ) : (
                  <Badge className='bg-warning'>Starting server... Please wait.</Badge>
                )}
              </Col>
            </Row>
            Made with ❤ by Ratan
          </div>
        </Container>

      }


      {/*if player is inside the game*/}
      {isInside &&
        <div>
          <Row className='justify-content-md-center'>
            <h6>Room:{room} </h6>
            {/* Game Over Alert */ }
            {gameState==2 ? <div class="alert alert-danger" role="alert" style={{ width: '50%' }}>
              Game Over ! {wonPlayer} won the game
            </div> : null}
            <Col md="12" className='border border-secondary text-center '>
              <Image src={playerpic} roundedCircle height={20} width={20} />
              <h6>{players[(myPlayerId + 2) % 4]?.name}{players[(myPlayerId + 2) % 4]?.isTurn ? '(thinking..)' : ''}</h6>
              <h6>Cards: {players[(myPlayerId + 2) % 4]?.cardsCount}</h6>
              {!players[(myPlayerId + 2) % 4] && <h6>Waiting</h6>}
            </Col>
          </Row>
          <Row className='justify-content-md-center'>
            <Col md="4" sm={3} xs={3} className='border border-secondary text-center d-flex flex-column align-items-center justify-content-center'>
              <Row><Image src={playerpic} roundedCircle height={20} width={20} />
              </Row>
              <Row>
                <h6>{players[(myPlayerId + 3) % 4]?.name}{players[(myPlayerId + 3) % 4]?.isTurn ? '(thinking..)' : ''}</h6>
                <h6>Cards:{players[(myPlayerId + 3) % 4]?.cardsCount}</h6>
                {!players[(myPlayerId + 3) % 4] && <h6>Waiting</h6>}
              </Row>
            </Col>
            <Col md="4" sm={4} xs={4} className='border border-secondary' style={{ height: '35vh', color: 'white', backgroundImage: backgroundImage, backgroundSize: 'cover' }}>




              <Row className='justify-content-md-center text-center' >
                <Col md='3' className='text-center d-flex flex-column align-items-center justify-content-center' style={{ height: '35vh' }}>
                  {/* <Image src={cards[players[(myPlayerId + 3) % 4]?.playedCard]?.path} width='35%' style={{ backgroundColor: 'white', transform: 'rotate(90deg)' }} /> */}
                  <p>{players[(myPlayerId + 3) % 4]?.playerClaims}</p>
                
                </Col>

                <Col md='6' className='text-center d-flex flex-column align-items-center justify-content-center' style={{ height: '35vh' }}>
                  {/* <Image src={cards[players[(myPlayerId + 2) % 4]?.playedCard]?.path} width='35%' style={{ backgroundColor: 'white' }} /> */}

                  <p>{players[(myPlayerId + 2) % 4]?.playerClaims}</p>
                
                 
             
<Row className='justify-content-between' style={{ display: 'flex', flexWrap: 'wrap',height:'15vh', marginBottom:20 }}>
         
{bluffState==1&&<Col className='m-2'>
  {cardsRevieledInBluffcall.map((value, key) => (

    <SelectableImage
    key={key}
    src={cards[value].path}
    width="25%"
    isSelected={false}
    isDisabled={true}
    value={value} // Pass the value for each card
    // Pass the click handler
  />


  ))} 
  {isblufflooser && <button className='btn btn-warning m-1' onClick={handlePickCards}>Pick Cards</button>}
  </Col>}

{cardontablecount>0 && bluffState==0 && <Col className='m-2'>
  <Image src='./card/back.png' width='30%' style={{ backgroundColor: 'white',marginBottom:15 }} />
               
</Col>
}

{
  cardontablecount==0 &&bluffState==0 && <Col className='m-2'>
    </Col>
}
</Row>
                  {/* <Image src={cards[players[myPlayerId]?.playedCard]?.path} width='35%' style={{ backgroundColor: 'white' }} /> */}
                 
                 <p>{players[myPlayerId]?.playerClaims}</p>
                </Col>

                <Col md='3' className='text-center d-flex flex-column align-items-center justify-content-center' style={{ height: '35vh' }}>
                  {/* <Image src={cards[players[(myPlayerId + 1) % 4]?.playedCard]?.path} width='35%' style={{ backgroundColor: 'white', transform: 'rotate(90deg)' }} /> */}
                  <p>{players[(myPlayerId + 1) % 4]?.playerClaims}</p>
                </Col>


              </Row>

            </Col>
            <Col md="4" sm={3} xs={3} className='border border-secondary text-center d-flex flex-column align-items-center justify-content-center'>
              <Row><Image src={playerpic} roundedCircle height={20} width={20} />
              </Row>
              <Row>
                <h6>{players[(myPlayerId + 1) % 4]?.name}{players[(myPlayerId + 1) % 4]?.isTurn ? '(thinking..)' : ''}</h6>
                <h6>Cards:{players[(myPlayerId + 1) % 4]?.cardsCount}</h6>
                {!players[(myPlayerId + 1) % 4] && <h6>Waiting</h6>}
              </Row>
            </Col>
          </Row>
          
         
          <div className='justify-content-center flex' style={{ display: 'flex' }}>
  {cardShortRank.map((value, key) => (
    <Button className='btn btn-info' key={key} style={{ margin: 10 }}
    disabled={selectedCards.length==0||!isMyTurn||(currentRank!=value&&cardontablecount>0)||players[myPlayerId]?.playerClaims=='Pass'}
    onClick={()=>handleThroughCard(value)}
    >
      {value}
    </Button>
  ))}
   <Button className='btn btn-warning' style={{ margin: 10 }} disabled={!isMyTurn||cardontablecount==0}
   onClick={handleShow}>
      Show
    </Button>
    <Button className='btn btn-danger'  style={{ margin: 10 }} disabled={!isMyTurn||cardontablecount==0}
    
    onClick={handlePass}>
      Pass
    </Button>
</div>



          <Row className='border border-secondary justify-content-between' style={{ display: 'flex', flexWrap: 'wrap' }}>

           
         
            {/* put mycards here*/}
            <Col className='m-2'>
              {mycardsSorted.map((value, key) => (
                  
                <SelectableImage
                key={key}
                src={cards[value].path}
                width="6%"
                isSelected={selectedCards.includes(value)}
                isDisabled={selectedCards.length == 4 && !selectedCards.includes(value)}
                value={value} // Pass the value for each card
                onClick={()=>handleCardClick(value,selectedCards.includes(value))} // Pass the click handler
              />

     
              ))} </Col>

          </Row>
          <Row className='justify-content-md-center'>
            <Col md="12" className=' text-center '>
              <Image src={playerpic} roundedCircle height={20} width={20} />
              <h6>{players[myPlayerId]?.name}  {players[myPlayerId]?.isTurn ? "(thinking..)" : ""}</h6>
              <h6>Cards: {players[myPlayerId]?.cardsCount}</h6>


              {players[myPlayerId]?.isHost && !gameState==1 && players.length === 4 && <Button variant="primary" className='mt-4 mb-4' onClick={() => { socket.emit("start_game", room); }}>
                Start Game
              </Button>}
              {
                players[myPlayerId]?.isHost && !gameState==1 && players.length != 4 && <h3>Waiting for players to join</h3>
              }
              {
                isMyTurn && <h3>Its your turn</h3>
              }
              {
                players[myPlayerId]?.isHost && gameState==2 && <Button variant="primary" className='mt-4 mb-4' onClick={handleRestart}>
                  Restart Game
                </Button>
              }
            </Col>
          </Row>


        </div>}


    </>
  );
}

export default App;
