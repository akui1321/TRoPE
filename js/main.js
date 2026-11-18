/* Three-case results carousel.
   Four matching source frames are encoded into one comparison video, so every
   column has exactly the same playback clock on desktop and mobile. */
(() => {
  'use strict';
  const cases=window.TROPE_CASES;
  const perPage=3;
  const pageCount=Math.ceil(cases.length/perPage);
  const gallery=document.getElementById('results-manipulation');
  const dots=document.getElementById('page-buttons');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=window.matchMedia('(max-width: 700px)');
  let page=0, players=[];

  function element(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!=null)node.textContent=text;
    return node;
  }

  function createCase(info){
    const card=element('article','x-card result-card');
    card.dataset.caseId=info.id;
    const heading=element('div','case-heading');
    const title=element('h3','case-title',info.title);
    title.id=`case-${info.id}`;
    card.setAttribute('aria-labelledby',title.id);
    heading.append(title,element('span','case-dataset',info.dataset));
    const video=element('video','comparison-video');
    video.muted=true;video.playsInline=true;video.loop=true;video.preload='metadata';
    video.setAttribute('aria-label',`${info.title}: Input Video, Ground Truth, Motion 3-to-4, and TRoPE, synchronized`);
    const controls=element('div','result-controls');
    const toggle=element('button','play-toggle','Play');toggle.type='button';
    const slider=element('input','timeline');
    slider.type='range';slider.min='0';slider.max='3';slider.step='0.001';slider.value='0';
    slider.setAttribute('aria-label',`Playback position for ${info.title}`);
    const time=element('span','time-label','0.0 / 3s');
    controls.append(toggle,slider,time);
    card.append(heading,video,controls,element('p','case-caption','Input camera at left; a shared novel view for the three meshes. Slowed playback with a brief hold on the final frame.'));
    let wantsPlay=false,active=false,disposed=false,seeking=false,autostarted=false,pending=false,frame=0;
    let restoreTime=0,layout='';
    function label(){toggle.textContent=wantsPlay?'Pause':'Play';toggle.setAttribute('aria-label',`${wantsPlay?'Pause':'Play'} ${info.title}`);}
    async function playIfAllowed(){
      if(disposed||pending||!active||!wantsPlay||seeking||document.hidden)return;
      pending=true;
      try{
        await video.play();
        if(disposed||!active||!wantsPlay||seeking||document.hidden)video.pause();
      }catch(error){
        if(error.name==='NotAllowedError'){wantsPlay=false;label();}
      }finally{pending=false;}
    }
    function source(){
      const next=mobile.matches?'mobile':'wide';
      if(next===layout)return;
      restoreTime=video.currentTime||0;layout=next;
      video.pause();
      video.poster=`assets/comparisons/${info.id}/${layout}.jpg`;
      video.src=`assets/comparisons/${info.id}/${layout}.mp4`;
      video.load();
    }
    video.addEventListener('loadedmetadata',()=>{
      slider.max=String(video.duration);
      video.currentTime=Math.min(restoreTime,Math.max(0,video.duration-.001));
      playIfAllowed();
    });
    video.addEventListener('canplay',playIfAllowed);
    toggle.addEventListener('click',()=>{wantsPlay=!wantsPlay;label();if(wantsPlay)playIfAllowed();else video.pause();});
    video.addEventListener('click',()=>toggle.click());
    slider.addEventListener('input',()=>{
      seeking=true;video.pause();video.currentTime=Number(slider.value);time.textContent=`${Number(slider.value).toFixed(1)} / 3s`;
    });
    slider.addEventListener('change',()=>{seeking=false;if(wantsPlay)playIfAllowed();});
    function tick(){
      if(disposed)return;
      if(!seeking&&video.readyState>=1){slider.value=String(video.currentTime);time.textContent=`${video.currentTime.toFixed(1)} / 3s`;}
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    const observer=new IntersectionObserver(([entry])=>{
      active=entry.isIntersecting;
      if(active){
        if(!autostarted){autostarted=true;if(!reducedMotion.matches){wantsPlay=true;label();}}
        playIfAllowed();
      }else video.pause();
    },{threshold:.01});
    observer.observe(card);
    mobile.addEventListener('change',source);
    source();label();
    return {card,pause(){video.pause();},resume(){playIfAllowed();},dispose(){
      disposed=true;observer.disconnect();mobile.removeEventListener('change',source);cancelAnimationFrame(frame);
      video.pause();video.removeAttribute('src');video.load();
    }};
  }

  function render(){
    players.forEach(p=>p.dispose());players=[];gallery.replaceChildren();
    cases.slice(page*perPage,(page+1)*perPage).forEach(info=>{const p=createCase(info);players.push(p);gallery.append(p.card);});
    [...dots.children].forEach((dot,index)=>{const selected=index===page;dot.classList.toggle('x-carousel-page-active',selected);dot.setAttribute('aria-current',selected?'page':'false');});
    document.getElementById('page-status').textContent=`Page ${page+1} of ${pageCount} · Examples ${page*perPage+1}–${Math.min((page+1)*perPage,cases.length)} of ${cases.length}`;
  }
  function go(index){page=(index+pageCount)%pageCount;render();}
  for(let i=0;i<pageCount;i++){
    const dot=element('button','x-carousel-page');dot.type='button';dot.setAttribute('aria-label',`Results page ${i+1}`);
    dot.addEventListener('click',()=>go(i));dots.append(dot);
  }
  document.getElementById('page-prev').addEventListener('click',()=>go(page-1));
  document.getElementById('page-next').addEventListener('click',()=>go(page+1));
  document.addEventListener('visibilitychange',()=>{
    players.forEach(p=>document.hidden?p.pause():p.resume());
  });
  render();
})();
