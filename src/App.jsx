import React, { useState, useEffect, useCallback } from "react";
import { Radio, Newspaper, Table2, Lock, Plus, Trash2, Clock, MapPin, ChevronRight, Unlock, Target, ChevronDown, Share2 } from "lucide-react";
import { storage, uploadImage } from "./storage";

const C = {
  pitch: "#1B4332",
  pitchDark: "#0F241A",
  soil: "#2B1D14",
  ochre: "#C68A3D",
  rust: "#A63D2F",
  chalk: "#FFFDF7",
  line: "#D9CBAE",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
.f-display { font-family: 'Anton', sans-serif; }
.f-body { font-family: 'Work Sans', sans-serif; }
.f-mono { font-family: 'JetBrains Mono', monospace; }
`;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const GROUP_A_NAMES = ["Sabon Gari FC", "Kofar Fada Utd", "Layin Dogo Stars", "Bakin Kasuwa FC", "Unguwar Rimi FC", "Tudun Wada Warriors", "Kofar Ruwa FC"];
const GROUP_B_NAMES = ["Yamma Youth FC", "Kudu Kings", "Gabas Rangers", "Arewa Eagles FC", "Sabuwar Kasuwa FC", "Kofar Sauri FC", "Unguwar Liman FC"];

function seedCompetitions() {
  return [{ id: uid(), name: "77 Sport Competition", subtitle: "Unguwa-Unguwa", hasGroups: true }];
}

function seedTeams(competitionId) {
  return [
    ...GROUP_A_NAMES.map((name) => ({ id: uid(), name, group: "A", competitionId })),
    ...GROUP_B_NAMES.map((name) => ({ id: uid(), name, group: "B", competitionId })),
  ];
}

function seedMatches(competitionId, teams) {
  const groupA = teams.filter((t) => t.group === "A");
  const groupB = teams.filter((t) => t.group === "B");
  const today = new Date();
  const iso = (offsetDays) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  };
  return [
    {
      id: uid(), competitionId, teamAId: groupA[0].id, teamBId: groupA[1].id, scoreA: 2, scoreB: 1,
      date: iso(-2), time: "16:00", venue: "Unguwa Pitch 1", status: "finished",
      scorers: [
        { id: uid(), name: "M. Sani", teamId: groupA[0].id, goals: 2 },
        { id: uid(), name: "A. Bello", teamId: groupA[1].id, goals: 1 },
      ],
    },
    { id: uid(), competitionId, teamAId: groupB[0].id, teamBId: groupB[1].id, scoreA: 0, scoreB: 0, date: iso(0), time: "16:00", venue: "Unguwa Pitch 2", status: "live", scorers: [] },
    { id: uid(), competitionId, teamAId: groupA[2].id, teamBId: groupA[3].id, scoreA: 0, scoreB: 0, date: iso(4), time: "16:00", venue: "Unguwa Pitch 1", status: "upcoming", scorers: [] },
  ];
}

const seedNews = () => ([
  { id: uid(), title: "Matchday fixtures confirmed", body: "This week's matchday fixtures have been set. Kickoffs start at 4pm across all pitches. Fans are encouraged to arrive early as seating is limited.", date: new Date().toISOString().slice(0, 10) },
]);

async function loadKey(key) {
  // Let real errors (permission denied, offline, etc.) propagate — only
  // return null when the document genuinely doesn't exist yet.
  const res = await storage.get(key);
  if (res && res.value) return JSON.parse(res.value);
  return null;
}
async function saveKey(key, value) {
  await storage.set(key, JSON.stringify(value));
}

function Pitch({ children, style }) {
  return (
    <div style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,255,255,0.035) 22px, rgba(255,255,255,0.035) 23px)", ...style }}>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  if (status === "live")
    return (
      <span className="f-mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.rust, color: C.chalk, fontSize: 11, padding: "3px 8px", borderRadius: 999, letterSpacing: 1 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: C.chalk, display: "inline-block" }} />
        LIVE
      </span>
    );
  if (status === "finished")
    return <span className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.55, letterSpacing: 1 }}>FT</span>;
  return <span className="f-mono" style={{ fontSize: 11, color: C.pitch, opacity: 0.7, letterSpacing: 1 }}>UPCOMING</span>;
}

function shareMatch(match, teamName, competitionName) {
  const a = teamName(match.teamAId);
  const b = teamName(match.teamBId);
  const scoreText = match.status === "upcoming" ? `${a} vs ${b} — ${match.date} ${match.time}` : `${a} ${match.scoreA} – ${match.scoreB} ${b} (${match.status === "live" ? "LIVE" : "FT"})`;
  const text = `⚽ ${competitionName ? competitionName + ": " : ""}${scoreText}\nFollow live on Auyo Football`;
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ text, url }).catch(() => {});
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
    alert("Copied to clipboard!");
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
  }
}

function MatchCard({ match, teamName, teamGroup, competitionName, expanded, onToggle, votedMatches, onVote }) {
  const a = teamName(match.teamAId);
  const b = teamName(match.teamBId);
  const grp = teamGroup(match.teamAId);
  const stage = match.stage || "Group Stage";
  const commentary = match.commentary || [];
  const motm = match.motm || { candidates: [], votes: {} };
  const hasVoted = votedMatches.has(match.id);
  const totalVotes = Object.values(motm.votes || {}).reduce((s, v) => s + v, 0);

  return (
    <div style={{ background: C.chalk, borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 0 rgba(43,29,20,0.06)", border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusPill status={match.status} />
          {stage === "Group Stage"
            ? grp && <span className="f-mono" style={{ fontSize: 10, color: C.pitch, opacity: 0.5, letterSpacing: 0.5 }}>GRP {grp}</span>
            : <span className="f-mono" style={{ fontSize: 10, color: C.rust, opacity: 0.85, letterSpacing: 0.5, fontWeight: 700 }}>{stage.toUpperCase()}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.55, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> {match.time}
          </div>
          <button onClick={(e) => { e.stopPropagation(); shareMatch(match, teamName, competitionName); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <Share2 size={14} color={C.soil} style={{ opacity: 0.45 }} />
          </button>
        </div>
      </div>
      <div onClick={onToggle} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="f-body" style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1 }}>{a}</div>
          {match.status === "upcoming" ? (
            <div className="f-mono" style={{ fontSize: 13, color: C.soil, opacity: 0.4, padding: "0 10px" }}>vs</div>
          ) : (
            <div className="f-display" style={{ fontSize: 26, color: C.pitch, padding: "0 10px", letterSpacing: 1 }}>{match.scoreA}&nbsp;–&nbsp;{match.scoreB}</div>
          )}
          <div className="f-body" style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1, textAlign: "right" }}>{b}</div>
        </div>
        {match.scorers && match.scorers.length > 0 && (
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
            ⚽ {match.scorers.map((s) => `${s.name} ${s.goals > 1 ? `(${s.goals})` : ""}`).join(", ")}
          </div>
        )}
        <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.45, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {match.venue} · {match.date}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {commentary.length > 0 && <span>💬 {commentary.length}</span>}
            <ChevronRight size={13} style={{ opacity: 0.4, transform: expanded ? "rotate(90deg)" : "none" }} />
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {commentary.length > 0 && (
            <div style={{ marginBottom: motm.candidates.length > 0 ? 16 : 0 }}>
              <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1, color: C.ochre, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>MATCH COMMENTARY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...commentary].reverse().map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 8 }}>
                    <span className="f-mono" style={{ fontSize: 11, color: C.pitch, fontWeight: 700, flexShrink: 0 }}>{c.minute}'</span>
                    <span className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.85 }}>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {motm.candidates.length > 0 && (
            <div>
              <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1, color: C.ochre, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>MAN OF THE MATCH</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {motm.candidates.map((cand) => {
                  const votes = (motm.votes || {})[cand.id] || 0;
                  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  return (
                    <button
                      key={cand.id}
                      disabled={hasVoted}
                      onClick={() => !hasVoted && onVote(match.id, cand.id)}
                      style={{
                        position: "relative", overflow: "hidden", textAlign: "left", border: `1px solid ${C.line}`, borderRadius: 9,
                        padding: "8px 10px", background: C.chalk, cursor: hasVoted ? "default" : "pointer",
                      }}
                    >
                      {hasVoted && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "rgba(198,138,61,0.18)", zIndex: 0 }} />}
                      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between" }}>
                        <span className="f-body" style={{ fontSize: 13, color: C.soil, fontWeight: 600 }}>{cand.name}</span>
                        {hasVoted && <span className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6 }}>{votes} · {pct}%</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!hasVoted && <div className="f-body" style={{ fontSize: 11, color: C.soil, opacity: 0.5, marginTop: 6 }}>Tap a name to vote — one vote per device.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoresTab({ matches, teamName, teamGroup, competitionName, votedMatches, onVote }) {
  const [expandedId, setExpandedId] = useState(null);
  const groups = [
    { key: "live", label: "Live now" },
    { key: "upcoming", label: "Upcoming" },
    { key: "finished", label: "Results" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: 90 }}>
      {groups.map((g) => {
        const list = matches.filter((m) => m.status === g.key);
        if (!list.length) return null;
        return (
          <div key={g.key}>
            <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>{g.label.toUpperCase()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((m) => (
                <MatchCard
                  key={m.id} match={m} teamName={teamName} teamGroup={teamGroup} competitionName={competitionName}
                  expanded={expandedId === m.id} onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  votedMatches={votedMatches} onVote={onVote}
                />
              ))}
            </div>
          </div>
        );
      })}
      {matches.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No fixtures yet in this competition.</div>}
    </div>
  );
}

function NewsTab({ news, setNews, likedPosts, toggleLike }) {
  const [openId, setOpenId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [nameDraft, setNameDraft] = useState("");
  const sorted = [...news].sort((a, b) => (a.date < b.date ? 1 : -1));

  const submitComment = (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const updated = news.map((n) =>
      n.id === postId
        ? { ...n, comments: [...(n.comments || []), { id: uid(), name: nameDraft.trim() || "Anonymous", text, date: new Date().toISOString().slice(0, 10) }] }
        : n
    );
    setNews(updated);
    setCommentDrafts({ ...commentDrafts, [postId]: "" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 90 }}>
      {sorted.map((n) => {
        const open = openId === n.id;
        const liked = likedPosts.has(n.id);
        const likes = n.likes || 0;
        const comments = n.comments || [];
        return (
          <div key={n.id} style={{ background: C.chalk, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
            {n.imageUrl && (
              <img src={n.imageUrl} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} onClick={() => setOpenId(open ? null : n.id)} />
            )}
            <div style={{ padding: 16 }}>
              <div onClick={() => setOpenId(open ? null : n.id)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div className="f-body" style={{ fontWeight: 700, fontSize: 15, color: C.soil }}>{n.title}</div>
                  <ChevronRight size={16} color={C.soil} style={{ opacity: 0.4, transform: open ? "rotate(90deg)" : "none", flexShrink: 0, marginTop: 2 }} />
                </div>
                <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.45, marginTop: 6, display: "flex", gap: 10 }}>
                  <span>{n.date}</span>
                  {likes > 0 && <span>❤ {likes}</span>}
                  {comments.length > 0 && <span>💬 {comments.length}</span>}
                </div>
                {open && <div className="f-body" style={{ fontSize: 13.5, color: C.soil, opacity: 0.85, marginTop: 10, lineHeight: 1.6, whiteSpace: "pre-line" }}>{n.body}</div>}
            </div>

            {open && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleLike(n.id)}
                  style={{ background: liked ? C.rust : "transparent", color: liked ? C.chalk : C.rust, border: `1px solid ${C.rust}`, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, fontFamily: "'Work Sans', sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  ❤ {liked ? "Liked" : "Like"} {likes > 0 ? `(${likes})` : ""}
                </button>

                <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginTop: 14, marginBottom: 8, letterSpacing: 0.5 }}>
                  {comments.length > 0 ? `${comments.length} COMMENT${comments.length > 1 ? "S" : ""}` : "COMMENTS"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {comments.map((c) => (
                    <div key={c.id} style={{ background: C.sand || "#F2E9D8", borderRadius: 10, padding: "8px 10px" }}>
                      <div className="f-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.soil }}>{c.name}</div>
                      <div className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.8, marginTop: 2 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    style={inputStyle}
                    placeholder="Your name (optional)"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      style={inputStyle}
                      placeholder="Write a comment…"
                      value={commentDrafts[n.id] || ""}
                      onChange={(e) => setCommentDrafts({ ...commentDrafts, [n.id]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") submitComment(n.id); }}
                    />
                    <button onClick={() => submitComment(n.id)} style={btnStyle(C.pitch, C.chalk)}>Post</button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No news posted yet.</div>}
    </div>
  );

}

function computeStandings(teams, matches) {
  const rows = {};
  teams.forEach((t) => (rows[t.id] = { id: t.id, name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  matches.filter((m) => m.status === "finished").forEach((m) => {
    const A = rows[m.teamAId]; const B = rows[m.teamBId];
    if (!A || !B) return;
    A.p++; B.p++;
    A.gf += m.scoreA; A.ga += m.scoreB;
    B.gf += m.scoreB; B.ga += m.scoreA;
    if (m.scoreA > m.scoreB) { A.w++; B.l++; A.pts += 3; }
    else if (m.scoreA < m.scoreB) { B.w++; A.l++; B.pts += 3; }
    else { A.d++; B.d++; A.pts += 1; B.pts += 1; }
  });
  return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

function StandingsTable({ standings }) {
  return (
    <div style={{ background: C.chalk, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
      <div className="f-mono" style={{ display: "grid", gridTemplateColumns: "1fr 26px 26px 26px 30px 34px", fontSize: 10, color: C.soil, opacity: 0.5, padding: "10px 12px", letterSpacing: 0.5, borderBottom: `1px solid ${C.line}` }}>
        <div>TEAM</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>PTS</div>
      </div>
      {standings.map((r, i) => (
        <div key={r.id} className="f-body" style={{ display: "grid", gridTemplateColumns: "1fr 26px 26px 26px 30px 34px", fontSize: 13, padding: "11px 12px", alignItems: "center", borderBottom: i < standings.length - 1 ? `1px solid ${C.line}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.soil, fontWeight: 600 }}>
            <span className="f-mono" style={{ fontSize: 10.5, opacity: 0.4, width: 12 }}>{i + 1}</span>{r.name}
          </div>
          <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.p}</div>
          <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.w}</div>
          <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.d}</div>
          <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.l}</div>
          <div className="f-mono" style={{ textAlign: "center", fontWeight: 700, color: C.pitch }}>{r.pts}</div>
        </div>
      ))}
    </div>
  );
}

