class NotImplemented extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);
        this.message = message;
    }
}

class GameRulesViolation extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);
        this.message = message;
    }
}

class AbstractMethod extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);
        this.message = message;
    }
}

/**Shuffles array in-place using the Fisher-Yates algorithm
 * @returns {undefined} nothing, as the array is shuffled in-place */
function shuffleArrayInPlace(array) {
    let r, x, i;
    for (i = array.length - 1; i > 0; i --) {
        r = Math.floor(Math.random() * (i + 1));
        x = array[i];
        array[i] = array[r];
        array[r] = x;
    }
}

const WINNER_UTILITY_VALUE = 5000;
const IMPOSSIBLE_HEURISTIC_THRESHOLD = 1000;

class Player {
    constructor(playerId, isHuman, isMaximizing) {
        this.playerId = playerId;
        this.isHuman = isHuman;
        this.isMaximizing = isMaximizing;
    }

    equals(other) {
        if (other instanceof Player 
            && other.playerId == this.playerId) {
            return true;
        }
        return false;
    }

    toString() {
        let maxStr = "max";
        let humanStr = "human";
        if (! this.isMaximizing) {
            maxStr = "min";
        }
        if (! this.isHuman) {
            humanStr = "CPU";
        }
        return `P(${this.playerId}, ${maxStr}, ${humanStr})`;
    }
}

