// This function creates a new table
function Table(numOfPlayers, smallBlind, bigBlind, buyIn) {
	$("#startGameBtn").show();
	$("#startGameBtn").focus();
	this.numOfPlayers = numOfPlayers;
	this.smallBlind = smallBlind;
	this.bigBlind = bigBlind;
	this.buyIn = buyIn;
	this.players = new Array(numOfPlayers);
	this.dealer = 0;
	this.isGameStarted = false;
}

// This function adds a new player to the table
Table.prototype.addPlayer = function(playerSeat, playerID, playerName, playerPic) {
	this.players[playerSeat] = {};
	this.players[playerSeat].playerID = playerID;
	this.players[playerSeat].name = playerName;
	this.players[playerSeat].money = this.buyIn;
	this.players[playerSeat].cards = undefined;
	this.players[playerSeat].inGame = false;
	this.players[playerSeat].playerPic = playerPic;
	this.players[playerSeat].bet = 0;
	this.players[playerSeat].isFolded = false;
	// sends data to controller
	MCClient.sendData(savedRoomID, playerID, {action : "buyIn", money: this.buyIn});
};

// This function removes a player from the table
Table.prototype.removePlayer = function(playerID, playerSeat) {
	if (playerSeat !== undefined) {
		this.players[playerSeat] = undefined;
		removePlayerImage(playerSeat);
		changePlayerBet(playerSeat, 0);
		chooseAction(playerSeat, "");
		hidePlayerCards(playerSeat);
		// sends data to controller
		MCClient.sendData(savedRoomID, playerID, {action : "out"});
		// disconnects user from the room
		MCClient.disconnectUser(savedRoomID, playerID);
	} else {
		for (var i = 0; i < this.numOfPlayers; ++i) {
			if (this.players[i] != undefined && this.players[i].playerID === playerID) {
				this.players[i].isFolded = true;
				this.players[i].money = 0;
				changePlayerBet(i, 0);
				removePlayerImage(i);
				hidePlayerCards(i);
				updateMoney(i ,0);
				var stillInGmae = new Array();
				for (var j = 0; j < this.numOfPlayers; ++j) {
					if (this.players[j] !== undefined && this.players[j].inGame && this.players[j].money > 0 && !this.players[j].isFolded) {
						stillInGmae.push(j);
					}
				}
				if (stillInGmae.length <= 1) {
					for (var j = 0; j < stillInGmae.length; ++j) {
						var playerSeat = stillInGmae[j];
						this.players[playerSeat].money += this.players[playerSeat].bet;
						updateMoney(playerSeat , this.players[playerSeat].money);
						// sends data to controller
						MCClient.sendData(savedRoomID, this.players[playerSeat].playerID, {action : "buyIn", money : this.players[playerSeat].money});
					}
					kickPlayers(this);
					this.isGameStarted = false;
					$("#startGameBtn").show();
					$("#startGameBtn").focus();
					return;
				}
				if (this.next === i) {
					this.progress(playerID, "fold");
				}
				chooseAction(i, "disconnected");
				return;
			}
		}
	}
};

