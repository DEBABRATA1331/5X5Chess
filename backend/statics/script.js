// ============================
// 5x5 Neon Mini Chess - Merged JS
// Full merged JavaScript file with:
// - original game logic (your version)
// - added snapshot/restore helpers
// - player-move validation (prevent moving into check)
// - 2-ply minimax-style AI (safe, with lookahead & evaluation)
// - board initialization (5x5) with requested piece layout
// - start / pause / reset bindings
// - no content removed from original; improved AI replaces older aiMakeMove
// ============================

/* -------------------- Game State -------------------- */
let selectedCell = null;
let currentPlayer = 'white';
let gameStarted = false;
let gamePaused = false;

/* -------------------- Piece Mapping -------------------- */
const pieceMap = {
  '♔': 'white', '♗': 'white', '♘': 'white', '♙': 'white',
  '♚': 'black', '♝': 'black', '♞': 'black', '♟': 'black'
};

/* -------------------- Board / Setup -------------------- */
/*
  We will dynamically create the 5x5 board and attach dataset row/col attributes.
  Initial setup (per your request):
  - White bottom row (row 4): ['♙','♘','♕','♗','♙']
  - Black top row (row 0): mirror order -> we'll use black symbols corresponding to white
*/
const boardSize = 5;
const WHITE_SETUP = ['♙', '♘', '♕', '♗', '♙'];
// Mirror for black (we use black unicode pawn/knight/queen/bishop/pawn corresponding)
const BLACK_SETUP = ['♟', '♞', '♛', '♝', '♟'];

/* We'll create board cells in DOM. Expects <div id="chessboard"></div> in HTML */
function createBoardDOM() {
  const board = document.getElementById('chessboard');
  if (!board) throw new Error('Element with id "chessboard" not found.');
  board.innerHTML = '';
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      // initial pieces
      if (r === 0) {
        cell.textContent = BLACK_SETUP[c] || '';
        if (cell.textContent) cell.classList.add('black-piece');
      } else if (r === boardSize - 1) {
        cell.textContent = WHITE_SETUP[c] || '';
        if (cell.textContent) cell.classList.add('white-piece');
      }
      board.appendChild(cell);
    }
  }
}

/* -------------------- Basic Helpers -------------------- */
function getPiece(cell) {
  return cell ? (cell.textContent || '').trim() : '';
}
function getPieceOwner(cell) {
  const p = getPiece(cell);
  return pieceMap[p] || null;
}
function isInBounds(r, c) {
  return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}

/* -------------------- Highlighting Helpers -------------------- */
function clearHighlights() {
  document.querySelectorAll('.cell').forEach(c => {
    c.classList.remove('highlight', 'capture', 'selected', 'valid-move', 'valid-capture');
  });
}
function highlightMoves(moves) {
  clearHighlights();
  moves.forEach(t => {
    if (!t) return;
    const cls = getPiece(t) ? 'capture' : 'highlight';
    t.classList.add(cls);
  });
}

/* -------------------- Move Logging -------------------- */
function logMove(text) {
  const log = document.getElementById('move-history');
  if (!log) return;
  const li = document.createElement('li');
  li.textContent = text;
  log.appendChild(li);
  log.scrollTop = log.scrollHeight;
}

/* -------------------- Snapshot / Simulation Helpers -------------------- */
/*
  snapshotBoard() returns an array of objects { el, text, classes } — fast DOM snapshot.
  restoreBoard(snapshot) restores the state.
*/
function snapshotBoard() {
  return [...document.querySelectorAll('.cell')].map(el => ({
    el,
    text: el.textContent,
    classes: el.className
  }));
}
function restoreBoard(snap) {
  snap.forEach(s => {
    s.el.textContent = s.text;
    s.el.className = s.classes;
  });
}

/* Simulate a DOM move (mutates DOM). Caller should call snapshotBoard() before simulation and restoreBoard() after.
   Returns the captured piece (string) if any. */
function simulateMove(fromEl, toEl) {
  const fromText = fromEl.textContent;
  const toText = toEl.textContent;
  const fromClasses = fromEl.className;
  const toClasses = toEl.className;

  // perform move
  toEl.textContent = fromText;
  toEl.className = fromClasses; // keep class so owner inference works for simulated getValidMoves
  fromEl.textContent = '';
  fromEl.className = 'cell';

  return toText || '';
}