function TableTab({ competition, teams, matches }) {
  if (!competition?.hasGroups) {
    const standings = computeStandings(teams, matches);
    return (
      <div style={{ paddingBottom: 90 }}>
        <StandingsTable standings={standings} />
        {standings.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>Standings will appear once results are added.</div>}
      </div>
    );
  }
  const groupA = teams.filter((t) => t.group === "A");
  const groupB = teams.filter((t) => t.group === "B");
  return (
    <div style={{ paddingBottom: 90, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP A</div>
        <StandingsTable standings={computeStandings(groupA, matches)} />
      </div>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP B</div>
        <StandingsTable standings={computeStandings(groupB, matches)} />
      </div>
      {teams.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>Standings will appear once results are added.</div>}
    </div>
  );
}

function computeTopScorers(matches, teamName) {
  const rows = {};
  matches.forEach((m) => {
    (m.scorers || []).forEach((s) => {
      const key = s.name.trim().toLowerCase() + "|" + s.teamId;
      if (!rows[key]) rows[key] = { name: s.name, teamId: s.teamId, goals: 0 };
      rows[key].goals += Number(s.goals) || 0;
    });
  });
  return Object.values(rows)
    .map((r) => ({ ...r, teamLabel: teamName(r.teamId) }))
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals);
}

function ScorersTab({ matches, teamName }) {
  const scorers = computeTopScorers(matches, teamName);
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: C.chalk, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        <div className="f-mono" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", fontSize: 10, color: C.soil, opacity: 0.5, padding: "10px 12px", letterSpacing: 0.5, borderBottom: `1px solid ${C.line}` }}>
          <div>PLAYER</div><div>TEAM</div><div style={{ textAlign: "center" }}>GLS</div>
        </div>
        {scorers.map((r, i) => (
          <div key={r.name + r.teamId} className="f-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", fontSize: 13, padding: "11px 12px", alignItems: "center", borderBottom: i < scorers.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.soil, fontWeight: 600 }}>
              <span className="f-mono" style={{ fontSize: 10.5, opacity: 0.4, width: 12 }}>{i + 1}</span>{r.name}
            </div>
            <div className="f-body" style={{ color: C.soil, opacity: 0.65, fontSize: 12.5 }}>{r.teamLabel}</div>
            <div className="f-mono" style={{ textAlign: "center", fontWeight: 700, color: C.pitch }}>{r.goals}</div>
          </div>
        ))}
      </div>
      {scorers.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No goals recorded yet in this competition.</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginBottom: 5, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 14, fontFamily: "'Work Sans', sans-serif", background: C.chalk, color: C.soil };
