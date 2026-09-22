// Shared entry points; each area retains its own routes, engine and storage.
(()=>{
  const base=new URL('../../',document.currentScript.src);
  const sections=globalThis.AtlasPlatform?.modules || [];
  const host=document.querySelector('[data-atlas-navigation]');
  if(!host)return;
  const caption=document.createElement('p');
  caption.className='platform-caption';
  caption.textContent='PLATAFORMA';
  const nav=document.createElement('nav');
  nav.className='platform-nav';
  nav.setAttribute('aria-label','Áreas do Atlas');
  sections.forEach(section=>{
    const link=document.createElement('a');
    link.href=new URL(section.path,base).href;
    if(host.dataset.atlasNavigation===section.id)link.setAttribute('aria-current','location');
    const icon=document.createElement('span');
    icon.className='platform-nav-icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent=section.icon;
    const label=document.createElement('span');
    label.textContent=section.title;
    link.append(icon,label);
    nav.append(link);
  });
  host.replaceChildren(caption,nav);
})();
