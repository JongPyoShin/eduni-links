export function createUI(onAction) {
  const panel = document.querySelector('#panel');
  const closeButton = document.querySelector('#panel-close');
  const tabs = document.querySelector('#panel-tabs');
  const cards = document.querySelector('#panel-cards');
  const background = [...document.querySelectorAll('#world, .hud, .controls, .hint')].map(element => [element, element.inert]);
  const setModal = open => { for (const [element, previous] of background) element.inert = open || previous; };
  let previousFocus = null;
  let companionOpen = false;
  const close = () => onAction({ type: 'CLOSE' });
  closeButton.addEventListener('click', close);
  const keydown = (event) => {
    if (companionOpen || event.target?.closest?.('#eduni-companion-layer')) return;
    if (panel.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) return;
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const onCompanionVisibility = event => { companionOpen = !!event.detail?.open; };
  document.addEventListener('keydown', keydown);
  window.addEventListener('eduni-companion-visibility', onCompanionVisibility);
  return {
    render(view) {
      const wasHidden = panel.hidden;
      panel.hidden = !view;
      const card = panel.querySelector('.card');
      if (card) card.scrollTop = 0;
      panel.dataset.question = String(!!view?.question);
      panel.dataset.cards = String(!!(view?.cards?.length));
      setModal(!!view);
      if (!view) { if (!wasHidden) previousFocus?.focus?.(); return; }
      if (wasHidden) previousFocus = document.activeElement;
      for (const [id, value] of Object.entries({ 'panel-title': view.title, 'panel-body': view.body, 'panel-icon': view.icon || '🐦', 'panel-kicker': view.kicker || '' })) {
        document.getElementById(id).textContent = value || '';
      }
      tabs.replaceChildren();
      tabs.hidden = !view.tabs?.length;
      for (const item of view.tabs || []) {
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = item.label; button.setAttribute('aria-pressed', String(!!item.selected));
        button.addEventListener('click', () => onAction(item.action)); tabs.append(button);
      }
      cards.replaceChildren();
      cards.hidden = !view.cards?.length;
      for (const item of view.cards || []) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'panel-card';
        button.style.setProperty('--card-tint', item.tint || '#f0f4e5');
        button.dataset.silhouette = String(!!item.silhouette);
        if (item.selected !== undefined) button.setAttribute('aria-pressed', String(!!item.selected));
        const icon = document.createElement('span'); icon.className = 'panel-card-icon'; icon.textContent = item.icon || '🌿';
        const title = document.createElement('span'); title.className = 'panel-card-title'; title.textContent = item.title;
        const detail = document.createElement('span'); detail.className = 'panel-card-detail'; detail.textContent = item.detail || '';
        button.append(icon, title, detail); button.addEventListener('click', () => onAction(item.action)); cards.append(button);
      }
      const actions = document.querySelector('#panel-actions'); actions.replaceChildren();
      for (const item of view.actions || []) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label;
        button.classList.toggle('primary', !!item.primary);
        button.addEventListener('click', () => onAction(item.action)); actions.append(button);
      }
      // Do not leave focus on a removed answer button after a state transition.
      const focusTarget = view.cards?.length ? (tabs.querySelector('button') || cards.querySelector('button') || closeButton)
        : (actions.querySelector('button') || closeButton);
      focusTarget.focus({ preventScroll: true });
    },
    dispose() { setModal(false); closeButton.removeEventListener('click', close); document.removeEventListener('keydown', keydown); window.removeEventListener('eduni-companion-visibility', onCompanionVisibility); },
  };
}
