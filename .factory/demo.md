# Demo sandbox

Open `https://owner-cash-check.sociobot.in/demo` or choose **Try it with sample data** on the first screen.

The demo loads a realistic workshop plan: a $18,400 opening balance, $6,000 reserve, workshop rent, an approved Cedar Street invoice, payroll, and a quarterly tax set-aside. It immediately renders the 13-week cash plan and lets visitors add, edit, export, and check in against sample data.

Demo data is stored only in the `demo:current` record in the `owner-cash-check` IndexedDB database. Real data uses the separate `current` record. Demo mode never reads or writes the real record, and it does not run license capture or verification. **Reset demo** clears and reseeds `demo:current`; **Start for real** clears that demo record and returns to the empty real setup.
