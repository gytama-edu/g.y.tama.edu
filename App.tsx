import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Compass, FileText, Flame, GraduationCap, Lightbulb,
  Menu, MessageSquareText, PencilLine, Play, Search, Sparkles, Target,
  TrendingUp, X, Zap
} from 'lucide-react';

type View = 'home' | 'learn' | 'myths' | 'practice' | 'feedback';

const lessons = [
  { id: 'foundations', eyebrow: 'MODULE 0 · FOUNDATIONS', title: 'The anatomy of a sentence', description: 'Build clear, accurate sentences before you tackle a full IELTS response.', level: 'Foundation', duration: '18 min', progress: 0, icon: BookOpen, color: 'blue' },
  { id: 'task1', eyebrow: 'ACADEMIC TASK 1', title: 'See the big picture: writing an overview', description: 'Learn what an overview does, what it leaves out, and how to write one.', level: 'Developing', duration: '22 min', progress: 0, icon: TrendingUp, color: 'orange' },
  { id: 'task2', eyebrow: 'ACADEMIC TASK 2', title: 'Understand the question first', description: 'Identify the task, define your position, and plan a focused response.', level: 'All levels', duration: '20 min', progress: 0, icon: PencilLine, color: 'purple' },
];

const myths = [
  { category: 'Writing Task 2', title: '“You must use advanced vocabulary to get Band 7.”', verdict: 'MISLEADING', body: 'Precise, natural vocabulary is more valuable than forcing in complicated words. The goal is to express your meaning accurately and appropriately.', tag: 'Vocabulary' },
  { category: 'Writing Task 1', title: '“You need to describe every number in the chart.”', verdict: 'FALSE', body: 'A strong report selects and compares key features. Listing every figure usually hides the main patterns instead of explaining them.', tag: 'Task achievement' },
  { category: 'General', title: '“A longer essay automatically gets a higher band.”', verdict: 'FALSE', body: 'Meeting the minimum word count matters, but extra words do not guarantee better development, coherence, or language control.', tag: 'Exam strategy' },
  { category: 'Writing Task 2', title: '“Every essay needs a memorised template.”', verdict: 'MISLEADING', body: 'A clear structure helps, but a memorised response can become irrelevant to the exact question. Plan around the task in front of you.', tag: 'Essay structure' },
];

