import { ChainReaction } from "./ChainReaction";


const cr = new ChainReaction();

// case 1
// cr.nextState(cr.board,{ row:0, column: 2});
// cr.nextState(cr.board,{ row:0, column: 2});

// cr.nextState(cr.board,{ row:1, column: 1});
// cr.nextState(cr.board,{ row:1, column: 1});
// cr.nextState(cr.board,{ row:1, column: 1});

// cr.nextState(cr.board,{ row:1, column: 2});
// cr.nextState(cr.board,{ row:1, column: 2});
// cr.nextState(cr.board,{ row:1, column: 2});

// cr.nextState(cr.board,{ row:1, column: 3});
// cr.nextState(cr.board,{ row:1, column: 3});

// const { states } = cr.nextState(cr.board, { row: 0, column: 2 });
/*
0 | 2 | 2 | 0
1 | 0 | 2 | 1
0 | 1 | 1 | 1
0 | 0 | 0 | 0
*/


// case II

// var { nextPlayer : np }= cr.nextState(cr.board,{ row:2, column: 0});

// console.log({
//     nextPlayer:np
// });

// var { nextPlayer: np } = cr.nextState(cr.board,{ row:2, column: 0});

// console.log({
//     nextPlayer: np
// });
// var { nextPlayer: np } = cr.nextState(cr.board,{ row:3, column: 0});
// console.log({
//     nextPlayer: np
// });


// case 3



/**
1 | 1 | 2 | 1
2 | 1 | 0 | 2
2 | 3 | 3 | 2
1 | 2 | 0 | 1
 */


var { nextPlayer : np }= cr.nextState(cr.board,{ row:0, column: 0});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:0, column: 1});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:0, column: 2});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:0, column: 2});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:0, column: 3});

// row 2 from top
var { nextPlayer : np }= cr.nextState(cr.board,{ row:1, column: 0});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:1, column: 0});

var { nextPlayer : np }= cr.nextState(cr.board,{ row:1, column: 1});

var { nextPlayer : np }= cr.nextState(cr.board,{ row:1, column: 3});
var { nextPlayer : np }= cr.nextState(cr.board,{ row:1, column: 3});



// row 3 fro m top 

var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 0 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 0 });

var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 1 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 1 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 1 });

var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 2 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 2 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 2 });

var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 3 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 2, column: 3 });

// row 4 from top 
var { nextPlayer: np } = cr.nextState(cr.board, { row: 3, column: 0 });

var { nextPlayer: np } = cr.nextState(cr.board, { row: 3, column: 1 });
var { nextPlayer: np } = cr.nextState(cr.board, { row: 3, column: 1 });

var { nextPlayer: np, states } = cr.nextState(cr.board, { row: 3, column: 3 });



// check 
// export const { states, nextPlayer } = cr.nextState(cr.board,{ row:3, column: 0});

console.log(cr.printBoards(states));

console.log({ np });

// console.log(states);


 