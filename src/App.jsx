import React, { useState, useEffect, useCallback } from "react";
import { Radio, Newspaper, Table2, Lock, Plus, Trash2, Clock, MapPin, ChevronRight, Unlock, Target, ChevronDown, Share2, Info } from "lucide-react";
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

function AdBanner({ ads }) {
  const [index, setIndex] = useState(0);
  const activeAds = ads || [];

  useEffect(() => {
    if (activeAds.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  if (activeAds.length === 0) return null;
  const ad = activeAds[index % activeAds.length];

  return (
    <div style={{ marginTop: 16 }}>
      <div className="f-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: C.chalk, opacity: 0.45, marginBottom: 8 }}>ADVERTISEMENT</div>
      <div
        onClick={() => ad.url && window.open(ad.url, "_blank", "noopener,noreferrer")}
        style={{ width: "100%", height: 150, borderRadius: 12, overflow: "hidden", background: C.chalk, position: "relative", cursor: ad.url ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {ad.imageUrl && <img src={ad.imageUrl} alt={ad.businessName || "Advertisement"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        <span className="f-mono" style={{ position: "absolute", top: 6, right: 8, fontSize: 8.5, color: C.soil, opacity: 0.4, letterSpacing: 0.5 }}>AD</span>
      </div>
      {activeAds.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
          {activeAds.map((_, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: i === index % activeAds.length ? C.ochre : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorBanner({ sponsors }) {
  if (!sponsors || sponsors.length === 0) return null;
  return (
    <div style={{ margin: "14px -18px 0", padding: "10px 18px", background: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="f-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: C.chalk, opacity: 0.45, marginBottom: 8 }}>SPONSORED BY</div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 2 }}>
        {sponsors.map((s) => (
          <button
            key={s.id}
            onClick={() => s.url && window.open(s.url, "_blank", "noopener,noreferrer")}
            style={{ background: C.chalk, border: "none", borderRadius: 10, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: s.url ? "pointer" : "default" }}
          >
            {s.logoUrl && <img src={s.logoUrl} alt={s.name} style={{ height: 22, maxWidth: 70, objectFit: "contain" }} />}
            <span className="f-body" style={{ fontSize: 11.5, fontWeight: 600, color: C.soil, whiteSpace: "nowrap" }}>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const LEGAL_CONTENT = {
  about: {
    label: "About Us",
    paragraphs: [
      "Auyo Football is a free, community-built app for following grassroots football competitions in Auyo, Jigawa State and beyond.",
      "Auyo Football is developed and operated by Tafasa LLC. Our goal is straightforward: make it easier for local competitions to reach the people who care about them, and to give small sponsors a genuine way to support the football their communities already love.",
      "The app is run by volunteers and organizers on the ground — match results, commentary, and news are added by competition administrators in real time, so what you see here is as close to matchday as it gets.",
    ],
  },
  contact: {
    label: "Contact Us",
    paragraphs: [
      "We'd like to hear from you — whether it's a question about a competition, a correction to a result, interest in sponsorship, or feedback on the app itself.",
    ],
    fields: [
      { label: "Company", value: "Tafasa LLC" },
      { label: "Location", value: "Auyo, Jigawa State, Nigeria" },
      { label: "Email", value: "Tafasallc@gmail.com" },
      { label: "Phone / WhatsApp", value: "09125158397" },
      { label: "Address", value: "No. 6 Auyo Liberia, opposite Auyo local government Education authority secretariat, Jigawa state, Nigeria." },
    ],
    closing: "For urgent corrections to a live score or match result, please contact the competition administrator directly if you know them, as this is usually the fastest route.",
  },
  privacy: {
    label: "Privacy Policy",
    meta: "Last updated: 24 August, 2026",
    sections: [
      { heading: null, body: 'This Privacy Policy explains how Tafasa LLC ("we," "us," "our") handles information in connection with the Auyo Football app ("the App"). We\'ve tried to keep this simple, because the App itself is simple: there are no user accounts, and we collect very little information about you.' },
      { heading: "Information We Collect", bullets: [
        'Comments you post. If you leave a comment on a news post, we store the comment text and the name you choose to enter (you may enter "Anonymous" or any name you like — we do not verify identity).',
        "Likes and votes. When you like a news post or vote for Man of the Match, we record that action against your device only, so you don't accidentally vote or like more than once. This is stored locally on your device, not tied to your name or identity.",
        "Technical information. Like most websites and apps, our hosting and infrastructure providers may automatically log basic technical data (such as IP address and browser type) for security and performance purposes.",
      ], body: "We do not require or collect your phone number, email address, date of birth, or any government identification to use the App." },
      { heading: "How We Use Information", body: "We use the information above solely to operate the App: displaying comments and likes, preventing duplicate votes, keeping the App secure, and improving how it works. We do not sell your information, and we do not use it for targeted advertising." },
      { heading: "Sponsor Links", body: "The App may display sponsor banners. Tapping a sponsor's logo takes you to their own website, which is outside our control. We are not responsible for the privacy practices or content of sponsor websites." },
      { heading: "Data Retention", body: "Comments, likes, and votes remain associated with the relevant match or news post for as long as that content stays on the App, or until an administrator removes it." },
      { heading: "Children's Privacy", body: "The App is intended for a general audience and is not specifically directed at children. We do not knowingly collect personal information from children. If you believe a child has submitted a comment containing personal information, please contact us and we will remove it." },
      { heading: "Your Rights", body: "Under the Nigeria Data Protection Act (NDPA) 2023, you have rights regarding personal data relating to you, including the right to request access to, correction of, or deletion of a comment you've posted. To make such a request, please contact us using the details in the Contact Us section, and reference the specific comment and post." },
      { heading: "Changes to This Policy", body: 'We may update this Privacy Policy from time to time as the App evolves. We will update the "Last updated" date above when changes are made.' },
      { heading: "Contact", body: "Questions about this Privacy Policy can be directed to Tafasa LLC using the contact details listed in the Contact Us section." },
    ],
  },
  terms: {
    label: "Terms & Conditions",
    meta: "Last updated: 24 August, 2026",
    sections: [
      { heading: null, body: 'Please read these Terms & Conditions ("Terms") carefully before using the Auyo Football app ("the App"), operated by Tafasa LLC ("we," "us," "our"). By accessing or using the App, you agree to be bound by these Terms. If you do not agree, please do not use the App.' },
      { heading: "1. Use of the App", body: "The App provides free access to football competition information, including live scores, goal scorers, league tables, match commentary, news, and related content, for competitions such as the 77 Sport Competition. The App is provided for personal, non-commercial use." },
      { heading: "2. User-Generated Content", body: "The App allows visitors to post comments and like news posts. By posting a comment, you agree that:", bullets: [
        "You are responsible for the content you submit.",
        "You will not post content that is abusive, defamatory, hateful, obscene, threatening, or otherwise unlawful.",
        "You will not impersonate another person or organization.",
        "We reserve the right, but not the obligation, to review, moderate, or remove any comment at our sole discretion, without notice.",
      ] },
      { heading: "3. Accuracy of Information", body: "Match scores, statistics, commentary, and news are entered by competition administrators, often in real time during live matches. While we and our administrators aim for accuracy, we do not guarantee that all information on the App is complete, current, or error-free. Official results from the relevant football competition authority should be treated as authoritative in the event of any discrepancy." },
      { heading: "4. Sponsors and Third-Party Links", body: "The App may display sponsor banners and links to third-party websites. These links are provided for convenience only. We do not endorse, and are not responsible for, the content, products, services, or practices of any third-party website linked from the App." },
      { heading: "5. Intellectual Property", body: "The App's design, branding, and original content are the property of Tafasa LLC unless otherwise stated. Comments and other content submitted by users remain the property of their respective authors, but by posting, you grant us a non-exclusive, royalty-free license to display that content within the App." },
      { heading: "6. Disclaimer of Warranties", body: 'The App is provided "as is" and "as available," without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee uninterrupted or error-free operation of the App.' },
      { heading: "7. Limitation of Liability", body: "To the fullest extent permitted by law, Tafasa LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the App, including reliance on any information displayed within it." },
      { heading: "8. Changes to the App or These Terms", body: "We may modify, suspend, or discontinue the App, or any part of it, at any time. We may also update these Terms from time to time; continued use of the App after changes are posted constitutes acceptance of the revised Terms." },
      { heading: "9. Governing Law", body: "These Terms are governed by the laws of the Federal Republic of Nigeria." },
      { heading: "10. Contact", body: "Questions about these Terms can be directed to Tafasa LLC using the contact details listed in the Contact Us section." },
    ],
  },
};

function LegalTab({ onClose }) {
  const [section, setSection] = useState("about");
  const content = LEGAL_CONTENT[section];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
        >
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {Object.entries(LEGAL_CONTENT).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            style={{
              flexShrink: 0, border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 12,
              fontFamily: "'Work Sans', sans-serif", fontWeight: 700, cursor: "pointer",
              background: section === key ? C.ochre : "rgba(255,255,255,0.1)",
              color: section === key ? C.chalk : C.chalk,
              opacity: section === key ? 1 : 0.6,
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      <div style={{ background: C.chalk, borderRadius: 14, padding: 18, border: `1px solid ${C.line}` }}>
        <div className="f-display" style={{ fontSize: 20, color: C.pitch, marginBottom: content.meta ? 4 : 14 }}>{content.label}</div>
        {content.meta && <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginBottom: 14 }}>{content.meta}</div>}

        {content.paragraphs && content.paragraphs.map((p, i) => (
          <p key={i} className="f-body" style={{ fontSize: 13, color: C.soil, opacity: 0.85, lineHeight: 1.6, marginBottom: 12 }}>{p}</p>
        ))}

        {content.fields && (
          <div style={{ marginBottom: 12 }}>
            {content.fields.map((f, i) => (
              <div key={i} className="f-body" style={{ fontSize: 13, color: C.soil, marginBottom: 6 }}>
                <b>{f.label}:</b> <span style={{ color: f.value.startsWith("[") ? C.rust : C.soil, fontStyle: f.value.startsWith("[") ? "italic" : "normal" }}>{f.value}</span>
              </div>
            ))}
          </div>
        )}
        {content.closing && <p className="f-body" style={{ fontSize: 13, color: C.soil, opacity: 0.85, lineHeight: 1.6 }}>{content.closing}</p>}

        {content.sections && content.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            {s.heading && <div className="f-body" style={{ fontSize: 14, fontWeight: 700, color: C.soil, marginBottom: 6 }}>{s.heading}</div>}
            {s.bullets && (
              <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                {s.bullets.map((b, bi) => (
                  <li key={bi} className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.85, lineHeight: 1.6, marginBottom: 4 }}>{b}</li>
                ))}
              </ul>
            )}
            {s.body && <p className="f-body" style={{ fontSize: 13, color: C.soil, opacity: 0.85, lineHeight: 1.6, margin: 0 }}>{s.body}</p>}
          </div>
        ))}
      </div>
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const sorted = [...news].sort((a, b) => (a.date < b.date ? 1 : -1));

  const submitComment = (postId, parentId) => {
    const draftKey = parentId ? `reply:${parentId}` : postId;
    const text = (parentId ? (replyDrafts[parentId] || "") : (commentDrafts[postId] || "")).trim();
    if (!text) return;
    const updated = news.map((n) =>
      n.id === postId
        ? { ...n, comments: [...(n.comments || []), { id: uid(), name: nameDraft.trim() || "Anonymous", text, date: new Date().toISOString().slice(0, 10), parentId: parentId || null }] }
        : n
    );
    setNews(updated);
    if (parentId) {
      setReplyDrafts({ ...replyDrafts, [parentId]: "" });
      setReplyingTo(null);
    } else {
      setCommentDrafts({ ...commentDrafts, [postId]: "" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 90 }}>
      {sorted.map((n) => {
        const open = openId === n.id;
        const liked = likedPosts.has(n.id);
        const likes = n.likes || 0;
        const comments = n.comments || [];
        const topLevel = comments.filter((c) => !c.parentId);
        const repliesTo = (parentId) => comments.filter((c) => c.parentId === parentId);
        return (
          <div key={n.id} style={{ background: C.chalk, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
            {n.imageUrl && (
              <div onClick={() => setOpenId(open ? null : n.id)} style={{ width: "100%", height: 160, overflow: "hidden", background: C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={n.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {topLevel.map((c) => (
                    <div key={c.id}>
                      <div style={{ background: C.sand || "#F2E9D8", borderRadius: 10, padding: "8px 10px" }}>
                        <div className="f-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.soil }}>{c.name}</div>
                        <div className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.8, marginTop: 2 }}>{c.text}</div>
                        <button
                          onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}
                        >
                          <span className="f-mono" style={{ fontSize: 10.5, color: C.pitch, fontWeight: 700, letterSpacing: 0.3 }}>REPLY</span>
                        </button>
                      </div>

                      {repliesTo(c.id).length > 0 && (
                        <div style={{ marginLeft: 18, marginTop: 6, display: "flex", flexDirection: "column", gap: 6, borderLeft: `2px solid ${C.line}`, paddingLeft: 10 }}>
                          {repliesTo(c.id).map((r) => (
                            <div key={r.id} style={{ background: C.sand || "#F2E9D8", borderRadius: 10, padding: "7px 9px", opacity: 0.92 }}>
                              <div className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.soil }}>{r.name}</div>
                              <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.8, marginTop: 2 }}>{r.text}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingTo === c.id && (
                        <div style={{ marginLeft: 18, marginTop: 6, display: "flex", gap: 6 }}>
                          <input
                            style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }}
                            placeholder={`Reply to ${c.name}…`}
                            value={replyDrafts[c.id] || ""}
                            onChange={(e) => setReplyDrafts({ ...replyDrafts, [c.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") submitComment(n.id, c.id); }}
                          />
                          <button onClick={() => submitComment(n.id, c.id)} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 12px", fontSize: 12 }}>Reply</button>
                        </div>
                      )}
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

const COMMENTARY_PRESETS = [
  { label: "⚽ Kickoff", text: "Kickoff! The match is underway." },
  { label: "⚽ Goal", text: "GOAL!" },
  { label: "🟨 Yellow", text: "Yellow card shown." },
  { label: "🟥 Red", text: "Red card! Down to 10 men." },
  { label: "📐 Corner", text: "Corner kick." },
  { label: "🔄 Sub", text: "Substitution." },
  { label: "⏱ Half-time", text: "Half-time whistle blows." },
  { label: "🏁 Full-time", text: "Full-time! The referee blows the final whistle." },
];

function estimateMinute(match) {
  try {
    const start = new Date(`${match.date}T${match.time}`).getTime();
    const mins = Math.round((Date.now() - start) / 60000);
    return Math.min(120, Math.max(0, mins));
  } catch {
    return 0;
  }
}

function CommentaryRow({ match, updateMatch }) {
  const [minute, setMinute] = useState(() => String(estimateMinute(match)));
  const [text, setText] = useState("");
  const commentary = match.commentary || [];

  const addEntry = (overrideText) => {
    const finalText = (overrideText ?? text).trim();
    if (!finalText) return;
    const entries = [...commentary, { id: uid(), minute: minute || "0", text: finalText }];
    updateMatch(match.id, { commentary: entries });
    setText("");
    setMinute(String(estimateMinute(match)));
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, marginBottom: 6 }}>
        {COMMENTARY_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => addEntry(p.text)}
            style={{ background: C.sand || "#F2E9D8", border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 11.5, fontFamily: "'Work Sans', sans-serif", color: C.soil, cursor: "pointer" }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="f-body" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginBottom: 6 }}>Tap a preset to log it instantly, or write your own below.</div>

      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" min={0} max={120} placeholder="Min" style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 50 }} value={minute} onChange={(e) => setMinute(e.target.value)} />
        <input placeholder="e.g. Great strike from outside the box" style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }} />
        <button onClick={() => addEntry()} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px" }}><Plus size={13} /></button>
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
    const remaining = comments.filter((c) => c.id !== commentId && c.parentId !== commentId);
    const updated = news.map((n) => (n.id === post.id ? { ...n, comments: remaining } : n));
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
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: C.line, opacity: 0.9, borderRadius: 8, padding: "6px 8px", marginLeft: c.parentId ? 16 : 0 }}>
              <div>
                {c.parentId && <div className="f-mono" style={{ fontSize: 9, color: C.soil, opacity: 0.5 }}>REPLY</div>}
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

function AdminTab({ competitions, setCompetitions, activeCompetitionId, setActiveCompetitionId, teams, setTeams, matches, setMatches, news, setNews, sponsors, setSponsors, ads, setAds, unlocked, setUnlocked }) {
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
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState("");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");
  const [sponsorLogoUploading, setSponsorLogoUploading] = useState(false);
  const [adBusinessName, setAdBusinessName] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adImageUploading, setAdImageUploading] = useState(false);

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

  const addSponsor = () => {
    if (!sponsorName.trim()) return;
    setSponsors([...sponsors, { id: uid(), name: sponsorName.trim(), url: sponsorUrl.trim(), logoUrl: sponsorLogoUrl || null }]);
    setSponsorName(""); setSponsorUrl(""); setSponsorLogoUrl("");
  };
  const removeSponsor = (id) => setSponsors(sponsors.filter((s) => s.id !== id));
  const handleSponsorLogoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSponsorLogoUploading(true);
    try {
      const url = await uploadImage(file);
      setSponsorLogoUrl(url);
    } catch (err) {
      console.error("Logo upload failed", err);
      alert("Couldn't upload logo — check your connection and Firebase Storage rules.");
    } finally {
      setSponsorLogoUploading(false);
    }
  };

  const addAd = () => {
    if (!adImageUrl) return;
    setAds([...ads, { id: uid(), businessName: adBusinessName.trim(), url: adUrl.trim(), imageUrl: adImageUrl }]);
    setAdBusinessName(""); setAdUrl(""); setAdImageUrl("");
  };
  const removeAd = (id) => setAds(ads.filter((a) => a.id !== id));
  const handleAdImageSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAdImageUploading(true);
    try {
      const url = await uploadImage(file);
      setAdImageUrl(url);
    } catch (err) {
      console.error("Ad image upload failed", err);
      alert("Couldn't upload image — check your connection and Firebase Storage rules.");
    } finally {
      setAdImageUploading(false);
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

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>SPONSORS</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          {sponsors.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {s.logoUrl && <img src={s.logoUrl} alt="" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6 }} />}
                <div>
                  <div className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil }}>{s.name}</div>
                  {s.url && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{s.url}</div>}
                </div>
              </div>
              <button onClick={() => removeSponsor(s.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <Field label="Sponsor name"><input style={inputStyle} placeholder="e.g. Kuliya Stores" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} /></Field>
            <Field label="Website / page to open on tap (optional)"><input style={inputStyle} placeholder="https://..." value={sponsorUrl} onChange={(e) => setSponsorUrl(e.target.value)} /></Field>
            <Field label="Logo (optional)">
              <input type="file" accept="image/*" onChange={handleSponsorLogoSelect} style={{ ...inputStyle, padding: "7px 9px" }} />
              {sponsorLogoUploading && <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6, marginTop: 6 }}>Uploading…</div>}
              {sponsorLogoUrl && !sponsorLogoUploading && (
                <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                  <img src={sponsorLogoUrl} alt="" style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: `1px solid ${C.line}`, background: C.sand || "#F2E9D8" }} />
                  <button onClick={() => setSponsorLogoUrl("")} style={{ position: "absolute", top: -6, right: -6, background: C.rust, border: "none", borderRadius: 999, width: 18, height: 18, color: C.chalk, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              )}
            </Field>
            <button onClick={addSponsor} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Add sponsor</button>
          </div>
        </div>
      </div>

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>ADVERTISEMENTS</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 10, lineHeight: 1.4 }}>
            Big rotating banner shown at the top of the app. Upload a poster/flyer-style image — full-width, landscape works best.
          </div>
          {ads.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {a.imageUrl && <img src={a.imageUrl} alt="" style={{ width: 44, height: 30, objectFit: "cover", borderRadius: 6 }} />}
                <div>
                  <div className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil }}>{a.businessName || "(no name)"}</div>
                  {a.url && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{a.url}</div>}
                </div>
              </div>
              <button onClick={() => removeAd(a.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <Field label="Business name"><input style={inputStyle} placeholder="e.g. Kuliya Stores" value={adBusinessName} onChange={(e) => setAdBusinessName(e.target.value)} /></Field>
            <Field label="Website / page to open on tap (optional)"><input style={inputStyle} placeholder="https://..." value={adUrl} onChange={(e) => setAdUrl(e.target.value)} /></Field>
            <Field label="Ad image">
              <input type="file" accept="image/*" onChange={handleAdImageSelect} style={{ ...inputStyle, padding: "7px 9px" }} />
              {adImageUploading && <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6, marginTop: 6 }}>Uploading…</div>}
              {adImageUrl && !adImageUploading && (
                <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                  <img src={adImageUrl} alt="" style={{ width: 140, height: 60, objectFit: "contain", borderRadius: 8, border: `1px solid ${C.line}`, background: C.sand || "#F2E9D8" }} />
                  <button onClick={() => setAdImageUrl("")} style={{ position: "absolute", top: -6, right: -6, background: C.rust, border: "none", borderRadius: 999, width: 18, height: 18, color: C.chalk, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              )}
            </Field>
            <button onClick={addAd} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Add advertisement</button>
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
  const [sponsors, setSponsorsState] = useState([]);
  const [ads, setAdsState] = useState([]);
  const [activeCompetitionId, setActiveCompetitionId] = useState("");
  const [tab, setTab] = useState("scores");
  const [previousTab, setPreviousTab] = useState("scores");
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
        let sp = await loadKey("auyo-sponsors");
        if (!sp) sp = [];
        let ad = await loadKey("auyo-ads");
        if (!ad) ad = [];
        setCompetitionsState(comps); setTeamsState(t); setMatchesState(m); setNewsState(n); setSponsorsState(sp); setAdsState(ad);
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
  const setSponsors = useCallback((v) => { setSponsorsState(v); safeSave("auyo-sponsors", v); }, [safeSave]);
  const setAds = useCallback((v) => { setAdsState(v); safeSave("auyo-ads", v); }, [safeSave]);

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {liveCount > 0 && (
                <div className="f-mono" style={{ background: C.rust, color: C.chalk, fontSize: 11, padding: "5px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: C.chalk }} />
                  {liveCount} LIVE
                </div>
              )}
              <button onClick={() => { setPreviousTab(tab); setTab("legal"); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Info size={15} color={C.chalk} style={{ opacity: 0.8 }} />
              </button>
            </div>
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

          <AdBanner ads={ads} />
          <SponsorBanner sponsors={sponsors} />

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
                {tab === "legal" && <LegalTab onClose={() => setTab(previousTab)} />}
                {tab === "admin" && isAdminAccess && (
                  <AdminTab
                    competitions={competitions} setCompetitions={setCompetitions}
                    activeCompetitionId={activeCompetitionId} setActiveCompetitionId={setActiveCompetitionId}
                    teams={teams} setTeams={setTeams}
                    matches={matches} setMatches={setMatches}
                    news={news} setNews={setNews}
                    sponsors={sponsors} setSponsors={setSponsors}
                    ads={ads} setAds={setAds}
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
