/* ---------- 1. Data: Canadian denominations ------------------------------ */
const DENOMS = [
  { name: "$100 bill",   value: 10000 },
  { name: "$50 bill",    value:  5000 },
  { name: "$20 bill",    value:  2000 },
  { name: "$10 bill",    value:  1000 },
  { name: "$5 bill",     value:   500 },
  { name: "Toonie ($2)", value:   200 },
  { name: "Loonie ($1)", value:   100 },
  { name: "Quarter (25¢)", value:  25 },
  { name: "Dime (10¢)",    value:  10 },
  { name: "Nickel (5¢)",   value:   5 }
];
DENOMS.forEach(d => d.enabled = true);    // all on by default

const chipValues = [5, 10, 25, 100, 500]; // quick-add buttons (in cents)

/* ---------- 2. Helpers (defined BEFORE we call them) --------------------- */
// Format cents → “$X.XX” (locale Canadian English)
function fmt(cents) {
  return (cents / 100).toLocaleString(
    "en-CA",
    { style: "currency", currency: "CAD" }
  );
}

const roundToNickel = c => c - (c % 5);

/* ---------- 3. DOM shortcuts -------------------------------------------- */
const $ = id => document.getElementById(id);
const dueEl       = $("due");
const paidEl      = $("paid");
const changeEl    = $("change");
const errEl       = $("err");
const brkTbl      = $("breakdown");
const suggestCard = $("suggestCard");
const suggestEl   = $("suggest");

/* ---------- 4. Build UI: chips & toggles ------------------------------- */
// Quick-add “+5¢ +10¢ +25¢ +$1 +$5”
chipValues.forEach(c => {
  const span = document.createElement("span");
  span.className   = "chip";
  span.textContent = `+${fmt(c)}`;
  span.onclick     = () => {
    paidEl.value = (+paidEl.value || 0) + (c / 100);
    compute();
  };
  $("chips").append(span);
});

// Enable / disable denominations
DENOMS.forEach(d => {
  const lab = document.createElement("label");
  lab.innerHTML = `<input type="checkbox" checked> ${d.name}`;
  lab.firstChild.onchange = e => { d.enabled = e.target.checked; compute(); };
  $("denoms").append(lab, document.createElement("br"));
});

/* ---------- 5. Core algorithms ----------------------------------------- */
function greedy(cents) {
  const out = {};
  const active = DENOMS.filter(d => d.enabled)
                       .sort((a, b) => b.value - a.value);
  for (const d of active) {
    const n = Math.floor(cents / d.value);
    if (n) { out[d.name] = n; cents -= n * d.value; }
  }
  return [out, cents];               // cents leftover should be 0
}

function bestTopUps(changeCents) {
  const basePieces = Object.values(greedy(changeCents)[0])
                            .reduce((a, b) => a + b, 0);
  const res = [];
  for (let extra = 5; extra <= 200; extra += 5) { // scan +$0.05 .. +$2.00
    const pieces = Object.values(greedy(changeCents + extra)[0])
                          .reduce((a, b) => a + b, 0);
    if (pieces < basePieces) {
      res.push(extra);
      if (res.length === 2) break;   // keep at most two suggestions
    }
  }
  return res;
}

/* ---------- 6. Main compute() ------------------------------------------ */
function compute() {
  errEl.textContent = "";
  changeEl.textContent = "";
  brkTbl.innerHTML = "";
  suggestCard.hidden = true;
  suggestEl.innerHTML = "";

  const dueCents   = Math.round((+dueEl.value  || 0) * 100);
  const paidCents  = Math.round((+paidEl.value || 0) * 100);
  const roundedDue = roundToNickel(dueCents);

  if (paidCents < roundedDue) {
    errEl.textContent = "Amount paid is insufficient.";
    return;
  }

  const changeCents = paidCents - roundedDue;
  changeEl.textContent = `Change Due  ${fmt(changeCents)}`;

  const [breakdown] = greedy(changeCents);
  for (const [name, qty] of Object.entries(breakdown)) {
    const tr = brkTbl.insertRow();
    tr.insertCell().textContent = name;
    tr.insertCell().textContent = `× ${qty}`;
  }

  if (Object.values(breakdown).reduce((a, b) => a + b, 0) > 1) {
    const tips = bestTopUps(changeCents);
    if (tips.length) {
      suggestCard.hidden = false;
      tips.forEach(extra => {
        const li = document.createElement("li");
        li.textContent = `Ask for ${fmt(extra)} more → fewer pieces.`;
        suggestEl.append(li);
      });
    }
  }
}

/* ---------- 7. Hook inputs & first run --------------------------------- */
dueEl.oninput  = compute;
paidEl.oninput = compute;
compute();      // initial render
