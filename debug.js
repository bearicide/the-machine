(() => {
  const requiredIds = ['game', 'score', 'balls', 'mode', 'slotReadout', 'startBtn', 'multiBtn', 'resetBtn', 'touchLeft', 'touchLaunch', 'touchRight'];
  const state = {
    startedAt: new Date().toISOString(),
    errors: [],
    warnings: [],
    checks: []
  };

  function runChecks() {
    state.checks = requiredIds.map(id => ({ id, ok: Boolean(document.getElementById(id)) }));
    state.warnings = state.checks.filter(item => !item.ok).map(item => `Missing #${item.id}`);
  }

  function makePanel() {
    const panel = document.createElement('section');
    panel.id = 'debug-panel';
    panel.className = 'debug-panel is-hidden';
    panel.innerHTML = `
      <div class="debug-head">
        <strong>Debug Support</strong>
        <button id="debug-close" type="button">Hide</button>
      </div>
      <pre id="debug-output"></pre>
      <div class="debug-actions">
        <button id="debug-run" type="button">Run Checks</button>
        <button id="debug-clear" type="button">Clear Errors</button>
      </div>
    `;
    document.body.appendChild(panel);
    document.getElementById('debug-close').addEventListener('click', () => panel.classList.add('is-hidden'));
    document.getElementById('debug-run').addEventListener('click', () => { runChecks(); render(); });
    document.getElementById('debug-clear').addEventListener('click', () => { state.errors = []; render(); });
    return panel;
  }

  let panel;
  function render() {
    if (!panel) panel = makePanel();
    const output = document.getElementById('debug-output');
    const canvas = document.getElementById('game');
    const payload = {
      build: 'the-machine stable debug baseline',
      startedAt: state.startedAt,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      canvas: canvas ? `${canvas.width}x${canvas.height}` : 'missing',
      score: document.getElementById('score')?.textContent || 'missing',
      balls: document.getElementById('balls')?.textContent || 'missing',
      mode: document.getElementById('mode')?.textContent || 'missing',
      slot: document.getElementById('slotReadout')?.textContent || 'missing',
      missingElements: state.warnings,
      errors: state.errors.slice(-8),
      controls: 'Space launch | A/Left left flipper | D/Right right flipper | M multiball | ? debug'
    };
    output.textContent = JSON.stringify(payload, null, 2);
  }

  window.addEventListener('error', event => {
    state.errors.push(`${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`);
    render();
  });

  window.addEventListener('unhandledrejection', event => {
    state.errors.push(`Promise rejection: ${event.reason}`);
    render();
  });

  window.addEventListener('keydown', event => {
    if (event.key === '?') {
      runChecks();
      render();
      panel.classList.toggle('is-hidden');
    }
  });

  window.MATTBEAR_DEBUG = {
    show() { runChecks(); render(); panel.classList.remove('is-hidden'); },
    hide() { panel?.classList.add('is-hidden'); },
    state
  };

  window.addEventListener('load', () => {
    runChecks();
    render();
    console.info('[MATTBEAR DEBUG] Ready. Press ? or run MATTBEAR_DEBUG.show().');
  });
})();
