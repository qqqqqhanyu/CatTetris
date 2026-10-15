/* Audio is unlocked by a player gesture, including when sound was remembered. */
(function(root){
  'use strict';
  class SoundPlayer{
    constructor({createContext=()=>new(root.AudioContext||root.webkitAudioContext)(),fetchAudio=url=>fetch(url)}={}){
      this.createContext=createContext;this.fetchAudio=fetchAudio;
      this.enabled=false;this.context=null;this.buffer=null;this.loading=null;
      this.sources=new Set();this.meow=null;this.request=0;
    }
    setEnabled(enabled){
      this.enabled=enabled;
      if(enabled)this.unlock();else this.stop();
    }
    unlock(){
      if(!this.enabled)return;
      try{
        this.context??=this.createContext();
        // Call resume synchronously within the touch/key handler for iOS Safari.
        this.context.resume().catch(()=>{});
        this.prepare();
      }catch{}
    }
    prepare(){
      if(this.buffer)return Promise.resolve(this.buffer);
      if(!this.context)return Promise.resolve(null);
      if(!this.loading){
        this.loading=this.fetchAudio('assets/audio/line-clear-meow-b.wav')
          .then(response=>{if(!response.ok)throw new Error('Audio unavailable');return response.arrayBuffer();})
          .then(bytes=>this.context.decodeAudioData(bytes))
          .then(buffer=>this.buffer=buffer)
          .catch(()=>null)
          .finally(()=>{this.loading=null;});
      }
      return this.loading;
    }
    track(source,cleanup=()=>{}){
      this.sources.add(source);
      source.onended=()=>{this.sources.delete(source);source.disconnect();cleanup();if(this.meow===source)this.meow=null;};
    }
    stop(){
      this.request++;
      for(const source of this.sources){try{source.stop();}catch{}}
      this.sources.clear();this.meow=null;
    }
    play(kind){
      if(!this.enabled)return Promise.resolve(false);
      this.unlock();
      if(!this.context)return Promise.resolve(false);
      if(kind==='clear'){
        const request=++this.request;
        return this.prepare().then(buffer=>{
          if(!buffer||!this.enabled||request!==this.request)return false;
          // A multi-line clear is one event and one meow. Rapid clears restart it.
          if(this.meow){try{this.meow.stop();}catch{}}
          const source=this.context.createBufferSource();source.buffer=buffer;
          source.connect(this.context.destination);this.track(source);this.meow=source;
          source.start();return true;
        }).catch(()=>false);
      }
      try{
        const notes=kind==='over'?[330,262,196]:kind==='rotate'?[660]:[180];
        notes.forEach((hz,i)=>{
          const osc=this.context.createOscillator(),gain=this.context.createGain(),t=this.context.currentTime+i*.08;
          osc.type='sine';osc.frequency.setValueAtTime(hz,t);gain.gain.setValueAtTime(0,t);
          gain.gain.linearRampToValueAtTime(.045,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+.16);
          osc.connect(gain);gain.connect(this.context.destination);this.track(osc,()=>gain.disconnect());
          osc.start(t);osc.stop(t+.17);
        });
      }catch{}
      return Promise.resolve(true);
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={SoundPlayer};else root.CatrisAudio={SoundPlayer};
})(typeof globalThis!=='undefined'?globalThis:this);
