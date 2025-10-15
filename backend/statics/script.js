// ==========================
// ⚡ 5x5 Neon Mini Chess (Letter-Based)
// ==========================

const boardSize = 5;
let selectedCell = null;
let currentPlayer = 'white';
let moveHistory = [];

// === Helper Functions ===
function getPosition(cell) {
  const [row, col] = cell.id.split('-').map(Number);
  return { row, col };
}

function isValid(row, col) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function getCell(row, col) {
  return document.getElementById(`${row}-${col}`);
}

function getPiece(cell) {
  return cell.textContent.trim();
}

function getPieceOwner(cell) {
  if (!cell.textContent.trim()) return null;
  return cell.classList.contains('white-piece') ? 'white' : 'black';
}

// === Move a Piece ===
function movePiece(fromCell, toCell, aiMove = false) {
  const piece = getPiece(fromCell);
  if (!piece) return;

  // If capturing king -> win
  if (getPiece(toCell) === 'K') {
    setTimeout(() => {
      alert(`${currentPlayer.toUpperCase()} captured the King! Game Over.`);
      location.reload();
    }, 200);
    return;
  }

  // Move piece and set owner class
  toCell.textContent = piece;
  toCell.className = `cell ${currentPlayer}-piece`;
  fromCell.textContent = '';
  fromCell.className = 'cell';

  const moveText = `${currentPlayer.toUpperCase()}: ${piece} ${fromCell.id} → ${toCell.id}`;
  moveHistory.push(moveText);
  updateMoveHistory();

  if (!aiMove) switchTurn();
}

// === Switch Turns ===
function switchTurn() {
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('turn-indicator').textContent =
    `Turn: ${currentPlayer.toUpperCase()}`;

  if (currentPlayer === 'black') {
    setTimeout(aiMakeMove, 600);
  }
}

// === Move History ===
function updateMoveHistory() {
  const log = document.getElementById('move-history');
  log.innerHTML = moveHistory.map(m => `<li>${m}</li>`).join('');
}

// === Valid Moves ===
function getValidMoves(piece, row, col) {
  const moves = [];

  if (piece === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr || dc) if (isValid(row + dr, col + dc)) moves.push({ row: row + dr, col: col + dc });
      }
    }
  } else if (piece === 'S') {
    if (isValid(row - 1, col)) moves.push({ row: row - 1, col: col });
    if (isValid(row + 1, col)) moves.push({ row: row + 1, col: col });
  } else if (piece === 'E') {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isValid(r, c)) {
        moves.push({ row: r, col: c });
        if (getPieceOwner(getCell(r, c))) break;
        r += dr; c += dc;
      }
    });
  } else if (piece === 'H') {
    const jumps = [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]];
    jumps.forEach(([dr, dc]) => {
      if (isValid(row + dr, col + dc)) moves.push({ row: row + dr, col: col + dc });
    });
  }

  return moves;
}

// === Highlights ===
function highlightMoves(moves) {
  moves.forEach(pos => {
    const target = getCell(pos.row, pos.col);
    if (!getPieceOwner(target)) target.classList.add('valid-move');
    else target.classList.add('valid-capture');
  });
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'valid-move', 'valid-capture'));
}

// === AI Move ===
function aiMakeMove() {
  const allCells = Array.from(document.querySelectorAll('.cell'));
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black');

  const allMoves = [];

  aiPieces.forEach(cell => {
    const { row, col } = getPosition(cell);
    const piece = getPiece(cell);
    const validMoves = getValidMoves(piece, row, col).filter(m => {
      const target = getCell(m.row, m.col);
      return getPieceOwner(target) !== 'black';
    });
    if (validMoves.length > 0) allMoves.push({ from: cell, moves: validMoves });
  });

  if (allMoves.length === 0) {
    alert('AI has no valid moves. You win!');
    return;
  }

  const randomPiece = allMoves[Math.floor(Math.random() * allMoves.length)];
  const randomMove = randomPiece.moves[Math.floor(Math.random() * randomPiece.moves.length)];
  const toCell = getCell(randomMove.row, randomMove.col);

  movePiece(randomPiece.from, toCell, true);
  currentPlayer = 'white';
  document.getElementById('turn-indicator').textContent = 'Turn: WHITE';
}

// === Click Handler ===
function attachHandlers() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', () => {
      if (currentPlayer !== 'white') return;

      const piece = getPiece(cell);
      const owner = getPieceOwner(cell);

      if (!selectedCell && piece && owner === currentPlayer) {
        selectedCell = cell;
        cell.classList.add('selected');
        const { row, col } = getPosition(cell);
        highlightMoves(getValidMoves(piece, row, col));
        return;
      }

      if (selectedCell) {
        const { row: fromR, col: fromC } = getPosition(selectedCell);
        const { row: toR, col: toC } = getPosition(cell);
        const validMoves = getValidMoves(getPiece(selectedCell), fromR, fromC);
        const legal = validMoves.some(m => m.row === toR && m.col === toC);

        if (legal && getPieceOwner(cell) !== currentPlayer) movePiece(selectedCell, cell);

        clearHighlights();
        selectedCell = null;
      }
    });
  });
}

// attach handlers once DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  attachHandlers();
  updateMoveHistory();
});

// === Reset ===
document.getElementById('resetBtn').addEventListener('click', () => location.reload());
