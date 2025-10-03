// app/components/Settings.js
export function Settings(){
  function onExport(){
    const data = localStorage.getItem('zbf:data') || '{}';
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zbf-backup.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function onImport(e){
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { localStorage.setItem('zbf:data', reader.result); alert('Imported. Reload the app.'); };
    reader.readAsText(file);
  }
  setTimeout(()=>{
    document.getElementById('exp').addEventListener('click', onExport);
    document.getElementById('imp').addEventListener('change', onImport);
    document.getElementById('clr').addEventListener('click', () => { localStorage.clear(); alert('Cleared.'); });
  },0);

  return `
    <section class="card">
      <h2>Settings</h2>
      <div class="row">
        <button id="exp" class="btn">Export JSON</button>
        <label class="btn">
          <input id="imp" type="file" accept="application/json" class="hidden">
          Import JSON
        </label>
        <button id="clr" class="btn danger">Clear all data</button>
      </div>
      <p class="small">This app stores everything in your browser only.</p>
    </section>
  `;
}
