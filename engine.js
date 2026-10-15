(function (root) {
  'use strict';
  const WIDTH = 10, HEIGHT = 20, HIDDEN = 2;
  // Keep the supplied cat pose at spawn; rotation and collision still use SRS.
  const SPAWN_ROTATIONS = {I:0,O:0,T:2,S:0,Z:0,J:3,L:1};
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };
  function rotateMatrix(m) { return m.map((r,y)=>r.map((_,x)=>m[m.length-1-x][y])); }
  const MATRICES = {};
  for (const type of Object.keys(SHAPES)) {
    MATRICES[type] = [SHAPES[type]];
    for(let i=1;i<4;i++) MATRICES[type].push(rotateMatrix(MATRICES[type][i-1]));
  }
  // SRS offsets, with positive y pointing up; convert at collision checks.
  const JLSTZ = {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
  };
  const I_KICKS = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
  };
  function cells(piece) {
    const out=[];
    MATRICES[piece.type][piece.rotation].forEach((row,ty)=>row.forEach((v,tx)=>{
      if(v) out.push({x:piece.x+tx,y:piece.y+ty,tx,ty});
    }));
    return out;
  }
  class Game {
    constructor(random=Math.random) { this.random=random; this.reset(); }
    reset() {
      this.board=Array.from({length:HEIGHT+HIDDEN},()=>Array(WIDTH).fill(null));
      this.queue=[]; this.active=null; this.held=null; this.holdUsed=false;
      this.score=0; this.lines=0; this.level=1; this.combo=-1; this.backToBack=false;
      this.status='ready'; this.events=[]; this.pieceId=0; this.lastAction=null;
      this.gravityTimer=0; this.lockTimer=0; this.lockResets=0;
      this.fillQueue();
    }
    fillQueue() {
      while(this.queue.length<7) {
        const bag=Object.keys(SHAPES);
        for(let i=bag.length-1;i>0;i--) { const j=Math.floor(this.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
        this.queue.push(...bag);
      }
    }
    start() { this.reset(); this.status='playing'; this.spawn(); }
    spawn(type) {
      const t=type || this.queue.shift(); this.fillQueue();
      this.active={type:t,rotation:SPAWN_ROTATIONS[t],x:t==='O'?4:3,y:-1,id:++this.pieceId};
      this.gravityTimer=0; this.lockTimer=0; this.lockResets=0; this.lastAction=null;
      if(!this.fits(this.active)) this.finish();
    }
    fits(piece) {
      return cells(piece).every(({x,y})=>x>=0&&x<WIDTH&&y>=-HIDDEN&&y<HEIGHT&&!this.board[y+HIDDEN][x]);
    }
    grounded() { return this.active && !this.fits({...this.active,y:this.active.y+1}); }
    resetLock(wasGrounded) {
      if(wasGrounded&&this.lockResets<15) { this.lockTimer=0; this.lockResets++; }
    }
    move(dx,dy=0,soft=false) {
      if(this.status!=='playing') return false;
      const next={...this.active,x:this.active.x+dx,y:this.active.y+dy};
      if(!this.fits(next)) return false;
      const grounded=this.grounded(); this.active=next;
      if(dx) this.resetLock(grounded);
      if(dy>0) { this.lockTimer=0; if(soft) this.score+=dy; }
      this.lastAction='move'; return true;
    }
    rotate(direction=1) {
      if(this.status!=='playing'||this.active.type==='O') return false;
      const from=this.active.rotation,to=(from+direction+4)%4;
      const kicks=(this.active.type==='I'?I_KICKS:JLSTZ)[`${from}>${to}`];
      for(let i=0;i<kicks.length;i++) {
        const [dx,dy]=kicks[i];
        const next={...this.active,rotation:to,x:this.active.x+dx,y:this.active.y-dy};
        if(this.fits(next)) {
          const grounded=this.grounded(); this.active=next; this.resetLock(grounded);
          this.lastAction='rotate'; this.lastKick=i;
          this.events.push({type:'rotate'}); return true;
        }
      }
      return false;
    }
    ghost() {
      if(!this.active) return null;
      const p={...this.active}; while(this.fits({...p,y:p.y+1})) p.y++; return p;
    }
    hardDrop() {
      if(this.status!=='playing') return;
      const target=this.ghost(),distance=target.y-this.active.y;
      this.score+=distance*2; this.active=target;
      if(distance) this.lastAction='drop';
      this.events.push({type:'drop',distance}); this.lock();
    }
    hold() {
      if(this.status!=='playing'||this.holdUsed) return false;
      const type=this.active.type,previous=this.held; this.held=type;
      this.spawn(previous); this.holdUsed=true;
      this.events.push({type:'hold'}); return true;
    }
    tSpin() {
      if(this.active.type!=='T'||this.lastAction!=='rotate') return null;
      const {x,y,rotation}=this.active;
      const occupied=(cx,cy)=>cx<0||cx>=WIDTH||cy>=HEIGHT||cy< -HIDDEN||!!this.board[cy+HIDDEN][cx];
      const corners=[[x,y],[x+2,y],[x+2,y+2],[x,y+2]].map(([a,b])=>occupied(a,b));
      if(corners.filter(Boolean).length<3) return null;
      return (corners[rotation]&&corners[(rotation+1)%4])||this.lastKick===4?'full':'mini';
    }
    lock() {
      if(this.status!=='playing') return;
      const occupied=cells(this.active),spin=this.tSpin();
      for(const c of occupied) this.board[c.y+HIDDEN][c.x]={type:this.active.type,rotation:this.active.rotation,tx:c.tx,ty:c.ty,id:this.active.id};
      const cleared=[];
      this.board.forEach((row,i)=>{if(row.every(Boolean)) cleared.push(i-HIDDEN);});
      const n=cleared.length,level=this.level;
      let points=spin?(spin==='full'?[400,800,1200,1600][n]:[100,200,400][n]):[0,100,300,500,800][n];
      const difficult=n>0&&(n===4||!!spin);
      if(difficult&&this.backToBack) points=Math.floor(points*1.5);
      if(n) {
        this.combo++; this.backToBack=difficult;
        this.board=this.board.filter(row=>!row.every(Boolean));
        while(this.board.length<HEIGHT+HIDDEN) this.board.unshift(Array(WIDTH).fill(null));
        this.score+=(points+Math.max(0,this.combo)*50)*level;
        this.lines+=n; this.level=1+Math.floor(this.lines/10);
        const perfect=this.board.every(row=>row.every(c=>!c));
        if(perfect) this.score+=[0,800,1200,1800,2000][n]*level;
        this.events.push({type:'clear',rows:cleared,count:n,combo:this.combo,spin,perfect});
      } else { this.combo=-1; this.score+=points*level; this.events.push({type:'lock',spin}); }
      // A piece locked entirely above the visible field is a lock-out.
      if(!n&&occupied.every(c=>c.y<0)) { this.finish(); return; }
      this.holdUsed=false; this.spawn();
    }
    finish() { this.status='over'; this.events.push({type:'over',score:this.score}); }
    pause() {
      if(this.status==='playing') this.status='paused';
      else if(this.status==='paused') this.status='playing';
    }
    get interval() { return Math.max(55,1000*Math.pow(0.8,this.level-1)); }
    update(ms) {
      if(this.status!=='playing') return;
      const dt=Math.min(ms,100);
      this.gravityTimer+=dt;
      while(this.gravityTimer>=this.interval) { this.gravityTimer-=this.interval; this.move(0,1); }
      if(this.grounded()) { this.lockTimer+=dt; if(this.lockTimer>=500) this.lock(); }
      else this.lockTimer=0;
    }
    drainEvents() { return this.events.splice(0); }
  }
  const api={Game,SHAPES,MATRICES,SPAWN_ROTATIONS,cells,WIDTH,HEIGHT,HIDDEN,rotateMatrix};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.CatrisEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
