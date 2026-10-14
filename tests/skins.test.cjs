const test=require('node:test');
const assert=require('node:assert/strict');
const {cells,MATRICES,SPAWN_ROTATIONS}=require('../engine.js');
const {ownerAt,rotatedCell,drawTileArt,BLEED}=require('../skins.js');

test('ears outside the grid belong to a real cell; distant decoration is discarded',()=>{
  const occupied=cells({type:'O',rotation:0,x:0,y:0});
  assert.equal(ownerAt(.3,-.2,occupied),0);
  assert.equal(ownerAt(1.7,-.2,occupied),1);
  assert.equal(ownerAt(.3,-BLEED-.01,occupied),-1);
});
test('J head can extend left of its stem without changing the occupied grid',()=>{
  const occupied=cells({type:'J',rotation:3,x:0,y:0});
  const owner=ownerAt(.75,.4,occupied);
  assert.notEqual(owner,-1);assert.deepEqual([occupied[owner].x,occupied[owner].y],[1,0]);
  assert.equal(occupied.length,4);assert.ok(!occupied.some(c=>c.x===0&&c.y===0));
});
test('middle of a shape hole is not painted as an occupied cell',()=>{
  const occupied=cells({type:'T',rotation:2,x:0,y:0});
  assert.equal(ownerAt(.5,2.7,occupied),-1);
});
test('decorations have deterministic ownership at concave corners',()=>{
  const occupied=cells({type:'T',rotation:2,x:0,y:0});
  const owner=ownerAt(.85,2.15,occupied);
  assert.ok(owner>=0);assert.equal(ownerAt(.85,2.15,occupied),owner);
});
test('all sprite fragments follow the exact occupied cells through all rotations',()=>{
  for(const type of Object.keys(MATRICES))for(let r=0;r<4;r++){
    const n=MATRICES[type][0].length,start=SPAWN_ROTATIONS[type],turns=(r-start+4)%4;
    const transformed=cells({type,rotation:start,x:0,y:0}).map(c=>rotatedCell(c.x,c.y,n,turns));
    const actual=cells({type,rotation:r,x:0,y:0});
    assert.deepEqual(transformed.map(c=>`${c.x},${c.y}`).sort(),actual.map(c=>`${c.x},${c.y}`).sort());
  }
});
test('a surviving cell carries its ear fragment when a line clear moves it downward',()=>{
  const texture={},textures={J:[{},{},{},{'1,0':texture}]};
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)},tile={type:'J',rotation:3,tx:1,ty:0};
  drawTileArt(ctx,textures,tile,80,120,40);
  drawTileArt(ctx,textures,tile,80,160,40);
  assert.equal(calls[0][0],texture);assert.equal(calls[1][0],texture);
  assert.equal(calls[1][2]-calls[0][2],40);
  assert.ok(calls[0][1]<80&&calls[0][2]<120);
  assert.ok(calls[0][3]>40&&calls[0][4]>40);
});