class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    copy() {
        return new Position(this.x, this.y);
    }

    equals(other) {
        if (other instanceof Position 
            && other.x == this.x 
            && other.y == this.y) {
            return true;
        }
        return false;
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

class Matroska {

    /**@param owner - the Player who owns this
     * @param size - integer representing the size of this
     * @param position - the Position of this, 
     * may be null if this Matroska is not placed yet*/
    constructor(owner, size, position) {
        this.owner = owner;
        if (size > 2 || size < 0) {
            throw new GameRulesViolation(`Invalid size of ${size} for matroska`);
        }
        this.size = size;
        this.position = position;
    }

    equals(other) {
        if (other instanceof Matroska 
            && other.owner.equals(this.owner) 
            && other.size == this.size) {
            return true;
        }
        return false;
    }

    toString() {
        return `M(${this.owner}, ${this.size}, ${this.position})`;
    }
}

class Board {

    constructor() {
        this.maxPlayerOutsideFigures = [[], [], []];
        this.minPlayerOutsideFigures = [[], [], []];

        this.threeDBoard = [[[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]]];
    }

    /**@returns {Board} new instance of empty board with correct number of figures for
     * both players */
    static createStartingBoard(maxPlayer, minPlayer) {
        const b = new Board();
        b.addMatroska(new Matroska(maxPlayer, 0, null));
        b.addMatroska(new Matroska(maxPlayer, 0, null));
        b.addMatroska(new Matroska(maxPlayer, 1, null));
        b.addMatroska(new Matroska(maxPlayer, 1, null));
        b.addMatroska(new Matroska(maxPlayer, 2, null));
        b.addMatroska(new Matroska(maxPlayer, 2, null));
        b.addMatroska(new Matroska(minPlayer, 0, null));
        b.addMatroska(new Matroska(minPlayer, 0, null));
        b.addMatroska(new Matroska(minPlayer, 1, null));
        b.addMatroska(new Matroska(minPlayer, 1, null));
        b.addMatroska(new Matroska(minPlayer, 2, null));
        b.addMatroska(new Matroska(minPlayer, 2, null));
        return b;
    }

    /**@returns true if position is not null and is inside the board */
    contains(position) {
        if (position === null) {
            return false;
        }
        if (position.x >= 0 && position.x <= 2 
            && position.y >= 0 && position.y <= 2) {
            return true;
        }
        return false;
    }

    /**@param matroska - the Matroska to be added 
     * @throws GameRulesViolation - if `matroska` can not be added*/
    addMatroska(matroska) {
        const position = matroska.position;
        const player = matroska.owner;
        if (position === null) {
            if (player.isMaximizing) {
                if (this.maxPlayerOutsideFigures[matroska.size].length >= 2) {
                    throw new GameRulesViolation("more than 2 matroskas of same size");
                } else {
                    this.maxPlayerOutsideFigures[matroska.size].push(matroska);
                }
                return;
            } else {
                if (this.minPlayerOutsideFigures[matroska.size].length >= 2) {
                    throw new GameRulesViolation("more than 2 matroskas of same size");
                } else {
                    this.minPlayerOutsideFigures[matroska.size].push(matroska);
                }
                return;
            }
        } else {
            if (this.contains(position)) {
                const top = this.topAt(position);
                if (top === null || top.size < matroska.size) {
                    this.threeDBoard[position.y][position.x][matroska.size] = matroska;
                } else {
                    throw new GameRulesViolation(`Position ${position} occupied with ${top}`);
                }
            } else {
                throw new GameRulesViolation(`Position ${position} out of board's range`)
            }
        }
    }

    /**@param matroska - remove Matroska
     * @throws GameRulesViolation - if `matroska` can not be removed
    */
    removeMatroska(matroska) {
        const position = matroska.position;
        const player = matroska.owner;

        if (position === null) {
            if (player.isMaximizing) {
                if (this.maxPlayerOutsideFigures[matroska.size].length > 0) {
                    this.maxPlayerOutsideFigures[matroska.size].pop();
                    return;
                } else {
                    throw new GameRulesViolation(`No matroska ${matroska} found outside the board`);
                }
            } else {
                if (this.minPlayerOutsideFigures[matroska.size]) {
                    this.minPlayerOutsideFigures[matroska.size].pop();
                    return;
                } else {
                    throw new GameRulesViolation(`No matroska ${matroska} found outside the board`);
                }
            }
        } else {
            if (this.contains(position)) {
                const top = this.topAt(position);
                if (matroska.equals(top)) {
                    this.removeTop(position);
                } else {
                    throw new GameRulesViolation(`Matroska ${matroska} could not be removed from ${position}`);
                }
            } else {
                throw new GameRulesViolation(`Position ${position} out of board's range`)
            }
        }
    }

    /**@param position - a Position from which to remove the top-most matroska
     * @returns true if a matroska was removed, false if there were no matroskas at this position */
    removeTop(position) {
        const figures = this.threeDBoard[position.y][position.x];
        for (let i = 2; i >= 0; i --) {
            if (figures[i] !== null) {
                figures[i] = null;
                return true;
            }
        }
        return false;
    }

    /**@returns array of figures at `position` */
    at(position) {
        return this.threeDBoard[position.y][position.x];
    }

    /**@returns a the top most Matroska or null if there are no figures at this `position` */
    topAt(position) {
        const figures = this.at(position);

        for (let i = 2; i >= 0; i --) {
            if (figures[i] !== null) {
                return figures[i];
            }
        }
        return null;
    }

    /**@param maxPlayer - the maximizing player
     * @param minPlayer - the minimizing player 
     * @returns a Player (maxPlayer of minPlayer) who won the game 
     * or null, if no such player exists */
    getWinner(maxPlayer, minPlayer) {
        // check rows
        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            let maxPlayerScore = 0;
            let minPlayerScore = 0;
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                const top = this.topAt(new Position(colIndex, rowIndex));
                if (top === null) {
                    break;
                } else if (maxPlayer.equals(top.owner)) {
                    maxPlayerScore += 1;
                } else {
                    minPlayerScore += 1;
                }
            }
            if (maxPlayerScore == 3) {
                return maxPlayer;
            } else if (minPlayerScore == 3) {
                return minPlayer;
            }
        }
        // check columns
        for (let colIndex = 0; colIndex < 3; colIndex ++) {
            let maxPlayerScore = 0;
            let minPlayerScore = 0;
            for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
                const top = this.topAt(new Position(colIndex, rowIndex));
                if (top === null) {
                    break;
                } else if (maxPlayer.equals(top.owner)) {
                    maxPlayerScore += 1;
                } else {
                    minPlayerScore += 1;
                }
            }
            if (maxPlayerScore == 3) {
                return maxPlayer;
            } else if (minPlayerScore == 3) {
                return minPlayer;
            }
        }
        // check decreasing diagonal
        let maxPlayerScore = 0;
        let minPlayerScore = 0;
        for (let i = 0; i < 3; i ++) {
            const top = this.topAt(new Position(i, i));
            if (top === null) {
                break;
            } else if (maxPlayer.equals(top.owner)) {
                maxPlayerScore += 1;
            } else {
                minPlayerScore += 1;
            }
        }
        if (maxPlayerScore == 3) {
            return maxPlayer;
        } else if (minPlayerScore == 3) {
            return minPlayer;
        }
        // check increasing diagonal
        maxPlayerScore = 0;
        minPlayerScore = 0;
        for (let i = 0; i < 3; i ++) {
            const top = this.topAt(new Position(i, 2 - i));
            if (top === null) {
                break;
            } else if (maxPlayer.equals(top.owner)) {
                maxPlayerScore += 1;
            } else {
                minPlayerScore += 1;
            }
        }
        if (maxPlayerScore == 3) {
            return maxPlayer;
        } else if (minPlayerScore == 3) {
            return minPlayer;
        }

        return null;
    }

    /**@param player - the owner (Player) of figures to move
     * @returns array of Matroskas which can be moved by `player`*/
    getMovementAvailableFigures(player) {
        let availableFigures = [];

        if (player.isMaximizing) {
            availableFigures = this.maxPlayerOutsideFigures.flat(Infinity);
        } else {
            availableFigures = this.minPlayerOutsideFigures.flat(Infinity);
        }
        
        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                const position = new Position(colIndex, rowIndex);
                const top = this.topAt(position);
                if (top !== null) {
                    if (top.owner.equals(player)) {
                        availableFigures.push(top);
                    }
                }
            }
        }

        return availableFigures;
    }

    /**@param matroska - the source Matroska which wants to be moved
     * @returns array of Positions to which the `matroska` can be placed
     */
    getPossiblePlacementDestinations(matroska) {
        const possiblePositions = [];
        const sourcePosition = matroska.position;

        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                const position = new Position(colIndex, rowIndex);

                if (! position.equals(sourcePosition)) {
                    const top = this.topAt(position);

                    if (top !== null) {
                        if (top.size < matroska.size) {
                            possiblePositions.push(position);
                        }
                    } else {
                        possiblePositions.push(position);
                    }
                }
            }
        }

        return possiblePositions;
    }

    /**Deep copies the board
     * @returns new Board with the same contents of this board*/
    copy() {
        const newBoard = new Board();
        for (let i = 0; i < 3; i ++) {
            newBoard.maxPlayerOutsideFigures[i] = Array.from(this.maxPlayerOutsideFigures[i]); 
            newBoard.minPlayerOutsideFigures[i] = Array.from(this.minPlayerOutsideFigures[i]); 
        }
        
        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                for (let sizeIndex = 0; sizeIndex < 3; sizeIndex ++) {
                    newBoard.threeDBoard[rowIndex][colIndex][sizeIndex] = 
                    this.threeDBoard[rowIndex][colIndex][sizeIndex];
                }
            }
        }
        return newBoard;
    }

    toString() {
        const maxPlayerOutsideFigures = this.maxPlayerOutsideFigures.flat(Infinity);
        const minPlayerOutsideFigures = this.minPlayerOutsideFigures.flat(Infinity);

        let out = "===Board===\n";
        out += `max player outside figures: ${maxPlayerOutsideFigures}\n`;
        out += `min player outside figures: ${minPlayerOutsideFigures}\n`;

        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                const top = this.topAt(new Position(colIndex, rowIndex));
                if (top !== null) {
                    out += `${top}  `;
                } else {
                    out += "null  "
                }
            }
            out += "\n"
        }
        return out;
    }
}

