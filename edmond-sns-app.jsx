import { useState, useEffect } from "react";

const SCHOOL_INFO = {
  name: "エドモンドプログラミング教室 綾瀬校",
  location: "綾瀬",
  target: "小学生・中学生",
  features: ["少人数制", "個別対応", "体験会随時開催中"],
};

const POST_THEMES = [
  { id: "event", label: "🎉 体験会・イベント告知", color: "#FF6B6B" },
  { id: "student", label: "⭐ 生徒の成果・作品紹介", color: "#4ECDC4" },
  { id: "tips", label: "💡 プログラミング豆知識", color: "#FFE66D" },
  { id: "daily", label: "📚 授業の様子", color: "#A8E6CF" },
  { id: "recruitment", label: "📣 生徒募集", color: "#FF8B94" },
  { id: "lp", label: "🌐 LP用テキスト生成", color: "#B8B8FF" },
];

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function App() {
  const [tab, setTab] = useState("generate");
  const [theme, setTheme] = useState(POST_THEMES[0]);
  const [detail, setDetail] = useState("");
  const [generatedPost, setGeneratedPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [today] = useState(new Date());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [toast, setToast] = useState("");
  const [lpSection, setLpSection] = useState("hero");

  const LP_SECTIONS = [
    { id: "hero", label: "ヒーロー文（キャッチコピー）" },
    { id: "features", label: "教室の特徴・強み" },
    { id: "voice", label: "保護者の声（テンプレ）" },
    { id: "cta", label: "体験会への誘導文" },
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const generatePost = async () => {
    setLoading(true);
    setGeneratedPost("");

    const isLP = theme.id === "lp";
    const lpSectionLabel = LP_SECTIONS.find(s => s.id === lpSection)?.label || "";

    const systemPrompt = isLP
      ? `あなたはプログラミング教室のマーケティング専門家です。LP（ランディングページ）用の魅力的な文章を日本語で生成してください。教室情報: ${SCHOOL_INFO.name}、対象: ${SCHOOL_INFO.target}、特徴: ${SCHOOL_INFO.features.join("・")}。HTMLタグは使わず、改行を活用した読みやすいテキストで返答してください。`
      : `あなたはSNS運用が得意なプログラミング教室のスタッフです。インスタグラム用の投稿文を日本語で生成してください。教室情報: ${SCHOOL_INFO.name}、対象: ${SCHOOL_INFO.target}、特徴: ${SCHOOL_INFO.features.join("・")}。絵文字を適度に使い、ハッシュタグを5〜8個末尾につけてください。280〜400文字程度で。`;

    const userPrompt = isLP
      ? `LP のセクション「${lpSectionLabel}」の文章を作成してください。追加情報: ${detail || "特になし"}`
      : `テーマ「${theme.label}」で投稿文を作成してください。追加情報・詳細: ${detail || "特になし"}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "生成に失敗しました。";
      setGeneratedPost(text);
    } catch (e) {
      setGeneratedPost("エラーが発生しました。もう一度お試しください。");
    }
    setLoading(false);
  };

  const saveToSchedule = () => {
    if (!generatedPost || !selectedDay) {
      showToast("投稿文と日付を選んでください");
      return;
    }
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const exists = schedule.find(s => s.date === dateStr);
    if (exists) {
      showToast("その日にはすでに投稿が登録されています");
      return;
    }
    setSchedule(prev => [...prev, {
      id: Date.now(),
      date: dateStr,
      title: saveTitle || theme.label,
      text: generatedPost,
      theme: theme.id,
      color: theme.color,
      posted: false,
    }]);
    setSaveTitle("");
    setSelectedDay(null);
    showToast("スケジュールに保存しました ✅");
  };

  const togglePosted = (id) => {
    setSchedule(prev => prev.map(s => s.id === id ? { ...s, posted: !s.posted } : s));
  };

  const deleteSchedule = (id) => {
    setSchedule(prev => prev.filter(s => s.id !== id));
  };

  const calDays = getCalendarDays(calYear, calMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const getDaySchedule = (day) => {
    if (!day) return null;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return schedule.find(s => s.date === dateStr);
  };

  const upcomingPosts = schedule
    .filter(s => s.date >= todayStr && !s.posted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", minHeight: "100vh", background: "#0F0F1A", color: "#F0F0F8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Space+Mono:wght@700&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#4ECDC4", color: "#0F0F1A", padding: "10px 24px", borderRadius: 999,
          fontWeight: 700, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 20px rgba(78,205,196,0.4)"
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)", borderBottom: "1px solid #2A2A4A", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #FF6B6B, #FF8B94)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💻</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "0.02em" }}>EDMOND SNS Manager</div>
          <div style={{ fontSize: 11, color: "#8888AA", fontWeight: 500 }}>エドモンドプログラミング教室 綾瀬校</div>
        </div>
        {upcomingPosts.length > 0 && (
          <div style={{ marginLeft: "auto", background: "#FF6B6B22", border: "1px solid #FF6B6B55", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#FF6B6B", fontWeight: 700 }}>
            📅 予定 {upcomingPosts.length}件
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #2A2A4A", background: "#1A1A2E" }}>
        {[
          { id: "generate", label: "✨ 投稿生成" },
          { id: "calendar", label: "📅 スケジュール" },
          { id: "list", label: "📋 投稿一覧" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "14px 8px", background: "none", border: "none",
            borderBottom: tab === t.id ? "2px solid #4ECDC4" : "2px solid transparent",
            color: tab === t.id ? "#4ECDC4" : "#8888AA", fontWeight: tab === t.id ? 700 : 500,
            fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit"
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>

        {/* ===== GENERATE TAB ===== */}
        {tab === "generate" && (
          <div>
            {/* Theme selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>投稿テーマを選ぶ</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {POST_THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t)} style={{
                    padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${theme.id === t.id ? t.color : "#2A2A4A"}`,
                    background: theme.id === t.id ? t.color + "22" : "#1A1A2E",
                    color: theme.id === t.id ? t.color : "#AAAACC", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "inherit"
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* LP section selector */}
            {theme.id === "lp" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>LPセクション</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {LP_SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setLpSection(s.id)} style={{
                      padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${lpSection === s.id ? "#B8B8FF" : "#2A2A4A"}`,
                      background: lpSection === s.id ? "#B8B8FF22" : "#1A1A2E",
                      color: lpSection === s.id ? "#B8B8FF" : "#AAAACC", fontWeight: 600, fontSize: 13,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit"
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Detail input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>
                {theme.id === "lp" ? "追加情報（任意）" : "追加情報・詳細（任意）"}
              </div>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder={
                  theme.id === "event" ? "例：3月20日(木)14時〜、体験会開催。定員5名。" :
                  theme.id === "student" ? "例：小学3年生がScratchでゲームを完成させました！" :
                  theme.id === "lp" ? "例：春の入会キャンペーン、月謝半額など特記事項があれば" :
                  "例：先週の授業の様子、子供たちが楽しそうにしていた"
                }
                rows={3}
                style={{
                  width: "100%", background: "#1A1A2E", border: "1.5px solid #2A2A4A",
                  borderRadius: 10, color: "#F0F0F8", padding: "12px 14px", fontSize: 14,
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            {/* Generate button */}
            <button onClick={generatePost} disabled={loading} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: loading ? "#2A2A4A" : `linear-gradient(135deg, ${theme.color}, ${theme.color}AA)`,
              border: "none", color: loading ? "#8888AA" : "#0F0F1A",
              fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "0.02em"
            }}>
              {loading ? "✨ 生成中..." : "✨ AI で投稿文を生成する"}
            </button>

            {/* Generated post */}
            {generatedPost && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>生成された投稿文</div>
                <div style={{
                  background: "#1A1A2E", border: "1.5px solid #2A2A4A", borderRadius: 12,
                  padding: 16, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#E0E0F0"
                }}>{generatedPost}</div>

                {/* Copy button */}
                <button onClick={() => { navigator.clipboard.writeText(generatedPost); showToast("コピーしました！インスタに貼り付けてください 📋"); }} style={{
                  width: "100%", marginTop: 10, padding: "12px", borderRadius: 10,
                  background: "#4ECDC422", border: "1.5px solid #4ECDC4", color: "#4ECDC4",
                  fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
                }}>📋 コピーしてインスタに貼り付ける</button>

                {/* Save to schedule */}
                <div style={{ marginTop: 16, background: "#1A1A2E", border: "1.5px solid #2A2A4A", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>スケジュールに保存</div>
                  <input
                    value={saveTitle}
                    onChange={e => setSaveTitle(e.target.value)}
                    placeholder="投稿タイトル（省略可）"
                    style={{
                      width: "100%", background: "#0F0F1A", border: "1.5px solid #2A2A4A",
                      borderRadius: 8, color: "#F0F0F8", padding: "10px 12px", fontSize: 13,
                      fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10, outline: "none"
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#8888AA", marginBottom: 8 }}>
                    投稿予定日: {selectedDay ? `${calYear}/${calMonth + 1}/${selectedDay}` : "カレンダーで日付を選んでください"}
                  </div>
                  <button onClick={() => { setTab("calendar"); }} style={{
                    padding: "8px 14px", borderRadius: 8, background: "#2A2A4A",
                    border: "none", color: "#AAAACC", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginRight: 8
                  }}>📅 カレンダーで選ぶ</button>
                  <button onClick={saveToSchedule} style={{
                    padding: "8px 14px", borderRadius: 8,
                    background: selectedDay ? "linear-gradient(135deg, #FF6B6B, #FF8B94)" : "#2A2A4A",
                    border: "none", color: selectedDay ? "#0F0F1A" : "#8888AA",
                    fontSize: 12, fontWeight: 700, cursor: selectedDay ? "pointer" : "not-allowed", fontFamily: "inherit"
                  }}>保存する</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== CALENDAR TAB ===== */}
        {tab === "calendar" && (
          <div>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} style={{ background: "#1A1A2E", border: "1px solid #2A2A4A", color: "#F0F0F8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>‹</button>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{calYear}年 {calMonth + 1}月</div>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} style={{ background: "#1A1A2E", border: "1px solid #2A2A4A", color: "#F0F0F8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? "#FF6B6B" : i === 6 ? "#4ECDC4" : "#8888AA", padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calDays.map((day, idx) => {
                const sched = getDaySchedule(day);
                const dateStr = day ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                const isToday = dateStr === todayStr;
                const isSelected = day === selectedDay;
                const dow = idx % 7;
                return (
                  <div key={idx} onClick={() => day && setSelectedDay(day)} style={{
                    minHeight: 52, borderRadius: 8, padding: "4px 6px", cursor: day ? "pointer" : "default",
                    background: isSelected ? "#4ECDC422" : isToday ? "#FF6B6B22" : sched ? sched.color + "18" : "#1A1A2E",
                    border: isSelected ? "1.5px solid #4ECDC4" : isToday ? "1.5px solid #FF6B6B55" : "1px solid #2A2A4A",
                    transition: "all 0.15s"
                  }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: isToday ? 900 : 500, color: isToday ? "#FF6B6B" : dow === 0 ? "#FF6B6B" : dow === 6 ? "#4ECDC4" : "#AAAACC" }}>{day}</div>
                        {sched && (
                          <div style={{ marginTop: 2, fontSize: 9, fontWeight: 700, color: sched.color, background: sched.color + "22", borderRadius: 4, padding: "1px 4px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sched.posted ? "✓ " : "●"}{sched.title.slice(0, 6)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedDay && (
              <div style={{ marginTop: 16, background: "#1A1A2E", border: "1.5px solid #4ECDC4", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, color: "#4ECDC4", marginBottom: 6, fontSize: 13 }}>
                  {calYear}/{calMonth + 1}/{selectedDay} を選択中
                </div>
                {getDaySchedule(selectedDay) ? (
                  <div style={{ fontSize: 13, color: "#AAAACC" }}>この日には「{getDaySchedule(selectedDay)?.title}」が登録されています</div>
                ) : (
                  <div style={{ fontSize: 13, color: "#8888AA" }}>投稿生成タブで文章を作って、この日に保存できます</div>
                )}
              </div>
            )}

            {/* Upcoming */}
            {upcomingPosts.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: "#8888AA", fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>📣 直近の投稿予定</div>
                {upcomingPosts.map(s => (
                  <div key={s.id} style={{ background: "#1A1A2E", border: `1px solid ${s.color}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#8888AA" }}>{s.date}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    </div>
                    <button onClick={() => togglePosted(s.id)} style={{ background: "#4ECDC422", border: "1px solid #4ECDC4", color: "#4ECDC4", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>投稿済み</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== LIST TAB ===== */}
        {tab === "list" && (
          <div>
            {schedule.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#8888AA" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 14 }}>まだ投稿が保存されていません</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>「投稿生成」タブでAIに文章を作ってもらいましょう</div>
              </div>
            ) : (
              [...schedule].sort((a, b) => a.date.localeCompare(b.date)).map(s => (
                <div key={s.id} style={{
                  background: "#1A1A2E", border: `1px solid ${s.posted ? "#2A2A4A" : s.color + "55"}`,
                  borderRadius: 12, padding: 16, marginBottom: 12,
                  opacity: s.posted ? 0.6 : 1
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.posted ? "#8888AA" : s.color }} />
                      <div style={{ fontSize: 12, color: "#8888AA" }}>{s.date}</div>
                      {s.posted && <div style={{ fontSize: 10, background: "#4ECDC422", color: "#4ECDC4", borderRadius: 999, padding: "1px 8px", fontWeight: 700 }}>投稿済み</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { navigator.clipboard.writeText(s.text); showToast("コピーしました！"); }} style={{ background: "#2A2A4A", border: "none", color: "#AAAACC", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>コピー</button>
                      <button onClick={() => togglePosted(s.id)} style={{ background: s.posted ? "#2A2A4A" : "#4ECDC422", border: `1px solid ${s.posted ? "#2A2A4A" : "#4ECDC4"}`, color: s.posted ? "#8888AA" : "#4ECDC4", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        {s.posted ? "未投稿に戻す" : "投稿済みにする"}
                      </button>
                      <button onClick={() => deleteSchedule(s.id)} style={{ background: "#FF6B6B22", border: "1px solid #FF6B6B44", color: "#FF6B6B", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>削除</button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#AAAACC", lineHeight: 1.7, maxHeight: 80, overflow: "hidden", whiteSpace: "pre-wrap" }}>{s.text.slice(0, 150)}{s.text.length > 150 ? "..." : ""}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
