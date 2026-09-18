import React, { useState, useEffect, useCallback, useRef } from "react";
import { Radio, Newspaper, Table2, Lock, Plus, Trash2, Clock, MapPin, ChevronRight, Unlock, Target, ChevronDown, Share2, Info, Users, ArrowLeft, Search, ArrowLeftRight } from "lucide-react";
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
.f-display { font-family: 'Anton', sans-serif; }
.f-body { font-family: 'Work Sans', sans-serif; }
.f-mono { font-family: 'JetBrains Mono', monospace; }
`;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Lets any pill/tab row respond to a left/right swipe on its content area,
// moving to the next or previous entry in `order`. A swipe only counts if
// it's clearly more horizontal than vertical and past a minimum distance,
// so normal vertical scrolling isn't mistaken for a tab change.
function useSwipeTabs(order, current, onChange) {
  const start = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const idx = order.indexOf(current);
    if (idx === -1) return;
    if (dx < 0 && idx < order.length - 1) onChange(order[idx + 1]);
    else if (dx > 0 && idx > 0) onChange(order[idx - 1]);
  };
  return { onTouchStart, onTouchEnd };
}

// A player can belong to more than one team (club, academy, quarters/Unguwa
// team, etc). New records use teamIds (array); this stays compatible with
// any older records that only had a single teamId.
const playerTeamIds = (p) => p.teamIds || (p.teamId ? [p.teamId] : []);

// A team can compete in more than one competition (and friendlies), each
// possibly with a different group. New records use a `competitions` array
// of { competitionId, group }; this stays compatible with any older records
// that only had a single competitionId/group.
const teamCompetitionEntries = (t) => t.competitions || (t.competitionId ? [{ competitionId: t.competitionId, group: t.group || null }] : []);
const teamInCompetition = (t, competitionId) => teamCompetitionEntries(t).some((e) => e.competitionId === competitionId);
const teamGroupIn = (t, competitionId) => teamCompetitionEntries(t).find((e) => e.competitionId === competitionId)?.group || null;

const GROUP_A_NAMES = ["Sabon Gari FC", "Kofar Fada Utd", "Layin Dogo Stars", "Bakin Kasuwa FC", "Unguwar Rimi FC", "Tudun Wada Warriors", "Kofar Ruwa FC"];
const GROUP_B_NAMES = ["Yamma Youth FC", "Kudu Kings", "Gabas Rangers", "Arewa Eagles FC", "Sabuwar Kasuwa FC", "Kofar Sauri FC", "Unguwar Liman FC"];

function seedCompetitions() {
  return [{ id: uid(), name: "77 Sport Competition", subtitle: "Unguwa-Unguwa", hasGroups: true }];
}

function seedTeams(competitionId) {
  return [
    ...GROUP_A_NAMES.map((name) => ({ id: uid(), name, competitions: [{ competitionId, group: "A" }] })),
    ...GROUP_B_NAMES.map((name) => ({ id: uid(), name, competitions: [{ competitionId, group: "B" }] })),
  ];
}

function seedMatches(competitionId, teams) {
  const groupA = teams.filter((t) => teamGroupIn(t, competitionId) === "A");
  const groupB = teams.filter((t) => teamGroupIn(t, competitionId) === "B");
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

  // Preload every ad's image as soon as we have the list, so rotating
  // between them is instant instead of triggering a fresh download
  // (and a blank flash) every time the banner switches.
  useEffect(() => {
    activeAds.forEach((ad) => {
      if (ad.imageUrl) {
        const preload = new window.Image();
        preload.src = ad.imageUrl;
      }
    });
  }, [activeAds]);

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
        {ad.imageUrl && <img src={ad.imageUrl} alt={ad.businessName || "Advertisement"} decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
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
            {s.logoUrl && <img src={s.logoUrl} alt={s.name} decoding="async" style={{ height: 22, maxWidth: 70, objectFit: "contain" }} />}
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
  const a = match.teamAName || teamName(match.teamAId);
  const b = match.teamBName || teamName(match.teamBId);
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

function MatchCard({ match, teamName, teamGroup, getCompetitionName, onOpenMatch, onTeamTap, onCompetitionTap }) {
  const a = match.teamAName || teamName(match.teamAId);
  const b = match.teamBName || teamName(match.teamBId);
  const grp = teamGroup(match.teamAId);
  const stage = match.stage || "Group Stage";
  const commentary = match.commentary || [];
  const compLabel = getCompetitionName ? getCompetitionName(match.competitionId) : null;

  return (
    <div style={{ background: C.chalk, borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 0 rgba(43,29,20,0.06)", border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusPill status={match.status} />
          {stage === "Group Stage"
            ? grp && <span className="f-mono" style={{ fontSize: 10, color: C.pitch, opacity: 0.5, letterSpacing: 0.5 }}>GRP {grp}</span>
            : <span className="f-mono" style={{ fontSize: 10, color: C.rust, opacity: 0.85, letterSpacing: 0.5, fontWeight: 700 }}>{stage.toUpperCase()}</span>}
          {compLabel && (
            <span
              onClick={(e) => { if (onCompetitionTap && match.competitionId) { e.stopPropagation(); onCompetitionTap(match.competitionId); } }}
              className="f-mono"
              style={{ fontSize: 9.5, color: C.ochre, opacity: 0.9, letterSpacing: 0.3, background: "rgba(198,138,61,0.12)", padding: "2px 6px", borderRadius: 999, cursor: onCompetitionTap && match.competitionId ? "pointer" : "default" }}
            >
              {compLabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.55, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> {match.time}
          </div>
          <button onClick={(e) => { e.stopPropagation(); shareMatch(match, teamName, compLabel); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <Share2 size={14} color={C.soil} style={{ opacity: 0.45 }} />
          </button>
        </div>
      </div>
      <div onClick={() => onOpenMatch && onOpenMatch(match.id)} style={{ cursor: onOpenMatch ? "pointer" : "default" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="f-body" style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1 }}>
            {a}
          </div>
          {match.status === "upcoming" ? (
            <div className="f-mono" style={{ fontSize: 13, color: C.soil, opacity: 0.4, padding: "0 10px" }}>vs</div>
          ) : (
            <div className="f-display" style={{ fontSize: 26, color: C.pitch, padding: "0 10px", letterSpacing: 1 }}>{match.scoreA}&nbsp;–&nbsp;{match.scoreB}</div>
          )}
          <div className="f-body" style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1, textAlign: "right" }}>
            {b}
          </div>
        </div>
        {match.scorers && match.scorers.length > 0 && (
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
            ⚽ {[...match.scorers].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0)).map((s) => `${s.name} ${s.minute}'${s.ownGoal ? " (OG)" : ""}`).join(", ")}
          </div>
        )}
        <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.45, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {match.venue} · {match.date}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {commentary.length > 0 && <span>💬 {commentary.length}</span>}
            <ChevronRight size={13} style={{ opacity: 0.4 }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function CompactMatchRow({ match, teamName, teamBadge, onOpenMatch }) {
  const a = match.teamAName || teamName(match.teamAId);
  const b = match.teamBName || teamName(match.teamBId);
  const badgeA = match.teamAId ? teamBadge(match.teamAId) : null;
  const badgeB = match.teamBId ? teamBadge(match.teamBId) : null;
  const statusLabel = match.status === "live" ? "LIVE" : match.status === "finished" ? "FT" : match.time;

  const Badge = ({ url, fallback }) =>
    url ? (
      <img src={url} alt="" style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
    ) : (
      <div style={{ width: 28, height: 28, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span className="f-mono" style={{ fontSize: 10.5, color: C.pitch, fontWeight: 700 }}>{fallback}</span>
      </div>
    );

  return (
    <div onClick={() => onOpenMatch && onOpenMatch(match.id)} style={{ display: "flex", alignItems: "center", padding: "13px 12px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>
        <span className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a}</span>
        <Badge url={badgeA} fallback={a[0]} />
      </div>
      <div style={{ width: 62, textAlign: "center", flexShrink: 0 }}>
        {match.status === "upcoming" ? (
          <span className="f-mono" style={{ fontSize: 12, color: C.soil, opacity: 0.55 }}>{match.time}</span>
        ) : (
          <>
            <div className="f-display" style={{ fontSize: 18, color: C.pitch, letterSpacing: 0.5 }}>{match.scoreA} - {match.scoreB}</div>
            <div className="f-mono" style={{ fontSize: 9, color: match.status === "live" ? C.rust : C.soil, opacity: match.status === "live" ? 1 : 0.5, fontWeight: 700, letterSpacing: 0.5 }}>{statusLabel}</div>
          </>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Badge url={badgeB} fallback={b[0]} />
        <span className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b}</span>
      </div>
    </div>
  );
}

function MatchesTab({ matches, teamName, teamBadge, teamGroup, competitions, votedMatches, onVote, onTeamTap, onCompetitionTap, onOpenMatch }) {
  const today = new Date().toISOString().slice(0, 10);

  const getCompetitionName = (id) => {
    if (!id) return "Friendly";
    return competitions.find((c) => c.id === id)?.name || "Friendly";
  };

  const todaysMatches = matches.filter((m) => m.date === today);
  const otherFriendlies = matches.filter((m) => !m.competitionId && m.date !== today);

  const groupedToday = {};
  todaysMatches.forEach((m) => {
    const k = m.competitionId || "friendly";
    if (!groupedToday[k]) groupedToday[k] = [];
    groupedToday[k].push(m);
  });
  const groupKeys = Object.keys(groupedToday);

  const renderGroupCard = (list) => (
    <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line}` }}>
      {list.map((m) => <CompactMatchRow key={m.id} match={m} teamName={teamName} teamBadge={teamBadge} onOpenMatch={onOpenMatch} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: 90 }}>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>TODAY'S MATCHES</div>
        {groupKeys.length === 0 && (
          <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 20, fontSize: 13 }}>
            No matches today. Search for a competition or team to see their full schedule.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groupKeys.map((k) => {
            const isFriendlyGroup = k === "friendly";
            const label = isFriendlyGroup ? "Friendly" : getCompetitionName(k);
            return (
              <div key={k}>
                <div
                  onClick={() => !isFriendlyGroup && onCompetitionTap && onCompetitionTap(k)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.06)", borderRadius: "12px 12px 0 0", cursor: !isFriendlyGroup && onCompetitionTap ? "pointer" : "default" }}
                >
                  <span className="f-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.chalk }}>{label.toUpperCase()}</span>
                  {!isFriendlyGroup && <ChevronRight size={14} color={C.chalk} style={{ opacity: 0.5 }} />}
                </div>
                {renderGroupCard(groupedToday[k])}
              </div>
            );
          })}
        </div>
      </div>

      {otherFriendlies.length > 0 && (
        <div>
          <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>OTHER FRIENDLIES</div>
          {renderGroupCard(otherFriendlies)}
        </div>
      )}
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

function StandingsTable({ standings, onTeamTap }) {
  return (
    <div style={{ background: C.chalk, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden", overflowX: "auto" }}>
      <div className="f-mono" style={{ display: "grid", gridTemplateColumns: "1fr 24px 22px 22px 22px 26px 26px 30px 32px", fontSize: 9.5, color: C.soil, opacity: 0.5, padding: "10px 8px", letterSpacing: 0.3, borderBottom: `1px solid ${C.line}`, minWidth: 380 }}>
        <div>TEAM</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>GF</div><div style={{ textAlign: "center" }}>GA</div><div style={{ textAlign: "center" }}>GD</div><div style={{ textAlign: "center" }}>PTS</div>
      </div>
      {standings.map((r, i) => {
        const gd = r.gf - r.ga;
        return (
          <div key={r.id} onClick={() => onTeamTap && onTeamTap(r.id)} className="f-body" style={{ display: "grid", gridTemplateColumns: "1fr 24px 22px 22px 22px 26px 26px 30px 32px", fontSize: 12.5, padding: "11px 8px", alignItems: "center", borderBottom: i < standings.length - 1 ? `1px solid ${C.line}` : "none", cursor: onTeamTap ? "pointer" : "default", minWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.soil, fontWeight: 600 }}>
              <span className="f-mono" style={{ fontSize: 10, opacity: 0.4, width: 12 }}>{i + 1}</span>{r.name}
            </div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.p}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.w}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.d}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.l}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.gf}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{r.ga}</div>
            <div className="f-mono" style={{ textAlign: "center", opacity: 0.7 }}>{gd > 0 ? `+${gd}` : gd}</div>
            <div className="f-mono" style={{ textAlign: "center", fontWeight: 700, color: C.pitch }}>{r.pts}</div>
          </div>
        );
      })}
    </div>
  );
}

function TableTab({ competition, teams, matches, onTeamTap }) {
  if (!competition?.hasGroups) {
    const standings = computeStandings(teams, matches);
    return (
      <div style={{ paddingBottom: 90 }}>
        <StandingsTable standings={standings} onTeamTap={onTeamTap} />
        {standings.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>Standings will appear once results are added.</div>}
      </div>
    );
  }
  const groupA = teams.filter((t) => teamGroupIn(t, competition.id) === "A");
  const groupB = teams.filter((t) => teamGroupIn(t, competition.id) === "B");
  return (
    <div style={{ paddingBottom: 90, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP A</div>
        <StandingsTable standings={computeStandings(groupA, matches)} onTeamTap={onTeamTap} />
      </div>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP B</div>
        <StandingsTable standings={computeStandings(groupB, matches)} onTeamTap={onTeamTap} />
      </div>
      {teams.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>Standings will appear once results are added.</div>}
    </div>
  );
}

function computeTopScorers(matches, teamName) {
  const rows = {};
  matches.forEach((m) => {
    (m.scorers || []).forEach((s) => {
      if (s.ownGoal) return; // an own goal never counts toward the scorer's personal tally
      const key = s.name.trim().toLowerCase() + "|" + s.teamId;
      if (!rows[key]) rows[key] = { name: s.name, teamId: s.teamId, goals: 0, matchIds: new Set() };
      rows[key].goals += 1;
      rows[key].matchIds.add(m.id);
    });
  });
  return Object.values(rows)
    .map((r) => ({ ...r, teamLabel: teamName(r.teamId), matches: r.matchIds.size }))
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals);
}

function computeTopAssists(matches, teamName) {
  const rows = {};
  matches.forEach((m) => {
    (m.scorers || []).forEach((s) => {
      if (s.ownGoal || !s.assistName || !s.assistName.trim()) return;
      const key = s.assistName.trim().toLowerCase() + "|" + s.teamId;
      if (!rows[key]) rows[key] = { name: s.assistName.trim(), teamId: s.teamId, assists: 0, matchIds: new Set() };
      rows[key].assists += 1;
      rows[key].matchIds.add(m.id);
    });
  });
  return Object.values(rows)
    .map((r) => ({ ...r, teamLabel: teamName(r.teamId), matches: r.matchIds.size }))
    .filter((r) => r.assists > 0)
    .sort((a, b) => b.assists - a.assists);
}

// "Best goalkeeper" is derived from data already on hand rather than a
// separate stat to enter by hand: a goalkeeper is whoever's lineup row was
// set to "gk" for that match, and they're credited a clean sheet whenever
// their team didn't concede in a finished match.
function computeBestGoalkeepers(matches, players, teamName) {
  const rows = {};
  matches.filter((m) => m.status === "finished").forEach((m) => {
    const entriesA = ((m.lineups && m.lineups.teamA) || []).map(normalizeLineupEntry);
    const entriesB = ((m.lineups && m.lineups.teamB) || []).map(normalizeLineupEntry);
    const gkA = entriesA.find((e) => e.row === "gk");
    const gkB = entriesB.find((e) => e.row === "gk");
    const gkAName = gkA && players.find((p) => p.id === gkA.id)?.name;
    const gkBName = gkB && players.find((p) => p.id === gkB.id)?.name;
    if (gkAName) {
      const key = gkAName.trim().toLowerCase() + "|" + m.teamAId;
      if (!rows[key]) rows[key] = { name: gkAName, teamId: m.teamAId, cleanSheets: 0, played: 0 };
      rows[key].played += 1;
      if (Number(m.scoreB) === 0) rows[key].cleanSheets += 1;
    }
    if (gkBName) {
      const key = gkBName.trim().toLowerCase() + "|" + m.teamBId;
      if (!rows[key]) rows[key] = { name: gkBName, teamId: m.teamBId, cleanSheets: 0, played: 0 };
      rows[key].played += 1;
      if (Number(m.scoreA) === 0) rows[key].cleanSheets += 1;
    }
  });
  return Object.values(rows)
    .map((r) => ({ ...r, teamLabel: teamName(r.teamId) }))
    .sort((a, b) => b.cleanSheets - a.cleanSheets);
}

function PlayerProfile({ player, team, matches, onClose }) {
  const stats = team ? computePlayerMatchStats(matches, team.id, player) : { matchesPlayed: 0, minutesPlayed: 0, goals: 0, yellowCards: 0, redCards: 0 };
  const goals = stats.goals;
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <ArrowLeft size={16} color={C.chalk} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div className="f-display" style={{ fontSize: 17, color: C.chalk, lineHeight: 1.1 }}>{player.name}</div>
          {player.jerseyName && <div className="f-body" style={{ fontSize: 13, color: C.chalk, opacity: 0.55, marginTop: 3 }}>{player.jerseyName}</div>}
        </div>
        <div style={{ width: 32, flexShrink: 0 }} />
      </div>

      <div style={{ background: C.chalk, borderRadius: 16, padding: "22px 18px", border: `1px solid ${C.line}`, textAlign: "center" }}>
        {team && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: player.town ? 6 : 16 }}>
            {team.badgeUrl ? (
              <img src={team.badgeUrl} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="f-display" style={{ fontSize: 11, color: C.pitch }}>{team.name?.[0] || "?"}</span>
              </div>
            )}
            <span className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil }}>{team.name}</span>
          </div>
        )}
        {player.town && (
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <MapPin size={11} /> {player.town}
          </div>
        )}

        <div style={{ position: "relative", width: 128, height: 128, margin: "0 auto 16px" }}>
          {player.photoUrl ? (
            <img src={player.photoUrl} alt="" style={{ width: 128, height: 128, borderRadius: 999, objectFit: "cover", border: `3px solid ${C.ochre}` }} />
          ) : (
            <div style={{ width: 128, height: 128, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${C.ochre}` }}>
              <span className="f-display" style={{ fontSize: 40, color: C.pitch }}>{player.name?.[0] || "?"}</span>
            </div>
          )}
          {goals > 0 && (
            <div style={{ position: "absolute", bottom: -4, right: -4, width: 40, height: 40, borderRadius: 999, background: C.pitch, border: `2px solid ${C.chalk}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span className="f-display" style={{ fontSize: 13, color: C.chalk, lineHeight: 1 }}>{goals}</span>
              <span className="f-mono" style={{ fontSize: 6, color: C.chalk, opacity: 0.8, letterSpacing: 0.5 }}>GOALS</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 16 }}>
          <div>
            <div className="f-display" style={{ fontSize: 22, color: C.pitch }}>{player.age || "—"}</div>
            <div className="f-mono" style={{ fontSize: 9.5, color: C.soil, opacity: 0.5, letterSpacing: 0.5 }}>AGE</div>
          </div>
          <div>
            <div className="f-display" style={{ fontSize: 22, color: C.pitch }}>{player.number || "—"}</div>
            <div className="f-mono" style={{ fontSize: 9.5, color: C.soil, opacity: 0.5, letterSpacing: 0.5 }}>NUMBER</div>
          </div>
        </div>

        {player.position && (
          <span className="f-mono" style={{ display: "inline-block", background: C.rust, color: C.chalk, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, padding: "6px 16px", borderRadius: 999 }}>
            {player.position.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function RefereeProfile({ referee, matches, teamName, onClose }) {
  if (!referee) return null;
  const officiated = matches
    .filter((m) => m.refereeId === referee.id && m.status === "finished")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>
      <div style={{ background: C.chalk, borderRadius: 16, padding: 24, textAlign: "center", border: `1px solid ${C.line}`, marginBottom: 14 }}>
        {referee.photoUrl ? (
          <img src={referee.photoUrl} alt="" style={{ width: 110, height: 110, borderRadius: 999, objectFit: "cover", border: `3px solid ${C.ochre}`, marginBottom: 14 }} />
        ) : (
          <div style={{ width: 110, height: 110, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <span className="f-display" style={{ fontSize: 36, color: C.pitch }}>{referee.name?.[0] || "?"}</span>
          </div>
        )}
        <div className="f-display" style={{ fontSize: 22, color: C.pitch, marginBottom: 4 }}>{referee.name}</div>
        <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, letterSpacing: 0.5 }}>MATCH OFFICIAL</div>
      </div>
      {officiated.length > 0 && (
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>MATCHES OFFICIATED</div>
          {officiated.map((m) => (
            <div key={m.id} className="f-body" style={{ fontSize: 12.5, color: C.soil, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              {teamName(m.teamAId)} {m.scoreA}–{m.scoreB} {teamName(m.teamBId)}
              <span className="f-mono" style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>{m.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Buckets a player's free-text position (e.g. "CB", "Striker", "CDM") into
// one of four pitch rows, since we don't collect exact x/y coordinates.
function positionRow(position) {
  const p = (position || "").toLowerCase();
  if (/\bgk\b|goalkeeper|keeper/.test(p)) return "gk";
  if (/\b(cb|lb|rb|lwb|rwb|def|back)\b/.test(p)) return "def";
  if (/\b(st|cf|fw|forward|striker|wing)\b/.test(p)) return "fwd";
  return "mid";
}

// Lineup entries used to be stored as plain player-id strings. They're now
// { id, row } objects so admin can put a player in a different line than
// their usual position for one specific match (a defender playing midfield,
// etc). This keeps old saved matches working either way.
function normalizeLineupEntry(e) {
  return typeof e === "string" ? { id: e, row: null } : e;
}

function PitchHalf({ roster, flipped, rowOverrides, onPlayerTap }) {
  const hasCoords = roster.some((p) => p._x != null && p._y != null);

  const PlayerDot = ({ p }) => (
    <div
      onClick={() => onPlayerTap && onPlayerTap(p.id)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 60, cursor: onPlayerTap ? "pointer" : "default" }}
    >
      <div style={{ position: "relative" }}>
        {p.photoUrl ? (
          <img src={p.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
        ) : (
          <div style={{ width: 38, height: 38, borderRadius: 999, background: "white", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="f-mono" style={{ fontSize: 12.5, fontWeight: 700, color: C.pitch }}>{p.number || "-"}</span>
          </div>
        )}
        {p.photoUrl && p.number && (
          <span className="f-mono" style={{ position: "absolute", bottom: -3, right: -3, background: C.soil, color: "white", fontSize: 8.5, fontWeight: 700, borderRadius: 999, width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid white" }}>
            {p.number}
          </span>
        )}
      </div>
      <span className="f-body" style={{ fontSize: 9, color: "white", textAlign: "center", lineHeight: 1.15, textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>{p.name}</span>
    </div>
  );

  if (hasCoords) {
    // Players placed by dragging in Admin — position exactly where they
    // were dropped. x/y are 0-100 percentages within this team's own half.
    return (
      <div style={{ position: "relative", flex: 1 }}>
        {roster.map((p) => (
          <div key={p.id} style={{ position: "absolute", left: `${p._x ?? 50}%`, top: `${flipped ? 100 - (p._y ?? 50) : (p._y ?? 50)}%`, transform: "translate(-50%, -50%)" }}>
            <PlayerDot p={p} />
          </div>
        ))}
      </div>
    );
  }

const rows = { gk: [], def: [], mid: [], fwd: [] };
  roster.forEach((p) => rows[(rowOverrides && rowOverrides[p.id]) || positionRow(p.position)].push(p));
  const order = flipped ? ["fwd", "mid", "def", "gk"] : ["gk", "def", "mid", "fwd"];
  const activeRows = order.filter((k) => rows[k].length > 0);

  return (
    // space-between (rather than bunching at one edge) spreads however many
    // rows exist evenly from the goal line to the halfway line, so a 1-row
    // attack and a 4-row defense both look properly positioned regardless
    // of the formation shape.
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "10px 0" }}>
      {activeRows.map((rowKey) => (
        <div key={rowKey} style={{ display: "flex", justifyContent: "space-evenly", flexWrap: "wrap", gap: 6 }}>
          {rows[rowKey].map((p) => <PlayerDot key={p.id} p={p} />)}
        </div>
      ))}
    </div>
  );
}

function PitchMarkings() {
  const line = "rgba(255,255,255,0.45)";
  return (
    <>
      {/* Outer boundary */}
      <div style={{ position: "absolute", inset: 6, border: `1.5px solid ${line}`, borderRadius: 4 }} />
      {/* Halfway line */}
      <div style={{ position: "absolute", left: 6, right: 6, top: "50%", height: 1.5, background: line }} />
      {/* Center circle + spot */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 74, height: 74, borderRadius: 999, border: `1.5px solid ${line}` }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: 999, background: line }} />
      {/* Top penalty box + six-yard box (Team A's goal) */}
      <div style={{ position: "absolute", left: "20%", right: "20%", top: 6, height: 70, border: `1.5px solid ${line}`, borderTop: "none" }} />
      <div style={{ position: "absolute", left: "36%", right: "36%", top: 6, height: 30, border: `1.5px solid ${line}`, borderTop: "none" }} />
      {/* Bottom penalty box + six-yard box (Team B's goal) */}
      <div style={{ position: "absolute", left: "20%", right: "20%", bottom: 6, height: 70, border: `1.5px solid ${line}`, borderBottom: "none" }} />
      <div style={{ position: "absolute", left: "36%", right: "36%", bottom: 6, height: 30, border: `1.5px solid ${line}`, borderBottom: "none" }} />
      {/* Corner arcs */}
      {[["6px", "6px", "0 0"], ["auto", "6px", "0 0"], ["6px", "auto", "0 0"], ["auto", "auto", "0 0"]].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute", width: 14, height: 14, border: `1.5px solid ${line}`, borderRadius: "50%",
            top: i < 2 ? 0 : "auto", bottom: i >= 2 ? 0 : "auto",
            left: i % 2 === 0 ? 0 : "auto", right: i % 2 === 1 ? 0 : "auto",
            clipPath: i === 0 ? "circle(100% at 0 0)" : i === 1 ? "circle(100% at 100% 0)" : i === 2 ? "circle(100% at 0 100%)" : "circle(100% at 100% 100%)",
            margin: 6,
          }}
        />
      ))}
    </>
  );
}

function SubPlayerChip({ p, onTap }) {
  return (
    <div onClick={() => onTap && onTap(p.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: onTap ? "pointer" : "default" }}>
      {p.photoUrl ? (
        <img src={p.photoUrl} alt="" style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 24, height: 24, borderRadius: 999, background: C.line, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span className="f-mono" style={{ fontSize: 9, fontWeight: 700, color: C.pitch }}>{p.number || "-"}</span>
        </div>
      )}
      <span className="f-body" style={{ fontSize: 12, color: C.soil }}>{p.name}</span>
    </div>
  );
}

function PitchFormation({ lineupA, lineupB, labelA, labelB, rowOverridesA, rowOverridesB, subsA, subsB, referee, assistant1Name, assistant2Name, onPlayerTap, onRefereeTap }) {
  return (
    <div>
      <div
        style={{
          background: "#2E7D4F",
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 11%, transparent 11%, transparent 22%)",
          borderRadius: 10, padding: "12px 8px",
          display: "flex", flexDirection: "column", minHeight: 460, position: "relative", overflow: "hidden",
        }}
      >
        <PitchMarkings />
        <span className="f-mono" style={{ position: "absolute", top: 8, left: 10, fontSize: 10, letterSpacing: 0.5, color: "white", opacity: 0.85, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)", zIndex: 2 }}>{labelA.toUpperCase()}</span>
        <span className="f-mono" style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, letterSpacing: 0.5, color: "white", opacity: 0.85, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)", zIndex: 2 }}>{labelB.toUpperCase()}</span>
        {lineupA.length === 0 && lineupB.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div className="f-body" style={{ color: "white", opacity: 0.75, fontSize: 12.5 }}>Lineups not announced yet.</div>
          </div>
        ) : (
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
            <PitchHalf roster={lineupA} flipped={false} rowOverrides={rowOverridesA} onPlayerTap={onPlayerTap} />
            <PitchHalf roster={lineupB} flipped={true} rowOverrides={rowOverridesB} onPlayerTap={onPlayerTap} />
          </div>
        )}
      </div>

      {(subsA?.length > 0 || subsB?.length > 0) && (
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 9.5, letterSpacing: 1, color: C.chalk, opacity: 0.6, marginBottom: 6, fontWeight: 700 }}>SUBSTITUTES</div>
            {(subsA || []).map((p) => <SubPlayerChip key={p.id} p={p} onTap={onPlayerTap} />)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 9.5, letterSpacing: 1, color: C.chalk, opacity: 0.6, marginBottom: 6, fontWeight: 700, textAlign: "right" }}>SUBSTITUTES</div>
            {(subsB || []).map((p) => <SubPlayerChip key={p.id} p={p} onTap={onPlayerTap} />)}
          </div>
        </div>
      )}

      {(referee?.name || assistant1Name || assistant2Name) && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10 }}>
          {referee?.name && (
            <div onClick={() => onRefereeTap && onRefereeTap()} style={{ display: "flex", alignItems: "center", gap: 8, cursor: onRefereeTap ? "pointer" : "default" }}>
              {referee.photoUrl ? (
                <img src={referee.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 999, background: C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="f-display" style={{ fontSize: 12, color: C.pitch }}>{referee.name[0]}</span>
                </div>
              )}
              <div>
                <div className="f-mono" style={{ fontSize: 8.5, color: C.chalk, opacity: 0.5 }}>REFEREE</div>
                <div className="f-body" style={{ fontSize: 12, color: C.chalk, fontWeight: 600 }}>{referee.name}</div>
              </div>
            </div>
          )}
          {(assistant1Name || assistant2Name) && (
            <div style={{ flex: 1 }}>
              <div className="f-mono" style={{ fontSize: 8.5, color: C.chalk, opacity: 0.5 }}>ASSISTANTS</div>
              <div className="f-body" style={{ fontSize: 12, color: C.chalk, opacity: 0.85 }}>{[assistant1Name, assistant2Name].filter(Boolean).join(" · ")}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function computePlayerGoals(matches, teamId, playerName) {
  const key = playerName.trim().toLowerCase();
  let total = 0;
  matches.forEach((m) => {
    (m.scorers || []).forEach((s) => {
      if (s.ownGoal) return; // an own goal never counts toward the scorer's personal tally
      if (s.teamId === teamId && s.name.trim().toLowerCase() === key) total += 1;
    });
  });
  return total;
}

// Matches played and cards come straight from real lineup/card records.
// Minutes played is an estimate (matches x 90) since we don't track exact
// substitution times — flagged as such wherever it's shown.
function computePlayerMatchStats(matches, teamId, player) {
  const nameKey = (player.name || "").trim().toLowerCase();
  let matchesPlayed = 0;
  let goals = 0;
  let yellowCards = 0;
  let redCards = 0;
  matches.forEach((m) => {
    const sideKey = m.teamAId === teamId ? "teamA" : m.teamBId === teamId ? "teamB" : null;
    if (sideKey && m.lineups && m.lineups[sideKey]) {
      const appeared = m.lineups[sideKey].some((e) => normalizeLineupEntry(e).id === player.id);
      if (appeared) matchesPlayed += 1;
    }
    (m.scorers || []).forEach((s) => {
      if (!s.ownGoal && s.teamId === teamId && s.name.trim().toLowerCase() === nameKey) goals += 1;
    });
    (m.cards || []).forEach((c) => {
      if (c.teamId === teamId && c.name.trim().toLowerCase() === nameKey) {
        if (c.type === "yellow") yellowCards += 1;
        else if (c.type === "red") redCards += 1;
      }
    });
  });
  return { matchesPlayed, minutesPlayed: matchesPlayed * 90, goals, yellowCards, redCards };
}

// Matches/minutes are only counted from the starting lineup (row !== "sub"),
// since that's the only appearance signal the data actually tracks reliably.
// We don't record the minute a substitute came on, so crediting them any
// specific minute total would be a guess rather than a real number — those
// matches simply aren't counted here rather than being estimated.
function computePlayerAppearances(matches, teamId, playerId) {
  let matchCount = 0;
  matches.forEach((m) => {
    if (m.status !== "finished" || !playerId) return;
    const isTeamA = m.teamAId === teamId;
    const isTeamB = m.teamBId === teamId;
    if (!isTeamA && !isTeamB) return;
    const rawEntries = (m.lineups && (isTeamA ? m.lineups.teamA : m.lineups.teamB)) || [];
    const entries = rawEntries.map(normalizeLineupEntry);
    const started = entries.some((e) => e.id === playerId && e.row !== "sub");
    if (started) matchCount++;
  });
  return { matches: matchCount, minutes: matchCount * 90 };
}

function computePlayerCards(matches, teamId, playerName) {
  const key = playerName.trim().toLowerCase();
  let yellow = 0, red = 0;
  matches.forEach((m) => {
    (m.cards || []).forEach((c) => {
      if (c.teamId === teamId && c.name.trim().toLowerCase() === key) {
        if (c.type === "yellow") yellow++;
        else if (c.type === "red") red++;
      }
    });
  });
  return { yellow, red };
}

function TeamProfile({ team, players, matches, onClose }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  if (!team) return null;
  const record = computeStandings([team], matches)[0];
  const roster = players.filter((p) => playerTeamIds(p).includes(team.id));

  const selectedPlayer = roster.find((p) => p.id === selectedPlayerId);
  if (selectedPlayer) {
    return <PlayerProfile player={selectedPlayer} team={team} goals={computePlayerGoals(matches, team.id, selectedPlayer.name)} onClose={() => setSelectedPlayerId(null)} />;
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>

      <div style={{ background: C.chalk, borderRadius: 14, padding: 18, border: `1px solid ${C.line}`, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (team.venue || team.manager || team.headCoach) ? 12 : 0 }}>
          {team.badgeUrl ? (
            <img src={team.badgeUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: `1px solid ${C.line}` }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="f-display" style={{ fontSize: 20, color: C.pitch }}>{team.name?.[0] || "?"}</span>
            </div>
          )}
          <div>
            <div className="f-display" style={{ fontSize: 20, color: C.pitch, lineHeight: 1.1 }}>{team.name}</div>
            {team.group && <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginTop: 2 }}>GROUP {team.group}</div>}
          </div>
        </div>
        {team.venue && (
          <div className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.75, display: "flex", alignItems: "center", gap: 5, marginBottom: (team.manager || team.headCoach) ? 6 : 0 }}>
            <MapPin size={12} /> {team.venue}
          </div>
        )}
        {(team.manager || team.headCoach) && (
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {team.manager && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.sand || "#F2E9D8", borderRadius: 10, padding: 8 }}>
                {team.managerPhotoUrl ? (
                  <img src={team.managerPhotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 999, background: C.line, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="f-display" style={{ fontSize: 16, color: C.pitch }}>{team.manager?.[0] || "?"}</span>
                  </div>
                )}
                <div>
                  <div className="f-mono" style={{ fontSize: 9, color: C.soil, opacity: 0.5, letterSpacing: 0.5 }}>MANAGER</div>
                  <div className="f-body" style={{ fontSize: 12.5, color: C.soil, fontWeight: 600 }}>{team.manager}</div>
                </div>
              </div>
            )}
            {team.headCoach && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.sand || "#F2E9D8", borderRadius: 10, padding: 8 }}>
                {team.headCoachPhotoUrl ? (
                  <img src={team.headCoachPhotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 999, background: C.line, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="f-display" style={{ fontSize: 16, color: C.pitch }}>{team.headCoach?.[0] || "?"}</span>
                  </div>
                )}
                <div>
                  <div className="f-mono" style={{ fontSize: 9, color: C.soil, opacity: 0.5, letterSpacing: 0.5 }}>HEAD COACH</div>
                  <div className="f-body" style={{ fontSize: 12.5, color: C.soil, fontWeight: 600 }}>{team.headCoach}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {record && (
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>SEASON RECORD</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, textAlign: "center" }}>
            {[["P", record.p], ["W", record.w], ["D", record.d], ["L", record.l], ["PTS", record.pts]].map(([label, val]) => (
              <div key={label}>
                <div className="f-display" style={{ fontSize: 18, color: C.pitch }}>{val}</div>
                <div className="f-mono" style={{ fontSize: 9, color: C.soil, opacity: 0.5 }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.55, marginTop: 10, textAlign: "center" }}>
            {record.gf} scored · {record.ga} conceded
          </div>
        </div>
      )}

      <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
        <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>SQUAD</div>
        {roster.length === 0 && <div className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.5 }}>No players added yet.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {roster.map((p) => {
            const goals = computePlayerGoals(matches, team.id, p.name);
            return (
              <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="f-mono" style={{ fontSize: 12, color: C.pitch, fontWeight: 700 }}>{p.number || "-"}</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="f-body" style={{ fontSize: 13, fontWeight: 600, color: C.soil }}>{p.name}{p.number ? `  #${p.number}` : ""}</div>
                  {p.position && <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5 }}>{p.position}</div>}
                </div>
                {goals > 0 && <div className="f-mono" style={{ fontSize: 11.5, color: C.pitch, fontWeight: 700 }}>⚽ {goals}</div>}
                <ChevronRight size={14} color={C.soil} style={{ opacity: 0.35 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function TeamsTab({ competition, teams, players, matches, selectedTeamId, setSelectedTeamId, onClose }) {
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  if (selectedTeam) {
    return <TeamProfile team={selectedTeam} players={players} matches={matches} onClose={onClose || (() => setSelectedTeamId(null))} />;
  }

  const TeamCard = ({ t }) => (
    <div
      onClick={() => setSelectedTeamId(t.id)}
      style={{ background: C.chalk, borderRadius: 14, padding: 12, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
    >
      {t.badgeUrl ? (
        <img src={t.badgeUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="f-display" style={{ fontSize: 16, color: C.pitch }}>{t.name?.[0] || "?"}</span>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div className="f-body" style={{ fontSize: 14, fontWeight: 600, color: C.soil }}>{t.name}</div>
        {t.venue && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{t.venue}</div>}
      </div>
      <ChevronRight size={16} color={C.soil} style={{ opacity: 0.4 }} />
    </div>
  );

  if (!competition?.hasGroups) {
    return (
      <div style={{ paddingBottom: 90, display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.map((t) => <TeamCard key={t.id} t={t} />)}
        {teams.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No teams added yet.</div>}
      </div>
    );
  }

  const groupA = teams.filter((t) => teamGroupIn(t, competition?.id) === "A");
  const groupB = teams.filter((t) => teamGroupIn(t, competition?.id) === "B");
  return (
    <div style={{ paddingBottom: 90, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP A</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{groupA.map((t) => <TeamCard key={t.id} t={t} />)}</div>
      </div>
      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GROUP B</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{groupB.map((t) => <TeamCard key={t.id} t={t} />)}</div>
      </div>
      {teams.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No teams added yet.</div>}
    </div>
  );
}

function TransfersTab({ transfers, teamName, onTeamTap }) {
  const sorted = [...transfers].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 90 }}>
      {sorted.map((t) => (
        <div key={t.id} style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          {t.photoUrl ? (
            <img src={t.photoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="f-display" style={{ fontSize: 16, color: C.pitch }}>{t.playerName?.[0] || "?"}</span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div className="f-body" style={{ fontSize: 14, fontWeight: 700, color: C.soil }}>{t.playerName}</div>
            <div className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.75, marginTop: 2 }}>
              {t.fromTeamId ? (
                <span onClick={() => onTeamTap && onTeamTap(t.fromTeamId)} style={{ cursor: onTeamTap ? "pointer" : "default", textDecoration: onTeamTap ? "underline" : "none" }}>{teamName(t.fromTeamId)}</span>
              ) : (
                <span style={{ opacity: 0.6 }}>Free agent</span>
              )}
              {" → "}
              <span onClick={() => onTeamTap && onTeamTap(t.toTeamId)} style={{ cursor: onTeamTap ? "pointer" : "default", textDecoration: onTeamTap ? "underline" : "none", fontWeight: 600 }}>{teamName(t.toTeamId)}</span>
            </div>
            {t.note && <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginTop: 4 }}>{t.note}</div>}
            <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.45, marginTop: 4 }}>{t.date}</div>
          </div>
        </div>
      ))}
      {sorted.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 40 }}>No transfers announced yet.</div>}
    </div>
  );
}

function SearchTab({ teams, players, competitions, matches, referees, teamName, onOpenTeam, onOpenPlayer, onOpenCompetition, onOpenMatches, onOpenReferee, onClose }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const teamResults = q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : [];
  const playerResults = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : [];
  const competitionResults = q ? competitions.filter((c) => c.name.toLowerCase().includes(q)) : [];
  const matchResults = q ? matches.filter((m) => teamName(m.teamAId).toLowerCase().includes(q) || teamName(m.teamBId).toLowerCase().includes(q)) : [];
  const refereeResults = q ? (referees || []).filter((r) => r.name.toLowerCase().includes(q)) : [];

  const hasResults = teamResults.length || playerResults.length || competitionResults.length || matchResults.length || refereeResults.length;

  const ResultRow = ({ onClick, children }) => (
    <div onClick={onClick} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {children}
      <ChevronRight size={14} color={C.soil} style={{ opacity: 0.35 }} />
    </div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} color={C.soil} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
        <input
          autoFocus
          style={{ ...inputStyle, paddingLeft: 36 }}
          placeholder="Search players, teams, competitions, matches…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!q && <div className="f-body" style={{ color: C.chalk, opacity: 0.5, textAlign: "center", marginTop: 30, fontSize: 13 }}>Start typing to search.</div>}
      {q && !hasResults && <div className="f-body" style={{ color: C.chalk, opacity: 0.5, textAlign: "center", marginTop: 30, fontSize: 13 }}>No results for "{query}".</div>}

      {competitionResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 6, fontWeight: 700 }}>COMPETITIONS</div>
          <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden" }}>
            {competitionResults.map((c) => (
              <ResultRow key={c.id} onClick={() => onOpenCompetition(c.id)}>
                <span className="f-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.soil }}>{c.name}</span>
              </ResultRow>
            ))}
          </div>
        </div>
      )}

      {teamResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 6, fontWeight: 700 }}>TEAMS</div>
          <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden" }}>
            {teamResults.map((t) => (
              <ResultRow key={t.id} onClick={() => onOpenTeam(t.id)}>
                <span className="f-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.soil }}>{t.name}</span>
              </ResultRow>
            ))}
          </div>
        </div>
      )}

      {playerResults.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 6, fontWeight: 700 }}>PLAYERS</div>
          <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden" }}>
            {playerResults.map((p) => {
              const ids = playerTeamIds(p);
              return (
                <div key={p.id} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
                  <div
                    onClick={() => onOpenPlayer(p.id, ids[0] || null)}
                    className="f-body"
                    style={{ fontSize: 13.5, fontWeight: 600, color: C.soil, marginBottom: ids.length ? 6 : 0, cursor: "pointer" }}
                  >
                    {p.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ids.map((tid) => (
                      <button
                        key={tid}
                        onClick={() => onOpenPlayer(p.id, tid)}
                        style={{ background: C.sand || "#F2E9D8", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontFamily: "'Work Sans', sans-serif", color: C.soil, cursor: "pointer" }}
                      >
                        {teamName(tid)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchResults.length > 0 && (
        <div style={{ marginBottom: refereeResults.length > 0 ? 16 : 0 }}>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 6, fontWeight: 700 }}>MATCHES</div>
          <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden" }}>
            {matchResults.map((m) => (
              <ResultRow key={m.id} onClick={onOpenMatches}>
                <div className="f-body" style={{ fontSize: 13, color: C.soil }}>
                  {teamName(m.teamAId)} vs {teamName(m.teamBId)}
                  <span className="f-mono" style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>{m.date}</span>
                </div>
              </ResultRow>
            ))}
          </div>
        </div>
      )}

      {refereeResults.length > 0 && (
        <div>
          <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: C.ochre, marginBottom: 6, fontWeight: 700 }}>REFEREES</div>
          <div style={{ background: C.chalk, borderRadius: 12, overflow: "hidden" }}>
            {refereeResults.map((r) => (
              <ResultRow key={r.id} onClick={() => onOpenReferee(r.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="f-mono" style={{ fontSize: 11, color: C.pitch }}>{r.name?.[0] || "?"}</span>
                    </div>
                  )}
                  <span className="f-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.soil }}>{r.name}</span>
                </div>
              </ResultRow>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function RankingList({ title, rows, valueKey, players, teams, emptyText }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => rows.length > 5 && setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: rows.length > 5 ? "pointer" : "default" }}
      >
        <span className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, fontWeight: 700 }}>{title.toUpperCase()}</span>
        {rows.length > 5 && (
          <span className="f-mono" style={{ fontSize: 11, color: "#4ADE80", fontWeight: 700, letterSpacing: 1 }}>{expanded ? "LESS" : "MORE"}</span>
        )}
      </div>
      <div style={{ background: C.chalk, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        {visible.map((r, i) => {
          const value = r[valueKey];
          const avg = r.matches > 0 ? (value / r.matches).toFixed(2) : "0.00";
          const photo = (players || []).find((p) => p.teamIds && p.teamIds.includes(r.teamId) && p.name.trim().toLowerCase() === r.name.trim().toLowerCase())?.photoUrl;
          const badge = (teams || []).find((t) => t.id === r.teamId)?.badgeUrl;
          return (
            <div key={r.name + r.teamId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderBottom: i < visible.length - 1 ? `1px solid ${C.line}` : "none" }}>
              {photo ? (
                <img src={photo} alt="" style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="f-display" style={{ fontSize: 15, color: C.pitch }}>{r.name[0]}</span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="f-body" style={{ fontSize: 15, fontWeight: 700, color: C.soil, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  {badge && <img src={badge} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }} />}
                  <span className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.teamLabel}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="f-mono" style={{ fontSize: 17, fontWeight: 700, color: C.pitch }}>{value} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.6 }}>({avg})</span></div>
                <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.5, marginTop: 2 }}>{r.matches} match{r.matches === 1 ? "" : "es"}</div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="f-body" style={{ padding: "16px 12px", color: C.soil, opacity: 0.5, fontSize: 12.5, textAlign: "center" }}>{emptyText}</div>}
      </div>
    </div>
  );
}

function RankingsTab({ matches, players, teams, teamName }) {
  const scorers = computeTopScorers(matches, teamName);
  const assists = computeTopAssists(matches, teamName);
  const keepers = computeBestGoalkeepers(matches, players, teamName);
  return (
    <div style={{ paddingBottom: 90 }}>
      <RankingList title="Goalscorers" rows={scorers} valueKey="goals" players={players} teams={teams} emptyText="No goals recorded yet in this competition." />
      <RankingList title="Assists" rows={assists} valueKey="assists" players={players} teams={teams} emptyText="No assists recorded yet in this competition." />
      <RankingList title="Best Goalkeeper" rows={keepers} valueKey="cleanSheets" players={players} teams={teams} emptyText="No goalkeeper data yet — set a lineup's GK row and finish a match to see this." />
    </div>
  );
}

function MatchDetail({ match, teamName, players, referees, votedMatches, onVote, onTeamTap, onPlayerTap, onRefereeTap, onClose }) {
  const [section, setSection] = useState("lineups");
  if (!match) return null;

  const a = match.teamAName || teamName(match.teamAId);
  const b = match.teamBName || teamName(match.teamBId);
  const teamARoster = players.filter((p) => playerTeamIds(p).includes(match.teamAId));
  const teamBRoster = players.filter((p) => playerTeamIds(p).includes(match.teamBId));
  const lineupAEntries = ((match.lineups && match.lineups.teamA) || []).map(normalizeLineupEntry);
  const lineupBEntries = ((match.lineups && match.lineups.teamB) || []).map(normalizeLineupEntry);
  const lineupA = teamARoster.filter((p) => lineupAEntries.some((e) => e.id === p.id && e.row !== "sub")).map((p) => {
    const entry = lineupAEntries.find((e) => e.id === p.id);
    return entry && entry.x != null && entry.y != null ? { ...p, _x: entry.x, _y: entry.y } : p;
  });
  const lineupB = teamBRoster.filter((p) => lineupBEntries.some((e) => e.id === p.id && e.row !== "sub")).map((p) => {
    const entry = lineupBEntries.find((e) => e.id === p.id);
    return entry && entry.x != null && entry.y != null ? { ...p, _x: entry.x, _y: entry.y } : p;
  });
  const subsA = teamARoster.filter((p) => lineupAEntries.some((e) => e.id === p.id && e.row === "sub"));
  const subsB = teamBRoster.filter((p) => lineupBEntries.some((e) => e.id === p.id && e.row === "sub"));
  const rowOverridesA = Object.fromEntries(lineupAEntries.filter((e) => e.row && e.row !== "sub").map((e) => [e.id, e.row]));
  const rowOverridesB = Object.fromEntries(lineupBEntries.filter((e) => e.row && e.row !== "sub").map((e) => [e.id, e.row]));
  const referee = (referees || []).find((r) => r.id === match.refereeId) || null;
  const assistant1Name = match.assistant1Name || null;
  const assistant2Name = match.assistant2Name || null;

  const scorers = match.scorers || [];
  const cards = match.cards || [];
  const commentary = match.commentary || [];
  const motm = match.motm || { candidates: [], votes: {} };
  const hasVoted = votedMatches.has(match.id);
  const totalVotes = Object.values(motm.votes || {}).reduce((s, v) => s + v, 0);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>

      <div style={{ background: C.chalk, borderRadius: 14, padding: 16, border: `1px solid ${C.line}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <StatusPill status={match.status} />
          <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.55, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> {match.time}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            onClick={() => onTeamTap && match.teamAId && onTeamTap(match.teamAId)}
            className="f-body"
            style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1, cursor: onTeamTap && match.teamAId ? "pointer" : "default" }}
          >
            {a}
          </div>
          {match.status === "upcoming" ? (
            <div className="f-mono" style={{ fontSize: 13, color: C.soil, opacity: 0.4, padding: "0 10px" }}>vs</div>
          ) : (
            <div className="f-display" style={{ fontSize: 28, color: C.pitch, padding: "0 10px", letterSpacing: 1 }}>{match.scoreA}&nbsp;–&nbsp;{match.scoreB}</div>
          )}
          <div
            onClick={() => onTeamTap && match.teamBId && onTeamTap(match.teamBId)}
            className="f-body"
            style={{ fontSize: 15, fontWeight: 600, color: C.soil, flex: 1, textAlign: "right", cursor: onTeamTap && match.teamBId ? "pointer" : "default" }}
          >
            {b}
          </div>
        </div>
        <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.45, marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} /> {match.venue} · {match.date}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ key: "lineups", label: "Lineups" }, { key: "events", label: "Events" }, { key: "commentary", label: "Commentary" }].map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, border: "none", borderRadius: 999, padding: "8px 10px", fontSize: 12.5,
              fontFamily: "'Work Sans', sans-serif", fontWeight: 700, cursor: "pointer",
              background: section === s.key ? C.ochre : "rgba(255,255,255,0.1)",
              color: C.chalk, opacity: section === s.key ? 1 : 0.6,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "lineups" && (
        <PitchFormation
          lineupA={lineupA} lineupB={lineupB} labelA={a} labelB={b}
          rowOverridesA={rowOverridesA} rowOverridesB={rowOverridesB}
          subsA={subsA} subsB={subsB}
          referee={referee} assistant1Name={assistant1Name} assistant2Name={assistant2Name}
          onPlayerTap={onPlayerTap}
          onRefereeTap={() => referee && onRefereeTap && onRefereeTap(referee.id)}
        />
      )}

      {section === "events" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.chalk, borderRadius: 14, padding: 16, border: `1px solid ${C.line}` }}>
            <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>GOALS</div>
            {scorers.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5 }}>No goals recorded.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...scorers].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0)).map((s) => {
                const isHome = s.teamId === match.teamAId;
                const photo = (players || []).find((p) => p.teamIds && p.teamIds.includes(s.teamId) && p.name.trim().toLowerCase() === s.name.trim().toLowerCase())?.photoUrl;
                const info = (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: isHome ? "row" : "row-reverse" }}>
                    {photo ? (
                      <img src={photo} alt="" style={{ width: 34, height: 34, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="f-mono" style={{ fontSize: 11, color: C.pitch, fontWeight: 700 }}>{s.name[0]}</span>
                      </div>
                    )}
                    <div style={{ textAlign: isHome ? "left" : "right" }}>
                      <div className="f-body" style={{ fontSize: 13, fontWeight: 700, color: C.soil }}>{s.name}</div>
                      <div className="f-body" style={{ fontSize: 11, color: s.ownGoal ? C.rust : C.soil, opacity: s.ownGoal ? 0.9 : 0.55 }}>
                        {s.ownGoal ? "Own goal" : s.assistName ? s.assistName : ""}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: isHome ? "flex-start" : "flex-end", gap: 10 }}>
                    {isHome && info}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      {!isHome && <span className="f-mono" style={{ fontSize: 13, color: "#4ADE80", fontWeight: 700 }}>{s.minute}'</span>}
                      <span style={{ fontSize: 15 }}>{s.ownGoal ? "🔴" : "⚽"}</span>
                      {isHome && <span className="f-mono" style={{ fontSize: 13, color: "#4ADE80", fontWeight: 700 }}>{s.minute}'</span>}
                    </div>
                    {!isHome && info}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: C.chalk, borderRadius: 14, padding: 16, border: `1px solid ${C.line}` }}>
            <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1, color: C.ochre, marginBottom: 8, fontWeight: 700 }}>CARDS</div>
            {cards.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5 }}>No cards recorded.</div>}
            {cards.map((c) => (
              <div key={c.id} className="f-body" style={{ fontSize: 12.5, color: C.soil, padding: "3px 0" }}>{c.type === "yellow" ? "🟨" : "🟥"} {c.name}</div>
            ))}
          </div>

          {motm.candidates.length > 0 && (
            <div style={{ background: C.chalk, borderRadius: 14, padding: 16, border: `1px solid ${C.line}` }}>
              <div className="f-mono" style={{ fontSize: 10, letterSpacing: 1, color: C.ochre, marginBottom: 8, fontWeight: 700 }}>MAN OF THE MATCH</div>
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

      {section === "commentary" && (
        <div style={{ background: C.chalk, borderRadius: 14, padding: 16, border: `1px solid ${C.line}` }}>
          {commentary.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5 }}>No commentary yet.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...commentary].reverse().map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 8 }}>
                <span className="f-mono" style={{ fontSize: 11, color: C.pitch, fontWeight: 700, flexShrink: 0 }}>{c.minute}'</span>
                <span className="f-body" style={{ fontSize: 12.5, color: C.soil, opacity: 0.85 }}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitionProfile({ competition, teams, matches, players, teamName, teamGroup, votedMatches, onVote, onTeamTap, onOpenMatch, onClose }) {
  const [section, setSection] = useState("matches");
  if (!competition) return null;

  const groups = [
    { key: "live", label: "Live now" },
    { key: "upcoming", label: "Upcoming" },
    { key: "finished", label: "Results" },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span className="f-body" style={{ fontSize: 12, fontWeight: 700, color: C.chalk }}>✕ Close</span>
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="f-display" style={{ fontSize: 22, color: C.chalk, lineHeight: 1.1 }}>{competition.name}</div>
        {competition.subtitle && <div className="f-mono" style={{ fontSize: 10.5, color: C.chalk, opacity: 0.55, marginTop: 4 }}>{competition.subtitle}</div>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {[{ key: "matches", label: "Matches" }, { key: "table", label: "Table" }, { key: "knockout", label: "Knockout" }, { key: "rankings", label: "Rankings" }].map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flexShrink: 0, border: "none", borderRadius: 999, padding: "8px 12px", fontSize: 12.5,
              fontFamily: "'Work Sans', sans-serif", fontWeight: 700, cursor: "pointer",
              background: section === s.key ? C.ochre : "rgba(255,255,255,0.1)",
              color: C.chalk, opacity: section === s.key ? 1 : 0.6,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "table" && <TableTab competition={competition} teams={teams} matches={matches} onTeamTap={onTeamTap} />}
      {section === "rankings" && <RankingsTab matches={matches} players={players} teamName={teamName} />}
      {section === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {groups.map((g) => {
            const list = matches.filter((m) => m.status === g.key).sort((a, b) => (a.date < b.date ? 1 : -1));
            if (!list.length) return null;
            return (
              <div key={g.key}>
                <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>{g.label.toUpperCase()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.map((m) => (
                    <MatchCard key={m.id} match={m} teamName={teamName} teamGroup={teamGroup} getCompetitionName={null} onOpenMatch={onOpenMatch} onTeamTap={onTeamTap} />
                  ))}
                </div>
              </div>
            );
          })}
          {matches.length === 0 && <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 30 }}>No matches scheduled yet.</div>}
        </div>
      )}
      {section === "knockout" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {["Quarter-Final", "Semi-Final", "3rd Place", "Final"].map((stageName) => {
            const list = matches.filter((m) => m.stage === stageName).sort((a, b) => (a.date < b.date ? 1 : -1));
            if (!list.length) return null;
            return (
              <div key={stageName}>
                <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>{stageName.toUpperCase()}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.map((m) => (
                    <MatchCard key={m.id} match={m} teamName={teamName} teamGroup={teamGroup} getCompetitionName={null} onOpenMatch={onOpenMatch} onTeamTap={onTeamTap} />
                  ))}
                </div>
              </div>
            );
          })}
          {matches.filter((m) => m.stage && m.stage !== "Group Stage" && m.stage !== "Friendly").length === 0 && (
            <div className="f-body" style={{ color: C.chalk, opacity: 0.6, textAlign: "center", marginTop: 30 }}>
              No knockout fixtures yet. Add a Quarter-Final, Semi-Final, 3rd Place, or Final fixture from Admin once the group stage wraps up.
            </div>
          )}
        </div>
      )}
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

function MatchManagementRow({ match, teamName_, updateMatch, removeMatch, players, referees }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: C.chalk, borderRadius: 14, padding: 12, border: `1px solid ${C.line}` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span className="f-mono" style={{ fontSize: 9.5, color: (match.stage || "Group Stage") === "Group Stage" ? C.pitch : C.rust, opacity: 0.7, letterSpacing: 0.5 }}>{(match.stage || "Group Stage").toUpperCase()}</span>
          <ChevronRight size={14} color={C.soil} style={{ opacity: 0.4, transform: expanded ? "rotate(90deg)" : "none" }} />
        </div>
        <div className="f-body" style={{ fontSize: 13, fontWeight: 700, color: C.soil }}>
          {match.teamAName || teamName_(match.teamAId)} vs {match.teamBName || teamName_(match.teamBId)}
        </div>
        <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.5, marginTop: 2 }}>
          {match.date} · {match.status === "upcoming" ? "vs" : `${match.scoreA} – ${match.scoreB}`} · {match.status.toUpperCase()}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <input type="number" style={{ ...inputStyle, width: 55 }} value={match.scoreA} onChange={(e) => updateMatch(match.id, { scoreA: Number(e.target.value) })} />
            <span className="f-mono" style={{ opacity: 0.5 }}>–</span>
            <input type="number" style={{ ...inputStyle, width: 55 }} value={match.scoreB} onChange={(e) => updateMatch(match.id, { scoreB: Number(e.target.value) })} />
            <select style={{ ...inputStyle, flex: 1 }} value={match.status} onChange={(e) => updateMatch(match.id, { status: e.target.value })}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="finished">Finished</option>
            </select>
          </div>
          <LineupRow match={match} updateMatch={updateMatch} players={players} />
          <RefereeAssignmentRow match={match} updateMatch={updateMatch} referees={referees} />
          <ScorerRow match={match} updateMatch={updateMatch} />
          <CardsRow match={match} updateMatch={updateMatch} />
          <CommentaryRow match={match} updateMatch={updateMatch} />
          <MotmRow match={match} updateMatch={updateMatch} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => removeMatch(match.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScorerRow({ match, updateMatch }) {
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState(match.teamAId);
  const [minute, setMinute] = useState("");
  const [ownGoal, setOwnGoal] = useState(false);
  const [assistName, setAssistName] = useState("");

  const addScorer = () => {
    if (!name.trim()) return;
    const scorers = [...(match.scorers || []), {
      id: uid(), name: name.trim(), teamId, minute: minute || "0",
      ownGoal, assistName: ownGoal ? null : (assistName.trim() || null),
    }];
    updateMatch(match.id, { scorers });
    setName(""); setMinute(""); setOwnGoal(false); setAssistName("");
  };
  const removeScorer = (id) => updateMatch(match.id, { scorers: (match.scorers || []).filter((s) => s.id !== id) });

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>GOALS</div>
      {[...(match.scorers || [])].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0)).map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0" }} className="f-body">
          <span style={{ color: C.soil }}>
            {s.minute}' — {s.name}{s.ownGoal ? " (Own goal)" : s.assistName ? ` (assist: ${s.assistName})` : ""}
          </span>
          <button onClick={() => removeScorer(s.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", flex: 1, minWidth: 100 }} placeholder="Scorer name" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 70 }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value={match.teamAId}>Home</option>
          <option value={match.teamBId}>Away</option>
        </select>
        <input type="number" min={0} max={120} style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 55 }} placeholder="Min" value={minute} onChange={(e) => setMinute(e.target.value)} />
      </div>
      <label className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.75, display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
        <input type="checkbox" checked={ownGoal} onChange={(e) => { setOwnGoal(e.target.checked); if (e.target.checked) setAssistName(""); }} /> Own goal
      </label>
      {!ownGoal && (
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", marginTop: 6 }} placeholder="Assisted by (optional)" value={assistName} onChange={(e) => setAssistName(e.target.value)} />
      )}
      <button onClick={addScorer} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px", marginTop: 6 }}><Plus size={13} /> Add goal</button>
    </div>
  );
}

function CardsRow({ match, updateMatch }) {
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState(match.teamAId);
  const [type, setType] = useState("yellow");
  const cards = match.cards || [];

  const addCard = () => {
    if (!name.trim()) return;
    updateMatch(match.id, { cards: [...cards, { id: uid(), name: name.trim(), teamId, type }] });
    setName("");
  };
  const removeCard = (id) => updateMatch(match.id, { cards: cards.filter((c) => c.id !== id) });

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>CARDS</div>
      {cards.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0" }} className="f-body">
          <span style={{ color: C.soil }}>{c.type === "yellow" ? "🟨" : "🟥"} {c.name}</span>
          <button onClick={() => removeCard(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 70 }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value={match.teamAId}>Home</option>
          <option value={match.teamBId}>Away</option>
        </select>
        <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 60 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="yellow">🟨</option>
          <option value="red">🟥</option>
        </select>
        <button onClick={addCard} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 9px" }}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function LineupRow({ match, updateMatch, players }) {
  const teamARoster = players.filter((p) => playerTeamIds(p).includes(match.teamAId));
  const teamBRoster = players.filter((p) => playerTeamIds(p).includes(match.teamBId));
  const entriesA = ((match.lineups && match.lineups.teamA) || []).map(normalizeLineupEntry);
  const entriesB = ((match.lineups && match.lineups.teamB) || []).map(normalizeLineupEntry);

  const setStatus = (side, player, status) => {
    const key = side === "A" ? "teamA" : "teamB";
    const current = ((match.lineups && match.lineups[key]) || []).map(normalizeLineupEntry);
    const withoutPlayer = current.filter((e) => e.id !== player.id);
    const next = status === "out" ? withoutPlayer : [...withoutPlayer, { id: player.id, row: positionRow(player.position), sub: status === "sub" }];
    updateMatch(match.id, { lineups: { ...(match.lineups || {}), [key]: next } });
  };

  const setRow = (side, playerId, row) => {
    const key = side === "A" ? "teamA" : "teamB";
    const current = ((match.lineups && match.lineups[key]) || []).map(normalizeLineupEntry);
    updateMatch(match.id, { lineups: { ...(match.lineups || {}), [key]: current.map((e) => (e.id === playerId ? { ...e, row } : e)) } });
  };

  const Side = ({ label, roster, entries, side }) => (
    <div style={{ flex: 1 }}>
      <div className="f-mono" style={{ fontSize: 9.5, opacity: 0.5, color: C.soil, marginBottom: 4 }}>{label}</div>
      {roster.length === 0 && <div className="f-body" style={{ fontSize: 11, color: C.soil, opacity: 0.5 }}>No roster on file.</div>}
      {roster.map((p) => {
        const entry = entries.find((e) => e.id === p.id);
        const status = !entry ? "out" : entry.sub ? "sub" : "start";
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0", flexWrap: "wrap" }}>
            <span className="f-body" style={{ fontSize: 12, color: C.soil, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}{p.number ? ` #${p.number}` : ""}
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(side, p, e.target.value)}
              style={{ fontSize: 10, padding: "2px 3px", borderRadius: 6, border: `1px solid ${C.line}`, flexShrink: 0 }}
            >
              <option value="out">Not in squad</option>
              <option value="start">Starting</option>
              <option value="sub">Substitute</option>
            </select>
            {status === "start" && (
              <select
                value={entry.row || positionRow(p.position)}
                onChange={(e) => setRow(side, p.id, e.target.value)}
                style={{ fontSize: 10, padding: "2px 3px", borderRadius: 6, border: `1px solid ${C.line}`, flexShrink: 0 }}
              >
                <option value="gk">GK</option>
                <option value="def">DEF</option>
                <option value="mid">MID</option>
                <option value="fwd">FWD</option>
              </select>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>LINEUPS — set each player as Starting or Substitute. Use the line dropdown for anyone playing out of their usual position.</div>
      <div style={{ display: "flex", gap: 10 }}>
        <Side label="HOME" roster={teamARoster} entries={entriesA} side="A" />
        <Side label="AWAY" roster={teamBRoster} entries={entriesB} side="B" />
      </div>
    </div>
  );
}

function RefereeAssignmentRow({ match, updateMatch, referees }) {
  const [assistant1, setAssistant1] = useState(match.assistant1Name || "");
  const [assistant2, setAssistant2] = useState(match.assistant2Name || "");

  const saveAssistants = () => updateMatch(match.id, { assistant1Name: assistant1.trim(), assistant2Name: assistant2.trim() });

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>MATCH OFFICIALS</div>
      <Field label="Referee">
        <select
          style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }}
          value={match.refereeId || ""}
          onChange={(e) => updateMatch(match.id, { refereeId: e.target.value || null })}
        >
          <option value="">Not assigned</option>
          {referees.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      {referees.length === 0 && <div className="f-body" style={{ fontSize: 11, color: C.soil, opacity: 0.5, marginBottom: 8 }}>No referees added yet — add one in the REFEREES section above.</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Assistant referee 1" value={assistant1} onChange={(e) => setAssistant1(e.target.value)} />
        <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Assistant referee 2" value={assistant2} onChange={(e) => setAssistant2(e.target.value)} />
        <button onClick={saveAssistants} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 10px", fontSize: 12 }}>Save</button>
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

function TeamManagementRow({ team, updateTeam, removeTeam, players, setPlayers, competitions, teams }) {
  const [expanded, setExpanded] = useState(false);
  const [venue, setVenue] = useState(team.venue || "");
  const [manager, setManager] = useState(team.manager || "");
  const [headCoach, setHeadCoach] = useState(team.headCoach || "");
  const [managerPhotoUrl, setManagerPhotoUrl] = useState(team.managerPhotoUrl || "");
  const [managerPhotoUploading, setManagerPhotoUploading] = useState(false);
  const [headCoachPhotoUrl, setHeadCoachPhotoUrl] = useState(team.headCoachPhotoUrl || "");
  const [headCoachPhotoUploading, setHeadCoachPhotoUploading] = useState(false);
  const [badgeUploading, setBadgeUploading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerJerseyName, setPlayerJerseyName] = useState("");
  const [playerTown, setPlayerTown] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [playerAge, setPlayerAge] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState("");
  const [playerPhotoUploading, setPlayerPhotoUploading] = useState(false);
  const [existingPlayerQuery, setExistingPlayerQuery] = useState("");
  const [assignCompId, setAssignCompId] = useState("");
  const [assignGroup, setAssignGroup] = useState("A");

  const roster = players.filter((p) => playerTeamIds(p).includes(team.id));
  const assignedCompNames = competitions ? teamCompetitionEntries(team).map((e) => competitions.find((c) => c.id === e.competitionId)?.name).filter(Boolean) : [];

  const saveDetails = () => updateTeam(team.id, { venue: venue.trim(), manager: manager.trim(), headCoach: headCoach.trim(), managerPhotoUrl: managerPhotoUrl || null, headCoachPhotoUrl: headCoachPhotoUrl || null });

  const teamComps = teamCompetitionEntries(team);

  const addParticipation = () => {
    if (!assignCompId) return;
    if (teamComps.some((e) => e.competitionId === assignCompId)) return;
    const comp = competitions.find((c) => c.id === assignCompId);
    updateTeam(team.id, { competitions: [...teamComps, { competitionId: assignCompId, group: comp?.hasGroups ? assignGroup : null }] });
    setAssignCompId("");
  };
  const removeParticipation = (competitionId) => {
    updateTeam(team.id, { competitions: teamComps.filter((e) => e.competitionId !== competitionId) });
  };

  const handleBadgeSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBadgeUploading(true);
    try {
      const url = await uploadImage(file, 400);
      updateTeam(team.id, { badgeUrl: url });
    } catch (err) {
      console.error("Badge upload failed", err);
      alert("Couldn't upload badge — check your connection and Firebase Storage rules.");
    } finally {
      setBadgeUploading(false);
    }
  };

  const handleManagerPhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setManagerPhotoUploading(true);
    try {
      const url = await uploadImage(file, 400);
      setManagerPhotoUrl(url);
      updateTeam(team.id, { managerPhotoUrl: url });
    } catch (err) {
      console.error("Manager photo upload failed", err);
      alert("Couldn't upload photo — check your connection and Firebase Storage rules.");
    } finally {
      setManagerPhotoUploading(false);
    }
  };

  const handleHeadCoachPhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setHeadCoachPhotoUploading(true);
    try {
      const url = await uploadImage(file, 400);
      setHeadCoachPhotoUrl(url);
      updateTeam(team.id, { headCoachPhotoUrl: url });
    } catch (err) {
      console.error("Head coach photo upload failed", err);
      alert("Couldn't upload photo — check your connection and Firebase Storage rules.");
    } finally {
      setHeadCoachPhotoUploading(false);
    }
  };

  const handlePlayerPhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPlayerPhotoUploading(true);
    try {
      const url = await uploadImage(file, 400);
      setPlayerPhotoUrl(url);
    } catch (err) {
      console.error("Player photo upload failed", err);
      alert("Couldn't upload photo — check your connection and Firebase Storage rules.");
    } finally {
      setPlayerPhotoUploading(false);
    }
  };

  const addPlayer = () => {
    if (!playerName.trim() || playerPhotoUploading) return;
    setPlayers([...players, { id: uid(), teamIds: [team.id], name: playerName.trim(), jerseyName: playerJerseyName.trim() || null, town: playerTown.trim() || null, number: playerNumber.trim(), age: playerAge.trim(), position: playerPosition.trim(), photoUrl: playerPhotoUrl || null }]);
    setPlayerName(""); setPlayerJerseyName(""); setPlayerTown(""); setPlayerNumber(""); setPlayerAge(""); setPlayerPosition(""); setPlayerPhotoUrl("");
  };
  // Removes this player from THIS team's roster only. If they have no other
  // team affiliations left afterward, the player record itself is removed.
  const removePlayer = (id) => {
    const updated = players
      .map((p) => (p.id === id ? { ...p, teamIds: playerTeamIds(p).filter((tid) => tid !== team.id) } : p))
      .filter((p) => p.id !== id || playerTeamIds(p).length > 0);
    setPlayers(updated);
  };
  const addExistingPlayer = (playerId) => {
    setPlayers(players.map((p) => (p.id === playerId ? { ...p, teamIds: [...new Set([...playerTeamIds(p), team.id])] } : p)));
    setExistingPlayerQuery("");
  };

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {team.badgeUrl && <img src={team.badgeUrl} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }} />}
          <span className="f-body" style={{ fontSize: 13.5, color: C.soil }}>{team.name}</span>
          {roster.length > 0 && <span className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>{roster.length} players</span>}
          {competitions && <span className="f-mono" style={{ fontSize: 9.5, color: assignedCompNames.length ? C.pitch : C.soil, opacity: assignedCompNames.length ? 0.8 : 0.4 }}>{assignedCompNames.length ? assignedCompNames.join(", ") : "Unassigned"}</span>}
        </div>
        <button onClick={() => removeTeam(team.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingLeft: 4 }}>
          {competitions && (
            <div style={{ marginBottom: 12 }}>
              <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>COMPETITIONS THIS TEAM PLAYS IN</div>
              {teamComps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {teamComps.map((e) => {
                    const comp = competitions.find((c) => c.id === e.competitionId);
                    return (
                      <div key={e.competitionId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }} className="f-body">
                        <span style={{ color: C.soil }}>{comp?.name || "—"}{e.group ? ` (Group ${e.group})` : ""}</span>
                        <button onClick={() => removeParticipation(e.competitionId)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", flex: 1, minWidth: 120 }} value={assignCompId} onChange={(e) => setAssignCompId(e.target.value)}>
                  <option value="">Add to a competition…</option>
                  {competitions.filter((c) => !teamComps.some((e) => e.competitionId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {assignCompId && competitions.find((c) => c.id === assignCompId)?.hasGroups && (
                  <select style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 90 }} value={assignGroup} onChange={(e) => setAssignGroup(e.target.value)}>
                    <option value="A">Group A</option>
                    <option value="B">Group B</option>
                  </select>
                )}
                <button onClick={addParticipation} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 10px", fontSize: 12 }}><Plus size={13} /></button>
              </div>
            </div>
          )}
          <Field label="Badge / logo">
            <input type="file" accept="image/*" onChange={handleBadgeSelect} style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} />
            {badgeUploading && <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.6, marginTop: 4 }}>Uploading…</div>}
          </Field>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Home venue" value={venue} onChange={(e) => setVenue(e.target.value)} />

            <div>
              <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Manager name" value={manager} onChange={(e) => setManager(e.target.value)} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {managerPhotoUrl && <img src={managerPhotoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />}
                <input type="file" accept="image/*" onChange={handleManagerPhotoSelect} style={{ ...inputStyle, fontSize: 11, padding: "5px 8px", flex: 1 }} />
              </div>
              {managerPhotoUploading && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.6, marginTop: 2 }}>Uploading…</div>}
            </div>

            <div>
              <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px" }} placeholder="Head coach name" value={headCoach} onChange={(e) => setHeadCoach(e.target.value)} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {headCoachPhotoUrl && <img src={headCoachPhotoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />}
                <input type="file" accept="image/*" onChange={handleHeadCoachPhotoSelect} style={{ ...inputStyle, fontSize: 11, padding: "5px 8px", flex: 1 }} />
              </div>
              {headCoachPhotoUploading && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.6, marginTop: 2 }}>Uploading…</div>}
            </div>

            <button onClick={saveDetails} style={{ ...btnStyle(C.pitch, C.chalk), padding: "7px 10px", fontSize: 12, alignSelf: "flex-start" }}>Save details</button>
          </div>

          <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, marginBottom: 6 }}>ROSTER</div>
          {roster.map((p) => {
            const otherTeamNames = teams
              ? playerTeamIds(p).filter((tid) => tid !== team.id).map((tid) => teams.find((t) => t.id === tid)?.name).filter(Boolean)
              : [];
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }} className="f-body">
                <div>
                  <span style={{ fontSize: 12.5, color: C.soil }}>{p.name}{p.number ? ` #${p.number}` : ""}{p.position ? ` · ${p.position}` : ""}</span>
                  {otherTeamNames.length > 0 && <div className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5 }}>Also: {otherTeamNames.join(", ")}</div>}
                </div>
                <button onClick={() => removePlayer(p.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
              </div>
            );
          })}

          {existingPlayerQuery.trim() && (
            <div style={{ marginTop: 6, marginBottom: 6 }}>
              {players
                .filter((p) => !playerTeamIds(p).includes(team.id) && p.name.toLowerCase().includes(existingPlayerQuery.trim().toLowerCase()))
                .slice(0, 6)
                .map((p) => {
                  const theirTeams = teams ? playerTeamIds(p).map((tid) => teams.find((t) => t.id === tid)?.name).filter(Boolean) : [];
                  return (
                    <div key={p.id} onClick={() => addExistingPlayer(p.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: C.sand || "#F2E9D8", borderRadius: 8, marginBottom: 4, cursor: "pointer" }}>
                      <div>
                        <span className="f-body" style={{ fontSize: 12.5, color: C.soil }}>{p.name}</span>
                        {theirTeams.length > 0 && <span className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5, marginLeft: 6 }}>{theirTeams.join(", ")}</span>}
                      </div>
                      <Plus size={13} color={C.pitch} />
                    </div>
                  );
                })}
            </div>
          )}
          <input
            style={{ ...inputStyle, fontSize: 12, padding: "7px 9px", marginTop: 6 }}
            placeholder="Search to add an existing player (already on another team)…"
            value={existingPlayerQuery}
            onChange={(e) => setExistingPlayerQuery(e.target.value)}
          />

          <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, margin: "10px 0 6px" }}>OR ADD A NEW PLAYER</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", flex: 1, minWidth: 100 }} placeholder="Player name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", flex: 1, minWidth: 100 }} placeholder="Jersey name (if different)" value={playerJerseyName} onChange={(e) => setPlayerJerseyName(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 50 }} placeholder="No." value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)} />
            <input type="number" min={0} style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 55 }} placeholder="Age" value={playerAge} onChange={(e) => setPlayerAge(e.target.value)} />
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", width: 90 }} placeholder="Position" value={playerPosition} onChange={(e) => setPlayerPosition(e.target.value)} />
            <input style={{ ...inputStyle, fontSize: 12.5, padding: "7px 9px", flex: 1, minWidth: 90 }} placeholder="Town" value={playerTown} onChange={(e) => setPlayerTown(e.target.value)} />
          </div>
          <div style={{ marginTop: 6 }}>
            <input type="file" accept="image/*" onChange={handlePlayerPhotoSelect} style={{ ...inputStyle, fontSize: 12, padding: "6px 9px" }} />
            {playerPhotoUploading && <div className="f-mono" style={{ fontSize: 10.5, color: C.soil, opacity: 0.6, marginTop: 4 }}>Uploading…</div>}
          </div>
          <button onClick={addPlayer} disabled={playerPhotoUploading} style={{ ...btnStyle(C.ochre, C.chalk), padding: "7px 9px", fontSize: 12, marginTop: 8, opacity: playerPhotoUploading ? 0.5 : 1 }}>
            <Plus size={13} /> {playerPhotoUploading ? "Uploading…" : "Add player"}
          </button>
        </div>
      )}
    </div>
  );
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

