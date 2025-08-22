(function(){
  const DB='planner_files', STORE='files';
  function idb(cb){ const r=indexedDB.open(DB,1); r.onupgradeneeded=e=>{ const db=e.target.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); }; r.onsuccess=e=>cb(null,e.target.result); r.onerror=()=>cb(r.error); }
  function put(id, blob, name, cb){ idb((err,db)=>{ if(err) return cb&&cb(err); const tx=db.transaction(STORE,'readwrite').objectStore(STORE).put({id,blob,name,type:blob.type||''}); tx.transaction.oncomplete=()=>cb&&cb(null,true); tx.transaction.onerror=()=>cb&&cb(tx.transaction.error); }); }
  function get(id, cb){ idb((err,db)=>{ if(err) return cb&&cb(err); const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id); req.onsuccess=()=>cb&&cb(null,req.result||null); req.onerror=()=>cb&&cb(req.error); }); }
  function gen(){ return 'att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8); }

  function insertAtCaret(ed, node){
    const sel=window.getSelection(); if(sel && sel.rangeCount){ const range=sel.getRangeAt(0); if(ed.contains(range.startContainer)){ range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); return; } }
    ed.appendChild(node);
  }

  function compress(img, name, done){
    const c=document.createElement('canvas'); const max=1400, k=Math.min(1, max/Math.max(img.width,img.height));
    c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
    const x=c.getContext('2d'); x.drawImage(img,0,0,c.width,c.height);
    c.toBlob(b=>{ const id=gen(); put(id,b,(name||'Foto.jpg').replace(/\.(png|webp|heic|heif)$/i,'.jpg'), ()=>{ const url=URL.createObjectURL(b); done(id,url); }); }, 'image/jpeg', .82);
  }

  function onPaste(ed, e){
    const cd=e.clipboardData; if(!cd) return;
    for(const it of cd.items){
      if(it.kind==='file'){ const file=it.getAsFile(); if(!file) continue;
        if(file.type.startsWith('image/')){ const r=new FileReader(); r.onload=ev=>{ const img=new Image(); img.onload=()=>compress(img, file.name, (id,u)=>{ const el=document.createElement('img'); el.className='attach-thumb'; el.dataset.attachId=id; el.src=u; insertAtCaret(ed, el); }); img.src=ev.target.result; }; r.readAsDataURL(file); e.preventDefault(); return; }
        if(file.type==='application/pdf'){ const r=new FileReader(); r.onload=ev=>{ fetch(ev.target.result).then(resp=>resp.blob()).then(b=>{ const id=gen(); put(id,b,file.name||'Documento.pdf', ()=>{ const a=document.createElement('a'); a.textContent=file.name||'Documento.pdf'; a.href='javascript:void(0)'; a.dataset.attachId=id; insertAtCaret(ed, a); }); }); }; r.readAsDataURL(file); e.preventDefault(); return; }
      }
    }
    const text=cd.getData('text/plain'); if(text && /^https?:\/\//i.test(text.trim())){ const a=document.createElement('a'); a.href=text.trim(); a.textContent=text.trim(); a.target='_blank'; a.rel='noopener'; insertAtCaret(ed, a); e.preventDefault(); }
  }

  function fromInput(input){
    const ed=input.closest('.day')?.querySelector('.editor'); const files=input.files; if(!ed||!files||!files.length) return;
    Array.from(files).forEach(file=>{
      if(file.type.startsWith('image/')){ const r=new FileReader(); r.onload=e=>{ const img=new Image(); img.onload=()=>compress(img,file.name,(id,u)=>{ const el=document.createElement('img'); el.className='attach-thumb'; el.dataset.attachId=id; el.src=u; insertAtCaret(ed, el); }); img.src=e.target.result; }; r.readAsDataURL(file); }
      else if(file.type==='application/pdf'){ const r=new FileReader(); r.onload=e=>{ fetch(e.target.result).then(resp=>resp.blob()).then(b=>{ const id=gen(); put(id,b,file.name||'Documento.pdf', ()=>{ const a=document.createElement('a'); a.textContent=file.name||'Documento.pdf'; a.href='javascript:void(0)'; a.dataset.attachId=id; insertAtCaret(ed, a); }); }); }; r.readAsDataURL(file); }
    });
    input.value='';
  }

  function rehydrate(root){
    root.querySelectorAll('img.attach-thumb[data-attach-id], img.attach-thumb[data-attachid]').forEach(img=>{
      const id=img.getAttribute('data-attach-id')||img.getAttribute('data-attachid');
      get(id,(err,rec)=>{ if(rec){ img.src=URL.createObjectURL(rec.blob); } });
    });
  }

  function clicks(root){
    root.addEventListener('click',(e)=>{
      const a=e.target.closest('a[data-attach-id],a[data-attachid]'); if(a){ const id=a.getAttribute('data-attach-id')||a.getAttribute('data-attachid'); get(id,(err,rec)=>{ if(rec){ Viewer.openPdf(URL.createObjectURL(rec.blob)); } }); return; }
      const img=e.target.closest('img.attach-thumb[data-attach-id],img.attach-thumb[data-attachid]'); if(img){ const id=img.getAttribute('data-attach-id')||img.getAttribute('data-attachid'); get(id,(err,rec)=>{ if(rec){ Viewer.openImage(URL.createObjectURL(rec.blob)); } }); }
    });
  }

  function observe(root){
    const mo=new MutationObserver(list=>{
      list.forEach(m=>{
        m.addedNodes.forEach(n=>{
          if(n.nodeType===1){
            n.querySelectorAll?.('.editor').forEach(ed=> ed.addEventListener('paste', e=>onPaste(ed,e)));
            n.querySelectorAll?.('input[type=file]').forEach(inp=>{ if(!inp._wired){ inp.addEventListener('change', ()=>fromInput(inp)); inp._wired=true; } });
          }
        });
      });
    });
    mo.observe(root,{childList:true,subtree:true});
  }

  function init(scope){
    const root=scope||document;
    root.querySelectorAll('.editor').forEach(ed=> ed.addEventListener('paste', e=>onPaste(ed,e)));
    root.querySelectorAll('input[type=file]').forEach(inp=>{ if(!inp._wired){ inp.addEventListener('change', ()=>fromInput(inp)); inp._wired=true; } });
    clicks(root);
    rehydrate(root);
    observe(root);
  }

  window.Attachments={ init, fromInput };
  document.addEventListener('DOMContentLoaded', ()=> init(document));
})();