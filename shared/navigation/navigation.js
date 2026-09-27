(() => {
  const base = new URL('../../', document.currentScript.src);
  const sections = globalThis.AtlasPlatform?.modules || [];
  const iconFor = (section) => section.id === 'home' ? '⌂' : section.icon;

  function buildNavigation(host, {cards = false} = {}) {
    const nav = document.createElement('nav');
    nav.className = cards ? 'home-module-grid' : 'platform-nav';
    nav.setAttribute('aria-label', cards ? 'Módulos do Atlas' : 'Áreas do Atlas');
    let caption = null;

    if (!cards) {
      caption = document.createElement('p');
      caption.className = 'platform-caption';
      caption.textContent = 'PLATAFORMA';

      const home = {id: 'home', title: 'Home', path: 'index.html'};
      const link = document.createElement('a');
      link.href = new URL(home.path, base).href;
      if (host.dataset.atlasNavigation === home.id) link.setAttribute('aria-current', 'location');
      const icon = document.createElement('span');
      icon.className = 'platform-nav-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = iconFor(home);
      const label = document.createElement('span');
      label.textContent = home.title;
      link.append(icon, label);
      nav.append(link);
    }

    for (const section of sections) {
      const link = document.createElement('a');
      link.href = new URL(section.path, base).href;
      if (!cards && host.dataset.atlasNavigation === section.id) link.setAttribute('aria-current', 'location');

      const icon = document.createElement('span');
      icon.className = 'platform-nav-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = section.icon;

      const label = document.createElement('span');
      label.textContent = section.title;
      link.append(icon, label);
      nav.append(link);
    }

    host.replaceChildren(...(caption ? [caption] : []), nav);
  }

  document.querySelectorAll('[data-atlas-navigation]').forEach((host) => buildNavigation(host));
  document.querySelectorAll('[data-atlas-catalog]').forEach((host) => buildNavigation(host, {cards: true}));

  const managementHost = document.querySelector('[data-atlas-management]');
  if (managementHost && globalThis.AtlasPlatform?.management) {
    const link = document.createElement('a');
    link.href = new URL(globalThis.AtlasPlatform.management.path, base).href;
    link.textContent = `${globalThis.AtlasPlatform.management.title} →`;
    link.className = 'management-link';
    managementHost.append(link);
  }
})();
