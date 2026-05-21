<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FC Montreal - Presence list</title>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>

<body style="margin:0;padding:0;background:#0a1a0f;">
  <div id="root"></div>

  <script type="text/babel">

    // STORAGE ADAPTER
    if (!window.storage) {
      window.storage = {
        get: async (key) => {
          const val = localStorage.getItem(key);
          return val ? { value: val } : null;
        },
        set: async (key, value) => {
          localStorage.setItem(key, value);
        }
      };
    }

    const { useState, useEffect, useRef } = React;

    const MAX_MAIN = 24;
    const PLAYERS_KEY = "fcmtl_players_v2";
    const GAME_KEY = "fcmtl_game_v2";
    const ADMIN_PASSWORD = "fcmontreal";

    const DEFAULT_GAME = {
      date: "Saturday, May 23rd",
      time: "8:00 AM",
      location: "Parc Riverside, Montréal",
    };

    function GrassPattern() {
      return (
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position:"absolute",
            inset:0,
            opacity:0.04,
            pointerEvents:"none"
          }}
        >
          <defs>
            <pattern
              id="grass"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <rect width="40" height="40" fill="none"/>
              <line x1="0" y1="0" x2="0" y2="40" stroke="#4ade80" strokeWidth="20" opacity="0.5"/>
              <line x1="20" y1="0" x2="20" y2="40" stroke="#22c55e" strokeWidth="20" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grass)"/>
        </svg>
      );
    }

    function App() {
      const [mainPlayers, setMainPlayers] = useState([]);
      const [waitPlayers, setWaitPlayers] = useState([]);
      const [gameInfo, setGameInfo] = useState(DEFAULT_GAME);
      const [name, setName] = useState("");
      const [listTarget, setListTarget] = useState("main");
      const [toast, setToast] = useState(null);
      const [adminOpen, setAdminOpen] = useState(false);
      const [adminInput, setAdminInput] = useState("");
      const [adminAuth, setAdminAuth] = useState(false);
      const [editGame, setEditGame] = useState(DEFAULT_GAME);
      const [loading, setLoading] = useState(true);
      const [flashId, setFlashId] = useState(null);
      const inputRef = useRef(null);

      const mainFull = mainPlayers.length >= MAX_MAIN - 1;

      useEffect(() => {
        if (mainFull) setListTarget("wait");
      }, [mainFull]);

      useEffect(() => {
        load();
      }, []);

      async function load() {
        try {
          const pm = await window.storage.get(PLAYERS_KEY + "_main");
          if (pm) setMainPlayers(JSON.parse(pm.value));
          
          const pw = await window.storage.get(PLAYERS_KEY + "_wait");
          if (pw) setWaitPlayers(JSON.parse(pw.value));
          
          const g = await window.storage.get(GAME_KEY);
          if (g) {
            const v = JSON.parse(g.value);
            setGameInfo(v);
            setEditGame(v);
          }
        } catch (_) {}
        setLoading(false);
      }

      async function saveMain(list) {
        await window.storage.set(PLAYERS_KEY + "_main", JSON.stringify(list));
        setMainPlayers(list);
      }

      async function saveWait(list) {
        await window.storage.set(PLAYERS_KEY + "_wait", JSON.stringify(list));
        setWaitPlayers(list);
      }

      async function saveGame(info) {
        await window.storage.set(GAME_KEY, JSON.stringify(info));
        setGameInfo(info);
      }

      function showToast(msg, type="success") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
      }

      async function handleSignup() {
        const trimmed = name.trim();
        if (!trimmed) return;

        const allNames = [...mainPlayers, ...waitPlayers].map(p => p.name.toLowerCase());
        if (trimmed.toLowerCase() === "luciano" || allNames.includes(trimmed.toLowerCase())) {
          showToast("⚠️ That name is already on the list!", "warn");
          return;
        }

        const entry = { id: Date.now(), name: trimmed };

        if (listTarget === "main" && !mainFull) {
          const next = [...mainPlayers, entry];
          setFlashId(entry.id);
          setTimeout(() => setFlashId(null), 900);
          await saveMain(next);
          setName("");
          showToast(`✅ ${trimmed} confirmed — slot #${next.length + 1}!`);
        } else {
          const next = [...waitPlayers, entry];
          setFlashId(entry.id);
          setTimeout(() => setFlashId(null), 900);
          await saveWait(next);
          setName("");
          showToast(`⏳ ${trimmed} added to Waiting List — #${next.length}!`, "warn");
        }
        inputRef.current?.focus();
      }

      async function handleRemoveMain(id) {
        await saveMain(mainPlayers.filter(p => p.id !== id));
        showToast("Player removed.", "info");
      }

      async function handleRemoveWait(id) {
        await saveWait(waitPlayers.filter(p => p.id !== id));
        showToast("Player removed.", "info");
      }

      async function handleReset() {
        await saveMain([]);
        await saveWait([]);
        showToast("List has been reset. ✔️", "info");
      }

      async function handleSaveGame() {
        await saveGame(editGame);
        showToast("Game info saved! ✔️");
      }

      function handleAdminLogin() {
        if (adminInput === ADMIN_PASSWORD) {
          setAdminAuth(true);
          setAdminInput("");
          showToast("✅ Admin authenticated");
        } else {
          showToast("❌ Wrong password", "error");
        }
      }

      function shareWhatsApp() {
        if (!adminAuth) {
          showToast("❌ Admin access required", "error");
          return;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank");
      }

      []
      function buildShareText() {
        let t = `⚽ *PRESENCE LIST*\n📅 ${gameInfo.date} — ${gameInfo.time}\n📍 ${gameInfo.location}\n\n`;
        t += `1. Luciano 🟢\n`;
        for (let i = 0; i < MAX_MAIN - 1; i++) {
          t += `${i + 2}. ${mainPlayers[i] ? mainPlayers[i].name : ""}\n`;
        }
        if (waitPlayers.length > 0) {
          t += `\n⏳ *WAITING LIST*\n`;
          waitPlayers.forEach((p, i) => { t += `${i + 1}. ${p.name}\n`; });
        }
        return t;
      }

      const confirmedCount = 1 + mainPlayers.length;
      const pct = Math.round((confirmedCount / MAX_MAIN) * 100);

      const S = {
        input: {
          background:"#0f2b15", border:"1.5px solid #1e5228", borderRadius:10,
          padding:"12px 14px", color:"#e8f5e9", fontSize:15, outline:"none",
          fontFamily:"inherit", width:"100%", boxSizing:"border-box",
        },
        card: (flash) => ({
          display:"flex", alignItems:"center",
          background: flash ? "#14532d" : "#0f2b15",
          border:`1px solid ${flash ? "#22c55e" : "#1e5228"}`,
          borderRadius:8, padding:"8px 12px", transition:"background 0.4s, border-color 0.4s",
        }),
        emptySlot: {
          display:"flex", alignItems:"center", background:"transparent",
          border:"1px solid #0f1f12", borderRadius:8, padding:"8px 12px",
        },
        num: { color:"#2d6a35", fontSize:12, width:28, flexShrink:0, fontFamily:"monospace" },
        removeBtn: {
          background:"none", border:"none", color:"#dc2626",
          cursor:"pointer", fontSize:18, padding:"0 2px", lineHeight:1,
        },
      };

      if (loading) {
        return (
          <div style={{ minHeight:"100vh", background:"#0a1a0f", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#4ade80", fontFamily:"Georgia,serif", fontSize:16 }}>Loading…</span>
          </div>
        );
      }

      return (
        <div style={{ minHeight:"100vh", background:"#0a1a0f", fontFamily:"Georgia,serif", color:"#e8f5e9" }}>
          <GrassPattern/>
          <div style={{ position:"relative", zIndex:1, maxWidth:480, margin:"0 auto", padding:"24px 16px 56px" }}>

            {/* HEADER */}
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:48, filter:"drop-shadow(0 0 12px #22c55e88)", marginBottom:4 }}>⚽</div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, letterSpacing:1, color:"#4ade80", textTransform:"uppercase" }}>FC Montreal</h1>
              <p style={{ margin:"6px 0 2px", color:"#86efac", fontSize:14 }}>📅 {gameInfo.date} · {gameInfo.time}</p>
              <p style={{ margin:0, color:"#6ee7b7", fontSize:13 }}>📍 {gameInfo.location}</p>
            </div>

            {/* PROGRESS */}
            <div style={{ background:"#0f2b15", border:"1px solid #1a4a22", borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8 }}>
                <span style={{ color:"#4ade80", fontWeight:700 }}>{confirmedCount} / {MAX_MAIN} confirmed</span>
                {waitPlayers.length > 0 && <span style={{ color:"#fbbf24" }}>{waitPlayers.length} waiting</span>}
              </div>
              <div style={{ height:8, background:"#1a4a22", borderRadius:99, overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:99, width:`${pct}%`,
                  background: mainFull ? "#f59e0b" : "linear-gradient(90deg,#22c55e,#4ade80)",
                  transition:"width 0.5s ease",
                }}/>
              </div>
            </div>

            {/* LIST TARGET TOGGLE */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {["main","wait"].map(t => {
                const isMain = t === "main";
                const disabled = isMain && mainFull;
                const active = listTarget === t;
                return (
                  <button key={t}
                    onClick={() => !disabled && setListTarget(t)}
                    disabled={disabled}
                    style={{
                      flex:1, border:`2px solid ${active ? (isMain?"#4ade80":"#fbbf24") : "#1e5228"}`,
                      background: active ? (isMain?"#14532d":"#2d1e00") : "transparent",
                      borderRadius:10, padding:"10px 0",
                      color: disabled ? "#2d6a35" : active ? (isMain?"#4ade80":"#fbbf24") : "#4a7c59",
                      fontWeight:700, fontSize:13, cursor: disabled?"not-allowed":"pointer",
                      fontFamily:"inherit", transition:"all 0.2s",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    }}
                  >
                    {isMain ? (mainFull ? "🔒 Main List Full" : "✅ Main List") : "⏳ Waiting List"}
                  </button>
                );
              })}
            </div>

            {/* SIGNUP */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key==="Enter" && handleSignup()}
                placeholder="Your name…"
                style={{ ...S.input, flex:1, width:"auto" }}
              />
              <button onClick={handleSignup} style={{
                background:"linear-gradient(135deg,#16a34a,#4ade80)",
                border:"none", borderRadius:10, padding:"12px 20px",
                color:"#0a1a0f", fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit",
              }}>Join</button>
            </div>

            {/* TOAST */}
            {toast && (
              <div style={{
                background: toast.type==="error" ? "#7f1d1d" : toast.type==="warn" ? "#78350f" : "#14532d",
                border:`1px solid ${toast.type==="error" ? "#dc2626" : toast.type==="warn" ? "#d97706" : "#22c55e"}`,
                borderRadius:10, padding:"10px 16px", fontSize:14, marginBottom:16, textAlign:"center",
              }}>{toast.msg}</div>
            )}

            {/* MAIN LIST */}
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"#4ade80", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
                ✅ Main List
              </h2>
              <div style={{ display:"grid", gap:4 }}>
                <div style={{ ...S.card(false), background:"#0d2e18", border:"1px solid #166534" }}>
                  <span style={S.num}>01</span>
                  <span style={{ flex:1, color:"#4ade80", fontWeight:700 }}>Luciano</span>
                  <span style={{ fontSize:11, color:"#166534", fontStyle:"italic" }}>admin</span>
                </div>

                {Array.from({ length: MAX_MAIN - 1 }).map((_, i) => {
                  const p = mainPlayers[i];
                  const flash = p && p.id === flashId;
                  return p ? (
                    <div key={p.id} style={S.card(flash)}>
                      <span style={S.num}>{String(i+2).padStart(2,"0")}</span>
                      <span style={{ flex:1 }}>{p.name}</span>
                      {adminAuth && (
                        <button style={S.removeBtn} onClick={() => handleRemoveMain(p.id)}>×</button>
                      )}
                    </div>
                  ) : (
                    <div key={i} style={S.emptySlot}>
                      <span style={S.num}>{String(i+2).padStart(2,"0")}</span>
                      <span style={{ color:"#1e5228", fontSize:13 }}>—</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WAITING LIST */}
            <div style={{ marginBottom:24 }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"#fbbf24", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
                ⏳ Waiting List
              </h2>
              {waitPlayers.length === 0 ? (
                <div style={{ ...S.emptySlot, justifyContent:"center" }}>
                  <span style={{ color:"#2d4a1e", fontSize:13 }}>No one waiting yet</span>
                </div>
              ) : (
                <div style={{ display:"grid", gap:4 }}>
                  {waitPlayers.map((p, i) => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", background:"#1c1200", border:"1px solid #2d1e00", borderRadius:8, padding:"8px 12px" }}>
                      <span style={{ ...S.num, color:"#92400e" }}>{String(i+1).padStart(2,"0")}</span>
                      <span style={{ flex:1, color:"#fcd34d" }}>{p.name}</span>
                      {adminAuth && (
                        <button style={S.removeBtn} onClick={() => handleRemoveWait(p.id)}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ADMIN BUTTON */}
            <button onClick={() => setAdminOpen(!adminOpen)} style={{
              width:"100%", background:"transparent", border:"1px solid #1e5228", borderRadius:10,
              padding:10, color:"#4a7c59", fontSize:12, cursor:"pointer", fontFamily:"inherit",
              letterSpacing:1, textTransform:"uppercase", marginBottom:8
            }}>
              {adminOpen ? "Close Admin Panel" : "⚙️ Admin"}
            </button>

            {/* ADMIN LOGIN */}
            {adminOpen && !adminAuth && (
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <input type="password" value={adminInput}
                  onChange={e => setAdminInput(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && handleAdminLogin()}
                  placeholder="Password…"
                  style={{ ...S.input, flex:1, width:"auto", padding:"10px 12px" }}
                />
                <button onClick={handleAdminLogin} style={{
                  background:"#1e5228", border:"none", borderRadius:8,
                  padding:"10px 16px", color:"#4ade80", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                }}>Enter</button>
              </div>
            )}

            {/* ADMIN PANEL */}
            {adminOpen && adminAuth && (
              <div style={{ marginTop:8, background:"#0a1f0d", border:"1px solid #1e5228", borderRadius:12, padding:16 }}>
                <p style={{ margin:"0 0 12px", color:"#4ade80", fontSize:13, fontWeight:700 }}>Admin Panel</p>
                <div style={{ display:"grid", gap:8, marginBottom:12 }}>
                  {[["date","📅 Date"], ["time","🕗 Time"], ["location","📍 Location"]].map(([k,label]) => (
                    <div key={k}>
                      <label style={{ fontSize:11, color:"#4a7c59", display:"block", marginBottom:4 }}>{label}</label>
                      <input value={editGame[k]}
                        onChange={e => setEditGame({ ...editGame, [k]:e.target.value })}
                        style={{ ...S.input, padding:"8px 10px", fontSize:13 }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  <button onClick={handleSaveGame} style={{
                    flex:1, background:"#14532d", border:"none", borderRadius:8,
                    padding:10, color:"#4ade80", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                  }}>Save Info</button>
                  <button onClick={handleReset} style={{
                    flex:1, background:"#450a0a", border:"1px solid #7f1d1d", borderRadius:8,
                    padding:10, color:"#f87171", fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13,
                  }}>🗑 Reset List</button>
                </div>

                {/* ADMIN ACTIONS */}
                <div style={{ borderTop:"1px solid #1e5228", paddingTop:16, marginTop:16 }}>
                  <p style={{ color:"#4ade80", fontSize:12, marginBottom:10, fontWeight:700 }}>Admin Actions</p>
                  <button onClick={shareWhatsApp} style={{
                    width:"100%", background:"linear-gradient(135deg,#128c7e,#25d366)", border:"none",
                    borderRadius:12, padding:14, color:"#fff", fontWeight:800, fontSize:15,
                    cursor:"pointer", fontFamily:"inherit", letterSpacing:0.5,
                  }}>
                    📲 Send list to WhatsApp group
                  </button>
                </div>
              </div>
            )}

            <p style={{ textAlign:"center", color:"#1e5228", fontSize:11, marginTop:32 }}>
              FC Montreal · Shared real-time list
            </p>
          </div>

          <style>{`
            * { box-sizing:border-box; }
            input::placeholder { color:#2d6a35; }
            button:disabled { opacity:0.5; }
          `}</style>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
