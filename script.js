document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Mobile menu (the rail collapses into a drawer) ---------- */
const menuButton = document.querySelector('.menu-toggle');
const drawer = document.querySelector('.rail-drawer');
const navigation = document.querySelector('#navigation');
if (menuButton && drawer) {
  const setMenu = open => {
    menuButton.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? 'Close' : 'Menu';
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  drawer.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { setMenu(false); menuButton.focus(); }
  });
  matchMedia('(min-width: 1021px)').addEventListener('change', () => setMenu(false));
}

/* ---------- Expanding focus panels (one open at a time) ---------- */
document.querySelectorAll('.panels').forEach(group => {
  const panels = [...group.querySelectorAll('.panel')];
  const open = target => panels.forEach(panel => {
    const on = panel === target;
    panel.classList.toggle('is-open', on);
    const toggle = panel.querySelector('.panel-toggle');
    toggle.setAttribute('aria-expanded', String(on));
    panel.querySelector('.panel-body').hidden = !on;
  });
  panels.forEach((panel, i) => {
    const toggle = panel.querySelector('.panel-toggle');
    toggle.addEventListener('click', () => open(panel));
    toggle.addEventListener('keydown', e => {
      const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      panels[(next + panels.length) % panels.length].querySelector('.panel-toggle').focus();
    });
  });
  open(panels.find(p => p.classList.contains('is-open')) || panels[0]);
});

/* ---------- Live clocks for New Orleans and Madrid ---------- */
const clocks = [...document.querySelectorAll('time[data-tz]')];
const tickClocks = () => clocks.forEach(t => {
  t.textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: t.dataset.tz }).format(new Date());
});
if (clocks.length) { tickClocks(); setInterval(tickClocks, 20000); }

/* ---------- Ongoing roles stretch to the current month on the timeline ---------- */
document.querySelectorAll('.track b.ongoing[data-start]').forEach(bar => {
  const axisStart = 2021 * 12, axisEnd = 2027 * 12 + 6;
  const [y, m] = bar.dataset.start.split('-').map(Number);
  const now = new Date();
  const s = y * 12 + (m - 1), e = Math.min(axisEnd, now.getFullYear() * 12 + now.getMonth() + 1);
  bar.style.setProperty('--s', `${((s - axisStart) / (axisEnd - axisStart)) * 100}%`);
  bar.style.setProperty('--w', `${Math.max(0, (e - s) / (axisEnd - axisStart)) * 100}%`);
});

/* ---------- Experience explorer ---------- */
const explorer = document.querySelector('.explorer');
let explorerApi = null;
if (explorer) {
  explorer.classList.add('is-enhanced');
  const filterButtons = [...explorer.querySelectorAll('[data-filter]')];
  const navButtons = [...explorer.querySelectorAll('[data-role]')];
  const panels = navButtons.map(b => document.getElementById(b.dataset.role));
  const status = explorer.querySelector('.filter-status');
  const statusText = status && status.querySelector('span');
  const clearButton = status && status.querySelector('button');
  let current = null;

  const showRole = (id, focusPanel) => {
    navButtons.forEach((b, i) => {
      const on = b.dataset.role === id;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      panels[i].hidden = !on;
      if (on && current !== id) { panels[i].classList.remove('is-entering'); void panels[i].offsetWidth; panels[i].classList.add('is-entering'); }
    });
    current = id;
    if (focusPanel) document.getElementById(id).focus({ preventScroll: true });
  };

  const applyFilter = (matches, label) => {
    let firstVisible = null;
    navButtons.forEach(b => {
      const visible = matches(b);
      b.parentElement.hidden = !visible;
      if (visible && !firstVisible) firstVisible = b.dataset.role;
    });
    const currentVisible = navButtons.some(b => b.dataset.role === current && !b.parentElement.hidden);
    if (!currentVisible && firstVisible) showRole(firstVisible);
    if (status) {
      status.hidden = !label;
      if (label) {
        const count = navButtons.filter(b => !b.parentElement.hidden).length;
        statusText.textContent = `${count} ${count === 1 ? 'role' : 'roles'} ${label}`;
      }
    }
  };

  const setCategory = cat => {
    filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
    applyFilter(b => cat === 'all' || b.dataset.cats.split(' ').includes(cat), null);
  };

  filterButtons.forEach(b => b.addEventListener('click', () => setCategory(b.dataset.filter)));
  navButtons.forEach(b => b.addEventListener('click', () => {
    showRole(b.dataset.role);
    if (matchMedia('(max-width: 1020px)').matches) {
      document.getElementById(b.dataset.role).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }));
  if (clearButton) clearButton.addEventListener('click', () => { setCategory('all'); (filterButtons[0] || navButtons[0]).focus(); });

  explorerApi = {
    showSkill(skill, label) {
      filterButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
      const roles = navButtons.filter(b => (b.dataset.skills || '').split(' ').includes(skill));
      applyFilter(b => roles.includes(b), `where I used ${label}`);
      if (roles[0]) showRole(roles[0].dataset.role);
      explorer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    },
    showRole(id) {
      setCategory('all');
      showRole(id);
      explorer.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    },
    has: id => navButtons.some(b => b.dataset.role === id)
  };

  setCategory('all');
  showRole(navButtons[0].dataset.role);
}

/* Skill buttons anywhere on the page filter the explorer */
document.querySelectorAll('[data-show-skill]').forEach(button => {
  button.addEventListener('click', () => {
    if (explorerApi) explorerApi.showSkill(button.dataset.showSkill, button.dataset.label || button.textContent.trim());
  });
});

/* Links to a specific role open it in the explorer */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || !explorerApi) return;
  const id = link.getAttribute('href').slice(1);
  if (explorerApi.has(id)) { e.preventDefault(); explorerApi.showRole(id); history.replaceState(null, '', `#${id}`); }
});
if (explorerApi && location.hash && explorerApi.has(location.hash.slice(1))) explorerApi.showRole(location.hash.slice(1));

