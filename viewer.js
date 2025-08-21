// Viewer immagini (zoom/pan/ruota) + PDF (embed)
(function(){
  const viewer = document.getElementById('viewer');
  const viewerContent = document.getElementById('viewerContent');
  const btnClose = document.getElementById('viewerClose');
  const btnNewTab = document.getElementById('vtNewTab');
  const btnDownload = document.getElementById('vtDownload');
  const btnZoomIn = document.getElementById('vtZoomIn');
  const btnZoomOut = document.getElementById('vtZoomOut');
  const btnFit = document.getElementById('vtFit');
  const btnRotate = document.getElementById('vtRotate');

  let stage=null, scale=1, rot=0, panX=0, panY=0, startX=0, startY=0, isPanning=false;

  function applyTransform(){
    if(stage){
      stage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale}) rotate(${rot}deg)`;
    }
  }
  function resetTransform(){ scale=1; rot=0; panX=0; panY=0; applyTransform(); }
  function close(){ viewer.classList.remove('open'); viewerContent.innerHTML=''; stage=null; }
  function open(node, blobUrl){
    viewerContent.innerHTML=''; viewerContent.appendChild(node);
    if(blobUrl){ btnNewTab.onclick = ()=> window.open(blobUrl, '_blank'); btnDownload.href = blobUrl; }
    else { btnNewTab.onclick = null; btnDownload.removeAttribute('href'); }
    viewer.classList.add('open');
  }
  function openImage(url){
    const wrap=document.createElement('div'); wrap.className='stage';
    const img=document.createElement('img'); img.className='stage-img'; img.src=url;
    wrap.appendChild(img); viewerContent.innerHTML=''; viewerContent.appendChild(wrap);
    stage=wrap; resetTransform();
    viewerContent.onmousedown = (e)=>{ isPanning=true; startX=e.clientX; startY=e.clientY; };
    viewerContent.onmousemove = (e)=>{ if(!isPanning) return; panX += (e.clientX-startX); panY += (e.clientY-startY); startX=e.clientX; startY=e.clientY; applyTransform(); };
    viewerContent.onmouseup = ()=>{ isPanning=false; };
    viewerContent.onmouseleave = ()=>{ isPanning=false; };
    viewerContent.ondblclick = ()=>{ scale = (scale===1 ? 1.8 : 1); panX=0; panY=0; applyTransform(); };
    btnZoomIn.onclick = ()=>{ scale = Math.min(6, scale+0.2); applyTransform(); };
    btnZoomOut.onclick = ()=>{ scale = Math.max(0.2, scale-0.2); applyTransform(); };
    btnFit.onclick = ()=>{ scale=1; panX=0; panY=0; rot=0; applyTransform(); };
    btnRotate.onclick = ()=>{ rot=(rot+90)%360; applyTransform(); };
    btnNewTab.onclick = ()=> window.open(url, '_blank'); btnDownload.href = url;
    viewer.classList.add('open');
  }
  function openPdf(url){
    try{ const emb=document.createElement('embed'); emb.type='application/pdf'; emb.src=url; open(emb, url); }
    catch(err){ window.open(url, '_blank'); }
  }

  btnClose.addEventListener('click', close);
  viewer.addEventListener('click', (e)=>{ if(e.target===viewer){ close(); } });

  window.Viewer = { openImage, openPdf, open, close };
})();