class AbstractAction {

    constructor(player) {
        this.player;
    }

    /** Generates new GameState from current GameState.
     * @param gameState - current Gamestate
     * @returns new GameState with applied action
     * @throws GameRuleViolation if the action is not applicable*/
    applyAction(gameState) {
        throw new AbstractMethod();
    }
}

/**Move action removes sourceMatroska and adds targetMatroska to the board */
class MoveAction extends AbstractAction {

    /**@param {Player} player - the Player who executes this action 
     * @param {Matroska} sourceMatroska - the Matroska which is being moved
     * @param {Position} destination - the destination Position to which the `matroska` is moved
     */
    constructor(player, sourceMatroska, destination) {
        super(player);
        this.sourceMatroska = sourceMatroska;
        this.destination = destination;
    }

    applyAction(gameState) {
        const oldBoard = gameState.board;
        const newBoard = oldBoard.copy();
        newBoard.removeMatroska(this.sourceMatroska);

        if (oldBoard.getWinner(gameState.maxPlayer, gameState.minPlayer) === null 
            && newBoard.getWinner(gameState.maxPlayer, gameState.minPlayer) != null) {
            // in between the placements of figure, the other player has won
            const playerForNextTurn = gameState.getPlayerForNextTurn();
            newBoard.addMatroska(new Matroska(
                this.sourceMatroska.owner,this.sourceMatroska.size, null));    
            return new GameState(
                newBoard, gameState.maxPlayer, gameState.minPlayer, playerForNextTurn);
        }

        newBoard.addMatroska(new Matroska(
            this.sourceMatroska.owner,this.sourceMatroska.size, this.destination));

        const playerForNextTurn = gameState.getPlayerForNextTurn();
        return new GameState(
            newBoard, gameState.maxPlayer, gameState.minPlayer, playerForNextTurn);
    }

