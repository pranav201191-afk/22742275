// Blitz CoinPay — Futuristic Micropayments Platform (Full Workflow Demo)
// One app to showcase micropayments across domains + an end-to-end workflow run.
// Premium blurred animation background included. Everything runs in demo/sandbox mode.

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Coins, Gamepad2, Users, Cpu, Gift, Briefcase, Info, PlayCircle, Download, Music2 } from "lucide-react";

function BackgroundFX() {
  return (
    <>
      <style>{`
        @keyframes floatSlow { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(20px,-30px,0) scale(1.05)} 100%{transform:translate3d(0,0,0) scale(1)} }
      `}</style>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle at 30% 30%, #00E1A1, transparent 60%)", animation: "floatSlow 16s ease-in-out infinite" }} />
        <div className="absolute top-1/3 -right-20 w-[560px] h-[560px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle at 60% 40%, #6EA8FE, transparent 60%)", animation: "floatSlow 20s ease-in-out infinite" }} />
        <div className="absolute -bottom-24 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle at 40% 60%, #F59E0B, transparent 60%)", animation: "floatSlow 22s ease-in-out infinite" }} />
      </div>
    </>
  );
}

const NETWORKS = [
  { id: "solana", label: "Solana (USDC-SPL)", baseFeeUSD: 0.0002, latencyMs: 400, tps: 50000 },
  { id: "base", label: "Base (USDC)", baseFeeUSD: 0.015, latencyMs: 1800, tps: 600 },
  { id: "polygon", label: "Polygon PoS (USDC.e)", baseFeeUSD: 0.01, latencyMs: 2200, tps: 700 },
  { id: "ethereum", label: "Ethereum (USDC)", baseFeeUSD: 0.85, latencyMs: 12000, tps: 30 },
] as const;

function routeFor(count: number) {
  const ranked = NETWORKS.map((n) => {
    const fee = n.baseFeeUSD * count;
    const seconds = Math.max(1.2, count / Math.max(300, n.tps));
    return { ...n, fee, eta: seconds, score: fee * 10 + seconds };
  }).sort((a, b) => a.score - b.score);
  return { best: ranked[0], alts: ranked.slice(1) };
}

function demoRecipients(count = 1000) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    name: `Recipient ${i + 1}`,
    email: `r${i + 1}@demo.test`,
    address: `0x${(i + 1).toString(16).padStart(4, "0")}…${(i + 33).toString(16).padStart(4, "0")}`,
    status: "pending" as const,
    hash: "",
    network: "",
  }));
}

type ArtistRow = {
  id: number; name: string; email: string; address: string;
  plays: number; amountUSD?: number;
  status: "pending" | "paid";
  hash: string; network: string;
  lastPaidPlays: number; paidTotalUSD: number; lastTxAt?: string;
};

function demoArtistsStreaming(ratePerStreamUSD = 0.004): ArtistRow[] {
  const artists = [
    { name: "Alice Aria", plays: 1200 },
    { name: "Beats by Ben", plays: 450 },
    { name: "Chloe Synth", plays: 8900 },
    { name: "DJ Nova", plays: 2300 },
    { name: "Echoes", plays: 320 },
  ] as const;

  return artists.map((a, i) => ({
    id: i + 1,
    name: a.name,
    email: `artist${i + 1}@label.example`,
    address: `0xART${(i + 1).toString(16).padStart(2, "0")}…${(i + 97).toString(16).padStart(2, "0")}`,
    plays: a.plays,
    amountUSD: +(a.plays * ratePerStreamUSD).toFixed(6),
    status: "pending" as const,
    hash: "",
    network: "",
    lastPaidPlays: 0,
    paidTotalUSD: 0,
  }));
}

