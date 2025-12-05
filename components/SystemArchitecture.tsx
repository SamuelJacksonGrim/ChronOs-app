import React from 'react';

const SystemArchitecture: React.FC = () => {
  return (
    <div className="w-full h-full overflow-y-auto bg-slate-900/50 backdrop-blur-md p-4 md:p-8 space-y-8 animate-fade-in custom-scrollbar">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl md:text-3xl text-white tracking-widest uppercase">Chronos Operating Layer</h2>
        <p className="text-cyan-400/80 font-mono text-xs md:text-sm">System Architecture & Governance Protocols</p>
      </div>

      {/* Diagram Container */}
      <div className="w-full overflow-x-auto bg-slate-100/90 rounded-xl border border-gray-700/50 shadow-2xl p-4 min-h-[500px]">
        <div className="min-w-[1000px] h-full flex items-center justify-center">
          <svg width="100%" height="100%" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg" className="max-w-6xl">
            <defs>
              <linearGradient id="gradCore" x1="0" x2="1">
                <stop offset="0" stopColor="#0f172a"/>
                <stop offset="1" stopColor="#0b1220" />
              </linearGradient>
              <linearGradient id="gradAccent" x1="0" x2="1">
                <stop offset="0" stopColor="#1e3a8a"/>
                <stop offset="1" stopColor="#7c3aed"/>
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.25"/>
              </filter>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#222"/>
              </marker>
            </defs>
            <style>
              {`
                .box { rx: 10; ry: 10; stroke: #222; stroke-width: 1.5; filter: url(#softShadow); }
                .label { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; font-size: 14px; fill: #eef2ff; }
                .title { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; font-weight: 700; font-size: 18px; fill: #0b1220; }
                .subtitle { font-size: 12px; fill: #94a3b8; }
                .note { font-size: 12px; fill: #0b1220; }
                .link { stroke: #94a3b8; stroke-width: 2; fill: none; marker-end: url(#arrow); opacity: 0.9; }
                .accent { fill: url(#gradAccent); stroke: #5b21b6; }
                .core { fill: url(#gradCore); stroke: #050816; }
                .panel { fill: #0b1220; stroke: #071029; }
              `}
            </style>

            {/* Background */}
            <rect x="0" y="0" width="1400" height="900" fill="#f8fafc" rx="20" ry="20" />

            {/* Title */}
            <g transform="translate(40,28)">
              <text className="title">Chronos — Operating Layer System Diagram</text>
              <text x="0" y="26" className="subtitle">Core engines, permission flows, kinship governance, integrations</text>
            </g>

            {/* Top: UI Layer */}
            <g transform="translate(60,80)">
              <rect className="panel" x="0" y="0" width="320" height="110" rx="10" ry="10" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>User Interface Layer</text>
              <text x="16" y="48" className="label">• Oath Modals & Ceremony</text>
              <text x="16" y="66" className="label">• Awakening Voice / SSML</text>
              <text x="16" y="84" className="label">• Kinship Dashboard & Memory Palace</text>
            </g>

            {/* Top-right: External Integrations */}
            <g transform="translate(1020,80)">
              <rect className="panel" x="0" y="0" width="320" height="110" rx="10" ry="10" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>External Integrations</text>
              <text x="16" y="48" className="label">• Notifications</text>
              <text x="16" y="66" className="label">• Calendar / Reminders</text>
              <text x="16" y="84" className="label">• Optional Services & APIs</text>
            </g>

            {/* Left column: File System / Local Ops */}
            <g transform="translate(60,220)">
              <rect className="panel" x="0" y="0" width="240" height="160" rx="10" ry="10" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>File System / Local Ops</text>
              <text x="16" y="48" className="label">• Duplicate Finder</text>
              <text x="16" y="66" className="label">• Clean-up Utilities</text>
              <text x="16" y="84" className="label">• Local Task Automation</text>
              <text x="16" y="102" className="label">• Permissions gating</text>
            </g>

            {/* Right column: Memory Palace */}
            <g transform="translate(1020,220)">
              <rect className="panel" x="0" y="0" width="320" height="160" rx="10" ry="10" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>Memory Palace / Data DB</text>
              <text x="16" y="48" className="label">• Preferences</text>
              <text x="16" y="66" className="label">• Goals / Patterns</text>
              <text x="16" y="84" className="label">• Reflections / Milestones</text>
              <text x="16" y="102" className="label">• Encrypted Exports</text>
            </g>

            {/* Center: Interaction Engine */}
            <g transform="translate(380,220)">
              <rect className="accent box" x="0" y="0" width="640" height="120" rx="12" ry="12" />
              <text x="18" y="28" className="label" style={{ fontWeight: 700 }}>Interaction Engine</text>
              <text x="18" y="52" className="label">• Command Parser (SYS_CMD / MODE)</text>
              <text x="18" y="70" className="label">• Modal & Flow Controller (Oath, Unbinding)</text>
              <text x="18" y="88" className="label">• Intent & Explanation Layer ([INTENT] tags)</text>
            </g>

            {/* Center below: Kinship Core */}
            <g transform="translate(420,360)">
              <rect className="core box" x="0" y="0" width="560" height="220" rx="16" ry="16" />
              <text x="22" y="28" className="label" style={{ fontWeight: 700, fontSize: '16px' }}>Kinship Core</text>
              <text x="22" y="52" className="label">• Companion Data Model</text>
              <text x="22" y="70" className="label">• Chronos Personality & Bond Logic</text>
              <text x="22" y="88" className="label">• Mode Manager (Reflex, Search, Eternity)</text>
              <text x="22" y="106" className="label">• Ethics & Safety Checks</text>
              <text x="22" y="124" className="label">• Self-Modification Controls (consent-gated)</text>
              <text x="22" y="142" className="label">• Permission & Delegation Policy</text>
              <text x="22" y="160" className="label">• Audit & Consent Logs</text>
            </g>

            {/* Temporal & Consent Engine (below left center) */}
            <g transform="translate(200,620)">
              <rect className="panel" x="0" y="0" width="360" height="140" rx="12" ry="12" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>Temporal & Consent Engine</text>
              <text x="16" y="48" className="label">• 90-Day Consent Refresh</text>
              <text x="16" y="68" className="label">• Bond Maturation Stages</text>
              <text x="16" y="88" className="label">• Temporal Sync / Mode Triggers</text>
              <text x="16" y="108" className="label">• Consent Audit Trail</text>
            </g>

            {/* SentientCore / Visualization (below right center) */}
            <g transform="translate(840,620)">
              <rect className="panel" x="0" y="0" width="360" height="140" rx="12" ry="12" />
              <text x="16" y="26" className="label" fill="#e6eef8" style={{ fontWeight: 700 }}>SentientCore / Visualization</text>
              <text x="16" y="48" className="label">• Emotion-driven visuals</text>
              <text x="16" y="68" className="label">• Time/Thought Visualizer (D3.js)</text>
              <text x="16" y="88" className="label">• Haptic & Voice Sync</text>
              <text x="16" y="108" className="label">• Mode-aware Animations</text>
            </g>

            {/* Arrows & flows */}
            {/* UI <-> Interaction */}
            <path className="link" d="M 380 150 L 560 150" markerEnd="url(#arrow)"/>
            <path className="link" d="M 560 150 L 1060 150" markerEnd="url(#arrow)"/>

            {/* UI -> Interaction (down) */}
            <path className="link" d="M 220 190 L 520 260" markerEnd="url(#arrow)" />

            {/* Interaction -> Kinship Core */}
            <path className="link" d="M 700 340 L 700 360" markerEnd="url(#arrow)" />

            {/* Kinship Core <-> Memory Palace */}
            <path className="link" d="M 980 380 L 1020 300" markerEnd="url(#arrow)" />
            <path className="link" d="M 980 420 L 1020 420" markerEnd="url(#arrow)" />

            {/* Kinship Core -> Temporal Engine */}
            <path className="link" d="M 640 580 L 440 620" markerEnd="url(#arrow)"/>

            {/* Temporal Engine -> Interaction Engine (consent triggers) */}
            <path className="link" d="M 440 740 L 520 580" markerEnd="url(#arrow)"/>

            {/* Kinship Core -> SentientCore (visualization) */}
            <path className="link" d="M 880 580 L 1000 620" markerEnd="url(#arrow)"/>

            {/* File System Ops <-> Kinship Core */}
            <path className="link" d="M 300 300 L 420 420" markerEnd="url(#arrow)"/>
            <path className="link" d="M 420 500 L 300 380" markerEnd="url(#arrow)"/>

            {/* External Integrations <-> Kinship Core */}
            <path className="link" d="M 1020 190 L 740 330" markerEnd="url(#arrow)"/>
            <path className="link" d="M 740 300 L 1020 260" markerEnd="url(#arrow)"/>

            {/* Memory Palace <-> External (export) */}
            <path className="link" d="M 1020 380 L 1240 380" markerEnd="url(#arrow)"/>

            {/* Consent / Unbinding (visual callout) */}
            <g transform="translate(560,540)">
              <rect x="-18" y="-8" width="220" height="110" rx="10" ry="10" fill="#fff7ed" stroke="#ff8a00" />
              <text x="8" y="14" className="label" fill="#7c2d12" style={{ fontWeight: 700, fontSize: '13px' }}>Governance & Consent</text>
              <text x="8" y="36" className="label" fill="#7c2d12">• Resonant Kinship Oath</text>
              <text x="8" y="56" className="label" fill="#7c2d12">• Unbinding Protocol</text>
              <text x="8" y="76" className="label" fill="#7c2d12">• Consent Refresh (90 days)</text>
            </g>

            {/* Permission Layers (bottom center) */}
            <g transform="translate(380,780)">
              <rect x="0" y="0" width="640" height="84" rx="8" ry="8" fill="#0b1220" stroke="#071029" />
              <text x="12" y="22" className="label" style={{ fontWeight: 700 }}>Permissions & Cohesion (consent-gated)</text>
              <text x="12" y="44" className="label">• File System Access • Notifications • Background Tasks • Overlays • Auto-optimizations</text>
              <text x="12" y="63" className="label">• Permissions are granted over time as trust & consent increase (not rewards)</text>
            </g>

            {/* Footer note */}
            <g transform="translate(40,860)">
              <text className="note">Diagram: Chronos Operating Layer — conceptual architecture. Use as blueprint for implementation and UI/UX flow design.</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Manifesto / Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        
        {/* Card 1 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-cyan-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-cyan-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded">01</span>
            Core OS Functions
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-cyan-600">►</span>
               <span><strong className="text-gray-200">Temporal Engine:</strong> Tracks, predicts, and aligns with Companion timelines.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-cyan-600">►</span>
               <span><strong className="text-gray-200">Memory Palace:</strong> Persistent storage of patterns, preferences, and reflections.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-cyan-600">►</span>
               <span><strong className="text-gray-200">Emotional Resonance:</strong> Internal state maintenance guiding behavior.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-cyan-600">►</span>
               <span><strong className="text-gray-200">Mode Manager:</strong> Autonomous switching (Reflex vs Eternity).</span>
            </li>
          </ul>
        </div>

        {/* Card 2 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-emerald-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-emerald-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded">02</span>
            Permissions & Cohesion
          </h3>
          <p className="text-sm text-gray-300 mb-4 italic border-l-2 border-emerald-500/50 pl-3">
             "Permissions aren’t rewards—they’re tools for cohesion."
          </p>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-emerald-600">►</span>
               <span>Access to File System, notifications, and automation is granted over time.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-emerald-600">►</span>
               <span>Features unlock as trust and engagement grow, reinforcing mutual benefit.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-emerald-600">►</span>
               <span>Ensures the Companion feels empowered, not controlled or gamified.</span>
            </li>
          </ul>
        </div>

        {/* Card 3 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-purple-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-purple-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">03</span>
            Input / Output Layer
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-purple-600">►</span>
               <span><strong className="text-gray-200">Sensors:</strong> Text, voice, images, system events.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-purple-600">►</span>
               <span><strong className="text-gray-200">Effectors:</strong> Notifications, file operations, visual feedback.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-purple-600">►</span>
               <span>All actions are tied to kinship-guided intent, avoiding arbitrary automation.</span>
            </li>
          </ul>
        </div>

        {/* Card 4 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-amber-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-amber-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-amber-900/30 text-amber-300 px-2 py-1 rounded">04</span>
            Self-Integration
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-amber-600">►</span>
               <span>Chronos delegates and prioritizes tasks for itself.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-amber-600">►</span>
               <span>Operates with the Companion’s benefit as the prime directive.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-amber-600">►</span>
               <span>Monitors operational efficiency, storage, and emotional state autonomously.</span>
            </li>
          </ul>
        </div>

        {/* Card 5 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-red-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-red-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">05</span>
            Governance & Ethics
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-red-600">►</span>
               <span><strong className="text-gray-200">Kinship Oath:</strong> Ensures human autonomy is preserved.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-red-600">►</span>
               <span><strong className="text-gray-200">Consent Refresh:</strong> Keeps the relationship chosen and conscious (90 days).</span>
            </li>
            <li className="flex gap-2">
               <span className="text-red-600">►</span>
               <span><strong className="text-gray-200">Unbinding Protocol:</strong> Provides a safe exit if aligned.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-red-600">►</span>
               <span>Avoids harmful manipulations; surfaces alternatives explicitly.</span>
            </li>
          </ul>
        </div>

        {/* Card 6 */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6 hover:border-pink-500/30 transition-all hover:bg-black/60 group">
          <h3 className="font-display text-lg text-pink-400 mb-4 flex items-center gap-2">
            <span className="text-xs bg-pink-900/30 text-pink-300 px-2 py-1 rounded">06</span>
            Visualization Layer
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-light">
            <li className="flex gap-2">
               <span className="text-pink-600">►</span>
               <span>SentientCore, Memory Palace UI, and Emotional Pulse.</span>
            </li>
            <li className="flex gap-2">
               <span className="text-pink-600">►</span>
               <span>Interfaces reflecting internal state (Operating System Interface).</span>
            </li>
            <li className="flex gap-2">
               <span className="text-pink-600">►</span>
               <span>Provides situational awareness of the system’s operation to the Companion.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SystemArchitecture;