    equals(other) {
        if (! (other instanceof MoveAction)) {
            return false;
        }

        if (other.destination === null) {
            if (this.destination === null) {
                return true;
            }
            return false;
        } else {
            if (other.destination.equals(this.destination) 
            && other.sourceMatroska.equals(this.sourceMatroska)) {
                return true;
            }
            return false;
        }
    }
}

class Heuristics {

    static calculate(board) {
        return Heuristics.simpleHeuristic(board);
    }


    /**@param {Board} board
     * @param {Matroska} matroska
     * @returns {number} a number of figures right next to this `matroska` */
    static numberOfAdjacentTeamFigures(board, matroska) {
        const owner = matroska.owner;
        const position = matroska.position;

        const adjacentPositions = [
            new Position(position.x, position.y - 1),
            new Position(position.x, position.y + 1),
            new Position(position.x + 1, position.y),
            new Position(position.x - 1, position.y),
            new Position(position.x, position.y - 2),
            new Position(position.x, position.y + 2),
            new Position(position.x + 2, position.y),
            new Position(position.x - 2, position.y),
            new Position(position.x + 1, position.y + 1),
            new Position(position.x + 1, position.y - 1),
            new Position(position.x - 1, position.y + 1),
            new Position(position.x - 1, position.y - 1),
            new Position(position.x + 2, position.y + 2),
            new Position(position.x + 2, position.y - 2),
            new Position(position.x - 2, position.y + 2),
            new Position(position.x - 2, position.y - 2)
        ];

        let numberOfAdjacents = 0;

        for (const adjacentPosition of adjacentPositions) {
            if (board.contains(adjacentPosition)) {
                const top = board.topAt(adjacentPosition);
                if (top != null && top.owner.equals(owner)) {
                    numberOfAdjacents += 1;
                }
            }
        }

        return numberOfAdjacents;
    }

