(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AstronigmaLightsOut = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SIZE = 5;
    const CELL_COUNT = SIZE * SIZE;
    const SOLUTION_MASKS = Object.freeze([
        Object.freeze([2, 6, 8, 12, 16, 18, 22]),
        Object.freeze([0, 4, 7, 11, 13, 17, 20, 24]),
        Object.freeze([1, 5, 9, 12, 15, 19, 23]),
        Object.freeze([3, 6, 10, 12, 14, 18, 21])
    ]);

    function assertBoard(board) {
        if (!Array.isArray(board) || board.length !== CELL_COUNT) {
            throw new TypeError(`Board must contain ${CELL_COUNT} cells.`);
        }
    }

    function affectedIndices(index) {
        if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
            throw new RangeError('Cell index is outside the board.');
        }
        const row = Math.floor(index / SIZE);
        const column = index % SIZE;
        return [[row, column], [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]
            .filter(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE)
            .map(([r, c]) => r * SIZE + c);
    }

    function toggleBoard(board, index) {
        assertBoard(board);
        const next = board.slice();
        affectedIndices(index).forEach(cellIndex => { next[cellIndex] = !next[cellIndex]; });
        return next;
    }

    function createBoardFromMask(mask) {
        if (!Array.isArray(mask) || mask.length === 0) throw new TypeError('Solution mask must not be empty.');
        return mask.reduce((board, index) => toggleBoard(board, index), Array(CELL_COUNT).fill(false));
    }

    function isSolved(board) {
        assertBoard(board);
        return board.every(cell => !cell);
    }

    function createGame(roundIndex = 0) {
        const normalizedIndex = Math.abs(Math.trunc(roundIndex)) % SOLUTION_MASKS.length;
        const initialBoard = createBoardFromMask(SOLUTION_MASKS[normalizedIndex]);
        return { roundIndex: normalizedIndex, initialBoard, board: initialBoard.slice(), moves: 0, complete: false };
    }

    function playMove(game, index) {
        if (!game || game.complete) return game;
        const board = toggleBoard(game.board, index);
        return { ...game, board, moves: game.moves + 1, complete: isSolved(board) };
    }

    function resetGame(game) {
        if (!game) throw new TypeError('Game is required.');
        return { ...game, board: game.initialBoard.slice(), moves: 0, complete: false };
    }

    function nextGame(game) {
        return createGame((game?.roundIndex ?? -1) + 1);
    }

    return { SIZE, CELL_COUNT, SOLUTION_MASKS, affectedIndices, toggleBoard, createBoardFromMask, isSolved, createGame, playMove, resetGame, nextGame };
}));
