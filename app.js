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
DENOMS.forEach(d => d.enabled = true);

const chipValues = [5, 10, 25, 100, 500];   // quick‑add buttons (cents)

/* ---------- 2. Helpers ---------------------------------------------------- */
// Format cents → “$X.XX”
function fmt(cents) {
  return (cents / 100).toLocaleString(
    "en-CA",
    { style: "currency", currency: "CAD" }
  );
}

// Nearest‑nickel rounding (1–2↓, 3–4↑, 6–7↓, 8–9↑)
const roundToNickel = cents => {
  const r = cents % 5;
  return r <= 2 ? cents - r : cents + (5 - r);
};

/* ---------- 3. DOM shortcuts --------------------------------------------- */
const $ = id => document.getElementById(id);
const dueEl       = $("due");
const paidEl      = $("paid");
const changeEl    = $("change");
const errEl       = $("err");
const brkTbl      = $("breakdown");
const suggestCard = $("suggestCard");
const suggestEl   = $("suggest");

/* ---------- 4. Build UI: chips & toggles --------------------------------- */
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

DENOMS.forEach(d => {
  const lab = document.createElement("label");
  lab.innerHTML = `<input type="checkbox" checked> ${d.name}`;
  lab.firstChild.onchange = e => { d.enabled = e.target.checked; compute(); };
  $("denoms").append(lab, document.createElement("br"));
});

/* ---------- 5. Core algorithms ------------------------------------------- */
function greedy(cents) {
  const pieces = {};
  const active = DENOMS.filter(d => d.enabled).sort((a,b)=>b.value-a.value);
  for (const d of active) {
    const n = Math.floor(cents / d.value);
    if (n) { pieces[d.name] = n; cents -= n * d.value; }
  }
  return [pieces, cents];   // cents leftover should be 0
}

function bestTopUps(baseChangeCents) {
  const baselinePieces = Object.values(greedy(baseChangeCents)[0])
                                .reduce((a,b)=>a+b,0);
  const results = [];
  for (let extra = 5; extra <= 200; extra += 5) {      // scan extra nickels
    const candidate = roundToNickel(baseChangeCents + extra);
    const pieces = Object.values(greedy(candidate)[0]).reduce((a,b)=>a+b,0);
    if (pieces < baselinePieces) {
      results.push(extra);
      if (results.length === 2) break;                 // max two suggestions
    }
  }
  return results;
}

/* ---------- 6. Main compute ---------------------------------------------- */
function compute() {
  errEl.textContent   = "";
  changeEl.textContent = "";
  brkTbl.innerHTML     = "";
  suggestCard.hidden   = true;
  suggestEl.innerHTML  = "";

  const dueCents  = Math.round((+dueEl.value  || 0) * 100);
  const paidCents = Math.round((+paidEl.value || 0) * 100);

  if (paidCents < dueCents) {
    errEl.textContent = "Amount paid is insufficient.";
    return;
  }

  const changeExact   = paidCents - dueCents;        // raw difference
  const changeRounded = roundToNickel(changeExact);  // now apply nickel rule
  changeEl.textContent = `Change Due  ${fmt(changeRounded)}`;

  const [breakdown] = greedy(changeRounded);
  for (const [name, qty] of Object.entries(breakdown)) {
    const tr = brkTbl.insertRow();
    tr.insertCell().textContent = name;
    tr.insertCell().textContent = `× ${qty}`;
  }

  // Suggestions: add extra nickels BEFORE rounding to reduce coins
  if (Object.values(breakdown).reduce((a,b)=>a+b,0) > 1) {
    const tips = bestTopUps(changeExact);
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

/* ---------- 7. Hook inputs & initial render ------------------------------ */
dueEl.oninput  = compute;
paidEl.oninput = compute;
compute();       // first run