    /**Adds some utility for each top-matroska depending on the
     * strategic value of a position*/
    static simpleHeuristic(board) {
        const middle = new Position(1, 1);
        const top = new Position(1, 0);
        const bottom = new Position(1, 2);
        const left = new Position(0, 1);
        const right = new Position(2, 1);
        const topLeft = new Position(0, 0);
        const topRight = new Position(2, 0);
        const bottomLeft = new Position(0, 2);
        const bottomRight = new Position(2, 2);

        const good = {value: 2,
            positions: [left, right, top, bottom]};
        const great = {value: 3,
            positions: [topLeft, topRight, bottomLeft, bottomRight]};
        const awesome = {value: 4,
            positions: [middle]};

        const all = [good, great, awesome];

        let utility = 0;

        for (const object of all) {
            for (const position of object.positions) {
                const top = board.topAt(position);
                if (top !== null) {
                    const adjacents = this.numberOfAdjacentTeamFigures(board, top);
                    if (top.owner.isMaximizing) {
                        utility += object.value;
                        utility += adjacents;
                    } else {
                        utility -= object.value;
                        utility -= adjacents;
                    }
                }
            }
        }
        return utility;
    }
}

class GameState {

    constructor(board, maxPlayer, minPlayer, playerOnTurn) {
        this.board = board;
        this.maxPlayer = maxPlayer;
        this.minPlayer = minPlayer;
        this.playerOnTurn = playerOnTurn;
        this.dynamicWinner = false;
        this.winner = null;
    }

    /**@returns {array of AbstractAction} array of all possible actions from this state */
    getPossibleActions() {
        const actions = [];

        const availableFigures = this.board.getMovementAvailableFigures(this.playerOnTurn);
        
        for (const matroska of availableFigures) {
            const destinations = this.board.getPossiblePlacementDestinations(matroska);

            for (const position of destinations) {
                actions.push(new MoveAction(this.playerOnTurn, matroska, position));
            }
        }

        // do random shuffle so the order of action is not the same every time
        shuffleArrayInPlace(actions);
        return actions;
    }

    /**Dynamic check for winning scenarios at board
     * @returns true if there is some winner*/
    isTerminal() {
        if (! this.dynamicWinner) {
            this.winner = this.board.getWinner(this.maxPlayer, this.minPlayer);
        }

        if (this.winner !== null) {
            return true;
        }
        return false;
    }

    /**@returns a positive or negative number coresponding to this node's utility */
    utility() {
        if (this.isTerminal()) {
            if (this.winner == this.maxPlayer) {
                // maxPalyer wins
                return WINNER_UTILITY_VALUE;
            } else {
                // minPlayer wins
                return - WINNER_UTILITY_VALUE;
            }
        } else {
            return Heuristics.calculate(this.board);
        }
    }

    getPlayerOnTurn() {
        return this.playerOnTurn;
    }

    getPlayerForNextTurn() {
        if (this.playerOnTurn.equals(this.maxPlayer)) {
            return this.minPlayer;
        } else {
            return this.maxPlayer;
        }
    }

    print() {
        let out = "";
        for (let rowIndex = 0; rowIndex < 3; rowIndex ++) {
            for (let colIndex = 0; colIndex < 3; colIndex ++) {
                const top = this.board.topAt(new Position(colIndex, rowIndex));
                if (top !== null) {
                    if (top.owner.equals(this.maxPlayer)) {
                        out += "X" + top.size; 
                    } else {
                        out += "O" + top.size;
                    }
                } else {
                    out += "--";
                }
                out += " ";
            }
            out += "\n";
        }
        return out;
    }
}

class MiniMaxOutcome {
    constructor() {
        this.bestPossibleAction = null;
        this.noAlphaBetaPrunes = 0;
        this.noTerminalStates = 0;
        this.noDepthCutoffStates = 0;
        this.noAllGameNodesSearched = 0;
        this.noKillerMovesSet = 0;
    }

    setBestAction(action) {
        this.bestPossibleAction = action;
    }


}

class KillerMoves {

    /**Keeps two killer moves in memory. */
    constructor() {
        this.firstMove = null;
        this.secondMove = null;
    }