// This function starts a new game
Table.prototype.startGame = function() { 
	console.log("trying to start a game");
	if (!this.isGameStarted && numOfPlayersInGame(this.players) > 1) {
		console.log("game started");
		$("#startGameBtn").hide();
		startRoundSnd.play();
		this.isGameStarted = true;
		this.pot = 0;
		changePot(0);
		this.roundNum = 1;
		this.deck = fillDeck();
		this.activePlayers = 0;
		for (var i = 0; i < this.numOfPlayers; ++i) {
			if (this.players[i] !== undefined) {
				this.activePlayers++;
				this.players[i].inGame = true;
				this.players[i].bet = 0;
				changePlayerBet(i, 0);
				hidePlayerCards(i);
				updateMoney(i , this.players[i].money);
				this.players[i].isFolded = false;
				this.players[i].skip = false;
				this.players[i].cards = new Array();
				this.players[i].cards[0] = this.deck.pop();
				this.players[i].cards[1] = this.deck.pop();
				console.log("sending cards to player " + i);
				chooseAction(i, "");
				// sends data to controller
				MCClient.sendData(savedRoomID, this.players[i].playerID, {action : "deal", cards : [[this.players[i].cards[0]],[this.players[i].cards[1]]]});
			}
		}
		clearMsgs(this);
		this.dealer = getNextPlayerPos(this.players, this.numOfPlayers, this.dealer, true);
		moveDealerChip(this.dealer);
		console.log("the dealer is player " + this.dealer);
		// sends data to controller
		MCClient.sendData(savedRoomID, this.players[this.dealer].playerID, {action : "dealer"});
		this.tableCards = new Array(5);
		this.tableCards[0] = this.deck.pop();
		this.tableCards[1] = this.deck.pop();
		this.tableCards[2] = this.deck.pop();
		this.tableCards[3] = this.deck.pop();
		this.tableCards[4] = this.deck.pop();
		showCard(0, "back");
		showCard(1, "back");
		showCard(2, "back");
		showCard(3, "back");
		showCard(4, "back");
		this.small = getNextPlayerPos(this.players, this.numOfPlayers, this.dealer, true);
		console.log("small is player " + this.small);
		this.big = getNextPlayerPos(this.players, this.numOfPlayers, this.small, true);
		console.log("big is player " + this.big);
		if (this.players[this.small].money > this.smallBlind) {
			this.players[this.small].money -= this.smallBlind;
			this.pot += this.smallBlind;
			this.players[this.small].bet += this.smallBlind;
		} else {
			this.pot += this.players[this.small].money;
			this.players[this.small].bet += this.players[this.small].money;
			this.players[this.small].money = 0;
			this.players[this.small].skip = true;
		}
		updateMoney(this.small , this.players[this.small].money);
		changePlayerBet(this.small, this.players[this.small].bet);
		// sends data to controller
		MCClient.sendData(savedRoomID, this.players[this.small].playerID, {action : "small", smallBlind : this.smallBlind});
		if (this.players[this.big].money > this.bigBlind) {
			this.players[this.big].money -= this.bigBlind;
			this.pot += this.bigBlind;
			this.players[this.big].bet += this.bigBlind;
		} else {
			this.pot += this.players[this.big].money;
			this.players[this.big].bet += this.players[this.big].money;
			this.players[this.big].money = 0;
			this.players[this.big].skip = true;
		}
		updateMoney(this.big , this.players[this.big].money);
		changePlayerBet(this.big, this.players[this.big].bet);
		// sends data to controller
		MCClient.sendData(savedRoomID, this.players[this.big].playerID, {action : "big", bigBlind : this.bigBlind});
		console.log("money in the pot: " + this.pot);
		changePot(this.pot);
		this.passAllPlayers = false;
		this.before = this.big;
		this.raise = this.bigBlind;
		this.next = getNextPlayerPos(this.players, this.numOfPlayers, this.big, true);
		console.log("the next player is player " + this.next);
		chooseTurn(this.next);
		this.nextPlayerID = this.players[this.next].playerID;
		this.lastBet = this.bigBlind;
		// sends data to controller
		MCClient.sendData(savedRoomID, this.nextPlayerID, {action : "turn", yourBet: this.players[this.next].bet, lastBet : this.lastBet, lastRaise : this.raise});
	} 
}

