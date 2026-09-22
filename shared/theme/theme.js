(()=>{
  const normalize=value=>value==='light'?'light':'dark';
  let theme='dark';
  try{theme=normalize(localStorage.getItem('atlas-theme'))}catch{}
  function apply(value){
    theme=normalize(value);
    document.documentElement.dataset.theme=theme;
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
      button.textContent=theme==='dark'?'☀ Tema claro':'☾ Tema escuro';
      button.setAttribute('aria-label',theme==='dark'?'Ativar tema claro':'Ativar tema escuro');
    });
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded',()=>apply(theme));
  document.addEventListener('atlas:render',()=>apply(theme));
  // Delegation also covers controls rendered inside the expanded graph.
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-theme-toggle]'))return;
    apply(theme==='dark'?'light':'dark');
    try{localStorage.setItem('atlas-theme',theme)}catch{}
  });
  window.addEventListener('storage',event=>{if(event.key==='atlas-theme')apply(event.newValue)});
})();
