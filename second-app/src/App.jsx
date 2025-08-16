import { useEffect, useMemo, useRef, useState } from "react";

/** ---------------------------------------
 *  Networks + simple cost/latency model
 *  ------------------------------------- */
const NETWORKS = [
  { id: "solana",   label: "Solana (USDC-SPL)",    baseFeeUSD: 0.0002, avgLatencyMs: 400,   throughputPerSec: 50000 },
  { id: "polygon",  label: "Polygon PoS (USDC.e)", baseFeeUSD: 0.01,   avgLatencyMs: 2200,  throughputPerSec: 700 },
  { id: "base",     label: "Base (USDC)",          baseFeeUSD: 0.015,  avgLatencyMs: 1800,  throughputPerSec: 600 },
  { id: "ethereum", label: "Ethereum (USDC)",      baseFeeUSD: 0.85,   avgLatencyMs: 12000, throughputPerSec: 30 },
];

function pickBestRoute({ recipientsCount }) {
  const candidates = NETWORKS.map((n) => {
    const totalFee = n.baseFeeUSD * recipientsCount; // flat demo fee model
    const estSeconds = Math.max(1.8, recipientsCount / Math.max(500, n.throughputPerSec));
    const score = totalFee * 10 + estSeconds; // prefer lower fee, then latency
    return { ...n, totalFee, estSeconds, score };
  });
  candidates.sort((a, b) => a.score - b.score);
  return { best: candidates[0], all: candidates };
}

/** ---------------------------------------
 *  CSV utilities (quoted fields supported)
 *  ------------------------------------- */
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idxName = headers.indexOf("name");
  const idxEmail = headers.indexOf("email");
  const idxAddress = headers.indexOf("address");
  const idxAmount = headers.indexOf("amount_usd"); // optional per-row amount

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    out.push({
      id: i - 1,
      name: idxName >= 0 ? (cols[idxName] || "").trim() : `User ${i}`,
      email: idxEmail >= 0 ? (cols[idxEmail] || "").trim() : `user${i}@demo.test`,
      address: idxAddress >= 0 ? (cols[idxAddress] || "").trim() : randomDemoAddress(i),
      amountUSD: idxAmount >= 0 ? safeNumber(cols[idxAmount]) : undefined,
      status: "pending",
      network: "",
      hash: "",
    });
  }
  return out;
}

// split a CSV line with support for quoted fields containing commas
function splitCSVLine(line) {
  const res = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++; // escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      res.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function randomDemoAddress(i) {
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `0x${hex(i)}${hex(i + 1)}${hex(i + 2)}${hex(i + 3)}${hex(i + 4)}${hex(i + 5)}${hex(i + 6)}${hex(i + 7)}${hex(i + 8)}${hex(i + 9)}${hex(i + 10)}`;
}

