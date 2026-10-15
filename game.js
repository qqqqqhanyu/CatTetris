/* Offline UI. All game rules live in engine.js and are independently testable. */
(() => {
  'use strict';
  const {Game,cells,HIDDEN}=CatrisEngine;
  const {SKINS,SPAWN_ROTATIONS,BLEED,buildTextures,drawTileArt,bounds}=CatrisSkins;
  const audio=new CatrisAudio.SoundPlayer();
  const $=id=>document.getElementById(id),game=new Game();
  const canvas=$('board'),ctx=canvas.getContext('2d'),CELL=40;
  const colors={I:'#a1cbd9',O:'#dfc997',T:'#c5b3d7',S:'#acccb6',Z:'#d9aca9',J:'#a8bdd8',L:'#ddc0a0'};
  const keys=new Map(),touchButtons=[...document.querySelectorAll('[data-action]')];
  const skinButtons=[...document.querySelectorAll('[data-skin]')],skinCache=new Map();
  let textures=null,activeSkin='jianguo',pendingSkin=null,skinRequest=0,skinError='';
  let loaded=false,lastTime=0,toastTimer=0,flash=null,sound=false;
  const touchScreen=matchMedia('(pointer: coarse)');
  let best=0,restartWasPlaying=false;
  try{best=Number(localStorage.getItem('catris-best-v1'))||0;sound=localStorage.getItem('catris-sound-v1')==='true';const saved=localStorage.getItem('catris-skin-v1');if(Object.hasOwn(SKINS,saved))activeSkin=saved;}catch{}
  function saveBest(){
    if(game.score>best){best=game.score;try{localStorage.setItem('catris-best-v1',String(best));}catch{}}
  }
  function skinUI(){
    skinButtons.forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.skin===activeSkin));
      button.setAttribute('aria-busy',String(button.dataset.skin===pendingSkin));
      button.classList.toggle('loading',button.dataset.skin===pendingSkin);
    });
    $('skin-status').textContent=pendingSkin?`${SKINS[pendingSkin].name}准备中…`:skinError;
  }
  function loadSkin(id){
    if(!skinCache.has(id)){
      const promise=new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>{try{resolve(buildTextures(image));}catch(error){reject(error);}};
        image.onerror=()=>reject(new Error('Skin image unavailable'));
        image.src=SKINS[id].src;
      }).catch(error=>{skinCache.delete(id);throw error;});
      skinCache.set(id,promise);
    }
    return skinCache.get(id);
  }
  async function selectSkin(id){
    if(!Object.hasOwn(SKINS,id))return;
    const request=++skinRequest;pendingSkin=id;skinError='';skinUI();
    try{
      const next=await loadSkin(id);
      if(request!==skinRequest)return;
      textures=next;activeSkin=id;loaded=true;pendingSkin=null;
      try{localStorage.setItem('catris-skin-v1',id);}catch{}
      $('start').disabled=false;preview($('welcome-cat'),'O');skinUI();updateUI();
    }catch{
      if(request!==skinRequest)return;
      pendingSkin=null;skinError=`${SKINS[id].name}加载失败，点名字重试`;skinUI();
      if(!loaded){$('start').textContent='素材加载失败';$('overlay-description').textContent='请切换皮肤或刷新重试。';}
    }
  }
  function drawPiece(context,piece,size,ox=0,oy=0,ghost=false){
    const occupied=cells(piece),set=new Set(occupied.map(c=>`${c.x},${c.y}`));
    for(const c of occupied){
      const x=ox+c.x*size,y=oy+c.y*size;
      if(ghost){
        context.fillStyle=colors[piece.type]+'24';context.fillRect(x+1,y+1,size-2,size-2);
        context.strokeStyle=colors[piece.type]+'b0';context.lineWidth=1.2;
        context.setLineDash([3,3]);context.strokeRect(x+2,y+2,size-4,size-4);context.setLineDash([]);
      }else drawTileBase(context,piece,x,y,size,(dx,dy)=>set.has(`${c.x+dx},${c.y+dy}`));
    }
    if(!ghost)for(const c of occupied)drawTileArt(context,textures,{...piece,tx:c.tx,ty:c.ty},ox+c.x*size,oy+c.y*size,size);
  }
  function drawTileBase(context,tile,x,y,size,neighbor){
    context.fillStyle=colors[tile.type]+'57';context.fillRect(x,y,size,size);
    context.strokeStyle=colors[tile.type];context.lineWidth=1.35;
    context.beginPath();
    if(!neighbor(0,-1)){context.moveTo(x+.7,y+.7);context.lineTo(x+size-.7,y+.7);}
    if(!neighbor(0,1)){context.moveTo(x+.7,y+size-.7);context.lineTo(x+size-.7,y+size-.7);}
    if(!neighbor(-1,0)){context.moveTo(x+.7,y+.7);context.lineTo(x+.7,y+size-.7);}
    if(!neighbor(1,0)){context.moveTo(x+size-.7,y+.7);context.lineTo(x+size-.7,y+size-.7);}
    context.stroke();
  }
  function preview(element,type,empty=false){
    const c=element.getContext('2d');c.clearRect(0,0,element.width,element.height);
    if(!type){
      if(empty){c.strokeStyle='#dce5e5';c.lineWidth=2;c.setLineDash([5,5]);c.strokeRect(88,40,64,60);c.setLineDash([]);c.fillStyle='#b4c2c5';c.font='24px -apple-system';c.textAlign='center';c.fillText('+',120,78);}return;
    }
    // Previews use the same supplied cat pose and spawn orientation as gameplay.
    const piece={type,rotation:SPAWN_ROTATIONS[type],x:0,y:0};const b=bounds(type,piece.rotation);
    const size=Math.min(48,(element.width-12)/(b.maxX-b.minX+1+2*BLEED),(element.height-12)/(b.maxY-b.minY+1+2*BLEED));
    const ox=(element.width-(b.maxX-b.minX+1)*size)/2-b.minX*size,oy=(element.height-(b.maxY-b.minY+1)*size)/2-b.minY*size;
    drawPiece(c,piece,size,ox,oy);
  }
  function draw(time){
    const ratio=window.devicePixelRatio||1;
    if(canvas.width!==400*ratio){canvas.width=400*ratio;canvas.height=800*ratio;}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,400,800);
    ctx.fillStyle='#f7fafb';ctx.fillRect(0,0,400,800);
    ctx.strokeStyle='#e6eef0';ctx.lineWidth=.6;ctx.beginPath();
    for(let x=0;x<=400;x+=CELL){ctx.moveTo(x,0);ctx.lineTo(x,800);}
    for(let y=0;y<=800;y+=CELL){ctx.moveTo(0,y);ctx.lineTo(400,y);}ctx.stroke();
    const settled=[];
    for(let y=0;y<20;y++)for(let x=0;x<10;x++){
      const tile=game.board[y+HIDDEN][x];if(!tile)continue;
      drawTileBase(ctx,tile,x*CELL,y*CELL,CELL,(dx,dy)=>game.board[y+HIDDEN+dy]?.[x+dx]?.id===tile.id);
      settled.push({tile,x,y});
    }
    for(const {tile,x,y} of settled)drawTileArt(ctx,textures,tile,x*CELL,y*CELL,CELL);
    if(game.active&&game.status!=='over'){
      ctx.save();ctx.beginPath();ctx.rect(0,0,400,800);ctx.clip();
      drawPiece(ctx,game.ghost(),CELL,0,0,true);drawPiece(ctx,game.active,CELL);ctx.restore();
    }
    if(flash){const opacity=Math.max(0,1-(time-flash.time)/320);if(!opacity)flash=null;else{ctx.fillStyle=`rgba(210,231,233,${opacity*.8})`;for(const y of flash.rows)ctx.fillRect(0,y*CELL,400,CELL);}}
  }
  function playTone(kind){audio.play(kind);}
  function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1300);}
  function events(){const batch=game.drainEvents(),cleared=batch.some(e=>e.type==='clear');for(const e of batch){
    if(e.type==='clear'){flash={rows:e.rows,time:performance.now()};notify(e.perfect?'整整齐齐 · 全清！':e.spin?'T-SPIN！':e.count===4?'四行全消！':`${e.count} 行消除${e.combo>0?' · 连击 '+e.combo:''}`);playTone('clear');}
    else if(e.type==='over')playTone('over');else if(['rotate','drop','hold'].includes(e.type)&&!(cleared&&e.type==='drop'))playTone(e.type);
  }}
  let previousSignature='',previousUI='';
  function updateUI(){
    const state=[game.status,game.score,game.lines,game.level,game.held,game.holdUsed,...game.queue.slice(0,3),loaded,activeSkin].join('|');
    if(state===previousUI)return;previousUI=state;
    saveBest();$('score').textContent=String(game.score).padStart(6,'0');$('best').textContent=best.toLocaleString('zh-CN');
    $('level').textContent=String(game.level).padStart(2,'0');$('lines').textContent=String(game.lines).padStart(2,'0');
    $('remaining').textContent=`${10-game.lines%10} 行`;$('progress').style.width=game.lines%10*10+'%';
    const signature=[...game.queue.slice(0,3),game.held,game.holdUsed,loaded,activeSkin].join('|');
    if(signature!==previousSignature){game.queue.slice(0,3).forEach((type,i)=>preview($('next-'+i),type));preview($('held'),game.held,true);previousSignature=signature;}
    $('hold').classList.toggle('used',game.holdUsed);$('hold').disabled=game.status!=='playing'||game.holdUsed;
    $('hold-hint').textContent=game.holdUsed?'落下后可再次暂存':'留给更合适的时候';
    touchButtons.forEach(button=>button.disabled=game.status!=='playing');
    $('status').textContent={ready:'准备就绪',playing:'小猫正在落下',paused:'休息一下',over:'本局结束'}[game.status];
    $('pause').disabled=!['playing','paused'].includes(game.status);
    $('pause').innerHTML=game.status==='paused'?'<span>▷</span> 继续 <kbd>P</kbd>':'<span>Ⅱ</span> 暂停 <kbd>P</kbd>';
    $('overlay').hidden=game.status==='playing';
    if(game.status!=='playing'){
      const paused=game.status==='paused',over=game.status==='over';
      $('overlay-title').textContent=paused?'小猫打个盹':over?'今天也很棒':`${SKINS[activeSkin].name}已就位`;
      $('overlay-kicker').textContent=paused?'TAKE YOUR TIME':over?'ONE MORE COZY ROUND?':'A COZY LITTLE BREAK';
      $('overlay-description').textContent=paused?'不着急，我们在这里等你。':over?`本局 ${game.score.toLocaleString()} 分 · 消除 ${game.lines} 行`:'拼好一整行，腾出更多温柔。';
      if(loaded)$('start').textContent=paused?'继续游戏':over?'再玩一局':'开始游戏';
      $('overlay-hint').textContent=touchScreen.matches?(paused?'轻点继续，接着陪小猫玩':'用下方按钮控制小猫'):(paused?'按 P / Esc / Enter 继续':'也可以按 Enter 开始');
    }
  }
  function begin(){if(!loaded)return;keys.clear();flash=null;$('toast').classList.remove('show');saveBest();game.start();events();updateUI();}
  function pause(){keys.clear();game.pause();updateUI();}
  function startOrResume(){if(game.status==='paused')pause();else if(game.status==='ready'||game.status==='over')begin();}
  function action(name){
    if(game.status!=='playing')return;
    if(name==='left')game.move(-1);if(name==='right')game.move(1);
    if(name==='soft')game.move(0,1,true);if(name==='rotate')game.rotate(1);
    if(name==='reverse')game.rotate(-1);if(name==='drop'){game.hardDrop();keys.clear();}
    if(name==='hold'){game.hold();keys.clear();}events();updateUI();
  }
  const mapping={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft',ArrowUp:'rotate',KeyX:'rotate',KeyZ:'reverse',Space:'drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
  document.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey||$('restart-dialog').open||e.target.closest('.skin-picker'))return;
    if(['KeyP','Escape','Enter'].includes(e.code)){
      if(e.target.closest('button')&&e.code==='Enter')return;
      e.preventDefault();if(e.repeat)return;
      if(e.code==='Enter')startOrResume();else pause();return;
    }
    const a=mapping[e.code];if(!a)return;
    // Space still activates a focused button while the game is not running.
    if(game.status!=='playing'&&e.target.closest('button'))return;
    e.preventDefault();if(e.repeat||game.status!=='playing')return;
    if(a==='left')keys.delete('ArrowRight');if(a==='right')keys.delete('ArrowLeft');
    action(a);if(['left','right','soft'].includes(a))keys.set(e.code,{action:a,time:performance.now(),next:a==='soft'?35:150});
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  function autoPause(){keys.clear();audio.stop();if(game.status==='playing'){game.pause();updateUI();}}
  window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
  window.addEventListener('pagehide',saveBest);
  $('start').addEventListener('click',()=>{startOrResume();$('start').blur();});
  $('pause').addEventListener('click',()=>{pause();$('pause').blur();});
  $('hold').addEventListener('click',()=>{action('hold');$('hold').blur();});
  $('restart').addEventListener('click',()=>{
    if(game.status==='ready'||game.status==='over'){begin();return;}
    restartWasPlaying=game.status==='playing';if(restartWasPlaying)pause();$('restart-dialog').showModal();
  });
  function cancelRestart(){$('restart-dialog').close();if(restartWasPlaying&&game.status==='paused')pause();}
  $('cancel-restart').addEventListener('click',cancelRestart);
  $('restart-dialog').addEventListener('cancel',e=>{e.preventDefault();cancelRestart();});
  $('confirm-restart').addEventListener('click',()=>{$('restart-dialog').close();begin();});
  function soundUI(){$('sound').innerHTML=`♪<span>音效${sound?'开':'关'}</span>`;$('sound').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('sound').title=sound?'关闭音效':'开启音效';}
  $('sound').addEventListener('click',()=>{sound=!sound;audio.setEnabled(sound);soundUI();try{localStorage.setItem('catris-sound-v1',String(sound));}catch{}if(sound)playTone('clear');$('sound').blur();});
  // Restore the preference without autoplay. A real gesture unlocks Web Audio.
  audio.enabled=sound;
  document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true});
  document.addEventListener('keydown',()=>audio.unlock(),{capture:true});
  touchButtons.forEach(button=>{
    button.addEventListener('pointerdown',e=>{
      if(game.status!=='playing'||e.button!==0)return;
      e.preventDefault();button.setPointerCapture(e.pointerId);action(button.dataset.action);
      if(['left','right','soft'].includes(button.dataset.action))keys.set(`touch-${e.pointerId}`,{action:button.dataset.action,time:performance.now(),next:button.dataset.action==='soft'?35:150});
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>keys.delete(`touch-${e.pointerId}`));
    // Keyboard / assistive-technology activation without a pointer event.
    button.addEventListener('click',e=>{if(e.detail===0)action(button.dataset.action);});
  });
  function frame(time){
    const dt=lastTime?time-lastTime:0;lastTime=time;
    if(game.status==='playing'){
      for(const key of keys.values()){if(time-key.time>=key.next){action(key.action);key.time=time;key.next=key.action==='soft'?35:45;}}
      game.update(dt);events();
    }
    updateUI();draw(time);requestAnimationFrame(frame);
  }
  skinButtons.forEach(button=>button.addEventListener('click',()=>{selectSkin(button.dataset.skin);button.blur();}));
  soundUI();selectSkin(activeSkin);requestAnimationFrame(frame);
})();