/* ---------- Copy email ---------- */
document.querySelectorAll('[data-copy]').forEach(button => {
  const original = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy the address';
    }
    button.classList.add('is-done');
    setTimeout(() => { button.textContent = original; button.classList.remove('is-done'); }, 2200);
  });
});

/* ---------- Active navigation ---------- */
const navLinks = navigation ? [...navigation.querySelectorAll('a[href^="#"]')] : [];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
const header = document.querySelector('.rail');
let scheduled = false;
function updatePosition() {
  scheduled = false;
  if (header) header.classList.toggle('is-scrolled', scrollY > 8);
  let active = -1;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= innerHeight * 0.35) active = i; });
  navLinks.forEach((l, i) => i === active ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current'));
}
const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updatePosition); } };
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
updatePosition();


/* ---------- Reading progress on the story page ---------- */
const readBar = document.querySelector('.read-progress span');
if (readBar) {
  const essay = document.querySelector('.essay');
  let pending = false;
  const update = () => {
    pending = false;
    const r = essay.getBoundingClientRect();
    const total = r.height - innerHeight * 0.6;
    readBar.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / Math.max(1, total)))})`;
  };
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

/* ===== Components from the AI portfolio ===== */
// Tabs: one helper for the analysis steps, the study viewer, and the app preview.
// Panels stay in the layout and fade, so nothing jumps when you switch.
const setupTabs = (tablist, onSelect) => {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
  const select = (index, focus) => {
    tabs.forEach((t, i) => {
      const on = i === index;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[i].classList.toggle("is-on", on);
      panels[i].inert = !on;
    });
    if (focus) tabs[index].focus();
    if (onSelect) onSelect(index, tabs[index]);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i, false));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      const to = { ArrowRight: i === last ? 0 : i + 1, ArrowDown: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(to, true);
    });
  });
  return select;
};

// Split It: a working preview of the app with one of its sample receipts
const phone = document.getElementById("splitit");
if (phone) {
  const money = (cents) => "$" + (cents / 100).toFixed(2);
  const people = [
    { id: "me", name: "Me", color: "#059669" },
    { id: "f2", name: "Friend 2", color: "#2563eb" },
    { id: "f3", name: "Friend 3", color: "#7c3aed" },
  ];
  const all = people.map((p) => p.id);
  const items = [
    { name: "Crispy Calamari", cents: 1450, who: [...all] },
    { name: "Wood-Fired Margherita Pizza", cents: 1800, who: ["me"] },
    { name: "Truffle Mushroom Rigatoni", cents: 2250, who: ["f2"] },
    { name: "House Chianti Glass × 2", cents: 2400, who: ["f2", "f3"] },
    { name: "Classic Tiramisu", cents: 900, who: [...all] },
    { name: "San Pellegrino Sparkling", cents: 550, who: ["f3"] },
  ];
  const printedSubtotal = 9350;
  const tax = 842;
  let tipRate = 18;
  let misread = false;
  const price = (item, i) => (misread && i === 0 ? 4150 : item.cents);
  const itemsSum = () => items.reduce((sum, item, i) => sum + price(item, i), 0);

  // Shares are worked out in whole cents, and leftover cents are handed out one at a time,
  // so the people's totals always add up to the bill.
  const proportional = (total, weights) => {
    const weightSum = weights.reduce((a, b) => a + b, 0);
    if (!weightSum) return weights.map(() => 0);
    const exact = weights.map((w) => (total * w) / weightSum);
    const shares = exact.map(Math.floor);
    let left = total - shares.reduce((a, b) => a + b, 0);
    exact.map((x, i) => [x - shares[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { shares[i] += 1; left -= 1; } });
    return shares;
  };
  const breakdown = () => {
    const own = people.map(() => 0);
    let unassigned = 0;
    items.forEach((item, i) => {
      const ids = item.who;
      if (!ids.length) { unassigned += 1; return; }
      const base = Math.floor(price(item, i) / ids.length);
      let extra = price(item, i) - base * ids.length;
      ids.forEach((id) => { own[people.findIndex((p) => p.id === id)] += base + (extra-- > 0 ? 1 : 0); });
    });
    const tip = Math.round((itemsSum() * tipRate) / 100);
    const taxes = proportional(tax, own);
    const tips = proportional(tip, own);
    return { own, taxes, tips, tip, unassigned, total: itemsSum() + tax + tip };
  };

  const review = document.getElementById("sp-review");
  const split = document.getElementById("sp-split");
  const summary = document.getElementById("sp-summary");
  let goTo = () => {};

  const render = () => {
    const sum = itemsSum();
    const off = sum !== printedSubtotal;
    review.innerHTML =
      (off
        ? `<div class="sp-warn"><b>Double-check the items. Some prices may be off.</b><span>Sum of items is ${money(sum)} (printed subtotal: ${money(printedSubtotal)})</span><button type="button" class="sp-btn is-amber" data-act="fix">Correct the Calamari line</button></div>`
        : `<div class="sp-ok"><span class="sp-badge">Confidence: high</span><span><b>Items add up to the printed subtotal.</b> ${money(printedSubtotal)}</span></div>`) +
      `<div class="sp-card">${items.map((item, i) => `<div class="sp-row${misread && i === 0 ? " is-off" : ""}"><span>${item.name}</span><span class="sp-num">${money(price(item, i))}</span></div>`).join("")}<div class="sp-row"><span class="sp-muted">Tax</span><span class="sp-num sp-muted">${money(tax)}</span></div></div>` +
      (off ? "" : `<button type="button" class="sp-btn is-soft" data-act="misread">See what happens when the model misreads a price</button>`) +
      `<button type="button" class="sp-btn" data-act="next" style="margin-top:.6rem">Looks right. Split it</button>`;

    split.innerHTML =
      `<div class="sp-card">${items.map((item, i) => {
        const n = item.who.length;
        return `<div class="sp-item"><div class="sp-item-top"><span>${item.name}</span><span class="sp-num">${money(price(item, i))}</span></div><div class="sp-muted">${n > 1 ? `${money(Math.floor(price(item, i) / n))} each (${n} ways)` : n === 1 ? "1 person" : "Not assigned yet"}</div><div class="sp-who">${people.map((p) => `<button type="button" class="sp-chip" style="--pc:${p.color}" aria-pressed="${item.who.includes(p.id)}" data-item="${i}" data-person="${p.id}">${p.name}</button>`).join("")}<button type="button" class="sp-chip is-all" data-item="${i}" data-person="all">Everyone</button></div></div>`;
      }).join("")}</div>` +
      `<div class="sp-card sp-tip"><span>Tip</span>${[15, 18, 20].map((r) => `<button type="button" class="sp-chip" style="--pc:#1c1917" aria-pressed="${r === tipRate}" data-tip="${r}">${r}%</button>`).join("")}</div>` +
      `<button type="button" class="sp-btn" data-act="summary" style="margin-top:.6rem">See each person’s share</button>`;

    const b = breakdown();
    summary.innerHTML =
      `<div class="sp-total"><small>Bill total with tax and ${tipRate}% tip</small><strong>${money(b.total)}</strong></div>` +
      (b.unassigned ? `<div class="sp-warn" style="margin-top:.6rem"><b>${b.unassigned} ${b.unassigned === 1 ? "item is" : "items are"} not assigned yet.</b><span>Go back to Split and tap who had ${b.unassigned === 1 ? "it" : "them"}.</span></div>` : "") +
      people.map((p, i) => `<div class="sp-card sp-person" style="--pc:${p.color}"><span class="sp-avatar">${p.name === "Me" ? "Me" : "F" + p.name.slice(-1)}</span><span><b>${p.name}</b><span class="sp-muted" style="display:block">Items ${money(b.own[i])} · tax ${money(b.taxes[i])} · tip ${money(b.tips[i])}</span></span><strong>${money(b.own[i] + b.taxes[i] + b.tips[i])}</strong></div>`).join("") +
      `<p class="sp-muted" style="margin-top:.7rem;text-align:center">Tax and tip follow what each person ordered. The three shares add up to the bill exactly.</p>`;
  };

  phone.addEventListener("click", (e) => {
    const el = e.target.closest("button");
    if (!el) return;
    if (el.dataset.act === "misread") misread = true;
    else if (el.dataset.act === "fix") misread = false;
    else if (el.dataset.act === "next") return goTo(1);
    else if (el.dataset.act === "summary") return goTo(2);
    else if (el.dataset.tip) tipRate = Number(el.dataset.tip);
    else if (el.dataset.item) {
      const item = items[Number(el.dataset.item)];
      if (el.dataset.person === "all") item.who = item.who.length === all.length ? [] : [...all];
      else item.who = item.who.includes(el.dataset.person) ? item.who.filter((id) => id !== el.dataset.person) : [...item.who, el.dataset.person];
    } else return;
    const top = el.closest(".sp-screen").scrollTop;
    render();
    phone.querySelector(".sp-screen.is-on").scrollTop = top;
  });

  render();
  const select = setupTabs(phone.querySelector(".sp-tabs"));
  goTo = (i) => select(i, false);
  select(0, false);
}

// How I read a conversation: read, code, interpret, so what, your turn
const reader = document.querySelector(".reader");
if (reader) {
  const segs = Array.from(reader.querySelectorAll(".seg"));
  const codeButtons = reader.querySelectorAll(".code");
  const findingButtons = reader.querySelectorAll("[data-finding]:not(.reader)");
  const pens = Array.from(reader.querySelectorAll(".pen"));
  const result = reader.querySelector(".rd-result");
  const count = reader.querySelector(".rd-count");
  const stepNames = ["read", "code", "interpret", "sowhat", "yours"];
  const names = { "": "No code" };
  codeButtons.forEach((b) => { names[b.dataset.code] = b.textContent.trim(); });
  let pen = "disclosure";

  const chooseCode = (code) => {
    reader.dataset.active = code;
    codeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.code === code)));
  };
  codeButtons.forEach((b) => b.addEventListener("click", () => chooseCode(b.getAttribute("aria-pressed") === "true" ? "all" : b.dataset.code)));

  const chooseFinding = (n) => {
    reader.dataset.finding = n;
    findingButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.finding === n)));
  };
  findingButtons.forEach((b) => b.addEventListener("click", () => chooseFinding(b.dataset.finding)));

  const selectStep = setupTabs(reader.querySelector(".rd-steps"), (i) => {
    const step = stepNames[i];
    reader.dataset.step = step;
    segs.forEach((s) => {
      if (step === "yours") { s.setAttribute("role", "button"); s.tabIndex = 0; }
      else { s.removeAttribute("role"); s.removeAttribute("tabindex"); }
    });
  });
  reader.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    selectStep(stepNames.indexOf(b.dataset.goto), false);
    if (window.matchMedia("(max-width: 63.99rem)").matches) reader.scrollIntoView({ block: "start" });
  }));

  const setPen = (button) => {
    pen = button.dataset.pen;
    pens.forEach((p) => p.setAttribute("aria-checked", String(p === button)));
  };
  pens.forEach((p, i) => {
    p.addEventListener("click", () => setPen(p));
    p.addEventListener("keydown", (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = pens[(i + step + pens.length) % pens.length];
      setPen(next);
      next.focus();
    });
  });

  const clearVerdicts = () => {
    segs.forEach((s) => { s.removeAttribute("data-verdict"); s.classList.remove("agree", "differ"); });
    result.hidden = true;
  };
  const updateCount = () => {
    const n = segs.filter((s) => s.dataset.guess).length;
    count.textContent = `${n} of ${segs.length} sentences highlighted`;
  };
  const act = (seg) => {
    const step = reader.dataset.step;
    if (step === "code") {
      if (seg.dataset.code) chooseCode(reader.dataset.active === seg.dataset.code ? "all" : seg.dataset.code);
      return;
    }
    if (step !== "yours") return;
    clearVerdicts();
    if (!pen || seg.dataset.guess === pen) seg.removeAttribute("data-guess");
    else seg.dataset.guess = pen;
    updateCount();
  };
  segs.forEach((s) => {
    s.addEventListener("click", () => act(s));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(s); }
    });
  });

  reader.querySelector("[data-compare]").addEventListener("click", () => {
    let agreed = 0;
    const list = reader.querySelector(".rd-why");
    list.innerHTML = "";
    segs.forEach((s, i) => {
      const mine = s.dataset.code;
      const yours = s.dataset.guess || "";
      const same = mine === yours;
      if (same) agreed += 1;
      s.classList.toggle("agree", same);
      s.classList.toggle("differ", !same);
      if (!same) s.dataset.verdict = `Mine: ${names[mine]}`;
      else if (mine) s.dataset.verdict = "We agree";
      else s.removeAttribute("data-verdict");
      const li = document.createElement("li");
      li.className = same ? "agree" : "differ";
      const label = document.createElement("b");
      label.textContent = `Sentence ${i + 1}${same ? "" : ", we differ"}`;
      const why = document.createElement("span");
      why.textContent = (same ? "" : `You: ${names[yours]}. `) + s.dataset.why;
      li.append(label, why);
      if (same) list.append(li);
      else list.insertBefore(li, list.querySelector("li.agree"));
    });
    reader.querySelector(".rd-score").textContent = `We agreed on ${agreed} of ${segs.length} sentences.`;
    result.hidden = false;
  });
  reader.querySelector("[data-reset]").addEventListener("click", () => {
    segs.forEach((s) => s.removeAttribute("data-guess"));
    clearVerdicts();
    updateCount();
  });

  chooseCode("all");
  chooseFinding("1");
  selectStep(0, false);
}

// Study proposals: three studies, four parts each, all in one viewer.
// Switching study keeps the part you were reading.
const viewer = document.querySelector(".briefs");
if (viewer) {
  let part = 0;
  const partSelectors = Array.from(viewer.querySelectorAll(".steps")).map((list) => setupTabs(list, (i) => (part = i)));
  const selectStudy = setupTabs(viewer.querySelector(".brief-tabs"), (i) => {
    const keep = part;
    partSelectors[i](keep, false);
  });
  partSelectors.forEach((select) => select(0, false));
  selectStudy(0, false);
}

// Teardown rows: one open at a time
const tdRows = Array.from(document.querySelectorAll(".td-toggle"));
tdRows.forEach((t) => {
  const sync = () => { document.getElementById(t.getAttribute("aria-controls")).inert = t.getAttribute("aria-expanded") !== "true"; };
  sync();
  t.addEventListener("click", () => {
    const open = t.getAttribute("aria-expanded") !== "true";
    tdRows.forEach((o) => { o.setAttribute("aria-expanded", String(o === t && open)); document.getElementById(o.getAttribute("aria-controls")).inert = !(o === t && open); });
  });
});

// Generic tab sets (the client journey, the exit interviews)
document.querySelectorAll("[data-tabs]").forEach((list) => setupTabs(list)(0, false));

// The product page, taken apart: each switch adds one thing to the page and opens its notes
const lab = document.querySelector(".lab");
if (lab) {
  const toggles = Array.from(lab.querySelectorAll(".lever-toggle"));
  const count = lab.querySelector(".lab-count");
  const label = lab.querySelector(".pdp-colors-label");
  const said = lab.querySelector(".pdp-said");
  const sync = () => {
    const on = toggles.filter((t) => t.getAttribute("aria-pressed") === "true").map((t) => t.dataset.lever);
    lab.dataset.on = on.join(" ");
    count.textContent = `${on.length} of ${toggles.length} switched on`;
    label.textContent = on.includes("choice") ? "Four colors, chosen for this season. See all 12" : "12 colors";
    toggles.forEach((t) => { document.getElementById(t.getAttribute("aria-controls")).inert = t.getAttribute("aria-pressed") !== "true"; });
  };
  toggles.forEach((t) => t.addEventListener("click", () => { t.setAttribute("aria-pressed", String(t.getAttribute("aria-pressed") !== "true")); sync(); }));
  lab.querySelectorAll("[data-lab]").forEach((b) => b.addEventListener("click", () => {
    toggles.forEach((t) => t.setAttribute("aria-pressed", String(b.dataset.lab === "all")));
    sync();
  }));
  lab.querySelector(".pdp-buy").addEventListener("click", () => { said.hidden = false; });
  // the page opens with one switch already on, so the idea is visible before anyone clicks
  toggles[0].setAttribute("aria-pressed", "true");
  sync();
}