// This function waits for the next player to play and handles the action
Table.prototype.progress = function(playerID, playerMove, data) {
	console.log("player " + this.next + " is playing");
	if (this.nextPlayerID === playerID) {
		if (playerMove === "call") {
			console.log("player action: " + playerMove);
			if (!this.players[this.before].isFolded) {
				chooseAction(this.before, "");
			}
			var moneyToPay = this.lastBet - this.players[this.next].bet;			
			if (moneyToPay > this.players[this.next].money) {
				chooseAction(this.next, "All in!");
				this.players[this.next].bet += this.players[this.next].money;
				changePlayerBet(this.next, this.players[this.next].bet);
				this.pot += this.players[this.next].money;
				this.players[this.next].money = 0;
				updateMoney(this.next , 0);
				console.log("no money to call -> allIn");
			} else {
				chooseAction(this.next, "Call!");
				this.players[this.next].money -= moneyToPay;
				updateMoney(this.next , this.players[this.next].money);
				this.players[this.next].bet += moneyToPay;
				this.pot += moneyToPay;
				changePlayerBet(this.next, this.players[this.next].bet);
			}
			changePot(this.pot);
		} else if (playerMove === "raise") {
			console.log("player action: " + playerMove);
			if (!this.players[this.before].isFolded) {
				chooseAction(this.before, "");
			}
			chooseAction(this.next, "Raise: " + data + "!");
			this.raise = data;
			var moneyToPay;
			if (this.lastBet === 0) {
				moneyToPay = this.raise;
			} else {
				moneyToPay = this.lastBet - this.players[this.next].bet + this.raise;
			}
			this.pot += moneyToPay;
			changePot(this.pot);
			this.players[this.next].money -= moneyToPay;
			updateMoney(this.next , this.players[this.next].money);
			this.players[this.next].bet += moneyToPay;
			changePlayerBet(this.next, this.players[this.next].bet);
		} else if (playerMove === "fold") {
			console.log("player action: " + playerMove);
			if (!this.players[this.before].isFolded) {
				chooseAction(this.before, "");
			}
			chooseAction(this.next, "Fold!");
			this.players[this.next].isFolded = true;
			this.activePlayers--;
		} else if (playerMove === "allIn") {
			console.log("player action: " + playerMove);
			if (!this.players[this.before].isFolded) {
				chooseAction(this.before, "");
			}
			chooseAction(this.next, "All in!");
			if (this.raise < this.players[this.next].money) {
				this.raise = this.players[this.next].money;
			}
			this.players[this.next].bet += this.players[this.next].money;
			changePlayerBet(this.next, this.players[this.next].bet);
			this.pot += this.players[this.next].money;
			this.players[this.next].money = 0;
			updateMoney(this.next , this.players[this.next].money);
			changePot(this.pot);
		} else if (this.players[this.next].money === 0) {
			console.log("skipping player");
		} else {
			console.log("player action: " + playerMove);
			if (!this.players[this.before].isFolded) {
				chooseAction(this.before, "");
			}
			chooseAction(this.next, "Check!");
		}
		
		if (this.players[this.next].money === 0) {
			this.players[this.next].skip = true;
		}
		
		var beforeBet = this.lastBet;
		if (!this.players[this.next].isFolded) {
			if (this.lastBet < this.players[this.next].bet) {
				this.lastBet = this.players[this.next].bet;
			}
		}
		
		var seatAfterBig = getNextPlayerPos(this.players, this.numOfPlayers, this.big, true);
		if (this.roundNum === 1 && checkPassedAllPlayers(this.players, this.numOfPlayers, this.next, seatAfterBig)) {
			console.log("passed all players");
			this.passAllPlayers = true;
		} else if (this.roundNum != 1 && checkPassedAllPlayers(this.players, this.numOfPlayers, this.next, this.small)) {
			console.log("passed all players");
			this.passAllPlayers = true;
		}
		
		if (this.activePlayers === 1) {
			for (var i = 0; i < this.numOfPlayers; ++i) {
				if (this.players[i] !== undefined) {
					this.players[i].skip = false;
				}
			}
			var winnerPos = getNextPlayerPosNotFolded(this.players, this.numOfPlayers, 0, true);
			console.log("player " + winnerPos + " wins " + this.pot + "!");
			clearMsgs(this);
			chooseAction(winnerPos, "Winner!");
			this.players[winnerPos].money += this.pot;
			changePot(this.pot);
			// sends data to controller
			MCClient.sendData(savedRoomID, this.players[winnerPos].playerID, {action : "winner", money : this.pot});
			for (var i = 0; i < this.numOfPlayers; ++i) {
				if (this.players[i] !== undefined && i !== winnerPos && this.players[i].inGame) {
					// sends data to controller
					MCClient.sendData(savedRoomID, this.players[i].playerID, {action : "loser"});
					chooseAction(i, "Loser!");
				}
			}
			var tempTable = this;
			this.endRoundTimer = setTimeout(function() {
				tempTable.isGameStarted = false;
				$("#startGameBtn").show();
				kickPlayers(tempTable);
			}, 5000);
			return;
		}
		
		var skipCheck = false;
		if (this.passAllPlayers && checkAllPlayed(this)) {
			console.log("opening all cards!");
			if (this.roundNum === 1) {
				showCard(0, this.tableCards[0]);
				showCard(1, this.tableCards[1]);
				showCard(2, this.tableCards[2]);
				showCard(3, this.tableCards[3]);
				showCard(4, this.tableCards[4]);
			} else if (this.roundNum === 2) {
				showCard(3, this.tableCards[3]);
				showCard(4, this.tableCards[4]);
			} else if (this.roundNum === 3) {
				showCard(4, this.tableCards[4]);
			}
			this.roundNum = 4;
			skipCheck = true;
		}
		
		if (this.passAllPlayers) {
			if ((skipCheck) || (this.players[getNextPlayerPosNotFolded(this.players, this.numOfPlayers, this.next, true)].bet === this.lastBet)) {
				if (this.roundNum === 4) {
					console.log("game finished - checking who the winner is");
					
					var highestBet = 0;
					
					var numWithHighest = 0;
					for (var i = 0; i < this.numOfPlayers; ++i) {
						if (this.players[i] !== undefined && this.players[i].inGame) {
							if (this.players[i].bet > highestBet) {
								highestBet = this.players[i].bet;
								numWithHighest = 1;
							} else if (this.players[i].bet === highestBet) {
								numWithHighest++;
							}
						}
					}
					
					var beforeHighest = 0;
					for (var i = 0; i < this.numOfPlayers; ++i) {
						if (this.players[i] !== undefined && this.players[i].inGame) {
							if (this.players[i].bet < highestBet && this.players[i].bet > beforeHighest) {
								beforeHighest = this.players[i].bet;
							}
						}
					}
			
					if (numWithHighest === 1) {
						for (var i = 0; i < this.numOfPlayers; ++i) {
							if (this.players[i] !== undefined && this.players[i].inGame && this.players[i].bet === highestBet) {
								console.log("Player " + i + " gets " + (this.players[i].bet - beforeHighest) + " money back!");
								this.players[i].money += (this.players[i].bet - beforeHighest);
								this.pot -= (this.players[i].bet - beforeHighest);
								changePot(this.pot);
								this.players[i].bet -= (this.players[i].bet - beforeHighest);
								updateMoney(i , this.players[i].money);
								// sends data to controller
								MCClient.sendData(savedRoomID, this.players[i].playerID, {action : "buyIn", money : this.players[i].money});
								break;
							}
						}
					}
					
					var winnersResult = checkWinner(this);
					var winnersPos = new Array();
					for (var i = 0; this.pot > 0 && i < winnersResult.length; ++i) {
						var tempPos = 0;
						for (var j = 0; j < winnersResult[i].length; ++j) {
							var playerSeat = winnersResult[i][j].playerSeat;
							var moneyFromPot = 0;
							var playerBet = this.players[playerSeat].bet;
							for (var k = 0; k < this.numOfPlayers; ++k) {
								if (this.players[k] !== undefined && this.players[k].inGame && this.players[k].bet > 0) {
									if (this.players[k].bet <= playerBet) {
										moneyFromPot += this.players[k].bet;
										if (tempPos === winnersResult[i].length - 1) {
											this.players[k].bet = 0;
										}
									} else {
										moneyFromPot += playerBet;
										if (tempPos === winnersResult[i].length - 1) {
											this.players[k].bet -= playerBet;
										}
									}
								}
							}
							tempPos++;
							winnersPos.push(playerSeat);
							this.players[playerSeat].money += Math.round(moneyFromPot / winnersResult[i].length);
							updateMoney(playerSeat , this.players[playerSeat].money);
							console.log("player " + playerSeat + " wins " + Math.round(moneyFromPot / winnersResult[i].length) + "!");
							chooseAction(playerSeat, "Winner!");
							showPlayerCards(playerSeat, this.players[playerSeat].cards[0], this.players[playerSeat].cards[1]);
							this.pot -= Math.round(moneyFromPot / winnersResult[i].length);
							// sends data to controller
							MCClient.sendData(savedRoomID, this.players[playerSeat].playerID, {action : "winner", money : Math.round(moneyFromPot / winnersResult[i].length)});
						}		
						if (this.pot <= 0) {
							break;
						}						
					}
					
					for (var i = 0; i < this.numOfPlayers; ++i) {
						var isLoser = true;
						if (this.players[i] !== undefined  && this.players[i].inGame) {
							for (var j = 0; j < winnersPos.length; ++j) {
								if (i === winnersPos[j]) {
									isLoser = false;
									break;
								}
							}
							if (isLoser) {
								// sends data to controller
								MCClient.sendData(savedRoomID, this.players[i].playerID, {action : "loser"});
								console.log("player " + i + " lost!");
								chooseAction(i, "Loser!");
								if (!this.players[i].isFolded) {
									showPlayerCards(i, this.players[i].cards[0], this.players[i].cards[1]);
								}
							}
						}
					}
					var tempTable = this;
					this.endRoundTimer = setTimeout(function() {
						tempTable.isGameStarted = false;
						$("#startGameBtn").show();
						$("#startGameBtn").focus();
						kickPlayers(tempTable);
					}, 5000);
					return;
				} else if (this.roundNum === 2 || this.roundNum === 3){
					console.log("end of round " + this.roundNum);
					this.passAllPlayers = false;
					showCard(this.roundNum + 1, this.tableCards[this.roundNum + 1]);
					this.roundNum++;
					this.before = this.next;
					this.raise = this.bigBlind;
					this.next = this.small;
					if (this.players[this.next].isFolded) {
						this.next = getNextPlayerPosNotFolded(this.players, this.numOfPlayers, this.next, true);
					}
					console.log("the next player is player " + this.next);
					chooseTurn(this.next);
					this.nextPlayerID = this.players[this.next].playerID;
					// sends data to controller
					MCClient.sendData(savedRoomID, this.nextPlayerID, {action : "turn", yourBet: this.players[this.next].bet, lastBet : this.lastBet, lastRaise : this.raise});
					return;
				} else if (this.roundNum == 1) {
					console.log("end of round 1");
					this.passAllPlayers = false;
					this.roundNum++;
					this.before = this.next;
					this.raise = this.bigBlind;
					this.next = this.small;
					if (this.players[this.next].isFolded) {
						this.next = getNextPlayerPosNotFolded(this.players, this.numOfPlayers, this.next, true);
					}
					console.log("the next player is player " + this.next);
					chooseTurn(this.next);
					this.nextPlayerID = this.players[this.next].playerID;
					showCard(0, this.tableCards[0]);
					showCard(1, this.tableCards[1]);
					showCard(2, this.tableCards[2]);
					// sends data to controller
					MCClient.sendData(savedRoomID, this.nextPlayerID, {action : "turn", yourBet: this.players[this.next].bet, lastBet : this.lastBet, lastRaise : this.raise});
					return;
				}
			} 
		}
		this.before = this.next;
		this.next = getNextPlayerPosNotFolded(this.players, this.numOfPlayers, this.next, true);
		this.nextPlayerID = this.players[this.next].playerID;
		console.log("the next player is player " + this.next);
		chooseTurn(this.next);
		// sends data to controller
		MCClient.sendData(savedRoomID, this.nextPlayerID, {action : "turn", yourBet: this.players[this.next].bet, lastBet : this.lastBet, lastRaise : this.raise});
	}
}