function toCSV(rows: any[]) {
  const hasPlays = rows.some(r => typeof r.plays === "number");
  const header = hasPlays
    ? ["name", "email", "address", "plays", "amount_usd", "network", "status", "tx_hash"]
    : ["name", "email", "address", "amount_usd", "network", "status", "tx_hash"];

  const body = rows
    .map(r => {
      const base = hasPlays
        ? [r.name, r.email, r.address, r.plays ?? "", r.amountUSD ?? "", r.network ?? "", r.status ?? "", r.hash ?? ""]
        : [r.name, r.email, r.address, r.amountUSD ?? "", r.network ?? "", r.status ?? "", r.hash ?? ""];
      return base.map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",");
    })
    .join("\n");

  return header.join(",") + "\n" + body;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STAGES = [
  "Initiate (ingest CSV/JSON, idempotency)",
  "Screen (KYC/AML, sanctions, wallet checks)",
  "Route (score networks by cost/speed/liquidity/risk)",
  "Fund (treasury balances, on-ramp/bridge)",
  "Execute (parallel/batched transfers)",
  "Confirm (on-chain/webhook confirmations)",
  "Notify (recipient receipts with explorer links)",
  "Reconcile (double-entry ledger, ERP export)",
  "Audit (immutable logs, retention policies)",
] as const;

