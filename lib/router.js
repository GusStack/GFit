// app/lib/router.js
export function mount(routeMap){
  const app = document.getElementById('app');
  function render(){
    const hash = location.hash.slice(1) || '/';
    const route = routeMap[hash] || routeMap['/404'] || (() => '<h2>Not found</h2>');
    app.innerHTML = route();
  }
  addEventListener('hashchange', render);
  addEventListener('load', render);
  render();
}