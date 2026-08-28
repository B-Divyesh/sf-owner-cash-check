export const isDemoMode = () => location.pathname === '/demo' || location.pathname === '/demo/';

export const storageKey = () => isDemoMode() ? 'demo:current' : 'current';