const btnStyle = (bg, color) => ({ background: bg, color, border: "none", borderRadius: 9, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'Work Sans', sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 });

function ScorerRow({ match, updateMatch }) {
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState(match.teamAId);
  const [goals, setGoals] = useState(1);

  const addScorer = () => {
    if (!name.trim()) return;
    const scorers = [...(match.scorers || []), { id: uid(), name: name.trim(), teamId, goals: Number(goals) || 1 }];
    updateMatch(match.id, { scorers });
    setName(""); setGoals(1);
  };
  const removeScorer = (id) => updateMatch(match.id, { scorers: (match.scorers || []).filter((s) => s.id !== id) });

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>GOAL SCORERS</div>
      {(match.scorers || []).map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0" }} className="f-body">
          <span style={{ color: C.soil }}>{s.name} ({s.goals})</span>
          <button onClick={() => removeScorer(s.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Scorer name" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 70 }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value={match.teamAId}>Home</option>
          <option value={match.teamBId}>Away</option>
        </select>
        <input type="number" min={1} style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 46 }} value={goals} onChange={(e) => setGoals(e.target.value)} />
        <button onClick={addScorer} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px" }}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function CommentaryRow({ match, updateMatch }) {
  const [minute, setMinute] = useState("");
  const [text, setText] = useState("");
  const commentary = match.commentary || [];

  const addEntry = () => {
    if (!text.trim()) return;
    const entries = [...commentary, { id: uid(), minute: minute || "0", text: text.trim() }];
    updateMatch(match.id, { commentary: entries });
    setMinute(""); setText("");
  };
  const removeEntry = (id) => updateMatch(match.id, { commentary: commentary.filter((c) => c.id !== id) });

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>MATCH COMMENTARY</div>
      {[...commentary].reverse().map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0" }} className="f-body">
          <span style={{ color: C.soil }}><b>{c.minute}'</b> {c.text}</span>
          <button onClick={() => removeEntry(c.id)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}><Trash2 size={12} color={C.rust} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input type="number" min={0} max={120} placeholder="Min" style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 50 }} value={minute} onChange={(e) => setMinute(e.target.value)} />
        <input placeholder="e.g. Goal! Great strike from outside the box" style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }} />
        <button onClick={addEntry} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px" }}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function MotmRow({ match, updateMatch }) {
  const [name, setName] = useState("");
  const motm = match.motm || { candidates: [], votes: {} };

  const addCandidate = () => {
    if (!name.trim()) return;
    const candidates = [...motm.candidates, { id: uid(), name: name.trim() }];
    updateMatch(match.id, { motm: { ...motm, candidates } });
    setName("");
  };
  const removeCandidate = (id) => {
    const candidates = motm.candidates.filter((c) => c.id !== id);
    const votes = { ...motm.votes }; delete votes[id];
    updateMatch(match.id, { motm: { candidates, votes } });
  };

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>MAN OF THE MATCH CANDIDATES</div>
      {motm.candidates.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0" }} className="f-body">
          <span style={{ color: C.soil }}>{c.name} — {(motm.votes || {})[c.id] || 0} votes</span>
          <button onClick={() => removeCandidate(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input placeholder="Candidate name" style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCandidate(); }} />
        <button onClick={addCandidate} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px" }}><Plus size={13} /></button>
      </div>
    </div>
  );
}


