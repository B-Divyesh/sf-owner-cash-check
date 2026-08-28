import { renderPolicy } from './policy';

renderPolicy('Privacy notice', 'Your data, your device', `
  <p>Owner Cash Check is designed so your financial plan stays private by default. We do not ask for bank credentials, do not run advertising trackers, and do not send your plan to our servers.</p>
  <h2>What is stored</h2><p>Your starting balance, reserve, cash schedule, and check-in history are stored in IndexedDB in this browser. A Plus license token and its last verification result are stored in localStorage. Clearing this site’s browser data deletes them from this device.</p>
  <h2>What leaves your device</h2><p>Your plan does not leave the device unless you export it and choose where to send it. When you activate or use Plus, only the license token is sent to the Sociobot billing API to verify that it is active. Purchase checkout is hosted by Sociobot/Dodo, the merchant of record, and their privacy terms apply to payment information. This app does not receive card details.</p>
  <h2>Backups and security</h2><p>Plain JSON and CSV exports are readable files. Encrypted backups use AES-GCM with a key derived locally from your password using PBKDF2. We cannot recover an encrypted backup password. Browser storage is protected by your device and browser profile; use an encrypted export if you need to move or archive sensitive figures.</p>
  <h2>Offline cache</h2><p>A service worker stores the app shell and static assets so the product works offline. It contains application files, not a server copy of your financial plan.</p>
  <h2>Contact</h2><p>For privacy questions, contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>`);