function AdminTab({ competitions, setCompetitions, activeCompetitionId, setActiveCompetitionId, teams, setTeams, matches, setMatches, news, setNews, sponsors, setSponsors, ads, setAds, players, setPlayers, transfers, setTransfers, referees, setReferees, unlocked, setUnlocked }) {
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
  const [isFriendly, setIsFriendly] = useState(false);
  const [mACustom, setMACustom] = useState(false);
  const [mBCustom, setMBCustom] = useState(false);
  const [mAName, setMAName] = useState("");
  const [mBName, setMBName] = useState("");
  const [mA, setMA] = useState("");
  const [mB, setMB] = useState("");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("16:00");
  const [mVenue, setMVenue] = useState("");
  const [compName, setCompName] = useState("");
  const [compSubtitle, setCompSubtitle] = useState("");
  const [compHasGroups, setCompHasGroups] = useState(true);
  const [globalTeamName, setGlobalTeamName] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [refereePhotoUrl, setRefereePhotoUrl] = useState("");
  const [refereePhotoUploading, setRefereePhotoUploading] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [transferPlayerQuery, setTransferPlayerQuery] = useState("");
  const [transferPlayerId, setTransferPlayerId] = useState("");
  const [transferFromTeamId, setTransferFromTeamId] = useState("");
  const [transferToTeamId, setTransferToTeamId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNote, setTransferNote] = useState("");
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60, gap: 14, paddingBottom: 90 }}>
        <Lock size={26} color={C.chalk} style={{ opacity: 0.8 }} />
        <div className="f-body" style={{ color: C.chalk, opacity: 0.75, fontSize: 13, textAlign: "center", maxWidth: 220 }}>Enter the organizer PIN to manage competitions, scores and news.</div>
        <input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(false); }} style={{ ...inputStyle, width: 200, textAlign: "center", letterSpacing: 2 }} maxLength={20} placeholder="Organizer password" />
        {pinError && <div style={{ color: C.rust, fontSize: 12 }} className="f-body">Wrong PIN, try again.</div>}
        <button onClick={() => (pin === "Kuliya@47" ? setUnlocked(true) : setPinError(true))} style={btnStyle(C.ochre, C.chalk)}><Unlock size={14} /> Unlock</button>
      </div>
    );
  }

  const competitionTeams = teams.filter((t) => teamInCompetition(t, activeCompetitionId));
  const competitionMatches = matches.filter((m) => m.competitionId === activeCompetitionId);
  const friendlyMatches = matches.filter((m) => !m.competitionId);
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
    // Teams can belong to multiple competitions — only detach this one,
    // don't delete the team itself.
    setTeams(teams.map((t) => ({ ...t, competitions: teamCompetitionEntries(t).filter((e) => e.competitionId !== id) })));
    setMatches(matches.filter((m) => m.competitionId !== id));
    if (activeCompetitionId === id) setActiveCompetitionId(competitions.find((c) => c.id !== id)?.id || "");
  };

  const addTeam = () => {
    if (!teamName.trim() || !activeCompetitionId) return;
    setTeams([...teams, { id: uid(), name: teamName.trim(), competitions: [{ competitionId: activeCompetitionId, group: teamGroup }] }]);
    setTeamName("");
  };
  const removeTeam = (id) => setTeams(teams.filter((t) => t.id !== id));
  const updateTeam = (id, patch) => setTeams(teams.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const addGlobalTeam = () => {
    if (!globalTeamName.trim()) return;
    setTeams([...teams, { id: uid(), name: globalTeamName.trim(), competitions: [] }]);
    setGlobalTeamName("");
  };

  const addReferee = () => {
    if (!refereeName.trim() || refereePhotoUploading) return;
    setReferees([...referees, { id: uid(), name: refereeName.trim(), photoUrl: refereePhotoUrl || null }]);
    setRefereeName(""); setRefereePhotoUrl("");
  };
  const removeReferee = (id) => setReferees(referees.filter((r) => r.id !== id));
  const handleRefereePhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setRefereePhotoUploading(true);
    try {
      const url = await uploadImage(file, 400);
      setRefereePhotoUrl(url);
    } catch (err) {
      console.error("Referee photo upload failed", err);
      alert("Couldn't upload photo — check your connection and Firebase Storage rules.");
    } finally {
      setRefereePhotoUploading(false);
    }
  };

  const recordTransfer = () => {
    const player = players.find((p) => p.id === transferPlayerId);
    if (!player || !transferToTeamId || !transferDate) return;
    setTransfers([...transfers, {
      id: uid(), playerId: player.id, playerName: player.name, photoUrl: player.photoUrl || null,
      fromTeamId: transferFromTeamId || null, toTeamId: transferToTeamId, date: transferDate, note: transferNote.trim(),
    }]);
    // Move the player: drop the "from" team (if any) and add the "to" team.
    setPlayers(players.map((p) => {
      if (p.id !== player.id) return p;
      const ids = playerTeamIds(p).filter((tid) => tid !== transferFromTeamId);
      return { ...p, teamIds: [...new Set([...ids, transferToTeamId])] };
    }));
    setTransferPlayerQuery(""); setTransferPlayerId(""); setTransferFromTeamId(""); setTransferToTeamId(""); setTransferNote("");
  };

  const addMatch = () => {
    const aValid = mACustom ? mAName.trim() : mA;
    const bValid = mBCustom ? mBName.trim() : mB;
    if (!aValid || !bValid || (!mACustom && !mBCustom && mA === mB) || !mDate) return;
    setMatches([...matches, {
      id: uid(),
      competitionId: isFriendly ? null : activeCompetitionId,
      teamAId: mACustom ? "" : mA, teamAName: mACustom ? mAName.trim() : null,
      teamBId: mBCustom ? "" : mB, teamBName: mBCustom ? mBName.trim() : null,
      scoreA: 0, scoreB: 0, date: mDate, time: mTime, venue: mVenue || "TBD", status: "upcoming", scorers: [],
      stage: isFriendly ? "Friendly" : mStage,
    }]);
    setMA(""); setMB(""); setMAName(""); setMBName(""); setMACustom(false); setMBCustom(false); setMDate(""); setMVenue("");
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
    if (!sponsorName.trim() || sponsorLogoUploading) return;
    setSponsors([...sponsors, { id: uid(), name: sponsorName.trim(), url: sponsorUrl.trim(), logoUrl: sponsorLogoUrl || null }]);
    setSponsorName(""); setSponsorUrl(""); setSponsorLogoUrl("");
  };
  const removeSponsor = (id) => setSponsors(sponsors.filter((s) => s.id !== id));
  const handleSponsorLogoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSponsorLogoUploading(true);
    try {
      const url = await uploadImage(file, 400);
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
      const url = await uploadImage(file, 900);
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
            <div key={c.id} onClick={() => { setActiveCompetitionId(c.id); setShowMatches(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
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

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>TEAM DATABASE</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 10, lineHeight: 1.4 }}>
            Add teams and players here without tying them to a competition — useful for building up your roster of teams ahead of time. Assign a team to a specific competition (and group) whenever it's ready to compete.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <input style={inputStyle} placeholder="New team name" value={globalTeamName} onChange={(e) => setGlobalTeamName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGlobalTeam(); }} />
            <button onClick={addGlobalTeam} style={btnStyle(C.pitch, C.chalk)}><Plus size={14} /></button>
          </div>
          {teams.map((t) => (
            <TeamManagementRow key={t.id} team={t} updateTeam={updateTeam} removeTeam={removeTeam} players={players} setPlayers={setPlayers} competitions={competitions} teams={teams} />
          ))}
          {teams.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5, marginTop: 8 }}>No teams yet — add one above.</div>}
        </div>
      </div>

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>REFEREES</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 10, lineHeight: 1.4 }}>
            Add match officials here — once added, you can assign a referee to any match from that match's MATCH OFFICIALS section.
          </div>
          {referees.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 999, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: 999, background: C.sand || "#F2E9D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="f-mono" style={{ fontSize: 11, color: C.pitch, fontWeight: 700 }}>{r.name?.[0] || "?"}</span>
                  </div>
                )}
                <span className="f-body" style={{ fontSize: 13, color: C.soil, fontWeight: 600 }}>{r.name}</span>
              </div>
              <button onClick={() => removeReferee(r.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.rust} /></button>
            </div>
          ))}
          {referees.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5, marginTop: 8, marginBottom: 10 }}>No referees added yet.</div>}
          <div style={{ marginTop: 10 }}>
            <Field label="Referee name"><input style={inputStyle} placeholder="e.g. Musa Ibrahim" value={refereeName} onChange={(e) => setRefereeName(e.target.value)} /></Field>
            <Field label="Photo (optional)">
              <input type="file" accept="image/*" onChange={handleRefereePhotoSelect} style={{ ...inputStyle, padding: "7px 9px" }} />
              {refereePhotoUploading && <div className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6, marginTop: 6 }}>Uploading…</div>}
              {refereePhotoUrl && !refereePhotoUploading && (
                <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
                  <img src={refereePhotoUrl} alt="" style={{ width: 50, height: 50, borderRadius: 999, objectFit: "cover", border: `1px solid ${C.line}` }} />
                  <button onClick={() => setRefereePhotoUrl("")} style={{ position: "absolute", top: -6, right: -6, background: C.rust, border: "none", borderRadius: 999, width: 18, height: 18, color: C.chalk, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              )}
            </Field>
            <button onClick={addReferee} disabled={refereePhotoUploading} style={{ ...btnStyle(C.ochre, C.chalk), opacity: refereePhotoUploading ? 0.5 : 1 }}><Plus size={14} /> {refereePhotoUploading ? "Uploading…" : "Add referee"}</button>
          </div>
        </div>
      </div>

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>RECORD TRANSFER</div>
        <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
          <Field label="Player">
            <input
              style={inputStyle}
              placeholder="Search player by name…"
              value={transferPlayerId ? players.find((p) => p.id === transferPlayerId)?.name || "" : transferPlayerQuery}
              onChange={(e) => { setTransferPlayerQuery(e.target.value); setTransferPlayerId(""); setTransferFromTeamId(""); }}
            />
            {transferPlayerQuery.trim() && !transferPlayerId && (
              <div style={{ marginTop: 6 }}>
                {players.filter((p) => p.name.toLowerCase().includes(transferPlayerQuery.trim().toLowerCase())).slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setTransferPlayerId(p.id); setTransferPlayerQuery(""); const ids = playerTeamIds(p); setTransferFromTeamId(ids[0] || ""); }}
                    style={{ padding: "6px 8px", background: C.sand || "#F2E9D8", borderRadius: 8, marginBottom: 4, cursor: "pointer" }}
                  >
                    <span className="f-body" style={{ fontSize: 12.5, color: C.soil }}>{p.name}</span>
                    <span className="f-mono" style={{ fontSize: 10, color: C.soil, opacity: 0.5, marginLeft: 6 }}>
                      {playerTeamIds(p).map((tid) => teams.find((t) => t.id === tid)?.name).filter(Boolean).join(", ") || "No current team"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Field>
          {transferPlayerId && (
            <>
              <Field label="From (leave blank if a free agent / new signing)">
                <select style={inputStyle} value={transferFromTeamId} onChange={(e) => setTransferFromTeamId(e.target.value)}>
                  <option value="">Free agent / new signing</option>
                  {playerTeamIds(players.find((p) => p.id === transferPlayerId) || {}).map((tid) => (
                    <option key={tid} value={tid}>{teams.find((t) => t.id === tid)?.name || tid}</option>
                  ))}
                </select>
              </Field>
              <Field label="To">
                <select style={inputStyle} value={transferToTeamId} onChange={(e) => setTransferToTeamId(e.target.value)}>
                  <option value="">Select team</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Date"><input type="date" style={inputStyle} value={transferDate} onChange={(e) => setTransferDate(e.target.value)} /></Field>
              <Field label="Note (optional)"><input style={inputStyle} placeholder="e.g. Loan, permanent move" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} /></Field>
              <button onClick={recordTransfer} style={btnStyle(C.ochre, C.chalk)}><Plus size={14} /> Record transfer</button>
            </>
          )}

          <div className="f-mono" style={{ fontSize: 10, opacity: 0.5, color: C.soil, margin: "14px 0 6px" }}>RECENT TRANSFERS</div>
          {[...transfers].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.line}` }}>
              <span className="f-body" style={{ fontSize: 12.5, color: C.soil }}>
                {t.playerName}: {t.fromTeamId ? (teams.find((tm) => tm.id === t.fromTeamId)?.name || "—") : "Free agent"} → {teams.find((tm) => tm.id === t.toTeamId)?.name || "—"}
              </span>
              <button onClick={() => setTransfers(transfers.filter((x) => x.id !== t.id))} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color={C.rust} /></button>
            </div>
          ))}
          {transfers.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5 }}>No transfers recorded yet.</div>}
        </div>
      </div>

      <div>
        <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>FRIENDLIES</div>
        <div className="f-body" style={{ fontSize: 11.5, color: C.chalk, opacity: 0.6, marginBottom: 10, lineHeight: 1.4 }}>
          Friendlies aren't tied to a competition, so they're managed here instead of inside a specific competition. To add one, select any competition below, then check "This is a friendly" in Add Fixture.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {friendlyMatches.map((m) => (
            <MatchManagementRow key={m.id} match={m} teamName_={teamName_} updateMatch={updateMatch} removeMatch={removeMatch} players={players} referees={referees} />
          ))}
          {friendlyMatches.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.chalk, opacity: 0.5 }}>No friendlies yet.</div>}
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
                  {competitionTeams.filter((t) => teamGroupIn(t, activeCompetitionId) === g).map((t) => (
                    <TeamManagementRow key={t.id} team={t} updateTeam={updateTeam} removeTeam={removeTeam} players={players} setPlayers={setPlayers} teams={teams} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="f-mono" style={{ fontSize: 11, letterSpacing: 2, color: C.ochre, marginBottom: 10, fontWeight: 700 }}>ADD FIXTURE</div>
            <div style={{ background: C.chalk, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
              <label className="f-body" style={{ fontSize: 12.5, color: C.soil, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <input type="checkbox" checked={isFriendly} onChange={(e) => { setIsFriendly(e.target.checked); setMA(""); setMB(""); }} />
                This is a friendly (not part of a competition)
              </label>

              {!isFriendly && (
                <>
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
                </>
              )}
              {isFriendly && (
                <div className="f-body" style={{ fontSize: 11.5, color: C.soil, opacity: 0.6, marginBottom: 12, lineHeight: 1.4 }}>
                  Friendly match — pick any two teams from any competition.
                </div>
              )}
              <Field label="Home team">
                {isFriendly && (
                  <label className="f-body" style={{ fontSize: 11, color: C.soil, opacity: 0.7, display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <input type="checkbox" checked={mACustom} onChange={(e) => { setMACustom(e.target.checked); setMA(""); setMAName(""); }} /> Not a registered team — type the name
                  </label>
                )}
                {mACustom ? (
                  <input style={inputStyle} placeholder="Opponent team name" value={mAName} onChange={(e) => setMAName(e.target.value)} />
                ) : (
                  <select style={inputStyle} value={mA} onChange={(e) => setMA(e.target.value)}>
                    <option value="">Select team</option>
                    {(isFriendly ? teams : (mStage === "Group Stage" ? competitionTeams.filter((t) => teamGroupIn(t, activeCompetitionId) === mGroup) : competitionTeams)).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {isFriendly
                          ? ` (${teamCompetitionEntries(t).map((e) => competitions.find((c) => c.id === e.competitionId)?.name).filter(Boolean).join(", ") || "Unassigned"})`
                          : (mStage !== "Group Stage" ? ` (Grp ${teamGroupIn(t, activeCompetitionId)})` : "")}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Away team">
                {isFriendly && (
                  <label className="f-body" style={{ fontSize: 11, color: C.soil, opacity: 0.7, display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <input type="checkbox" checked={mBCustom} onChange={(e) => { setMBCustom(e.target.checked); setMB(""); setMBName(""); }} /> Not a registered team — type the name
                  </label>
                )}
                {mBCustom ? (
                  <input style={inputStyle} placeholder="Opponent team name" value={mBName} onChange={(e) => setMBName(e.target.value)} />
                ) : (
                  <select style={inputStyle} value={mB} onChange={(e) => setMB(e.target.value)}>
                    <option value="">Select team</option>
                    {(isFriendly ? teams : (mStage === "Group Stage" ? competitionTeams.filter((t) => teamGroupIn(t, activeCompetitionId) === mGroup) : competitionTeams)).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {isFriendly
                          ? ` (${teamCompetitionEntries(t).map((e) => competitions.find((c) => c.id === e.competitionId)?.name).filter(Boolean).join(", ") || "Unassigned"})`
                          : (mStage !== "Group Stage" ? ` (Grp ${teamGroupIn(t, activeCompetitionId)})` : "")}
                      </option>
                    ))}
                  </select>
                )}
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
            {!showMatches ? (
              <button
                onClick={() => setShowMatches(true)}
                style={{ ...btnStyle(C.chalk, C.pitch), width: "100%", justifyContent: "space-between", border: `1px solid ${C.line}` }}
              >
                <span>Show fixtures for this competition</span>
                <span className="f-mono" style={{ fontSize: 11, opacity: 0.6 }}>{competitionMatches.length}</span>
              </button>
            ) : (
              <>
                <button onClick={() => setShowMatches(false)} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <ChevronDown size={13} color={C.soil} style={{ transform: "rotate(180deg)", opacity: 0.6 }} />
                  <span className="f-mono" style={{ fontSize: 11, color: C.soil, opacity: 0.6 }}>Hide fixtures</span>
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {competitionMatches.map((m) => (
                    <MatchManagementRow key={m.id} match={m} teamName_={teamName_} updateMatch={updateMatch} removeMatch={removeMatch} players={players} referees={referees} />
                  ))}
                  {competitionMatches.length === 0 && <div className="f-body" style={{ fontSize: 12, color: C.soil, opacity: 0.5 }}>No fixtures yet for this competition.</div>}
                </div>
              </>
            )}
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
            <button onClick={addSponsor} disabled={sponsorLogoUploading} style={{ ...btnStyle(C.ochre, C.chalk), opacity: sponsorLogoUploading ? 0.5 : 1, cursor: sponsorLogoUploading ? "not-allowed" : "pointer" }}><Plus size={14} /> {sponsorLogoUploading ? "Uploading logo…" : "Add sponsor"}</button>
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
            <button onClick={addAd} disabled={adImageUploading} style={{ ...btnStyle(C.ochre, C.chalk), opacity: adImageUploading ? 0.5 : 1, cursor: adImageUploading ? "not-allowed" : "pointer" }}><Plus size={14} /> {adImageUploading ? "Uploading image…" : "Add advertisement"}</button>
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
  const [referees, setRefereesState] = useState([]);
  const [players, setPlayersState] = useState([]);
  const [transfers, setTransfersState] = useState([]);
  const [activeCompetitionId, setActiveCompetitionId] = useState("");
  const [tab, setTab] = useState("scores");
  const [previousTab, setPreviousTab] = useState("scores");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayerTeamId, setSelectedPlayerTeamId] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedRefereeId, setSelectedRefereeId] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  // Push a browser history entry for every navigation change, so the
  // phone's back button/gesture steps back through the app's screens
  // instead of exiting the whole app (which has no other history entry
  // to fall back to in a single-page app like this).
  const isPoppingRef = useRef(false);
  const navState = { tab, selectedTeamId, selectedCompetitionId, selectedPlayerId, selectedPlayerTeamId, selectedMatchId, selectedRefereeId };
  useEffect(() => {
    if (isPoppingRef.current) { isPoppingRef.current = false; return; }
    window.history.pushState(navState, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedTeamId, selectedCompetitionId, selectedPlayerId, selectedPlayerTeamId, selectedMatchId, selectedRefereeId]);

  useEffect(() => {
    const onPopState = (e) => {
      isPoppingRef.current = true;
      const s = e.state || {};
      setTab(s.tab || "scores");
      setSelectedTeamId(s.selectedTeamId ?? null);
      setSelectedCompetitionId(s.selectedCompetitionId ?? null);
      setSelectedPlayerId(s.selectedPlayerId ?? null);
      setSelectedPlayerTeamId(s.selectedPlayerTeamId ?? null);
      setSelectedMatchId(s.selectedMatchId ?? null);
      setSelectedRefereeId(s.selectedRefereeId ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Applies a navigation state to the screen. This is the one place that
  // actually changes which screen is showing — both normal in-app taps and
  // the browser/hardware back button funnel through here, so the two never
  // fall out of sync.
  const applyNavState = useCallback((state) => {
    setTab(state.tab || "scores");
    setSelectedTeamId(state.selectedTeamId ?? null);
    setSelectedPlayerId(state.selectedPlayerId ?? null);
    setSelectedPlayerTeamId(state.selectedPlayerTeamId ?? null);
    setSelectedCompetitionId(state.selectedCompetitionId ?? null);
    setSelectedMatchId(state.selectedMatchId ?? null);
    setSelectedRefereeId(state.selectedRefereeId ?? null);
  }, []);

  // Moves forward to a new screen and records it in browser history, so the
  // back button (hardware key or swipe-back gesture) has something real to
  // return to instead of closing the whole app.
  const navigateTo = useCallback((partial) => {
    const newState = {
      tab: partial.tab,
      selectedTeamId: partial.selectedTeamId ?? null,
      selectedPlayerId: partial.selectedPlayerId ?? null,
      selectedPlayerTeamId: partial.selectedPlayerTeamId ?? null,
      selectedCompetitionId: partial.selectedCompetitionId ?? null,
      selectedMatchId: partial.selectedMatchId ?? null,
      selectedRefereeId: partial.selectedRefereeId ?? null,
    };
    window.history.pushState(newState, "", "");
    applyNavState(newState);
  }, [applyNavState]);

  // Every "✕ Close" button uses this too, so an in-app close button and the
  // phone's own back button always behave identically.
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  useEffect(() => {
    const rootState = { tab: "scores", selectedTeamId: null, selectedPlayerId: null, selectedPlayerTeamId: null, selectedCompetitionId: null, selectedMatchId: null, selectedRefereeId: null };
    window.history.replaceState(rootState, "", "");
    const onPopState = (e) => {
      applyNavState(e.state || rootState);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyNavState]);
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
        // Fetch everything at once instead of one-at-a-time — with 8 separate
        // documents, doing this sequentially meant every visitor waited for
        // 8 full network round-trips in a row before seeing anything.
        const [comps0, t0, m0, n0, sp0, ad0, pl0, tr0, ref0] = await Promise.all([
          loadKey("auyo-competitions"),
          loadKey("auyo-teams"),
          loadKey("auyo-matches"),
          loadKey("auyo-news"),
          loadKey("auyo-sponsors"),
          loadKey("auyo-ads"),
          loadKey("auyo-players"),
          loadKey("auyo-transfers"),
          loadKey("auyo-referees"),
        ]);

        let comps = comps0;
        let t = t0;
        let m = m0;
        let n = n0;
        const sp = sp0 || [];
        const ad = ad0 || [];
        const pl = pl0 || [];
        const tr = tr0 || [];
        const ref = ref0 || [];

        // Seeding only ever matters the very first time the database is empty.
        if (!comps) { comps = seedCompetitions(); await saveKey("auyo-competitions", comps); }
        if (!t) { t = seedTeams(comps[0].id); await saveKey("auyo-teams", t); }
        if (!m) { m = seedMatches(comps[0].id, t); await saveKey("auyo-matches", m); }
        if (!n) { n = seedNews(); await saveKey("auyo-news", n); }

        setCompetitionsState(comps); setTeamsState(t); setMatchesState(m); setNewsState(n); setSponsorsState(sp); setAdsState(ad); setPlayersState(pl); setTransfersState(tr); setRefereesState(ref);
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
  const setReferees = useCallback((v) => { setRefereesState(v); safeSave("auyo-referees", v); }, [safeSave]);
  const setPlayers = useCallback((v) => { setPlayersState(v); safeSave("auyo-players", v); }, [safeSave]);
  const setTransfers = useCallback((v) => { setTransfersState(v); safeSave("auyo-transfers", v); }, [safeSave]);

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
  const compTeams = teams.filter((t) => teamInCompetition(t, activeCompetitionId));
  const compMatches = matches.filter((m) => m.competitionId === activeCompetitionId);
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "TBD";
  const teamGroup = (id) => teams.find((t) => t.id === id)?.group || "";
  const teamBadge = (id) => teams.find((t) => t.id === id)?.badgeUrl || null;
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
    { key: "scores", label: "Matches", icon: Radio },
    { key: "transfers", label: "Transfers", icon: ArrowLeftRight },
    { key: "news", label: "News", icon: Newspaper },
    ...(isAdminAccess ? [{ key: "admin", label: "Admin", icon: Lock }] : []),
  ];

  // Swiping left/right moves between the main bottom-nav tabs. Only active
  // when actually on one of those tabs — inside a drill-down screen (a team,
  // competition, match, etc.) a swipe shouldn't unexpectedly jump elsewhere.
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    const dy = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    // Ignore mostly-vertical swipes (scrolling) and short swipes.
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = tabs.findIndex((t) => t.key === tab);
    if (idx === -1) return;
    if (dx < 0 && idx < tabs.length - 1) setTab(tabs[idx + 1].key);
    if (dx > 0 && idx > 0) setTab(tabs[idx - 1].key);
  };

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
              <button onClick={() => { setPreviousTab(tab); setTab("search"); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Search size={15} color={C.chalk} style={{ opacity: 0.8 }} />
              </button>
              <button onClick={() => { setPreviousTab(tab); setTab("legal"); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Info size={15} color={C.chalk} style={{ opacity: 0.8 }} />
              </button>
            </div>
          </div>

          <AdBanner ads={ads} />
          <SponsorBanner sponsors={sponsors} />

          <div style={{ marginTop: 20 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
                {tab === "scores" && <MatchesTab matches={matches} teamName={teamName} teamBadge={teamBadge} teamGroup={teamGroup} competitions={competitions} votedMatches={votedMatches} onVote={onVote} onTeamTap={(teamId) => { setPreviousTab(tab); setSelectedTeamId(teamId); setTab("teams"); }} onCompetitionTap={(competitionId) => { setPreviousTab(tab); setSelectedCompetitionId(competitionId); setTab("competition"); }} onOpenMatch={(matchId) => { setPreviousTab(tab); setSelectedMatchId(matchId); setTab("match"); }} />}
                {tab === "competition" && (
                  <CompetitionProfile
                    competition={competitions.find((c) => c.id === selectedCompetitionId)}
                    teams={teams.filter((t) => teamInCompetition(t, selectedCompetitionId))}
                    matches={matches.filter((m) => m.competitionId === selectedCompetitionId)}
                    players={players}
                    teamName={teamName} teamGroup={teamGroup} votedMatches={votedMatches} onVote={onVote}
                    onTeamTap={(teamId) => { setPreviousTab("competition"); setSelectedTeamId(teamId); setTab("teams"); }}
                    onOpenMatch={(matchId) => { setPreviousTab("competition"); setSelectedMatchId(matchId); setTab("match"); }}
                    onClose={() => { setSelectedCompetitionId(null); setTab(previousTab); }}
                  />
                )}
                {tab === "teams" && <TeamsTab competition={activeCompetition} teams={teams} players={players} matches={matches} selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId} onClose={() => { setSelectedTeamId(null); setTab(previousTab); }} />}
                {tab === "match" && (() => {
                  const m = matches.find((mm) => mm.id === selectedMatchId);
                  if (!m) return null;
                  return (
                    <MatchDetail
                      match={m} teamName={teamName} players={players} referees={referees} votedMatches={votedMatches} onVote={onVote}
                      onTeamTap={(teamId) => { setSelectedTeamId(teamId); setTab("teams"); }}
                      onPlayerTap={(playerId) => {
                        const p = players.find((pl) => pl.id === playerId);
                        const teamCtx = p && playerTeamIds(p).includes(m.teamAId) ? m.teamAId : m.teamBId;
                        setSelectedPlayerId(playerId);
                        setSelectedPlayerTeamId(teamCtx);
                        setTab("player");
                      }}
                      onRefereeTap={(refereeId) => { setSelectedRefereeId(refereeId); setTab("referee"); }}
                      onClose={() => { setSelectedMatchId(null); setTab(previousTab); }}
                    />
                  );
                })()}
                {tab === "referee" && (() => {
                  const ref = referees.find((r) => r.id === selectedRefereeId);
                  if (!ref) return null;
                  return (
                    <RefereeProfile
                      referee={ref} matches={matches} teamName={teamName}
                      onClose={() => { setSelectedRefereeId(null); setTab(previousTab); }}
                    />
                  );
                })()}
                {tab === "transfers" && <TransfersTab transfers={transfers} teamName={teamName} onTeamTap={(teamId) => { setPreviousTab(tab); setSelectedTeamId(teamId); setTab("teams"); }} />}
                {tab === "news" && <NewsTab news={news} setNews={setNews} likedPosts={likedPosts} toggleLike={toggleLike} />}
                {tab === "search" && (
                  <SearchTab
                    teams={teams} players={players} competitions={competitions} matches={matches} referees={referees} teamName={teamName}
                    onOpenTeam={(teamId) => {
                      setSelectedTeamId(teamId);
                      setTab("teams");
                    }}
                    onOpenPlayer={(playerId, teamId) => {
                      setSelectedPlayerId(playerId);
                      setSelectedPlayerTeamId(teamId);
                      setTab("player");
                    }}
                    onOpenCompetition={(competitionId) => { setSelectedCompetitionId(competitionId); setTab("competition"); }}
                    onOpenMatches={() => setTab("scores")}
                    onOpenReferee={(refereeId) => { setSelectedRefereeId(refereeId); setTab("referee"); }}
                    onClose={() => setTab(previousTab)}
                  />
                )}
                {tab === "player" && (() => {
                  const p = players.find((pl) => pl.id === selectedPlayerId);
                  if (!p) return null;
                  const t = teams.find((tm) => tm.id === selectedPlayerTeamId) || null;
                  return (
                    <PlayerProfile
                      player={p} team={t}
                      goals={t ? computePlayerGoals(matches, t.id, p.name) : 0}
                      onClose={() => { setSelectedPlayerId(null); setSelectedPlayerTeamId(null); setTab(previousTab); }}
                    />
                  );
                })()}
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
                    players={players} setPlayers={setPlayers}
                    transfers={transfers} setTransfers={setTransfers}
                    referees={referees} setReferees={setReferees}
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
