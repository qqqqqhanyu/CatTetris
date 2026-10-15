/* Sprite geometry is independent of the collision grid in engine.js. */
(function(root){
  'use strict';
  const engine=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.CatrisEngine;
  const {MATRICES,SPAWN_ROTATIONS,cells}=engine;
  const SKINS={
    jianguo:{name:'坚果',src:'assets/cats-transparent.png?v=1.3.0'},
    yuanxiao:{name:'元宵',src:'assets/cats2-transparent.png?v=1.3.0'}
  };
  // Generous source rectangles retain the ears and whiskers of both cats.
  const CROPS={
    I:[12,96,602,251], O:[625,62,338,289], T:[1000,0,520,400],
    S:[24,472,399,385], Z:[424,480,394,377], J:[820,425,335,455], L:[1155,438,360,443]
  };
  const UNIT=128, BLEED=.4, PAD=Math.ceil(UNIT*BLEED), TILE_SIZE=UNIT+PAD*2;
  const RISE={I:.34,O:.18,T:.36,S:.22,Z:.22,J:.24,L:.24};

  // Ignore empty atlas padding when fitting the cat to its four-cell silhouette.
  function alphaBounds({data,width,height},threshold=24){
    let left=width,top=height,right=-1,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>threshold){
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    return right<0?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  function tightCrop(img,[x,y,width,height]){
    const canvas=makeCanvas(width,height),context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(img,x,y,width,height,0,0,width,height);
    const b=alphaBounds(context.getImageData(0,0,width,height));
    if(!b)return [x,y,width,height];
    // Keep a tiny feathering margin so thin whiskers retain their soft edge.
    const left=Math.max(0,b.x-2),top=Math.max(0,b.y-2);
    return [x+left,y+top,Math.min(width,b.x+b.width+2)-left,Math.min(height,b.y+b.height+2)-top];
  }

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
      const wider=type==='T'?.22:.18,lower=type==='T'?.18:.10;
      painter.drawImage(img,...tightCrop(img,CROPS[type]),PAD+(b.minX-wider/2)*UNIT,PAD+(b.minY-RISE[type])*UNIT,
        (b.maxX-b.minX+1+wider)*UNIT,(b.maxY-b.minY+1+RISE[type]+lower)*UNIT);
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
  const api={SKINS,CROPS,UNIT,PAD,BLEED,SPAWN_ROTATIONS,bounds,ownerAt,rotatedCell,alphaBounds,buildTextures,drawTileArt};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CatrisSkins=api;
})(typeof globalThis!=='undefined'?globalThis:this);