function App() {
  const [view, setView] = useState<View>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [activeLesson, setActiveLesson] = useState('foundations');
  const [mythFilter, setMythFilter] = useState('All myths');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  const navigate = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const selectedLesson = lessons.find(l => l.id === activeLesson) ?? lessons[0];
  const filteredMyths = useMemo(() => myths.filter(m => (mythFilter === 'All myths' || m.category === mythFilter) && `${m.title} ${m.body} ${m.tag}`.toLowerCase().includes(query.toLowerCase())), [mythFilter, query]);
  const toggleSaved = (id: string) => setSaved(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);

  const navItems: { label: string; view: View; icon: React.ElementType }[] = [
    { label: 'Overview', view: 'home', icon: Compass },
    { label: 'Learning paths', view: 'learn', icon: BookOpen },
    { label: 'Mythbusters', view: 'myths', icon: CircleHelp },
    { label: 'Practice studio', view: 'practice', icon: PencilLine },
  ];

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="IELTS Unpacked home">
        <span className="brand-mark"><GraduationCap size={22} strokeWidth={2.3} /></span>
        <span className="brand-name">IELTS <b>unpacked</b><small>by GYTama EDU</small></span>
      </button>
      <nav className={`main-nav ${mobileNav ? 'open' : ''}`}>
        {navItems.map(item => <button key={item.view} className={`nav-link ${view === item.view ? 'active' : ''}`} onClick={() => navigate(item.view)}><item.icon size={16}/>{item.label}</button>)}
      </nav>
      <div className="top-actions"><button className="text-action" onClick={() => navigate('learn')}>My learning <ChevronDown size={14}/></button><button className="avatar" onClick={() => navigate('learn')} aria-label="Open learning dashboard">GY</button></div>
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X/> : <Menu/>}</button>
    </header>

    {view === 'home' && <main>
      <section className="hero-wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> IELTS WRITING, MADE CLEARER</div>
          <h1>Stop guessing.<br/><span>Start understanding.</span></h1>
          <p className="hero-subtitle">Forget the myths. Learn the real skills behind IELTS Writing — one clear step at a time, from your first sentence to Band 8+ thinking.</p>
          <div className="hero-buttons"><button className="btn btn-primary" onClick={() => navigate('learn')}>Explore learning paths <ArrowRight size={17}/></button><button className="btn btn-secondary" onClick={() => navigate('myths')}><Play size={16} fill="currentColor"/> Debunk an IELTS myth</button></div>
          <div className="hero-proof"><div className="proof-avatars"><span>W</span><span>R</span><span>8+</span></div><p><b>Understand the why,</b> not just the rules.</p><span className="proof-divider"/><span className="proof-note"><CheckCircle2 size={15}/> Learn at your own pace</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of an IELTS writing lesson">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="floating-note note-top"><span className="note-icon orange"><Lightbulb size={17}/></span><span><b>Think critically</b><small>Question the myth</small></span></div>
          <div className="lesson-preview">
            <div className="preview-top"><span className="preview-badge">YOUR NEXT LESSON</span><span className="preview-dots">•••</span></div>
            <div className="preview-illustration"><div className="paper paper-back"/><div className="paper paper-front"><span className="paper-label">WRITING SKILLS</span><span className="paper-line wide"/><span className="paper-line"/><span className="paper-line medium"/><span className="paper-highlight">clear ideas <span>✓</span></span><span className="paper-line short"/></div><div className="pencil"><span/></div></div>
            <div className="preview-title">The anatomy of a sentence</div><div className="preview-meta"><span><Clock3 size={14}/> 18 min</span><span className="level-pill">Foundation</span></div><div className="preview-progress"><span/></div>
          </div>
          <div className="floating-note note-bottom"><span className="note-icon blue"><Sparkles size={17}/></span><span><b>Improve with purpose</b><small>Practise · reflect · revise</small></span></div>
          <div className="art-star star-one">✳</div><div className="art-star star-two">✦</div>
        </div>
      </section>

      <section className="stats-strip"><div className="stat-item"><span className="stat-icon blue-bg"><BookOpen size={19}/></span><div><b>Learn the foundations</b><small>Build skills that transfer</small></div></div><div className="stat-item"><span className="stat-icon orange-bg"><Brain size={19}/></span><div><b>Challenge the myths</b><small>Know what really matters</small></div></div><div className="stat-item"><span className="stat-icon purple-bg"><Target size={19}/></span><div><b>Practise with purpose</b><small>Turn feedback into progress</small></div></div><div className="stat-item stat-last"><span className="stat-icon green-bg"><Zap size={19}/></span><div><b>Grow at your pace</b><small>Foundation to Band 8+</small></div></div></section>

      <section className="section-block learning-section"><div className="section-heading"><div><span className="section-kicker">YOUR LEARNING JOURNEY</span><h2>Where do you want to start?</h2><p>Choose a path. You don't need to know everything before you begin.</p></div><button className="inline-link" onClick={() => navigate('learn')}>View all learning paths <ArrowRight size={16}/></button></div>
        <div className="path-grid">{lessons.map((lesson, i) => <article className="path-card" key={lesson.id}><div className={`path-icon ${lesson.color}`}><lesson.icon size={22}/></div><div className="path-card-top"><span>{lesson.eyebrow}</span><span className="path-number">0{i+1}</span></div><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="path-meta"><span><Clock3 size={14}/>{lesson.duration}</span><span>{lesson.level}</span></div><button className="card-link" onClick={() => {setActiveLesson(lesson.id); navigate('learn')}}>Explore lesson <ArrowRight size={15}/></button></article>)}</div>
      </section>

      <section className="myth-banner"><div className="myth-banner-icon"><CircleHelp size={27}/></div><div className="myth-banner-copy"><span className="section-kicker">THE MYTHBUSTERS LIBRARY</span><h2>Good advice should survive a closer look.</h2><p>Separate popular IELTS advice from the skills that actually help you write better.</p></div><button className="btn btn-light" onClick={() => navigate('myths')}>Explore the myths <ArrowRight size={16}/></button><span className="banner-spark">✳</span></section>
      <footer className="footer"><div className="footer-brand">IELTS <b>unpacked</b> <span>by GYTama EDU</span></div><span>Learn the skill. Understand the task. Write with confidence.</span><button onClick={() => navigate('practice')}>Try a practice task <ArrowRight size={14}/></button></footer>
    </main>}

    {view === 'learn' && <main className="inner-page"><div className="breadcrumbs"><button onClick={() => navigate('home')}>Home</button><ChevronRight size={14}/><span>Learning paths</span></div><div className="inner-heading"><div><span className="section-kicker">THE LEARNING LIBRARY</span><h1>Build your writing, <span>step by step.</span></h1><p>Start with the foundations, then apply your skills to Academic Task 1 and Task 2.</p></div><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search lessons..."/></div></div>
      <div className="learn-layout"><aside className="learn-sidebar"><span className="sidebar-title">LEARNING PATHS</span><button className="sidebar-item selected"><BookOpen size={17}/> All lessons <span>3</span></button><button className="sidebar-item" onClick={() => {setActiveLesson('foundations')}}> <span className="sidebar-dot blue-dot"/> Writing foundations</button><button className="sidebar-item" onClick={() => setActiveLesson('task1')}><span className="sidebar-dot orange-dot"/> Academic Task 1</button><button className="sidebar-item" onClick={() => setActiveLesson('task2')}><span className="sidebar-dot purple-dot"/> Academic Task 2</button><div className="sidebar-help"><Lightbulb size={18}/><b>Not sure where to start?</b><p>Begin with sentence foundations. Strong writing starts with clear sentences.</p><button onClick={() => setActiveLesson('foundations')}>Start at the beginning <ArrowRight size={13}/></button></div></aside>
      <div className="lesson-content"><div className="content-topline"><span>{lessons.length} STARTER LESSONS</span><button className="sort-button">Recommended <ChevronDown size={14}/></button></div>{lessons.filter(l => `${l.title} ${l.description} ${l.eyebrow}`.toLowerCase().includes(query.toLowerCase())).map((lesson, i) => <article className={`lesson-row ${activeLesson === lesson.id ? 'lesson-selected' : ''}`} key={lesson.id}><div className={`lesson-row-icon ${lesson.color}`}><lesson.icon size={22}/></div><div className="lesson-row-main"><div className="lesson-eyebrow">{lesson.eyebrow}</div><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-row-meta"><span><Clock3 size={14}/>{lesson.duration}</span><span>{lesson.level}</span><span className="not-started">Not started</span></div></div><button className="lesson-open" onClick={() => {setActiveLesson(lesson.id); setShowFeedback(false)}} aria-label={`Open ${lesson.title}`}><ChevronRight size={20}/></button></article>)}
      <div className="lesson-detail"><div className="detail-top"><span className={`path-icon ${selectedLesson.color}`}><selectedLesson.icon size={20}/></span><span className="section-kicker">SELECTED LESSON</span></div><h2>{selectedLesson.title}</h2><p>{selectedLesson.description}</p>{activeLesson === 'foundations' ? <div className="lesson-objectives"><b>In this lesson, you'll learn to:</b><ul><li>Identify the subject and verb in a sentence.</li><li>Distinguish a complete clause from a phrase.</li><li>Build clearer sentences with accurate punctuation.</li></ul></div> : activeLesson === 'task1' ? <div className="lesson-objectives"><b>In this lesson, you'll learn to:</b><ul><li>Identify the most important overall trends.</li><li>Write a concise overview without listing every figure.</li><li>Compare key features accurately.</li></ul></div> : <div className="lesson-objectives"><b>In this lesson, you'll learn to:</b><ul><li>Identify exactly what the question asks.</li><li>Develop a clear position and relevant main ideas.</li><li>Plan paragraphs before you start writing.</li></ul></div>}<button className="btn btn-primary" onClick={() => navigate('practice')}>Start a related practice <ArrowRight size={16}/></button></div></div></div>
    </main>}

    {view === 'myths' && <main className="inner-page"><div className="breadcrumbs"><button onClick={() => navigate('home')}>Home</button><ChevronRight size={14}/><span>Mythbusters</span></div><div className="myths-hero"><div><span className="section-kicker">THE IELTS MYTHBUSTERS</span><h1>Advice is everywhere.<br/><span>Clarity is the advantage.</span></h1><p>Let's examine common IELTS Writing claims, understand what's misleading, and focus on what actually improves your writing.</p></div><div className="myths-hero-art"><div className="question-circle"><CircleHelp size={42}/></div><span className="myth-chip chip-a">Really?</span><span className="myth-chip chip-b">Fact check ✓</span><span className="myth-spark">✳</span></div></div><div className="filter-row"><div className="filter-tabs">{['All myths','General','Writing Task 1','Writing Task 2'].map(f => <button key={f} className={mythFilter === f ? 'filter-active' : ''} onClick={() => setMythFilter(f)}>{f}</button>)}</div><div className="search-box myth-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search myths..."/><button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button></div></div><div className="myth-grid">{filteredMyths.map((myth, i) => <article className="myth-card" key={myth.title}><div className="myth-card-top"><span className="myth-category">{myth.category}</span><span className={`verdict ${myth.verdict === 'FALSE' ? 'verdict-false' : ''}`}>{myth.verdict}</span></div><h3>{myth.title}</h3><p>{myth.body}</p><div className="myth-card-bottom"><span>{myth.tag}</span><button onClick={() => toggleSaved(myth.title)} className={saved.includes(myth.title) ? 'saved' : ''}>{saved.includes(myth.title) ? 'Saved ✓' : 'Save for later'}</button></div></article>)}</div>{filteredMyths.length === 0 && <div className="empty-state"><Search size={24}/><h3>No myths found</h3><p>Try another search or select a different category.</p></div>}<div className="editorial-note"><Lightbulb size={19}/><p><b>Our principle:</b> a useful strategy should help you answer the task more accurately — not just make your essay sound complicated.</p></div></main>}

    {view === 'practice' && <main className="inner-page"><div className="breadcrumbs"><button onClick={() => navigate('home')}>Home</button><ChevronRight size={14}/><span>Practice studio</span></div><div className="inner-heading practice-heading"><div><span className="section-kicker">PRACTICE STUDIO</span><h1>Make the skill <span>your own.</span></h1><p>Try a short writing task. Focus on one skill at a time, then reflect on your choices.</p></div><span className="practice-badge"><Sparkles size={16}/> Guided practice</span></div><div className="practice-layout"><section className="task-panel"><div className="task-panel-header"><div><span className="task-label">TASK 2 · QUICK PRACTICE</span><h2>Make your position clear</h2></div><span className="time-badge"><Clock3 size={14}/> 8–10 min</span></div><p className="task-prompt">Some people believe that schools should teach practical skills, such as managing money, alongside traditional academic subjects. To what extent do you agree or disagree?</p><div className="task-tip"><Lightbulb size={17}/><p><b>Before you write:</b> Decide your position in one sentence. You don't need a full essay for this exercise.</p></div><label className="response-label" htmlFor="writing-response">YOUR POSITION + ONE REASON <span>{response.trim() ? response.trim().split(/\s+/).length : 0} words</span></label><textarea id="writing-response" value={response} onChange={e => {setResponse(e.target.value); setShowFeedback(false)}} placeholder="I agree / partly agree / disagree because..." rows={7}/><div className="editor-footer"><span><CheckCircle2 size={14}/> Your draft stays in this demo session.</span><button className="btn btn-primary" disabled={response.trim().length < 10} onClick={() => {setShowFeedback(true); navigate('feedback')}}>Review my writing <ArrowRight size={16}/></button></div></section><aside className="practice-aside"><div className="aside-card"><span className="aside-icon"><Target size={20}/></span><h3>What you're practising</h3><ul><li>Answering the exact question</li><li>Making your position explicit</li><li>Supporting an idea with a reason</li></ul></div><div className="aside-card aside-blue"><span className="aside-icon"><BookOpen size={20}/></span><h3>Need a refresher?</h3><p>Review how to analyse an IELTS Task 2 question before you write.</p><button onClick={() => {setActiveLesson('task2'); navigate('learn')}}>Open the lesson <ArrowRight size={14}/></button></div><div className="demo-disclaimer"><Sparkles size={15}/><p>Feedback in this prototype is an illustrative demo, not an official IELTS score or live AI assessment.</p></div></aside></div></main>}

    {view === 'feedback' && <main className="inner-page"><div className="breadcrumbs"><button onClick={() => navigate('home')}>Home</button><ChevronRight size={14}/><button onClick={() => navigate('practice')}>Practice studio</button><ChevronRight size={14}/><span>Review</span></div><div className="feedback-heading"><span className="feedback-icon"><Sparkles size={23}/></span><div><span className="section-kicker">PRACTICE REVIEW · DEMO</span><h1>Let's look at your thinking.</h1><p>This is a sample reflection flow. Live AI feedback will be connected through a secure backend in a later build.</p></div></div><div className="feedback-layout"><section className="your-draft"><div className="draft-head"><h2>Your response</h2><button onClick={() => navigate('practice')}><PencilLine size={14}/> Edit response</button></div><blockquote>{response || 'You have not written a response yet. Return to the practice studio to write one.'}</blockquote><div className="word-count"><FileText size={15}/>{response.trim() ? response.trim().split(/\s+/).length : 0} words</div></section><section className="reflection-panel"><div className="reflection-title"><span><Lightbulb size={19}/></span><div><h2>Self-check before revising</h2><p>Use these questions to review your answer.</p></div></div><div className="reflection-item"><span>01</span><div><b>Did you answer the question?</b><p>Make your level of agreement clear instead of only discussing the topic.</p></div></div><div className="reflection-item"><span>02</span><div><b>Did you explain your reason?</b><p>Add a short explanation or example that shows why your reason supports your position.</p></div></div><div className="reflection-item"><span>03</span><div><b>Is your sentence easy to follow?</b><p>Choose clear wording over complicated vocabulary that does not add meaning.</p></div></div><button className="btn btn-primary full-width" onClick={() => navigate('practice')}>Revise my response <ArrowRight size={16}/></button><p className="demo-disclaimer inline-disclaimer"><Sparkles size={14}/> No band score is generated in this demo.</p></section></div></main>}
  </div>;
}

export default App;