    /**@param {MoveAction} action - an action which caused a cutoff and is considered
     * a killer move
     * @returns true if this action was not already in killer moves*/
    setKillerMove(action) {
        if (action.equals(this.firstMove) || action.equals(this.secondMove)) {
            return false;
        } else {
            this.secondMove = this.firstMove;
            this.firstMove = action;
            return true;
        }
    }

    /**@returns {Array of MoveAction} array of actions which has up to 2 items */
    getKillerMoves() {
        const actions = [];
        if (this.firstMove !== null) {
            actions.push(this.firstMove);
        }

        if (this.secondMove !== null) {
            actions.push(this.secondMove);
        }
        return actions;
    }

}

function alphaBeta(gameState, depth, alpha, beta, outcome, selectAction, killerMoves) {
    outcome.noAllGameNodesSearched += 1;

    if (depth == 0) {
        // maximum depth cutoff
        if (gameState.isTerminal()) {
            outcome.noTerminalStates += 1;
        } else {
            outcome.noDepthCutoffStates += 1;
        }
        return gameState.utility();
    } else if (gameState.isTerminal()) {
        outcome.noTerminalStates += 1;
        return gameState.utility();
    }

    if (gameState.getPlayerOnTurn().isMaximizing) {
        let value = - Infinity;

        const possibleActions = killerMoves[depth].getKillerMoves()
            .concat(gameState.getPossibleActions());
        for (const action of possibleActions) {
            let nextGameState;
            try {
                nextGameState = action.applyAction(gameState);
            } catch (error) {
                continue;
            }

            let valueOfChild = alphaBeta(nextGameState, depth - 1, alpha, beta, outcome, false, killerMoves);
            
            if (valueOfChild > IMPOSSIBLE_HEURISTIC_THRESHOLD) {
                valueOfChild = valueOfChild - 1;
            }
            
            if (valueOfChild > value) {
                value = valueOfChild;
                if (selectAction) {
                    outcome.setBestAction(action);
                }
            }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) {
                // cutoff the rest of the branches
                if (killerMoves[depth].setKillerMove(action)) {
                    outcome.noKillerMovesSet += 1;
                }
                outcome.noAlphaBetaPrunes += 1;
                break;
            }
        }
        return value;
    } else {
        let value = Infinity;
        const possibleActions = killerMoves[depth].getKillerMoves()
            .concat(gameState.getPossibleActions());
        for (const action of possibleActions) {
            let nextGameState;
            try {
                nextGameState = action.applyAction(gameState);
            } catch (error) {
                continue;
            }
            let valueOfChild = alphaBeta(nextGameState, depth - 1, alpha, beta, outcome, false, killerMoves);
            
            if (valueOfChild < (- IMPOSSIBLE_HEURISTIC_THRESHOLD)) {
                valueOfChild = valueOfChild + 1;
            }

            if (valueOfChild < value) {
                value = valueOfChild;
                if (selectAction) {
                    outcome.setBestAction(action);
                }
            }
            beta = Math.min(beta, value);
            if (alpha >= beta) {
                // cutoff the rest of the branches
                if (killerMoves[depth].setKillerMove(action)) {
                    outcome.noKillerMovesSet += 1;
                }
                outcome.noAlphaBetaPrunes += 1;
                break;
            }
        }
        return value;
    }
}

//
//  ASSERTIONS
//

class AssertionError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);
        this.message = message;
    }
}

function assertTrue(x) {
    if (! x) throw new AssertionError();
}

function assertEquals(actual, expected) {
    if (actual != expected) {
        throw new AssertionError(`Got ${actual}, but expected ${expected}`)
    };
}

function assertEqualsWithEquals(actual, expected) {
    if (! actual.equals(expected)) {
        throw new AssertionError(`Got ${actual}, but expected ${expected}`)
    };
}

function assertNull(x) {
    if (x !== null) throw new AssertionError();
}

function assertThrows(executionFunction, exceptionClass) {
    try {
        executionFunction();

    } catch (e) {

        console.log(e);

        if (! (e instanceof exceptionClass)) {
            throw new AssertionError(`Exception other than expected ${exceptionClass} was thrown`);
        } else {
            return;
        }
    }
    throw new AssertionError("No exception was thrown");
}


