// -------------------- Chess Logic JS (5x5 Simplified Version) --------------------

let selectedCell = null;
let currentPlayer = 'white';
let gameStarted = false;
let gamePaused = false;

// -------------------- Piece Mapping --------------------
const pieceMap = {
  '♔': 'white', '♗': 'white', '♘': 'white', '♙': 'white',
  '♚': 'black', '♝': 'black', '♞': 'black', '♟': 'black'
};

// -------------------- Helpers --------------------
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
    const cls = getPiece(t) ? 'capture' : 'highlight';
    t.classList.add(cls);
  });
}

// -------------------- Move Handling --------------------
function movePiece(fromCell, toCell) {
  if (!fromCell || !toCell) return;
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);
  const owner = getPieceOwner(fromCell);

  // Move visually
  toCell.textContent = piece;
  toCell.classList.remove('white-piece','black-piece');
  toCell.classList.add(owner + '-piece');
  fromCell.textContent = '';
  fromCell.classList.remove('white-piece','black-piece');

  logMove(`${currentPlayer.toUpperCase()}: ${piece} ${fromCell.dataset.row}-${fromCell.dataset.col} → ${toCell.dataset.row}-${toCell.dataset.col}${captured ? ' (captured ' + captured + ')' : ''}`);

  // King captured -> checkmate
  if (captured === '♚' || captured === '♔') {
    showCheckmate(currentPlayer);
    return;
  }

  const mover = currentPlayer;
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('turn-indicator').textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  // Checkmate condition
  if (getAllLegalMoves(currentPlayer).length === 0) {
    showCheckmate(mover);
    return;
  }

  // AI move
  if (currentPlayer === 'black') setTimeout(aiMakeMove, 400);
}

// -------------------- Move Generation --------------------
function getValidMoves(cell) {
  if (!cell) return [];
  const piece = getPiece(cell);
  const owner = getPieceOwner(cell);
  if (!piece || !owner) return [];
  const row = parseInt(cell.dataset.row,10);
  const col = parseInt(cell.dataset.col,10);
  const moves = [];
  const addIfLegal = (r,c) => {
    if (!isInBounds(r,c)) return;
    const t = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!t) return;
    if (getPieceOwner(t) !== owner) moves.push(t);
  };

  // Pawns
  if(piece==='♙' && owner==='white'){
    const f=document.querySelector(`[data-row="${row-1}"][data-col="${col}"]`);
    if(f&&!getPiece(f)) moves.push(f);
    [[-1,-1],[-1,1]].forEach(([dr,dc])=>{
      const t=document.querySelector(`[data-row="${row+dr}"][data-col="${col+dc}"]`);
      if(t&&getPieceOwner(t)==='black') moves.push(t);
    });
    return moves;
  }
  if(piece==='♟' && owner==='black'){
    const f=document.querySelector(`[data-row="${row+1}"][data-col="${col}"]`);
    if(f&&!getPiece(f)) moves.push(f);
    [[1,-1],[1,1]].forEach(([dr,dc])=>{
      const t=document.querySelector(`[data-row="${row+dr}"][data-col="${col+dc}"]`);
      if(t&&getPieceOwner(t)==='white') moves.push(t);
    });
    return moves;
  }

  // Knights
  if(piece==='♘'||piece==='♞'){
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>addIfLegal(row+dr,col+dc));
    return moves;
  }

  // Bishops
  if(piece==='♗'||piece==='♝'){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
      let r=row+dr,c=col+dc;
      while(isInBounds(r,c)){
        const t=document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if(!t) break;
        if(!getPiece(t)) moves.push(t);
        else { if(getPieceOwner(t)!==owner) moves.push(t); break; }
        r+=dr;c+=dc;
      }
    });
    return moves;
  }

  // King
  if(piece==='♔'||piece==='♚'){
    for(let dr=-1;dr<=1;dr++){
      for(let dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        addIfLegal(row+dr,col+dc);
      }
    }
    return moves;
  }

  return moves;
}

// -------------------- Collect All Legal Moves --------------------
function getAllLegalMoves(player){
  const all=[...document.querySelectorAll('.cell')];
  const mine=all.filter(c=>getPieceOwner(c)===player);
  const moves=[];
  mine.forEach(c=>getValidMoves(c).forEach(t=>moves.push({from:c,to:t})));
  return moves;
}

