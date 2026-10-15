const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {SoundPlayer}=require('../audio.js');
const {Game}=require('../engine.js');

function fixture(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
  const sources=[],buffer={duration:.534};let resumes=0,fetches=0;
  const context={destination:{},currentTime:0,resume:async()=>{resumes++;},decodeAudioData:async()=>buffer,
    createBufferSource(){const source={started:0,stopped:0,connect(){},disconnect(){},start(){this.started++;},stop(){this.stopped++;}};sources.push(source);return source;}};
  const player=new SoundPlayer({createContext:()=>context,fetchAudio:(...args)=>{fetches++;return fetchAudio(...args);}});
  return {player,sources,buffer,get resumes(){return resumes;},get fetches(){return fetches;}};
}
test('muted games do not initialize audio or play a meow',async()=>{
  const f=fixture();assert.equal(await f.player.play('clear'),false);assert.equal(f.resumes,0);assert.equal(f.fetches,0);
});
test('remembered sound is unlocked on a gesture; B sample is decoded once and replayed',async()=>{
  const f=fixture();f.player.enabled=true;f.player.unlock();
  assert.equal(f.resumes,1);await f.player.play('clear');await f.player.play('clear');
  assert.equal(f.fetches,1);assert.equal(f.sources.length,2);
  assert.equal(f.sources[0].buffer,f.buffer);assert.equal(f.sources[1].started,1);
  assert.equal(f.sources[0].stopped,1);
});
test('muting stops an active meow immediately',async()=>{
  const f=fixture();f.player.setEnabled(true);await f.player.play('clear');f.player.setEnabled(false);
  assert.equal(f.sources[0].stopped,1);assert.equal(await f.player.play('clear'),false);
});
test('loading cannot cause a delayed meow after muting',async()=>{
  let release;const response=new Promise(resolve=>release=resolve),f=fixture(()=>response);
  f.player.setEnabled(true);const playback=f.player.play('clear');f.player.setEnabled(false);
  release({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  assert.equal(await playback,false);assert.equal(f.sources.length,0);
});
test('a four-line clear triggers one meow',async()=>{
  const game=new Game(),f=fixture();game.start();game.drainEvents();
  for(let y=18;y<22;y++)game.board[y]=Array.from({length:10},(_,x)=>x===4?null:{type:'O',id:0});
  game.active={type:'I',rotation:1,x:2,y:0,id:1};game.hardDrop();
  f.player.setEnabled(true);
  const clears=game.drainEvents().filter(e=>e.type==='clear');assert.equal(clears[0].count,4);
  for(const event of clears)await f.player.play(event.type);
  assert.equal(f.sources.length,1);assert.equal(f.sources[0].started,1);
});
test('missing audio fails silently and can be retried',async()=>{
  let available=false;const f=fixture(async()=>({ok:available,arrayBuffer:async()=>new ArrayBuffer(8)}));
  f.player.setEnabled(true);assert.equal(await f.player.play('clear'),false);
  available=true;assert.equal(await f.player.play('clear'),true);
});
test('the shipped sound is a short, non-clipping mono PCM WAV',()=>{
  const wav=fs.readFileSync(require.resolve('../assets/audio/line-clear-meow-b.wav'));
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt16LE(34),16);
  const rate=wav.readUInt32LE(24),length=wav.readUInt32LE(40),duration=length/2/rate;
  assert.ok(duration>.53&&duration<.54);
  let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
  assert.ok(peak>10000&&peak<32767);
});
