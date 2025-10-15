// Updated chess logic (symbol-based) with strict movement & checkmate detection

let selectedCell = null;
let currentPlayer = 'white';
let gameStarted = false;
let gamePaused = false;

const pieceMap = {
  '♔': 'white', '♕': 'white', '♖': 'white', '♗': 'white', '♘': 'white', '♙': 'white',
  '♚': 'black', '♛': 'black', '♜': 'black', '♝': 'black', '♞': 'black', '♟': 'black'
};

// ---------- Helpers ----------
function getPiece(cell) { return cell ? cell.textContent.trim() : ''; }
function getPieceOwner(cell) { const p = getPiece(cell); return pieceMap[p] || null; }
function isInBounds(r, c) { return r >= 0 && r < 5 && c >= 0 && c < 5; }

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('highlight', 'capture'));
}
function highlightMoves(moves) {
  clearHighlights();
  moves.forEach(t => {
    if (!t) return;
    // Add a different class for captures (optional)
    const cls = getPiece(t) ? 'capture' : 'highlight';
    t.classList.add(cls);
  });
}

// ---------- Game control ----------
function startGame() {
  gameStarted = true;
  gamePaused = false;
  document.getElementById('status').textContent = "Game Started — White’s turn ♔";
}

function pauseGame() {
  gamePaused = true;
  document.getElementById('status').textContent = "Game Paused ⏸️";
}

// ---------- Move and logging ----------
function logMove(text) {
  const log = document.getElementById('move-history');
  log.textContent += text + '\n';
  log.scrollTop = log.scrollHeight;
}

