// ============================================================
// AssessForm.jsx
// Form สำหรับกรอกข้อมูลแล้วส่งไป FastAPI Backend จริง
// ============================================================
import { useState } from "react";
import { assessAccount } from "./api";

const DEFAULT_PAYLOAD = {
  kyc: {
    national_id: "",
    age: 25,
    occupation: "",
    registered_address_zipcode: "",
    kyc_timestamp: Date.now() / 1000,
    kyc_channel: "Online",
  },
  footprint: {
    device_imei: "",
    device_model: "",
    ip_address: "",
    carrier_name: "",
    sim_serial_owner_match: true,
  },
  biometrics: {
    typing_speed_wpm: 60,
    keystroke_intervals: [],
    copy_paste_detected: false,
    touch_pressure_avg: 0.6,
    screen_navigation_path: ["HOME", "REGISTER"],
    changed_limit_to_max: false,
    minutes_since_account_open: 60,
    balance_checks_without_funds: 0,
  },
  known_connected_user_ids: [],
};

const PRESETS = {
  HIGH: {
    kyc: {
      national_id: "1234567890123",
      age: 22,
      occupation: "Student",
      registered_address_zipcode: "10520",
      kyc_timestamp: Date.now() / 1000,
      kyc_channel: "Online",
    },
    footprint: {
      device_imei: "IMEI_FRAUD_001",
      device_model: "Samsung Galaxy A05",
      ip_address: "10.0.0.1",
      carrier_name: "TrueMove H",
      sim_serial_owner_match: false,
    },
    biometrics: {
      typing_speed_wpm: 120,
      keystroke_intervals: [],
      copy_paste_detected: true,
      touch_pressure_avg: 0.3,
      screen_navigation_path: ["HOME", "REGISTER", "LIMITS"],
      changed_limit_to_max: true,
      minutes_since_account_open: 8.5,
      balance_checks_without_funds: 4,
    },
    known_connected_user_ids: ["user-fraud-ring-A", "user-fraud-ring-B"],
  },
  MEDIUM: {
    kyc: {
      national_id: "9876543210123",
      age: 35,
      occupation: "Freelancer",
      registered_address_zipcode: "10900",
      kyc_timestamp: Date.now() / 1000,
      kyc_channel: "Online",
    },
    footprint: {
      device_imei: "IMEI_CLEAN_555",
      device_model: "iPhone 13",
      ip_address: "203.150.10.1",
      carrier_name: "AIS",
      sim_serial_owner_match: false,
    },
    biometrics: {
      typing_speed_wpm: 65,
      keystroke_intervals: [],
      copy_paste_detected: false,
      touch_pressure_avg: 0.6,
      screen_navigation_path: ["HOME", "REGISTER"],
      changed_limit_to_max: true,
      minutes_since_account_open: 45.0,
      balance_checks_without_funds: 2,
    },
    known_connected_user_ids: [],
  },
  LOW: {
    kyc: {
      national_id: "1111111111111",
      age: 45,
      occupation: "Engineer",
      registered_address_zipcode: "10400",
      kyc_timestamp: Date.now() / 1000,
      kyc_channel: "Branch",
    },
    footprint: {
      device_imei: "IMEI_CLEAN_999",
      device_model: "Oppo Reno 8",
      ip_address: "171.100.20.5",
      carrier_name: "DTAC",
      sim_serial_owner_match: true,
    },
    biometrics: {
      typing_speed_wpm: 45,
      keystroke_intervals: [],
      copy_paste_detected: false,
      touch_pressure_avg: 0.75,
      screen_navigation_path: ["HOME", "REGISTER", "CONFIRM"],
      changed_limit_to_max: false,
      minutes_since_account_open: 120.0,
      balance_checks_without_funds: 0,
    },
    known_connected_user_ids: [],
  },
};

// ── Helper Components ─────────────────────────────────────────────────────────
function FieldLabel({ text }) {
  return (
    <div className="text-xs text-gray-400 mb-1">{text}</div>
  );
}

