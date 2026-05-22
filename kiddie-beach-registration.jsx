import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// KIDDIE BEACH — Registration System & Back Office
// ═══════════════════════════════════════════════════════

const ADMIN_PASSWORD = "KiddieBeach2026";

// ── Helpers ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const today = () => new Date().toISOString().split("T")[0];

const GBPOA_RATES = {
  homeowner: 25,
  tenant: 15,
  senior_single: 10,
  senior_couple: 20,
};

const KB_RATES = {
  family: 450,
  single_parent: 350,
  individual: 200,
  senior: 100,
  super_senior: 60,
};

const KB_PLAN_LABELS = {
  family: "Family Plan ($450)",
  single_parent: "Single Parent Plan ($350)",
  individual: "Individual Plan ($200)",
  senior: "Senior Plan – 62 to 75 ($100)",
  super_senior: "Super Senior Plan – 76+ ($60)",
};

const GBPOA_LABELS = {
  homeowner: "Homeowner ($25)",
  tenant: "Tenant ($15 per adult)",
  senior_single: "Senior Citizen ($10)",
  senior_couple: "Senior Couple ($20)",
};

// ── Storage layer ──
async function loadAll() {
  try {
    const res = await window.storage.get("kb-members-v2");
    return res ? JSON.parse(res.value) : [];
  } catch { return []; }
}
async function saveAll(members) {
  await window.storage.set("kb-members-v2", JSON.stringify(members));
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("landing"); // landing | register | admin-login | admin
  const [adminAuth, setAdminAuth] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {view === "landing" && <Landing onRegister={() => setView("register")} onAdmin={() => setView(adminAuth ? "admin" : "admin-login")} />}
      {view === "register" && <RegistrationFlow onBack={() => setView("landing")} />}
      {view === "admin-login" && <AdminLogin onSuccess={() => { setAdminAuth(true); setView("admin"); }} onBack={() => setView("landing")} />}
      {view === "admin" && <AdminPanel onLogout={() => { setAdminAuth(false); setView("landing"); }} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LANDING — entry point with two doors
// ═══════════════════════════════════════════════════════
function Landing({ onRegister, onAdmin }) {
  const [keys, setKeys] = useState("");

  useEffect(() => {
    const handler = (e) => {
      setKeys(prev => {
        const updated = (prev + e.key.toLowerCase()).slice(-5);
        if (updated.endsWith("admin")) {
          setTimeout(() => onAdmin(), 0);
        }
        return updated;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAdmin]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", background: "linear-gradient(175deg, #1a5276 0%, #2980b9 35%, #5dade2 55%, #aed6f1 70%, #f5e6c8 85%)" }}>
      <div style={{ textAlign: "center", maxWidth: 600 }}>
        <p style={{ fontFamily: "'Georgia', serif", fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", marginBottom: 4, letterSpacing: 2 }}>GERRITSEN BEACH, BROOKLYN NY 11229</p>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(2.5rem, 7vw, 4.5rem)", color: "#fff", fontWeight: 900, margin: "0.25rem 0", lineHeight: 1.05, textShadow: "0 4px 30px rgba(0,0,0,0.15)" }}>
          Kiddie <span style={{ fontStyle: "italic", color: "#f5e6c8" }}>Beach</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.1rem", margin: "1rem auto 2.5rem", maxWidth: 440, lineHeight: 1.6 }}>
          Where Gerritsen Beach kids spend their summer. Register for the 2026 season below.
        </p>
        <p style={{ color: "#f5e6c8", fontFamily: "'Georgia', serif", fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>🏖️ Opening Day — Saturday, June 20th</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
          <button onClick={onRegister} style={{ ...btnStyle, background: "#e67e22", boxShadow: "0 8px 30px rgba(230,126,34,0.4)" }}>
            Register for Membership →
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// REGISTRATION FLOW — Step 1 GBPOA → Step 2 Kiddie Beach
// ═══════════════════════════════════════════════════════
function RegistrationFlow({ onBack }) {
  const [step, setStep] = useState(1); // 1 = GBPOA, 2 = KB, 3 = confirmation
  const [gbpoaData, setGbpoaData] = useState(null);
  const [submittedMember, setSubmittedMember] = useState(null);

  const handleGbpoaSubmit = (data) => {
    setGbpoaData(data);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleKbSubmit = async (kbData) => {
    const member = {
      id: uid(),
      registeredAt: new Date().toISOString(),
      // GBPOA
      firstName: gbpoaData.firstName,
      lastName: gbpoaData.lastName,
      address: gbpoaData.address,
      email: gbpoaData.email,
      phone: gbpoaData.phone,
      altPhone: gbpoaData.altPhone,
      gbpoaType: gbpoaData.membershipType,
      gbpoaFee: GBPOA_RATES[gbpoaData.membershipType],
      gbpoaTenantCount: gbpoaData.tenantCount || 1,
      gbpoaPaid: false,
      gbpoaContribution: parseFloat(gbpoaData.contribution) || 0,
      // KB
      kbPlan: kbData.planType,
      kbFee: KB_RATES[kbData.planType],
      kbPaid: false,
      children: kbData.children.filter(c => c.name.trim()),
      emergencyContact: kbData.emergencyContact,
      emergencyPhone: kbData.emergencyPhone,
    };
    // Compute total GBPOA fee for tenants
    if (member.gbpoaType === "tenant") {
      member.gbpoaFee = 15 * (member.gbpoaTenantCount || 1);
    }
    const all = await loadAll();
    all.push(member);
    await saveAll(all);
    setSubmittedMember(member);
    setStep(3);
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0e8" }}>
      {/* Header bar */}
      <div style={{ background: "#1a5276", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#f5e6c8", cursor: "pointer", fontSize: "0.95rem", fontFamily: "inherit" }}>← Back to Home</button>
        <span style={{ color: "#f5e6c8", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: "1.1rem" }}>Kiddie Beach Registration</span>
        <div style={{ width: 100 }} />
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", padding: "2rem 1rem 0", alignItems: "center" }}>
        <StepBadge num={1} label="GBPOA Membership" active={step === 1} done={step > 1} />
        <div style={{ width: 40, height: 2, background: step > 1 ? "#27ae60" : "#ccc", borderRadius: 2 }} />
        <StepBadge num={2} label="Beach Sign-Up" active={step === 2} done={step > 2} />
        <div style={{ width: 40, height: 2, background: step > 2 ? "#27ae60" : "#ccc", borderRadius: 2 }} />
        <StepBadge num={3} label="Confirmed" active={step === 3} done={false} />
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        {step === 1 && <GbpoaForm onSubmit={handleGbpoaSubmit} />}
        {step === 2 && <KbForm gbpoaData={gbpoaData} onSubmit={handleKbSubmit} onBack={() => setStep(1)} />}
        {step === 3 && <Confirmation member={submittedMember} onHome={onBack} />}
      </div>
    </div>
  );
}

function StepBadge({ num, label, active, done }) {
  const bg = done ? "#27ae60" : active ? "#e67e22" : "#ccc";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, transition: "all 0.3s" }}>
        {done ? "✓" : num}
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: active ? "#1a5276" : "#888", letterSpacing: 0.3, display: "inline-block", maxWidth: 90 }}>{label}</span>
    </div>
  );
}

// ── GBPOA Form ──
function GbpoaForm({ onSubmit }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", address: "", email: "", phone: "", altPhone: "", membershipType: "homeowner", tenantCount: 1, contribution: "" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSubmit(form); };

  const fee = form.membershipType === "tenant" ? 15 * (form.tenantCount || 1) : GBPOA_RATES[form.membershipType];

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e67e22", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Georgia', serif" }}>1</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1a5276", fontFamily: "'Georgia', serif" }}>GBPOA Membership</h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#888" }}>Gerritsen Beach Property Owners Association — May 2026 – April 2027</p>
          </div>
        </div>

        <div style={fieldGrid}>
          <Field label="First Name(s)" value={form.firstName} onChange={v => set("firstName", v)} error={errors.firstName} />
          <Field label="Last Name" value={form.lastName} onChange={v => set("lastName", v)} error={errors.lastName} />
        </div>
        <Field label="Address" value={form.address} onChange={v => set("address", v)} error={errors.address} full />
        <Field label="Email Address" type="email" value={form.email} onChange={v => set("email", v)} error={errors.email} full />
        <div style={fieldGrid}>
          <Field label="Phone Number" type="tel" value={form.phone} onChange={v => set("phone", v)} error={errors.phone} />
          <Field label="Alternate Phone" type="tel" value={form.altPhone} onChange={v => set("altPhone", v)} />
        </div>

        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <label style={labelStyle}>Membership Type</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {Object.entries(GBPOA_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: form.membershipType === key ? "#eaf4fd" : "#f8f8f8", border: form.membershipType === key ? "2px solid #2980b9" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
                <input type="radio" name="gbpoaType" checked={form.membershipType === key} onChange={() => set("membershipType", key)} style={{ accentColor: "#2980b9" }} />
                <span style={{ fontSize: "0.95rem", fontWeight: form.membershipType === key ? 600 : 400, color: "#2c3e50" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.membershipType === "tenant" && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Number of Adult Tenants</label>
            <input type="number" min={1} max={10} value={form.tenantCount} onChange={e => set("tenantCount", parseInt(e.target.value) || 1)} style={inputStyle} />
          </div>
        )}

        <Field label="Additional Contribution (optional)" type="number" value={form.contribution} onChange={v => set("contribution", v)} placeholder="Thank you for any extra support" full />

        {/* Fee summary */}
        <div style={{ marginTop: 24, padding: "1.2rem", background: "#1a5276", borderRadius: 12, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", opacity: 0.7, letterSpacing: 0.5 }}>GBPOA MEMBERSHIP FEE</div>
            <div style={{ fontSize: "0.85rem", marginTop: 2 }}>Pay by check (payable to GBPOA) or Venmo</div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "'Georgia', serif" }}>{fmt(fee + (parseFloat(form.contribution) || 0))}</div>
        </div>

        <div style={{ marginTop: 12, padding: "0.8rem 1rem", background: "#fef9e7", borderRadius: 8, fontSize: "0.88rem", color: "#7d6608", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span>💳</span>
          <span>Venmo: <strong>@KB-GBPOA</strong> &nbsp;|&nbsp; Checks payable to <strong>GBPOA</strong></span>
        </div>

        <button onClick={handleSubmit} style={{ ...btnStyle, background: "#e67e22", marginTop: 24, width: "100%", justifyContent: "center", boxShadow: "0 6px 24px rgba(230,126,34,0.3)" }}>
          Continue to Beach Sign-Up →
        </button>
      </div>
    </div>
  );
}

// ── Kiddie Beach Form ──
function KbForm({ gbpoaData, onSubmit, onBack }) {
  const [form, setForm] = useState({ planType: "family", emergencyContact: "", emergencyPhone: "", children: [{ name: "", birthdate: "" }, { name: "", birthdate: "" }, { name: "", birthdate: "" }] });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateChild = (i, field, val) => {
    const kids = [...form.children];
    kids[i] = { ...kids[i], [field]: val };
    setForm(f => ({ ...f, children: kids }));
  };
  const addChild = () => setForm(f => ({ ...f, children: [...f.children, { name: "", birthdate: "" }] }));

  const needsChildren = form.planType === "family" || form.planType === "single_parent";

  const validate = () => {
    const e = {};
    if (!form.emergencyContact.trim()) e.emergencyContact = "Required";
    if (!form.emergencyPhone.trim()) e.emergencyPhone = "Required";
    if (needsChildren && !form.children.some(c => c.name.trim())) e.children = "Add at least one child";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSubmit(form); };

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#27ae60", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Georgia', serif" }}>2</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1a5276", fontFamily: "'Georgia', serif" }}>Kiddie Beach Membership</h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#888" }}>2026 Season — Opening Day: Saturday, June 20th</p>
          </div>
        </div>

        {/* Show who's registering */}
        <div style={{ margin: "16px 0 24px", padding: "0.8rem 1rem", background: "#eaf4fd", borderRadius: 10, fontSize: "0.9rem", color: "#1a5276" }}>
          Registering: <strong>{gbpoaData.firstName} {gbpoaData.lastName}</strong> &nbsp;|&nbsp; {gbpoaData.address}
        </div>

        <label style={labelStyle}>Select Your Plan</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 24 }}>
          {Object.entries(KB_PLAN_LABELS).map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: form.planType === key ? "#e8f8f0" : "#f8f8f8", border: form.planType === key ? "2px solid #27ae60" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
              <input type="radio" name="kbPlan" checked={form.planType === key} onChange={() => set("planType", key)} style={{ accentColor: "#27ae60" }} />
              <span style={{ fontSize: "0.95rem", fontWeight: form.planType === key ? 600 : 400, color: "#2c3e50" }}>{label}</span>
            </label>
          ))}
        </div>

        {/* Children */}
        {needsChildren && (
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Children's Names & Birthdates</label>
            {errors.children && <p style={errorStyle}>{errors.children}</p>}
            {form.children.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <input placeholder={`Child ${i + 1} name`} value={c.name} onChange={e => updateChild(i, "name", e.target.value)} style={inputStyle} />
                <input type="date" value={c.birthdate} onChange={e => updateChild(i, "birthdate", e.target.value)} style={inputStyle} />
              </div>
            ))}
            <button onClick={addChild} style={{ marginTop: 10, background: "none", border: "1px dashed #aaa", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#666", fontSize: "0.85rem", fontFamily: "inherit" }}>+ Add Another Child</button>
          </div>
        )}

        {/* Emergency contact */}
        <Field label="Emergency Contact Name" value={form.emergencyContact} onChange={v => set("emergencyContact", v)} error={errors.emergencyContact} full />
        <Field label="Emergency Contact Phone" type="tel" value={form.emergencyPhone} onChange={v => set("emergencyPhone", v)} error={errors.emergencyPhone} full />

        {/* Fee summary */}
        <div style={{ marginTop: 24, padding: "1.2rem", background: "linear-gradient(135deg, #1a6e3a, #27ae60)", borderRadius: 12, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", opacity: 0.7, letterSpacing: 0.5 }}>KIDDIE BEACH — {KB_PLAN_LABELS[form.planType].split("(")[0].trim()}</div>
            <div style={{ fontSize: "0.85rem", marginTop: 2 }}>Season membership fee</div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "'Georgia', serif" }}>{fmt(KB_RATES[form.planType])}</div>
        </div>

        <div style={{ marginTop: 12, padding: "0.8rem 1rem", background: "#fef9e7", borderRadius: 8, fontSize: "0.88rem", color: "#7d6608", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span>💳</span>
          <span>Venmo: <strong>@KB-GBPOA</strong> &nbsp;|&nbsp; Checks payable to <strong>GBPOA</strong></span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={onBack} style={{ ...btnStyle, background: "#95a5a6", flex: "0 0 auto", boxShadow: "none" }}>← Back</button>
          <button onClick={handleSubmit} style={{ ...btnStyle, background: "#27ae60", flex: 1, justifyContent: "center", boxShadow: "0 6px 24px rgba(39,174,96,0.3)" }}>
            Submit Registration ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation ──
function Confirmation({ member, onHome }) {
  return (
    <div style={cardStyle}>
      <div style={{ textAlign: "center", padding: "1rem 0" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#27ae60", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 1rem" }}>✓</div>
        <h2 style={{ fontFamily: "'Georgia', serif", color: "#1a5276", fontSize: "1.6rem", marginBottom: 8 }}>Registration Complete!</h2>
        <p style={{ color: "#666", fontSize: "0.95rem", maxWidth: 400, margin: "0 auto 2rem", lineHeight: 1.6 }}>
          Thank you, <strong>{member.firstName} {member.lastName}</strong>! Your application for Kiddie Beach has been submitted.
        </p>
      </div>

      <div style={{ background: "#f0f8ff", borderRadius: 12, padding: "1.2rem", marginBottom: 16 }}>
        <h3 style={{ fontSize: "0.9rem", color: "#1a5276", marginBottom: 12, letterSpacing: 0.5 }}>REGISTRATION SUMMARY</h3>
        <SummaryRow label="GBPOA Type" value={GBPOA_LABELS[member.gbpoaType]} />
        <SummaryRow label="GBPOA Fee" value={fmt(member.gbpoaFee)} />
        <SummaryRow label="Beach Plan" value={KB_PLAN_LABELS[member.kbPlan]} />
        <SummaryRow label="Beach Fee" value={fmt(member.kbFee)} />
        <div style={{ borderTop: "2px solid #1a5276", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: "#1a5276" }}>Total Due</span>
          <span style={{ fontWeight: 800, color: "#1a5276", fontSize: "1.1rem" }}>{fmt(member.gbpoaFee + member.kbFee + member.gbpoaContribution)}</span>
        </div>
      </div>

      <div style={{ background: "#fef9e7", borderRadius: 10, padding: "1rem", fontSize: "0.9rem", color: "#7d6608", lineHeight: 1.7, marginBottom: 16 }}>
        <strong>How to pay:</strong><br />
        Venmo: <strong>@KB-GBPOA</strong><br />
        Check payable to <strong>GBPOA</strong><br />
        Mail to: GBPOA / Kiddie Beach, c/o 64 Ebony Court, Bklyn NY 11229<br />
        Drop off at: Greenwood Real Estate Office<br />
        <strong>Registration Nights at Cort Club:</strong> May 21st • May 28th • June 4th
      </div>

      <div style={{ background: "#e8f8f0", borderRadius: 10, padding: "1rem", fontSize: "0.9rem", color: "#1a6e3a", textAlign: "center", fontWeight: 600 }}>
        🏖️ Opening Day — Saturday, June 20th, 2026
      </div>

      <button onClick={onHome} style={{ ...btnStyle, background: "#1a5276", marginTop: 24, width: "100%", justifyContent: "center" }}>← Back to Home</button>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(26,82,118,0.1)", fontSize: "0.9rem" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ color: "#2c3e50", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════
function AdminLogin({ onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const tryLogin = () => {
    if (pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c1929", padding: "2rem" }}>
      <div style={{ maxWidth: 400, width: "100%", background: "#162538", borderRadius: 16, padding: "2.5rem", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔒</div>
          <h2 style={{ fontFamily: "'Georgia', serif", color: "#fff", fontSize: "1.4rem", marginBottom: 4 }}>Beach Director Login</h2>
          <p style={{ color: "#888", fontSize: "0.85rem" }}>Kiddie Beach Back Office</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          style={{ ...inputStyle, background: "#0c1929", color: "#fff", border: err ? "2px solid #e74c3c" : "2px solid rgba(255,255,255,0.1)", marginBottom: 16 }}
        />
        {err && <p style={{ color: "#e74c3c", fontSize: "0.85rem", marginBottom: 12, textAlign: "center" }}>Incorrect password. Try again.</p>}
        <button onClick={tryLogin} style={{ ...btnStyle, background: "#e67e22", width: "100%", justifyContent: "center" }}>Log In →</button>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 16, fontSize: "0.85rem", fontFamily: "inherit" }}>← Back to Home</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL — Dashboard, Member List, Detail View
// ═══════════════════════════════════════════════════════
function AdminPanel({ onLogout }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard"); // dashboard | members | detail
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadAll();
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const togglePaid = async (id, field) => {
    const updated = members.map(m => m.id === id ? { ...m, [field]: !m[field] } : m);
    setMembers(updated);
    await saveAll(updated);
    if (selected && selected.id === id) setSelected(updated.find(m => m.id === id));
  };

  const deleteMember = async (id) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    await saveAll(updated);
    setSelected(null);
    setTab("members");
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${m.firstName} ${m.lastName} ${m.address} ${m.email} ${m.phone}`.toLowerCase().includes(q);
    const matchPlan = filterPlan === "all" || m.kbPlan === filterPlan;
    const matchPay = filterPayment === "all" ||
      (filterPayment === "paid" && m.gbpoaPaid && m.kbPaid) ||
      (filterPayment === "unpaid" && (!m.gbpoaPaid || !m.kbPaid));
    return matchSearch && matchPlan && matchPay;
  });

  // Stats
  const totalMembers = members.length;
  const totalRevenue = members.reduce((s, m) => s + (m.gbpoaFee || 0) + (m.kbFee || 0) + (m.gbpoaContribution || 0), 0);
  const paidBoth = members.filter(m => m.gbpoaPaid && m.kbPaid).length;
  const unpaid = members.filter(m => !m.gbpoaPaid || !m.kbPaid).length;
  const planCounts = {};
  members.forEach(m => { planCounts[m.kbPlan] = (planCounts[m.kbPlan] || 0) + 1; });

  const openDetail = (m) => { setSelected(m); setTab("detail"); };

  return (
    <div style={{ minHeight: "100vh", background: "#0c1929", color: "#fff" }}>
      {/* Admin nav */}
      <div style={{ background: "#162538", padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.2rem" }}>🏖️</span>
          <span style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: "1rem", color: "#f5e6c8" }}>Kiddie Beach — Back Office</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <TabBtn label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <TabBtn label={`Members (${totalMembers})`} active={tab === "members" || tab === "detail"} onClick={() => { setTab("members"); setSelected(null); }} />
          <button onClick={onLogout} style={{ background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.3)", color: "#e74c3c", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "2rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#888" }}>Loading members...</div>
        ) : (
          <>
            {tab === "dashboard" && <Dashboard stats={{ totalMembers, totalRevenue, paidBoth, unpaid, planCounts }} members={members} />}
            {tab === "members" && (
              <MemberList
                members={filtered}
                search={search}
                setSearch={setSearch}
                filterPlan={filterPlan}
                setFilterPlan={setFilterPlan}
                filterPayment={filterPayment}
                setFilterPayment={setFilterPayment}
                onSelect={openDetail}
                onTogglePaid={togglePaid}
              />
            )}
            {tab === "detail" && selected && (
              <MemberDetail member={selected} onBack={() => setTab("members")} onTogglePaid={togglePaid} onDelete={deleteMember} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? "rgba(230,126,34,0.15)" : "transparent", border: active ? "1px solid rgba(230,126,34,0.3)" : "1px solid transparent", color: active ? "#e67e22" : "#888", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s" }}>
      {label}
    </button>
  );
}

// ── Dashboard ──
function Dashboard({ stats, members }) {
  const recentMembers = [...members].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)).slice(0, 5);

  return (
    <div>
      <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", color: "#f5e6c8", marginBottom: 24 }}>Dashboard</h2>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Registrations" value={stats.totalMembers} color="#2980b9" icon="👥" />
        <StatCard label="Total Revenue Due" value={fmt(stats.totalRevenue)} color="#27ae60" icon="💰" />
        <StatCard label="Fully Paid" value={stats.paidBoth} color="#27ae60" icon="✅" />
        <StatCard label="Unpaid / Partial" value={stats.unpaid} color="#e74c3c" icon="⏳" />
      </div>

      {/* Plan breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div style={adminCardStyle}>
          <h3 style={adminCardTitle}>Plan Breakdown</h3>
          {Object.entries(KB_PLAN_LABELS).map(([key, label]) => {
            const count = stats.planCounts[key] || 0;
            const pct = stats.totalMembers ? (count / stats.totalMembers * 100) : 0;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                  <span style={{ color: "#aaa" }}>{label.split("(")[0].trim()}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #e67e22, #f39c12)", borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={adminCardStyle}>
          <h3 style={adminCardTitle}>Recent Registrations</h3>
          {recentMembers.length === 0 ? (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>No registrations yet.</p>
          ) : recentMembers.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{m.firstName} {m.lastName}</div>
                <div style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(m.registeredAt).toLocaleDateString()}</div>
              </div>
              <PaymentBadge gbpoa={m.gbpoaPaid} kb={m.kbPaid} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background: "#162538", borderRadius: 12, padding: "1.2rem", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#888", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color, fontFamily: "'Georgia', serif" }}>{value}</div>
        </div>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      </div>
    </div>
  );
}

// ── Member List ──
function MemberList({ members, search, setSearch, filterPlan, setFilterPlan, filterPayment, setFilterPayment, onSelect, onTogglePaid }) {
  return (
    <div>
      <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", color: "#f5e6c8", marginBottom: 20 }}>All Members</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <input placeholder="🔍 Search by name, address, email, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, background: "#162538", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", flex: "1 1 250px", minWidth: 200 }} />
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ ...inputStyle, background: "#162538", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", flex: "0 0 180px" }}>
          <option value="all">All Plans</option>
          {Object.entries(KB_PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v.split("(")[0].trim()}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ ...inputStyle, background: "#162538", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", flex: "0 0 160px" }}>
          <option value="all">All Payment</option>
          <option value="paid">Fully Paid</option>
          <option value="unpaid">Unpaid / Partial</option>
        </select>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          {search || filterPlan !== "all" || filterPayment !== "all" ? "No members match your filters." : "No registrations yet. Members will appear here after they register."}
        </div>
      ) : (
        <div style={{ background: "#162538", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 0.8fr", padding: "10px 16px", background: "rgba(255,255,255,0.03)", fontSize: "0.7rem", color: "#888", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, gap: 8 }}>
            <span>Name</span><span>Contact</span><span>Plan</span><span>GBPOA</span><span>Beach</span><span>Total</span>
          </div>
          {/* Rows */}
          {members.map(m => (
            <div key={m.id} onClick={() => onSelect(m)} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr 1fr 1fr 0.8fr", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s", gap: 8, alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{m.firstName} {m.lastName}</div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>{m.address}</div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
                <div>{m.email}</div>
                <div>{m.phone}</div>
              </div>
              <div style={{ fontSize: "0.8rem" }}>{KB_PLAN_LABELS[m.kbPlan]?.split("(")[0].trim() || m.kbPlan}</div>
              <div>
                <PaidToggle paid={m.gbpoaPaid} onClick={e => { e.stopPropagation(); togglePaidClick(onTogglePaid, m.id, "gbpoaPaid"); }} label={fmt(m.gbpoaFee)} />
              </div>
              <div>
                <PaidToggle paid={m.kbPaid} onClick={e => { e.stopPropagation(); togglePaidClick(onTogglePaid, m.id, "kbPaid"); }} label={fmt(m.kbFee)} />
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f5e6c8" }}>{fmt((m.gbpoaFee || 0) + (m.kbFee || 0))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function togglePaidClick(fn, id, field) { fn(id, field); }

function PaidToggle({ paid, onClick, label }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, background: paid ? "rgba(39,174,96,0.15)" : "rgba(231,76,60,0.1)", border: `1px solid ${paid ? "rgba(39,174,96,0.3)" : "rgba(231,76,60,0.2)"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: paid ? "#27ae60" : "#e74c3c", fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s" }}>
      {paid ? "✓ Paid" : "Unpaid"} <span style={{ color: "#aaa", fontWeight: 400 }}>{label}</span>
    </button>
  );
}

function PaymentBadge({ gbpoa, kb }) {
  const both = gbpoa && kb;
  const neither = !gbpoa && !kb;
  const color = both ? "#27ae60" : neither ? "#e74c3c" : "#f39c12";
  const label = both ? "Paid" : neither ? "Unpaid" : "Partial";
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 600, color, background: `${color}22`, padding: "3px 10px", borderRadius: 20 }}>{label}</span>
  );
}

// ── Member Detail ──
function MemberDetail({ member: m, onBack, onTogglePaid, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "0.9rem", marginBottom: 16, fontFamily: "inherit" }}>← Back to Members</button>

      <div style={{ ...adminCardStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "1.5rem", color: "#fff", margin: 0 }}>{m.firstName} {m.lastName}</h2>
            <p style={{ color: "#888", fontSize: "0.85rem", margin: "4px 0 0" }}>Registered {new Date(m.registeredAt).toLocaleDateString()} at {new Date(m.registeredAt).toLocaleTimeString()}</p>
          </div>
          <PaymentBadge gbpoa={m.gbpoaPaid} kb={m.kbPaid} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <DetailField label="Address" value={m.address} />
          <DetailField label="Email" value={m.email} />
          <DetailField label="Phone" value={m.phone} />
          <DetailField label="Alt Phone" value={m.altPhone || "—"} />
          <DetailField label="Emergency Contact" value={m.emergencyContact} />
          <DetailField label="Emergency Phone" value={m.emergencyPhone} />
        </div>
      </div>

      {/* Plans & Payment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={adminCardStyle}>
          <h3 style={adminCardTitle}>GBPOA Membership</h3>
          <DetailField label="Type" value={GBPOA_LABELS[m.gbpoaType] || m.gbpoaType} />
          {m.gbpoaType === "tenant" && <DetailField label="Tenant Count" value={m.gbpoaTenantCount} />}
          <DetailField label="Fee" value={fmt(m.gbpoaFee)} />
          {m.gbpoaContribution > 0 && <DetailField label="Extra Contribution" value={fmt(m.gbpoaContribution)} />}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => onTogglePaid(m.id, "gbpoaPaid")} style={{ ...btnStyle, width: "100%", justifyContent: "center", background: m.gbpoaPaid ? "#27ae60" : "#e74c3c", fontSize: "0.85rem", padding: "10px 16px" }}>
              {m.gbpoaPaid ? "✓ Marked Paid — Click to Undo" : "Mark GBPOA as Paid"}
            </button>
          </div>
        </div>
        <div style={adminCardStyle}>
          <h3 style={adminCardTitle}>Kiddie Beach Membership</h3>
          <DetailField label="Plan" value={KB_PLAN_LABELS[m.kbPlan]?.split("(")[0].trim() || m.kbPlan} />
          <DetailField label="Fee" value={fmt(m.kbFee)} />
          <div style={{ marginTop: 12 }}>
            <button onClick={() => onTogglePaid(m.id, "kbPaid")} style={{ ...btnStyle, width: "100%", justifyContent: "center", background: m.kbPaid ? "#27ae60" : "#e74c3c", fontSize: "0.85rem", padding: "10px 16px" }}>
              {m.kbPaid ? "✓ Marked Paid — Click to Undo" : "Mark Beach as Paid"}
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {m.children && m.children.length > 0 && m.children.some(c => c.name) && (
        <div style={{ ...adminCardStyle, marginBottom: 16 }}>
          <h3 style={adminCardTitle}>Children</h3>
          {m.children.filter(c => c.name).map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: "#888", fontSize: "0.85rem" }}>{c.birthdate || "No DOB"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div style={{ ...adminCardStyle, background: "linear-gradient(135deg, #1a5276, #2980b9)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", opacity: 0.7, letterSpacing: 0.5 }}>TOTAL DUE</div>
            <div style={{ fontSize: "0.85rem", marginTop: 4, opacity: 0.8 }}>GBPOA {fmt(m.gbpoaFee)} + Beach {fmt(m.kbFee)}{m.gbpoaContribution > 0 ? ` + Contribution ${fmt(m.gbpoaContribution)}` : ""}</div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "'Georgia', serif" }}>{fmt((m.gbpoaFee || 0) + (m.kbFee || 0) + (m.gbpoaContribution || 0))}</div>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...adminCardStyle, borderColor: "rgba(231,76,60,0.2)" }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" }}>🗑 Delete this member...</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "#e74c3c" }}>Are you sure? This cannot be undone.</span>
            <button onClick={() => onDelete(m.id)} style={{ ...btnStyle, background: "#e74c3c", fontSize: "0.8rem", padding: "8px 16px" }}>Yes, Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...btnStyle, background: "#555", fontSize: "0.8rem", padding: "8px 16px" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: "0.7rem", color: "#888", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.95rem", color: "#fff" }}>{value || "—"}</div>
    </div>
  );
}

// ── Shared form components ──
function Field({ label, value, onChange, error, type = "text", full, placeholder }) {
  return (
    <div style={{ marginBottom: 16, ...(full ? {} : {}) }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} style={{ ...inputStyle, borderColor: error ? "#e74c3c" : "#ddd" }} />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════
const btnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 28px",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "0.95rem",
  borderRadius: 50,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.2s",
};

const cardStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: "2rem",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "2px solid #ddd",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#1a5276",
  letterSpacing: 0.3,
  textTransform: "uppercase",
  marginBottom: 6,
};

const errorStyle = {
  color: "#e74c3c",
  fontSize: "0.8rem",
  marginTop: 4,
  marginBottom: 0,
};

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const adminCardStyle = {
  background: "#162538",
  borderRadius: 12,
  padding: "1.5rem",
  border: "1px solid rgba(255,255,255,0.06)",
};

const adminCardTitle = {
  fontSize: "0.75rem",
  color: "#888",
  letterSpacing: 0.5,
  textTransform: "uppercase",
  marginBottom: 16,
  fontWeight: 600,
};