function useWorkflowRunner() {
  const [running, setRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const [pct, setPct] = useState(0);

  function append(line: string) {
    setLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${line}`]);
  }

  async function run(batch: any[], defaultAmountUSD: number) {
    setRunning(true); setStageIndex(-1); setLog([]); setPct(0);

    const amounts = batch.map(b => b.amountUSD).filter((v: any) => typeof v === "number");
    const hasVarAmounts = amounts.length === batch.length && new Set(amounts).size > 1;
    setStageIndex(0);
    append(
      hasVarAmounts
        ? `Loaded batch of ${batch.length.toLocaleString()} recipients; variable amounts per recipient`
        : `Loaded batch of ${batch.length.toLocaleString()} recipients; amount $${defaultAmountUSD.toFixed(2)} each`
    );
    await delay(300);

    setStageIndex(1); append("Screened: sanctions/KYC checks simulated (all pass)");
    await delay(350);

    setStageIndex(2);
    const { best } = routeFor(batch.length);
    append(`Routing → ${best.label} (fee ~$${best.fee.toFixed(4)}, ETA ~${best.eta.toFixed(1)}s)`);
    await delay(350);

    setStageIndex(3); append("Treasury OK (balances sufficient); no top-up needed");
    await delay(250);

    setStageIndex(4); append("Executing transfers in parallel…");
    const clone = batch.map((r) => ({ ...r }));
    const targetSeconds = Math.max(1.5, Math.min(4, Math.max(1.2, batch.length / Math.max(300, 50000))));
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        const expected = Math.min(clone.length, Math.floor((elapsed / targetSeconds) * clone.length));
        for (let i = 0; i < expected; i++) {
          if (clone[i].status !== "paid") {
            clone[i].status = "paid";
            clone[i].network = "solana";
            clone[i].amountUSD = typeof clone[i].amountUSD === "number" ? clone[i].amountUSD : defaultAmountUSD;
            clone[i].hash = `SOL_${Math.random().toString(36).slice(2,10)}_${i}`;
          }
        }
        setPct(Math.round((expected / clone.length) * 100));
        if (expected >= clone.length) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    append(`Executed ${clone.length.toLocaleString()} transfers`);
    setStageIndex(5); append("Confirmations received; final fees computed"); await delay(200);
    setStageIndex(6); append("Receipts sent with explorer links (simulated)"); await delay(200);
    setStageIndex(7); append("Ledger entries posted; ERP export ready"); await delay(200);
    setStageIndex(8); append("Immutable audit log updated"); await delay(150);

    setRunning(false);
    return clone;
  }

  function stop() { setRunning(false); }

  return { running, stageIndex, log, pct, run, stop };
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export default function FluxPayApp() {
  const [tab, setTab] = useState("content");
  const [amountUSD, setAmountUSD] = useState(1);
  const [ratePerStreamUSD, setRatePerStreamUSD] = useState(0.004);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [routed, setRouted] = useState<{best:any, alts:any[]} | null>(null);
  const { running, stageIndex, log, pct, run } = useWorkflowRunner();

  const [autoStreaming, setAutoStreaming] = useState(true);
  const [tickMs, setTickMs] = useState(3000);
  const [artists, setArtists] = useState<ArtistRow[]>(demoArtistsStreaming(0.004));
  const [streamStats, setStreamStats] = useState({ totalPlays: 0, totalPaidUSD: 0, lastRoute: "—" });

  const paid = recipients.filter((r) => r.status === "paid").length;
  const progress = recipients.length ? Math.round((paid / recipients.length) * 100) : pct;

  function loadDemo(count = 1000) {
    const rows = demoRecipients(count);
    setRecipients(rows);
    setRouted(null);
  }

  function loadStreamingSample() {
    const rows = demoArtistsStreaming(ratePerStreamUSD);
    setArtists(rows);
    setRecipients(rows);
    setRouted(null);
  }

  function quoteRoute() {
    if (!recipients.length) return;
    setRouted(routeFor(recipients.length));
  }

  async function runWorkflow() {
    if (!recipients.length) loadDemo(1000);
    const out = await run(recipients.length ? recipients : demoRecipients(1000), amountUSD);
    setRecipients(out);
    setRouted(routeFor(out.length));
  }

  function downloadReceipts() {
    if (!recipients.length) return;
    download("fluxpay_receipts.csv", toCSV(recipients));
  }

  useEffect(() => {
    if (tab !== "streaming" || !autoStreaming) return;
    let mounted = true;
    let timer: number | null = null;

    const tick = async () => {
      if (!mounted) return;
      const updated = artists.map(a => {
        const inc = Math.floor(Math.random() * 50);
        return { ...a, plays: a.plays + inc };
      });

      const dueBatch = updated
        .map(a => {
          const delta = a.plays - a.lastPaidPlays;
          const amt = +(delta * ratePerStreamUSD).toFixed(6);
          return delta > 0 && amt > 0
            ? { id: a.id, name: a.name, email: a.email, address: a.address, amountUSD: amt, status: "pending" as const, hash: "", network: "" }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      if (dueBatch.length && !running) {
        const result = await run(dueBatch, 0);
        const byId: Record<number, any> = {};
        result.forEach((r:any) => { byId[r.id] = r; });
        const merged = updated.map(a => {
          const r = byId[a.id];
          if (r && r.status === "paid") {
            const delta = a.plays - a.lastPaidPlays;
            const amt = +(delta * ratePerStreamUSD).toFixed(6);
            return {
              ...a,
              lastPaidPlays: a.plays,
              paidTotalUSD: +(a.paidTotalUSD + amt).toFixed(6),
              network: r.network || a.network,
              hash: r.hash || a.hash,
              status: "paid" as const,
              lastTxAt: new Date().toLocaleTimeString(),
            };
          }
          return a;
        });

        const rbest = routeFor(dueBatch.length).best;
        const newStats = {
          totalPlays: merged.reduce((s, x) => s + x.plays, 0),
          totalPaidUSD: +merged.reduce((s, x) => s + x.paidTotalUSD, 0).toFixed(6),
          lastRoute: `${rbest.label} • fee $${rbest.fee.toFixed(4)} • ETA ${rbest.eta.toFixed(1)}s`,
        };

        setArtists(merged as ArtistRow[]);
        setStreamStats(newStats);
        setRecipients(merged.map(a => ({
          ...a,
          amountUSD: +(a.plays - a.lastPaidPlays > 0 ? (a.plays - a.lastPaidPlays) * ratePerStreamUSD : 0).toFixed(6),
        })));
      } else {
        setArtists(updated as ArtistRow[]);
        setRecipients(updated.map(a => ({
          ...a,
          amountUSD: +(a.plays - a.lastPaidPlays > 0 ? (a.plays - a.lastPaidPlays) * ratePerStreamUSD : 0).toFixed(6),
        })));
        setStreamStats(s => ({ ...s, totalPlays: updated.reduce((sum, x) => sum + x.plays, 0) }));
      }

      timer = window.setTimeout(tick, tickMs) as unknown as number;
    };

    timer = window.setTimeout(tick, 500) as unknown as number;
    return () => { mounted = false; if (timer) window.clearTimeout(timer); };
  }, [tab, autoStreaming, tickMs, ratePerStreamUSD, artists, running]);

  const TABS = [
    { key: "content", icon: <Coins className="w-4 h-4"/>, title: "Content" },
    { key: "gaming", icon: <Gamepad2 className="w-4 h-4"/>, title: "Gaming" },
    { key: "gig", icon: <Users className="w-4 h-4"/>, title: "Gig Work" },
    { key: "iot", icon: <Cpu className="w-4 h-4"/>, title: "IoT" },
    { key: "loyalty", icon: <Gift className="w-4 h-4"/>, title: "Loyalty" },
    { key: "payroll", icon: <Briefcase className="w-4 h-4"/>, title: "Payroll" },
    { key: "streaming", icon: <Music2 className="w-4 h-4"/>, title: "Streaming" },
    { key: "workflow", icon: <Info className="w-4 h-4"/>, title: "How it works" },
  ] as const;

  useEffect(() => {
    try {
      const csv = toCSV([{ name: "A", email: "a@x", address: "0xabc", amountUSD: 1, network: "solana", status: "paid", hash: "0x1" }]);
      console.assert(csv.includes("\n"), "CSV should contain newline");
      const { best, alts } = routeFor(1000);
      console.assert(!!best && alts.length > 0, "routeFor should return best + alternatives");
      const arr = demoRecipients(3);
      console.assert(arr.length === 3 && arr[0].name.startsWith("Recipient"), "demoRecipients basic shape");
      const s = demoArtistsStreaming(0.004);
if (s.length > 0) {
  const first = s[0];
  console.assert(
    Math.abs(((first.amountUSD ?? 0) - first.plays * 0.004)) < 1e-9,
    "streaming amounts = plays × rate"
  );
}

      console.assert(STAGES.length === 9, "There should be 9 workflow stages");
      console.assert(STAGES[1] === "Screen (KYC/AML, sanctions, wallet checks)", "STAGES[1] should be exact text (no hidden chars)");
      console.log("FluxPay self-tests passed");
    } catch (e) {
      console.error("FluxPay self-tests failed", e);
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0E1116] to-[#1A1F29] text-white px-6 py-8 overflow-hidden">
      <BackgroundFX />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2">Blitz CoinPay</motion.h1>
        <p className="text-lg text-white/70 mb-8">Next-gen micropayments. Real-time, borderless, programmable — spanning content, gaming, gig work, IoT, loyalty, payroll, and streaming.</p>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid md:grid-cols-8 gap-2 mb-8 bg-white/10 backdrop-blur p-2 rounded-2xl">
            {TABS.map(t => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 ${tab === t.key ? "bg-white text-black" : ""}`}
              >
                {t.icon} {t.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {["content","gaming","gig","iot","loyalty","payroll","streaming"].map((key) => (
            tab === key && (
              <TabsContent key={key} value={key}>
                <Card className="bg-white/5 border-none rounded-2xl">
                  <CardContent className="p-6 space-y-5">
                    <h2 className="text-2xl font-semibold">
                      {key === "content" && "Micropay-as-you-read"}
                      {key === "gaming" && "In-game Asset Micropayments"}
                      {key === "gig" && "Instant Gig Payouts"}
                      {key === "iot" && "IoT Machine Payments"}
                      {key === "loyalty" && "Real-time Loyalty Rewards"}
                      {key === "payroll" && "Streaming Payroll"}
                      {key === "streaming" && "Streaming → Artist payouts (Auto)"}
                    </h2>
                    <p className="text-white/70">
                      {key === "content" && "Pay $0.05 per article or video. Instant settlement to creators."}
                      {key === "gaming" && "Buy skins, power-ups, and stream rewards instantly to winners."}
                      {key === "gig" && "Pay freelancers after each task, globally, in seconds."}
                      {key === "iot" && "Cars pay tolls per second; meters pay per kWh — fully automated."}
                      {key === "loyalty" && "Reward users with micro-incentives ($0.25) for actions in your app."}
                      {key === "payroll" && "Employees receive wages continuously, per minute worked."}
                      {key === "streaming" && "Artists are paid automatically in near real-time as plays accrue — no clicks needed."}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {key !== "streaming" && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70">Amount (USD)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={amountUSD}
                              onChange={e => setAmountUSD(Math.max(0, Number(e.target.value)))}
                              className="px-3 py-2 rounded-lg bg-black/40 text-white text-sm outline-none"
                            />
                          </div>
                          <Button onClick={() => loadDemo(1000)} className="bg-white/10 hover:bg-white/15">Load Sample (1,000)</Button>
                          <Button onClick={quoteRoute} disabled={!recipients.length} className="bg-white text-black font-semibold">Route & Quote</Button>
                          <Button onClick={runWorkflow} className="bg-emerald-400 text-black font-semibold flex items-center gap-2"><PlayCircle className="w-4 h-4"/> Run Full Workflow</Button>
                        </>
                      )}

                      {key === "streaming" && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70">Auto Mode</span>
                            <input type="checkbox" checked={autoStreaming} onChange={(e)=>setAutoStreaming(e.target.checked)} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70">Rate/stream (USD)</span>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={ratePerStreamUSD}
                              onChange={e => setRatePerStreamUSD(Math.max(0, Number(e.target.value)))}
                              className="px-3 py-2 rounded-lg bg-black/40 text-white text-sm outline-none w-28"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70">Tick (ms)</span>
                            <input
                              type="number"
                              step="250"
                              min="500"
                              value={tickMs}
                              onChange={e => setTickMs(Math.max(250, Number(e.target.value)))}
                              className="px-3 py-2 rounded-lg bg-black/40 text-white text-sm outline-none w-24"
                            />
                          </div>
                          <Button onClick={loadStreamingSample} className="bg-white/10 hover:bg-white/15">Reset Artists</Button>
                          <Button onClick={() => downloadReceipts()} disabled={!artists.length} className="bg-white/10 hover:bg-white/15 flex items-center gap-2"><Download className="w-4 h-4"/> Receipts CSV</Button>
                        </>
                      )}
                    </div>

                    {key === "streaming" && (
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-black/30">
                          <div className="text-sm text-white/60">Total Plays</div>
                          <div className="text-2xl font-semibold">{artists.reduce((s,a)=>s+a.plays,0).toLocaleString()}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-black/30">
                          <div className="text-sm text-white/60">Total Paid (USD)</div>
                          <div className="text-2xl font-semibold">${artists.reduce((s,a)=>s+a.paidTotalUSD,0).toFixed(6)}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-black/30">
                          <div className="text-sm text-white/60">Last Route</div>
                          <div className="text-sm">{streamStats.lastRoute}</div>
                        </div>
                      </div>
                    )}
{key !== "streaming" && routed ? (
  <div className="grid md:grid-cols-4 gap-3">
    {[routed.best, ...routed.alts].map((n: any, i: number) => (
      <div
        key={n?.id ?? i}
        className={`p-4 rounded-xl ${i === 0 ? "bg-emerald-500/15 border border-emerald-400/40" : "bg-black/30"}`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold">{n?.label ?? "—"}</div>
          {i === 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400 text-black">Best</span>
          )}
        </div>
        <div className="text-sm text-white/70">
          Est. total fees: ${Number(n?.fee ?? 0).toFixed(4)}
        </div>
        <div className="text-sm text-white/70">
          ETA: {Number(n?.eta ?? 0).toFixed(2)}s • TPS ~
          {typeof n?.tps === "number" ? n.tps.toLocaleString() : "—"}
        </div>
      </div>
    ))}
  </div>
) : null}

                    <div className="p-4 rounded-2xl bg-white/5">
                      <div className="flex items-center justify-between mb-2 text-sm text-white/70">
                        <span>Workflow Progress</span>
                        <span>{recipients.length ? `${paid.toLocaleString()} / ${recipients.length.toLocaleString()}` : `${progress}%`}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden mb-3">
                        <div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} />
                      </div>
                      <ol className="grid md:grid-cols-3 gap-2 text-xs text-white/80">
                        {STAGES.map((s, i) => (
                          <li key={i} className={`p-2 rounded-lg ${i <= stageIndex ? "bg-emerald-500/15" : "bg-black/30"}`}>{i+1}. {s}</li>
                        ))}
                      </ol>
                    </div>

                    {recipients.length > 0 && (
                      <div className="rounded-2xl bg-white/5 overflow-hidden">
                        <div className="max-h-[300px] overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-black/40">
                              <tr>
                                <th className="text-left px-4 py-3">#</th>
                                <th className="text-left px-4 py-3">Name</th>
                                {key === "streaming" && <th className="text-left px-4 py-3">Plays</th>}
                                {key === "streaming" && <th className="text-left px-4 py-3">Due (USD)</th>}
                                {key === "streaming" && <th className="text-left px-4 py-3">Paid Total (USD)</th>}
                                {key !== "streaming" && <th className="text-left px-4 py-3">Address</th>}
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">Network</th>
                                <th className="text-left px-4 py-3">Last Tx</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recipients.slice(0, 30).map((r: any, i: number) => (
                                <tr key={r.id ?? i} className="border-t border-white/5">
                                  <td className="px-4 py-2 text-white/70">{i + 1}</td>
                                  <td className="px-4 py-2">{r.name}</td>
                                  {key === "streaming" && <td className="px-4 py-2 text-white/70">{r.plays?.toLocaleString?.() ?? "—"}</td>}
                                  {key === "streaming" && <td className="px-4 py-2 text-white/70">{typeof r.amountUSD === "number" ? r.amountUSD.toFixed(6) : "0.000000"}</td>}
                                  {key === "streaming" && <td className="px-4 py-2 text-white/70">{typeof r.paidTotalUSD === "number" ? r.paidTotalUSD.toFixed(6) : "0.000000"}</td>}
                                  {key !== "streaming" && <td className="px-4 py-2 text-white/60 font-mono">{r.address}</td>}
                                  <td className="px-4 py-2">{r.status === "paid" ? <span className="text-emerald-400">Paid ✅</span> : <span className="text-white/60">Pending…</span>}</td>
                                  <td className="px-4 py-2 text-white/60">{r.network || "—"}</td>
                                  <td className="px-4 py-2 text-white/60 font-mono truncate max-w-[160px]">{r.hash || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-3 text-xs text-white/50">Showing 30 of {recipients.length.toLocaleString()} • Use Receipts CSV for full export</div>
                      </div>
                    )}

                    {log.length > 0 && (
                      <div className="p-4 rounded-2xl bg-black/30">
                        <div className="text-sm font-semibold mb-2">System Log</div>
                        <div className="max-h-[180px] overflow-auto text-xs font-mono text-white/80 space-y-1">
                          {log.map((l, idx) => (<div key={idx}>{l}</div>))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          ))}

          {tab === "workflow" && (
            <TabsContent value="workflow">
              <Card className="bg-white/5 border-none rounded-2xl backdrop-blur-md">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-semibold">How Blitz CoinPay Works</h2>
                  <ol className="list-decimal pl-5 space-y-2 text-white/80">
                    {STAGES.map((s, i) => (<li key={i}><strong>Step {i+1}.</strong> {s}</li>))}
                  </ol>
                  <div className="mt-4 p-4 rounded-xl bg-black/30 text-xs text-white/70 font-mono">
                    Client/App → Screen → Router → Treasury → Sender → Chain → Webhooks → Ledger → ERP/BI
                  </div>
                  <div className="pt-2 text-sm text-white/60">
                    Note: This environment runs in <em>Sandbox</em>. Replace the workflow simulator with custody/wallet SDK calls
                    (ethers.js / Solana web3 / Circle / Fireblocks) for live mode, and add KYC/AML, sanctions, per-jurisdiction policy,
                    and immutable audit logging.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-10 text-xs text-white/60">
          <span className="inline-block px-2 py-1 rounded-full bg-white/10 mr-2">Mode: Sandbox</span>
          <span>All actions are simulated for demo purposes.</span>
        </div>
      </div>
    </div>
  );
}
