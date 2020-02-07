
class InterfaceError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);
        this.message = message;
    }
}

class TheGame {

    constructor(maxPlayer, minPlayer, cpuDepthMax, cpuDepthMin) {
        this.historyOfGameStates = [];
        this.maxPlayer = maxPlayer;
        this.minPlayer = minPlayer;
        this.gameState = new GameState(
            Board.createStartingBoard(this.maxPlayer, this.minPlayer),
            this.maxPlayer,
            this.minPlayer,
            this.maxPlayer
        );

        this.lastSelectedMatroska = null;
        this.lastSelectedDestination = null;
        this.cpuDepthMax = cpuDepthMax;
        this.cpuDepthMin = cpuDepthMin;

        console.log(this);

        this.doPostTurn();
    }

    translate(matroska, destination) {
        let teamString;
        if (matroska.owner.isMaximizing) {
            teamString = "max";
        } else {
            teamString = "min";
        }

        if (matroska.position !== null) {
            const figures = document.querySelectorAll(
                `[data-x='${matroska.position.x}']\
[data-y='${matroska.position.y}']\
[data-outside='false']\
[data-size='${matroska.size}']\
[data-team='${teamString}'].figure`);
            if (figures.length != 1) {
                throw new InterfaceError(
                    `Not exactly one matroska match for position ${matroska.position}`);
            } else {
                const domFigure = figures[0];
                domFigure.dataset.outside = "false";
                domFigure.dataset.x = "" + destination.x;
                domFigure.dataset.y = "" + destination.y;
                domFigure.style.top = "" + (destination.y * 100) + "px";
                domFigure.style.left = "" + (destination.x * 100) + "px";
                domFigure.style.zIndex = "" + (((destination.y + 1) * 10) + matroska.size);
            }
        } else {
            const figures = document.querySelectorAll(
                `[data-outside='true']\
[data-size='${matroska.size}']\
[data-team='${teamString}'].figure`);
            if (figures.length < 1 || figures.length > 2) {
                throw new InterfaceError(
                    `Weird number of figures outside for this selection (${figures.length})`);
            }
            const domFigure = figures[0];
            domFigure.dataset.outside = "false";
            domFigure.dataset.x = "" + destination.x;
            domFigure.dataset.y = "" + destination.y;
            domFigure.style.top = "" + (destination.y * 100) + "px";
            domFigure.style.left = "" + (destination.x * 100) + "px";
            domFigure.style.zIndex = "" + (((destination.y + 1) * 10) + matroska.size);
        }
    }

    doAction(action) {
        try {
            const newGameState = action.applyAction(this.gameState);
            this.translate(action.sourceMatroska, action.destination);
            this.historyOfGameStates.push(this.gameState);
            this.gameState = newGameState;
            this.doPostTurn();
        } catch (error) {
            console.error(error);
            throw new InterfaceError("Uncaught GameRulesViolation error");
        }
    }

    doPostTurn() {
        console.log(this.gameState.print());
        const winner = this.gameState.board.getWinner(this.maxPlayer, this.minPlayer);
        if (winner === null) {
            // the game is over
            if (! this.gameState.playerOnTurn.isHuman) {
                // CPU's turn to play
                setTimeout(() => {this.cpuTurn();}, 300);
            }
        } else {
            showWinScreen(winner);
        }
    }

    cpuTurn() {
        const outcome = new MiniMaxOutcome();

        let currentSearchDepth;

        if (this.gameState.playerOnTurn.isMaximizing) {
            currentSearchDepth = this.cpuDepthMax;
        } else {
            currentSearchDepth = this.cpuDepthMin;
        }

        const moveNumber = this.historyOfGameStates.length;

        currentSearchDepth = Math.min(currentSearchDepth, moveNumber + 4);
        
        const killerMoves = [];
        for (let i = 0; i < currentSearchDepth + 1; i ++) {
            killerMoves.push(new KillerMoves());
        }

        console.log(`Starting Alpha-Beta with depth ${currentSearchDepth}`);
        const value = alphaBeta(
            this.gameState,
            currentSearchDepth,
            -Infinity,
            Infinity,
            outcome,
            true,
            killerMoves
        );
        console.log(`Game value for this action: ${value}`);
        console.log(outcome);

        const bestAction = outcome.bestPossibleAction;
        this.doAction(bestAction);
    }

