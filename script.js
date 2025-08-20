(function(){
  'use strict';

  var planner = document.getElementById('planner');
  var btnAdd = document.getElementById('btnAdd');
  var bgInput = document.getElementById('bgInput');

  var plMenu = document.getElementById('plannerMenu');
  var plBtn = plMenu.querySelector('.menu-btn');
  var plUpload = document.getElementById('plUpload');
  var plFit = document.getElementById('plFit');
  var plMove = document.getElementById('plMove');
  var plFitState = document.getElementById('plFitState');
  var plMoveState = document.getElementById('plMoveState');
  var langSelect = document.getElementById('langSelect');

  var viewer = document.getElementById('viewer');
  var viewerClose = document.getElementById('viewerClose');
  var viewerContent = document.getElementById('viewerContent');

  var STORAGE_KEY = 'planner_state_v15_refs';  // v10.5-r2 storage key (refs-only)
  var BG_KEY = 'plannerBackground';
  var MODE_KEY = 'plannerBgMode';
  var POSX = 'plannerBgX', POSY='plannerBgY';
  var LANG_KEY = 'plannerLang';
  var MOVE_KEY = 'plannerBgMoving';

  var translations = {
    it:{days:["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"],sections:["Luoghi da visitare","Alloggio","Voli / Spostamenti","Note"],dayWord:"Giorno",mode:{cover:"Riempie",contain:"Contiene"}},
    en:{days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],sections:["Places to visit","Accommodation","Flights / Transfers","Notes"],dayWord:"Day",mode:{cover:"Cover",contain:"Contain"}},
    es:{days:["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],sections:["Lugares para visitar","Alojamiento","Vuelos / Traslados","Notas"],dayWord:"Día",mode:{cover:"Cubrir",contain:"Contener"}}
  };

  var currentLang = localStorage.getItem(LANG_KEY) || 'it';
  langSelect.value = currentLang;

  // --- Basic menus ---
  if(plBtn){ plBtn.addEventListener('click', function(){ plMenu.classList.toggle('open'); }); }
  document.addEventListener('click', function(e){ if(!plMenu.contains(e.target)) plMenu.classList.remove('open'); });

  // --- Background tools ---
  var moving = (localStorage.getItem(MOVE_KEY)==='1');
  var startX=0, startY=0, baseX=parseInt(localStorage.getItem(POSX)||'50'), baseY=parseInt(localStorage.getItem(POSY)||'50');
  function applyBg(){
    var saved = localStorage.getItem(BG_KEY);
    if(saved) document.body.style.backgroundImage = 'url('+saved+')';
    var mode = localStorage.getItem(MODE_KEY) || 'cover';
    document.body.style.backgroundSize = mode;
    var x = parseInt(localStorage.getItem(POSX)||'50');
    var y = parseInt(localStorage.getItem(POSY)||'50');
    document.body.style.backgroundPosition = x+'% '+y+'%';
    plFitState.textContent = translations[currentLang].mode[mode];
    plMoveState.textContent = moving ? 'On' : 'Off';
  }
  applyBg();

  if(plUpload){ plUpload.addEventListener('click', function(){ if(bgInput) bgInput.click(); }); }
  if(bgInput){ bgInput.addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(ev){ localStorage.setItem(BG_KEY, ev.target.result); applyBg(); };
    r.readAsDataURL(f);
  }); }

  if(plFit){ plFit.addEventListener('click', function(){
    var cur=localStorage.getItem(MODE_KEY)||'cover';
    var nxt=cur==='cover'?'contain':'cover';
    localStorage.setItem(MODE_KEY, nxt);
    applyBg();
  }); }

  if(plMove){ plMove.addEventListener('click', function(){ moving=!moving; localStorage.setItem(MOVE_KEY, moving?'1':'0'); applyBg(); }); }
  function onDown(e){ if(!moving) return; startX=e.clientX; startY=e.clientY; document.body.dataset.drag='1'; }
  function onMove(e){
    if(!moving || !document.body.dataset.drag) return;
    var dx=e.clientX-startX, dy=e.clientY-startY;
    var nx=Math.max(0, Math.min(100, baseX + dx*0.1));
    var ny=Math.max(0, Math.min(100, baseY + dy*0.1));
    document.body.style.backgroundPosition=nx+'% '+ny+'%';
  }
  function onUp(){
    if(!moving) return;
    delete document.body.dataset.drag;
    var pos=getComputedStyle(document.body).backgroundPosition.split(' ');
    var nx=Math.round(parseFloat(pos[0])); var ny=Math.round(parseFloat(pos[1]));
    baseX=nx; baseY=ny; localStorage.setItem(POSX, baseX); localStorage.setItem(POSY, baseY);
    applyBg();
  }
  document.body.addEventListener('mousedown', onDown);
  document.body.addEventListener('mousemove', onMove);
  document.body.addEventListener('mouseup', onUp);
  document.body.addEventListener('mouseleave', onUp);
  document.body.addEventListener('touchstart', function(e){ onDown(e.touches[0]); });
  document.body.addEventListener('touchmove', function(e){ onMove(e.touches[0]); e.preventDefault(); }, {passive:false});
  document.body.addEventListener('touchend', onUp);

  // --- Viewer ---
  function openViewer(node){ viewerContent.innerHTML=''; viewer.classList.add('open'); viewerContent.appendChild(node); }
  function closeViewer(){ viewer.classList.remove('open'); viewerContent.innerHTML=''; }
  viewer.addEventListener('click', function(e){ if(e.target===viewer) closeViewer(); });
  viewerClose.addEventListener('click', closeViewer);

  // --- Intelligent lists ---
  function ensureListStructure(div){
    var ul = div.querySelector('ul');
    if(!ul){
      ul = document.createElement('ul');
      var li = document.createElement('li'); li.appendChild(document.createElement('br'));
      ul.appendChild(li); div.appendChild(ul);
    }else if(ul.children.length===0){
      var li2=document.createElement('li'); li2.appendChild(document.createElement('br'));
      ul.appendChild(li2);
    }
  }
  function getSelectionInfo(){
    var sel = window.getSelection ? window.getSelection() : null;
    if(!sel || sel.rangeCount===0) return {sel:null, range:null, node:null};
    var range=sel.getRangeAt(0);
    var node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentNode;
    return {sel:sel, range:range, node:node};
  }
  function closestLi(node){
    while(node && node.nodeType===1){
      if(node.tagName==='LI') return node;
      node = node.parentNode;
    }
    return null;
  }
  function insertBrAtRange(range){
    var br=document.createElement('br');
    range.deleteContents(); range.insertNode(br);
    range.setStartAfter(br); range.setEnd(range.startContainer, range.startOffset);
    var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  function setupListEditing(div){
    ensureListStructure(div);
    div.addEventListener('keydown', function(e){
      if(e.key==='Enter'){
        var info=getSelectionInfo(); var li=closestLi(info.node);
        if(e.shiftKey){
          e.preventDefault(); insertBrAtRange(info.range); return;
        }else{
          if(!li){
            e.preventDefault();
            ensureListStructure(div);
            var ul = div.querySelector('ul');
            var newLi=document.createElement('li'); newLi.appendChild(document.createElement('br'));
            ul.appendChild(newLi);
            return;
          }
        }
      }
    });
    div.addEventListener('blur', function(){ ensureListStructure(div); }, true);
    div.addEventListener('input', function(){ ensureListStructure(div); });
  }

  // --- IndexedDB for attachments ---
  var DB_NAME='plannerAttachments', STORE='files';
  function idbPut(id, blob, cb){
    var req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = function(e){ var d=e.target.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'}); };
    req.onsuccess = function(e){
      var d=e.target.result; var tx=d.transaction(STORE,'readwrite'); var st=tx.objectStore(STORE);
      tx.oncomplete=function(){ cb&&cb(true); }; tx.onerror=function(){ cb&&cb(false); };
      st.put({id:id, blob:blob, type: blob.type||''});
    };
    req.onerror = function(){ cb&&cb(false); };
  }
  function idbGet(id, cb){
    var req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = function(e){ var d=e.target.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'}); };
    req.onsuccess = function(e){
      var d=e.target.result; var tx=d.transaction(STORE,'readonly'); var st=tx.objectStore(STORE);
      var g=st.get(id); g.onsuccess=function(){ var r=g.result; cb(r?r.blob:null, r?r.type:''); }; g.onerror=function(){ cb(null,''); };
    };
    req.onerror = function(){ cb(null,''); };
  }
  // Compress images before storing (space-friendly)
  function compressImageToJPEG(file, maxDim, quality, cb){
    var img = new Image();
    var fr = new FileReader();
    fr.onload = function(e){ img.src = e.target.result; };
    img.onload = function(){
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxDim/Math.max(w,h));
      var nw = Math.round(w*scale), nh = Math.round(h*scale);
      var canvas = document.createElement('canvas');
      canvas.width = nw; canvas.height = nh;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, nw, nh);
      canvas.toBlob(function(blob){ cb(blob); }, 'image/jpeg', quality);
    };
    fr.readAsDataURL(file);
  }
  function insertImageAttachment(div, id, blob){
    idbPut(id, blob, function(){
      var url = URL.createObjectURL(blob);
      var img = document.createElement('img');
      img.className='attach-thumb';
      img.setAttribute('data-attach-id', id);
      img.src = url;
      div.appendChild(img);
      save();
    });
  }
  function insertPDFAttachment(div, id, blob, fileName){
    idbPut(id, blob, function(){
      var a=document.createElement('a');
      a.textContent=fileName||'Documento PDF';
      a.href='javascript:void(0)';
      a.setAttribute('data-attach-id', id);
      a.style.display='inline-block'; a.style.margin='6px 0'; a.style.textDecoration='underline';
      div.appendChild(a);
      save();
    });
  }

  // Delegate attachment open
  planner.addEventListener('click', function(e){
    var imgEl = e.target.closest && e.target.closest('img.attach-thumb');
    if(imgEl){
      var id = imgEl.getAttribute('data-attach-id');
      idbGet(id, function(blob){
        if(!blob) return;
        var url = URL.createObjectURL(blob);
        var big = new Image(); big.src = url;
        openViewer(big);
      });
      return;
    }
    var linkEl = e.target.closest && e.target.closest('a[data-attach-id]');
    if(linkEl){
      var id2 = linkEl.getAttribute('data-attach-id');
      idbGet(id2, function(blob, type){
        if(!blob) return;
        if(type==='application/pdf'){
          var url = URL.createObjectURL(blob);
          var iframe = document.createElement('iframe');
          iframe.src = url; iframe.style.width='90vw'; iframe.style.height='90vh';
          openViewer(iframe);
        }
      });
    }
  });

  // --- Create/bind a day ---
  function createDay(data){
    var section=document.createElement('section'); section.className='day';
    section.innerHTML = '\
      <div class="day-head">\
        <div class="day-date">\
          <input class="date-input" type="date" autocomplete="off" value="">\
          <span class="date-display" style="display:none"></span>\
        </div>\
        <div class="day-num">'+translations[currentLang].dayWord+' <span class="n"></span></div>\
      </div>\
      <div class="row">\
        <div class="card visit" contenteditable="true"><h3>'+translations[currentLang].sections[0]+'</h3><ul><li><br></li></ul></div>\
        <div class="card stay"  contenteditable="true"><h3>'+translations[currentLang].sections[1]+'</h3><ul><li><br></li></ul></div>\
        <div class="card move"  contenteditable="true"><h3>'+translations[currentLang].sections[2]+'</h3><ul><li><br></li></ul></div>\
        <div class="card notes" contenteditable="true"><h3>'+translations[currentLang].sections[3]+'</h3><ul><li><br></li></ul></div>\
      </div>\
      <div class="tools">\
        <button class="tool dup" type="button">Duplica</button>\
        <button class="tool del" type="button">Elimina</button>\
      </div>';

    var input=section.querySelector('.date-input');
    var display=section.querySelector('.date-display');
    input.setAttribute('value',''); input.value=''; input.defaultValue='';

    if(data && data.date){ input.value=data.date; display.textContent=formatDate(data.date); display.style.display='inline-block'; input.style.display='none'; }
    if(data && data.visit) section.querySelector('.visit').innerHTML = data.visit;
    if(data && data.stay)  section.querySelector('.stay').innerHTML  = data.stay;
    if(data && data.move)  section.querySelector('.move').innerHTML  = data.move;
    if(data && data.notes) section.querySelector('.notes').innerHTML = data.notes;

    function updateDisplay(){
      var f=formatDate(input.value);
      display.textContent=f;
      if(input.value){ input.style.display='none'; display.style.display='inline-block'; }
      else { input.style.display='inline-block'; display.style.display='none'; }
    }
    input.addEventListener('change', function(){ updateDisplay(); save(); sortDays(); });

    display.addEventListener('click', function(){
      display.style.display='none'; input.style.display='inline-block';
      if(input.showPicker) input.showPicker(); input.focus();
    });

    section.querySelector('.tools').addEventListener('click', function(e){
      var tgt=e.target;
      if(tgt.classList.contains('del')){
        var parent = section.parentNode;
        var next = section.nextSibling;
        var snapshot = section.cloneNode(true);
        section.remove(); renumberDays(); save();
        var toast=document.createElement('div'); toast.className='undo-toast'; toast.textContent='Giorno eliminato';
        var btn=document.createElement('button'); btn.textContent='Annulla';
        btn.onclick=function(){
          if(next && next.parentNode===parent){ parent.insertBefore(snapshot, next); }
          else { parent.appendChild(snapshot); }
          bindDay(snapshot);
          renumberDays(); save();
          toast.remove();
        };
        toast.appendChild(btn); document.body.appendChild(toast);
        setTimeout(function(){ toast.parentNode && toast.parentNode.removeChild(toast); }, 5000);
        return;
      }
      if(tgt.classList.contains('dup')){
        var el=createDay({
          date: input.value,
          visit: section.querySelector('.visit').innerHTML,
          stay:  section.querySelector('.stay').innerHTML,
          move:  section.querySelector('.move').innerHTML,
          notes: section.querySelector('.notes').innerHTML
        });
        planner.appendChild(el); renumberDays(); save();
      }
    });

    // Enhance editors with lists + attachments
    var cards = section.querySelectorAll('.card');
    for(var i=0;i<cards.length;i++){
      setupListEditing(cards[i]);
      enhanceEditable(cards[i]);
    }
    section.addEventListener('input', function(){ save(); });

    return section;
  }

  function bindDay(section){
    var input=section.querySelector('.date-input');
    var display=section.querySelector('.date-display');
    function updateDisplay(){
      var f=formatDate(input.value);
      display.textContent=f;
      if(input.value){ input.style.display='none'; display.style.display='inline-block'; }
      else { input.style.display='inline-block'; display.style.display='none'; }
    }
    input.addEventListener('change', function(){ updateDisplay(); save(); sortDays(); });
    display.addEventListener('click', function(){ display.style.display='none'; input.style.display='inline-block'; if(input.showPicker) input.showPicker(); input.focus(); });
    var cards = section.querySelectorAll('.card');
    for(var i=0;i<cards.length;i++){
      setupListEditing(cards[i]);
      enhanceEditable(cards[i]);
    }
    section.addEventListener('input', function(){ save(); });
  }

  // --- Date helpers ---
  function formatDate(dateStr){
    if(!dateStr) return '';
    var d = new Date(dateStr);
    if(isNaN(d)) return '';
    var dayName = translations[currentLang].days[d.getDay()];
    return dayName+' '+d.toLocaleDateString(currentLang);
  }

  function renumberDays(){
    var els = planner.querySelectorAll('.day .day-num .n');
    for(var i=0;i<els.length;i++){ els[i].textContent = (i+1); }
  }

  // Save only light HTML; attachments live in IDB and are referenced by data-attach-id
  function save(){
    var data = [];
    var days = planner.querySelectorAll('.day');
    for(var i=0;i<days.length;i++){
      var day=days[i];
      function cleaned(sel){
        var el = day.querySelector(sel).cloneNode(true);
        var imgs = el.querySelectorAll('img.attach-thumb');
        for(var k=0;k<imgs.length;k++){ imgs[k].removeAttribute('src'); }
        return el.innerHTML;
      }
      data.push({
        date:  day.querySelector('.date-input').value,
        visit: cleaned('.visit'),
        stay:  cleaned('.stay'),
        move:  cleaned('.move'),
        notes: cleaned('.notes')
      });
    }
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){}
  }

  function restore(){
    var raw = localStorage.getItem(STORAGE_KEY); if(!raw) return;
    var arr = []; try{ arr = JSON.parse(raw); }catch(e){ arr=[]; }
    planner.innerHTML='';
    for(var i=0;i<arr.length;i++){ planner.appendChild(createDay(arr[i])); }
    // Rehydrate thumbnails from IDB
    var imgs = planner.querySelectorAll('img.attach-thumb[data-attach-id]');
    for(var ii=0;ii<imgs.length;ii++){
      (function(node){
        var id=node.getAttribute('data-attach-id');
        idbGet(id, function(blob){
          if(!blob) return;
          node.src = URL.createObjectURL(blob);
        });
      })(imgs[ii]);
    }
    renumberDays();
  }

  function sortDays(){
    var days = Array.prototype.slice.call(planner.querySelectorAll('.day'));
    days.sort(function(a,b){
      var da = a.querySelector('.date-input').value;
      var db = b.querySelector('.date-input').value;
      var A = da ? new Date(da) : new Date(8640000000000000);
      var B = db ? new Date(db) : new Date(8640000000000000);
      return A - B;
    });
    for(var i=0;i<days.length;i++){ planner.appendChild(days[i]); }
    renumberDays();
    save();
  }

  function getMaxDate(){
    var max=null;
    var inputs = planner.querySelectorAll('.date-input');
    for(var i=0;i<inputs.length;i++){
      if(inputs[i].value){
        var d=new Date(inputs[i].value);
        if(!isNaN(d) && (!max || d>max)) max=d;
      }
    }
    return max;
  }

  if(btnAdd){ btnAdd.addEventListener('click', function(){
    var nextDate='';
    var max=getMaxDate();
    if(max){ var nd=new Date(max.getTime()); nd.setDate(nd.getDate()+1); nextDate = nd.toISOString().slice(0,10); }
    var el=createDay(nextDate?{date:nextDate}:{ });
    planner.appendChild(el);
    renumberDays(); save(); sortDays();
    setTimeout(function(){ window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'}); }, 0);
  }); }

  langSelect.addEventListener('change', function(){
    currentLang = langSelect.value;
    localStorage.setItem(LANG_KEY, currentLang);
    var days = planner.querySelectorAll('.day');
    for(var i=0;i<days.length;i++){
      var titles = days[i].querySelectorAll('.card h3');
      for(var j=0;j<4;j++){ titles[j].textContent = translations[currentLang].sections[j]; }
      var input = days[i].querySelector('.date-input'); var display = days[i].querySelector('.date-display');
      display.textContent = formatDate(input.value);
      days[i].querySelector('.day-num').firstChild.textContent = translations[currentLang].dayWord + ' ';
    }
    save();
  });

  // Enhance editors: paste/drag with IDB storage
  function enhanceEditable(div){
    div.addEventListener('paste', function(e){
      var cd=e.clipboardData; if(!cd) return;
      for(var i=0;i<cd.items.length;i++){
        var item = cd.items[i];
        if(item.kind==='file'){
          var file=item.getAsFile(); if(!file) continue;
          if(file.type.indexOf('image/')===0){
            compressImageToJPEG(file, 1400, 0.75, function(blob){
              var id='att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
              insertImageAttachment(div, id, blob);
            });
          }else if(file.type==='application/pdf'){
            var id='att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
            insertPDFAttachment(div, id, file, file.name);
          }
          e.preventDefault();
          return;
        }
      }
      var text = cd.getData('text/plain');
      if(text && /^https?:\/\//i.test(text.trim())){
        var a=document.createElement('a'); a.href=text.trim(); a.textContent=text.trim(); a.target='_blank'; a.rel='noopener';
        div.appendChild(a); e.preventDefault(); save();
      }
    });
    div.addEventListener('dragover', function(e){ e.preventDefault(); });
    div.addEventListener('drop', function(e){
      e.preventDefault();
      var files=e.dataTransfer.files; if(!files || !files.length) return;
      for(var i=0;i<files.length;i++){
        (function(file){
          if(file.type.indexOf('image/')===0){
            compressImageToJPEG(file, 1400, 0.75, function(blob){
              var id='att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
              insertImageAttachment(div, id, blob);
            });
          }else if(file.type==='application/pdf'){
            var id='att-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
            insertPDFAttachment(div, id, file, file.name);
          }
        })(files[i]);
      }
    });
  }

  // Init
  applyBg();
  restore();
})();