/* Procedural, cached Canvas artwork: no images, libraries, network textures or DOM per frame. */
(()=>{
  class CosmicMultiverse {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});
      this.enabled=false;this.frame=0;this.time=0;this.last=0;this.lastPaint=0;this.quality=1;this.slow=0;
      this.pointer={x:0,y:0,tx:0,ty:0};this.motion=matchMedia('(prefers-reduced-motion: reduce)');
      this.tick=this.tick.bind(this);this.sync=this.sync.bind(this);this.resize=this.resize.bind(this);
      this.onPointer=event=>{this.pointer.tx=event.clientX/innerWidth-.5;this.pointer.ty=event.clientY/innerHeight-.5;};
      addEventListener('resize',this.resize,{passive:true});addEventListener('pointermove',this.onPointer,{passive:true});
      document.addEventListener('visibilitychange',this.sync);this.motion.addEventListener('change',this.sync);
      this.observer=new MutationObserver(this.sync);this.observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      const modal=document.getElementById('modal');if(modal)this.observer.observe(modal,{attributes:true,attributeFilter:['open','class']});
      if(this.ctx){this.buildTextures();this.resize();}
    }
    surface(size,draw){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);return canvas;}
    buildTextures(){
      let seed=74219;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      this.random=random;
      this.glow=this.surface(64,(ctx,size)=>{const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#eff8ff');g.addColorStop(.08,'#b3dbffcf');g.addColorStop(.3,'#6498e833');g.addColorStop(1,'#6498e800');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);});
      this.galaxies=['147,139,255','78,186,237','231,143,188'].map(color=>this.surface(384,(ctx,size)=>{
        const half=size/2,g=ctx.createRadialGradient(half,half,0,half,half,half);g.addColorStop(0,'rgba('+color+',.4)');g.addColorStop(.3,'rgba('+color+',.12)');g.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
        for(let i=0;i<2100;i++){const distance=Math.pow(random(),.65)*175,arm=i%3,angle=arm*Math.PI*2/3+distance*.035+(random()-.5)*.65,x=half+Math.cos(angle)*distance,y=half+Math.sin(angle)*distance;ctx.fillStyle='rgba('+color+','+(.06+random()*.38)+')';ctx.fillRect(x,y,random()<.1?1.5:.8,.8);}
        ctx.globalAlpha=.6;ctx.drawImage(this.glow,half-16,half-16,32,32);
      }));
      this.disk=this.surface(512,(ctx,size)=>{
        const half=size/2;
        for(let ring=0;ring<75;ring++){const radius=68+ring*2.2,alpha=(1-ring/88)*.2;ctx.strokeStyle='rgba(255,'+(160+Math.round(ring*.9))+','+(85+ring)+','+alpha+')';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(half,half,radius,0,Math.PI*2);ctx.stroke();}
        for(let i=0;i<1400;i++){const radius=76+Math.pow(random(),.8)*152,angle=random()*Math.PI*2;ctx.fillStyle='rgba(255,223,174,'+(random()*.4)+')';ctx.fillRect(half+Math.cos(angle)*radius,half+Math.sin(angle)*radius,1.6,.7);}
      });
      this.halo=this.surface(384,(ctx,size)=>{const g=ctx.createRadialGradient(size/2,size/2,18,size/2,size/2,size/2);g.addColorStop(0,'#ffdeaa00');g.addColorStop(.27,'#ffc47830');g.addColorStop(.42,'#b5795120');g.addColorStop(1,'#421e4e00');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);});
    }
    resize(){
      if(!this.ctx)return;this.width=innerWidth;this.height=innerHeight;
      const pixels=this.width*this.height,maxPixels=1800000;
      this.ratio=Math.min(devicePixelRatio||1,this.width<700?1.25:1.5,Math.sqrt(maxPixels/Math.max(1,pixels)))*this.quality;
      this.canvas.width=Math.max(1,Math.round(this.width*this.ratio));this.canvas.height=Math.max(1,Math.round(this.height*this.ratio));
      this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
      const count=Math.round(Math.min(420,Math.max(140,pixels/4200))*this.quality);
      this.stars=Array.from({length:count},()=>({x:this.random(),y:this.random(),z:.2+this.random()*.8,size:.35+this.random()*1.05,phase:this.random()*Math.PI*2}));
      if(this.enabled)this.draw();
    }
    reduced(){return this.motion.matches||document.body.classList.contains('reduce-motion');}
    canAnimate(){return this.enabled&&!document.hidden&&!this.reduced()&&!document.querySelector('.reader-modal[open]')&&!document.getElementById('reader-content')&&!document.documentElement.classList.contains('reader-route');}
    setEnabled(enabled){this.enabled=enabled;this.canvas.hidden=!enabled;this.sync();}
    sync(){
      if(this.frame){cancelAnimationFrame(this.frame);this.frame=0;}this.last=0;this.lastPaint=0;
      if(!this.enabled||!this.ctx||document.hidden)return;
      this.draw();if(this.canAnimate())this.frame=requestAnimationFrame(this.tick);
    }
    tick(now){
      this.frame=0;if(!this.canAnimate())return;
      const delta=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
      this.time+=delta;
      // 60 Hz ceiling on high-refresh screens, with adaptive pixel density on slower devices.
      if(!this.lastPaint||now-this.lastPaint>=15.5){
        if(this.lastPaint&&now-this.lastPaint>26)this.slow++;else this.slow=Math.max(0,this.slow-1);
        if(this.slow>45&&this.quality>.6){this.quality=Math.max(.6,this.quality-.15);this.slow=0;this.resize();}
        this.lastPaint=now;this.pointer.x+=(this.pointer.tx-this.pointer.x)*.035;this.pointer.y+=(this.pointer.ty-this.pointer.y)*.035;this.draw();
      }
      this.frame=requestAnimationFrame(this.tick);
    }
    ellipse(x,y,rx,ry,rotation,color,width=1){const ctx=this.ctx;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);ctx.stroke();}
    draw(){
      const ctx=this.ctx,w=this.width,h=this.height,t=this.time;
      ctx.clearRect(0,0,w,h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      const field=ctx.createRadialGradient(w*.5,h*.4,0,w*.5,h*.4,Math.max(w,h)*.72);field.addColorStop(0,'#15132a');field.addColorStop(.5,'#080d1c');field.addColorStop(1,'#030610');ctx.fillStyle=field;ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation='screen';
      const locations=[[.13,.27,.31,.0009],[.84,.77,.24,-.0013],[.75,.13,.14,.0017]];
      locations.forEach(([x,y,scale,speed],i)=>{const size=Math.min(w,h)*scale*1.9;ctx.save();ctx.translate(w*x-this.pointer.x*7,h*y-this.pointer.y*5);ctx.rotate(t*speed+i*.9);ctx.scale(1,.56);ctx.globalAlpha=.55;ctx.drawImage(this.galaxies[i],-size/2,-size/2,size,size);ctx.restore();});
      for(const star of this.stars){
        const x=(star.x*w+this.pointer.x*star.z*19+t*star.z*.3+w)%w,y=(star.y*h+this.pointer.y*star.z*12+h)%h,alpha=.25+star.z*.4+Math.sin(t*(.4+star.z*.6)+star.phase)*.16;
        ctx.globalAlpha=alpha;ctx.fillStyle=star.z>.7?'#e5f2ff':'#899fc8';ctx.fillRect(x,y,star.size,star.size);
        if(star.z>.94){ctx.globalAlpha=alpha*.75;ctx.drawImage(this.glow,x-8,y-8,16,16);}
      }
      this.drawTimelines(w,h,t);this.drawRift(w*.18,h*.69,Math.min(w,h)*.068,t,0);this.drawRift(w*.84,h*.39,Math.min(w,h)*.045,t,1);
      this.drawBlackHole(w*.54-this.pointer.x*9,h*.42-this.pointer.y*7,Math.min(w,h)*.095,t);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      const shade=ctx.createRadialGradient(w*.5,h*.45,Math.min(w,h)*.12,w*.5,h*.45,Math.max(w,h)*.75);shade.addColorStop(0,'#03050a00');shade.addColorStop(1,'#03050aa8');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    }
    timelinePoint(u,row,w,h){return {x:w*(u*1.2-.1),y:h*(.35+row*.16)+Math.sin(u*7+row*2)*h*.095+Math.sin(u*15+row)*h*.02};}
    drawTimelines(w,h,t){const ctx=this.ctx;
      for(let row=0;row<3;row++){
        ctx.globalAlpha=.21;ctx.strokeStyle=row===1?'#c6a3eb':'#6b9ed8';ctx.lineWidth=.65;ctx.beginPath();
        for(let i=0;i<=60;i++){const p=this.timelinePoint(i/60,row,w,h);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
        const branch=this.timelinePoint(.55,row,w,h);ctx.beginPath();ctx.moveTo(branch.x,branch.y);ctx.bezierCurveTo(w*.7,branch.y-h*.05,w*.82,branch.y+h*.18,w*1.1,branch.y+h*.08);ctx.stroke();
        for(let pulse=0;pulse<2;pulse++){const u=(t*.018+row*.23+pulse*.5)%1,p=this.timelinePoint(u,row,w,h);ctx.globalAlpha=.65;ctx.drawImage(this.glow,p.x-9,p.y-9,18,18);}
      }
    }
    drawRift(x,y,r,t,index){const ctx=this.ctx;ctx.save();ctx.translate(x,y);ctx.rotate(index*.6-.4);ctx.globalAlpha=.3;ctx.drawImage(this.galaxies[index],-r*2,-r*2,r*4,r*4);ctx.globalAlpha=.6;
      for(let i=0;i<3;i++)this.ellipse(0,0,r*(.9+i*.12),r*(.32+i*.04),Math.sin(t*.08+index)*.2,'rgba('+(index?'130,164,255':'192,139,246')+','+(.5-i*.12)+')',.8);
      ctx.globalAlpha=.7;const phase=t*.12;ctx.drawImage(this.glow,Math.cos(phase)*r-10,Math.sin(phase)*r*.33-10,20,20);ctx.restore();
    }
    drawBlackHole(x,y,r,t){const ctx=this.ctx;ctx.save();ctx.translate(x,y);ctx.rotate(-.22);
      ctx.globalAlpha=.9;ctx.drawImage(this.halo,-r*3.5,-r*3.5,r*7,r*7);
      // A foreshortened rotating disk behind an opaque event horizon.
      ctx.save();ctx.scale(1,.24);ctx.rotate(t*.055);ctx.globalAlpha=.95;ctx.drawImage(this.disk,-r*3.5,-r*3.5,r*7,r*7);ctx.restore();
      this.ellipse(0,0,r*1.15,r*1.19,0,'#e7b27c40',r*.16);
      this.ellipse(0,-r*.02,r*1.1,r*1.14,0,'#ffe3b4a0',r*.032);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#020309';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
      // Gravitationally lensed upper arc and hot foreground crossing the shadow.
      ctx.globalCompositeOperation='screen';this.ellipse(0,0,r*1.025,r*1.025,0,'#ffedc7b0',r*.016);
      ctx.strokeStyle='#ffd8a4';ctx.globalAlpha=.55;ctx.lineWidth=r*.035;ctx.beginPath();ctx.ellipse(0,0,r*1.14,r*1.14,0,Math.PI*1.05,Math.PI*1.97);ctx.stroke();
      ctx.save();ctx.beginPath();ctx.rect(-r*4,0,r*8,r*2);ctx.clip();ctx.scale(1,.19);ctx.rotate(t*.055);ctx.globalAlpha=.85;ctx.drawImage(this.disk,-r*3.5,-r*3.5,r*7,r*7);ctx.restore();
      ctx.globalAlpha=.75;this.ellipse(0,r*.015,r*2.7,r*.16,0,'#ffdba87a',r*.025);ctx.restore();
    }
    destroy(){this.enabled=false;cancelAnimationFrame(this.frame);this.observer.disconnect();removeEventListener('resize',this.resize);removeEventListener('pointermove',this.onPointer);document.removeEventListener('visibilitychange',this.sync);this.motion.removeEventListener('change',this.sync);this.canvas.remove();}
  }
  window.LuxCosmicMultiverse=CosmicMultiverse;
})();