// -------------------- Player Click --------------------
function attachClickHandlers(){
  document.querySelectorAll('.cell').forEach(cell=>{
    cell.onclick=()=>{
      if(!gameStarted || gamePaused || currentPlayer!=='white') return;
      const owner=getPieceOwner(cell);
      if(!selectedCell){
        if(owner==='white'){
          selectedCell=cell;
          highlightMoves(getValidMoves(cell));
        }
      } else {
        const legal=getValidMoves(selectedCell);
        if(legal.includes(cell)){
          movePiece(selectedCell,cell);
        } else { clearHighlights(); selectedCell=null; }
      }
    };
  });
}
function movePiece(fromCell, toCell) {
  if (!fromCell || !toCell) return;
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);
  const owner = getPieceOwner(fromCell);

  // Add captured piece to sidebar
  if(captured){
    const capturedDiv = owner==='white' ? document.getElementById('white-captured') : document.getElementById('black-captured');
    const span = document.createElement('span');
    span.textContent = captured;
    span.style.marginRight='5px';
    capturedDiv.appendChild(span);

    // Optional: highlight capture
    toCell.classList.add('capture');
    setTimeout(()=>toCell.classList.remove('capture'),300);
  }

  // Move visually
  toCell.textContent = piece;
  toCell.classList.remove('white-piece','black-piece');
  toCell.classList.add(owner + '-piece');
  fromCell.textContent = '';
  fromCell.classList.remove('white-piece','black-piece');

  logMove(`${currentPlayer.toUpperCase()}: ${piece} ${fromCell.dataset.row}-${fromCell.dataset.col} → ${toCell.dataset.row}-${toCell.dataset.col}${captured ? ' (captured ' + captured + ')' : ''}`);

  // King captured -> checkmate
  if (captured === '♚' || captured === '♔') {
    showCheckmate(currentPlayer);
    return;
  }

  const mover = currentPlayer;
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('turn-indicator').textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  if (getAllLegalMoves(currentPlayer).length === 0) {
    showCheckmate(mover);
    return;
  }

  if (currentPlayer === 'black') setTimeout(aiMakeMove, 400);
}