    selectMatroska(matroska) {
        if ((! matroska.owner.equals(this.gameState.playerOnTurn)) 
        || (! matroska.owner.isHuman)) {
            console.warn("This matroska can not be moved.");
            return;
        }

        this.lastSelectedMatroska = matroska;

        for (const domSelection of document.getElementsByClassName("selection")) {
            domSelection.classList.remove("selectable");
            domSelection.removeEventListener("click", onSelectionClick);
        }

        const destinations = this.gameState.board.getPossiblePlacementDestinations(matroska);

        for (const position of destinations) {
            const selections = document.querySelectorAll(
                `[data-x='${position.x}'][data-y='${position.y}'].selection`);

            if (selections.length != 1) {
                throw new InterfaceError(`Not exactly one tile at position ${position}`);
            }
            const domSelection = selections[0];
            domSelection.classList.add("selectable");
            domSelection.removeEventListener("click", onSelectionClick);
            domSelection.addEventListener("click", onSelectionClick, false);
        }

    }

    selectDestination(destination) {
        this.lastSelectedDestination = destination;

        if (this.lastSelectedMatroska !== null) {
            const action = new MoveAction(
                this.gameState.getPlayerOnTurn,
                this.lastSelectedMatroska,
                this.lastSelectedDestination
            );
            this.lastSelectedMatroska = null;
            this.lastSelectedDestination = null;
            this.doAction(action);
        } else {
            throw new InterfaceError("No lastSelected matroska found");
        }

        for (const domSelection of document.getElementsByClassName("selection")) {
            domSelection.classList.remove("selectable");
            domSelection.removeEventListener("click", onSelectionClick);
        }
    }
}


//
//  VISUALS
//

let THE_GAME = new TheGame(
    new Player(0, false, true),
    new Player(1, true, false),
    5, 5
);

function resetFigurePositioning() {
    const figures = document.getElementsByClassName("figure");

    for (const figure of figures) {
        figure.style.zIndex = figure.dataset.size;
        figure.dataset.outside = "true";
    }

    figures[ 0].style.left = "0px";
    figures[ 1].style.left = "0px";
    figures[ 2].style.left = "100px";
    figures[ 3].style.left = "100px";
    figures[ 4].style.left = "200px";
    figures[ 5].style.left = "200px";
    figures[ 6].style.left = "0px";
    figures[ 7].style.left = "0px";
    figures[ 8].style.left = "100px";
    figures[ 9].style.left = "100px";
    figures[10].style.left = "200px";
    figures[11].style.left = "200px";
    figures[ 0].style.top = "-150px";
    figures[ 1].style.top = "-120px";
    figures[ 2].style.top = "-150px";
    figures[ 3].style.top = "-120px";
    figures[ 4].style.top = "-150px";
    figures[ 5].style.top = "-120px";
    figures[ 6].style.top = "350px";
    figures[ 7].style.top = "380px";
    figures[ 8].style.top = "350px";
    figures[ 9].style.top = "380px";
    figures[10].style.top = "350px";
    figures[11].style.top = "380px";
}

/**Shows the win screen element
 * @param {Player} winner - the Player who won*/
function showWinScreen(winner) {
    const domWinScreen = document.getElementById("win-screen");

    if (winner.isMaximizing) {
        document.getElementById("red-wins").style.display = "block";
        document.getElementById("black-wins").style.display = "none";
    } else {
        document.getElementById("red-wins").style.display = "none";
        document.getElementById("black-wins").style.display = "block";
    }
    domWinScreen.style.zIndex = "1000";
    domWinScreen.style.opacity = "1";
}

/**Hides the win screen element*/
function hideWinScreen() {
    const domWinScreen = document.getElementById("win-screen");
    domWinScreen.style.opacity = "0";
    setTimeout(() => {
        domWinScreen.style.zIndex = "-1";
    }, 500);
}

function onMatroskaClick(e) {
    e = e || window.event;
    let domTarget = e.target || e.srcElement;

    // get the figure div element
    while (! domTarget.classList.contains("figure")) {
        domTarget = domTarget.parentElement;
    }
    
    const isOutside = (domTarget.dataset.outside == "true");
    const x = parseInt(domTarget.dataset.x);
    const y = parseInt(domTarget.dataset.y);

    let position = null;
    if (! isOutside) {
        position = new Position(x, y);
    }

    let player = null;
    const teamString = domTarget.dataset.team;
    if (teamString == "max") {
        player = THE_GAME.maxPlayer;
    } else {
        player = THE_GAME.minPlayer;
    }

    const size = parseInt(domTarget.dataset.size);

    const matroska = new Matroska(player, size, position);
    console.log(matroska);
    THE_GAME.selectMatroska(matroska);
}