/* -------------------- King-in-Check Detector -------------------- */
/* side: 'white' or 'black' */
function isKingInCheck(side) {
  const all = [...document.querySelectorAll('.cell')];
  const kingChar = side === 'white' ? '♔' : '♚';
  const kingCell = all.find(c => getPiece(c) === kingChar);
  if (!kingCell) return false; // if king absent, treat as no-check here (game over handled elsewhere)
  return all.some(c => {
    const owner = getPieceOwner(c);
    if (!owner) return false;
    if (owner === side) return false;
    const moves = getValidMoves(c);
    return moves.includes(kingCell);
  });
}

/* -------------------- Static Evaluator (for 2-ply) -------------------- */
const EVAL_VALUES = {
  '♚': 200, '♝': 5, '♞': 3, '♟': 1,
  '♔': 200, '♗': 5, '♘': 3, '♙': 1
};
// Positive -> good for black (AI), Negative -> good for white (player)
function evaluateBoard() {
  let score = 0;
  const all = [...document.querySelectorAll('.cell')];
  all.forEach(c => {
    const p = getPiece(c);
    if (!p) return;
    const val = EVAL_VALUES[p] || 0;
    const owner = getPieceOwner(c);
    score += owner === 'black' ? val : -val;
  });
  // mobility small factor
  const blackMoves = getAllLegalMoves('black').length;
  const whiteMoves = getAllLegalMoves('white').length;
  score += (blackMoves - whiteMoves) * 0.12;
  return score;
}

/* -------------------- Move Generation (your original functions) -------------------- */
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
    const t = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!t) return;
    if (getPieceOwner(t) !== owner) moves.push(t);
  };

  // Pawns
  if (piece === '♙' && owner === 'white') {
    const f = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
    if (f && !getPiece(f)) moves.push(f);
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

  // Knights
  if (piece === '♘' || piece === '♞') {
    [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => addIfLegal(row + dr, col + dc));
    return moves;
  }

  // Bishops
  if (piece === '♗' || piece === '♝') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInBounds(r, c)) {
        const t = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!t) break;
        if (!getPiece(t)) moves.push(t);
        else { if (getPieceOwner(t) !== owner) moves.push(t); break; }
        r += dr; c += dc;
      }
    });
    return moves;
  }

  // King
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

function getAllLegalMoves(player) {
  const all = [...document.querySelectorAll('.cell')];
  const mine = all.filter(c => getPieceOwner(c) === player);
  const moves = [];
  mine.forEach(c => getValidMoves(c).forEach(t => moves.push({ from: c, to: t })));
  return moves;
}

/* -------------------- Player click handling and validation -------------------- */
/* We'll integrate validatePlayerMove into the click flow so user can't move into check. */

function validatePlayerMove(fromEl, toEl) {
  if (!fromEl || !toEl) return false;
  const snap = snapshotBoard();
  simulateMove(fromEl, toEl);
  const leavesInCheck = isKingInCheck('white');
  restoreBoard(snap);
  if (leavesInCheck) {
    // UI feedback: brief flash & alert
    toEl.classList.add('capture');
    setTimeout(() => toEl.classList.remove('capture'), 200);
    alert('Invalid move: your king would be in check.');
    return false;
  }
  return true;
}

function attachClickHandlers() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.onclick = () => {
      if (!gameStarted || gamePaused || currentPlayer !== 'white') return;
      const owner = getPieceOwner(cell);
      if (!selectedCell) {
        if (owner === 'white') {
          selectedCell = cell;
          cell.classList.add('selected');
          highlightMoves(getValidMoves(cell));
        }
      } else {
        const legal = getValidMoves(selectedCell);
        if (legal.includes(cell)) {
          // validate player's move so they don't put their king into check
          if (validatePlayerMove(selectedCell, cell)) {
            // slight UX: remove selected highlight before moving
            selectedCell.classList.remove('selected');
            movePiece(selectedCell, cell);
          } else {
            // invalid: keep selection? We'll clear to be clean
            clearHighlights();
            selectedCell = null;
          }
        } else {
          clearHighlights();
          selectedCell = null;
        }
      }
    };
  });
}

