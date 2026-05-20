import { useState, useEffect, useRef } from "react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, ReferenceLine, Legend, ScatterChart,
  Scatter, ZAxis, PieChart, Pie, Cell
} from "recharts";
import AssessForm from "./AssessForm";
// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════
const CASES = [
  {
    id: "test-user-001", label: "Case A", risk: "HIGH", color: "#ef4444",
    bgColor: "bg-red-950", borderColor: "border-red-700", textColor: "text-red-400",
    occupation: "Student", age: 22, channel: "Online", carrier: "TrueMove H",
    sim_match: false, copy_paste: true, changed_limit: true,
    minutes_open: 8.5, balance_checks: 4,
    engine_a: { typing_variance: 1.6275, benford_deviation: 0.6198, bayesian: 0.9999,
      variance_flagged: true, benford_flagged: true, bayesian_flagged: true, score: 0.9934 },
    engine_b: { cluster_score: 0.6632, nodes: 5, edges: 6, flagged: true, score: 0.6632 },
    final_score: 1.0, action: "BLOCK_OUTBOUND_TRANSACTION",
    action_label: "BLOCKED", action_icon: "🚫",
    keystroke: [45,48,46,47,45,44,46,48,45,47,46,45,47,48,46,45,44,47,46,48],
  },
  {
    id: "test-user-002", label: "Case B", risk: "MEDIUM", color: "#f59e0b",
    bgColor: "bg-yellow-950", borderColor: "border-yellow-700", textColor: "text-yellow-400",
    occupation: "Freelancer", age: 35, channel: "Online", carrier: "AIS",
    sim_match: false, copy_paste: false, changed_limit: true,
    minutes_open: 45.0, balance_checks: 2,
    engine_a: { typing_variance: 312.4, benford_deviation: 0.18, bayesian: 0.412,
      variance_flagged: false, benford_flagged: true, bayesian_flagged: false, score: 0.3840 },
    engine_b: { cluster_score: 0.21, nodes: 3, edges: 2, flagged: false, score: 0.2100 },
    final_score: 0.414, action: "LIMIT_TRANSACTION_CAP",
    action_label: "LIMITED", action_icon: "⚠️",
    keystroke: [100,130,95,140,110,125,90,135,105,120,115,100,130,95,140,110,125,90,135,105],
  },
  {
    id: "test-user-003", label: "Case C", risk: "LOW", color: "#22c55e",
    bgColor: "bg-green-950", borderColor: "border-green-700", textColor: "text-green-400",
    occupation: "Engineer", age: 45, channel: "Branch", carrier: "DTAC",
    sim_match: true, copy_paste: false, changed_limit: false,
    minutes_open: 120.0, balance_checks: 0,
    engine_a: { typing_variance: 1840.5, benford_deviation: 0.062, bayesian: 0.011,
      variance_flagged: false, benford_flagged: false, bayesian_flagged: false, score: 0.0610 },
    engine_b: { cluster_score: 0.04, nodes: 3, edges: 2, flagged: false, score: 0.0400 },
    final_score: 0.053, action: "ALLOW",
    action_label: "ALLOWED", action_icon: "✅",
    keystroke: [180,210,155,240,190,165,220,175,200,185,195,170,215,160,230,185,205,175,195,210],
  },
];

const AUDIT_LOGS = [
  { time: "09:14:23.001", level: "INFO",  engine: "INGESTION", msg: "Payload received — user_id: test-user-001" },
  { time: "09:14:23.045", level: "INFO",  engine: "ENGINE-A",  msg: "Computing keystroke variance σ² = 1.6275 ms²" },
  { time: "09:14:23.051", level: "WARN",  engine: "ENGINE-A",  msg: "Variance flagged: 1.6275 < threshold 15.0" },
  { time: "09:14:23.058", level: "INFO",  engine: "ENGINE-A",  msg: "Bayesian prior P(Mule) = 0.0100" },
  { time: "09:14:23.061", level: "WARN",  engine: "ENGINE-A",  msg: "Trigger: changed_limit_to_max within 60 min → P = 0.4634" },
  { time: "09:14:23.065", level: "WARN",  engine: "ENGINE-A",  msg: "Trigger: balance_check ×4 → P = 0.9956" },
  { time: "09:14:23.069", level: "WARN",  engine: "ENGINE-A",  msg: "Trigger: copy_paste_detected → P = 0.9990" },
  { time: "09:14:23.072", level: "CRIT",  engine: "ENGINE-A",  msg: "Trigger: SIM mismatch → P(Mule) = 0.9999 ⚠ FLAGGED" },
  { time: "09:14:23.081", level: "INFO",  engine: "ENGINE-A",  msg: "Benford TVD = 0.6198 — digit 5 over-represented" },
  { time: "09:14:23.091", level: "INFO",  engine: "ENGINE-B",  msg: "Building heterogeneous graph — 5 nodes, 6 edges" },
  { time: "09:14:23.102", level: "CRIT",  engine: "ENGINE-B",  msg: "IMEI blacklist HIT: IMEI_FRAUD_001 — known fraud device" },
  { time: "09:14:23.115", level: "CRIT",  engine: "ENGINE-B",  msg: "IP blacklist HIT: 10.0.0.1 — known fraud IP" },
  { time: "09:14:23.130", level: "INFO",  engine: "ENGINE-B",  msg: "IsolationForest anomaly score computed successfully" },
  { time: "09:14:23.141", level: "INFO",  engine: "FUSION",    msg: "base = 0.60×0.9934 + 0.40×0.6632 = 0.8613" },
  { time: "09:14:23.143", level: "WARN",  engine: "FUSION",    msg: "Applying SIM penalty +0.10, CopyPaste penalty +0.08" },
  { time: "09:14:23.144", level: "CRIT",  engine: "FUSION",    msg: "final_score = min(1.0413, 1.0) = 1.0000 — CAP REACHED" },
  { time: "09:14:23.145", level: "CRIT",  engine: "POLICY",    msg: "ACTION: BLOCK_OUTBOUND_TRANSACTION — require PHYSICAL_BRANCH_ONLY" },
  { time: "09:14:23.146", level: "INFO",  engine: "POLICY",    msg: "Response dispatched in 145ms" },
];

const SCATTER_POPULATION = [
  ...Array.from({ length: 110 }, () => ({
    x: Math.random() * 2000 + 300, y: Math.random() * 0.25, z: 20, type: "legit",
  })),
  ...Array.from({ length: 10 }, () => ({
    x: Math.random() * 20 + 1, y: Math.random() * 0.2 + 0.8, z: 40, type: "fraud",
  })),
];

const PIE_DATA = [
  { name: "Engine A (60%)", value: 60, fill: "#a78bfa" },
  { name: "Engine B (40%)", value: 40, fill: "#60a5fa" },
];

const BENFORD_DATA = [1,2,3,4,5,6,7,8,9].map(d => ({
  digit: `${d}`,
  expected: parseFloat((Math.log10(1 + 1/d) * 100).toFixed(2)),
  observed: d === 1 ? 33.3 : d === 5 ? 66.7 : 0,
}));

const BAYES_CHAIN = [
  { step: "Prior",      prob: 0.01 },
  { step: "Limit→Max", prob: 0.4634 },
  { step: "BalChk×1",  prob: 0.7935 },
  { step: "BalChk×2",  prob: 0.9353 },
  { step: "BalChk×3",  prob: 0.9828 },
  { step: "BalChk×4",  prob: 0.9956 },
  { step: "CopyPaste", prob: 0.9990 },
  { step: "SIM Miss",  prob: 0.9999 },
];

