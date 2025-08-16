import React, { useMemo, useRef, useState, useEffect } from "react";

export default function App() {
  // ───────────────── state ─────────────────
  const [step, setStep] = useState(0); // 0..4
  const [category, setCategory] = useState("salon");

  const servicesByCat = {
    salon: [
      { id: "cut-basic", name: "Signature Cut", duration: 45, price: 3200 },
      { id: "color", name: "Gloss & Root Color", duration: 90, price: 7200 },
    ],
    massage: [
      { id: "massage-60", name: "Swedish (60m)", duration: 60, price: 3800 },
      { id: "massage-90", name: "Deep Tissue (90m)", duration: 90, price: 5600 },
    ],
    yoga: [
      { id: "yoga-1on1", name: "Private Vinyasa (60m)", duration: 60, price: 2600 },
      { id: "yoga-group", name: "Small Group (75m)", duration: 75, price: 2100 },
    ],
  };

  const [serviceId, setServiceId] = useState("cut-basic");
  const service =
    (servicesByCat[category] || []).find((s) => s.id === serviceId) ||
    (servicesByCat[category] || [])[0];

  const experts = [
    { id: "anita", name: "Anita Kapoor", role: "Senior Stylist", cats: ["salon"], rating: 4.9 },
    { id: "rahul", name: "Rahul Verma", role: "Massage Therapist", cats: ["massage"], rating: 4.8 },
    { id: "isha", name: "Isha Mehra", role: "Yoga Coach", cats: ["yoga"], rating: 4.7 },
    { id: "arjun", name: "Arjun N.", role: "Color Specialist", cats: ["salon"], rating: 4.6 },
  ];
  const [expertId, setExpertId] = useState("anita");
  const expert = experts.find((e) => e.id === expertId);

  const [selectedTime, setSelectedTime] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");

  const [payMethod, setPayMethod] = useState("card"); // 'card'|'upi'|'wallet'
  const [payStatus, setPayStatus] = useState("idle"); // 'idle'|'processing'|'success'|'failed'
  const [bookingRef, setBookingRef] = useState("");

  // payment inputs
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [wallet, setWallet] = useState("Paytm");
  const [walletPhone, setWalletPhone] = useState("");

  // load gateway SDKs (no-op if blocked)
  useEffect(() => {
    loadScript("https://checkout.razorpay.com/v1/checkout.js");
    loadScript("https://js.stripe.com/v3/");
  }, []);

  // ───────────── computed ─────────────
  const times = useMemo(
    () => [
      "09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
      "12:00 PM","12:30 PM","01:00 PM","01:30 PM","02:00 PM","02:30 PM",
      "03:00 PM","03:30 PM","04:00 PM","04:30 PM","05:00 PM","05:30 PM",
      "06:00 PM","06:30 PM","07:00 PM",
    ],
    []
  );

  const INR = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const dayLabel = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };
  const daySubtitle = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : dayLabel(dayOffset);

  // ───────────── styles ─────────────
  const styles = `
    :root{ --ink:#0e1116; --muted:#5b6678; --brand:#0f172a; --gold:#b5852b; --rose:#a43a3f; --border:#e6e6ea; --ring:#d1d9ff; }
    *{ box-sizing:border-box } html,body,#root{ height:100% }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial; color:var(--ink);
      background: radial-gradient(70% 55% at 70% -10%, #fff4df, transparent 60%), radial-gradient(80% 60% at 0% 0%, #f7f7ff, transparent 50%), linear-gradient(180deg,#ffffff,#f6f7fb 60%, #f2f3f7);
    }
    .container{ max-width:1200px; margin:0 auto; padding:28px }
    .header{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:8px 0 18px 0; flex-wrap:wrap }
    .brand{ display:flex; align-items:center; gap:12px }
    .logo{ height:40px; width:40px; border-radius:14px; background:#0f0f10; color:#fff; display:grid; place-content:center; font-weight:800 }
    .title{ font-weight:800; letter-spacing:-0.3px; font-size:20px }
    .tagline{ color:var(--muted); font-size:12px; margin-top:2px }

    .progress{ display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:14px }
    .pill{ padding:9px 12px; border-radius:14px; font-size:11px; font-weight:700; text-align:center; border:1px solid var(--border); background:#fff; color:#6b7280; cursor:pointer }
    .pill.active{ background:#0f172a; color:#fff; border-color:#0f172a }
    .pill.lock{ opacity:.55; pointer-events:none; }

    .hero-wrap{ display:grid; grid-template-columns:1.15fr .85fr; gap:28px; align-items:start }
    @media (max-width:980px){ .hero-wrap{ grid-template-columns:1fr } }
    .eyebrow{ display:inline-flex; align-items:center; gap:8px; background:#0f172a; color:#fff; padding:7px 12px; border-radius:999px; font-size:12px }
    h1{ margin:12px 0 6px 0; line-height:1.08; font-size: clamp(28px,4.2vw,54px); letter-spacing:-0.6px }
    .gradient{ background:linear-gradient(90deg, var(--gold), var(--rose)); -webkit-background-clip:text; background-clip:text; color:transparent }
    .lede{ color:var(--muted); max-width:620px }

    .card{ border-radius:26px; background:rgba(255,255,255,.9); border:1px solid var(--border); box-shadow: 0 10px 30px rgba(17,24,39,.10), 0 2px 10px rgba(17,24,39,.06) }
    .card-h{ padding:18px 20px 8px 20px } .card-h .h{ font-weight:800; letter-spacing:-.2px } .card-h .s{ font-size:12px; color:var(--muted) }
    .card-c{ padding:18px 20px 20px 20px }

    .tabs{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px }
    .tab{ padding:12px; border-radius:14px; border:1px solid var(--border); background:#fff; font-weight:800; text-align:center; cursor:pointer }
    .tab.active{ background:#0f172a; color:#fff; border-color:#0f172a }

    .list{ display:grid; gap:12px }
    .tile{ border:1px solid var(--border); border-radius:16px; padding:14px; background:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px }
    .tile:hover{ box-shadow: 0 8px 22px rgba(0,0,0,.07) }
    .tile.sel{ border-color:#0f172a; background:#fafafa }

    .time-toolbar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-bottom:10px }
    .day-tabs{ display:flex; gap:8px; flex-wrap:wrap }
    .tag{ padding:10px 12px; border-radius:14px; border:1px solid var(--border); background:#fff; font-weight:700; cursor:pointer; font-size:12px }
    .tag.active{ background:#0f172a; color:#fff; border-color:#0f172a }

    .time-grid{ display:grid; gap:12px; grid-template-columns:repeat(4, minmax(0,1fr)); }
    @media (max-width:1100px){ .time-grid{ grid-template-columns:repeat(3, minmax(0,1fr)); } }
    @media (max-width:740px){ .time-grid{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
    @media (max-width:480px){ .time-grid{ grid-template-columns:repeat(1, minmax(0,1fr)); } }
    .slot{ position:relative; padding:16px 14px; border-radius:16px; background:#fff; border:1px solid var(--border); font-weight:700; letter-spacing:.2px; cursor:pointer; text-align:center; transition: all .2s ease }
    .slot[disabled]{ opacity:.4; cursor:not-allowed }
    .slot:hover:not([disabled]){ box-shadow: 0 10px 22px rgba(0,0,0,.08); transform: translateY(-1px) }
    .slot.selected{ background:linear-gradient(135deg, #d4af37, #f5deb3); color:#fff; border-color:transparent; box-shadow: 0 12px 26px rgba(0,0,0,.15) }
    .slot .minor{ display:block; font-weight:600; font-size:11px; color:#6b7280; margin-top:6px }
    .slot.selected .minor{ color:rgba(255,255,255,.96) }

    .section{ display:grid; grid-template-columns:1.1fr .9fr; gap:28px; align-items:start; margin-top:26px }
    @media (max-width:980px){ .section{ grid-template-columns:1fr } }
    .summary{ position:sticky; top:24px }
    .line{ display:flex; align-items:center; gap:10px; color:#4b5563; font-size:14px; flex-wrap:wrap }

    .cardpay{ display:grid; grid-template-columns:1fr 1fr; gap:14px }
    @media (max-width:900px){ .cardpay{ grid-template-columns:1fr } }
    .card-visual{ border-radius:18px; padding:18px; color:#fff; background:linear-gradient(135deg,#0f172a,#1f2937); box-shadow:0 10px 24px rgba(0,0,0,.2) }
    .card-visual .brandline{ display:flex; align-items:center; justify-content:space-between; font-weight:800; letter-spacing:.3px; opacity:.95 }
    .chip{ width:40px; height:28px; background:linear-gradient(180deg,#d1b892,#b08a3c); border-radius:6px; box-shadow:inset 0 1px 2px rgba(0,0,0,.25) }
    .cc-num{ font-size:20px; letter-spacing:3px; margin:18px 0 }
    .cc-row{ display:flex; justify-content:space-between; font-size:12px; opacity:.9 }

    .btn{ appearance:none; border:1px solid #0f1117; background:linear-gradient(180deg,#111827,#0f172a); color:#fff; border-radius:999px; padding:10px 14px; font-weight:800; cursor:pointer }
    .btn[disabled]{ opacity:.5; cursor:not-allowed }
    .btn.ghost{ background:#fff; color:#0f172a; border-color:var(--border) }
    .actions{ display:flex; justify-content:space-between; gap:12px; margin-top:10px; flex-wrap:wrap }

    .field{ display:grid; gap:6px }
    .input{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid var(--border); border-radius:14px; padding:12px }
    .input:focus-within{ outline:2px solid var(--ring); outline-offset:2px; border-color:#cbd5e1 }
    .input input, .input select, .input textarea{ border:none; outline:none; font:inherit; width:100%; background:transparent }
    .input .addon{ font-weight:800; color:#0f172a; padding-right:8px; border-right:1px solid #eef2f7 }
    .help{ font-size:11px; color:#6b7280 }
  `;

  // ─────────── helpers ───────────
  const scrollerRef = useRef(null);
  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.firstElementChild;
    const cardWidth = first ? first.getBoundingClientRect().width : 320;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: "smooth" });
  };

  const isEmail = (v) => /.+@.+\..+/.test((v || "").trim());
  const isPhone = (v) => /^\+?\d[\d\s-]{6,}$/.test((v || "").trim());
  const isUPI = (v) => /^[\w.\-]{3,}@[a-z]{2,}$/i.test((v || "").trim());
  const isWalletPhone = (v) => /^\d{10}$/.test(String(v || "").replace(/\D/g, ""));

  const luhn = (num) => { let s=0,a=false; for(let i=num.length-1;i>=0;i--){ let n=parseInt(num[i],10); if(a){ n*=2; if(n>9)n-=9 } s+=n; a=!a } return s%10===0; };
  const isCardValid = () => {
    const num = cardNumber.replace(/\s/g, "");
    if (cardName.trim().length < 2) return false;
    if (num.length < 13 || !luhn(num)) return false;
    const exp = formatExp(cardExp);
    if (!/^\d{2}\/\d{2}$/.test(exp)) return false;
    const [mmS, yyS] = exp.split("/");
    const mm = Number(mmS), yy = Number(yyS);
    if (mm < 1 || mm > 12) return false;
    const now = new Date(); const end = new Date(2000 + yy, mm);
    if (end <= now) return false;
    if (!/^\d{3,4}$/.test(cardCvv)) return false;
    return true;
  };

  const canContinue = () => {
    if (step === 0) return !!serviceId;
    if (step === 1) return !!expertId;
    if (step === 2) return !!selectedTime;
    if (step === 3) return customer.name.trim().length > 1 && isEmail(customer.email) && isPhone(customer.phone);
    if (step === 4) {
      if (payStatus === "processing") return false;
      if (payMethod === "card") return isCardValid();
      if (payMethod === "upi") return isUPI(upiId);
      if (payMethod === "wallet") return isWalletPhone(walletPhone);
      return true;
    }
    return true;
  };

  const goto = (n) => setStep((prev) => (n <= prev ? n : prev)); // allow back/rewind only

  const parseTime = (label) => {
    const [t, ap] = label.split(" "); const [hh, mm] = t.split(":").map(Number);
    const h = (hh % 12) + (ap === "PM" ? 12 : 0);
    const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, mm, 0, 0); return d;
  };
  const isPastSlot = (label) => (dayOffset === 0 ? parseTime(label).getTime() <= Date.now() : false);

  const openGateway = async () => {
    if (!canContinue()) return;
    setPayStatus("processing");
    const amountPaise = (service?.price || 2000) * 100;
    const w = window;

    if (w && w.Razorpay) {
      try {
        const options = {
          key: "rzp_test_xxxxxxxx",
          amount: amountPaise,
          currency: "INR",
          name: "Trenux",
          description: service?.name,
          handler: (resp) => {
            finalizePayment(
              "RZP-" + (resp && resp.razorpay_payment_id
                ? resp.razorpay_payment_id
                : Math.random().toString(36).slice(2, 10).toUpperCase())
            );
          },
          prefill: { name: customer.name, email: customer.email, contact: customer.phone },
          notes: { expert: expert?.name, service: service?.name },
          theme: { color: "#111827" },
        };
        const rzp = new w.Razorpay(options);
        rzp.on("payment.failed", () => setPayStatus("failed"));
        rzp.open();
        return;
      } catch {}
    }

    if (w && w.Stripe) {
      setTimeout(() => finalizePayment("STP-" + Math.random().toString(36).slice(2, 10).toUpperCase()), 900);
      return;
    }

    setTimeout(() => finalizePayment("TNX-" + Math.random().toString(36).slice(2, 8).toUpperCase()), 700);
  };

  const finalizePayment = (ref) => {
    setPayStatus("success");
    setBookingRef(ref);
    const rec = {
      ref, category, serviceId, expertId, day: daySubtitle, time: selectedTime,
      customer, notes, amount: service?.price, createdAt: new Date().toISOString(),
    };
    const arr = JSON.parse(localStorage.getItem("trenux_bookings") || "[]");
    arr.push(rec);
    localStorage.setItem("trenux_bookings", JSON.stringify(arr));
  };

  function maskCard(v){ return v.replace(/\D/g,"").slice(0,19).replace(/(.{4})/g,"$1 ").trim(); }
  function formatCardNumber(v){ return v.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim(); }
  function maskExp(v){ const d=v.replace(/\D/g,"").slice(0,4); return d.length<=2? d : d.slice(0,2)+"/"+d.slice(2); }
  function formatExp(v){ return maskExp(v); }
  function maskCvv(v){ return v.replace(/\D/g,"").slice(0,4); }

  function loadScript(src){
    if (typeof document === "undefined") return;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s=document.createElement("script"); s.src=src; s.async=true; document.body.appendChild(s);
  }

  // ─────────── UI parts ───────────
  const Stepper = () => (
    <div className="progress" role="tablist" aria-label="Booking steps">
      {["Service","Expert","Time","Details","Payment"].map((label, i)=>{
        const active = i<=step; const locked = i>step;
        return (
          <button
            key={label}
            type="button"
            onMouseDown={(e)=> e.preventDefault()}
            className={`pill ${active?'active':''} ${locked?'lock':''}`}
            onClick={()=>{ if (i <= step) goto(i); }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const PageService = () => (
    <div className="card" aria-labelledby="svc-h">
      <div className="card-h"><div id="svc-h" className="h">Choose a service</div><div className="s">Select category & treatment</div></div>
      <div className="card-c">
        <div className="tabs" role="tablist" aria-label="Categories">
          {["salon","massage","yoga"].map((c)=>(
            <button
              key={c}
              type="button"
              className={`tab ${category===c?'active':''}`}
              role="tab" aria-selected={category===c}
              onClick={()=>{ setCategory(c); setServiceId(servicesByCat[c][0].id); }}
            >
              {c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          ))}
        </div>
        <div className="list" role="list">
          {(servicesByCat[category]||[]).map((s)=>(
            <button key={s.id} type="button" className={`tile ${serviceId===s.id?'sel':''}`} onClick={()=>setServiceId(s.id)}>
              <div><div style={{fontWeight:800,letterSpacing:"-.2px"}}>{s.name}</div><div className="tagline">{s.duration} min</div></div>
              <div style={{fontWeight:800}}>{INR(s.price)}</div>
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" disabled>Back</button>
          <button type="button" className="btn" onClick={()=>setStep(1)} disabled={!canContinue()}>Continue</button>
        </div>
      </div>
    </div>
  );

  const PageExpert = () => (
    <div className="card" aria-labelledby="exp-h">
      <div className="card-h"><div id="exp-h" className="h">Choose your expert</div><div className="s">Handpicked & verified</div></div>
      <div className="card-c">
        <div className="list" role="list">
          {experts.filter(e=>e.cats.includes(category)).map((e)=>(
            <button key={e.id} type="button" className={`tile ${expertId===e.id?'sel':''}`} onClick={()=>setExpertId(e.id)}>
              <div><div style={{fontWeight:800}}>{e.name}</div><div className="tagline">{e.role} • ★ {e.rating.toFixed(1)}</div></div>
              <div><span className="btn ghost">Select</span></div>
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={()=>setStep(0)}>Back</button>
          <button type="button" className="btn" onClick={()=>setStep(2)} disabled={!canContinue()}>Continue</button>
        </div>
      </div>
    </div>
  );

  const PageTime = () => (
    <div className="card" aria-labelledby="time-h">
      <div className="card-h"><div id="time-h" className="h">Select a time</div><div className="s">{service?.duration} min • {expert?.name}</div></div>
      <div className="card-c">
        <div className="time-toolbar">
          <div className="day-tabs" role="tablist" aria-label="Day">
            {[0,1,2].map((d)=>(
              <button key={d} type="button" className={`tag ${dayOffset===d?'active':''}`} role="tab" aria-selected={dayOffset===d}
                onClick={()=>{ setDayOffset(d); setSelectedTime(null); }}>
                {d===0?"Today":d===1?"Tomorrow":dayLabel(d)}
              </button>
            ))}
          </div>
          <div className="tagline" aria-live="polite">{daySubtitle}</div>
        </div>
        <div className="time-grid">
          {times.map((t)=>{
            const disabled=isPastSlot(t); const selected=selectedTime===t;
            return (
              <button key={t} type="button" className={`slot ${selected?'selected':''}`} disabled={disabled}
                onClick={()=>!disabled&&setSelectedTime(t)}>
                {t}<span className="minor">{service?.duration} min • {service?.name}</span>
              </button>
            );
          })}
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={()=>setStep(1)}>Back</button>
          <button type="button" className="btn" onClick={()=>setStep(3)} disabled={!canContinue()}>Continue</button>
        </div>
      </div>
    </div>
  );

  // 🔒 anti-jump wrapper: capture input events and stop them from bubbling to any parent listeners
  const AntiJump = ({ children }) => (
    <div
      onInputCapture={(e)=>e.stopPropagation()}
      onKeyDownCapture={(e)=>e.stopPropagation()}
      onKeyUpCapture={(e)=>e.stopPropagation()}
      onMouseDownCapture={(e)=>e.stopPropagation()}
    >
      {children}
    </div>
  );

  const PageDetails = () => (
    <div className="card" aria-labelledby="det-h">
      <div className="card-h"><div id="det-h" className="h">Your details</div><div className="s">We’ll send confirmations & reminders</div></div>

      <AntiJump>
        <form className="card-c" onSubmit={(e)=> e.preventDefault()}>
          <div className="grid2">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <div className="input">
                <input id="name" value={customer.name}
                  onChange={(e)=>setCustomer({...customer, name:e.target.value})}
                  placeholder="e.g., Arjun Mehta" />
              </div>
              <div className="help">This appears on your receipt and calendar invite.</div>
            </div>

            <div className="field">
              <label htmlFor="phone">Phone</label>
              <div className="input">
                <span className="addon">+91</span>
                <input id="phone" value={customer.phone}
                  onChange={(e)=>setCustomer({...customer, phone:e.target.value})}
                  placeholder="9xx xx xxxxx" inputMode="tel" />
              </div>
              <div className="help">WhatsApp confirmations enabled.</div>
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input">
                <input id="email" value={customer.email}
                  onChange={(e)=>setCustomer({...customer, email:e.target.value})}
                  placeholder="you@email.com" inputMode="email" />
              </div>
              <div className="help">We’ll send booking details & reminders.</div>
            </div>

            <div className="field span2">
              <label htmlFor="notes">Notes (optional)</label>
              <div className="input">
                <textarea id="notes" value={notes}
                  onChange={(e)=>setNotes(e.target.value)}
                  placeholder="Allergies, preferences, requests" />
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="btn ghost" onClick={()=>setStep(2)}>Back</button>
            <button type="button" className="btn" onClick={()=>setStep(4)} disabled={!canContinue()}>
              Continue
            </button>
          </div>
        </form>
      </AntiJump>
    </div>
  );

  const PagePayment = () => (
    <div className="card" aria-labelledby="pay-h">
      <div className="card-h"><div id="pay-h" className="h">Payment</div><div className="s">Secure checkout</div></div>

      <AntiJump>
        <form className="card-c" onSubmit={(e)=> e.preventDefault()}>
          {payStatus==='success' ? (
            <div className="success" aria-live="polite">Paid • Ref {bookingRef}</div>
          ) : (
            <>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="method">Method</label>
                  <div className="input">
                    <select id="method" value={payMethod} onChange={(e)=>setPayMethod(e.target.value)}>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Amount</label>
                  <div className="input"><input value={`${INR(service?.price||0)}`} readOnly aria-readonly /></div>
                </div>
              </div>

              {payMethod==="card" && (
                <div className="cardpay" style={{marginTop:12}}>
                  <div className="card-visual" aria-hidden>
                    <div className="brandline"><span>TRENÛX</span><span>VISA</span></div>
                    <div className="chip"></div>
                    <div className="cc-num">{formatCardNumber(cardNumber) || "#### #### #### ####"}</div>
                    <div className="cc-row"><span>{cardName || "FULL NAME"}</span><span>{formatExp(cardExp) || "MM/YY"}</span></div>
                  </div>
                  <div>
                    <div className="field">
                      <label htmlFor="cardName">Name on card</label>
                      <div className="input"><input id="cardName" value={cardName} onChange={(e)=>setCardName(e.target.value)} placeholder="As printed on card" /></div>
                    </div>
                    <div className="grid3" style={{marginTop:12}}>
                      <div className="field span2">
                        <label htmlFor="cardNumber">Card number</label>
                        <div className="input"><input id="cardNumber" value={cardNumber} onChange={(e)=>setCardNumber(maskCard(e.target.value))} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" /></div>
                      </div>
                      <div className="field">
                        <label htmlFor="cardExp">Expiry</label>
                        <div className="input"><input id="cardExp" value={cardExp} onChange={(e)=>setCardExp(maskExp(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" /></div>
                      </div>
                      <div className="field">
                        <label htmlFor="cardCvv">CVV</label>
                        <div className="input"><input id="cardCvv" value={cardCvv} onChange={(e)=>setCardCvv(maskCvv(e.target.value))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" /></div>
                      </div>
                    </div>
                    <div className="help" style={{marginTop:6}}>Demo UI. If Razorpay/Stripe are loaded, their secure window opens instead.</div>
                  </div>
                </div>
              )}

              {payMethod==="upi" && (
                <div className="grid2" style={{marginTop:12}}>
                  <div className="field span2">
                    <label htmlFor="upi">UPI ID</label>
                    <div className="input"><input id="upi" value={upiId} onChange={(e)=>setUpiId(e.target.value)} placeholder="name@upi" /></div>
                  </div>
                </div>
              )}

              {payMethod==="wallet" && (
                <div className="grid2" style={{marginTop:12}}>
                  <div className="field">
                    <label htmlFor="wallet">Wallet</label>
                    <div className="input">
                      <select id="wallet" value={wallet} onChange={(e)=>setWallet(e.target.value)}>
                        <option>Paytm</option><option>PhonePe</option><option>Amazon Pay</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="wphone">Linked phone</label>
                    <div className="input"><input id="wphone" value={walletPhone} onChange={(e)=>setWalletPhone(e.target.value)} placeholder="Registered number" inputMode="tel" /></div>
                  </div>
                </div>
              )}

              <div className="actions" style={{marginTop:12}}>
                <button type="button" className="btn ghost" onClick={()=>setStep(3)}>Back</button>
                <button type="button" className="btn" onClick={openGateway} disabled={!canContinue()}>
                  {payStatus==="processing" ? "Processing…" : "Pay now"}
                </button>
              </div>
            </>
          )}
        </form>
      </AntiJump>
    </div>
  );

  const Summary = () => (
    <aside className="card summary">
      <div className="card-h"><div className="h">Your selection</div><div className="s">Concise recap</div></div>
      <div className="card-c" style={{display:"grid", gap:10}}>
        <div className="line">📍 Location: <strong>Trenux Studio • BKC</strong></div>
        <div className="line">💇 Service: <strong>{service?.name}</strong></div>
        <div className="line">🧑‍💼 Expert: <strong>{expert?.name}</strong></div>
        <div className="line">🗓️ Date: <strong>{daySubtitle}</strong></div>
        <div className="line">⏰ Time: <strong>{selectedTime ?? "—"}</strong></div>
        <div className="line">⏱️ Duration: <strong>{service?.duration} min</strong></div>
        <div className="line">💳 Total: <strong>{INR(service?.price || 0)}</strong></div>
        {payStatus==='success' ? (
          <>
            <button type="button" className="btn" onClick={()=>downloadICS()}>Add to calendar (.ics)</button>
            <button type="button" className="btn ghost" onClick={()=>printReceipt()}>Print receipt</button>
          </>
        ) : (
          <button type="button" className="btn" onClick={()=>setStep(Math.min(step+1,4))} disabled={!canContinue()}>
            Continue
          </button>
        )}
      </div>
    </aside>
  );

  const downloadICS = () => {
    if (!selectedTime) return;
    const start = parseTime(selectedTime);
    const end = new Date(start.getTime() + (service?.duration || 45) * 60000);
    const fmt = (d) => {
      const p = (n) => String(n).padStart(2,"0");
      return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+"T"+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+"Z";
    };
    const uid = (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) || "uid-" + Math.random().toString(36).slice(2);
    const CRLF = "\r\n";
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Trenux//EN","BEGIN:VEVENT",
      `UID:${uid}`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
      `SUMMARY:${service?.name} — Trenux`,`DESCRIPTION:Expert: ${expert?.name}\\nNotes: ${notes}`,"LOCATION:Trenux Studio • BKC",
      "END:VEVENT","END:VCALENDAR",
    ].join(CRLF)+CRLF;
    const blob = new Blob([ics], {type:"text/calendar"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="trenux-booking.ics"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };

  const printReceipt = () => {
    const win = window.open("", "print", "noopener,noreferrer");
    if(!win) return;
    win.document.write(`<pre style="font-family:ui-monospace,Menlo,Consolas;white-space:pre-wrap;line-height:1.4">Trenux — Booking Receipt

Ref     : ${bookingRef}
Service : ${service?.name}
Expert  : ${expert?.name}
When    : ${daySubtitle} ${selectedTime || ""}
Duration: ${service?.duration} min
Amount  : ${INR(service?.price || 0)}
Guest   : ${customer.name} • ${customer.email} • ${customer.phone}
Notes   : ${notes || "-"}

Thank you for choosing Trenux.</pre>`);
    win.print(); win.close();
  };

  // ─────────── layout ───────────
  return (
    <div className="container">
      <style>{styles}</style>

      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden>T</div>
          <div>
            <div className="title">Trenux</div>
            <div className="tagline">Premium appointments • Integrated payments</div>
          </div>
        </div>
        <div className="tagline">Designed for salons, spas &amp; yoga studios</div>
      </header>

      <section className="hero-wrap">
        <div>
          <span className="eyebrow">Secure calendar + payments</span>
          <h1>Book wellbeing the <span className="gradient">premium</span> way</h1>
          <p className="lede">Curated services, trusted experts, and a flawlessly smooth checkout.</p>
        </div>

        <div className="card">
          <div className="card-h"><div className="h">Reserve your session</div><div className="s">Step {step+1} of 5</div></div>
          <div className="card-c">
            <Stepper />
            {step===0 && <PageService/>}
            {step===1 && <PageExpert/>}
            {step===2 && <PageTime/>}
            {step===3 && <PageDetails/>}
            {step===4 && <PagePayment/>}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="card-h"><div className="h">Guest Stories</div><div className="s">Real experiences from discerning guests</div></div>
          <div className="card-c">
            <div className="stories-head">
              <div className="s">Swipe to explore</div>
              <div style={{display:"flex", gap:8}}>
                <button type="button" className="btn ghost" onClick={()=>scrollByCards(-1)}>‹</button>
                <button type="button" className="btn" onClick={()=>scrollByCards(1)}>›</button>
              </div>
            </div>
            <div className="stories-row" ref={scrollerRef} style={{display:"grid", gridAutoFlow:"column", gridAutoColumns:"minmax(280px, 1fr)", gap:16, overflowX:"auto", paddingBottom:8, scrollSnapType:"x mandatory"}}>
              {["Sophia","James","Priya","Arman"].map((name, i)=>(
                <article className="story" key={i} style={{scrollSnapAlign:"start", borderRadius:20, background:"#fff", border:"1px solid var(--border)", overflow:"hidden", boxShadow:"0 8px 22px rgba(0,0,0,.07)", display:"flex", flexDirection:"column", minWidth:280}}>
                  <div className="story-hero" style={{height:160, position:"relative", display:"grid", placeItems:"center", background:"linear-gradient(135deg,#cbd5e1,#94a3b8)"}}>
                    <div className="letter" style={{fontSize:64, fontWeight:800, color:"#fff"}}>{name[0]}</div>
                    <div className="hero-badge" style={{position:"absolute", bottom:10, left:10, color:"#fff", background:"rgba(0,0,0,.45)", padding:"6px 10px", borderRadius:999, fontSize:12, fontWeight:700}}>{name}</div>
                  </div>
                  <div className="story-body" style={{padding:"14px 14px 16px 14px", color:"var(--muted)", fontSize:14}}>
                    <div className="story-name" style={{fontWeight:800, color:"var(--ink)", marginBottom:6, letterSpacing:"-.2px"}}>{name}</div>
                    <p style={{margin:0}}>“Lovely experience.”</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <Summary/>
      </section>
    </div>
  );
}