/* -------------------- Move Piece (original + captured sidebar) -------------------- */
function movePiece(fromCell, toCell) {
  if (!fromCell || !toCell) return;
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);
  const owner = getPieceOwner(fromCell);

  // Add captured piece to sidebar if exists
  try {
    if (captured) {
      const capturedDiv = owner === 'white' ? document.getElementById('white-captured') : document.getElementById('black-captured');
      if (capturedDiv) {
        const span = document.createElement('span');
        span.textContent = captured;
        span.style.marginRight = '5px';
        capturedDiv.appendChild(span);
      }
      // Optional: highlight capture
      toCell.classList.add('capture');
      setTimeout(() => toCell.classList.remove('capture'), 300);
    }
  } catch (e) {
    // ignore if capture panels are missing
    // console.warn('capture panel missing', e);
  }

  // Move visually
  toCell.textContent = piece;
  toCell.classList.remove('white-piece', 'black-piece');
  if (owner) toCell.classList.add(owner + '-piece');
  fromCell.textContent = '';
  fromCell.classList.remove('white-piece', 'black-piece');

  logMove(`${currentPlayer.toUpperCase()}: ${piece} ${fromCell.dataset.row}-${fromCell.dataset.col} → ${toCell.dataset.row}-${toCell.dataset.col}${captured ? ' (captured ' + captured + ')' : ''}`);

  // King captured -> checkmate
  if (captured === '♚' || captured === '♔') {
    showCheckmate(currentPlayer);
    return;
  }

  const mover = currentPlayer;
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) turnIndicator.textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  // Checkmate condition
  if (getAllLegalMoves(currentPlayer).length === 0) {
    showCheckmate(mover);
    return;
  }

  // AI move scheduling
  if (currentPlayer === 'black') {
    setTimeout(() => {
      try { aiMakeMove(); } catch (e) { console.error('AI error', e); }
    }, 400);
  }
}

