import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, GraduationCap, LayoutDashboard, LogOut, RotateCcw, Target, Trophy, XCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "https://psychology-of-learning-backend.onrender.com/api";
const USERS_KEY = "learnwise-users-v1";
const CURRENT_USER_KEY = "learnwise-current-user-v1";
const localKey = "learnwise-attempts-v1";

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function App() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState("practice");
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    fetch(`${API}/weeks`).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setWeeks(data); setApiOnline(true); })
      .catch(() => {
        setWeeks(Array.from({length:12}, (_,i) => ({week:i+1,title:`Week ${i+1}`,count:10})));
      });

    try {
      const storedUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
      if (storedUser?.email) {
        setUser(storedUser);
        const savedAttempts = Array.isArray(storedUser.attempts) ? storedUser.attempts : [];
        setAttempts(savedAttempts);
      }
    } catch {
      setUser(null);
      setAttempts([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/questions?week=${selectedWeek}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setQuestions(data); setApiOnline(true); })
      .catch(() => { setQuestions([]); })
      .finally(() => setLoading(false));
    setAnswers({}); setRevealed({}); setCurrent(0); setSubmitted(false);
  }, [selectedWeek]);

  const weekMeta = weeks.find(w => w.week === selectedWeek) || { title: `Week ${selectedWeek}`, count: 10 };
  const score = useMemo(() => questions.reduce((n,q,i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0), [questions, answers]);
  const answeredCount = Object.keys(answers).length;
  const completedWeeks = new Set(attempts.map(a => a.week)).size;
  const average = attempts.length ? Math.round(attempts.reduce((s,a) => s + a.percentage, 0) / attempts.length) : 0;
  const weeklySummary = useMemo(() => {
    const summary = new Map();
    attempts.forEach(a => {
      const entry = summary.get(a.week) || { week: a.week, title: a.title, attempts: 0, bestScore: 0 };
      entry.attempts += 1;
      entry.bestScore = Math.max(entry.bestScore, a.percentage);
      entry.title = a.title;
      summary.set(a.week, entry);
    });
    return [...summary.values()].sort((a,b) => a.week - b.week);
  }, [attempts]);

  function persistUserAttempts(nextAttempts) {
    if (!user?.email) return;
    const users = readUsers();
    const updatedUser = { ...user, attempts: nextAttempts };
    users[user.email] = updatedUser;
    persistUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    setAttempts(nextAttempts);
  }

  function saveAttempt(result) {
    const next = [result, ...attempts].slice(0, 100);
    persistUserAttempts(next);
    localStorage.setItem(localKey, JSON.stringify(next));
    fetch(`${API}/attempts`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
      week: result.week, score: result.score, total: result.total,
      answers: result.answers.map((selectedIndex, i) => ({questionId: questions[i]?.id, selectedIndex, correct: selectedIndex === questions[i]?.correctIndex}))
    })}).catch(() => {});
  }

  function submitQuiz() {
    if (!questions.length || !user) return;
    const result = { week:selectedWeek, title:weekMeta.title, score, total:questions.length,
      percentage:Math.round(score/questions.length*100), date:new Date().toISOString(), answers:questions.map((_,i)=>answers[i] ?? null) };
    saveAttempt(result); setSubmitted(true);
  }

  function handleAnswerSelect(index) {
    setAnswers(prev => ({ ...prev, [current]: index }));
    setRevealed(prev => ({ ...prev, [current]: true }));
  }

  function startWeek(week) { setSelectedWeek(week); setView("practice"); }
  function restart() { setAnswers({}); setRevealed({}); setCurrent(0); setSubmitted(false); }

  function handleLogin(event) {
    event.preventDefault();
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password.trim();

    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }

    const users = readUsers();
    const existingUser = users[email];

    if (existingUser && existingUser.password !== password) {
      setAuthError("Incorrect password for this email.");
      return;
    }

    const nextUser = existingUser || { email, password, attempts: [] };
    users[email] = nextUser;
    persistUsers(users);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setAttempts(nextUser.attempts || []);
    setAuthForm({ email: "", password: "" });
    setAuthError("");
  }

  function handleLogout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setAttempts([]);
    setView("practice");
    setAuthForm({ email: "", password: "" });
    setAuthError("");
  }

  const q = questions[current];
  const currentAnswer = q ? answers[current] : undefined;
  const currentRevealed = q ? Boolean(revealed[current]) : false;

  if (!user) {
    return <div className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><strong>learnwise</strong><span>MCQ PRACTICE</span></div></div>
        <h1>Sign in to continue</h1>
        <p>Use your email and password to save and restore your weekly scores.</p>
        <form onSubmit={handleLogin} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={authForm.email} onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={authForm.password} onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter password" />
          </label>
          {authError && <div className="auth-error">{authError}</div>}
          <button type="submit" className="primary-btn auth-submit">Login</button>
        </form>
      </div>
    </div>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><strong>learnwise</strong><span>MCQ PRACTICE</span></div></div>
      <div className="nav-label">STUDY SPACE</div>
      <button className={`nav-item ${view==="practice"?"active":""}`} onClick={()=>setView("practice")}><BookOpen size={18}/> Practice questions</button>
      <button className={`nav-item ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}><LayoutDashboard size={18}/> My progress</button>
      <button className="nav-item logout-item" onClick={handleLogout}><LogOut size={18}/> Logout</button>
      <div className="nav-label weeks-label">WEEKLY ASSIGNMENTS <span>12</span></div>
      <div className="week-list">
        {weeks.map(w => <button key={w.week} onClick={()=>startWeek(w.week)} className={`week-item ${selectedWeek===w.week && view==="practice"?"selected":""}`}>
          <span className="week-number">{String(w.week).padStart(2,"0")}</span><span className="week-name">Week {w.week}<small>{w.title}</small></span>
          {attempts.some(a=>a.week===w.week) && <CheckCircle2 className="week-done" size={15}/>}
        </button>)}
      </div>
      <div className="sidebar-bottom"><div className="mini-icon"><Target size={18}/></div><div><strong>Small steps, big progress.</strong><p>Practice a little every day.</p></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="crumb">Learning space <ChevronRight size={14}/> <b>{view==="dashboard"?"My progress":"Weekly practice"}</b></div><div className="top-actions"><span className={`connection-dot ${apiOnline?"online":""}`}></span><span>{apiOnline?"Connected":"Practice mode"}</span><div className="avatar">{user.email.charAt(0).toUpperCase()}</div></div></header>
      {view==="dashboard" ? <section className="content">
        <div className="eyebrow">YOUR LEARNING OVERVIEW</div>
        <h1>Welcome back, {user.email.split("@")[0]}.</h1>
        <p className="subtitle">Here is your saved progress for every week.</p>
        <div className="stats-grid">
          <Stat icon={<Trophy/>} label="Quiz attempts" value={attempts.length} tint="purple"/>
          <Stat icon={<CheckCircle2/>} label="Weeks practiced" value={`${completedWeeks}/12`} tint="green"/>
          <Stat icon={<Target/>} label="Average score" value={`${average}%`} tint="orange"/>
        </div>
        <div className="panel progress-panel"><div className="panel-heading"><div><h2>Weekly progress</h2><p>Check how many times you attempted each week and your best score.</p></div><span className="soft-tag">{completedWeeks} of 12 started</span></div>
          <div className="progress-list">{weeklySummary.length===0 ? <Empty text="No saved attempts yet. Finish a quiz to see your week-by-week performance here."/> : weeklySummary.map(item => <div className="progress-row" key={item.week}><div className="progress-week">Week {item.week}<small>{item.title}</small></div><div className="bar-track"><div className="bar-fill" style={{width:`${item.bestScore}%`}}/></div><span className="progress-score">{item.bestScore}%</span><div className="week-attempts">{item.attempts} time{item.attempts > 1 ? "s" : ""}</div></div>)}</div>
        </div>
        <div className="panel history-panel"><h2>Recent attempts</h2>{attempts.length===0?<Empty text="No attempts yet. Complete a weekly quiz and your results will appear here."/>:<div className="history-list">{attempts.slice(0,8).map((a,i)=><div className="history-row" key={`${a.date}-${i}`}><div className="history-badge"><BookOpen size={17}/></div><div className="history-title"><strong>Week {a.week} · {a.title}</strong><small>{new Date(a.date).toLocaleString()}</small></div><strong className={a.percentage>=70?"good-score":"plain-score"}>{a.score}/{a.total} <small>({a.percentage}%)</small></strong></div>)}</div>}</div>
      </section> : <section className="content">
        <div className="hero-row"><div><div className="eyebrow">NPTEL · PSYCHOLOGY OF LEARNING</div><h1>Weekly MCQ practice</h1><p className="subtitle">Build confidence one question at a time. Practice at your own pace.</p></div><div className="hero-art"><div className="art-circle"><GraduationCap size={38}/></div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span></div></div>
        <div className="week-heading"><div className="week-title-icon"><BookOpen size={21}/></div><div><span className="eyebrow">CURRENT ASSIGNMENT</span><h2>Week {selectedWeek}: {weekMeta.title}</h2></div><div className="question-count"><CircleHelp size={16}/>{questions.length || 10} questions</div></div>
        <div className="quiz-layout">
          <div className="quiz-main">
            {loading ? <div className="panel loading">Loading questions…</div> : questions.length===0 ? <div className="panel"><h2>Could not load the question bank</h2><p className="subtitle">Start the backend server, then refresh this page. See README for setup.</p></div> : submitted ? <div className="panel results-panel">
              <div className={`result-icon ${score/questions.length>=.7?"result-good":"result-review"}`}>{score/questions.length>=.7?<Trophy size={32}/>:<BookOpen size={32}/>}</div>
              <div className="eyebrow">QUIZ COMPLETED</div><h2>{score/questions.length>=.7?"Nice work! Keep it up.":"Good effort. Keep practicing."}</h2><p className="subtitle">You completed Week {selectedWeek}: {weekMeta.title}</p>
              <div className="score-ring" style={{"--score":`${score/questions.length*100}%`}}><div><strong>{Math.round(score/questions.length*100)}%</strong><small>your score</small></div></div>
              <div className="result-metrics"><div><strong>{score}</strong><span>Correct</span></div><div><strong>{questions.length-score}</strong><span>To review</span></div><div><strong>{answeredCount}/{questions.length}</strong><span>Attempted</span></div></div>
              <div className="result-actions"><button className="primary-btn" onClick={restart}><RotateCcw size={17}/> Try again</button><button className="secondary-btn" onClick={()=>setView("dashboard")}>View progress</button></div>
              <div className="review-title"><h3>Answer review</h3><span>Review each answer and explanation</span></div>
              <div className="review-list">{questions.map((item,i)=>{const ok=answers[i]===item.correctIndex;return <div className="review-item" key={item.id}><div className={`review-status ${ok?"correct":"incorrect"}`}>{ok?<CheckCircle2 size={17}/>:<XCircle size={17}/>}</div><div className="review-body"><strong>{i+1}. {item.question}</strong><p className="correct-answer">Correct answer: {item.options[item.correctIndex]}</p>{answers[i]!==undefined && answers[i]!==item.correctIndex && <p className="wrong-answer">Your answer: {item.options[answers[i]]}</p>}<p className="explanation">{item.explanation}</p></div></div>})}</div>
            </div> : <div className="panel question-panel">
              <div className="question-top"><span className="question-number">QUESTION {String(current+1).padStart(2,"0")} <span>OF {questions.length}</span></span><span className="type-tag">Single choice</span></div>
              <div className="question-progress"><div style={{width:`${(current+1)/questions.length*100}%`}}/></div>
              <h2 className="question-text">{q?.question}</h2>
              <p className="choose-hint">Choose the best answer from the options below.</p>
              <div className="options-list">{q?.options.map((option,i)=>{
                const isSelected = currentAnswer === i;
                const isCorrect = i === q.correctIndex;
                const isOptionRevealed = currentRevealed && (isSelected || isCorrect);
                return <button key={option} onClick={()=>handleAnswerSelect(i)} className={`option ${isSelected ? "chosen" : ""} ${currentRevealed && isCorrect ? "correct" : ""} ${currentRevealed && isSelected && !isCorrect ? "incorrect" : ""} ${isOptionRevealed ? "revealed" : ""}`}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{option}</span><span className="option-radio">{isSelected && <span/>}</span></button>;
              })}</div>
              {currentRevealed && <div className={`answer-feedback ${currentAnswer === q.correctIndex ? "success" : "error"}`}><strong>{currentAnswer === q.correctIndex ? "Correct!" : "Not quite."}</strong><span>Correct answer: {q.options[q.correctIndex]}</span></div>}
              <div className="question-footer"><button className="secondary-btn" disabled={current===0} onClick={()=>setCurrent(v=>v-1)}><ChevronLeft size={17}/> Previous</button><span className="answered-label">{answeredCount} of {questions.length} answered</span>{current<questions.length-1?<button className="primary-btn" onClick={()=>setCurrent(v=>v+1)}>Next question <ChevronRight size={17}/></button>:<button className="primary-btn" onClick={submitQuiz}>Submit quiz <CheckCircle2 size={17}/></button>}</div>
              {current===questions.length-1 && <button className="submit-link" onClick={submitQuiz}>Finish and see my results</button>}
            </div>}
          </div>
          {!submitted && questions.length>0 && <aside className="quiz-aside">
            <div className="panel side-card"><div className="side-card-title"><Clock3 size={18}/><strong>Question navigator</strong></div><p>Jump to any question. Your selected answers are saved while you practice.</p><div className="number-grid">{questions.map((item,i)=><button key={item.id} onClick={()=>setCurrent(i)} className={`${current===i?"current":""} ${answers[i]!==undefined?"answered":""}`}>{i+1}</button>)}</div><div className="legend"><span><i className="legend-current"/>Current</span><span><i className="legend-answered"/>Answered</span><span><i className="legend-empty"/>Not answered</span></div><button className="submit-wide" onClick={submitQuiz}>Submit quiz <ChevronRight size={16}/></button></div>
            <div className="tip-card"><div className="tip-icon"><Target size={19}/></div><strong>Study tip</strong><p>Try answering from memory first. Use the review screen to focus your next revision session.</p></div>
          </aside>}
        </div>
        <div className="source-note"><span>ⓘ</span> Questions are based on the weekly assignment files you provided. Check your course lecture notes for deeper explanations.</div>
      </section>}
      <footer className="footer"><span>© 2026 Learnwise Practice</span><span>Made for focused learning <span className="footer-heart">♥</span></span></footer>
    </main>
  </div>;
}

function Stat({icon,label,value,tint}) { return <div className="stat-card"><div className={`stat-icon ${tint}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function Empty({text}) { return <div className="empty-state"><BookOpen size={22}/><p>{text}</p></div>; }
export default App;
