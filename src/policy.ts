import './style.css';

declare const __BUILD_ID__: string;

export function renderPolicy(title: string, eyebrow: string, content: string) {
  const root = document.querySelector<HTMLDivElement>('#policy')!;
  root.innerHTML = `<header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><span></span></span><span>Owner Cash Check</span></a><nav aria-label="Site navigation"><a href="/demo">Try sample</a><a href="/">Back to cash check</a></nav></header><main id="main" class="policy-page"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="effective">Effective 28 August 2026</p><article>${content}</article></main><footer><p>No tracking. No bank connection.</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="build-note">Built by Param Factory · Build ${__BUILD_ID__}</p></footer>`;
}