/* -------------------- Checkmate Overlay -------------------- */
function showCheckmate(winner) {
  gameStarted = false;
  const overlay = document.createElement('div');
  overlay.id = 'checkmate-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)', zIndex: 9999, color: '#0ff',
    fontSize: 'clamp(1.5rem,3vw,3rem)', textAlign: 'center',
    flexDirection: 'column', gap: '1rem'
  });
  overlay.innerHTML = `
    <div style="padding:20px 30px; border:3px solid #0ff; box-shadow:0 0 30px #0ff; border-radius:12px;">
      <div style="font-weight:900;">♟ CHECKMATE</div>
      <div style="margin-top:8px;">${winner.toUpperCase()} WINS</div>
      <button id="cm-restart" style="margin-top:12px;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;font-weight:bold;">Restart</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('cm-restart').onclick = () => window.location.reload();
}

/* -------------------- Initialization & Bindings -------------------- */
function initGameBindings() {
  // initialize DOM board
  createBoardDOM();

  // attach handlers to freshly created cells
  attachClickHandlers();

  // control buttons (start/pause/reset)
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const turnIndicator = document.getElementById('turn-indicator');

  if (startBtn) startBtn.onclick = () => {
    gameStarted = true; gamePaused = false; currentPlayer = 'white';
    if (turnIndicator) turnIndicator.textContent = "WHITE's turn ♔";
    // enable clicking (attach handlers again to ensure)
    attachClickHandlers();
  };
  if (pauseBtn) pauseBtn.onclick = () => {
    gamePaused = true;
    if (turnIndicator) turnIndicator.textContent = "Game Paused";
  };
  if (resetBtn) resetBtn.onclick = () => {
    // reset state, re-create board and clear logs
    gameStarted = false; gamePaused = false; currentPlayer = 'white';
    const log = document.getElementById('move-history');
    if (log) log.innerHTML = '';
    const overlay = document.getElementById('checkmate-overlay');
    if (overlay) overlay.remove();
    createBoardDOM();
    if (turnIndicator) turnIndicator.textContent = "Press Start to Begin";
  };
}

/* -------------------- AI: 2-ply Minimax-like with Safety -------------------- */
/*
  This function replaces previous simpler AI. It:
  - takes snapshot of board,
  - simulates each black move,
  - discards moves that leave black king in check,
  - for each surviving black move, simulates all legal white replies,
  - uses evaluateBoard() to score resulting positions and picks the black move
    which maximizes the minimal evaluation (worst-case after white best reply).
  - always avoids moving into check, and chooses safe fallback if needed.
*/
function aiMakeMove() {
  if (!gameStarted || gamePaused || currentPlayer !== 'black') return;

  const prevGamePaused = gamePaused;
  gamePaused = true; // lock UI

  const allCells = [...document.querySelectorAll('.cell')];
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black' && getPiece(c));

  const valueMap = { '♚': 100, '♝': 5, '♞': 3, '♟': 1, '♔': 100, '♗': 5, '♘': 3, '♙': 1 };

  let bestMove = null;
  let bestScore = -Infinity;

  const globalSnapshot = snapshotBoard();

  // iterate AI pieces and their moves
  for (const p of aiPieces) {
    const validMoves = getValidMoves(p);
    for (const t of validMoves) {
      const snap1 = snapshotBoard();
      const captured = simulateMove(p, t);

      // if this move leaves black king in check, discard
      if (isKingInCheck('black')) {
        restoreBoard(snap1);
        continue;
      }

      // immediate heuristics (capture bonus)
      let scoreAfterBlack = 0;
      if (captured && pieceMap[captured] === 'white') {
        scoreAfterBlack += (valueMap[captured] || 1) * 30;
      }
      // baseline evaluation
      scoreAfterBlack += evaluateBoard();

      // White's possible replies
      let worstScoreForBlack = Infinity;
      const whiteMoves = getAllLegalMoves('white');

      if (whiteMoves.length === 0) {
        // If white has no moves: check if white is in check (mate) or stalemate
        if (isKingInCheck('white')) {
          worstScoreForBlack = -Infinity; // black delivered mate -> extremely good for black
        } else {
          worstScoreForBlack = evaluateBoard();
        }
      } else {
        // simulate each white reply and evaluate
        for (const wm of whiteMoves) {
          const snap2 = snapshotBoard();
          simulateMove(wm.from, wm.to);

          // skip illegal white replies that leave king in check
          if (isKingInCheck('white')) {
            restoreBoard(snap2);
            continue;
          }

          const ev = evaluateBoard();
          if (ev < worstScoreForBlack) worstScoreForBlack = ev;
          restoreBoard(snap2);
        }
        if (!isFinite(worstScoreForBlack)) worstScoreForBlack = evaluateBoard();
      }

      // combine heuristics and minimax result
      const combinedScore = (scoreAfterBlack * 0.6) + (worstScoreForBlack * 0.4);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMove = { from: p, to: t, score: combinedScore };
      }

      restoreBoard(snap1);
    }
  }

  // fallback: if no bestMove set, collect safe moves or random
  if (!bestMove) {
    const fallbacks = [];
    aiPieces.forEach(p => {
      const val = getValidMoves(p);
      val.forEach(t => fallbacks.push({ from: p, to: t }));
    });

    if (fallbacks.length === 0) {
      // no legal moves => white won (or stalemate)
      showCheckmate('white');
      gamePaused = prevGamePaused;
      restoreBoard(globalSnapshot);
      return;
    }

    // prefer first safe fallback (doesn't leave king in check)
    for (const mv of fallbacks) {
      const snap = snapshotBoard();
      simulateMove(mv.from, mv.to);
      const safe = !isKingInCheck('black');
      restoreBoard(snap);
      if (safe) { bestMove = mv; break; }
    }

    if (!bestMove) bestMove = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // execute chosen move (if any)
  if (bestMove) {
    movePiece(bestMove.from, bestMove.to);
  }

  // restore snapshot (safety) and unlock
  restoreBoard(globalSnapshot);
  gamePaused = prevGamePaused;
}

/* -------------------- Small helper to prevent user from placing king into immediate checkmate at startup
   (if you want to prevent user from manually dragging/placing pieces into illegal positions).
   For our use-case, validatePlayerMove will handle user moves during normal play. If you have
   an editor mode where the user sets pieces, you'd call validateBoardSetup() after positions are set. */
function validateBoardSetup() {
  // If white king is in check at setup, warn and block starting
  if (isKingInCheck('white')) {
    alert('Invalid starting position: White king is in check. Fix the position before starting.');
    return false;
  }
  if (isKingInCheck('black')) {
    alert('Invalid starting position: Black king is in check. Fix the position before starting.');
    return false;
  }
  return true;
}

/* -------------------- Initialization Run -------------------- */
(function boot() {
  // Create the board & bindings
  try {
    createBoardDOM();
  } catch (e) {
    console.error('Failed to create board DOM:', e);
  }
  initGameBindings();
  // optionally run validateBoardSetup() here to ensure no king is in check before start
})();