function toCSV(rows) {
  const header = ["group", "name", "email", "address", "amount_usd", "network", "status", "tx_hash"];
  const body = rows.map((r) => [
    r.groupName || "",
    r.name || "",
    r.email || "",
    r.address || "",
    r.amountUSD != null ? String(r.amountUSD) : "",
    r.network || "",
    r.status || "",
    r.hash || "",
  ].map(csvEscape).join(",")).join("\n");
  return header.join(",") + "\n" + body;
}
function csvEscape(s) {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function formatUSD(n) {
  if (n == null || !Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

/** ---------------------------------------
 *  Simulated sender (bursty, buttery)
 *  ------------------------------------- */
async function simulateSend(len, { secondsTarget, onBatch }) {
  const start = performance.now();
  let emitted = 0;
  const batch = [];

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const shouldBe = Math.min(len, Math.floor((elapsed / secondsTarget) * len));
      const toEmit = shouldBe - emitted;

      for (let j = 0; j < toEmit; j++) {
        const idx = emitted++;
        batch.push(idx);
        // flush every 50 items or at end to avoid UI thrash
        if (batch.length >= 50 || emitted === len) {
          onBatch(batch.slice());
          batch.length = 0;
        }
      }
      if (emitted >= len) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** ---------------------------------------
 *  App (premium, one-click groups)
 *  ------------------------------------- */
export default function App() {
  const fileRef = useRef(null);
  const [groups, setGroups] = useState([]);              // [{id, name, recipients:[...] }]
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [amountMode, setAmountMode] = useState("per");   // 'per' | 'split'
  const [amountPerRecipient, setAmountPerRecipient] = useState(1);
  const [totalSplitAmount, setTotalSplitAmount] = useState(1000);
  const [quote, setQuote] = useState(null);              // { best, all }
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [feed, setFeed] = useState([]);                 // [{name, hash}]
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [search, setSearch] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );
  const recipientsCount = selectedGroup?.recipients?.length || 0;

  // Auto-quote when group/recipients change
  useEffect(() => {
    if (!recipientsCount) {
      setQuote(null);
      setSelectedRouteId(null);
      return;
    }
    const { best, all } = pickBestRoute({ recipientsCount });
    setQuote({ best, all });
    setSelectedRouteId(best.id);
  }, [recipientsCount]);

  const selectedRoute = useMemo(
    () => (quote ? quote.all.find((n) => n.id === selectedRouteId) : null),
    [quote, selectedRouteId]
  );

  const paidCount = selectedGroup ? selectedGroup.recipients.filter((r) => r.status === "paid").length : 0;
  const progress = recipientsCount ? Math.round((paidCount / recipientsCount) * 100) : 0;

  function createDemoGroup(label, count) {
    const recips = Array.from({ length: count }).map((_, i) => ({
      id: i,
      name: `${label} Attendee ${i + 1}`,
      email: `${label.toLowerCase()}_${i + 1}@demo.test`,
      address: randomDemoAddress(i + 1),
      amountUSD: undefined,
      status: "pending",
      network: "",
      hash: "",
    }));
    const group = {
      id: cryptoRandomId(),
      name: `${label} (${count.toLocaleString()})`,
      recipients: recips,
    };
    setGroups((prev) => [group, ...prev]);
    setSelectedGroupId(group.id);
    setDone(false);
    setFeed([]);
  }

  function handleFile(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const reader = new FileReader();
    let idx = 0;
    const newGroups = [];

    const readNext = () => {
      if (idx >= files.length) {
        setGroups((prev) => [...newGroups, ...prev]);
        setSelectedGroupId(newGroups[0]?.id || null);
        setDone(false);
        setFeed([]);
        // allow re-uploading same file
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      const file = files[idx++];
      const r = new FileReader();
      r.onload = () => {
        const rows = parseCSV(String(r.result || ""));
        const name = (file.name || "Recipients").replace(/\.[^.]+$/, "");
        const group = { id: cryptoRandomId(), name, recipients: rows };
        newGroups.push(group);
        readNext();
      };
      r.readAsText(file);
    };
    readNext();
  }

  function cryptoRandomId() {
    return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
  }

  function resetGroupStatuses(group) {
    group.recipients.forEach((r) => {
      r.status = "pending";
      r.hash = "";
      r.network = "";
    });
  }

  function effectivePerRecipientAmount() {
    if (!selectedGroup) return 0;
    if (amountMode === "per") return Math.max(0, Number(amountPerRecipient) || 0);
    const split = Math.max(0, Number(totalSplitAmount) || 0);
    return recipientsCount ? split / recipientsCount : 0;
  }

  async function handleSend() {
    if (!selectedGroup || !recipientsCount || sending || !selectedRoute) return;
    setSending(true);
    setDone(false);
    setFeed([]);

    // shallow copy group to avoid mutating state mid-render
    const groupsClone = groups.map((g) => ({ ...g, recipients: g.recipients.map((r) => ({ ...r })) }));
    const g = groupsClone.find((x) => x.id === selectedGroup.id);
    resetGroupStatuses(g);

    const perAmount = effectivePerRecipientAmount();
    const secondsTarget = Math.max(2, Math.min(6, selectedRoute.estSeconds));

    const start = performance.now();
    await simulateSend(g.recipients.length, {
      secondsTarget,
      onBatch: (indices) => {
        // update a small batch at once → smooth UI
        const items = [];
        for (const idx of indices) {
          const r = g.recipients[idx];
          r.status = "paid";
          r.network = selectedRoute.id;
          r.hash = mockHash(selectedRoute.id, idx);
          r.amountUSD = r.amountUSD != null ? r.amountUSD : perAmount;
          items.push({ name: r.name, hash: r.hash });
        }
        // lightweight live feed (cap at 100 shown)
        setFeed((prev) => {
          const merged = [...items.reverse(), ...prev];
          return merged.slice(0, 100);
        });
        // only overwrite selected group in state (not all groups every tick)
        setGroups((prev) =>
          prev.map((pg) => (pg.id === g.id ? { ...g, recipients: g.recipients } : pg))
        );
      },
    });

    const elapsed = (performance.now() - start) / 1000;
    setSending(false);
    setDone(true);

    // ensure final state in case last small batch didn’t flush
    setGroups((prev) => prev.map((pg) => (pg.id === g.id ? { ...g, recipients: g.recipients } : pg)));

    // quick toast-like summary in feed header
    setFeed((prev) => [{ name: `Completed in ${elapsed.toFixed(1)}s`, hash: "✅" }, ...prev]);
  }

  function mockHash(networkId, i) {
    const base = networkId.slice(0, 3).toUpperCase();
    return `${base}_${Math.random().toString(36).slice(2, 10)}_${i}`;
  }

  function downloadReceipts() {
    if (!selectedGroup) return;
    const rows = selectedGroup.recipients.map((r) => ({
      ...r,
      groupName: selectedGroup.name,
    }));
    download(`receipts_${selectedGroup.name.replace(/\s+/g, "_").toLowerCase()}.csv`, toCSV(rows));
  }

  // Table filtering
  const filteredRows = useMemo(() => {
    if (!selectedGroup) return [];
    let rows = selectedGroup.recipients;
    if (showPaidOnly) rows = rows.filter((r) => r.status === "paid");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.address || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [selectedGroup, showPaidOnly, search]);

  const perAmt = effectivePerRecipientAmount();
  const estFees = selectedRoute ? selectedRoute.totalFee : 0;
  const estPayoutTotal = perAmt * recipientsCount;

  return (
    <div className="min-h-dvh w-screen bg-[#0B0F17] text-white">
      {/* Top bar */}
      <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-400/20 grid place-items-center text-emerald-300 font-bold">∞</div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Instant Bulk Payouts</h1>
              <p className="text-xs text-white/60">One click. Thousands paid. Stablecoin-ready (simulated).</p>
            </div>
          </div>
          <div className="text-xs text-white/60 hidden md:block">
            <span className="opacity-70">Compliance note:</span> Demo only — no real funds move.
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Controls row */}
        <section className="grid lg:grid-cols-3 gap-4">
          {/* Groups Panel */}
          <div className="p-4 rounded-2xl bg-white/5 shadow space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Groups</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createDemoGroup("Event", 1000)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15"
                >
                  Load 1,000 Demo
                </button>
                <label className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 cursor-pointer">
                  <input type="file" accept=".csv" multiple className="hidden" ref={fileRef} onChange={handleFile} />
                  Upload CSV(s)
                </label>
              </div>
            </div>

            {/* Group selector */}
            {groups.length ? (
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-auto pr-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroupId(g.id); setDone(false); setFeed([]); }}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition
                      ${selectedGroupId === g.id ? "bg-emerald-400/15 border-emerald-400/40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-white/60">{g.recipients.length.toLocaleString()} recips</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-sm">Load a demo or upload one or more CSVs (headers: <code>name,email,address[,amount_usd]</code>).</p>
            )}

            {/* Amount mode */}
            <div className="pt-2 border-t border-white/10">
              <p className="text-sm text-white/70 mb-2">Amount</p>
              <div className="flex items-center gap-3 mb-3">
                <label className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${amountMode === "per" ? "bg-emerald-400 text-black" : "bg-white/10"}`}>
                  <input type="radio" className="hidden" checked={amountMode === "per"} onChange={() => setAmountMode("per")} />
                  Per recipient
                </label>
                <label className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${amountMode === "split" ? "bg-emerald-400 text-black" : "bg-white/10"}`}>
                  <input type="radio" className="hidden" checked={amountMode === "split"} onChange={() => setAmountMode("split")} />
                  Split a total
                </label>
              </div>

              {amountMode === "per" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={amountPerRecipient}
                    onChange={(e) => setAmountPerRecipient(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="e.g., 1.00"
                  />
                  <span className="text-white/60 text-sm">USDC</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={totalSplitAmount}
                    onChange={(e) => setTotalSplitAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="e.g., 1000.00"
                  />
                  <span className="text-white/60 text-sm">Total USDC</span>
                </div>
              )}
            </div>
          </div>

          {/* Route Panel */}
          <div className="p-4 rounded-2xl bg-white/5 shadow space-y-3">
            <h2 className="font-semibold">Route</h2>
            {quote ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quote.all.map((n, idx) => {
                  const isBest = n.id === quote.best.id;
                  const selected = n.id === selectedRouteId;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedRouteId(n.id)}
                      className={`text-left p-3 rounded-xl border transition group
                        ${selected ? "bg-emerald-400/15 border-emerald-400/40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{n.label}</div>
                        {isBest && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-400 text-black">Best</span>
                        )}
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        Est. fees: {formatUSD(n.totalFee)} · ETA: {n.estSeconds.toFixed(1)}s
                      </div>
                      <div className="text-[11px] text-white/50">Throughput ≈ {n.throughputPerSec.toLocaleString()}/s</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-white/60 text-sm">Load a group to view route options.</p>
            )}

            {/* Estimator */}
            <div className="mt-2 p-3 rounded-xl bg-black/30 border border-white/10">
              <div className="text-xs text-white/70">Estimate</div>
              <div className="text-sm">
                <div>Recipients: <span className="text-white/90 font-medium">{recipientsCount.toLocaleString()}</span></div>
                <div>Payouts: <span className="font-medium">{formatUSD(perAmt)} each</span></div>
                <div>Total outflow: <span className="font-medium">{formatUSD(estPayoutTotal)}</span></div>
                <div>Network fees: <span className="font-medium">{formatUSD(estFees)}</span></div>
              </div>
            </div>
          </div>

          {/* One-Click Panel */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-400/30 shadow">
            <h2 className="font-semibold mb-2">One‑Click Payout</h2>
            <p className="text-sm text-white/70 mb-4">
              Send {formatUSD(perAmt)} to each of {recipientsCount.toLocaleString()} recipients via{" "}
              <span className="text-emerald-300">{selectedRoute ? selectedRoute.label : "—"}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSend}
                disabled={!selectedGroup || !recipientsCount || !selectedRoute || sending}
                className="px-5 py-3 rounded-2xl bg-emerald-400 text-black font-semibold shadow hover:brightness-110 disabled:opacity-40"
              >
                {sending ? "Sending…" : "Pay All Now"}
              </button>
              <button
                onClick={downloadReceipts}
                disabled={!selectedGroup || !done}
                className="px-5 py-3 rounded-2xl bg-white text-black font-semibold shadow hover:brightness-110 disabled:opacity-40"
              >
                Download Receipts CSV
              </button>
            </div>

            {/* Progress */}
            {selectedGroup && recipientsCount > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2 text-sm text-white/70">
                  <div>Progress</div>
                  <div>{paidCount.toLocaleString()} / {recipientsCount.toLocaleString()}</div>
                </div>
                <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {sending ? "Processing…" : done ? "Completed" : ""}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Live Feed + Search */}
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Live Feed</h3>
              <span className="text-xs text-white/60">latest 100</span>
            </div>
            <div className="max-h-[260px] overflow-auto space-y-1 pr-1">
              {feed.length === 0 ? (
                <div className="text-white/60 text-sm">No events yet.</div>
              ) : feed.map((f, i) => (
                <div key={i} className="text-xs px-2 py-1 rounded-lg bg-black/30 border border-white/10 flex items-center justify-between">
                  <span className="truncate">{f.name}</span>
                  <code className="text-white/60 ml-2 truncate">{f.hash}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 p-4 rounded-2xl bg-white/5 shadow">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or address"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <label className="text-xs flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 cursor-pointer">
                <input type="checkbox" checked={showPaidOnly} onChange={(e) => setShowPaidOnly(e.target.checked)} />
                Show paid only
              </label>
            </div>

            {/* Table */}
            {selectedGroup ? (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/40 backdrop-blur">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">#</th>
                        <th className="text-left px-4 py-3 font-semibold">Name</th>
                        <th className="text-left px-4 py-3 font-semibold">Email</th>
                        <th className="text-left px-4 py-3 font-semibold">Address</th>
                        <th className="text-left px-4 py-3 font-semibold">Amount</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Network</th>
                        <th className="text-left px-4 py-3 font-semibold">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 2000).map((r, i) => (
                        <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-white/70">{i + 1}</td>
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2 text-white/80">{r.email}</td>
                          <td className="px-4 py-2 text-white/60 font-mono truncate max-w-[220px]">{r.address}</td>
                          <td className="px-4 py-2 text-white/80">{r.amountUSD != null ? formatUSD(r.amountUSD) : "—"}</td>
                          <td className="px-4 py-2">
                            {r.status === "paid" ? <span className="text-emerald-400">Paid ✅</span> : <span className="text-white/60">Pending…</span>}
                          </td>
                          <td className="px-4 py-2 text-white/60">{r.network || "—"}</td>
                          <td className="px-4 py-2 text-white/60 font-mono truncate max-w-[180px]">{r.hash || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 text-[11px] text-white/50 bg-black/30">
                  Showing up to 2,000 rows for performance. Use receipts CSV for the full export.
                </div>
              </div>
            ) : (
              <div className="text-white/60 text-sm">Select a group to view recipients.</div>
            )}
          </div>
        </section>

        {/* Footer notes */}
        <section className="text-xs text-white/50 space-y-2">
          <p><strong>Demo Notes:</strong> This is a front‑end simulation. Replace <code>simulateSend</code> with real SDK/API calls (ethers.js, Solana web3, Circle/Fireblocks) to go live.</p>
          <p><strong>CSV Format:</strong> headers <code>name,email,address[,amount_usd]</code>. Extra columns are ignored.</p>
          <p><strong>Compliance:</strong> Real deployments must handle KYC/AML, sanctions screening, per‑jurisdiction fee rules, receipts, and audit logs.</p>
        </section>
      </main>
    </div>
  );
}
