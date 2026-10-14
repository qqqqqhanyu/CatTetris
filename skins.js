/* Sprite geometry is independent of the collision grid in engine.js. */
(function(root){
  'use strict';
  const engine=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.CatrisEngine;
  const {MATRICES,SPAWN_ROTATIONS,cells}=engine;
  const SKINS={
    jianguo:{name:'坚果',src:'assets/cats.png'},
    yuanxiao:{name:'元宵',src:'assets/cats2-transparent.png'}
  };
  // Generous source rectangles retain the ears and whiskers of both cats.
  const CROPS={
    I:[18,96,596,251], O:[629,62,330,289], T:[1007,26,486,335],
    S:[24,472,399,385], Z:[424,480,394,377], J:[820,425,335,455], L:[1155,438,360,443]
  };
  const UNIT=128, BLEED=.4, PAD=Math.ceil(UNIT*BLEED), TILE_SIZE=UNIT+PAD*2;
  const RISE={I:.34,O:.18,T:.26,S:.22,Z:.22,J:.24,L:.24};

  function bounds(type,rotation){
    const occupied=cells({type,rotation,x:0,y:0});
    return {minX:Math.min(...occupied.map(c=>c.x)),maxX:Math.max(...occupied.map(c=>c.x)),minY:Math.min(...occupied.map(c=>c.y)),maxY:Math.max(...occupied.map(c=>c.y))};
  }
  // Every decorative pixel belongs to one real grid cell. Clearing that cell
  // removes its fur/ear fragment too; no detached decorations survive a clear.
  function ownerAt(x,y,occupied,bleed=BLEED){
    let owner=-1,distance=Infinity;
    for(let i=0;i<occupied.length;i++){
      const c=occupied[i],dx=Math.max(c.x-x,0,x-c.x-1),dy=Math.max(c.y-y,0,y-c.y-1),d=dx*dx+dy*dy;
      if(d<distance){distance=d;owner=i;}
    }
    return distance<=bleed*bleed?owner:-1;
  }
  function rotatedCell(x,y,n,turns){for(let i=0;i<turns;i++)[x,y]=[n-1-y,x];return {x,y};}
  function makeCanvas(width,height=width){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}

  function buildTextures(img){
    const textures={};
    for(const type of Object.keys(CROPS)){
      const rotation=SPAWN_ROTATIONS[type],n=MATRICES[type][rotation].length;
      const occupied=cells({type,rotation,x:0,y:0}),b=bounds(type,rotation);
      const original=makeCanvas(n*UNIT+PAD*2),painter=original.getContext('2d',{willReadFrequently:true});
      // Use a single continuous drawing, including J/L heads. The collision
      // silhouette stays exact, while the fur is allowed into a small margin.
      painter.drawImage(img,...CROPS[type],PAD+(b.minX-.035)*UNIT,PAD+(b.minY-RISE[type])*UNIT,
        (b.maxX-b.minX+1+.07)*UNIT,(b.maxY-b.minY+1+RISE[type])*UNIT);
      const source=painter.getImageData(0,0,original.width,original.height);
      const fragments=occupied.map(()=>new Uint8ClampedArray(TILE_SIZE*TILE_SIZE*4));
      for(let py=0;py<source.height;py++)for(let px=0;px<source.width;px++){
        const index=(py*source.width+px)*4;if(!source.data[index+3])continue;
        const owner=ownerAt((px-PAD+.5)/UNIT,(py-PAD+.5)/UNIT,occupied);
        if(owner<0)continue;
        const c=occupied[owner],x=px-c.x*UNIT,y=py-c.y*UNIT;
        if(x<0||y<0||x>=TILE_SIZE||y>=TILE_SIZE)continue;
        const target=(y*TILE_SIZE+x)*4;
        fragments[owner].set(source.data.subarray(index,index+4),target);
      }
      const base=fragments.map(data=>{const canvas=makeCanvas(TILE_SIZE);canvas.getContext('2d').putImageData(new ImageData(data,TILE_SIZE,TILE_SIZE),0,0);return canvas;});
      textures[type]=Array.from({length:4},()=>({}));
      for(let r=0;r<4;r++)for(let i=0;i<occupied.length;i++){
        const turns=(r-rotation+4)%4,c=rotatedCell(occupied[i].x,occupied[i].y,n,turns);
        let fragment=base[i];
        if(turns){
          fragment=makeCanvas(TILE_SIZE);const context=fragment.getContext('2d');
          context.translate(TILE_SIZE/2,TILE_SIZE/2);context.rotate(turns*Math.PI/2);
          context.drawImage(base[i],-TILE_SIZE/2,-TILE_SIZE/2);
        }
        textures[type][r][`${c.x},${c.y}`]=fragment;
      }
    }
    return textures;
  }
  function drawTileArt(context,textures,tile,x,y,size){
    const texture=textures?.[tile.type]?.[tile.rotation]?.[`${tile.tx},${tile.ty}`];
    if(!texture)return;
    const margin=PAD/UNIT*size;
    context.drawImage(texture,x-margin,y-margin,size+2*margin,size+2*margin);
  }
  const api={SKINS,CROPS,UNIT,PAD,BLEED,SPAWN_ROTATIONS,bounds,ownerAt,rotatedCell,buildTextures,drawTileArt};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CatrisSkins=api;
})(typeof globalThis!=='undefined'?globalThis:this);
