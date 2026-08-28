import './style.css';

declare const __BUILD_ID__: string;

document.querySelector<HTMLDivElement>('#not-found')!.innerHTML = `<header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><span></span></span><span>Owner Cash Check</span></a><a href="/demo">Try sample</a></header><main id="main" class="policy-page"><p class="eyebrow">Sheet not found · 404</p><h1>This cash sheet is not here.</h1><p class="lede">The address may be mistyped or the sheet may have moved.</p><p><a class="primary button-link" href="/">Return to Owner Cash Check</a></p></main><footer><p>Your figures stay in this browser. No bank connection. No tracking.</p><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="build-note">Built by Param Factory · Build ${__BUILD_ID__}</p></footer>`;
