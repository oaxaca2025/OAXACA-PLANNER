// Gestione giorni + wiring allegati inline
function createDay(n){
  const wrap = document.createElement('div');
  wrap.className='day';
  wrap.innerHTML = `
    <h3>Giorno <span class="n">${n}</span></h3>
    <div class="editor" contenteditable="true" spellcheck="false"></div>
    <div class="controls">
      <button class="primary" type="button" onclick="this.nextElementSibling.click()">📎 Allega</button>
      <input type="file" accept="image/*,application/pdf" multiple onchange="Attachments.attachFromInput(this)">
      <button type="button" onclick="dupDay(this)">Duplica</button>
      <button type="button" onclick="delDay(this)">Elimina</button>
    </div>
  `;
  return wrap;
}
function renumber(){ document.querySelectorAll('.day .n').forEach((n,i)=> n.textContent = i+1); }
function addDay(){
  const planner = document.getElementById('planner');
  const d = createDay(planner.children.length + 1);
  planner.appendChild(d);
  Attachments.initEditors(d);
  renumber();
}
function dupDay(btn){
  const day = btn.closest('.day');
  const ed = day.querySelector('.editor');
  const planner = document.getElementById('planner');
  const d = createDay(planner.children.length + 1);
  d.querySelector('.editor').innerHTML = ed.innerHTML;
  planner.appendChild(d);
  Attachments.initEditors(d);
  renumber();
}
function delDay(btn){ btn.closest('.day').remove(); renumber(); }
document.addEventListener('DOMContentLoaded', ()=>{
  const btnAdd = document.getElementById('btnAdd');
  if(btnAdd){ btnAdd.addEventListener('click', addDay); }
  const planner = document.getElementById('planner');
  if(planner && !planner.querySelector('.day')){ addDay(); }
  Attachments.initEditors(document);
});
