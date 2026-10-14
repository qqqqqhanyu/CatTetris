const test=require('node:test');
const assert=require('node:assert/strict');
const {Game,cells,MATRICES,SHAPES,SPAWN_ROTATIONS}=require('../engine.js');
const dummy=(id=999)=>({type:'O',rotation:0,tx:0,ty:0,id});
const started=()=>{const g=new Game(()=>.5);g.start();return g;};
test('each rotation of each tetromino occupies exactly four cells',()=>{
  for(const type of Object.keys(SHAPES))for(let rotation=0;rotation<4;rotation++){
    const c=cells({type,rotation,x:0,y:0});assert.equal(c.length,4);assert.equal(new Set(c.map(p=>p.x+','+p.y)).size,4);
  }
});
test('7-bag contains all seven pieces exactly once',()=>{
  const g=new Game(()=>.37),sequence=[];
  for(let i=0;i<70;i++){sequence.push(g.queue.shift());g.fillQueue();}
  for(let i=0;i<70;i+=7)assert.equal(new Set(sequence.slice(i,i+7)).size,7);
});
test('start and reset initialize a clean playable board',()=>{
  const g=started();assert.equal(g.status,'playing');assert.equal(g.board.length,22);assert.ok(g.fits(g.active));
  g.hardDrop();g.start();assert.equal(g.score,0);assert.equal(g.lines,0);assert.equal(g.held,null);assert.ok(g.board.flat().every(x=>!x));
});
test('walls, floor, hidden ceiling, and settled blocks prevent overlap',()=>{
  const g=started(),p={type:'O',rotation:0,x:0,y:0};
  assert.ok(g.fits(p));for(const bad of [{x:-1},{x:9},{y:19},{y:-3}])assert.ok(!g.fits({...p,...bad}));
  g.board[2][0]=dummy();assert.ok(!g.fits(p));
});
test('four clockwise or counterclockwise rotations return to the original position',()=>{
  for(const type of Object.keys(SHAPES).filter(t=>t!=='O'))for(const dir of [1,-1]){
    const g=started();g.active={type,rotation:0,x:3,y:5,id:1};const original={...g.active};
    for(let i=0;i<4;i++)assert.ok(g.rotate(dir));assert.deepEqual(g.active,original);
  }
});
test('SRS wall kick rotates a T piece out of the left wall',()=>{
  const g=started();g.active={type:'T',rotation:1,x:-1,y:5,id:1};assert.ok(g.fits(g.active));
  assert.ok(g.rotate(1));assert.equal(g.active.x,0);assert.equal(g.active.rotation,2);assert.ok(g.fits(g.active));
});
test('I piece uses its separate two-cell wall kick',()=>{
  const g=started();g.active={type:'I',rotation:1,x:-2,y:5,id:1};assert.ok(g.fits(g.active));
  assert.ok(g.rotate(-1));assert.equal(g.active.x,0);assert.equal(g.active.rotation,0);
});
test('O piece rotation does not change its position',()=>{
  const g=started();g.active={type:'O',rotation:0,x:4,y:5,id:1};const before={...g.active};g.rotate();assert.deepEqual(g.active,before);
});
test('hard drop agrees with ghost, awards two points per cell, and locks four tiles',()=>{
  const g=started(),ghost=g.ghost(),distance=ghost.y-g.active.y,id=g.active.id;
  assert.ok(g.fits(ghost));assert.ok(!g.fits({...ghost,y:ghost.y+1}));g.hardDrop();
  assert.equal(g.score,distance*2);assert.equal(g.board.flat().filter(Boolean).length,4);assert.notEqual(g.active.id,id);
});
test('soft drop awards one point only when movement succeeds',()=>{
  const g=started();g.move(0,1,true);assert.equal(g.score,1);g.active=g.ghost();g.move(0,1,true);assert.equal(g.score,1);
});
test('hold allowed once per piece; swap resets orientation and spawn position',()=>{
  const g=started(),first=g.active.type;assert.ok(g.hold());assert.equal(g.held,first);
  assert.equal(g.hold(),false);g.hardDrop();assert.equal(g.holdUsed,false);
  g.rotate();assert.ok(g.hold());assert.equal(g.active.type,first);assert.equal(g.active.rotation,SPAWN_ROTATIONS[first]);assert.equal(g.active.y,-1);
});
test('single line clear shifts surviving tiles down with texture metadata intact',()=>{
  const g=started();g.active={type:'I',rotation:0,x:3,y:18,id:1};
  for(let x=0;x<10;x++)if(x<3||x>6)g.board[21][x]=dummy();
  const fragment={type:'J',rotation:3,tx:1,ty:2,id:7};g.board[20][0]=fragment;g.lock();
  assert.equal(g.lines,1);assert.equal(g.score,100);assert.equal(g.board[21][0],fragment);assert.equal(g.board.flat().filter(Boolean).length,1);
});
function setupFour(g){g.board=Array.from({length:22},()=>Array(10).fill(null));g.active={type:'I',rotation:1,x:1,y:16,id:1};for(let y=18;y<22;y++)for(let x=0;x<10;x++)if(x!==3)g.board[y][x]=dummy();g.board[17][0]=dummy(80);}
test('four-row clear, back-to-back, and combo scores accumulate',()=>{
  const g=started();setupFour(g);g.lock();assert.equal(g.score,800);assert.equal(g.lines,4);
  setupFour(g);g.lock();assert.equal(g.score,800+1200+50);assert.equal(g.lines,8);
});
test('all-clear bonus applies when the board becomes empty',()=>{
  const g=started();setupFour(g);g.board[17][0]=null;g.lock();assert.equal(g.score,2800);assert.ok(g.board.flat().every(c=>!c));
});
test('level increases every ten cleared rows and gravity becomes faster',()=>{
  const g=started(),interval=g.interval;g.lines=9;setupFour(g);g.lock();assert.equal(g.level,2);assert.equal(g.lines,13);assert.ok(g.interval<interval);
});
test('grounded piece waits 500ms before locking',()=>{
  const g=started();g.active=g.ghost();const id=g.active.id;
  for(let i=0;i<4;i++)g.update(100);assert.equal(g.active.id,id);g.update(100);assert.notEqual(g.active.id,id);
});
test('grounded movement cannot reset lock delay more than 15 times',()=>{
  const g=started();g.active={type:'O',rotation:0,x:4,y:18,id:1};
  for(let i=0;i<20;i++){g.move(i%2?-1:1);g.update(10);}
  assert.equal(g.lockResets,15);assert.ok(g.lockTimer>=60);
});
test('pause blocks gravity, movement, rotation, drop, and hold',()=>{
  const g=started();g.pause();const before=JSON.stringify({active:g.active,board:g.board,score:g.score,held:g.held});
  g.update(100);g.move(1);g.rotate();g.hardDrop();g.hold();
  assert.equal(JSON.stringify({active:g.active,board:g.board,score:g.score,held:g.held}),before);g.pause();assert.equal(g.status,'playing');
});
test('occupied spawn causes game over',()=>{
  const g=started();g.board[2].fill(dummy());g.spawn('O');assert.equal(g.status,'over');
});
test('locking entirely above visible board causes game over',()=>{
  const g=started();g.active={type:'I',rotation:0,x:3,y:-2,id:1};g.lock();assert.equal(g.status,'over');
});
test('seeded random play preserves board and collision invariants',()=>{
  let seed=42;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const g=new Game(rand);g.start();
  for(let i=0;i<25000;i++){
    if(g.status==='over')g.start();
    const a=Math.floor(rand()*8);if(a===0)g.move(-1);if(a===1)g.move(1);if(a===2)g.rotate(1);if(a===3)g.rotate(-1);if(a===4)g.hold();if(a===5)g.hardDrop();if(a===6)g.move(0,1,true);if(a===7)g.update(100);
    assert.equal(g.board.length,22);assert.ok(g.board.every(row=>row.length===10));assert.ok(Number.isFinite(g.score));
    if(g.status==='playing')assert.ok(g.fits(g.active));
  }
});
