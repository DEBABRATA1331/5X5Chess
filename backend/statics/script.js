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


// -------------------- AI Move with Piece Safety & Strategy --------------------
function aiMakeMove() {
  if (!gameStarted || gamePaused || currentPlayer !== 'black') return;

  const allCells = [...document.querySelectorAll('.cell')];
  const aiPieces = allCells.filter(c => getPieceOwner(c) === 'black' && getPiece(c));
  const valueMap = { '♚': 10, '♝': 4, '♞': 3, '♟': 1 };

  let bestMove = null;
  let bestScore = -Infinity;

  aiPieces.forEach(p => {
    const piece = getPiece(p);
    const validMoves = getValidMoves(p);

    validMoves.forEach(t => {
      const fromText = getPiece(p);
      const toText = getPiece(t);
      t.textContent = fromText;
      p.textContent = '';

      // Evaluate danger for all AI pieces
      const underAttack = [...allCells].some(c => getPieceOwner(c) === 'white' && getValidMoves(c).includes(t));
      // Evaluate king safety
      const kingCell = aiPieces.find(c => getPiece(c) === '♚');
      const kingSafe = ![...allCells].some(c => getPieceOwner(c) === 'white' && getValidMoves(c).includes(kingCell));

      // Undo simulation
      t.textContent = toText;
      p.textContent = fromText;

      // Base score
      let score = 0;
      if (toText && pieceMap[toText] === 'white') score += (valueMap[toText] || 1) * 10; // capture value
      const dr = parseInt(t.dataset.row) - parseInt(p.dataset.row);
      if (dr > 0) score += 0.5; // forward preference
      score += Math.random() * 0.5; // human-like randomness

      // Penalize dangerous moves, more for higher-value pieces
      if (underAttack) score -= (valueMap[piece] || 1) * 2;

      // Skip move if king is endangered
      if (!kingSafe) return;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: p, to: t };
      }
    });
  });

  // Fallback: if no “safe” moves, pick any legal move to avoid freeze
  if (!bestMove) {
    const allLegal = [];
    aiPieces.forEach(p => getValidMoves(p).forEach(t => allLegal.push({ from: p, to: t })));
    if (allLegal.length > 0) {
      bestMove = allLegal[Math.floor(Math.random() * allLegal.length)];
    } else {
      showCheckmate('white');
      return;
    }
  }

  // Execute chosen move
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