// This function counts the number of players in the game
function numOfPlayersInGame(players){
	var num = 0; 
	for (var i = 0; i < this.numOfPlayers; ++i) {
		if (players[i] !== undefined) {
			num++;
		}
	}  
	return num;
}

// This function returns the next player that didn't fold
function getNextPlayerPosNotFolded(players, numOfPlayers, currPos, inGame) {
	var pos = currPos;
	do {
		pos = getNextPlayerPos(players, numOfPlayers, pos, inGame);
	} while (players[pos].isFolded || players[pos].skip);
	return pos;
}

// This function returns the next player to currPos that is inGame
function getNextPlayerPos(players, numOfPlayers, currPos, inGame) {
	while (true) {
		currPos++;
		if (currPos < numOfPlayers && players[currPos] !== undefined) {
			if (inGame && !players[currPos].inGame) {
				continue;
			}
			break;
		} else if (currPos === numOfPlayers) {
			currPos = -1;
		}
	}
	return currPos;
}

// This function returns an array with result for each player that contains - hand rank, hand type, 
// hand seat number and best hand cards
function checkWinner(table) {
	var bestResults = new Array();
	for (var i = 0; i < table.numOfPlayers; ++i) {
		if (table.players[i] !== undefined && !table.players[i].isFolded && table.players[i].inGame) {
			var hand = new Array(7);
			hand[0] = table.tableCards[0];
			hand[1] = table.tableCards[1];
			hand[2] = table.tableCards[2];
			hand[3] = table.tableCards[3];
			hand[4] = table.tableCards[4];
			hand[5] = table.players[i].cards[0];
			hand[6] = table.players[i].cards[1];
			var result = getBestRankAndHand(hand);
			result.playerSeat = i;
			changeCardsText(i, result.message);
			bestResults.push(result);
		}
	}
	var sortedResults = bubbleSortResults(bestResults);
	var ResultArrays = resultToArray(sortedResults);
	for (var i = 0; i < ResultArrays.length; ++i) {
		ResultArrays[i] = bubbleSortBets(ResultArrays[i]);
	}
	return ResultArrays;
}