function NewsModerationRow({ post, news, setNews, removeNews }) {
  const [expanded, setExpanded] = useState(false);
  const comments = post.comments || [];
  const removeComment = (commentId) => {
    const updated = news.map((n) => (n.id === post.id ? { ...n, comments: comments.filter((c) => c.id !== commentId) } : n));
    setNews(updated);
  };
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "7px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", flex: 1 }}>
          <span className="f-body" style={{ fontSize: 13, color: C.soil }}>{post.title}</span>
          <span className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginLeft: 8 }}>
            ❤ {post.likes || 0} · 💬 {comments.length}
          </span>
        </div>
        <button onClick={() => removeNews(post.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
      </div>
      {expanded && comments.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: C.line, opacity: 0.9, borderRadius: 8, padding: "6px 8px" }}>
              <div>
                <div className="f-body" style={{ fontSize: 11.5, fontWeight: 700, color: C.soil }}>{c.name}</div>
                <div className="f-body" style={{ fontSize: 11.5, color: C.soil }}>{c.text}</div>
              </div>
              <button onClick={() => removeComment(c.id)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}><Trash2 size={12} color={C.rust} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTab({ competitions, setCompetitions, activeCompetitionId, setActiveCompetitionId, teams, setTeams, matches, setMatches, news, setNews, unlocked, setUnlocked }) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamGroup, setTeamGroup] = useState("A");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [mGroup, setMGroup] = useState("A");
  const [mStage, setMStage] = useState("Group Stage");
  const [mA, setMA] = useState("");
  const [mB, setMB] = useState("");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("16:00");
  const [mVenue, setMVenue] = useState("");
  const [compName, setCompName] = useState("");
  const [compSubtitle, setCompSubtitle] = useState("");
  const [compHasGroups, setCompHasGroups] = useState(true);

  if (!unlocked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60, gap: 14 }}>
        <Lock size={26} color={C.chalk} style={{ opacity: 0.8 }} />
        <div className="f-body" style={{ color: C.chalk, opacity: 0.75, fontSize: 13, textAlign: "center", maxWidth: 220 }}>Enter the organizer PIN to manage competitions, scores and news.</div>
        <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false); }} style={{ ...inputStyle, width: 200, textAlign: "center", letterSpacing: 2 }} maxLength={20} placeholder="Organizer password" />
        {pinError && <div style={{ color: C.rust, fontSize: 12 }} className="f-body">Wrong PIN, try again.</div>}
        <button onClick={() => (pin === "Kuliya@47" ? setUnlocked(true) : setPinError(true))} style={btnStyle(C.ochre, C.chalk)}><Unlock size={14} /> Unlock</button>
      </div>
    );
  }

  const competitionTeams = teams.filter((t) => t.competitionId === activeCompetitionId);
  const competitionMatches = matches.filter((m) => m.competitionId === activeCompetitionId);
  const teamName_ = (id) => teams.find((t) => t.id === id)?.name || "—";

  const addCompetition = () => {
    if (!compName.trim()) return;
    const id = uid();
    setCompetitions([...competitions, { id, name: compName.trim(), subtitle: compSubtitle.trim(), hasGroups: compHasGroups }]);
    setActiveCompetitionId(id);
    setCompName(""); setCompSubtitle("");
  };
  const removeCompetition = (id) => {
    if (competitions.length <= 1) return;
    setCompetitions(competitions.filter((c) => c.id !== id));
    setTeams(teams.filter((t) => t.competitionId !== id));
    setMatches(matches.filter((m) => m.competitionId !== id));
    if (activeCompetitionId === id) setActiveCompetitionId(competitions.find((c) => c.id !== id)?.id || "");
  };

  const addTeam = () => {
    if (!teamName.trim() || !activeCompetitionId) return;
    setTeams([...teams, { id: uid(), name: teamName.trim(), group: teamGroup, competitionId: activeCompetitionId }]);
    setTeamName("");
  };
  const removeTeam = (id) => setTeams(teams.filter((t) => t.id !== id));

  const addMatch = () => {
    if (!mA || !mB || mA === mB || !mDate) return;
    setMatches([...matches, { id: uid(), competitionId: activeCompetitionId, teamAId: mA, teamBId: mB, scoreA: 0, scoreB: 0, date: mDate, time: mTime, venue: mVenue || "TBD", status: "upcoming", scorers: [], stage: mStage }]);
    setMA(""); setMB(""); setMDate(""); setMVenue("");
  };
  const updateMatch = (id, patch) => setMatches(matches.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMatch = (id) => setMatches(matches.filter((m) => m.id !== id));

  const addNews = () => {
    if (!newsTitle.trim() || !newsBody.trim()) return;
    setNews([...news, { id: uid(), title: newsTitle.trim(), body: newsBody.trim(), imageUrl: newsImageUrl || null, date: new Date().toISOString().slice(0, 10) }]);
    setNewsTitle(""); setNewsBody(""); setNewsImageUrl("");
  };
  const removeNews = (id) => setNews(news.filter((n) => n.id !== id));

  const handleImageSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const url = await uploadImage(file);
      setNewsImageUrl(url);
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Couldn't upload image — check your connection and Firebase Storage rules.");
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div style={{ paddingBottom: 90, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>COMPETITIONS</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          {competitions.map((c) => (
            <div key={c.id} onClick={() => setActiveCompetitionId(c.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
              <div>
                <div className="f-body" style={{ fontSize: 13.5, color: C.soil, fontWeight: c.id === activeCompetitionId ? 700 : 500 }}>{c.name}{c.id === activeCompetitionId ? "  ✓" : ""}</div>
                {c.subtitle && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{c.subtitle}</div>}
              </div>
              {competitions.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); removeCompetition(c.id); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
              )}
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <Field label="New competition name"><input style={inputStyle} placeholder="e.g. Auyo Schools Cup" value={compName} onChange={(e) => setCompName(e.target.value)} /></Field>
            <Field label="Subtitle (optional)"><input style={inputStyle} placeholder="e.g. Inter-house" value={compSubtitle} onChange={(e) => setCompSubtitle(e.target.value)} /></Field>
            <label className="f-body" style={{ fontSize: 12.5, color: C.soil, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <input type="checkbox" checked={compHasGroups} onChange={(e) => setCompHasGroups(e.target.checked)} /> Split into two groups
            </label>
            <button onClick={addCompetition} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Add competition</button>
          </div>
        </div>
      </div>

      {!activeCompetitionId ? (
        <div className="f-body" style={{ color: C.chalk, opacity: 0.7, textAlign: "center" }}>Select or add a competition above to manage its teams and fixtures.</div>
      ) : (
        <>
          <div>
            <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>TEAMS</div>
            <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input style={inputStyle} placeholder="New team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <select style={{ ...inputStyle, width: 68 }} value={teamGroup} onChange={(e) => setTeamGroup(e.target.value)}>
                  <option value="A">Grp A</option>
                  <option value="B">Grp B</option>
                </select>
                <button onClick={addTeam} style={btnStyle(C.pitch, C.chalk)}><Plus size={14} /></button>
              </div>
              {["A", "B"].map((g) => (
                <div key={g}>
                  <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginTop: 8, marginBottom: 2 }}>GROUP {g}</div>
                  {competitionTeams.filter((t) => t.group === g).map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid ${C.line}` }}>
                      <span className="f-body" style={{ fontSize: 13.5, color: C.soil }}>{t.name}</span>
                      <button onClick={() => removeTeam(t.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>ADD FIXTURE</div>
            <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
              <Field label="Stage">
                <select style={inputStyle} value={mStage} onChange={(e) => { setMStage(e.target.value); setMA(""); setMB(""); }}>
                  <option value="Group Stage">Group Stage</option>
                  <option value="Quarter-Final">Quarter-Final</option>
                  <option value="Semi-Final">Semi-Final</option>
                  <option value="3rd Place">3rd Place Playoff</option>
                  <option value="Final">Final</option>
                </select>
              </Field>
              {mStage === "Group Stage" ? (
                <Field label="Group">
                  <select style={inputStyle} value={mGroup} onChange={(e) => { setMGroup(e.target.value); setMA(""); setMB(""); }}>
                    <option value="A">Group A</option>
                    <option value="B">Group B</option>
                  </select>
                </Field>
              ) : (
                <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 12, lineHeight: 1.4 }}>
                  Knockout stage — pick any two teams from either group (e.g. Group A winner vs Group B runner-up).
                </div>
              )}
              <Field label="Home team">
                <select style={inputStyle} value={mA} onChange={(e) => setMA(e.target.value)}>
                  <option value="">Select team</option>
                  {(mStage === "Group Stage" ? competitionTeams.filter((t) => t.group === mGroup) : competitionTeams).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{mStage !== "Group Stage" ? ` (Grp ${t.group})` : ""}</option>
                  ))}
                </select>
              </Field>
              <Field label="Away team">
                <select style={inputStyle} value={mB} onChange={(e) => setMB(e.target.value)}>
                  <option value="">Select team</option>
                  {(mStage === "Group Stage" ? competitionTeams.filter((t) => t.group === mGroup) : competitionTeams).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{mStage !== "Group Stage" ? ` (Grp ${t.group})` : ""}</option>
                  ))}
                </select>
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Field label="Date"><input type="date" style={inputStyle} value={mDate} onChange={(e) => setMDate(e.target.value)} /></Field>
                <Field label="Time"><input type="time" style={inputStyle} value={mTime} onChange={(e) => setMTime(e.target.value)} /></Field>
              </div>
              <Field label="Venue"><input style={inputStyle} placeholder="Pitch name" value={mVenue} onChange={(e) => setMVenue(e.target.value)} /></Field>
              <button onClick={addMatch} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Add fixture</button>
            </div>
          </div>

          <div>
            <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>MANAGE MATCHES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {competitionMatches.map((m) => (
                <div key={m.id} style={{ background: C.chalk, borderRadius: 14, padding: 12, border: `1px solid ${C.line}` }}>
                  <div className="f-mono" style={{ fontSize: 9.5, color: (m.stage || "Group Stage") === "Group Stage" ? C.pitch : C.rust, opacity: 0.7, letterSpacing: 0.5, marginBottom: 4 }}>{(m.stage || "Group Stage").toUpperCase()}</div>
                  <div className="f-body" style={{ fontSize: 13, fontWeight: 700, color: C.soil, marginBottom: 8 }}>{teamName_(m.teamAId)} vs {teamName_(m.teamBId)}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <input type="number" style={{ ...inputStyle, width: 55 }} value={m.scoreA} onChange={(e) => updateMatch(m.id, { scoreA: Number(e.target.value) })} />
                    <span className="f-mono" style={{ opacity: 0.5 }}>–</span>
                    <input type="number" style={{ ...inputStyle, width: 55 }} value={m.scoreB} onChange={(e) => updateMatch(m.id, { scoreB: Number(e.target.value) })} />
                    <select style={{ ...inputStyle, flex: 1 }} value={m.status} onChange={(e) => updateMatch(m.id, { status: e.target.value })}>
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="finished">Finished</option>
                    </select>
                  </div>
                  <ScorerRow match={m} updateMatch={updateMatch} />
                  <CommentaryRow match={m} updateMatch={updateMatch} />
                  <MotmRow match={m} updateMatch={updateMatch} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button onClick={() => removeMatch(m.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>POST NEWS</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <Field label="Title"><input style={inputStyle} value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} /></Field>
          <Field label="Photo (optional)">
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ ...inputStyle, padding: "7px 9px" }} />
            {imageUploading && <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6, marginTop: 6 }}>Uploading…</div>}
            {newsImageUrl && !imageUploading && (
              <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                <img src={newsImageUrl} alt="" style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.line}` }} />
                <button onClick={() => setNewsImageUrl("")} style={{ position: "absolute", top: -6, right: -6, background: C.rust, border: "none", borderRadius: 999, width: 18, height: 18, color: C.chalk, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
              </div>
            )}
          </Field>
          <Field label="Body — separate paragraphs with a blank line">
            <textarea style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} value={newsBody} onChange={(e) => setNewsBody(e.target.value)} />
          </Field>
          <button onClick={addNews} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Publish</button>
          <div style={{ marginTop: 12 }}>
            {news.map((n) => (
              <NewsModerationRow key={n.id} post={n} news={news} setNews={setNews} removeNews={removeNews} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuyoFootballApp() {
  const [competitions, setCompetitionsState] = useState([]);
  const [teams, setTeamsState] = useState([]);
  const [matches, setMatchesState] = useState([]);
  const [news, setNewsState] = useState([]);
  const [activeCompetitionId, setActiveCompetitionId] = useState("");
  const [tab, setTab] = useState("scores");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [likedPosts, setLikedPostsState] = useState(() => {
    try {
      const raw = localStorage.getItem("auyo-liked-posts");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [votedMatches, setVotedMatches] = useState(() => {
    try {
      const raw = localStorage.getItem("auyo-voted-matches");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let comps = await loadKey("auyo-competitions");
        if (!comps) { comps = seedCompetitions(); await saveKey("auyo-competitions", comps); }
        let t = await loadKey("auyo-teams");
        if (!t) { t = seedTeams(comps[0].id); await saveKey("auyo-teams", t); }
        let m = await loadKey("auyo-matches");
        if (!m) { m = seedMatches(comps[0].id, t); await saveKey("auyo-matches", m); }
        let n = await loadKey("auyo-news");
        if (!n) { n = seedNews(); await saveKey("auyo-news", n); }
        setCompetitionsState(comps); setTeamsState(t); setMatchesState(m); setNewsState(n);
        setActiveCompetitionId(comps[0]?.id || "");
        setLoading(false);
      } catch (e) {
        console.error("Failed to load data", e);
        setLoadError(true);
        setLoading(false);
      }
    })();
  }, []);

  const [saveError, setSaveError] = useState(false);
  const safeSave = useCallback((key, value) => {
    saveKey(key, value).catch((e) => {
      console.error("save failed", key, e);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 6000);
    });
  }, []);

  const setCompetitions = useCallback((v) => { setCompetitionsState(v); safeSave("auyo-competitions", v); }, [safeSave]);
  const setTeams = useCallback((v) => { setTeamsState(v); safeSave("auyo-teams", v); }, [safeSave]);
  const setMatches = useCallback((v) => { setMatchesState(v); safeSave("auyo-matches", v); }, [safeSave]);
  const setNews = useCallback((v) => { setNewsState(v); safeSave("auyo-news", v); }, [safeSave]);

  const toggleLike = useCallback((postId) => {
    setLikedPostsState((prevLiked) => {
      const already = prevLiked.has(postId);
      const nextLiked = new Set(prevLiked);
      already ? nextLiked.delete(postId) : nextLiked.add(postId);
      try { localStorage.setItem("auyo-liked-posts", JSON.stringify([...nextLiked])); } catch {}
      setNewsState((prevNews) => {
        const updated = prevNews.map((n) => (n.id === postId ? { ...n, likes: Math.max(0, (n.likes || 0) + (already ? -1 : 1)) } : n));
        safeSave("auyo-news", updated);
        return updated;
      });
      return nextLiked;
    });
  }, [safeSave]);

  const onVote = useCallback((matchId, candidateId) => {
    setVotedMatches((prevVoted) => {
      if (prevVoted.has(matchId)) return prevVoted;
      const nextVoted = new Set(prevVoted).add(matchId);
      try { localStorage.setItem("auyo-voted-matches", JSON.stringify([...nextVoted])); } catch {}
      setMatchesState((prevMatches) => {
        const updated = prevMatches.map((m) => {
          if (m.id !== matchId) return m;
          const motm = m.motm || { candidates: [], votes: {} };
          const votes = { ...motm.votes, [candidateId]: (motm.votes[candidateId] || 0) + 1 };
          return { ...m, motm: { ...motm, votes } };
        });
        safeSave("auyo-matches", updated);
        return updated;
      });
      return nextVoted;
    });
  }, [safeSave]);

  const activeCompetition = competitions.find((c) => c.id === activeCompetitionId);
  const compTeams = teams.filter((t) => t.competitionId === activeCompetitionId);
  const compMatches = matches.filter((m) => m.competitionId === activeCompetitionId);
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "TBD";
  const teamGroup = (id) => teams.find((t) => t.id === id)?.group || "";
  const liveCount = compMatches.filter((m) => m.status === "live").length;

  const [secretTaps, setSecretTaps] = useState({ count: 0, last: 0 });
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const handleTitleTap = () => {
    const now = Date.now();
    setSecretTaps((prev) => {
      const withinWindow = now - prev.last < 2000;
      const count = withinWindow ? prev.count + 1 : 1;
      if (count >= 7) setSecretUnlocked(true);
      return { count, last: now };
    });
  };
  const isAdminAccess = secretUnlocked || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1");

  const tabs = [
    { key: "scores", label: "Scores", icon: Radio },
    { key: "scorers", label: "Scorers", icon: Target },
    { key: "table", label: "Table", icon: Table2 },
    { key: "news", label: "News", icon: Newspaper },
    ...(isAdminAccess ? [{ key: "admin", label: "Admin", icon: Lock }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.pitchDark, display: "flex", justifyContent: "center" }}>
      <style>{FONTS}</style>
      <div style={{ width: "100%", maxWidth: 430, position: "relative" }}>
        <Pitch style={{ background: `linear-gradient(180deg, ${C.pitch} 0%, ${C.pitchDark} 260px)`, padding: "26px 18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="f-mono" style={{ fontSize: 10.5, color: C.ochre, letterSpacing: 3, marginBottom: 4 }}>FOOTBALL UPDATES</div>
              <div className="f-display" onClick={handleTitleTap} style={{ fontSize: 32, color: C.chalk, letterSpacing: 0.5, lineHeight: 1, userSelect: "none" }}>AUYO FOOTBALL</div>
            </div>
            {liveCount > 0 && (
              <div className="f-mono" style={{ background: C.rust, color: C.chalk, fontSize: 11, padding: "5px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: C.chalk }} />
                {liveCount} LIVE
              </div>
            )}
          </div>

          {competitions.length > 0 && (
            <div style={{ marginTop: 16, position: "relative" }}>
              <button
                onClick={() => setPickerOpen(!pickerOpen)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 12px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <span className="f-body" style={{ color: C.chalk, fontSize: 13, fontWeight: 600 }}>{activeCompetition?.name || "Select competition"}</span>
                <ChevronDown size={14} color={C.chalk} style={{ transform: pickerOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {activeCompetition?.subtitle && (
                <div className="f-mono" style={{ fontSize: 10, color: C.chalk, opacity: 0.55, marginTop: 6, marginLeft: 4 }}>{activeCompetition.subtitle}</div>
              )}
              {pickerOpen && (
                <div style={{ position: "absolute", top: 40, left: 0, background: C.chalk, borderRadius: 12, border: `1px solid ${C.line}`, minWidth: 200, zIndex: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.25)", overflow: "hidden" }}>
                  {competitions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setActiveCompetitionId(c.id); setPickerOpen(false); }}
                      style={{ padding: "10px 14px", cursor: "pointer", background: c.id === activeCompetitionId ? "rgba(27,67,50,0.08)" : "transparent", borderBottom: `1px solid ${C.line}` }}
                    >
                      <div className="f-body" style={{ fontSize: 13, color: C.soil, fontWeight: c.id === activeCompetitionId ? 700 : 500 }}>{c.name}</div>
                      {c.subtitle && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{c.subtitle}</div>}
                    </div>
                  ))}
                  {isAdminAccess && (
                    <div onClick={() => { setTab("admin"); setPickerOpen(false); }} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <Plus size={13} color={C.pitch} />
                      <span className="f-body" style={{ fontSize: 12.5, color: C.pitch, fontWeight: 600 }}>Add competition</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            {saveError && (
              <div className="f-body" style={{ background: C.rust, color: C.chalk, fontSize: 12, padding: "8px 12px", borderRadius: 10, marginBottom: 12, textAlign: "center" }}>
                ⚠ Couldn't save your last change — check your connection or Firestore rules.
              </div>
            )}
            {loading ? (
              <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>Loading fixtures…</div>
            ) : loadError ? (
              <div className="f-body" style={{ color: C.chalk, opacity: 0.85, textAlign: "center", marginTop: 40, padding: "0 12px", lineHeight: 1.5 }}>
                ⚠ Couldn't load live data. This usually means the Firestore database rules are blocking access (test mode expires after 30 days). Fix the rules in your Firebase console, then reload this page — your data hasn't been deleted, it just couldn't be reached.
              </div>
            ) : (
              <>
                {tab === "scores" && <ScoresTab matches={compMatches} teamName={teamName} teamGroup={teamGroup} competitionName={activeCompetition?.name} votedMatches={votedMatches} onVote={onVote} />}
                {tab === "scorers" && <ScorersTab matches={compMatches} teamName={teamName} />}
                {tab === "table" && <TableTab competition={activeCompetition} teams={compTeams} matches={compMatches} />}
                {tab === "news" && <NewsTab news={news} setNews={setNews} likedPosts={likedPosts} toggleLike={toggleLike} />}
                {tab === "admin" && isAdminAccess && (
                  <AdminTab
                    competitions={competitions} setCompetitions={setCompetitions}
                    activeCompetitionId={activeCompetitionId} setActiveCompetitionId={setActiveCompetitionId}
                    teams={teams} setTeams={setTeams}
                    matches={matches} setMatches={setMatches}
                    news={news} setNews={setNews}
                    unlocked={unlocked} setUnlocked={setUnlocked}
                  />
                )}
              </>
            )}
          </div>
        </Pitch>

        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.chalk, borderTop: `1px solid ${C.line}`, display: "flex", padding: "8px 4px 12px", boxShadow: "0 -4px 14px rgba(0,0,0,0.12)" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0" }}>
                <Icon size={17} color={active ? C.pitch : C.soil} strokeWidth={active ? 2.4 : 1.8} style={{ opacity: active ? 1 : 0.45 }} />
                <span className="f-mono" style={{ fontSize: 9, letterSpacing: 0.3, color: active ? C.pitch : C.soil, opacity: active ? 1 : 0.45, fontWeight: active ? 700 : 500 }}>{t.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
