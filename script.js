(function(){
  'use strict';
  const hero = document.getElementById('hero');
  const titleEl = document.getElementById('title');
  const bgInput = document.getElementById('bgInput');
  const gallery = document.getElementById('bgGallery');
  const planner = document.getElementById('planner');

  const btnAdd = document.getElementById('btnAdd');
  const btnUpload = document.getElementById('btnUpload');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnExport = document.getElementById('btnExport');
  const btnClear = document.getElementById('btnClear');
  const btnInstall = document.getElementById('btnInstall');

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.style.display = 'inline-block';
  });
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.style.display = 'none';
  });

  const STORAGE_KEY = 'planner_state_v1';
  let state = { backgrounds: [], bgIndex: -1 };

  function save(){
    try {
      const snapshot = {
        title: titleEl.innerText.trim(),
        days: Array.from(planner.querySelectorAll('.day')).map(day => ({
          header: day.querySelector('h2').innerText,
          visit: day.querySelector('.visit').innerHTML,
          stay: day.querySelector('.stay').innerHTML,
          move: day.querySelector('.move').innerHTML,
          notes: day.querySelector('.notes').innerHTML
        })),
        backgrounds: state.backgrounds,
        bgIndex: state.bgIndex
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) { console.warn('Save failed', e); }
  }

  function restore(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const s = JSON.parse(raw);
      if(s.title) titleEl.innerText = s.title;
      if(Array.isArray(s.backgrounds)) {
        state.backgrounds = s.backgrounds;
        state.bgIndex = typeof s.bgIndex === 'number' ? s.bgIndex : -1;
        rebuildGallery();
        if(state.bgIndex >= 0 && state.backgrounds[state.bgIndex]) {
          hero.style.backgroundImage = `url('${state.backgrounds[state.bgIndex]}')`;
          setActiveThumb(state.bgIndex);
        }
      }
      if(Array.isArray(s.days)) {
        planner.innerHTML = '';
        s.days.forEach(d => planner.appendChild(createDayFromSaved(d)));
      }
    } catch (e) { console.warn('Restore failed', e); }
  }

  function rebuildGallery(){
    gallery.innerHTML = '';
    state.backgrounds.forEach((dataURL, i) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'bg-thumb' + (i === state.bgIndex ? ' active' : '');
      t.style.backgroundImage = `url('${dataURL}')`;
      t.addEventListener('click', () => setHeroBg(i));
      gallery.appendChild(t);
    });
  }

  function setActiveThumb(i){
    Array.from(gallery.children).forEach((el, idx) => el.classList.toggle('active', idx === i));
  }

  function setHeroBg(index){
    if(index < 0 || index >= state.backgrounds.length) return;
    state.bgIndex = index;
    hero.style.backgroundImage = `url('${state.backgrounds[index]}')`;
    setActiveThumb(index);
    save();
  }

  function handleBgFiles(files){
    if(!files || !files.length) return;
    const list = Array.from(files);
    const next = () => {
      const f = list.shift();
      if(!f) {
        if(state.bgIndex === -1 && state.backgrounds.length) setHeroBg(0);
        save();
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const dataURL = e.target.result;
        state.backgrounds.push(dataURL);
        rebuildGallery();
        if(state.bgIndex === -1) setHeroBg(state.backgrounds.length - 1);
        next();
      };
      reader.readAsDataURL(f);
    };
    next();
  }

  function createDay(data){
    const section = document.createElement('section');
    section.className = 'day';
    section.innerHTML = `
      <h2 contenteditable="true">${data.header || `${data.date || 'Data'} — ${data.day || 'Giorno'}`}</h2>
      <div class="row">
        <div class="card visit" contenteditable="true">
          <h3>Luoghi da visitare</h3>
          <ul><li>Aggiungi luogo...</li></ul>
        </div>
        <div class="card stay" contenteditable="true">
          <h3>Alloggio</h3>
          <p>Aggiungi alloggio...</p>
        </div>
        <div class="card move" contenteditable="true">
          <h3>Voli / Spostamenti</h3>
          <p>Aggiungi spostamenti...</p>
        </div>
        <div class="card notes" contenteditable="true">
          <h3>Note</h3>
          <p>Aggiungi note...</p>
        </div>
      </div>
      <div class="tools">
        <button class="tool" data-action="duplica">Duplica</button>
        <button class="tool" data-action="elimina">Elimina</button>
      </div>
    `;
    section.querySelector('.tools').addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-action]');
      if(!btn) return;
      if(btn.dataset.action === 'elimina'){ section.remove(); save(); }
      else if(btn.dataset.action === 'duplica'){ section.insertAdjacentHTML('afterend', section.outerHTML); save(); }
    });
    section.addEventListener('input', save);
    return section;
  }

  function createDayFromSaved(d){
    const section = document.createElement('section');
    section.className = 'day';
    section.innerHTML = `
      <h2 contenteditable="true">${d.header || 'Data — Giorno'}</h2>
      <div class="row">
        <div class="card visit" contenteditable="true">${d.visit}</div>
        <div class="card stay" contenteditable="true">${d.stay}</div>
        <div class="card move" contenteditable="true">${d.move}</div>
        <div class="card notes" contenteditable="true">${d.notes}</div>
      </div>
      <div class="tools">
        <button class="tool" data-action="duplica">Duplica</button>
        <button class="tool" data-action="elimina">Elimina</button>
      </div>
    `;
    section.querySelector('.tools').addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-action]');
      if(!btn) return;
      if(btn.dataset.action === 'elimina'){ section.remove(); save(); }
      else if(btn.dataset.action === 'duplica'){ section.insertAdjacentHTML('afterend', section.outerHTML); save(); }
    });
    section.addEventListener('input', save);
    return section;
  }

  function addDayPrompt(){
    const d = prompt('Inserisci la data (es. 23 novembre 2025):','');
    if(d === null) return;
    const g = prompt('Inserisci il titolo giorno (es. Giorno 1):','');
    if(g === null) return;
    planner.appendChild(createDay({date: (d||'Data'), day: (g||'Giorno')}));
    save();
    setTimeout(()=> window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'}), 0);
  }

  function exportHTML(){
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'planner-export.html';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function clearAll(){
    if(confirm('Sicuro di eliminare tutti i giorni?')){
      planner.innerHTML = '';
      save();
    }
  }

  btnAdd.addEventListener('click', addDayPrompt);
  btnUpload.addEventListener('click', ()=> bgInput.click());
  bgInput.addEventListener('change', (e)=> handleBgFiles(e.target.files));
  btnPrev.addEventListener('click', ()=> {
    if(state.backgrounds.length){
      const i = (state.bgIndex - 1 + state.backgrounds.length) % state.backgrounds.length;
      setHeroBg(i);
    }
  });
  btnNext.addEventListener('click', ()=> {
    if(state.backgrounds.length){
      const i = (state.bgIndex + 1) % state.backgrounds.length;
      setHeroBg(i);
    }
  });
  btnExport.addEventListener('click', exportHTML);
  btnClear.addEventListener('click', clearAll);
  titleEl.addEventListener('input', save);

  restore();

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
    });
  }
})();