// This function sorts the results in arrays in DESC order
function bubbleSortResults(results) {
    var swapped;
    do {
        swapped = false;
        for (var i=0; i < results.length-1; i++) {
            if (results[i].rank < results[i+1].rank) {
                var temp = results[i];
                results[i] = results[i+1];
                results[i+1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
	return results;
}

// This function sorts the bets in ASC order
function bubbleSortBets(bets) {
    var swapped;
    do {
        swapped = false;
        for (var i=0; i < bets.length-1; i++) {
            if (bets[i] > bets[i+1]) {
                var temp = bets[i];
                bets[i] = bets[i+1];
                bets[i+1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
	return bets;
}
// This function orders the results in DESC order
function resultToArray(results) {
	var resultsToArray = new Array();
	var pos = 0;
	for (var i = 0; i < results.length; ++i) {
		if (resultsToArray[pos] === undefined) {
			resultsToArray[pos] = new Array();
			resultsToArray[pos].push(results[i]);
		} else if (resultsToArray[pos][0].rank > results[i].rank) {
			++pos;
			resultsToArray[pos] = new Array();
			resultsToArray[pos].push(results[i]);
		} else {
			resultsToArray[pos].push(results[i]);
		}
	}
	return resultsToArray;
}

// This function kicks all the players that has no money at the end of each game
function kickPlayers(table) {
	for (var i = 0; i < table.numOfPlayers; ++i) {
		if (table.players[i] !== undefined && table.players[i].money <= 0) {
			table.removePlayer(table.players[i].playerID, i);
		}
	}
}

// This function clears all the players action msgs from the screen
function clearMsgs(table) {
	for (var i = 0; i < table.numOfPlayers; ++i) {
		chooseAction(i, "");
		changeCardsText(i, "");
	}
}

// This function counts how many players are in the game, didn't fold and still has money
function checkAllPlayed(table) {
	var count = 0;
	var countCanStullPlay = 0;
	for (var i = 0; i < table.numOfPlayers; ++i) {
		if (table.players[i] !== undefined && table.players[i].inGame && !table.players[i].isFolded && table.players[i].money > 0) {
			countCanStullPlay++;
			if (table.players[i].bet < table.lastBet) {
				count++;
			}
		}
	}
	if (countCanStullPlay >= 2) {
		return false;
	} else if (count === 0) {
		return true;
	}
	return false;
}

// check if passed all players
function checkPassedAllPlayers(players, numOfPlayers, currPos, finishingSeat) {
	var pos = currPos;
	while (true) {
		pos = getNextPlayerPos(players, numOfPlayers, pos, true);
		if (pos === finishingSeat) {
			return true;
		} else if (!players[pos].isFolded && !players[pos].skip) {
			return false;
		}
	}
}