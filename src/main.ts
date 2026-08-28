import './style.css';
import { decryptBackup, encryptBackup, entriesToCSV } from './backup';
import { clearDemoData, loadData, saveData, validateImportedData } from './db';
import { addDays, buildForecast, cashStatus, ForecastWeek, toISODate } from './forecast';
import { cachedUnlock, captureLicenseFromUrl, checkoutUrl, clearLicense, getLicenseToken, storeLicense, verifyLicense } from './license';
import { AppData, CashEntry, Confidence, emptyData, Recurrence } from './types';
import { isDemoMode } from './mode';

declare const __BUILD_ID__: string;

const app = document.querySelector<HTMLDivElement>('#app')!;
const today = () => toISODate(new Date());
const escapeHTML = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const parseAmount = (value: FormDataEntryValue | null) => Number(String(value ?? '').replaceAll(',', ''));
const uid = () => crypto.randomUUID();
const displayDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, options).format(new Date(`${date}T12:00:00`));
const demo = isDemoMode();
const buildId = __BUILD_ID__;

let data: AppData = emptyData();
let selectedWeek = 0;
let activeDialog: 'entry' | 'checkin' | 'data' | 'settings' | null = null;
let editingEntryId: string | null = null;
let isPro = demo ? false : cachedUnlock();
let notice = '';
let dialogReturnAction: string | null = null;
let dialogReturnIndex = 0;

function money(value: number, compact = false) {
  const currency = data.settings?.currency ?? 'USD';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: compact ? 0 : 2, notation: compact ? 'compact' : 'standard' }).format(value);
}

function announce(message: string) {
  notice = message;
  const region = document.querySelector<HTMLElement>('#save-status');
  if (region) region.textContent = message;
  window.setTimeout(() => {
    if (notice === message) notice = '';
    const current = document.querySelector<HTMLElement>('#save-status');
    if (current?.textContent === message) current.textContent = '';
  }, 4500);
}

async function persist(message = 'Saved on this device.') {
  try { await saveData(data); announce(message); }
  catch (error) { announce(error instanceof Error ? error.message : 'Could not save locally. Export a backup before closing.'); }
}

function statusCopy(value: number, reserve: number) {
  const status = cashStatus(value, reserve);
  if (status === 'danger') return { status, label: 'Below reserve', mark: '!' };
  if (status === 'tight') return { status, label: 'Close to reserve', mark: '~' };
  return { status, label: 'Above reserve', mark: '✓' };
}

function shell(content: string) {
  const hasPlan = Boolean(data.settings);
  return `
    <div class="offline-banner" id="offline-banner" role="status" ${navigator.onLine ? 'hidden' : ''}>
      Offline — your plan remains editable and saves on this device.
    </div>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Owner Cash Check home">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span>Owner Cash Check</span>
      </a>
      ${hasPlan ? `<nav aria-label="Plan actions">
        <button class="text-button" data-action="open-checkin"><span aria-hidden="true">✓</span> Weekly check-in</button>
        <button class="primary small" data-action="open-entry"><span aria-hidden="true">＋</span> Add cash item</button>
        <button class="icon-button" data-action="open-data" aria-label="Data, backup, and license settings" title="Data and settings">•••</button>
      </nav>` : `<nav aria-label="Site navigation"><a class="text-button" href="/demo">Try sample</a></nav>`}
    </header>
    ${demo ? `<aside class="demo-banner" role="status"><strong>Demo — sample data, nothing is saved.</strong><span>Use the sample workshop plan to explore the forecast.</span><button class="text-button" data-action="reset-demo">Reset demo</button><button class="secondary" data-action="start-real">Start for real</button></aside>` : ''}
    ${content}
    <footer>
      <p>Your figures stay in this browser. No bank connection. No tracking.</p>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
      <p class="generated-note">Blueprint desk artwork was generated specifically for this product.</p>
      <p class="build-note">Built by Param Factory · Build ${escapeHTML(buildId)}</p>
    </footer>
    <div id="save-status" class="toast" role="status" aria-live="polite">${escapeHTML(notice)}</div>
    <div id="update-toast" class="update-toast" hidden><span>An app update is ready.</span><button class="text-button" data-action="apply-update">Update now</button></div>
    ${dialogMarkup()}`;
}

