(function(){
  const viewer=document.createElement('div');
  viewer.className='viewer'; viewer.id='viewer';
  viewer.innerHTML=`<div class="inner">
    <div class="vtoolbar">
      <button class="vbtn" id="vtFit" title="Adatta">⤢</button>
      <button class="vbtn" id="vtZoomIn" title="Zoom +">＋</button>
      <button class="vbtn" id="vtZoomOut" title="Zoom −">－</button>
      <button class="vbtn" id="vtRotate" title="Ruota">⟳</button>
      <button class="vbtn" id="vtNewTab" title="Apri in nuova scheda">↗︎</button>
      <a class="vbtn" id="vtDownload" title="Scarica" download>⬇︎</a>
      <button class="vbtn" id="viewerClose" title="Chiudi">✕</button>
    </div>
    <div id="viewerContent"></div>
  </div>`;
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(viewer));

  const viewerContent = ()=>document.getElementById('viewerContent');
  const btn = id=>document.getElementById(id);

  let stage=null, scale=1, rot=0, panX=0, panY=0, startX=0, startY=0, isPanning=false;

  function apply(){ if(stage){ stage.style.transform=`translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale}) rotate(${rot}deg)`; } }
  function reset(){ scale=1; rot=0; panX=0; panY=0; apply(); }
  function openNode(node, url){
    viewerContent().innerHTML=''; viewerContent().appendChild(node);
    document.getElementById('viewer').classList.add('open');
    const n=btn('vtNewTab'), d=btn('vtDownload');
    if(url){ n.onclick=()=>window.open(url,'_blank'); d.href=url; } else { n.onclick=null; d.removeAttribute('href'); }
  }
  function openImage(url){
    const wrap=document.createElement('div'); wrap.className='stage';
    const img=document.createElement('img'); img.className='stage-img'; img.src=url; wrap.appendChild(img);
    openNode(wrap,url); stage=wrap; reset();
    const vc=viewerContent();
    vc.onmousedown=e=>{ isPanning=true; startX=e.clientX; startY=e.clientY; };
    vc.onmousemove=e=>{ if(!isPanning) return; panX+=e.clientX-startX; panY+=e.clientY-startY; startX=e.clientX; startY=e.clientY; apply(); };
    vc.onmouseup=vc.onmouseleave=()=>{ isPanning=false; };
    vc.ondblclick=()=>{ scale=(scale===1?1.8:1); panX=0; panY=0; apply(); };
    btn('vtZoomIn').onclick=()=>{ scale=Math.min(6,scale+0.2); apply(); };
    btn('vtZoomOut').onclick=()=>{ scale=Math.max(0.2,scale-0.2); apply(); };
    btn('vtFit').onclick=()=>{ reset(); };
    btn('vtRotate').onclick=()=>{ rot=(rot+90)%360; apply(); };
    btn('viewerClose').onclick=()=>{ document.getElementById('viewer').classList.remove('open'); viewerContent().innerHTML=''; stage=null; };
  }
  function openPdf(url){
    try{ const emb=document.createElement('embed'); emb.type='application/pdf'; emb.src=url; openNode(emb,url); }
    catch(e){ window.open(url,'_blank'); }
  }
  window.Viewer={openImage, openPdf};
})();