const SIM_STAGES = [
  "📥 Receiving payload...",
  "🔍 Validating KYC data...",
  "⌨️ Computing keystroke variance σ²...",
  "🧠 Running Bayesian inference chain...",
  "📊 Checking Benford's Law deviation...",
  "🕸️ Building GNN heterogeneous graph...",
  "🔴 Querying IMEI & IP blacklists...",
  "🌲 Running Isolation Forest...",
  "⚖️ Fusing engine scores (60/40)...",
  "🚨 Applying policy engine thresholds...",
  "✅ Assessment complete!",
];

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function Badge({ flagged }) {
  return flagged
    ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-900 text-red-300">⚠ FLAGGED</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-900 text-green-300">✓ CLEAR</span>;
}

function MetricCard({ label, value, unit = "", flagged, sub }) {
  return (
    <div className={`rounded-xl p-4 border ${flagged ? "border-red-700 bg-red-950" : "border-gray-700 bg-gray-800"}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <Badge flagged={flagged} />
      </div>
      <div className={`text-2xl font-bold mt-1 ${flagged ? "text-red-400" : "text-green-400"}`}>
        {value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function ScoreGauge({ score, size = 200 }) {
  const pct = Math.round(Math.min(score, 1) * 100);
  const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e";
  const data = [{ value: pct, fill: color }, { value: 100 - pct, fill: "#1f2937" }];
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart cx="50%" cy="60%" innerRadius="70%" outerRadius="100%"
          startAngle={180} endAngle={0} data={data}>
          <RadialBar dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center" style={{ top: size * 0.27 }}>
        <span className="font-black" style={{ color, fontSize: size * 0.21 }}>{pct}</span>
        <span className="text-gray-400 text-xs">Risk Score</span>
      </div>
    </div>
  );
}

function MiniGauge({ score, size = 100 }) {
  const pct = Math.round(Math.min(score, 1) * 100);
  const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e";
  const data = [{ value: pct, fill: color }, { value: 100 - pct, fill: "#1f2937" }];
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart cx="50%" cy="60%" innerRadius="65%" outerRadius="100%"
          startAngle={180} endAngle={0} data={data}>
          <RadialBar dataKey="value" cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center" style={{ top: size * 0.25 }}>
        <span className="font-black text-lg" style={{ color }}>{pct}</span>
      </div>
    </div>
  );
}

function PolicyBanner({ c }) {
  const cfg = c.risk === "HIGH"
    ? { bg: "bg-red-950",    border: "border-red-600",    text: "text-red-400" }
    : c.risk === "MEDIUM"
    ? { bg: "bg-yellow-950", border: "border-yellow-600", text: "text-yellow-400" }
    : { bg: "bg-green-950",  border: "border-green-600",  text: "text-green-400" };
  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{c.action_icon}</span>
        <div>
          <div className={`text-lg font-black ${cfg.text}`}>{c.action_label}</div>
          <div className="text-xs text-gray-400 font-mono">{c.action}</div>
        </div>
      </div>
      {c.risk === "HIGH" && (
        <span className="px-3 py-1 rounded-full bg-red-900 text-red-300 text-xs font-bold">
          🏦 Required: PHYSICAL_BRANCH_ONLY
        </span>
      )}
      {c.risk === "MEDIUM" && (
        <div className="flex gap-2 flex-wrap mt-1">
          <span className="px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs font-bold">💰 ฿5,000/day cap</span>
          <span className="px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs font-bold">👤 Face MFA</span>
        </div>
      )}
      {c.risk === "LOW" && (
        <span className="px-3 py-1 rounded-full bg-green-900 text-green-300 text-xs font-bold">
          ✅ Normal transaction allowed
        </span>
      )}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-gray-500 ml-7">{subtitle}</p>}
    </div>
  );
}

function ProgressBar({ value, color = "#a78bfa", label, sub }) {
  const pct = Math.min(value * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Simulation hook ──────────────────────────────────────────────────────────
function useSimulation(active, targetCase) {
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!active) { setProgress(0); setStageIdx(0); setLiveScore(0); return; }
    let p = 0;
    ref.current = setInterval(() => {
      p += 1.8;
      const capped = Math.min(p, 100);
      setProgress(capped);
      setStageIdx(Math.min(Math.floor((capped / 100) * (SIM_STAGES.length - 1)), SIM_STAGES.length - 1));
      setLiveScore(Math.min((capped / 100) * targetCase.final_score, targetCase.final_score));
      if (p >= 100) clearInterval(ref.current);
    }, 55);
    return () => clearInterval(ref.current);
  }, [active, targetCase]);

  return { progress, stageIdx, liveScore };
}

// ── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",  icon: "📊" },
  { id: "engine_a",   label: "Engine A",  icon: "🧠" },
  { id: "engine_b",   label: "Engine B",  icon: "🕸️" },
  { id: "fusion",     label: "Fusion",    icon: "⚖️" },
  { id: "cases",      label: "3 Cases",   icon: "🗂️" },
  { id: "simulation", label: "Simulate",  icon: "🚀" },
  { id: "audit",      label: "Audit Log", icon: "📋" },
  { id: "assess",     label: "Assess", icon: "🔬" }, // ← เพิ่มบรรทัดนี้
];
// ══════════════════════════════════════════════════════════════════════════════
// GNNGraphViz — Interactive Graph Visualization from Real API Result
// ══════════════════════════════════════════════════════════════════════════════
function GNNGraphViz({ result }) {
  const [hovered, setHovered] = useState(null);

  const isFlagged   = result.engine_b.cluster_flagged;
  const nodeColor   = isFlagged ? "#ef4444" : "#22c55e";
  const score       = result.engine_b.cluster_fraud_score;
  const nodes_count = result.engine_b.graph_node_count;
  const edges_count = result.engine_b.graph_edge_count;
  const hasPeers    = nodes_count > 3;
  const peerCount   = Math.max(0, nodes_count - 3);

  const nodes = [
    { id:"user",   x:260, y:145, r:40, type:"user",
      fill:"#4c1d95", stroke:"#a78bfa",
      label:"👤 TARGET", sub: result.user_id?.slice(0,12) ?? "user" },
    { id:"device", x:130, y:55,  r:32, type:"device",
      fill: isFlagged ? "#7f1d1d" : "#14532d",
      stroke: isFlagged ? "#ef4444" : "#22c55e",
      label:"📵 DEVICE", sub:"IMEI" },
    { id:"ip",     x:390, y:55,  r:30, type:"ip",
      fill:"#1e3a5f", stroke:"#60a5fa",
      label:"🌐 IP", sub:"Address" },
    ...(hasPeers && peerCount >= 1 ? [{
      id:"peer1", x:90, y:240, r:28, type:"peer",
      fill: isFlagged ? "#7f1d1d" : "#14532d",
      stroke: nodeColor, label:"👤 PEER", sub:"ring-A"
    }] : []),
    ...(hasPeers && peerCount >= 2 ? [{
      id:"peer2", x:430, y:240, r:28, type:"peer",
      fill: isFlagged ? "#7f1d1d" : "#14532d",
      stroke: nodeColor, label:"👤 PEER", sub:"ring-B"
    }] : []),
  ];

  const allEdges = [
    { x1:260, y1:145, x2:130, y2:55,  label:"USED_DEVICE",    type:"main"  },
    { x1:260, y1:145, x2:390, y2:55,  label:"CONNECTED_FROM", type:"main"  },
    ...(hasPeers && peerCount >= 1 ? [
      { x1:260, y1:145, x2:90,  y2:240, label:"SHARES_WITH",  type:"peer"  },
      { x1:90,  y1:240, x2:130, y2:55,  label:"USED_DEVICE",  type:"fraud", dash:true },
    ] : []),
    ...(hasPeers && peerCount >= 2 ? [
      { x1:260, y1:145, x2:430, y2:240, label:"SHARES_WITH",  type:"peer"  },
      { x1:430, y1:240, x2:130, y2:55,  label:"USED_DEVICE",  type:"fraud", dash:true },
    ] : []),
  ];
  const edges = allEdges.slice(0, edges_count);

  const getEdgeColor = (type) => ({
    main: "#6b7280", peer: nodeColor, fraud: "#f87171",
  }[type] ?? "#6b7280");

  const getMarker = (type) =>
    type === "fraud" ? "arr-red"
    : type === "peer" && isFlagged ? "arr-red"
    : type === "peer" ? "arr-green"
    : "arr-gray";

  const getTooltip = (node) => ({
    user:   { title:"Target User",  detail:`Score: ${(score*100).toFixed(1)}%`, flag: isFlagged },
    device: { title:"Device Node",  detail:"IMEI identifier",                   flag: isFlagged },
    ip:     { title:"IP Address",   detail:"Connection origin",                 flag: false },
    peer:   { title:"Peer Account", detail:"Shares device/network",             flag: isFlagged },
  }[node.type]);

  return (
    <div className="relative">
      <svg viewBox="0 0 520 295" className="w-full rounded-xl"
        style={{ background:"#0f172a", maxHeight:295 }}>
        <defs>
          {[
            { id:"arr-gray",  color:"#6b7280" },
            { id:"arr-red",   color:"#f87171" },
            { id:"arr-green", color:"#4ade80" },
          ].map(({ id, color }) => (
            <marker key={id} id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={color} />
            </marker>
          ))}
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => (
          <g key={i}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={getEdgeColor(e.type)}
              strokeWidth={e.type === "peer" ? 2.5 : 1.8}
              strokeDasharray={e.dash ? "5,3" : undefined}
              markerEnd={`url(#${getMarker(e.type)})`}
              opacity={0.8} />
            <text x={(e.x1+e.x2)/2} y={(e.y1+e.y2)/2 - 6}
              fill="#6b7280" fontSize="7" textAnchor="middle"
              style={{ pointerEvents:"none" }}>
              {e.label}
            </text>
          </g>
        ))}

        {/* Nodes */}
        {nodes.map(node => {
          const tip   = getTooltip(node);
          const isHov = hovered === node.id;
          return (
            <g key={node.id}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor:"pointer" }}>
              {isHov && (
                <circle cx={node.x} cy={node.y} r={node.r+8}
                  fill="none" stroke={node.stroke} strokeWidth="2" opacity="0.3" />
              )}
              {node.type === "user" && isFlagged && (
                <circle cx={node.x} cy={node.y} r={node.r+12}
                  fill="none" stroke="#ef4444"
                  strokeWidth="1.5" opacity="0.25" strokeDasharray="4,4"/>
              )}
              <circle cx={node.x} cy={node.y} r={node.r}
                fill={node.fill} stroke={node.stroke}
                strokeWidth={node.type==="user" ? 3 : 2}
                filter={isFlagged && node.type !== "ip" ? "url(#glow-red)" : undefined} />
              <text x={node.x} y={node.y-6}
                fill={node.type==="ip" ? "#93c5fd" : "#e2e8f0"}
                fontSize={node.type==="user" ? 10 : 8} fontWeight="bold"
                textAnchor="middle" style={{ pointerEvents:"none" }}>
                {node.label}
              </text>
              <text x={node.x} y={node.y+9}
                fill="#94a3b8" fontSize="7" textAnchor="middle"
                style={{ pointerEvents:"none" }}>
                {node.sub}
              </text>
              {tip.flag && node.type !== "ip" && (
                <g>
                  <circle cx={node.x+node.r-5} cy={node.y-node.r+5}
                    r="7" fill="#ef4444" stroke="#1e1e2e" strokeWidth="1.5"/>
                  <text x={node.x+node.r-5} y={node.y-node.r+9}
                    fill="white" fontSize="8" textAnchor="middle"
                    style={{ pointerEvents:"none" }}>!</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Hover Tooltip */}
        {hovered && (() => {
          const node = nodes.find(n => n.id === hovered);
          if (!node) return null;
          const tip = getTooltip(node);
          const tx  = node.x > 380 ? node.x - 115 : node.x + node.r + 8;
          const ty  = node.y - 20;
          return (
            <g style={{ pointerEvents:"none" }}>
              <rect x={tx} y={ty} width={110} height={48}
                rx="6" fill="#1e293b" stroke={node.stroke} strokeWidth="1" opacity="0.97"/>
              <text x={tx+8} y={ty+15} fill="#f1f5f9" fontSize="9" fontWeight="bold">{tip.title}</text>
              <text x={tx+8} y={ty+28} fill="#94a3b8" fontSize="8">{tip.detail}</text>
              <text x={tx+8} y={ty+41}
                fill={tip.flag ? "#f87171" : "#4ade80"}
                fontSize="8" fontWeight="bold">
                {tip.flag ? "⚠ FRAUD SIGNAL" : "✓ CLEAR"}
              </text>
            </g>
          );
        })()}

        {/* Cluster Score Badge */}
        <rect x="10" y="10" width="130" height="32" rx="8"
          fill={isFlagged ? "#7f1d1d" : "#14532d"}
          stroke={isFlagged ? "#ef4444" : "#22c55e"}
          strokeWidth="1.5" opacity="0.9"/>
        <text x="20" y="21" fill="#94a3b8" fontSize="8">Cluster Fraud Score</text>
        <text x="20" y="36"
          fill={isFlagged ? "#fca5a5" : "#86efac"}
          fontSize="13" fontWeight="bold">
          {(score*100).toFixed(1)}%
          <tspan fontSize="9" fill={isFlagged ? "#f87171" : "#4ade80"} dx="4">
            {isFlagged ? "⚠ FLAGGED" : "✓ CLEAR"}
          </tspan>
        </text>

        {/* Legend */}
        {[
          { cx:370, fill:"#4c1d95", stroke:"#a78bfa", label:"Target User" },
          { cx:415, fill:isFlagged?"#7f1d1d":"#14532d", stroke:nodeColor, label:isFlagged?"Fraud Node":"Safe Node" },
          { cx:460, fill:"#1e3a5f", stroke:"#60a5fa", label:"IP Node" },
        ].map(({ cx, fill, stroke, label }) => (
          <g key={label}>
            <circle cx={cx} cy="275" r="7" fill={fill} stroke={stroke} strokeWidth="1.5"/>
            <text x={cx} y="289" fill="#6b7280" fontSize="7" textAnchor="middle">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [tab, setTab]                   = useState("overview");
  const [selectedCase, setSelectedCase] = useState(CASES[0]);
  const [simActive, setSimActive]       = useState(false);
  const [simCase, setSimCase]           = useState(CASES[0]);
  const [simDone, setSimDone]           = useState(false);
  const [logFilter, setLogFilter]       = useState("ALL");
  const [apiResult, setApiResult] = useState(null);

  const sim = useSimulation(simActive, simCase);

  useEffect(() => {
    if (sim.progress >= 100) { setSimActive(false); setSimDone(true); }
  }, [sim.progress]);

  const handleStartSim = () => { setSimDone(false); setSimActive(true); };

  const C        = selectedCase;
  const base     = 0.60 * C.engine_a.score + 0.40 * C.engine_b.score;
  const simPen   = C.sim_match  ? 0    : 0.10;
  const cpPen    = C.copy_paste ? 0.08 : 0;
  const rawFinal = base + simPen + cpPen;

  const scoreBarData = [
    { name: "Engine A",    score: C.engine_a.score,           fill: "#a78bfa" },
    { name: "Engine B",    score: C.engine_b.score,           fill: "#60a5fa" },
    { name: "SIM Penalty", score: simPen,                     fill: "#f87171" },
    { name: "CopyPaste",   score: cpPen,                      fill: "#fb923c" },
    { name: "Final",       score: Math.min(C.final_score, 1), fill: C.color   },
  ];

  const filteredLogs = logFilter === "ALL"
    ? AUDIT_LOGS
    : AUDIT_LOGS.filter(l => l.level === logFilter);

  const logStyle = {
    INFO: { text: "text-blue-400",   bg: "bg-blue-950",   badge: "bg-blue-900 text-blue-300" },
    WARN: { text: "text-yellow-400", bg: "bg-yellow-950", badge: "bg-yellow-900 text-yellow-300" },
    CRIT: { text: "text-red-400",    bg: "bg-red-950",    badge: "bg-red-900 text-red-300" },
  };

  // ── Custom tooltip for score bar ─────────────────────────────────────────
  const ScoreBarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">
        <div className="text-gray-300 font-semibold">{payload[0].payload.name}</div>
        <div className="text-white font-bold">{(payload[0].value * 100).toFixed(2)}%</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── HEADER ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐴</span>
          <div>
            <div className="text-sm font-black tracking-tight">Red Horse Project</div>
            <div className="text-xs text-gray-500 hidden md:block">
              Predictive Anti-Fraud & Network Surveillance System
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex gap-1">
            {CASES.map(c => (
              <button key={c.id} onClick={() => setSelectedCase(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  selectedCase.id === c.id
                    ? `${c.bgColor} ${c.borderColor} ${c.textColor}`
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}>
                {c.action_icon} {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-2 sticky top-14 z-10">
        <div className="flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                tab === t.id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="p-4 max-w-6xl mx-auto space-y-4 pb-12">

        {/* ════════ TAB: OVERVIEW ════════ */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Final Score", value: (Math.min(C.final_score,1)*100).toFixed(0)+"%", color: C.textColor, sub: C.risk+" RISK" },
                { label: "Engine A",    value: (C.engine_a.score*100).toFixed(1)+"%", color: "text-purple-400", sub: "Statistical" },
                { label: "Engine B",    value: (C.engine_b.score*100).toFixed(1)+"%", color: "text-blue-400",   sub: "GNN Graph" },
                { label: "P(Mule)",     value: (C.engine_a.bayesian*100).toFixed(2)+"%",
                  color: C.engine_a.bayesian_flagged ? "text-red-400" : "text-green-400", sub: "Bayesian" },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-xs text-gray-600">{sub}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
                <ScoreGauge score={C.final_score} />
                <div className="text-center mt-2">
                  <div className="font-bold text-sm" style={{ color: C.color }}>{C.risk} RISK</div>
                  <div className="text-xs text-gray-500">{C.label} · {C.occupation} · Age {C.age} · {C.channel}</div>
                </div>
              </div>
              <div className="space-y-3">
                <PolicyBanner c={C} />
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Signal Flags</div>
                  {[
                    { label: "Keystroke Variance σ²",  val: C.engine_a.variance_flagged },
                    { label: "Benford's Deviation",     val: C.engine_a.benford_flagged },
                    { label: "Bayesian P(Mule)",        val: C.engine_a.bayesian_flagged },
                    { label: "GNN Cluster Match",       val: C.engine_b.flagged },
                    { label: "SIM Card Mismatch",       val: !C.sim_match },
                    { label: "Copy-Paste Detected",     val: C.copy_paste },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-xs text-gray-400">{label}</span>
                      <Badge flagged={val} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <SectionTitle icon="🎯" title="Population Scatter — Variance vs P(Mule)"
                subtitle="Current user (yellow) plotted against 120 simulated accounts" />
              <ResponsiveContainer width="100%" height={210}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" dataKey="x" name="σ²" tick={{ fill:"#9ca3af", fontSize:10 }}
                    label={{ value:"Keystroke Variance σ²", position:"insideBottom", fill:"#6b7280", fontSize:10, dy:4 }} />
                  <YAxis type="number" dataKey="y" name="P(Mule)" domain={[0,1]}
                    tick={{ fill:"#9ca3af", fontSize:10 }} tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
                  <ZAxis type="number" dataKey="z" range={[20,90]} />
                  <Tooltip contentStyle={{ background:"#111827", border:"1px solid #374151", fontSize:11, borderRadius:8 }}
                    formatter={(v,n) => n==="P(Mule)" ? `${(v*100).toFixed(1)}%` : v.toFixed(2)} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Scatter name="Legitimate"   data={SCATTER_POPULATION.filter(d=>d.type==="legit")}  fill="#22c55e" opacity={0.4} />
                  <Scatter name="Known Fraud"  data={SCATTER_POPULATION.filter(d=>d.type==="fraud")}  fill="#ef4444" opacity={0.7} />
                  <Scatter name="Current User" data={[{ x:C.engine_a.typing_variance, y:C.engine_a.bayesian, z:90 }]} fill="#facc15" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ════════ TAB: ENGINE A ════════ */}
        {tab === "engine_a" && (
          <>
            <SectionTitle icon="🧠" title="Engine A — Statistical Anomaly & Bayesian Inference"
              subtitle="Metric 1: Keystroke σ²  |  Metric 2: Bayesian P(Mule|B)  |  Metric 3: Benford's Law" />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Typing Variance σ²" value={C.engine_a.typing_variance.toFixed(2)} unit="ms²"
                flagged={C.engine_a.variance_flagged} sub="Threshold: 15 ms²" />
              <MetricCard label="Benford TVD"         value={C.engine_a.benford_deviation.toFixed(4)}
                flagged={C.engine_a.benford_flagged}  sub="Threshold: 0.15" />
              <MetricCard label="P(Mule|Behavior)"   value={(C.engine_a.bayesian*100).toFixed(2)} unit="%"
                flagged={C.engine_a.bayesian_flagged} sub="Bayesian posterior" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">Metric 1 — Keystroke Interval Pattern</div>
              <div className="text-xs text-gray-500 mb-3 font-mono">σ² = (1/N) Σ(tᵢ − μ)²</div>
              <ResponsiveContainer width="100%" height={185}>
                <LineChart data={C.keystroke.map((v,i) => ({ key:i+1, interval:v }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="key" tick={{ fill:"#9ca3af", fontSize:10 }} />
                  <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} domain={[0,380]} />
                  <Tooltip contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                  <ReferenceLine y={160} stroke="#22c55e" strokeDasharray="5 3"
                    label={{ value:"Human avg 160ms", fill:"#22c55e", fontSize:9, position:"right" }} />
                  <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="5 3"
                    label={{ value:"Flag threshold", fill:"#f59e0b", fontSize:9, position:"right" }} />
                  <Line type="monotone" dataKey="interval" stroke={C.color} strokeWidth={2.5}
                    dot={{ r:3, fill:C.color }} name="Interval (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">Metric 3 — Benford's Law Deviation</div>
              <div className="text-xs text-gray-500 mb-3 font-mono">P(d) = log₁₀(1 + 1/d)  ·  TVD = 0.5 × Σ|Obs − Exp|</div>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={BENFORD_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="digit" tick={{ fill:"#9ca3af", fontSize:11 }} />
                  <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} unit="%" />
                  <Tooltip contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar dataKey="expected" name="Benford Expected %" fill="#60a5fa" radius={[4,4,0,0]} />
                  <Bar dataKey="observed" name="Observed %"         fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">Metric 2 — Bayesian Update Chain</div>
              <div className="text-xs text-gray-500 mb-3 font-mono">P(Mule|B) = P(B|Mule)·P(Mule) / P(B) — sequential per trigger</div>
              <ResponsiveContainer width="100%" height={185}>
                <LineChart data={BAYES_CHAIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="step" tick={{ fill:"#9ca3af", fontSize:9 }} />
                  <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} domain={[0,1]}
                    tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
                  <Tooltip formatter={v=>`${(v*100).toFixed(2)}%`}
                    contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                  <ReferenceLine y={0.65} stroke="#f59e0b" strokeDasharray="4 4"
                    label={{ value:"Flag 65%", fill:"#f59e0b", fontSize:9, position:"right" }} />
                  <Line type="monotone" dataKey="prob" stroke="#a78bfa" strokeWidth={2.5}
                    dot={{ r:4, fill:"#a78bfa" }} name="P(Mule)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ════════ TAB: ENGINE B ════════ */}
        {tab === "engine_b" && (
          <>
            <SectionTitle icon="🕸️" title="Engine B — Graph Neural Network Fraud Detection"
              subtitle="Heterogeneous Graph · Blacklist Match · Isolation Forest Anomaly" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Cluster Score"  value={C.engine_b.cluster_score.toFixed(4)} flagged={C.engine_b.flagged} sub="Threshold: 0.60" />
              <MetricCard label="Graph Nodes"    value={C.engine_b.nodes}  flagged={false} sub="User · Device · IP" />
              <MetricCard label="Graph Edges"    value={C.engine_b.edges}  flagged={false} sub="Relationships" />
              <MetricCard label="Engine B Score" value={(C.engine_b.score*100).toFixed(1)+"%"} flagged={C.engine_b.flagged} sub="Normalized" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-1">Heterogeneous Graph — Fraud Ring Topology</div>
              <div className="text-xs text-gray-500 mb-3">
                (u:User)-[:USED_DEVICE]-&gt;(d:Device) · (u)-[:CONNECTED_FROM]-&gt;(i:IP)
              </div>
              <svg viewBox="0 0 520 280" className="w-full" style={{ maxHeight:250 }}>
                <line x1="260" y1="135" x2="155" y2="52"  stroke="#6b7280" strokeWidth="1.5" strokeDasharray="5,3"/>
                <line x1="260" y1="135" x2="388" y2="52"  stroke="#6b7280" strokeWidth="1.5" strokeDasharray="5,3"/>
                <line x1="260" y1="135" x2="95"  y2="222" stroke={C.color} strokeWidth="2.5"/>
                <line x1="260" y1="135" x2="425" y2="222" stroke={C.color} strokeWidth="2.5"/>
                <line x1="95"  y1="222" x2="155" y2="52"  stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3"/>
                <line x1="425" y1="222" x2="155" y2="52"  stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3"/>
                <text x="188" y="80"  fill="#9ca3af" fontSize="8" textAnchor="middle">USED_DEVICE</text>
                <text x="338" y="80"  fill="#9ca3af" fontSize="8" textAnchor="middle">CONNECTED_FROM</text>
                <text x="145" y="192" fill="#f87171" fontSize="8" textAnchor="middle">SHARES_WITH</text>
                <text x="368" y="192" fill="#f87171" fontSize="8" textAnchor="middle">SHARES_WITH</text>
                <circle cx="155" cy="52" r="32" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2.5"/>
                <text x="155" y="48" fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle">📵 DEVICE</text>
                <text x="155" y="62" fill="#fca5a5" fontSize="7" textAnchor="middle">IMEI_FRAUD_001</text>
                <circle cx="388" cy="52" r="30" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2"/>
                <text x="388" y="48" fill="#93c5fd" fontSize="9" fontWeight="bold" textAnchor="middle">🌐 IP</text>
                <text x="388" y="62" fill="#93c5fd" fontSize="7" textAnchor="middle">10.0.0.1</text>
                <circle cx="260" cy="135" r="40" fill="#4c1d95" stroke="#a78bfa" strokeWidth="3"/>
                <text x="260" y="128" fill="#c4b5fd" fontSize="11" fontWeight="bold" textAnchor="middle">👤 TARGET</text>
                <text x="260" y="143" fill="#c4b5fd" fontSize="7" textAnchor="middle">{C.label}</text>
                <text x="260" y="158" fill={C.color} fontSize="9" fontWeight="bold" textAnchor="middle">{C.risk} RISK</text>
                <circle cx="95"  cy="222" r="30" fill={C.risk==="LOW"?"#14532d":"#7f1d1d"} stroke={C.color} strokeWidth="2"/>
                <text x="95"  y="218" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle">👤 PEER A</text>
                <text x="95"  y="232" fill="#fca5a5" fontSize="7" textAnchor="middle">fraud-ring-A</text>
                <circle cx="425" cy="222" r="30" fill={C.risk==="LOW"?"#14532d":"#7f1d1d"} stroke={C.color} strokeWidth="2"/>
                <text x="425" y="218" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle">👤 PEER B</text>
                <text x="425" y="232" fill="#fca5a5" fontSize="7" textAnchor="middle">fraud-ring-B</text>
                <rect x="10" y="262" width="10" height="10" fill="#7f1d1d" stroke="#ef4444" rx="2"/>
                <text x="24" y="271" fill="#9ca3af" fontSize="9">Fraud Node</text>
                <rect x="95" y="262" width="10" height="10" fill="#4c1d95" stroke="#a78bfa" rx="2"/>
                <text x="109" y="271" fill="#9ca3af" fontSize="9">Target</text>
                <line x1="175" y1="267" x2="190" y2="267" stroke={C.color} strokeWidth="2"/>
                <text x="193" y="271" fill="#9ca3af" fontSize="9">Active Edge</text>
              </svg>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-3">Engine B Score Components</div>
              <ProgressBar label="🔴 Blacklist Match (IMEI + IP)"    value={C.risk==="HIGH"?0.55:0.00} color="#ef4444" sub="Weight: 50% — Hard evidence, highest priority" />
              <ProgressBar label="📡 Graph Centrality (Betweenness)" value={C.risk==="HIGH"?0.22:C.risk==="MEDIUM"?0.08:0.02} color="#f59e0b" sub="Weight: 30% — Hub in fraud ring topology" />
              <ProgressBar label="🌲 Isolation Forest Anomaly"       value={C.risk==="HIGH"?0.12:C.risk==="MEDIUM"?0.06:0.01} color="#60a5fa" sub="Weight: 20% — Statistical outlier detection" />
            </div>
          </>
        )}

        {/* ════════ TAB: FUSION ════════ */}
        {tab === "fusion" && (
          <>
            <SectionTitle icon="⚖️" title="Score Fusion & Policy Decision"
              subtitle="final = min(0.60 × Engine_A + 0.40 × Engine_B + penalties, 1.0)" />

            {/* Live Formula Card */}
            <div className="bg-gray-900 border border-purple-800 rounded-xl p-5 font-mono">
              <div className="text-purple-400 text-xs mb-3 uppercase tracking-wider font-bold">
                Live Calculation — {C.label} ({C.risk} RISK)
              </div>
              <div className="space-y-1.5 text-xs md:text-sm">
                                <div className="text-gray-300">
                  base &nbsp;&nbsp;= <span className="text-purple-400">0.60</span>
                  {" × "}<span className="text-purple-300">{C.engine_a.score.toFixed(4)}</span>
                  {" + "}<span className="text-blue-400">0.40</span>
                  {" × "}<span className="text-blue-300">{C.engine_b.score.toFixed(4)}</span>
                </div>
                <div className="text-gray-500 pl-8">
                  = {(0.60*C.engine_a.score).toFixed(4)} + {(0.40*C.engine_b.score).toFixed(4)}
                  {" = "}<span className="text-white font-bold">{base.toFixed(4)}</span>
                </div>
                <div className="text-gray-300 mt-2">
                  final = min(
                  <span className="text-white">{base.toFixed(4)}</span>
                  {" + "}<span className="text-red-400">{simPen.toFixed(2)}</span>
                  {" + "}<span className="text-orange-400">{cpPen.toFixed(2)}</span>
                  {", 1.0)"}
                </div>
                <div className="text-gray-500 pl-8">
                  = min(<span className="text-white">{rawFinal.toFixed(4)}</span>, 1.0)
                  {" = "}
                  <span style={{ color: C.color }} className="font-black text-base">
                    {Math.min(rawFinal, 1).toFixed(4)}
                  </span>
                  {rawFinal > 1 && (
                    <span className="text-gray-500 text-xs ml-2">← CAPPED AT 1.0</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pie + Bar Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-300 mb-3">Engine Weight Distribution</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={70}
                      dataKey="value" nameKey="name"
                      label={({ name, value }) => `${value}%`}
                      labelLine={{ stroke: "#6b7280" }} fontSize={11}>
                      {PIE_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }}
                      formatter={(v, n) => [`${v}%`, n]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-300 mb-3">Score Component Breakdown</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={scoreBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" domain={[0,1]} tick={{ fill:"#9ca3af", fontSize:10 }}
                      tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fill:"#d1d5db", fontSize:10 }} width={80} />
                    <Tooltip formatter={v=>`${(v*100).toFixed(2)}%`}
                      contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                    <Bar dataKey="score" radius={[0,4,4,0]}>
                      {scoreBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weight Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-3">Weighting Table</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2">Component</th>
                    <th className="text-center pb-2">Weight</th>
                    <th className="text-center pb-2">Raw Score</th>
                    <th className="text-right pb-2">Contribution</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    { name:"Engine A (Statistical)", w:"60%",    raw: C.engine_a.score.toFixed(4),  contrib:(0.60*C.engine_a.score).toFixed(4), color:"text-purple-400" },
                    { name:"Engine B (GNN Graph)",   w:"40%",    raw: C.engine_b.score.toFixed(4),  contrib:(0.40*C.engine_b.score).toFixed(4), color:"text-blue-400" },
                    { name:"SIM Mismatch Penalty",   w:"+fixed", raw:"—",                           contrib:"+"+simPen.toFixed(4),              color:"text-red-400" },
                    { name:"Copy-Paste Penalty",     w:"+fixed", raw:"—",                           contrib:"+"+cpPen.toFixed(4),               color:"text-orange-400" },
                  ].map(({ name, w, raw, contrib, color }) => (
                    <tr key={name} className="border-b border-gray-800">
                      <td className={`py-2 font-medium ${color}`}>{name}</td>
                      <td className="text-center py-2 font-mono">{w}</td>
                      <td className="text-center py-2 font-mono">{raw}</td>
                      <td className="text-right py-2 font-mono font-bold">{contrib}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="pt-3 text-white">Final Score (capped)</td>
                    <td className="text-center pt-3">—</td>
                    <td className="text-center pt-3">—</td>
                    <td className="text-right pt-3 text-base font-black" style={{ color: C.color }}>
                      {Math.min(rawFinal, 1).toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <PolicyBanner c={C} />

            {/* Threshold Reference */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-3">Policy Threshold Reference</div>
              <div className="space-y-2">
                {[
                  { range:"P ≥ 0.80",        action:"BLOCK + Physical KYC",    border:"border-red-700",    bg:"bg-red-950",    text:"text-red-300",    active: Math.min(rawFinal,1) >= 0.80 },
                  { range:"0.40 ≤ P < 0.80", action:"LIMIT ฿5,000 + Face MFA", border:"border-yellow-700", bg:"bg-yellow-950", text:"text-yellow-300", active: Math.min(rawFinal,1) >= 0.40 && Math.min(rawFinal,1) < 0.80 },
                  { range:"P < 0.40",        action:"ALLOW — Normal Profile",   border:"border-green-700",  bg:"bg-green-950",  text:"text-green-300",  active: Math.min(rawFinal,1) < 0.40 },
                ].map(({ range, action, border, bg, text, active }) => (
                  <div key={range}
                    className={`flex justify-between items-center rounded-lg border px-3 py-2 transition-all
                      ${border} ${bg} ${active ? "ring-2 ring-white ring-opacity-20" : "opacity-40"}`}>
                    <span className={`font-mono text-xs font-bold ${text}`}>{range}</span>
                    <span className={`text-xs ${text}`}>{active ? "👉 " : ""}{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════ TAB: 3 CASES ════════ */}
        {tab === "cases" && (
          <>
            <SectionTitle icon="🗂️" title="3-Case Comparison"
              subtitle="Side-by-side analysis of HIGH / MEDIUM / LOW risk profiles" />

            {/* Case Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {CASES.map(c => {
                const cBase = 0.60*c.engine_a.score + 0.40*c.engine_b.score;
                const cPen  = (!c.sim_match ? 0.10 : 0) + (c.copy_paste ? 0.08 : 0);
                return (
                  <div key={c.id}
                    className={`rounded-xl border-2 ${c.borderColor} ${c.bgColor} p-4 space-y-3
                      cursor-pointer transition-all hover:ring-2 hover:ring-white hover:ring-opacity-20
                      ${selectedCase.id === c.id ? "ring-2 ring-white ring-opacity-30" : ""}`}
                    onClick={() => setSelectedCase(c)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`text-xl font-black ${c.textColor}`}>{c.action_icon} {c.label}</div>
                        <div className="text-xs text-gray-400">{c.occupation} · Age {c.age} · {c.channel}</div>
                      </div>
                      <div className={`text-3xl font-black ${c.textColor}`}>
                        {(Math.min(c.final_score,1)*100).toFixed(0)}
                        <span className="text-sm">%</span>
                      </div>
                    </div>

                    <div className={`rounded-lg border ${c.borderColor} px-3 py-2 text-center`}>
                      <div className={`font-black text-sm ${c.textColor}`}>{c.action_label}</div>
                      <div className="text-xs text-gray-500 font-mono">{c.action}</div>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { label:"Engine A", val: c.engine_a.score, color:"#a78bfa" },
                        { label:"Engine B", val: c.engine_b.score, color:"#60a5fa" },
                        { label:"Final",    val: Math.min(c.final_score,1), color: c.color },
                      ].map(({ label, val, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>{label}</span>
                            <span className="font-mono" style={{ color }}>{(val*100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${val*100}%`, background:color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[
                        { label:"Variance σ²", val: c.engine_a.typing_variance.toFixed(1)+" ms²" },
                        { label:"Benford TVD", val: c.engine_a.benford_deviation.toFixed(3) },
                        { label:"P(Mule)",     val: (c.engine_a.bayesian*100).toFixed(1)+"%" },
                        { label:"GNN Score",   val: c.engine_b.cluster_score.toFixed(3) },
                        { label:"SIM Match",   val: c.sim_match ? "✅ Yes" : "❌ No" },
                        { label:"Copy-Paste",  val: c.copy_paste ? "❌ Yes" : "✅ No" },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-black bg-opacity-20 rounded px-2 py-1">
                          <div className="text-gray-500">{label}</div>
                          <div className="text-gray-200 font-semibold">{val}</div>
                        </div>
                      ))}
                    </div>

                    {selectedCase.id === c.id && (
                      <div className="text-center text-xs text-gray-500 pt-1">
                        ✦ Currently selected — switch tabs to see details
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comparison Bar Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-300 mb-3">Score Comparison — All 3 Cases</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { metric:"Engine A Score", A:0.9934, B:0.3840, C:0.0610 },
                  { metric:"Engine B Score", A:0.6632, B:0.2100, C:0.0400 },
                  { metric:"Final Score",    A:1.0000, B:0.4140, C:0.0530 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="metric" tick={{ fill:"#9ca3af", fontSize:10 }} />
                  <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} domain={[0,1]}
                    tickFormatter={v=>`${(v*100).toFixed(0)}%`} />
                  <Tooltip formatter={v=>`${(v*100).toFixed(2)}%`}
                    contentStyle={{ background:"#111827", border:"1px solid #374151", borderRadius:8, fontSize:11 }} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar dataKey="A" name="Case A (HIGH)"   fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="B" name="Case B (MEDIUM)" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="C" name="Case C (LOW)"    fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ════════ TAB: SIMULATION ════════ */}
        {tab === "simulation" && (
          <>
            <SectionTitle icon="🚀" title="Live Assessment Simulation"
              subtitle="Simulate real-time dual-engine pipeline execution" />

            {/* Case Selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                Select Case to Simulate
              </div>
              <div className="grid grid-cols-3 gap-3">
                {CASES.map(c => (
                  <button key={c.id} onClick={() => { setSimCase(c); setSimDone(false); }}
                    disabled={simActive}
                    className={`rounded-xl border-2 p-3 text-left transition-all
                      ${simCase.id === c.id ? `${c.bgColor} ${c.borderColor}` : "bg-gray-800 border-gray-700"}
                      ${simActive ? "opacity-50 cursor-not-allowed" : "hover:border-gray-500"}`}>
                    <div className={`text-sm font-bold ${c.textColor}`}>{c.action_icon} {c.label}</div>
                    <div className="text-xs text-gray-400">{c.risk} RISK</div>
                    <div className="text-xs font-mono text-gray-500 mt-1">
                      Final: {(Math.min(c.final_score,1)*100).toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Control + Progress */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-300">
                    Pipeline Execution — {simCase.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {simActive ? "Running..." : simDone ? "Completed ✅" : "Ready to start"}
                  </div>
                </div>
                <button onClick={handleStartSim} disabled={simActive}
                  className={`px-5 py-2 rounded-xl font-bold text-sm transition-all
                    ${simActive
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-purple-700 hover:bg-purple-600 text-white"}`}>
                  {simActive ? "⏳ Processing..." : simDone ? "🔄 Re-run" : "▶ Start Simulation"}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Pipeline Progress</span>
                  <span className="font-mono">{sim.progress.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${sim.progress}%`,
                      background: sim.progress >= 100
                        ? simCase.color
                        : "linear-gradient(90deg, #a78bfa, #60a5fa)"
                    }} />
                </div>
              </div>

              {/* Stage Label */}
              <div className="bg-gray-800 rounded-lg px-4 py-2 text-xs text-gray-300 font-mono min-h-8 flex items-center">
                {simActive || simDone
                  ? `[Stage ${sim.stageIdx + 1}/11] ${["📥 Receiving payload...","🔍 Validating KYC data...","⌨️ Computing keystroke variance σ²...","🧠 Running Bayesian inference...","📊 Checking Benford's Law deviation...","🕸️ Building GNN heterogeneous graph...","🔴 Querying IMEI & IP blacklists...","🌲 Running Isolation Forest...","⚖️ Fusing engine scores...","🚨 Applying policy engine thresholds...","✅ Assessment complete!"][sim.stageIdx]}`
                  : "Awaiting start command..."}
              </div>
            </div>

            {/* Live Score Display */}
            {(simActive || simDone) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Live Risk Score", value:(sim.liveScore*100).toFixed(1)+"%",   color: simCase.color },
                  { label:"Engine A",        value:(simCase.engine_a.score*100*Math.min(sim.progress/100,1)).toFixed(1)+"%", color:"#a78bfa" },
                  { label:"Engine B",        value:(simCase.engine_b.score*100*Math.min(sim.progress/100,1)).toFixed(1)+"%", color:"#60a5fa" },
                  { label:"Status",          value: simDone ? simCase.action_label : "PROCESSING", color: simDone ? simCase.color : "#9ca3af" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className="text-xl font-black" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Result after done */}
            {simDone && (
              <div>
                <PolicyBanner c={simCase} />
                <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">
                    Final Assessment Result
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { k:"user_id",    v: simCase.id },
                      { k:"risk_level", v: simCase.risk },
                      { k:"final_score",v: Math.min(simCase.final_score,1).toFixed(4) },
                      { k:"action",     v: simCase.action },
                      { k:"engine_a",   v: simCase.engine_a.score.toFixed(4) },
                      { k:"engine_b",   v: simCase.engine_b.score.toFixed(4) },
                    ].map(({ k, v }) => (
                      <div key={k} className="bg-gray-800 rounded-lg px-3 py-2 font-mono">
                        <span className="text-gray-500">{k}: </span>
                        <span className="text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: AUDIT LOG ════════ */}
        {tab === "audit" && (
          <>
            <SectionTitle icon="📋" title="Audit Log"
              subtitle="Real-time processing trace from all pipeline stages" />

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              {["ALL","INFO","WARN","CRIT"].map(f => (
                <button key={f} onClick={() => setLogFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    logFilter === f
                      ? f === "CRIT" ? "bg-red-900 border-red-600 text-red-300"
                        : f === "WARN" ? "bg-yellow-900 border-yellow-600 text-yellow-300"
                        : f === "INFO" ? "bg-blue-900 border-blue-600 text-blue-300"
                        : "bg-purple-900 border-purple-600 text-purple-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}>
                  {f === "CRIT" ? "🔴" : f === "WARN" ? "🟡" : f === "INFO" ? "🔵" : "📋"} {f}
                  {" "}({f === "ALL" ? AUDIT_LOGS.length : AUDIT_LOGS.filter(l=>l.level===f).length})
                </button>
              ))}
            </div>

            {/* Log Entries */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400 ml-2 font-mono">red_horse.log — {filteredLogs.length} entries</span>
              </div>
              <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                {filteredLogs.map((log, i) => {
                  const s = logStyle[log.level];
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors`}>
                      <span className="text-gray-600 font-mono text-xs shrink-0 mt-0.5">{log.time}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${
                        log.level === "CRIT" ? "bg-red-900 text-red-300"
                        : log.level === "WARN" ? "bg-yellow-900 text-yellow-300"
                        : "bg-blue-900 text-blue-300"}`}>
                        {log.level}
                      </span>
                      <span className="text-purple-400 font-mono text-xs shrink-0">[{log.engine}]</span>
                      <span className={`text-xs font-mono ${
                        log.level === "CRIT" ? "text-red-300"
                        : log.level === "WARN" ? "text-yellow-300"
                        : "text-gray-300"}`}>
                        {log.msg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:"INFO",  count: AUDIT_LOGS.filter(l=>l.level==="INFO").length, color:"text-blue-400",   bg:"bg-blue-950",   border:"border-blue-800" },
                { label:"WARN",  count: AUDIT_LOGS.filter(l=>l.level==="WARN").length, color:"text-yellow-400", bg:"bg-yellow-950", border:"border-yellow-800" },
                { label:"CRIT",  count: AUDIT_LOGS.filter(l=>l.level==="CRIT").length, color:"text-red-400",    bg:"bg-red-950",    border:"border-red-800" },
              ].map(({ label, count, color, bg, border }) => (
                <div key={label} className={`rounded-xl border ${border} ${bg} p-4 text-center`}>
                  <div className="text-xs text-gray-400 mb-1">{label} Events</div>
                  <div className={`text-3xl font-black ${color}`}>{count}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════ TAB: ASSESS (Real Backend) ════════ */}
        {tab === "assess" && (
          <div className="space-y-4">
            <SectionTitle icon="🔬" title="Live Assessment — Real Backend"
              subtitle="กรอกข้อมูลแล้วส่งไปคำนวณที่ FastAPI Backend จริง (localhost:8000)" />

            <AssessForm onResult={(result) => setApiResult(result)} />

            {apiResult && (
              <div className="space-y-3">

                {/* KPI Row */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                    📊 Real API Response
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label:"Final Score",
                        value:(apiResult.risk_breakdown.final_score*100).toFixed(1)+"%",
                        color: apiResult.risk_breakdown.final_score>=0.8 ? "text-red-400"
                          : apiResult.risk_breakdown.final_score>=0.4 ? "text-yellow-400"
                          : "text-green-400" },
                      { label:"Engine A",
                        value:(apiResult.risk_breakdown.engine_a_score*100).toFixed(1)+"%",
                        color:"text-purple-400" },
                      { label:"Engine B",
                        value:(apiResult.risk_breakdown.engine_b_score*100).toFixed(1)+"%",
                        color:"text-blue-400" },
                      { label:"P(Mule)",
                        value:(apiResult.engine_a.bayesian_mule_probability*100).toFixed(2)+"%",
                        color: apiResult.engine_a.bayesian_flagged ? "text-red-400" : "text-green-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className={`text-xl font-black ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Gauge + Signal Flags */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
                    <ScoreGauge score={apiResult.risk_breakdown.final_score} />
                    <div className="text-center mt-2">
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        user_id: {apiResult.user_id}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                      Signal Flags
                    </div>
                    {[
                      { label:"Keystroke Variance σ²",  val: apiResult.engine_a.variance_flagged,
                        detail: `σ² = ${apiResult.engine_a.typing_variance.toFixed(4)} ms²` },
                      { label:"Benford's Law Deviation", val: apiResult.engine_a.benford_flagged,
                        detail: `TVD = ${apiResult.engine_a.benford_deviation.toFixed(4)}` },
                      { label:"Bayesian P(Mule)",        val: apiResult.engine_a.bayesian_flagged,
                        detail: `P = ${(apiResult.engine_a.bayesian_mule_probability*100).toFixed(2)}%` },
                      { label:"GNN Cluster Match",       val: apiResult.engine_b.cluster_flagged,
                        detail: `score = ${apiResult.engine_b.cluster_fraud_score.toFixed(4)}` },
                    ].map(({ label, val, detail }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
                        <div>
                          <div className="text-xs text-gray-400">{label}</div>
                          <div className="text-xs text-gray-600 font-mono">{detail}</div>
                        </div>
                        <Badge flagged={val} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                    Score Breakdown
                  </div>
                  <ProgressBar
                    label={`Engine A (60%) — ${(apiResult.risk_breakdown.engine_a_score*100).toFixed(1)}%`}
                    value={apiResult.risk_breakdown.engine_a_score} color="#a78bfa"
                    sub="Statistical · Keystroke · Bayesian · Benford" />
                  <ProgressBar
                    label={`Engine B (40%) — ${(apiResult.risk_breakdown.engine_b_score*100).toFixed(1)}%`}
                    value={apiResult.risk_breakdown.engine_b_score} color="#60a5fa"
                    sub="GNN Graph · Blacklist · Isolation Forest" />
                  <ProgressBar
                    label={`SIM Mismatch Penalty — ${(apiResult.risk_breakdown.sim_mismatch_penalty*100).toFixed(0)}%`}
                    value={apiResult.risk_breakdown.sim_mismatch_penalty} color="#f87171"
                    sub="Fixed +0.10 if SIM owner mismatch" />
                  <ProgressBar
                    label={`Copy-Paste Penalty — ${(apiResult.risk_breakdown.copy_paste_penalty*100).toFixed(0)}%`}
                    value={apiResult.risk_breakdown.copy_paste_penalty} color="#fb923c"
                    sub="Fixed +0.08 if clipboard paste detected" />
                  <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-semibold">Final Score (capped at 1.0)</span>
                    <span className="text-lg font-black" style={{
                      color: apiResult.risk_breakdown.final_score >= 0.8 ? "#ef4444"
                        : apiResult.risk_breakdown.final_score >= 0.4 ? "#f59e0b" : "#22c55e"
                    }}>
                      {(apiResult.risk_breakdown.final_score * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Policy Banner */}
                <div className={`rounded-xl border-2 p-4
                  ${apiResult.policy.action === "BLOCK_OUTBOUND_TRANSACTION"
                    ? "border-red-600 bg-red-950"
                    : apiResult.policy.action === "LIMIT_TRANSACTION_CAP"
                    ? "border-yellow-600 bg-yellow-950"
                    : "border-green-600 bg-green-950"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">
                      {apiResult.policy.action === "BLOCK_OUTBOUND_TRANSACTION" ? "🚫"
                        : apiResult.policy.action === "LIMIT_TRANSACTION_CAP" ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <div className={`text-lg font-black
                        ${apiResult.policy.action === "BLOCK_OUTBOUND_TRANSACTION" ? "text-red-400"
                          : apiResult.policy.action === "LIMIT_TRANSACTION_CAP" ? "text-yellow-400"
                          : "text-green-400"}`}>
                        {apiResult.policy.action}
                      </div>
                      <div className="text-xs text-gray-400">{apiResult.policy.reason}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {apiResult.policy.require_kyc && (
                      <span className="px-3 py-1 rounded-full bg-red-900 text-red-300 text-xs font-bold">
                        🏦 {apiResult.policy.require_kyc}
                      </span>
                    )}
                    {apiResult.policy.max_amount_per_day && (
                      <span className="px-3 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs font-bold">
                        💰 Max ฿{apiResult.policy.max_amount_per_day.toLocaleString()}/day
                      </span>
                    )}
                    {apiResult.policy.require_mfa && (
                      <span className="px-3 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs font-bold">
                        👤 {apiResult.policy.require_mfa}
                      </span>
                    )}
                  </div>
                </div>

                {/* GNN Graph Visualization */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">
                    🕸️ GNN Graph Visualization
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label:"Graph Nodes",   value: apiResult.engine_b.graph_node_count, color:"text-cyan-400" },
                      { label:"Graph Edges",   value: apiResult.engine_b.graph_edge_count, color:"text-cyan-400" },
                      { label:"Cluster Score", value: apiResult.engine_b.cluster_fraud_score.toFixed(4),
                        color: apiResult.engine_b.cluster_flagged ? "text-red-400" : "text-green-400" },
                      { label:"Status",        value: apiResult.engine_b.cluster_flagged ? "FLAGGED" : "CLEAR",
                        color: apiResult.engine_b.cluster_flagged ? "text-red-400" : "text-green-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className={`text-lg font-black ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <GNNGraphViz result={apiResult} />
                </div>


                {/* Raw JSON */}
                <details className="bg-gray-900 border border-gray-800 rounded-xl">
                  <summary className="px-4 py-3 text-xs text-gray-400 cursor-pointer hover:text-white select-none">
                    📄 Raw JSON Response — คลิกเพื่อดู/ซ่อน
                  </summary>
                  <pre className="px-4 pb-4 text-xs text-green-400 overflow-auto max-h-64 leading-relaxed">
                    {JSON.stringify(apiResult, null, 2)}
                  </pre>
                </details>

              </div>
            )}
          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        🐴 Red Horse Project · Predictive Anti-Fraud & Network Surveillance System · v1.0.0
      </div>

    </div>
  );
}
