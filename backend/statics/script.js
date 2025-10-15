let selectedCell = null;
let currentPlayer = 'white';
let gameStarted = false;
let gamePaused = false;

const pieceMap = {
  '♔': 'white', // King
  '♕': 'white', // Queen
  '♖': 'white', // Rook
  '♗': 'white', // Bishop
  '♘': 'white', // Knight
  '♙': 'white', // Pawn
  '♚': 'black', // King
  '♛': 'black', // Queen
  '♜': 'black', // Rook
  '♝': 'black', // Bishop
  '♞': 'black', // Knight
  '♟': 'black'  // Pawn
};

// ------------------------ Utility Functions ------------------------

function getPiece(cell) {
  return cell.textContent.trim();
}

function getPieceOwner(cell) {
  const p = getPiece(cell);
  return pieceMap[p] || null;
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('highlight'));
}

function highlightMoves(moves) {
  clearHighlights();
  moves.forEach(cell => cell.classList.add('highlight'));
}

function isInBounds(r, c) {
  return r >= 0 && r < 5 && c >= 0 && c < 5;
}

// ------------------------ Game Start / Pause ------------------------

function startGame() {
  gameStarted = true;
  gamePaused = false;
  document.getElementById('status').textContent = "Game Started — White’s turn ♔";
}

function pauseGame() {
  gamePaused = true;
  document.getElementById('status').textContent = "Game Paused ⏸️";
}

// ------------------------ Move Logic ------------------------

function movePiece(fromCell, toCell) {
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);

  toCell.textContent = piece;
  fromCell.textContent = '';

  const log = document.getElementById('move-history');
  log.textContent += `${currentPlayer} moved ${piece} ${fromCell.id} → ${toCell.id}${captured ? ' (captured ' + captured + ')' : ''}\n`;
  log.scrollTop = log.scrollHeight;

  if (captured === '♚' || captured === '♔') {
    alert(`${currentPlayer.toUpperCase()} captured the King! Game Over.`);
    gameStarted = false;
    return;
  }

  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('status').textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  if (currentPlayer === 'black') {
    setTimeout(aiMakeMove, 600);
  }
}

// ------------------------ Valid Move Generator ------------------------

function getValidMoves(cell) {
  const piece = getPiece(cell);
  const owner = getPieceOwner(cell);
  if (!piece || !owner) return [];

  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const moves = [];

  const tryAdd = (r, c) => {
    if (!isInBounds(r, c)) return;
    const target = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    const targetOwner = getPieceOwner(target);
    if (targetOwner !== owner) moves.push(target);
  };

  switch (piece) {
    case '♔': case '♚': // King
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr || dc) tryAdd(row + dr, col + dc);
        }
      }
      break;

    case '♙': // White Pawn
      if (owner === 'white') {
        const forward = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
        if (forward && !getPiece(forward)) moves.push(forward);
        [-1, 1].forEach(dc => {
          const diag = document.querySelector(`[data-row="${row - 1}"][data-col="${col + dc}"]`);
          if (diag && getPieceOwner(diag) === 'black') moves.push(diag);
        });
      }
      break;

    case '♟': // Black Pawn
      if (owner === 'black') {
        const forward = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
        if (forward && !getPiece(forward)) moves.push(forward);
        [-1, 1].forEach(dc => {
          const diag = document.querySelector(`[data-row="${row + 1}"][data-col="${col + dc}"]`);
          if (diag && getPieceOwner(diag) === 'white') moves.push(diag);
        });
      }
      break;

    case '♘': case '♞': // Knight
      const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
      ];
      knightMoves.forEach(([dr, dc]) => tryAdd(row + dr, col + dc));
      break;

    case '♗': case '♝': // Bishop
      for (let d = 1; d < 5; d++) {
        const dirs = [[d, d], [d, -d], [-d, d], [-d, -d]];
        dirs.forEach(([dr, dc]) => {
          const target = document.querySelector(`[data-row="${row + dr}"][data-col="${col + dc}"]`);
          if (!target) return;
          if (!getPiece(target)) moves.push(target);
          else {
            if (getPieceOwner(target) !== owner) moves.push(target);
          }
        });
      }
      break;

    case '♕': case '♛': // Queen
      for (let d = 1; d < 5; d++) {
        [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]].forEach(([dr, dc]) => {
          const target = document.querySelector(`[data-row="${row + dr}"][data-col="${col + dc}"]`);
          if (!target) return;
          if (!getPiece(target)) moves.push(target);
          else if (getPieceOwner(target) !== owner) moves.push(target);
        });
      }
      break;

    case '♖': case '♜': // Rook
      for (let d = 1; d < 5; d++) {
        [[d, 0], [-d, 0], [0, d], [0, -d]].forEach(([dr, dc]) => {
          const target = document.querySelector(`[data-row="${row + dr}"][data-col="${col + dc}"]`);
          if (!target) return;
          if (!getPiece(target)) moves.push(target);
          else if (getPieceOwner(target) !== owner) moves.push(target);
        });
      }
      break;
  }

  return moves;
}

// ------------------------ Player Click Handler ------------------------

document.querySelectorAll('.cell').forEach(cell => {
  cell.addEventListener('click', () => {
    if (!gameStarted || gamePaused || currentPlayer === 'black') return;

    if (!selectedCell) {
      const owner = getPieceOwner(cell);
      if (owner === currentPlayer) {
        selectedCell = cell;
        highlightMoves(getValidMoves(cell));
      }
    } else {
      const legalMoves = getValidMoves(selectedCell);
      if (legalMoves.includes(cell)) {
        movePiece(selectedCell, cell);
      } else {
        clearHighlights();
        selectedCell = null;
      }
    }
  });
});

// ------------------------ AI Logic (Moderate Intelligence) ------------------------

function aiMakeMove() {
  if (!gameStarted || gamePaused || currentPlayer !== 'black') return;

  const allCells = [...document.querySelectorAll('.cell')];
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black' && getPiece(c) !== '');

  const valueMap = { '♔': 10, '♕': 9, '♖': 5, '♗': 3, '♘': 3, '♙': 1 };
  let bestMove = null;
  let bestScore = -Infinity;

  aiPieces.forEach(pieceCell => {
    const moves = getValidMoves(pieceCell);
    moves.forEach(move => {
      const target = getPiece(move);
      let score = 0;
      if (target && pieceMap[target] === 'white') {
        score = valueMap[target] || 1;
      } else if (parseInt(move.dataset.row) > parseInt(pieceCell.dataset.row)) {
        score = 0.3;
      }
      // discourage moving into immediate attack range
      const testPiece = getPiece(pieceCell);
      const old = move.textContent;
      move.textContent = testPiece;
      pieceCell.textContent = '';
      const danger = allCells.some(c => {
        if (getPieceOwner(c) === 'white') {
          const vm = getValidMoves(c);
          return vm.includes(move);
        }
        return false;
      });
      score -= danger ? 5 : 0;
      // undo
      pieceCell.textContent = testPiece;
      move.textContent = old;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: pieceCell, to: move };
      }
    });
  });

  if (bestMove) movePiece(bestMove.from, bestMove.to);
  else {
    const randPiece = aiPieces[Math.floor(Math.random() * aiPieces.length)];
    const moves = getValidMoves(randPiece);
    if (moves.length > 0) movePiece(randPiece, moves[Math.floor(Math.random() * moves.length)]);
  }
}
