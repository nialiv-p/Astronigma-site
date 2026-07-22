'use strict';

const assert = require('node:assert/strict');
const game = require('../lights-out.js');

function testAffectedIndices() {
    assert.deepEqual(game.affectedIndices(12), [12, 7, 17, 11, 13]);
    assert.deepEqual(game.affectedIndices(0), [0, 5, 1]);
}

function testOrthogonalToggle() {
    const empty = Array(game.CELL_COUNT).fill(false);
    const toggled = game.toggleBoard(empty, 12);
    assert.deepEqual(toggled.map((on, index) => on ? index : null).filter(index => index !== null), [7, 11, 12, 13, 17]);
    assert.equal(empty.some(Boolean), false, 'toggleBoard must not mutate its input');
}

function testEveryGeneratedBoardIsSolvable() {
    game.SOLUTION_MASKS.forEach((mask, round) => {
        let state = game.createGame(round);
        assert.equal(game.isSolved(state.board), false);
        mask.forEach(index => { state = game.playMove(state, index); });
        assert.equal(state.complete, true, `round ${round} must be solved by its source mask`);
        assert.equal(game.isSolved(state.board), true);
    });
}

function testReset() {
    const initial = game.createGame(0);
    const moved = game.playMove(initial, 4);
    const reset = game.resetGame(moved);
    assert.deepEqual(reset.board, initial.initialBoard);
    assert.equal(reset.moves, 0);
    assert.equal(reset.complete, false);
}

function testNextGame() {
    const first = game.createGame(0);
    const next = game.nextGame(first);
    assert.equal(next.roundIndex, 1);
    assert.notDeepEqual(next.initialBoard, first.initialBoard);
}

testAffectedIndices();
testOrthogonalToggle();
testEveryGeneratedBoardIsSolvable();
testReset();
testNextGame();
console.log('Lights Out unit tests passed.');