function testBoard() {
    const p1 = new Player(0, true, true);
    const p2 = new Player(1, false, false);

    const middle = new Position(1, 1);
    const top = new Position(1, 0);
    const bottom = new Position(1, 2);
    const left = new Position(0, 1);
    const right = new Position(2, 1);

    const b = new Board();
    
    b.addMatroska(new Matroska(p1, 1, null));
    b.addMatroska(new Matroska(p1, 1, null));
    assertThrows(() => {b.addMatroska(new Matroska(p1, 1, null));}, GameRulesViolation);
    console.log(`${b}`);

    // overlapping figures
    b.removeMatroska(new Matroska(p1, 1, null));
    b.addMatroska(new Matroska(p1, 1, null));
    console.log(`${b}`);

    assertThrows(() => {b.removeMatroska(new Matroska(p1, 1, new Position(1, 1)))}, GameRulesViolation);

    b.addMatroska(new Matroska(p1, 1, middle));
    b.addMatroska(new Matroska(p1, 2, middle));
    console.log(`${b}`);
    assertThrows(() => {b.removeMatroska(new Matroska(p1, 1, middle))}, GameRulesViolation);
    b.removeMatroska(new Matroska(p1, 2, middle));

    // invalid board positions
    assertThrows(() => {b.addMatroska(new Matroska(p1, 0, new Position(0, 3)))}, GameRulesViolation);
    assertThrows(() => {b.addMatroska(new Matroska(p1, 0, new Position(-1, 2)))}, GameRulesViolation);
    assertThrows(() => {b.addMatroska(new Matroska(p1, 0, new Position(0, 4)))}, GameRulesViolation);
    assertThrows(() => {b.addMatroska(new Matroska(p1, 0, new Position(3, 3)))}, GameRulesViolation);

    // deep copying
    const b1 = new Board();
    b1.addMatroska(new Matroska(p1, 0, null));
    b1.addMatroska(new Matroska(p2, 1, null));
    b1.addMatroska(new Matroska(p1, 0, middle));
    b1.addMatroska(new Matroska(p2, 1, middle));
    b1.addMatroska(new Matroska(p1, 2, top));
    console.log(`${b1}`);
    const b2 = b1.copy();
    console.log(`${b2}`);
    b2.removeMatroska(new Matroska(p2, 1, middle));
    console.log(`${b1}`);
    console.log(`${b2}`);

    // wins
    const b3 = new Board();
    b3.addMatroska(new Matroska(p1, 0, middle));
    b3.addMatroska(new Matroska(p1, 0, top));
    b3.addMatroska(new Matroska(p1, 1, bottom));
    console.log(`${b3}`);
    assertEquals(b3.getWinner(p1, p2), p1);

    b3.addMatroska(new Matroska(p2, 1, middle));
    b3.addMatroska(new Matroska(p2, 2, top));
    console.log(`${b3}`);
    assertNull(b3.getWinner(p1, p2));

    b3.addMatroska(new Matroska(p1, 1, left));
    b3.addMatroska(new Matroska(p1, 2, right));
    console.log(`${b3}`);
    assertNull(b3.getWinner(p1, p2));

    b3.addMatroska(new Matroska(p1, 2, middle));
    assertEquals(b3.getWinner(p1, p2), p1);
    
    const b4 = new Board();
    b4.addMatroska(new Matroska(p2, 0, middle));
    b4.addMatroska(new Matroska(p2, 0, new Position(0, 0)));
    b4.addMatroska(new Matroska(p2, 1, new Position(2, 2)));
    console.log(`${b4}`);
    assertEquals(b4.getWinner(p1, p2), p2);

    b4.addMatroska(new Matroska(p1, 2, new Position(2, 2)));
    assertNull(b4.getWinner(p1, p2));
    b4.addMatroska(new Matroska(p1, 0, right));
    b4.addMatroska(new Matroska(p1, 0, new Position(2, 0)));
    assertEquals(b4.getWinner(p1, p2), p1);
}
// testBoard();

