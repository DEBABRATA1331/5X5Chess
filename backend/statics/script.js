// -------------------- Chess Logic JS (Fixed) --------------------

let selectedCell = null;
let currentPlayer = 'white';
let gameStarted = false;
let gamePaused = false;

const pieceMap = {
  '♔': 'white', '♕': 'white', '♖': 'white', '♗': 'white', '♘': 'white', '♙': 'white',
  '♚': 'black', '♛': 'black', '♜': 'black', '♝': 'black', '♞': 'black', '♟': 'black'
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

// -------------------- Game Control --------------------
function startGame() {
  gameStarted = true;
  gamePaused = false;
  document.getElementById('status').textContent = "Game Started — White’s turn ♔";
}

function pauseGame() {
  gamePaused = true;
  document.getElementById('status').textContent = "Game Paused ⏸️";
}

// -------------------- Move & Logging --------------------
function logMove(text) {
  const log = document.getElementById('move-history');
  log.textContent += text + '\n';
  log.scrollTop = log.scrollHeight;
}

function showCheckmate(winner) {
  gameStarted = false;
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

// -------------------- Core Move --------------------
function movePiece(fromCell, toCell) {
  if (!fromCell || !toCell) return;
  const piece = getPiece(fromCell);
  const captured = getPiece(toCell);
  const owner = getPieceOwner(fromCell);

  // move visually
  toCell.textContent = piece;
  toCell.classList.remove('white-piece','black-piece');
  toCell.classList.add(owner + '-piece');

  fromCell.textContent = '';
  fromCell.classList.remove('white-piece','black-piece');

  logMove(`${currentPlayer.toUpperCase()}: ${piece} ${fromCell.dataset.row}-${fromCell.dataset.col} → ${toCell.dataset.row}-${toCell.dataset.col}${captured ? ' (captured ' + captured + ')' : ''}`);

  // king captured -> checkmate
  if (captured === '♚' || captured === '♔') {
    showCheckmate(currentPlayer);
    return;
  }

  // switch player
  const mover = currentPlayer;
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  document.getElementById('status').textContent = `${currentPlayer.toUpperCase()}'s turn`;

  clearHighlights();
  selectedCell = null;

  // opponent has no legal moves -> checkmate
  if (getAllLegalMoves(currentPlayer).length === 0) {
    showCheckmate(mover);
    return;
  }

  // AI move if black
  if (currentPlayer === 'black') {
    setTimeout(aiMakeMove, 500);
  }
}

// -------------------- Valid Moves --------------------
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

  // Pawn
  if (piece==='♙' && owner==='white') {
    const f = document.querySelector(`[data-row="${row-1}"][data-col="${col}"]`);
    if(f && !getPiece(f)) moves.push(f);
    [[-1,-1],[-1,1]].forEach(([dr,dc])=>{
      const t=document.querySelector(`[data-row="${row+dr}"][data-col="${col+dc}"]`);
      if(t && getPieceOwner(t)==='black') moves.push(t);
    });
    return moves;
  }
  if (piece==='♟' && owner==='black') {
    const f=document.querySelector(`[data-row="${row+1}"][data-col="${col}"]`);
    if(f && !getPiece(f)) moves.push(f);
    [[1,-1],[1,1]].forEach(([dr,dc])=>{
      const t=document.querySelector(`[data-row="${row+dr}"][data-col="${col+dc}"]`);
      if(t && getPieceOwner(t)==='white') moves.push(t);
    });
    return moves;
  }

  // Knight
  if(piece==='♘' || piece==='♞') {
    const km=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    km.forEach(([dr,dc])=>addIfLegal(row+dr,col+dc));
    return moves;
  }

  // Bishop
  if(piece==='♗' || piece==='♝') {
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
      let r=row+dr,c=col+dc;
      while(isInBounds(r,c)){
        const t=document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if(!t) break;
        if(!getPiece(t)) moves.push(t);
        else { if(getPieceOwner(t)!==owner)moves.push(t); break; }
        r+=dr;c+=dc;
      }
    });
    return moves;
  }

  // Rook
  if(piece==='♖' || piece==='♜') {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
      let r=row+dr,c=col+dc;
      while(isInBounds(r,c)){
        const t=document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if(!t) break;
        if(!getPiece(t)) moves.push(t);
        else { if(getPieceOwner(t)!==owner)moves.push(t); break; }
        r+=dr;c+=dc;
      }
    });
    return moves;
  }

  // Queen
  if(piece==='♕' || piece==='♛') {
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>{
      let r=row+dr,c=col+dc;
      while(isInBounds(r,c)){
        const t=document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if(!t) break;
        if(!getPiece(t)) moves.push(t);
        else { if(getPieceOwner(t)!==owner)moves.push(t); break; }
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

// -------------------- All Legal Moves --------------------
function getAllLegalMoves(player){
  const all=[...document.querySelectorAll('.cell')];
  const mine=all.filter(c=>getPieceOwner(c)===player);
  const moves=[];
  mine.forEach(c=>getValidMoves(c).forEach(t=>moves.push({from:c,to:t})));
  return moves;
}

// -------------------- Click Handlers --------------------
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

// -------------------- AI Move --------------------
function aiMakeMove(){
  if(!gameStarted || gamePaused || currentPlayer!=='black') return;
  const all=[...document.querySelectorAll('.cell')];
  const aiPieces=all.filter(c=>getPieceOwner(c)==='black' && getPiece(c));

  const valueMap={'♔':10,'♕':9,'♖':5,'♗':3,'♘':3,'♙':1};
  let bestMove=null; let bestScore=-Infinity;

  aiPieces.forEach(p=>{
    getValidMoves(p).forEach(t=>{
      let score=0;
      const target=getPiece(t);
      if(target && pieceMap[target]==='white') score+=(valueMap[target]||1)*10;
      const dr=parseInt(t.dataset.row)-parseInt(p.dataset.row);
      if(dr>0) score+=0.5;
      const fromText=getPiece(p),toText=getPiece(t);
      p.textContent=''; t.textContent=fromText;
      const danger=[...document.querySelectorAll('.cell')].some(c=>getPieceOwner(c)==='white' && getValidMoves(c).includes(t));
      p.textContent=fromText; t.textContent=toText;
      if(danger) score-=5;
      if(score>bestScore){ bestScore=score; bestMove={from:p,to:t}; }
    });
  });

  if(bestMove) movePiece(bestMove.from,bestMove.to);
  else {
    const allLegal=[]; aiPieces.forEach(p=>getValidMoves(p).forEach(t=>allLegal.push({from:p,to:t})));
    if(allLegal.length>0) movePiece(allLegal[Math.floor(Math.random()*allLegal.length)].from,allLegal[Math.floor(Math.random()*allLegal.length)].to);
    else showCheckmate('white');
  }
}

// -------------------- Init Bindings --------------------
function initGameBindings(){
  const start=document.getElementById('startBtn');
  if(start) start.onclick=startGame;
  const pause=document.getElementById('pauseBtn');
  if(pause) pause.onclick=pauseGame;
  const reset=document.getElementById('resetBtn');
  if(reset) reset.onclick=()=>window.location.reload();
  attachClickHandlers();
}
