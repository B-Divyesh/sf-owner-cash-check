import './style.css';

export function renderPolicy(title: string, eyebrow: string, content: string) {
  const root = document.querySelector<HTMLDivElement>('#policy')!;
  root.innerHTML = `<header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><span></span></span><span>Owner Cash Check</span></a><a href="/">Back to cash check</a></header><main id="main" class="policy-page"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="effective">Effective 28 August 2026</p><article>${content}</article></main><footer><p>No tracking. No bank connection.</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></footer>`;
}