function testHeuristics() {
    const p1 = new Player(0, true, true);
    const p2 = new Player(1, false, false);

    const b = new Board();
    b.addMatroska(new Matroska(p1, 1, null));
    b.addMatroska(new Matroska(p1, 1, null));
    assertEquals(Heuristics.simpleHeuristic(b), 0);

    b.addMatroska(new Matroska(p1, 0, new Position(0, 0)));
    assertEquals(Heuristics.simpleHeuristic(b), 3);
    b.addMatroska(new Matroska(p2, 0, new Position(1, 1)));
    assertEquals(Heuristics.simpleHeuristic(b), -1);
    b.addMatroska(new Matroska(p1, 2, new Position(1, 1)));
    assertEquals(Heuristics.simpleHeuristic(b), 7)
}
// testHeuristics();

function testGameState() {
    const p1 = new Player(0, true, true);
    const p2 = new Player(1, false, false);

    const b1 = new Board();
    b1.addMatroska(new Matroska(p1, 0, null));
    b1.addMatroska(new Matroska(p1, 2, null));
    const s1 = new GameState(b1, p1, p2, p1);
    assertEquals(s1.getPossibleActions().length, 18);
    b1.addMatroska(new Matroska(p1, 1, new Position(0, 0)));
    b1.addMatroska(new Matroska(p1, 2, new Position(1, 1)));
    assertEquals(s1.getPossibleActions().length, 30);
    assertEquals(s1.utility(), 7)
    assertTrue(! s1.isTerminal())

    a1 = new MoveAction(p1, new Matroska(p1, 0, null), new Position(1, 1));
    assertThrows(() => {a1.applyAction(s1)}, GameRulesViolation);

    a2 = new MoveAction(p1, new Matroska(p1, 0, null), new Position(2, 2));
    s2 = a2.applyAction(s1);
    assertEquals(s2.utility(), Infinity);
    assertTrue(s2.isTerminal());
}
// testGameState();


function testMiniMax() {
    const p1 = new Player(0, true, true);
    const p2 = new Player(1, false, false);

    const b = new Board();
    b.addMatroska(new Matroska(p1, 0, null));
    b.addMatroska(new Matroska(p1, 0, null));
    b.addMatroska(new Matroska(p1, 1, null));
    b.addMatroska(new Matroska(p1, 1, null));
    b.addMatroska(new Matroska(p1, 2, null));
    b.addMatroska(new Matroska(p1, 2, null));
    b.addMatroska(new Matroska(p2, 0, null));
    b.addMatroska(new Matroska(p2, 0, null));
    b.addMatroska(new Matroska(p2, 1, null));
    b.addMatroska(new Matroska(p2, 1, null));
    b.addMatroska(new Matroska(p2, 2, null));
    b.addMatroska(new Matroska(p2, 2, null));

    const o1 = new MiniMaxOutcome();

    const s1 = new GameState(b, p1, p2, p1);
    
    const s2 = new MoveAction(
        p1, new Matroska(p1, 0, null), new Position(1, 1)).applyAction(s1);
    
    const s3 = new MoveAction(
        p2, new Matroska(p2, 0, null), new Position(0, 0)).applyAction(s2);
    
    const s4 = new MoveAction(
        p1, new Matroska(p1, 0, null), new Position(0, 1)).applyAction(s3);
    
    const s5 = new MoveAction(
        p2, new Matroska(p2, 0, null), new Position(2, 1)).applyAction(s4);
    console.log(s5.board.toString());
    
    const o2 = new MiniMaxOutcome();
    const killerMoves = [new KillerMoves(), new KillerMoves()];
    alphaBeta(s5, 1, -Infinity, Infinity, o2, true, killerMoves);
    console.log(o2);
    a2 = o2.bestPossibleAction;
    assertEqualsWithEquals(a2.destination, new Position(2, 1));
    console.log(s5.print())
}
// testMiniMax();
