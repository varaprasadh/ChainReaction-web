import { generateUUID } from 'three/src/math/MathUtils';

 
interface Position {
    row: number,
    column: number
};

interface Player {
    id: string,
    name?: string,
    color?: string
};

interface Cell{
    id?: string, // no use for now
    val: number,
    owner: Player | null,
    capacity: number,
    items: Array<CellItem>,
    position: Position
};

// later 
interface CellItem{
    id?: string,
    prevPosition: Position,
    currentPosition: Position
}

type Board = Array<Array<Cell>>;

/**
        () 
 */

export class ChainReaction{
    currentPlayer:number;
    board:Board;
    players:Array<Player>;
    colors: Array<string> = ["red", "yellow", "blue", "green", "orange", "brown", "purple","black"];

    constructor(config = { rows: 5, columns:5 }, players:number = 2){


        this.currentPlayer = 0;
        this.board = this.initializeBoard(4,4);
        this.players = this.initializePlayers(players);
    };

    reset():void{
        this.initializeBoard(5,5);
    }
    
    initializeBoard(rows:number,columns:number):Board{

        const board:Board = [];
        for(let i=0;i<rows;i++){
            const row:Array<Cell> = [];
            for(let j=0;j<columns;j++){

               // corners
               if(
                ( i=== 0 && j===0 )  || // top left
                ( i=== 0 && j === columns-1) || // top right
                ( i=== rows-1 && j === 0) || // bottom left
                ( i=== rows-1 && j === columns-1)  // bottom right: ;
                ){
                   row.push({
                       id: generateUUID(),
                       val: 0,
                       owner: null,
                       capacity: 1,
                       items: [],
                       position: {
                           row:i,
                           column:j
                       }
                   });
                   continue;
               }

               if( 
                   (i===0 || i=== rows-1) || // top edge and bottom edge
                   (j===0 || j=== columns-1) // left and right edges
               ){

                   row.push({
                       id: generateUUID(),
                       val: 0,
                       owner: null,
                       capacity: 2,
                       items: [],
                       position: {
                           row: i,
                           column: j
                       }
                   });
                   continue;
               }



               row.push({
                  id: generateUUID(),
                  val: 0,
                  owner: null,
                  capacity: 3 ,
                  items: [],
                   position: {
                       row: i,
                       column: j
                   }
               });
            };
            board.push(row);
        }

        

        return board;
    }

    initializePlayers(players:number){
        if (players < 2) {
            throw new Error("Require at least 2 players");
        }
        if (players > 8) {
            throw new Error("No more than 8 players");
        }
        this.players = [...new Array(players)].map(i => ({ name: i })).map(({ name = null }, index) => ({
            id: index.toString(),
            color: this.colors[index],
            name: name
        }));
        return this.players;
    }

    printBoard(){

        const rows =this.board.map(row => {
            return row.map(cell => `${cell.items.length}`).join(" | ")
        })

        console.log(rows.reverse().join("\n"));
        return rows.reverse();
    }
    isValidPosition = (board:Board, position : Position):boolean => {
        // check current cell and player state 

        const {  row, column  } = position;
        if(row<0 || row >= board.length){
            return false;
        };
        if(column < 0 || column >= board[row].length){
            return false;
        }
       return true;
    };

    isValidPlayer(board: Board,position:Position, player:Player){

        const cell: Cell = this.getCell(board, position);

        if (cell.owner && cell.owner.id !== player.id) {
            return false;
        }
        return true;
    }



    getCell(board:Board, position:Position){
        if(!this.isValidPosition(board, position)){
            console.log("invalid position");
            throw new Error("Error in getCell");
        }
        const { row, column } = position;

        const cell: Cell = board[row][column];

        return cell;
    };

    setNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        return this.currentPlayer;
    };

    getCurrentPlayer():Player{
        return this.players[this.currentPlayer];
    };

    getNextPlayer():Player{
        return this.players[(this.currentPlayer + 1) % this.players.length];
    };

    isGameOver():boolean{
        // see if there is only one owner left 
        const currentOccupiedCells = this.board
                            .reduce((ac, row)=>[...ac, ...row],[])
                            .filter(cell => cell.owner !== null) // if cell has no owner
        const set = new Set([...currentOccupiedCells.map(cell => cell.owner?.id)]);

        return currentOccupiedCells.length > 1 && set.size === 1; // there is only one survivor, so declare a win
    };

    nextState(prevState: Board , position: Position){
        
        // level order traversal;
        const states = [];
        // states.push(JSON.parse(JSON.stringify(prevState)));
     
        
        const queue = [];
        
        if(this.isGameOver()){
            throw new Error("Game Over already..");     
       }

        if(!this.isValidPosition(prevState, position)){
            console.log("cant do the operation");
           throw new Error("its not valid position");
        };

        
        const cell = this.getCell(prevState, position);
        // new cell Item 

        // if there is owner of cell and current player is not owner of that cell just return
        if (cell.owner && cell.owner.id !== this.getCurrentPlayer().id){
            console.log("cant do the operation, but giving you the permission");
            throw new Error("Cant take a move!")
        }

        cell.owner = this.getCurrentPlayer();

        cell.items.push({
            id: generateUUID(),
            prevPosition: cell.position,
            currentPosition: cell.position
        });

        states.push(JSON.parse(JSON.stringify(prevState)));

        queue.push(cell);
        queue.push(null);

        let levels = 0;
        while(queue.length > 0){ 
            
            levels += 1;
            if (levels > 10) {
                // probably this case will not arise, but to be make sure we don't go infinite
                throw new Error("Max BFS Depth reached, stopping looping the queue")
            }
            
            let cell = queue.shift();
            while(cell){
                    if (this.isValidPosition(prevState, cell.position)) {
                        // check if it can explode
                        if (cell.items.length > cell.capacity){
                            const owner = { ... cell.owner};
                            cell.owner = null; // going to explode and cell will be empty at that time 
                            // share the atoms to neighbors <==> exploding
                            const neighborPositions = this.getNeighbors(prevState, cell.position);
                            for (const pos of neighborPositions) {
                                const neighbor = this.getCell(prevState, pos);
                                if (cell.items.length) {
                                    const cellItem = cell.items.pop() as any;
                                    cellItem.prevPosition = cell.position;
                                    cellItem.currentPosition = neighbor.position;
                                    neighbor.owner = owner as any;
                                    neighbor.items.push(cellItem); // keep an eye
                                };
                                // if neighbor can explode , add it to queue for next layer 
                                if (neighbor.items.length > neighbor.capacity) {
                                    queue.push(neighbor);
                                }
                            };
                        }
                    }
                cell = queue.shift();
            };
            if(queue.length){
                queue.push(null);
            };
            console.log("\n");
            this.printBoard();
            
            states.push(JSON.parse(JSON.stringify(prevState)));
            if(this.isGameOver()){
                // return states till this point and  winner
                return {
                    states,
                    board: prevState,
                    gameOver : true,
                    player: this.getCurrentPlayer(),
                    nextPlayer: this.getNextPlayer(),
                }
            }
        }

        const result = {
            states,
            board: prevState,
            gameOver: false,
            player: this.getCurrentPlayer(),
            nextPlayer: this.getNextPlayer(),
        };

        // give chance to other player
        this.setNextPlayer();

        return  result;
    }

    printBoards(states: Array<Board>){
        states.forEach((state,index) => {
            const str = state.map(row => {
                return row.map(cell => `${cell.items.length}`).join(" | ")
            }).join("\n");
            console.log(`level::${index} \n`);
            console.log(str);
            console.log("\n");
        });
    };

    // returns neighbor positions ? should return cell instead ? 
    getNeighbors(board:Board, position: Position):Array<Position> {
        if (!this.isValidPosition(board, position)) {
            console.log("invalid position");
            throw new Error("Error in getCell");
        };

        const neighbors: Array<Position> = []


        const {  row, column } = position;
        // -- corners --
        // top left,
        if(row === 0 && column === 0){
            const a = {
                row: row,
                column: column + 1
            };
            if(this.isValidPosition(board, a)){
                neighbors.push(a);
            };
            const b = {
                row: row+1,
                column: column
            };
            if(this.isValidPosition(board, b)){
                neighbors.push(b);
            };
            return neighbors;
        };
        // top right
        if(row === 0 && column === board[row].length-1){
            const a = {
                row: row,
                column: column - 1
            };
            if (this.isValidPosition(board, a)) {
                neighbors.push(a);
            };
            const b = {
                row: row + 1,
                column: column
            };
            if (this.isValidPosition(board, b)) {
                neighbors.push(b);
            };
            return neighbors;
        }

        // bottom left
        if(row === board.length-1 && column === 0){
            const a = {
                row: row-1,
                column: column 
            };
            if (this.isValidPosition(board, a)) {
                neighbors.push(a);
            };
            const b = {
                row: row,
                column: column+1
            };
            if (this.isValidPosition(board, b)) {
                neighbors.push(b);
            };
            return neighbors;
        }

        // bottom right
        if(row === board.length-1 && column === board[row].length-1){
            const a = {
                row: row-1,
                column: column 
            };
            if (this.isValidPosition(board, a)) {
                neighbors.push(a);
            };
            const b = {
                row: row,
                column: column-1
            };
            if (this.isValidPosition(board, b)) {
                neighbors.push(b);
            };
            return neighbors;
        };


        // -- edges 

        // top boundary
        if(row === 0){
            // 3 neighbors
            const a = {
                row: row,
                column: column-1
            };
            const b = {
                row: row ,
                column: column +1
            };
            const c = {
                row: row + 1,
                column: column
            };

            this.isValidPosition(board,a) && neighbors.push(a); 
            this.isValidPosition(board,b) && neighbors.push(b); 
            this.isValidPosition(board,c) && neighbors.push(c); 

            return neighbors;
        };

        // right boundary
        if(column === board[row].length-1){
            // 3 neighbors
            const a = {
                row: row-1,
                column: column
            };
            const b = {
                row: row +1 ,
                column: column 
            };
            const c = {
                row: row ,
                column: column-1
            };

            this.isValidPosition(board,a) && neighbors.push(a); 
            this.isValidPosition(board,b) && neighbors.push(b); 
            this.isValidPosition(board,c) && neighbors.push(c); 
            
            return neighbors;


        };

        // bottom boundary
        if(row === board[row].length-1){
            // 3 neighbors
            const a = {
                row: row,
                column: column-1
            };
            const b = {
                row: row ,
                column: column +1 
            };
            const c = {
                row: row-1 ,
                column: column
            };

            this.isValidPosition(board,a) && neighbors.push(a); 
            this.isValidPosition(board,b) && neighbors.push(b); 
            this.isValidPosition(board,c) && neighbors.push(c); 

            return neighbors;

        };

        // left boundary
        if(row === board[row].length-1){
            // 3 neighbors
            const a = {
                row: row-1,
                column: column
            };
            const b = {
                row: row +1,
                column: column 
            };
            const c = {
                row: row ,
                column: column +1
            };

            this.isValidPosition(board,a) && neighbors.push(a); 
            this.isValidPosition(board,b) && neighbors.push(b); 
            this.isValidPosition(board,c) && neighbors.push(c); 

            return neighbors;
        };

        // top cell
        const a = {
            row: row -1,
            column: column 
        };
        
        // bottom cell
        const b = {
            row: row + 1,
            column: column 
        };
        
        // left cell
        const c = {
            row: row,
            column: column -1
        };
        
        const d = {
            row: row ,
            column: column +1 
        };
        
        

        this.isValidPosition(board, a) && neighbors.push(a);
        this.isValidPosition(board, b) && neighbors.push(b);
        this.isValidPosition(board, c) && neighbors.push(c);
        this.isValidPosition(board, d) && neighbors.push(d);
        
        return neighbors
    }

}

export default ChainReaction;
