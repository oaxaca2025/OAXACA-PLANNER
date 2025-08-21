// Allegati inline con IndexedDB (foto miniature + PDF link)
(function(){
  const DB='planner_files', STORE='files';
  function idbOpen(cb){
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=e=>{ const db=e.target.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
    req.onsuccess=e=>cb(null,e.target.result);
    req.onerror=()=>cb(req.error||new Error('idb error'));
  }
  function idbPut(id, blob, name, cb){
    idbOpen((err,db)=>{ if(err) return cb&&cb(err);
      const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put({id,blob,name, type:blob.type||''});
      tx.oncomplete=()=>cb&&cb(null,true); tx.onerror=()=>cb&&cb(tx.error||new Error('tx error'));
    });
  }
  function idbGet(id, cb){
    idbOpen((err,db)=>{ if(err) return cb&&cb(err);
      const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
      req.onsuccess=()=>cb&&cb(null, req.result||null);
      req.onerror=()=>cb&&cb(req.error||new Error('get error'));
    });
  }
  function genId(){ return 'att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8); }

  function insertAtCaret(container, node){
    const sel = window.getSelection();
    if(sel && sel.rangeCount){
      const range = sel.getRangeAt(0);
      if(container.contains(range.startContainer)){
        range.deleteContents();
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges(); sel.addRange(range);
        return;
      }
    }
    container.appendChild(node);
  }

  function compressAndStoreImage(img, name, done){
    const canvas=document.createElement('canvas');
    const maxDim=1400, scale=Math.min(1, maxDim/Math.max(img.width,img.height));
    canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
      const id=genId();
      idbPut(id, blob, (name||'Foto.jpg').replace(/\.(png|webp|heic|heif)$/i,'.jpg'), ()=>{
        const url=URL.createObjectURL(blob); done(id,url);
      });
    }, 'image/jpeg', 0.82);
  }

  function handlePaste(editor, e){
    const cd=e.clipboardData; if(!cd) return;
    for(const item of cd.items){
      if(item.kind==='file'){
        const file=item.getAsFile(); if(!file) continue;
        if(file.type.startsWith('image/')){
          const r=new FileReader();
          r.onload=ev=>{ const img=new Image();
            img.onload=()=> compressAndStoreImage(img, file.name, (id,blobURL)=>{
              const el=document.createElement('img'); el.className='attach-thumb'; el.setAttribute('data-attach-id', id); el.src=blobURL;
              insertAtCaret(editor, el);
            });
            img.src=ev.target.result;
          };
          r.readAsDataURL(file);
          e.preventDefault(); return;
        }else if(file.type==='application/pdf'){
          const r=new FileReader();
          r.onload=ev=>{ fetch(ev.target.result).then(resp=>resp.blob()).then(pdfBlob=>{
            const id=genId(); idbPut(id, pdfBlob, file.name||'Documento.pdf', ()=>{
              const a=document.createElement('a'); a.textContent=file.name||'Documento.pdf'; a.href='javascript:void(0)'; a.setAttribute('data-attach-id', id);
              insertAtCaret(editor, a);
            });
          });};
          r.readAsDataURL(file);
          e.preventDefault(); return;
        }
      }
    }
    const text=cd.getData('text/plain');
    if(text && /^https?:\/\//i.test(text.trim())){
      const a=document.createElement('a'); a.href=text.trim(); a.textContent=text.trim(); a.target='_blank'; a.rel='noopener';
      insertAtCaret(editor, a);
      e.preventDefault();
    }
  }

  function attachFromInput(input){
    const editor = input.closest('.day').querySelector('.editor');
    const files=input.files; if(!files||!files.length) return;
    Array.from(files).forEach(file=>{
      if(file.type.startsWith('image')){
        const r=new FileReader();
        r.onload=e=>{ const img=new Image();
          img.onload=()=> compressAndStoreImage(img, file.name, (id,blobURL)=>{
            const el=document.createElement('img'); el.className='attach-thumb'; el.setAttribute('data-attach-id', id); el.src=blobURL;
            insertAtCaret(editor, el);
          });
          img.src=e.target.result;
        };
        r.readAsDataURL(file);
      }else if(file.type==='application/pdf'){
        const r=new FileReader();
        r.onload=e=>{ fetch(e.target.result).then(resp=>resp.blob()).then(pdfBlob=>{
          const id=genId(); idbPut(id, pdfBlob, file.name||'Documento.pdf', ()=>{
            const a=document.createElement('a'); a.textContent=file.name||'Documento.pdf'; a.href='javascript:void(0)'; a.setAttribute('data-attach-id', id);
            insertAtCaret(editor, a);
          });
        }); };
        r.readAsDataURL(file);
      }
    });
    input.value='';
  }

  function rehydrate(container){
    container.querySelectorAll('img.attach-thumb[data-attach-id]').forEach(img=>{
      const id=img.getAttribute('data-attach-id');
      idbGet(id,(err, rec)=>{ if(rec){ img.src = URL.createObjectURL(rec.blob); } });
    });
  }

  function wireClicks(container){
    container.addEventListener('click',(e)=>{
      const a=e.target.closest('a[data-attach-id]');
      if(a){
        const id=a.getAttribute('data-attach-id');
        idbGet(id,(err,rec)=>{ if(!rec) return; Viewer.openPdf(URL.createObjectURL(rec.blob)); });
        return;
      }
      const img=e.target.closest('img.attach-thumb[data-attach-id]');
      if(img){
        const id=img.getAttribute('data-attach-id');
        idbGet(id,(err,rec)=>{ if(!rec) return; Viewer.openImage(URL.createObjectURL(rec.blob)); });
      }
    });
  }

  function initEditors(scope){
    const root = scope || document;
    root.querySelectorAll('.editor').forEach(ed=>{
      ed.addEventListener('paste', e=> handlePaste(ed, e));
    });
    wireClicks(root);
    rehydrate(root);
  }

  window.Attachments = { initEditors, attachFromInput, insertAtCaret };
})();