function onSelectionClick(e) {
    e = e || window.event;
    const domTarget = e.target || e.srcElement;
    const x = parseInt(domTarget.dataset.x);
    const y = parseInt(domTarget.dataset.y);

    const position = new Position(x, y);
    console.log(position);
    THE_GAME.selectDestination(position);
}

function onGameRestartClick(e) {
    resetFigurePositioning();
    hideWinScreen();

    for (const domSelection of document.getElementsByClassName("selection")) {
        domSelection.classList.remove("selectable");
        domSelection.removeEventListener("click", onSelectionClick);
    }
    
    setTimeout(() => {    
        const domMax = document.getElementById("team-max");
        let maxPlayer = null;
        if (domMax.dataset.cpu == "true") {
            maxPlayer = new Player(0, false, true);
        } else {
            maxPlayer = new Player(0, true, true);
        }

        const domMin = document.getElementById("team-min");
        let minPlayer = null;
        if (domMin.dataset.cpu == "true") {
            minPlayer = new Player(1, false, false);
        } else {
            minPlayer = new Player(1, true, false);
        }
    
        const domDifficultyForMax = document.getElementById("team-max-difficulty");

        const difficultyForMax = domDifficultyForMax.options[
            domDifficultyForMax.selectedIndex].value;
        let searchDepthForMax = 1;
        if (difficultyForMax == "easy") {
            searchDepthForMax = 1;
        } else if (difficultyForMax == "medium") {
            searchDepthForMax = 2;
        } else if (difficultyForMax == "hard") {
            searchDepthForMax = 8;
        }

        const domDifficultyForMin = document.getElementById("team-min-difficulty");

        const difficultyForMin = domDifficultyForMax.options[
            domDifficultyForMin.selectedIndex].value;
        let searchDepthForMin = 1;
        if (difficultyForMin == "easy") {
            searchDepthForMin = 1;
        } else if (difficultyForMin == "medium") {
            searchDepthForMin = 2;
        } else if (difficultyForMin == "hard") {
            searchDepthForMin = 8;
        }
        
        THE_GAME = new TheGame(maxPlayer, minPlayer, searchDepthForMax, searchDepthForMin);
    }, 500);
}

function onPlayerTypeClick(e) {
    e = e || window.event;
    let domTarget = e.target || e.srcElement;

    while (!(domTarget.dataset.cpu == "true" || domTarget.dataset.cpu == "false")) {
        domTarget = domTarget.parentElement;
    }

    if (domTarget.dataset.cpu == "true") {
        domTarget.dataset.cpu = "false";
        const domLabel = document.getElementById(domTarget.id + "-label");
        domLabel.innerText = "Human";
        const domImage = document.getElementById(domTarget.id + "-image");
        domImage.src = "./human.png";
        const domDifficulty = document.getElementById(domTarget.id + "-difficulty");
        domDifficulty.style.opacity = "0";
    } else {
        domTarget.dataset.cpu = "true";
        const domLabel = document.getElementById(domTarget.id + "-label");
        domLabel.innerText = "CPU";
        const domImage = document.getElementById(domTarget.id + "-image");
        domImage.src = "./cpu.png";
        const domDifficulty = document.getElementById(domTarget.id + "-difficulty");
        domDifficulty.style.opacity = "1";
    }
}

function onDifficultySelectClick(e) {
    e.stopPropagation();
}

const figures = document.getElementsByClassName("figure");

for (const domMatroska of figures) {
    domMatroska.addEventListener("click", onMatroskaClick, false);
}

const restartButton = document.getElementById("restart");
restartButton.addEventListener("click", onGameRestartClick, false);

const teamSelectMax = document.getElementById("team-max");
const teamSelectMin = document.getElementById("team-min");
teamSelectMax.addEventListener("click", onPlayerTypeClick, false);
teamSelectMin.addEventListener("click", onPlayerTypeClick, false);
const teamSelectDifficultyMax = document.getElementById("team-max-difficulty");
const teamSelectDifficultyMin = document.getElementById("team-min-difficulty");
teamSelectDifficultyMax.addEventListener("click", onDifficultySelectClick, false);
teamSelectDifficultyMin.addEventListener("click", onDifficultySelectClick, false);