function onboarding() {
  return shell(`<main id="main" class="welcome">
    <section class="welcome-copy">
      <p class="eyebrow">13-week owner’s cash drawing</p>
      <h1>See your next 13 weeks of cash.</h1>
      <p class="lede">Turn today’s bank balance, upcoming bills, expected invoices, and your reserve into one honest weekly cash check. No bank login. No accounting overhaul.</p>
      <div class="demo-cta"><a class="primary button-link" href="/demo">Try it with sample data <span aria-hidden="true">→</span></a><span>Opens a sample workshop plan. Nothing is saved.</span></div>
      <ul class="plain-facts" aria-label="Owner Cash Check facts"><li>Works offline after the first visit.</li><li>No bank login.</li><li>Your financial plan stays in this browser.</li></ul>
      <form id="setup-form" class="setup-form" novalidate>
        <div class="field-row">
          <label><span>Balance today</span><span class="money-input"><span aria-hidden="true" id="setup-symbol">$</span><input name="balance" inputmode="decimal" autocomplete="off" required min="0" step="0.01" value="" aria-describedby="setup-error" /></span></label>
          <label><span>Keep-back reserve</span><span class="money-input"><span aria-hidden="true">$</span><input name="reserve" inputmode="decimal" autocomplete="off" required min="0" step="0.01" value="" aria-describedby="setup-error" /></span></label>
        </div>
        <div class="field-row compact-row">
          <label><span>As of</span><input type="date" name="asOf" required value="${today()}" /></label>
          <label><span>Currency</span><select name="currency"><option value="USD">USD — $</option><option value="GBP">GBP — £</option><option value="EUR">EUR — €</option><option value="INR">INR — ₹</option><option value="AUD">AUD — A$</option><option value="CAD">CAD — C$</option></select></label>
        </div>
        <p class="form-error" id="setup-error" aria-live="assertive"></p>
        <button class="primary" type="submit">Draw my 13-week view <span aria-hidden="true">→</span></button>
        <p class="privacy-line"><span aria-hidden="true">⌂</span> Saved only on this device. Export whenever you like.</p>
      </form>
    </section>
    <figure class="hero-art">
      <picture><source media="(max-width: 700px)" srcset="/assets/blueprint-cash-desk-720.webp"><img src="/assets/blueprint-cash-desk.webp" width="1200" height="800" fetchpriority="high" alt="A drafting sheet with a hand-drawn cash contour, pencil, ruler, invoice slips, and orange check marker." /></picture>
      <figcaption><span>Fig. 01</span> A working plan, not a promise.</figcaption>
    </figure>
  </main>`);
}