// Drop-in replacement for aiMakeMove
function aiMakeMove() {
  if (!gameStarted || gamePaused || currentPlayer !== 'black') return;

  // --- lock UI / prevent player clicks during AI computation ---
  const prevGamePaused = gamePaused;
  gamePaused = true;

  // Build list of AI pieces (DOM elements)
  const allCells = [...document.querySelectorAll('.cell')];
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black' && getPiece(c));

  // value map including both white and black unicode symbols
  const valueMap = {
    '♚': 100, '♝': 5, '♞': 3, '♟': 1, // black symbols
    '♔': 100, '♗': 5, '♘': 3, '♙': 1  // white symbols
  };

  let bestMove = null;
  let bestScore = -Infinity;

  // helper: snapshot board text contents (array of {el, text})
  const snapshot = allCells.map(el => ({ el, text: el.textContent }));

  // helper to restore snapshot
  const restoreSnapshot = () => snapshot.forEach(s => { s.el.textContent = s.text; });

  // find white king coords (for distance heuristics)
  const whiteKing = allCells.find(c => getPiece(c) === '♔');
  const whiteKingRow = whiteKing ? parseInt(whiteKing.dataset.row, 10) : null;
  const whiteKingCol = whiteKing ? parseInt(whiteKing.dataset.col, 10) : null;

  // Evaluate every possible AI move (simulate by mutating DOM, then restore)
  for (const p of aiPieces) {
    const piece = getPiece(p);
    const validMoves = getValidMoves(p);

    for (const t of validMoves) {
      // Snapshot is already taken; perform simulated move
      const fromText = getPiece(p);
      const toText = getPiece(t);

      // Simulate (mutate DOM)
      t.textContent = fromText;
      p.textContent = '';

      // Evaluate: build simple metrics using existing helpers (getValidMoves, getPieceOwner, etc.)
      // 1) Capture value
      let score = 0;
      if (toText && pieceMap[toText] === 'white') {
        const targetValue = valueMap[toText] || 1;
        score += targetValue * 40; // heavy weight for capturing
      }

      // 2) Distance to white king (encourage closing)
      if (whiteKing) {
        const tr = parseInt(t.dataset.row, 10);
        const tc = parseInt(t.dataset.col, 10);
        const pr = parseInt(p.dataset.row, 10);
        const pc = parseInt(p.dataset.col, 10);
        const prevDist = Math.abs(pr - whiteKingRow) + Math.abs(pc - whiteKingCol);
        const newDist = Math.abs(tr - whiteKingRow) + Math.abs(tc - whiteKingCol);
        if (newDist < prevDist) score += 6;   // meaningful bonus for moving closer
        else if (newDist > prevDist) score -= 1; // small penalty for moving away
      }

      // 3) Mobility (number of legal moves after the move)
      const futureAll = [...document.querySelectorAll('.cell')];
      const futureAiCount = futureAll.filter(c => getPieceOwner(c) === 'black' && getPiece(c)).length;
      // Slight mobility bonus: count legal moves for the moved piece
      const movedPieceMoves = getValidMoves(t).length;
      score += movedPieceMoves * 0.7;

      // 4) Avoid moving into immediate capture: if any white move captures this new square, penalize
      const underAttack = futureAll.some(c => getPieceOwner(c) === 'white' && getValidMoves(c).includes(t));
      if (underAttack) {
        // allow capture-into if capturing a high-value piece, otherwise penalize
        if (toText && pieceMap[toText] === 'white') {
          // reward capturing even if under attack, but less
          score += (valueMap[toText] || 1) * 6;
        } else {
          score -= (valueMap[piece] || 1) * 8;
        }
      }

      // 5) King safety: if AI king becomes attacked, heavy penalty
      const futureAiPieces = futureAll.filter(c => getPieceOwner(c) === 'black' && getPiece(c));
      const kingCell = futureAiPieces.find(c => getPiece(c) === '♚');
      if (kingCell) {
        const kingUnderAttack = futureAll.some(c => getPieceOwner(c) === 'white' && getValidMoves(c).includes(kingCell));
        if (kingUnderAttack) score -= 1000;
      }

      // 6) Support factor: friendly neighbors give small bonus
      const supportDirs = [[-1,0],[1,0],[0,-1],[0,1]];
      let support = 0;
      supportDirs.forEach(([dr,dc])=>{
        const r = parseInt(t.dataset.row,10) + dr;
        const c2 = parseInt(t.dataset.col,10) + dc;
        if (isInBounds(r,c2)) {
          const neighbor = document.querySelector(`[data-row="${r}"][data-col="${c2}"]`);
          if (neighbor && getPieceOwner(neighbor) === 'black') support += 0.45;
        }
      });
      score += support;

      // 7) tiny randomness to avoid deterministic play
      score += Math.random() * 0.35;

      // Save best move
      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: p, to: t, score };
      }

      // Restore snapshot for next simulation
      restoreSnapshot();
    }
  }

  // If no move chosen (should not happen unless stalemate), fallback
  if (!bestMove) {
    const fallback = [];
    aiPieces.forEach(p => {
      const valid = getValidMoves(p);
      valid.forEach(t => fallback.push({ from: p, to: t }));
    });
    if (fallback.length === 0) {
      showCheckmate('white');
      gamePaused = prevGamePaused;
      return;
    }
    bestMove = fallback[Math.floor(Math.random() * fallback.length)];
  }

  // Execute chosen move (actual game move)
  if (bestMove) {
    movePiece(bestMove.from, bestMove.to);
  }

  // unlock UI
  gamePaused = prevGamePaused;
}

  // -------------------- Execute Chosen Move --------------------
  if (bestMove) movePiece(bestMove.from, bestMove.to);
}


// -------------------- Checkmate Overlay --------------------
function showCheckmate(winner){
  gameStarted=false;
  const overlay=document.createElement('div');
  overlay.id='checkmate-overlay';
  Object.assign(overlay.style,{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)', zIndex:9999, color:'#0ff', fontSize:'clamp(1.5rem,3vw,3rem)', textAlign:'center', flexDirection:'column', gap:'1rem' });
  overlay.innerHTML=`
    <div style="padding:20px 30px; border:3px solid #0ff; box-shadow:0 0 30px #0ff; border-radius:12px;">
      <div style="font-weight:900;">♟ CHECKMATE</div>
      <div style="margin-top:8px;">${winner.toUpperCase()} WINS</div>
      <button id="cm-restart" style="margin-top:12px;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;font-weight:bold;">Restart</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('cm-restart').onclick=()=>window.location.reload();
}

// -------------------- Logging --------------------
function logMove(text){
  const log=document.getElementById('move-history');
  const li=document.createElement('li');
  li.textContent=text;
  log.appendChild(li);
  log.scrollTop=log.scrollHeight;
}

// -------------------- Initialization --------------------
function initGameBindings(){
  attachClickHandlers();
  document.getElementById('startBtn').onclick = () => {
    gameStarted=true; gamePaused=false; currentPlayer='white';
    document.getElementById('turn-indicator').textContent="WHITE's turn ♔";
  };
  document.getElementById('pauseBtn').onclick = () => { gamePaused=true; document.getElementById('turn-indicator').textContent="Game Paused"; };
  document.getElementById('resetBtn').onclick = () => window.location.reload();
}

// -------------------- Run --------------------
initGameBindings();