function showCheckmate(winner) {
  gameStarted = false;
  // create overlay
  const overlay = document.createElement('div');
  overlay.id = 'checkmate-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)', zIndex: 9999, color: '#0ff', fontSize: 'clamp(1.5rem, 3vw, 3rem)',
    textAlign: 'center', flexDirection: 'column', gap: '1rem'
  });
  overlay.innerHTML = `
    <div style="padding:20px 30px; border:3px solid #0ff; box-shadow:0 0 30px #0ff; border-radius:12px;">
      <div style="font-weight:900;">♟ CHECKMATE</div>
      <div style="margin-top:8px;">${winner.toUpperCase()} WINS</div>
      <button id="cm-restart" style="margin-top:12px;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;font-weight:bold;">Restart</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('cm-restart').onclick = () => {
    document.body.removeChild(overlay);
    window.location.reload();
  };
}

// ---------- Core move function ----------
function movePiece(fromCell, toCell) {
  if (!fromCell || !toCell) return;
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);

  // move visually and preserve owner class
  toCell.textContent = piece;
  // set proper owner class
  const owner = getPieceOwner(fromCell);
  toCell.classList.remove('white-piece', 'black-piece');
  toCell.classList.add(owner + '-piece');

  fromCell.textContent = '';
  fromCell.classList.remove('white-piece', 'black-piece');

  logMove(`${currentPlayer.toUpperCase()}: ${piece} ${fromCell.dataset.row}-${fromCell.dataset.col} → ${toCell.dataset.row}-${toCell.dataset.col}${captured ? ' (captured ' + captured + ')' : ''}`);

  // immediate king capture -> end
  if (captured === '♚' || captured === '♔') {
    showCheckmate(currentPlayer);
    return;
  }

  // compute mover (who just moved)
  const mover = currentPlayer;

  // switch turn
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('status').textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  // check for checkmate: if opponent has no legal moves
  const opponent = currentPlayer;
  const opponentMoves = getAllLegalMoves(opponent);
  if (opponentMoves.length === 0) {
    showCheckmate(mover);
    return;
  }

  // AI if black
  if (currentPlayer === 'black') {
    setTimeout(aiMakeMove, 500);
  }
}

// ---------- Movement generators based on rules ----------

function getValidMoves(cell) {
  if (!cell) return [];
  const piece = getPiece(cell);
  const owner = getPieceOwner(cell);
  if (!piece || !owner) return [];

  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const moves = [];

  const addIfLegal = (r, c) => {
    if (!isInBounds(r, c)) return;
    const target = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    const targetOwner = getPieceOwner(target);
    if (targetOwner !== owner) moves.push(target);
  };

  // Pawn rules: forward 1 only; diagonal capture only if enemy present; forward blocked if occupied.
  if (piece === '♙' && owner === 'white') {
    // forward
    const f = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
    if (f && !getPiece(f)) moves.push(f);
    // diagonals for captures only
    [[-1, -1], [-1, 1]].forEach(([dr, dc]) => {
      const t = document.querySelector(`[data-row="${row + dr}"][data-col="${col + dc}"]`);
      if (t && getPieceOwner(t) === 'black') moves.push(t);
    });
    return moves;
  }
  if (piece === '♟' && owner === 'black') {
    const f = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
    if (f && !getPiece(f)) moves.push(f);
    [[1, -1], [1, 1]].forEach(([dr, dc]) => {
      const t = document.querySelector(`[data-row="${row + dr}"][data-col="${col + dc}"]`);
      if (t && getPieceOwner(t) === 'white') moves.push(t);
    });
    return moves;
  }

  // Knight: standard L-jumps; can jump over pieces
  if (piece === '♘' || piece === '♞') {
    const knightMoves = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    knightMoves.forEach(([dr, dc]) => addIfLegal(row + dr, col + dc));
    return moves;
  }

  // Bishop (elephant): diagonal sliding, stop at obstacles
  if (piece === '♗' || piece === '♝') {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        const target = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!target) break;
        if (!getPiece(target)) {
          moves.push(target);
          r += dr; c += dc; // continue sliding
          continue;
        } else {
          // occupied: if opponent -> add capture, then stop
          if (getPieceOwner(target) !== owner) moves.push(target);
          break;
        }
      }
    });
    return moves;
  }

  // Rook (boat): straight sliding, stop at obstacles
  if (piece === '♖' || piece === '♜') {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        const target = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!target) break;
        if (!getPiece(target)) {
          moves.push(target);
          r += dr; c += dc;
          continue;
        } else {
          if (getPieceOwner(target) !== owner) moves.push(target);
          break;
        }
      }
    });
    return moves;
  }

  // Queen: combination of rook + bishop (sliding), stop at obstacles
  if (piece === '♕' || piece === '♛') {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        const target = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!target) break;
        if (!getPiece(target)) {
          moves.push(target);
          r += dr; c += dc;
          continue;
        } else {
          if (getPieceOwner(target) !== owner) moves.push(target);
          break;
        }
      }
    });
    return moves;
  }

  // King fallback (if present)
  if (piece === '♔' || piece === '♚') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addIfLegal(row + dr, col + dc);
      }
    }
    return moves;
  }

  return moves;
}

// ---------- Utility to get all legal moves for a player ----------
function getAllLegalMoves(player) {
  const all = [...document.querySelectorAll('.cell')];
  const myCells = all.filter(c => getPieceOwner(c) === player);
  const moves = [];
  myCells.forEach(c => {
    const vm = getValidMoves(c);
    vm.forEach(t => moves.push({from: c, to: t}));
  });
  return moves;
}

// ---------- Click handlers attach (works with dataset attributes) ----------
function attachClickHandlers() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.onclick = () => {
      if (!gameStarted || gamePaused || currentPlayer !== 'white') return;

      const owner = getPieceOwner(cell);
      if (!selectedCell) {
        if (owner === 'white') {
          selectedCell = cell;
          const moves = getValidMoves(cell);
          highlightMoves(moves);
        }
      } else {
        const legal = getValidMoves(selectedCell);
        if (legal.includes(cell)) {
          movePiece(selectedCell, cell);
        } else {
          clearHighlights();
          selectedCell = null;
        }
      }
    };
  });
}

// ---------- AI (moderate intelligence) ----------
function aiMakeMove() {
  if (!gameStarted || gamePaused || currentPlayer !== 'black') return;

  const allCells = [...document.querySelectorAll('.cell')];
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black' && getPiece(c));

  const valueMap = { '♔': 10, '♕': 9, '♖': 5, '♗': 3, '♘': 3, '♙': 1 };

  let bestMove = null;
  let bestScore = -Infinity;

  // iterate all possible moves, score captures and safety
  aiPieces.forEach(pieceCell => {
    const moves = getValidMoves(pieceCell);
    moves.forEach(move => {
      let score = 0;
      const targetPiece = getPiece(move);
      if (targetPiece && pieceMap[targetPiece] === 'white') {
        score += (valueMap[targetPiece] || 1) * 10; // strongly favor captures
      }
      // small bonus for advancing forward (towards row 4)
      const dr = parseInt(move.dataset.row) - parseInt(pieceCell.dataset.row);
      score += (dr > 0) ? 0.5 : 0;

      // simulate the move to check if it moves into immediate attack
      const fromText = getPiece(pieceCell);
      const toText = getPiece(move);

      // perform simulation
      pieceCell.textContent = '';
      move.textContent = fromText;
      const danger = [...document.querySelectorAll('.cell')].some(c => {
        if (getPieceOwner(c) === 'white') {
          const vm = getValidMoves(c);
          return vm.includes(move);
        }
        return false;
      });
      // undo
      pieceCell.textContent = fromText;
      move.textContent = toText;

      if (danger) score -= 5; // avoid suicide

      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: pieceCell, to: move };
      }
    });
  });

  if (bestMove) {
    movePiece(bestMove.from, bestMove.to);
  } else {
    // fallback: random legal move
    const allLegal = [];
    aiPieces.forEach(p => getValidMoves(p).forEach(t => allLegal.push({from:p,to:t})));
    if (allLegal.length > 0) {
      const mv = allLegal[Math.floor(Math.random()*allLegal.length)];
      movePiece(mv.from, mv.to);
    } else {
      // no moves -> checkmate handled in movePiece checks or we can show:
      showCheckmate('white');
    }
  }
}

// ---------- Initialization helper to wire UI (call after board created) ----------
function initGameBindings() {
  // attach button handlers if present
  const startEl = document.getElementById('startBtn');
  if (startEl) startEl.onclick = startGame;
  const pauseEl = document.getElementById('pauseBtn');
  if (pauseEl) pauseEl.onclick = pauseGame;
  const resetEl = document.getElementById('resetBtn');
  if (resetEl) resetEl.onclick = () => window.location.reload();

  attachClickHandlers();
}

// call initGameBindings() after your HTML board is created and cells have data-row/data-col
// e.g. createBoard(); initGameBindings();