function chartMarkup(forecast: ReturnType<typeof buildForecast>) {
  const settings = data.settings!;
  const values = [settings.balance, settings.reserve, 0, ...forecast.weeks.map((week) => week.closing)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const x = (index: number) => 40 + index * (800 / 13);
  const y = (value: number) => 220 - ((value - min) / span) * 170;
  const points = [`${x(0)},${y(settings.balance)}`, ...forecast.weeks.map((week, index) => `${x(index + 1)},${y(week.closing)}`)].join(' ');
  const reserveY = y(settings.reserve);
  return `<div class="chart-wrap">
    <svg class="cash-chart" viewBox="0 0 880 260" role="img" aria-labelledby="chart-title chart-desc" preserveAspectRatio="none">
      <title id="chart-title">Projected weekly closing cash for 13 weeks</title>
      <desc id="chart-desc">Starting at ${escapeHTML(money(settings.balance))}, reaching a low point of ${escapeHTML(money(forecast.low))}, against a reserve of ${escapeHTML(money(settings.reserve))}.</desc>
      <g class="chart-grid" aria-hidden="true"><line x1="40" y1="50" x2="840" y2="50"/><line x1="40" y1="135" x2="840" y2="135"/><line x1="40" y1="220" x2="840" y2="220"/></g>
      <line class="reserve-line" x1="40" y1="${reserveY}" x2="840" y2="${reserveY}" />
      <text class="reserve-label" x="44" y="${Math.max(18, reserveY - 8)}">RESERVE · ${escapeHTML(money(settings.reserve, true))}</text>
      <polyline class="cash-line-under" points="${points}"/><polyline class="cash-line" points="${points}"/>
      ${forecast.weeks.map((week, index) => `<circle class="chart-point ${cashStatus(week.low, settings.reserve)}" cx="${x(index + 1)}" cy="${y(week.closing)}" r="5"/>`).join('')}
    </svg>
    <div class="week-ruler" aria-label="Select a forecast week">${forecast.weeks.map((week) => `<button data-week="${week.index}" class="week-tick ${selectedWeek === week.index ? 'active' : ''} ${cashStatus(week.low, settings.reserve)}" aria-pressed="${selectedWeek === week.index}"><span>W${week.index + 1}</span><small>${displayDate(week.end)}</small></button>`).join('')}</div>
  </div>`;
}

function weekDetail(week: ForecastWeek) {
  const settings = data.settings!;
  const state = statusCopy(week.low, settings.reserve);
  return `<section class="week-detail" aria-labelledby="week-detail-title">
    <div><p class="eyebrow">Selected week · ${displayDate(week.start)}–${displayDate(week.end)}</p><h3 id="week-detail-title">Week ${week.index + 1} detail</h3></div>
    <dl class="week-math">
      <div><dt>Opens</dt><dd>${money(week.opening)}</dd></div><div><dt>Expected in</dt><dd class="positive">+${money(week.incoming)}</dd></div><div><dt>Committed out</dt><dd class="negative">−${money(week.outgoing)}</dd></div><div><dt>Closes</dt><dd>${money(week.closing)}</dd></div>
    </dl>
    <p class="status-pill ${state.status}"><span aria-hidden="true">${state.mark}</span> ${state.label}; weekly low ${money(week.low)}${week.low < settings.reserve ? ` (${money(settings.reserve - week.low)} short)` : ''}</p>
    ${week.entries.length ? `<ul class="week-items">${week.entries.map((entry) => `<li><span class="entry-type ${entry.type}" aria-hidden="true">${entry.type === 'incoming' ? '↓' : '↑'}</span><span><strong>${escapeHTML(entry.name)}</strong><small>${displayDate(entry.date)} · ${entry.confidence}</small></span><b>${entry.type === 'incoming' ? '+' : '−'}${money(entry.amount)}</b></li>`).join('')}</ul>` : '<p class="empty-inline">No planned cash moves in this week.</p>'}
  </section>`;
}

function dashboard() {
  const settings = data.settings!;
  const forecast = buildForecast(settings, data.entries);
  const state = statusCopy(forecast.low, settings.reserve);
  const safe = Math.max(0, forecast.low - settings.reserve);
  const activeEntries = data.entries.filter((entry) => !entry.completed).sort((a, b) => a.date.localeCompare(b.date));
  const overdue = activeEntries.filter((entry) => entry.date < settings.asOf);
  const upcoming = activeEntries.filter((entry) => entry.date >= settings.asOf).slice(0, 8);
  const lastCheck = [...data.checkIns].sort((a, b) => b.date.localeCompare(a.date))[0];
  const checkDue = !lastCheck || addDays(lastCheck.date, 7) <= today();
  selectedWeek = Math.min(selectedWeek, 12);

  return shell(`<main id="main" class="workspace">
    <div class="title-row"><div><p class="eyebrow">Cash drawing · updated ${displayDate(settings.asOf)}</p><h1>Your 13-week cash plan</h1><p class="subhead">A working view built from ${activeEntries.length} planned item${activeEntries.length === 1 ? '' : 's'}. Expected income is an estimate until it lands.</p></div><button class="secondary settings-link" data-action="open-settings">Edit starting position</button></div>
    ${checkDue ? `<aside class="check-callout"><span class="check-disc" aria-hidden="true">✓</span><div><strong>${lastCheck ? 'Time for this week’s cash check.' : 'Make the forecast yours with a first check-in.'}</strong><p>Confirm the bank balance, resolve anything overdue, and redraw from today.</p></div><button class="primary dark" data-action="open-checkin">Check in now</button></aside>` : ''}
    ${overdue.length ? `<aside class="overdue-note"><strong>${overdue.length} overdue item${overdue.length === 1 ? '' : 's'} need a decision.</strong> They are not counted in the forward view. Edit, mark handled, or move their dates.</aside>` : ''}
    <section class="readout" aria-labelledby="readout-title">
      <div class="readout-main"><p class="eyebrow" id="readout-title">Safe to spend across the full plan</p><p class="big-number">${money(safe)}</p><p class="status-line ${state.status}"><span aria-hidden="true">${state.mark}</span> ${state.label}</p></div>
      <dl class="key-stats"><div><dt>Cash today</dt><dd>${money(settings.balance)}</dd></div><div><dt>13-week low</dt><dd>${money(forecast.low)}<small>${displayDate(forecast.lowDate, { month: 'short', day: 'numeric', year: 'numeric' })}</small></dd></div><div><dt>Your reserve</dt><dd>${money(settings.reserve)}</dd></div></dl>
      <p class="readout-note">“Safe to spend” is the lowest projected cash minus your reserve. ${forecast.estimateCount ? `This view includes ${forecast.estimateCount} likely or possible incoming estimate${forecast.estimateCount === 1 ? '' : 's'}.` : 'No lower-confidence income is included.'}</p>
    </section>
    <section class="drawing" aria-labelledby="drawing-title">
      <div class="section-heading"><div><p class="figure-label">DWG · 13W / REV ${data.checkIns.length + 1}</p><h2 id="drawing-title">Cash contour</h2></div><div class="legend" aria-label="Chart legend"><span><i class="legend-line"></i> Closing cash</span><span><i class="legend-dash"></i> Reserve</span></div></div>
      ${chartMarkup(forecast)}
      ${weekDetail(forecast.weeks[selectedWeek])}
    </section>
    <section class="ledger" aria-labelledby="ledger-title">
      <div class="section-heading"><div><p class="figure-label">SCHEDULE · NEXT MOVES</p><h2 id="ledger-title">Committed & expected</h2></div><button class="secondary" data-action="open-entry">Add item</button></div>
      ${upcoming.length ? `<ul class="ledger-list">${upcoming.map((entry) => entryRow(entry)).join('')}</ul>${activeEntries.length > 8 ? `<button class="text-button" data-action="open-data">View all ${activeEntries.length} items in data tools</button>` : ''}` : `<div class="empty-state"><span class="empty-mark" aria-hidden="true">＋</span><div><h3>Put the known dates on the sheet.</h3><p>Add rent, payroll, tax, invoices, or any cash move that would change an owner’s decision.</p></div><button class="primary" data-action="open-entry">Add the first item</button></div>`}
    </section>
    ${checkInHistory()}
    <aside class="disclaimer"><strong>A planning aid, not financial advice.</strong> The forecast only reflects what you enter. Confirm balances and timing before committing cash.</aside>
  </main>`);
}

function entryRow(entry: CashEntry) {
  return `<li class="ledger-row ${entry.date < data.settings!.asOf ? 'overdue' : ''}">
    <span class="date-block"><b>${displayDate(entry.date, { day: '2-digit' })}</b><small>${displayDate(entry.date, { month: 'short' }).toUpperCase()}</small></span>
    <span class="entry-type ${entry.type}" aria-hidden="true">${entry.type === 'incoming' ? '↓' : '↑'}</span>
    <span class="entry-name"><strong>${escapeHTML(entry.name)}</strong><small><span class="confidence ${entry.confidence}">${entry.confidence}</span>${entry.note ? ` · ${escapeHTML(entry.note)}` : ''}</small></span>
    <b class="entry-amount ${entry.type}">${entry.type === 'incoming' ? '+' : '−'}${money(entry.amount)}</b>
    <span class="row-actions"><button class="icon-button" data-action="edit-entry" data-id="${entry.id}" aria-label="Edit ${escapeHTML(entry.name)}">✎</button><button class="icon-button" data-action="complete-entry" data-id="${entry.id}" aria-label="Mark ${escapeHTML(entry.name)} handled">✓</button></span>
  </li>`;
}

function checkInHistory() {
  if (!data.checkIns.length) return '';
  const recent = [...data.checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return `<section class="history" aria-labelledby="history-title"><div class="section-heading"><div><p class="figure-label">REVISION LOG</p><h2 id="history-title">Weekly check-ins</h2></div></div><ol>${recent.map((check) => `<li><time datetime="${check.date}">${displayDate(check.date, { month: 'short', day: 'numeric', year: 'numeric' })}</time><span>Actual ${money(check.actualBalance)}</span><span>Prior low ${money(check.projectedLow)}</span>${check.note ? `<p>${escapeHTML(check.note)}</p>` : ''}</li>`).join('')}</ol></section>`;
}

function dialogMarkup() {
  if (activeDialog === 'entry') return entryDialog();
  if (activeDialog === 'checkin') return checkInDialog();
  if (activeDialog === 'settings') return settingsDialog();
  if (activeDialog === 'data') return dataDialog();
  return '';
}

function dialogFrame(title: string, eyebrow: string, body: string, wide = false) {
  return `<dialog class="sheet-dialog ${wide ? 'wide' : ''}" id="active-dialog" aria-labelledby="dialog-title"><div class="dialog-heading"><div><p class="eyebrow">${eyebrow}</p><h2 id="dialog-title">${title}</h2></div><button class="icon-button close-dialog" data-action="close-dialog" aria-label="Close dialog">×</button></div>${body}</dialog>`;
}

function entryDialog() {
  const entry = editingEntryId ? data.entries.find((item) => item.id === editingEntryId) : undefined;
  const type = entry?.type ?? 'outgoing';
  return dialogFrame(entry ? 'Edit cash item' : 'Add a cash item', 'Schedule line', `<form id="entry-form" novalidate>
    <input type="hidden" name="id" value="${entry?.id ?? ''}">
    <fieldset class="segmented"><legend>Cash direction</legend><label><input type="radio" name="type" value="outgoing" ${type === 'outgoing' ? 'checked' : ''}><span>↑ Money out</span></label><label><input type="radio" name="type" value="incoming" ${type === 'incoming' ? 'checked' : ''}><span>↓ Money in</span></label></fieldset>
    <label><span>Name</span><input name="name" maxlength="70" required value="${escapeHTML(entry?.name ?? '')}" placeholder="e.g. Workshop rent"></label>
    <div class="field-row"><label><span>Amount</span><input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required value="${entry?.amount ?? ''}"></label><label><span>Due or expected date</span><input name="date" type="date" required value="${entry?.date ?? today()}"></label></div>
    <label id="confidence-field"><span>How sure is the incoming date?</span><select name="confidence"><option value="confirmed" ${entry?.confidence === 'confirmed' ? 'selected' : ''}>Confirmed — customer/date agreed</option><option value="likely" ${entry?.confidence === 'likely' ? 'selected' : ''}>Likely — best current estimate</option><option value="possible" ${entry?.confidence === 'possible' ? 'selected' : ''}>Possible — do not rely on it</option></select></label>
    ${!entry ? `<label><span>Repeat</span><select name="recurrence"><option value="none">Does not repeat</option><option value="weekly" ${!isPro ? 'disabled' : ''}>Every week${!isPro ? ' — Plus' : ''}</option><option value="monthly" ${!isPro ? 'disabled' : ''}>Every month${!isPro ? ' — Plus' : ''}</option></select></label>${!isPro ? '<p class="field-help">One-time items are always free. Plus adds repeat schedules.</p>' : ''}` : ''}
    <label><span>Note <small>optional</small></span><input name="note" maxlength="120" value="${escapeHTML(entry?.note ?? '')}" placeholder="What could change this timing?"></label>
    <p class="form-error" id="entry-error" aria-live="assertive"></p>
    <div class="dialog-actions">${entry ? '<button type="button" class="danger-button" data-action="delete-entry">Delete item</button>' : ''}<button type="button" class="secondary" data-action="close-dialog">Cancel</button><button type="submit" class="primary">${entry ? 'Save changes' : 'Add to plan'}</button></div>
  </form>`);
}

function checkInDialog() {
  const forecast = buildForecast(data.settings!, data.entries);
  return dialogFrame('Weekly cash check', 'Revision check', `<form id="checkin-form" novalidate>
    <p class="dialog-intro">Look at the real bank balance, then redraw forward. This keeps the plan honest without importing bank transactions.</p>
    <label><span>Actual balance today</span><input name="balance" type="number" inputmode="decimal" step="0.01" required value="${data.settings!.balance}"></label>
    <label><span>Check-in date</span><input name="date" type="date" required value="${today()}"></label>
    <label><span>What changed? <small>optional</small></span><textarea name="note" maxlength="240" rows="3" placeholder="Invoice moved; tax cleared; quieter week…"></textarea></label>
    <div class="check-preview"><span>Current projected low</span><strong>${money(forecast.low)}</strong><small>This snapshot will be saved in your revision log.</small></div>
    <p class="form-error" id="checkin-error" aria-live="assertive"></p>
    <div class="dialog-actions"><button type="button" class="secondary" data-action="close-dialog">Cancel</button><button type="submit" class="primary dark">Complete check-in</button></div>
  </form>`);
}

function settingsDialog() {
  const settings = data.settings!;
  return dialogFrame('Starting position', 'Assumptions', `<form id="settings-form" novalidate>
    <p class="dialog-intro">These are the anchors for every projection. Changing the date leaves earlier items overdue until you resolve them.</p>
    <div class="field-row"><label><span>Current balance</span><input name="balance" type="number" inputmode="decimal" step="0.01" required value="${settings.balance}"></label><label><span>Keep-back reserve</span><input name="reserve" type="number" inputmode="decimal" min="0" step="0.01" required value="${settings.reserve}"></label></div>
    <div class="field-row"><label><span>As of</span><input name="asOf" type="date" required value="${settings.asOf}"></label><label><span>Currency</span><select name="currency">${['USD','GBP','EUR','INR','AUD','CAD'].map((currency) => `<option ${settings.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></label></div>
    <p class="form-error" id="settings-error" aria-live="assertive"></p>
    <div class="dialog-actions"><button type="button" class="secondary" data-action="close-dialog">Cancel</button><button type="submit" class="primary">Redraw forecast</button></div>
  </form>`);
}

function dataDialog() {
  const allEntries = [...data.entries].sort((a, b) => a.date.localeCompare(b.date));
  return dialogFrame('Data & ownership', 'Local tools', `<div class="data-sections">
    <section><h3>Take your data with you</h3><p>Download a readable backup, a spreadsheet CSV, or a password-encrypted backup. Nothing is uploaded.</p><div class="button-cluster"><button class="secondary" data-action="export-json">Export JSON</button><button class="secondary" data-action="export-csv">Export CSV</button><button class="secondary" data-action="show-encrypt">Encrypted backup</button></div><form id="encrypt-form" class="inline-form" hidden><label><span>Backup password</span><input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="primary" type="submit">Encrypt & download</button></form></section>
    <section><h3>Restore a backup</h3><p>Import a JSON or encrypted backup. This replaces the plan on this device after confirmation.</p><label class="file-button">Choose backup<input id="import-file" type="file" accept=".json,application/json"></label><form id="decrypt-form" class="inline-form" hidden><label><span>Backup password</span><input type="password" name="password" required autocomplete="current-password"></label><button class="primary" type="submit">Decrypt & restore</button></form><p class="form-error" id="data-error" aria-live="assertive"></p></section>
    <section class="license-panel"><p class="eyebrow">Owner Cash Check Plus</p>${isPro ? `<h3>Plus is unlocked</h3><p>Repeat schedules are available on this device. License verification never blocks the free forecast.</p><button class="text-button" data-action="remove-license">Remove license from this device</button>` : `<h3>Schedule repeats once. Keep the core forever.</h3><p><strong>$19 one-time.</strong> Unlock weekly and monthly repeat schedules. The full 13-week forecast, safety flags, check-ins, and every export remain free.</p><div class="button-cluster"><a class="primary button-link" href="${checkoutUrl}">Buy Plus securely</a><button class="secondary" data-action="show-license">Have a license?</button></div><form id="license-form" class="inline-form" hidden><label><span>License token</span><input name="license" autocomplete="off" required></label><button class="primary" type="submit">Verify & restore</button></form><small>Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license. <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></small>`}</section>
    <section><h3>All schedule items <span class="count">${allEntries.length}</span></h3>${allEntries.length ? `<ul class="compact-list">${allEntries.map((entry) => `<li class="${entry.completed ? 'completed' : ''}"><span>${displayDate(entry.date)} · ${escapeHTML(entry.name)}</span><b>${entry.type === 'incoming' ? '+' : '−'}${money(entry.amount)}</b>${entry.completed ? `<button class="text-button" data-action="reopen-entry" data-id="${entry.id}">Restore</button>` : `<button class="text-button" data-action="edit-entry" data-id="${entry.id}">Edit</button>`}</li>`).join('')}</ul>` : '<p>No schedule items yet.</p>'}</section>
    <section class="danger-zone"><h3>Start over</h3><p>Delete the cash plan and check-in history from this browser. Export first if you may need it.</p><button class="danger-button" data-action="reset-data">Delete local plan…</button></section>
  </div>`, true);
}

function render() {
  app.innerHTML = data.settings ? dashboard() : onboarding();
  bindEvents();
  if (activeDialog) {
    const dialog = document.querySelector<HTMLDialogElement>('#active-dialog');
    dialog?.showModal();
    window.setTimeout(() => dialog?.querySelector<HTMLElement>('input:not([type="hidden"]), select, button')?.focus(), 0);
  }
}

function openDialog(which: typeof activeDialog, editId: string | null = null, opener = document.activeElement as HTMLElement) {
  if (!activeDialog) {
    dialogReturnAction = opener.dataset.action ?? null;
    dialogReturnIndex = dialogReturnAction ? Array.from(document.querySelectorAll<HTMLElement>(`[data-action="${dialogReturnAction}"]`)).indexOf(opener) : 0;
  }
  activeDialog = which;
  editingEntryId = editId;
  render();
}
function closeDialog() {
  activeDialog = null;
  editingEntryId = null;
  render();
  if (dialogReturnAction) {
    const action = dialogReturnAction;
    const index = dialogReturnIndex;
    dialogReturnAction = null;
    window.setTimeout(() => document.querySelectorAll<HTMLElement>(`[data-action="${action}"]`)[index]?.focus(), 0);
  }
}

function bindEvents() {
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => element.addEventListener('click', handleAction));
  document.querySelectorAll<HTMLButtonElement>('[data-week]').forEach((button) => button.addEventListener('click', () => { selectedWeek = Number(button.dataset.week); render(); }));
  document.querySelector('#setup-form')?.addEventListener('submit', submitSetup);
  document.querySelector('#entry-form')?.addEventListener('submit', submitEntry);
  document.querySelector('#checkin-form')?.addEventListener('submit', submitCheckIn);
  document.querySelector('#settings-form')?.addEventListener('submit', submitSettings);
  document.querySelector('#encrypt-form')?.addEventListener('submit', submitEncryptedExport);
  document.querySelector('#license-form')?.addEventListener('submit', submitLicense);
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importFile);
  document.querySelectorAll<HTMLInputElement>('input[name="type"]').forEach((radio) => radio.addEventListener('change', toggleConfidence));
  const dialog = document.querySelector<HTMLDialogElement>('#active-dialog');
  dialog?.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
  toggleConfidence();
}

function toggleConfidence() {
  const incoming = document.querySelector<HTMLInputElement>('input[name="type"]:checked')?.value === 'incoming';
  const field = document.querySelector<HTMLElement>('#confidence-field');
  if (field) field.hidden = !incoming;
}

async function submitSetup(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = new FormData(form);
  const balanceValue = String(values.get('balance') ?? '').trim();
  const reserveValue = String(values.get('reserve') ?? '').trim();
  const balance = parseAmount(balanceValue);
  const reserve = parseAmount(reserveValue);
  const error = document.querySelector('#setup-error')!;
  if (!balanceValue || !reserveValue || !Number.isFinite(balance) || !Number.isFinite(reserve) || balance < 0 || reserve < 0) { error.textContent = 'Enter both a current balance and a reserve of zero or more.'; return; }
  data.settings = { balance, reserve, asOf: String(values.get('asOf')), currency: String(values.get('currency')) };
  await persist('Your first cash drawing is ready.');
  render();
}

async function submitEntry(event: Event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget as HTMLFormElement);
  const name = String(values.get('name') ?? '').trim();
  const amount = parseAmount(values.get('amount'));
  const date = String(values.get('date'));
  const error = document.querySelector('#entry-error')!;
  if (!name || !Number.isFinite(amount) || amount <= 0 || !date) { error.textContent = 'Add a name, a positive amount, and a date.'; return; }
  const type = String(values.get('type')) as CashEntry['type'];
  const base = { type, name, amount, date, confidence: (type === 'outgoing' ? 'committed' : String(values.get('confidence'))) as Confidence, note: String(values.get('note') ?? '').trim() };
  const id = String(values.get('id') ?? '');
  if (id) {
    const current = data.entries.find((entry) => entry.id === id);
    if (current) Object.assign(current, base);
  } else {
    const recurrence = String(values.get('recurrence') ?? 'none') as Recurrence;
    const seriesId = recurrence === 'none' ? undefined : uid();
    const dates = [date];
    if (isPro && recurrence !== 'none') {
      let next = date;
      while (true) {
        if (recurrence === 'weekly') next = addDays(next, 7);
        else { const d = new Date(`${next}T12:00:00`); d.setMonth(d.getMonth() + 1); next = toISODate(d); }
        if (next >= addDays(data.settings!.asOf, 91)) break;
        dates.push(next);
      }
    }
    dates.forEach((itemDate) => data.entries.push({ ...base, date: itemDate, id: uid(), completed: false, createdAt: new Date().toISOString(), seriesId }));
  }
  await persist(id ? 'Cash item updated.' : 'Cash item added to the drawing.');
  closeDialog();
}

async function submitCheckIn(event: Event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget as HTMLFormElement);
  const actualBalance = parseAmount(values.get('balance'));
  const date = String(values.get('date'));
  const error = document.querySelector('#checkin-error')!;
  if (!Number.isFinite(actualBalance) || !date) { error.textContent = 'Enter the actual balance and check-in date.'; return; }
  const forecast = buildForecast(data.settings!, data.entries);
  data.checkIns.push({ id: uid(), date, actualBalance, projectedLow: forecast.low, reserve: data.settings!.reserve, note: String(values.get('note') ?? '').trim(), createdAt: new Date().toISOString() });
  data.settings!.balance = actualBalance;
  data.settings!.asOf = date;
  selectedWeek = 0;
  await persist('Weekly check-in saved. The plan now starts from the actual balance.');
  closeDialog();
}

async function submitSettings(event: Event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget as HTMLFormElement);
  const balanceValue = String(values.get('balance') ?? '').trim();
  const reserveValue = String(values.get('reserve') ?? '').trim();
  const balance = parseAmount(balanceValue);
  const reserve = parseAmount(reserveValue);
  if (!balanceValue || !reserveValue || !Number.isFinite(balance) || !Number.isFinite(reserve) || reserve < 0) { document.querySelector('#settings-error')!.textContent = 'Enter both a current balance and a reserve of zero or more.'; return; }
  data.settings = { balance, reserve, asOf: String(values.get('asOf')), currency: String(values.get('currency')) };
  selectedWeek = 0;
  await persist('Starting position updated.');
  closeDialog();
}

function download(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

async function submitEncryptedExport(event: Event) {
  event.preventDefault();
  const password = String(new FormData(event.currentTarget as HTMLFormElement).get('password') ?? '');
  try { download(await encryptBackup(data, password), `owner-cash-check-${today()}.encrypted.json`, 'application/json'); announce('Encrypted backup downloaded. Keep its password safe.'); }
  catch (error) { document.querySelector('#data-error')!.textContent = error instanceof Error ? error.message : 'Could not encrypt the backup.'; }
}

let pendingImportText = '';
async function importFile(event: Event) {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  pendingImportText = await file.text();
  try {
    const parsed = JSON.parse(pendingImportText) as { format?: string };
    if (parsed.format === 'owner-cash-check-encrypted-v1') {
      const form = document.querySelector<HTMLFormElement>('#decrypt-form')!; form.hidden = false;
      form.onsubmit = async (submitEvent) => { submitEvent.preventDefault(); try { await restoreImport(await decryptBackup(pendingImportText, String(new FormData(form).get('password') ?? ''))); } catch (error) { document.querySelector('#data-error')!.textContent = error instanceof Error ? error.message : 'Could not decrypt backup.'; } };
    } else await restoreImport(parsed);
  } catch { document.querySelector('#data-error')!.textContent = 'That file is not valid JSON.'; }
}

async function restoreImport(value: unknown) {
  const imported = validateImportedData(value);
  if (!confirm(`Replace this device’s plan with the backup containing ${imported.entries.length} schedule items and ${imported.checkIns.length} check-ins?`)) return;
  data = imported; await persist('Backup restored on this device.'); closeDialog();
}

async function submitLicense(event: Event) {
  event.preventDefault();
  const token = String(new FormData(event.currentTarget as HTMLFormElement).get('license') ?? '').trim();
  if (!token) return;
  storeLicense(token);
  try {
    const result = await verifyLicense(true);
    if (!result.valid) { clearLicense(); document.querySelector('#data-error')!.textContent = `That license is not active (${result.reason.replaceAll('_', ' ')}).`; return; }
    isPro = true; announce('Plus unlocked on this device.'); closeDialog();
  } catch { isPro = true; announce('Saved the license. It will be verified when you are online.'); closeDialog(); }
}

async function handleAction(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const action = target.dataset.action;
  if (action === 'open-entry') openDialog('entry', null, target);
  if (action === 'open-checkin') openDialog('checkin', null, target);
  if (action === 'open-data') openDialog('data', null, target);
  if (action === 'open-settings') openDialog('settings', null, target);
  if (action === 'close-dialog') closeDialog();
  if (action === 'edit-entry') openDialog('entry', target.dataset.id ?? null, target);
  if (action === 'complete-entry') {
    const entry = data.entries.find((item) => item.id === target.dataset.id);
    if (entry) { entry.completed = true; await persist(`${entry.name} marked handled and removed from the forward view.`); render(); }
  }
  if (action === 'reopen-entry') {
    const entry = data.entries.find((item) => item.id === target.dataset.id);
    if (entry) { entry.completed = false; await persist(`${entry.name} restored to the forward view.`); render(); }
  }
  if (action === 'delete-entry') {
    const entry = data.entries.find((item) => item.id === editingEntryId);
    if (entry && confirm(`Delete “${entry.name}” (${money(entry.amount)}) from this plan?`)) { data.entries = data.entries.filter((item) => item.id !== entry.id); await persist('Cash item deleted.'); closeDialog(); }
  }
  if (action === 'export-json') { download(JSON.stringify(data, null, 2), `owner-cash-check-${today()}.json`, 'application/json'); announce('JSON backup downloaded.'); }
  if (action === 'export-csv') { download(entriesToCSV(data.entries), `owner-cash-check-schedule-${today()}.csv`, 'text/csv'); announce('Schedule CSV downloaded.'); }
  if (action === 'show-encrypt') document.querySelector<HTMLFormElement>('#encrypt-form')!.hidden = false;
  if (action === 'show-license') document.querySelector<HTMLFormElement>('#license-form')!.hidden = false;
  if (action === 'remove-license') { if (confirm('Remove the Plus license from this device? Your cash plan will remain intact.')) { clearLicense(); isPro = false; render(); } }
  if (action === 'reset-data' && confirm(`Delete this local plan, ${data.entries.length} schedule items, and ${data.checkIns.length} check-ins? This cannot be undone unless you exported a backup.`)) { data = emptyData(); await persist('Local plan deleted.'); closeDialog(); }
  if (action === 'apply-update') { reloadForUpdate = true; waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); }
  if (action === 'reset-demo') { await clearDemoData(); data = sampleData(); await persist('Demo reset with the sample plan.'); render(); }
  if (action === 'start-real') { await clearDemoData(); location.assign('/'); }
}

function sampleData(): AppData {
  const asOf = today();
  const daysFromToday = (days: number) => addDays(asOf, days);
  return {
    version: 1,
    settings: { balance: 18400, reserve: 6000, asOf, currency: 'USD' },
    entries: [
      { id: 'demo-rent', name: 'Workshop rent', amount: 3200, date: daysFromToday(2), type: 'outgoing', confidence: 'committed', note: 'Monthly lease', completed: false, createdAt: new Date().toISOString() },
      { id: 'demo-invoice', name: 'Cedar Street invoice', amount: 5400, date: daysFromToday(5), type: 'incoming', confidence: 'likely', note: 'Approved, awaiting payment', completed: false, createdAt: new Date().toISOString() },
      { id: 'demo-payroll', name: 'Payroll', amount: 4800, date: daysFromToday(9), type: 'outgoing', confidence: 'committed', note: 'Friday payroll', completed: false, createdAt: new Date().toISOString() },
      { id: 'demo-tax', name: 'Quarterly tax set-aside', amount: 2100, date: daysFromToday(18), type: 'outgoing', confidence: 'committed', note: 'Tax reserve transfer', completed: false, createdAt: new Date().toISOString() }
    ],
    checkIns: [],
    updatedAt: new Date().toISOString()
  };
}

function policyConnectivity() {
  const update = () => { const banner = document.querySelector<HTMLElement>('#offline-banner'); if (banner) banner.hidden = navigator.onLine; };
  addEventListener('online', update); addEventListener('offline', update);
}

let waitingWorker: ServiceWorker | null = null;
let reloadForUpdate = false;
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  if (registration.waiting) showUpdate(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdate(installing);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadForUpdate) location.reload(); });
}
function showUpdate(worker: ServiceWorker) { waitingWorker = worker; const toast = document.querySelector<HTMLElement>('#update-toast'); if (toast) toast.hidden = false; }

async function init() {
  if (demo) {
    document.title = 'Demo — Owner Cash Check';
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', 'https://owner-cash-check.sociobot.in/demo');
  }
  try { data = await loadData(); }
  catch (error) { data = emptyData(); notice = error instanceof Error ? error.message : 'Local storage is unavailable.'; }
  if (demo && !data.settings) { data = sampleData(); await persist('Sample plan ready.'); }
  if (!demo && captureLicenseFromUrl()) { isPro = true; notice = 'License received. Plus is unlocked while verification completes.'; }
  render();
  policyConnectivity();
  registerServiceWorker().catch(() => announce('Offline setup will retry on the next visit.'));
  if (!demo && getLicenseToken()) verifyLicense().then((result) => { if (!result.valid) { isPro = false; render(); announce('License no longer active. The free forecast and your data are unchanged.'); } else isPro = true; }).catch(() => undefined);
}

init();