function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <FieldLabel text={label} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
          text-white text-xs focus:outline-none focus:border-purple-500 transition-all"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div>
      <FieldLabel text={label} />
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
          text-white text-xs focus:outline-none focus:border-purple-500 transition-all"
      />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel text={label} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
          text-white text-xs focus:outline-none focus:border-purple-500 transition-all"
      >
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleInput({ label, value, onChange, trueLabel = "Yes", falseLabel = "No" }) {
  return (
    <div>
      <FieldLabel text={label} />
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
            value
              ? "bg-green-900 border-green-600 text-green-300"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
          }`}>
          ✅ {trueLabel}
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
            !value
              ? "bg-red-900 border-red-600 text-red-300"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
          }`}>
          ❌ {falseLabel}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, color, children }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold" style={{ color }}>{title}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssessForm({ onResult }) {
  const [form, setForm]         = useState(DEFAULT_PAYLOAD);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  // ── Update helpers ─────────────────────────────────────────────────────────
  const setKyc  = (k, v) => setForm(f => ({ ...f, kyc:        { ...f.kyc,        [k]: v } }));
  const setFoot = (k, v) => setForm(f => ({ ...f, footprint:  { ...f.footprint,  [k]: v } }));
  const setBio  = (k, v) => setForm(f => ({ ...f, biometrics: { ...f.biometrics, [k]: v } }));

  // ── Apply preset ───────────────────────────────────────────────────────────
  const applyPreset = (name) => {
    setForm({ ...PRESETS[name] });
    setActivePreset(name);
    setError(null);
  };

  // ── Generate keystroke intervals ───────────────────────────────────────────
  const generateKeystroke = (wpm, isFraud) => {
    // Fraud: tight intervals (robotic), Normal: varied intervals (human)
    return Array.from({ length: 20 }, () => {
      if (isFraud) {
        return Math.round(40 + Math.random() * 15);       // 40–55 ms  (robotic)
      } else {
        const base = Math.round(60000 / (wpm * 5));       // avg ms per keystroke
        return Math.round(base * (0.5 + Math.random()));  // human variation
      }
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validation
    if (!form.footprint.device_imei) { setError("กรุณากรอก Device IMEI"); return; }
    if (!form.footprint.ip_address)  { setError("กรุณากรอก IP Address");  return; }

    setLoading(true);
    setError(null);

    try {
      const isFraudPreset = activePreset === "HIGH";
      const keystroke = generateKeystroke(form.biometrics.typing_speed_wpm, isFraudPreset);

      const payload = {
        user_id: `user-${Date.now()}`,
        kyc: {
          ...form.kyc,
          kyc_timestamp: Date.now() / 1000,
        },
        footprint: { ...form.footprint },
        biometrics: {
          ...form.biometrics,
          keystroke_intervals: keystroke,
        },
        known_connected_user_ids: form.known_connected_user_ids,
      };

      const result = await assessAccount(payload);
      onResult(result);
    } catch (e) {
      setError(`❌ ${e.message} — ตรวจสอบว่า Backend รันอยู่ที่ localhost:8000`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_PAYLOAD);
    setActivePreset(null);
    setError(null);
  };

  return (
    <div className="space-y-4">

      {/* ── Preset Buttons ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
          ⚡ Quick Preset — เลือก Case สำเร็จรูป
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name:"HIGH",   label:"🚫 HIGH Risk",   bg:"bg-red-950",    border:"border-red-600",    text:"text-red-300",    desc:"IMEI Blacklist + SIM Mismatch + CopyPaste" },
            { name:"MEDIUM", label:"⚠️ MEDIUM Risk", bg:"bg-yellow-950", border:"border-yellow-600", text:"text-yellow-300", desc:"SIM Mismatch + Limit Changed" },
            { name:"LOW",    label:"✅ LOW Risk",    bg:"bg-green-950",  border:"border-green-600",  text:"text-green-300",  desc:"SIM Match + Normal Behavior" },
          ].map(({ name, label, bg, border, text, desc }) => (
            <button key={name} onClick={() => applyPreset(name)}
              className={`rounded-xl border-2 p-3 text-left transition-all hover:ring-2 hover:ring-white hover:ring-opacity-20 ${
                activePreset === name
                  ? `${bg} ${border}`
                  : "bg-gray-800 border-gray-700"
              }`}>
              <div className={`text-sm font-black ${activePreset === name ? text : "text-gray-300"}`}>
                {label}
              </div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
              {activePreset === name && (
                <div className={`text-xs mt-2 font-bold ${text}`}>✦ Selected</div>
              )}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-600 mt-3">
          💡 เลือก Preset แล้วกด <span className="text-purple-400 font-bold">Run Fraud Assessment</span> ได้เลย
          หรือแก้ค่าเองด้านล่าง
        </div>
      </div>

      {/* ── Module 1: KYC ── */}
      <SectionCard icon="📋" title="Module 1 — KYC Data" color="#a78bfa">
        <TextInput label="National ID"  value={form.kyc.national_id}
          onChange={v => setKyc("national_id", v)} placeholder="1234567890123" />
        <NumberInput label="Age"        value={form.kyc.age}
          onChange={v => setKyc("age", v)} min={0} max={120} />
        <TextInput label="Occupation"   value={form.kyc.occupation}
          onChange={v => setKyc("occupation", v)} placeholder="Student / Engineer" />
        <TextInput label="Zipcode"      value={form.kyc.registered_address_zipcode}
          onChange={v => setKyc("registered_address_zipcode", v)} placeholder="10520" />
        <SelectInput label="KYC Channel" value={form.kyc.kyc_channel}
          onChange={v => setKyc("kyc_channel", v)}
          options={["Online", "Branch"]} />
      </SectionCard>

      {/* ── Module 2: Digital Footprint ── */}
      <SectionCard icon="📱" title="Module 2 — Digital Footprint" color="#60a5fa">
        <TextInput label="Device IMEI"  value={form.footprint.device_imei}
          onChange={v => setFoot("device_imei", v)} placeholder="IMEI_FRAUD_001" />
        <TextInput label="Device Model" value={form.footprint.device_model}
          onChange={v => setFoot("device_model", v)} placeholder="Samsung Galaxy A05" />
        <TextInput label="IP Address"   value={form.footprint.ip_address}
          onChange={v => setFoot("ip_address", v)} placeholder="10.0.0.1" />
        <TextInput label="Carrier"      value={form.footprint.carrier_name}
          onChange={v => setFoot("carrier_name", v)} placeholder="TrueMove H" />
        <div className="col-span-2 md:col-span-2">
          <ToggleInput
            label="SIM Card Owner Match (via Telecom API)"
            value={form.footprint.sim_serial_owner_match}
            onChange={v => setFoot("sim_serial_owner_match", v)}
            trueLabel="Match ✅" falseLabel="Mismatch ❌" />
        </div>
      </SectionCard>

      {/* ── Module 3: Behavioral Biometrics ── */}
      <SectionCard icon="⌨️" title="Module 3 — Behavioral Biometrics" color="#34d399">
        <NumberInput label="Typing Speed (WPM)"        value={form.biometrics.typing_speed_wpm}
          onChange={v => setBio("typing_speed_wpm", v)} min={10} max={300} />
        <NumberInput label="Touch Pressure (0.0–1.0)"  value={form.biometrics.touch_pressure_avg}
          onChange={v => setBio("touch_pressure_avg", v)} min={0} max={1} step={0.1} />
        <NumberInput label="Minutes Since Account Open" value={form.biometrics.minutes_since_account_open}
          onChange={v => setBio("minutes_since_account_open", v)} min={0} max={1440} />
        <NumberInput label="Balance Checks (฿0 balance)" value={form.biometrics.balance_checks_without_funds}
          onChange={v => setBio("balance_checks_without_funds", v)} min={0} max={20} />
        <ToggleInput
          label="Changed Limit to MAX within 60 min"
          value={form.biometrics.changed_limit_to_max}
          onChange={v => setBio("changed_limit_to_max", v)}
          trueLabel="Yes (Suspicious)" falseLabel="No (Normal)" />
        <ToggleInput
          label="Copy-Paste Detected in Form"
          value={form.biometrics.copy_paste_detected}
          onChange={v => setBio("copy_paste_detected", v)}
          trueLabel="Detected ❌" falseLabel="Not Detected ✅" />
      </SectionCard>

      {/* ── Info Note ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
        <div className="text-xs text-gray-500 space-y-1">
          <div>📌 <span className="text-gray-400 font-semibold">Keystroke Intervals</span> — จะถูก generate อัตโนมัติ 20 ค่า
            {activePreset === "HIGH"
              ? <span className="text-red-400 ml-1">(Robotic: 40–55ms ← Fraud Pattern)</span>
              : <span className="text-green-400 ml-1">(Human: varied based on WPM)</span>}
          </div>
          <div>📌 <span className="text-gray-400 font-semibold">IMEI Blacklist</span> — ทดสอบใช้ <code className="text-purple-400">IMEI_FRAUD_001</code> ถึง <code className="text-purple-400">IMEI_FRAUD_005</code></div>
          <div>📌 <span className="text-gray-400 font-semibold">IP Blacklist</span> — ทดสอบใช้ <code className="text-purple-400">10.0.0.1</code>, <code className="text-purple-400">192.168.100.1</code>, <code className="text-purple-400">172.16.0.99</code></div>
        </div>
      </div>

      {/* ── Error Message ── */}
      {error && (
        <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-3 rounded-xl text-xs font-bold border border-gray-700
            bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white transition-all">
          🔄 Reset
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all tracking-wide ${
            loading
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-purple-700 hover:bg-purple-600 text-white shadow-lg"
          }`}>
          {loading
            ? "⏳ Processing..."
            : "🐴 Run Fraud Assessment →"}
        </button>
      </div>
    </div>
  );
}
