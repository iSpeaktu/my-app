import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight,
  Trophy, 
  CheckCircle2, 
  XCircle, 
  User, 
  Star, 
  Target, 
  Book, 
  BrainCircuit, 
  Settings, 
  Flame, 
  Award, 
  Bell, 
  Volume2, 
  Moon, 
  Info, 
  Zap, 
  Layout, 
  Compass, 
  LogOut, 
  Mail, 
  RotateCcw, 
  BarChart3, 
  Calendar, 
  AlertCircle, 
  Plane, 
  GraduationCap, 
  MessagesSquare, 
  AlertTriangle, 
  Flag, 
  Search, 
  TrendingDown, 
  X, 
  Medal,
  Check,
  ThumbsUp
} from 'lucide-react';
import { supabase, studentAuthSignIn, studentAuthSignUp, teacherAuthSignIn, teacherAuthSignUp, createTeacherInvite, assignStudentToTeacher, redeemTeacherInvite, getTeacherNameByUserId, getTeacherStudents, findStudentEmailByUsername, studentAuthResetPassword, recordLessonHistory, updateStudentProgress, getStudentProgress, getStudentLessonHistory, createNotification, getNotifications, upsertStudentProfile, upsertProfile, getProfile, deleteNotification, clearNotificationsByType } from './supabaseClient';

// --- DESIGN TOKENS ---
const COLORS = {
  primary: '#00F2FF',
  secondary: '#7000FF',
  success: '#00FF94',
  danger: '#FF2E63',
  warning: '#FFD700',
  darkBg: '#0A0A0C',
  surface: '#16161D',
  border: '#2D2D3A'
};

const iconsMap = {
  MessageCircle, Briefcase, ChevronLeft, ChevronRight, Trophy, CheckCircle2,
  XCircle, User, Star, Target, Book, BrainCircuit, Settings, Flame,
  Award, Bell, Volume2, Moon, Info, Zap, Layout, Compass, LogOut,
  Mail, RotateCcw, BarChart3, Calendar, AlertCircle, Plane,
  GraduationCap, MessagesSquare, AlertTriangle, Flag, Search, TrendingDown, X, Medal, ThumbsUp
};

// --- ICON HELPER COMPONENT ---
const Icon = ({ name, size = 20, className = "", style = {} }) => {
  const LucideIcon = typeof name === 'string' ? iconsMap[name] : name;
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} style={style} />;
};

const MATERIALS_DATA = [
  { id: 'conv', title: 'Conversational English', icon: MessagesSquare, color: COLORS.success, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'bus', title: 'Business English', icon: Briefcase, color: COLORS.primary, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'grammar', title: 'Grammar', icon: Book, color: COLORS.warning, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'travel', title: 'Travel English', icon: Plane, color: COLORS.secondary, levels: ['Beginner', 'Intermediate'] },
  { id: 'exam', title: 'Exam Prep', icon: GraduationCap, color: COLORS.danger, levels: ['Intermediate', 'Advanced'] },
  { id: 'kids', title: 'Kids Course', icon: Star, color: COLORS.secondary, levels: ['Level 1', 'Level 2', 'Level 3'] },
  { id: 'free', title: 'Free Talk', icon: MessageCircle, color: COLORS.primary, levels: ['Beginner', 'Intermediate', 'Advanced'] }
];

const SKILL_DEFINITIONS = {
  'Sidewalk': { def: "A paved path for pedestrians at the side of a road.", ex: "Keep to the sidewalk to stay safe from cars." },
  'Grocery Store': { def: "A store that sells food and household supplies.", ex: "I need to stop by the grocery store for milk." },
  'Hang out': { def: "To spend time relaxing or enjoying oneself.", ex: "We usually hang out at the mall on Fridays." },
  'Move in': { def: "To start living in a new place.", ex: "My new neighbors moved in yesterday." },
  'Crowded': { def: "Full of people, leaving little room for movement.", ex: "The bus was so crowded I couldn't find a seat." },
  'Scenery': { def: "The natural features of a landscape considered in terms of their appearance.", ex: "The mountain scenery was breathtaking." },
  'Spacious': { def: "Having ample space.", ex: "The living room is very spacious and bright." },
  'Empty': { def: "Containing nothing; not filled or occupied.", ex: "The streets were empty early in the morning." },
  'Prepositions of Place': { def: "Words used to describe where something is located (e.g., in, on, at).", ex: "The cat is ON the table." },
  'Phrasal Verbs': { def: "A verb combined with a preposition or adverb that creates a new meaning.", ex: "Please TURN ON the lights." },
  'Adjectives': { def: "Words that describe or modify nouns.", ex: "It was a BEAUTIFUL day." },
  'Comparatives': { def: "Adjectives used to compare two things, usually ending in -er or using 'more'.", ex: "This car is FASTER than that one." }
};

const LESSON_CONTENT = {
  'conv_Intermediate_1': {
    title: "Describing Your Neighbourhood",
    questions: [
      {
        question: "There is a wide ___ in front of my house.",
        options: ["road", "sidewalk", "street", "path"],
        answer: 1,
        feedback: "A “sidewalk” is the paved area for people to walk next to the street."
      },
      {
        question: "I usually buy bread and milk at the ___.",
        options: ["grocery store", "mall", "bakery", "market"],
        answer: 0,
        feedback: "A “grocery store” sells food and household items."
      },
      {
        question: "We like to ___ at the park after school.",
        options: ["hang out", "work out", "check in", "pick up"],
        answer: 0,
        feedback: "“Hang out” means to spend time with friends or relax."
      },
      {
        question: "They just ___ across the street last month.",
        options: ["moved in", "moved out", "went in", "came out"],
        answer: 0,
        feedback: "“Move in” means to start living in a new home."
      },
      {
        question: "People usually walk on the ___, not in the street.",
        options: ["sidewalk", "road", "backyard", "driveway"],
        answer: 0,
        feedback: "Sidewalks are safer than walking on the road."
      }
    ]
  },
  'conv_Intermediate_2': {
    title: "Comparing Cities and Countryside",
    questions: [
      {
        question: "The city is very ___.",
        options: ["spacious", "crowded", "quiet", "empty"],
        answer: 1,
        feedback: "“Crowded” means many people in one place."
      },
      {
        question: "I love the mountain ___ in my hometown.",
        options: ["scenery", "grocery", "building", "balcony"],
        answer: 0,
        feedback: "“Scenery” is the view of natural surroundings."
      },
      {
        question: "I ___ in a small town near the river.",
        options: ["get away", "grow up", "move in", "hang out"],
        answer: 1,
        feedback: "“Grow up” refers to spending your childhood somewhere."
      }
    ]
  }
};

const LESSON_SKILLS = {
  'conv_Intermediate_1': {
    vocab: ['Sidewalk', 'Grocery Store', 'Hang out', 'Move in'],
    grammar: ['Prepositions of Place', 'Phrasal Verbs']
  },
  'conv_Intermediate_2': {
    vocab: ['Crowded', 'Scenery', 'Spacious', 'Empty'],
    grammar: ['Adjectives', 'Comparatives']
  }
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState('login'); 
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteTeacherName, setInviteTeacherName] = useState('');
  const [studentTeacherName, setStudentTeacherName] = useState('');
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteConfirmed, setInviteConfirmed] = useState(false);
  const [studentNotifications, setStudentNotifications] = useState([]);
  
  const [onboardingData, setOnboardingData] = useState({
    material: null,
    level: null,
    lessonsPerWeek: 3
  });

  const [streakState, setStreakState] = useState({
    weeklyStreak: 0,
    weeklyActivityCount: 0,
    lastResetDate: new Date().toISOString(),
    completedHistory: [] 
  });

  const [selection, setSelection] = useState({ material: null, level: null, lessonNumber: null });
  const [quizState, setQuizState] = useState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
  const [settings, setSettings] = useState({ sound: true, notifications: true, darkMode: true });

  const rehydrateOnboardingData = (data) => {
    if (data && data.material && data.material.id) {
      const fullMaterial = MATERIALS_DATA.find(m => m.id === data.material.id);
      if (fullMaterial) return { ...data, material: fullMaterial };
    }
    return data;
  };

  const loadStudentData = async (sessionUser) => {
    const userId = sessionUser?.id;
    if (!userId) return { material: null, level: null };

    const [profile, student, history, notifications] = await Promise.all([
      getProfile(userId),
      getStudentProgress(userId),
      getStudentLessonHistory(userId),
      getNotifications(userId)
    ]);

    const normalized = (
      profile?.username ||
      profile?.full_name ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.username ||
      (sessionUser.email || '').split('@')[0] ||
      ''
    ).toLowerCase();

    setUserName(normalized);

    if (!profile) {
      try {
        await upsertProfile(userId, {
          username: normalized || null,
          full_name: sessionUser.user_metadata?.full_name || null,
          role: sessionUser.user_metadata?.role || 'student'
        });
      } catch (err) {
        console.error('Failed to create profile row:', err);
      }
    }

    if (!student) {
      try {
        await upsertStudentProfile(userId, {
          current_material_id: null,
          current_level: null,
          xp: 0,
          weekly_streak: 0
        });
      } catch (err) {
        console.error('Failed to create student row:', err);
      }
    }

    const material = MATERIALS_DATA.find(m => m.id === student?.current_material_id) || null;
    const level = student?.current_level || null;
    const nextOnboarding = {
      material,
      level,
      lessonsPerWeek: onboardingData.lessonsPerWeek || 3
    };
    setOnboardingData(nextOnboarding);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const completedHistory = (history || []).map(h => ({
      date: h.created_at || new Date().toISOString(),
      lessonId: h.lesson_id,
      material: material?.id || null,
      level: level || null,
      passed: !!h.passed,
      score: typeof h.score === 'number' ? h.score : 0,
      failures: h.failures || []
    }));

    const weeklyActivityCount = completedHistory.filter(h => h.passed && new Date(h.date) >= weekAgo).length;
    const weeklyStreak = typeof student?.weekly_streak === 'number' ? student.weekly_streak : weeklyActivityCount;

    setStreakState({
      weeklyStreak,
      weeklyActivityCount,
      lastResetDate: new Date().toISOString(),
      completedHistory
    });

    setStudentNotifications(notifications || []);

    if (student?.teacher_id) {
      const teacherName = await getTeacherNameByUserId(student.teacher_id);
      if (teacherName) setStudentTeacherName(teacherName);
    }

    return { material, level };
  };

  
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      if (!sessionUser) {
        if (active) setLoading(false);
        return;
      }

      const role = sessionUser.user_metadata?.role;
      if (role === 'teacher') {
        if (active) {
          setView('tutor_dashboard');
          setLoading(false);
        }
        return;
      }

      const { material, level } = await loadStudentData(sessionUser);
      if (!active) return;
      setView(material && level ? 'dashboard' : 'ob_screen1');
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

    const persistData = async (updates) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const userId = user?.id;

    if (!userId) {
      console.warn('No authenticated user - skipping persistence');
      return;
    }

    const profileUpdates = {};
    if (updates.userName) profileUpdates.username = updates.userName;
    if (updates.displayName) profileUpdates.full_name = updates.displayName;
    if (user?.user_metadata?.role) profileUpdates.role = user.user_metadata.role;

    const studentUpdates = {};
    if (updates.onboardingData) {
      studentUpdates.current_material_id = updates.onboardingData.material?.id || null;
      studentUpdates.current_level = updates.onboardingData.level || null;
    }
    if (updates.streakState) {
      studentUpdates.weekly_streak = updates.streakState.weeklyStreak || 0;
    }
    if (typeof updates.xp === 'number') {
      studentUpdates.xp = updates.xp;
    }

    try {
      const ops = [];
      if (Object.keys(profileUpdates).length > 0) ops.push(upsertProfile(userId, profileUpdates));
      if (Object.keys(studentUpdates).length > 0) ops.push(upsertStudentProfile(userId, studentUpdates));
      if (ops.length > 0) await Promise.all(ops);
    } catch (err) {
      console.error('Failed to persist data to Supabase:', err);
    }
  };

    const recordActivity = async (passed, scorePercent, failures = []) => {
    const updatedHistory = [
      ...streakState.completedHistory,
      {
        date: new Date().toISOString(),
        lessonId: selection.lessonNumber,
        material: selection.material?.id,
        level: selection.level,
        passed,
        score: scorePercent,
        failures
      }
    ];

    const weeklyActivityCount = passed ? streakState.weeklyActivityCount + 1 : streakState.weeklyActivityCount;
    const weeklyStreak = passed ? streakState.weeklyStreak + 1 : streakState.weeklyStreak;
    const newState = {
      ...streakState,
      weeklyActivityCount,
      weeklyStreak,
      completedHistory: updatedHistory
    };

    setStreakState(newState);

    const computedXp = updatedHistory.filter(h => h.passed).length * 10;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        await recordLessonHistory(userId, selection.lessonNumber, scorePercent, passed, failures);
        await updateStudentProgress(userId, {
          xp: computedXp,
          weekly_streak: weeklyStreak,
          current_material_id: selection.material?.id || null,
          current_level: selection.level || null
        });

        if (passed) {
          await clearNotificationsByType(userId, 'remind', selection.lessonNumber);
          await clearNotificationsByType(userId, 'praise');
          const refreshed = await getNotifications(userId);
          setStudentNotifications(refreshed || []);
        }
      }
    } catch (err) {
      console.error('Failed to record lesson activity:', err);
    }

    persistData({
      streakState: newState,
      onboardingData: { material: selection.material, level: selection.level, lessonsPerWeek: onboardingData.lessonsPerWeek },
      xp: computedXp
    });
  };

  // --- UI COMPONENTS ---
  const Card = ({ children, onClick, className = "" }) => (
    <button onClick={onClick} className={`w-full bg-[#16161D] border border-[#2D2D3A] rounded-2xl p-5 text-left transition-all hover:border-[#00F2FF40] hover:bg-[#1C1C26] active:scale-[0.98] ${className}`}>
      {children}
    </button>
  );

  const Header = ({ title, subtitle, showBack, onBack, showStreak = false }) => {
    const totalXP = streakState.completedHistory.filter(h => h.passed).length * 10; // XP Rule: +10 per lesson
    return (
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={onBack} className="p-2 hover:bg-[#2D2D3A] rounded-full text-white transition-colors">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="text-white opacity-60 text-sm font-medium">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7000FF15] rounded-full border border-[#7000FF30]">
             <Star size={14} className="text-[#7000FF]" fill="currentColor" />
             <span className="text-[#7000FF] font-bold text-xs">{totalXP} XP</span>
          </div>
          {showStreak && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD70015] rounded-full border border-[#FFD70030]">
                 <Flame size={14} className="text-[#FFD700]" fill="currentColor" />
                 <span className="text-[#FFD700] font-bold text-xs">{streakState.weeklyStreak}</span>
              </div>
          )}
          <button onClick={() => { setView('login'); }} className="w-10 h-10 rounded-full bg-[#16161D] border border-[#2D2D3A] flex items-center justify-center text-white/40 hover:text-[#FF2E63]">
             <Icon name="LogOut" size={18} />
          </button>
        </div>
      </div>
    );
  };

  // --- VIEWS ---
  const Dashboard = () => {
    const reminder = studentNotifications.find(n => n.type === 'remind') || null;
    const praise = studentNotifications.find(n => n.type === 'praise') || null;
    
    const weeklyTarget = onboardingData.lessonsPerWeek || 3;
    const progressPerc = Math.min(100, (streakState.weeklyActivityCount / weeklyTarget) * 100);

    const dismissPraise = async (e) => {
        e.stopPropagation();
        if (!praise) return;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          if (userId) {
            await deleteNotification(userId, praise.id);
            const refreshed = await getNotifications(userId);
            setStudentNotifications(refreshed || []);
          }
        } catch (err) {
          console.error('Failed to dismiss praise:', err);
        }
    };

    return (
      <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
        <Header title={`Hello, ${userName}`} subtitle="Your learning dashboard" showStreak />
        
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
             <span>Weekly Goal</span>
             <span className="text-white">{streakState.weeklyActivityCount} / {weeklyTarget} sessions</span>
          </div>
          <div className="h-3 w-full bg-[#16161D] rounded-full overflow-hidden border border-[#2D2D3A]">
             <div className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-1000" style={{ width: `${progressPerc}%` }} />
          </div>
        </div>

        {/* --- TUTOR PRAISE (THUMBS UP) --- */}
        {praise && (
            <div className="mb-8 p-5 bg-[#00FF9415] border border-[#00FF9440] rounded-2xl flex items-center gap-4 border-l-4 relative group animate-in zoom-in-95">
                <div className="w-12 h-12 bg-[#00FF9420] rounded-xl flex items-center justify-center shrink-0">
                   <ThumbsUp size={24} className="text-[#00FF94]" />
                </div>
                <div className="flex-1">
                    <h3 className="text-[#00FF94] font-black text-sm mb-1 uppercase tracking-wider">Teacher Shout-out!</h3>
                    <p className="text-white/80 text-sm leading-snug">
                       Your teacher sent you a <strong>Thumbs Up</strong> for your great work! Keep it up!
                    </p>
                </div>
                <button onClick={dismissPraise} className="p-2 text-white/20 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>
        )}

        {reminder && (
            <div onClick={() => {
                const mat = onboardingData.material;
                const lvl = onboardingData.level;
                setSelection({ material: mat, level: lvl, lessonNumber: reminder.lesson_id });
                setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] });
                setView('quiz');
            }} className="mb-8 p-5 bg-[#FF2E6315] border border-[#FF2E6340] rounded-2xl flex items-start gap-4 cursor-pointer hover:bg-[#FF2E6325] transition-all border-l-4 shadow-[0_0_20px_rgba(255,46,99,0.1)] group">
                <div className="w-12 h-12 bg-[#FF2E6320] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <Bell size={24} className="text-[#FF2E63] animate-swing" />
                </div>
                <div>
                    <h3 className="text-[#FF2E63] font-black text-sm mb-1 uppercase tracking-wider">Teacher Notification</h3>
                    <p className="text-white/80 text-sm leading-snug">
                       Your teacher has requested that you retake <strong>Lesson {reminder.lesson_id}</strong>. Practice makes perfect!
                    </p>
                    <div className="mt-2 text-[10px] font-bold text-[#FF2E63] uppercase tracking-widest flex items-center gap-1">
                        Tap to start retake <ChevronRight size={12} />
                    </div>
                </div>
            </div>
        )}

        <div className="mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-4">My Current Track</h4>
            <Card className="border-[#00F2FF40] bg-[#00F2FF05]" onClick={() => { setSelection({ material: onboardingData.material, level: onboardingData.level }); setView('select_lesson'); }}>
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00F2FF20] border border-[#00F2FF40]">
                        <Icon name={onboardingData.material?.icon} style={{ color: onboardingData.material?.color }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-white">{onboardingData.material?.title || "Language Track"}</h3>
                        <p className="text-[#00F2FF] text-xs font-bold uppercase">{onboardingData.level}</p>
                    </div>
                    <div className="px-4 py-2 bg-[#00F2FF] text-[#0A0A0C] rounded-lg font-bold text-xs uppercase">{streakState.completedHistory.length === 0 ? 'Start' : 'Continue'}</div>
                </div>
            </Card>
        </div>

        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Explore Materials</h4>
        <div className="grid grid-cols-1 gap-4">
          {MATERIALS_DATA.filter(m => m.id !== onboardingData.material?.id).map((mat) => (
            <Card key={mat.id} onClick={() => { setSelection({ material: mat }); setView('select_level'); }}>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-[#1C1C26] border border-[#2D2D3A] flex items-center justify-center">
                  <Icon name={mat.icon} style={{ color: mat.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white">{mat.title}</h3>
                  <p className="text-white opacity-50 text-sm">{mat.levels.length} Levels</p>
                </div>
                <ChevronRight className="text-white opacity-40" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const QuizView = () => {
    const key = `${selection.material?.id}_${selection.level}_${selection.lessonNumber}`;
    const content = LESSON_CONTENT[key] || LESSON_CONTENT['conv_Intermediate_1'];
    const currentQ = content.questions[quizState.currentQuestionIndex];
    const progress = (quizState.currentQuestionIndex / content.questions.length) * 100;

    const handleAnswer = (idx) => {
        if (quizState.isAnswered) return;
        setQuizState({ 
            ...quizState, 
            selectedOption: idx, 
            isAnswered: true,
            score: idx === currentQ.answer ? quizState.score + 1 : quizState.score,
            history: [...quizState.history, { 
                question: currentQ.question, 
                selected: idx, 
                correct: currentQ.answer, 
                options: currentQ.options, 
                feedback: currentQ.feedback 
            }]
        });
    };

    const nextStep = () => {
        if (quizState.currentQuestionIndex < content.questions.length - 1) {
            setQuizState({ ...quizState, currentQuestionIndex: quizState.currentQuestionIndex + 1, isAnswered: false, selectedOption: null });
        } else {
            const perc = Math.round((quizState.score / content.questions.length) * 100);
            const fails = quizState.history.filter(h => h.selected !== h.correct).map(h => ({ 
                question: h.question, 
                answer: h.options[h.selected], 
                correct: h.options[h.correct] 
            }));
            recordActivity(perc >= 70, perc, fails);
            setView('results');
        }
    };

    return (
      <div className="max-w-2xl mx-auto py-8 px-6 flex flex-col min-h-screen animate-in fade-in">
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => setView('dashboard')} className="text-white opacity-40"><XCircle size={28} /></button>
          <div className="flex-1 h-2 bg-[#16161D] rounded-full overflow-hidden border border-[#2D2D3A]">
            <div className="h-full bg-[#00F2FF] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[10px] font-bold text-white/40">{quizState.currentQuestionIndex + 1} / {content.questions.length}</div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-10 leading-relaxed">{currentQ.question}</h2>
          <div className="space-y-4">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i} disabled={quizState.isAnswered} onClick={() => handleAnswer(i)} 
                className={`w-full p-6 rounded-2xl border text-left transition-all ${quizState.isAnswered ? (i === currentQ.answer ? 'border-[#00FF94] bg-[#00FF9408]' : (i === quizState.selectedOption ? 'border-[#FF2E63] bg-[#FF2E6308]' : 'border-[#2D2D3A] opacity-40')) : 'border-[#2D2D3A] bg-[#16161D] hover:bg-[#1C1C26]'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold ${quizState.isAnswered && i === currentQ.answer ? 'bg-[#00FF94] text-[#0A0A0C]' : 'opacity-40'}`}>{String.fromCharCode(65+i)}</div>
                  <span className="font-medium text-lg">{opt}</span>
                  {quizState.isAnswered && i === currentQ.answer && <CheckCircle2 size={20} className="ml-auto text-[#00FF94]" />}
                </div>
              </button>
            ))}
          </div>
          {quizState.isAnswered && (
            <div className="mt-8 p-6 rounded-2xl border bg-white/5 border-white/10 animate-fade-in text-sm text-white/80">
                <p><strong className="text-[#00F2FF]">{quizState.selectedOption === currentQ.answer ? 'Correct!' : 'Review:'}</strong> {currentQ.feedback}</p>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 left-0 w-full p-8 border-t border-[#2D2D3A] bg-[#0A0A0C]/80 backdrop-blur-md flex justify-end">
            <button 
              disabled={!quizState.isAnswered} 
              onClick={nextStep} 
              className={`px-10 py-4 rounded-xl font-bold bg-[#00F2FF] text-[#0A0A0C] transition-all shadow-lg ${!quizState.isAnswered && 'opacity-20 cursor-not-allowed'}`}
            >
              {quizState.currentQuestionIndex === content.questions.length - 1 ? 'Finish Results' : 'Next Question'}
            </button>
        </div>
      </div>
    );
  };

  const ResultsView = () => {
    const percentage = Math.round((quizState.score / quizState.history.length) * 100);
    const passed = percentage >= 70;
    const missed = quizState.history.filter(h => h.selected !== h.correct);

    return (
      <div className="max-w-xl mx-auto py-12 px-6 animate-in zoom-in-95">
        <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center p-8 rounded-[2.5rem] mb-6 ${passed ? 'bg-[#00FF9410] border border-[#00FF9440]' : 'bg-[#FF2E6310] border border-[#FF2E6340]'}`}>
                {passed ? <Trophy className="text-[#FFD700]" size={64} /> : <AlertTriangle className="text-[#FF2E63]" size={64} />}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">{passed ? 'Excellent!' : 'Keep Practicing'}</h2>
            <div className={`text-5xl font-black mb-2 ${passed ? 'text-[#00FF94]' : 'text-[#FF2E63]'}`}>{percentage}%</div>
            <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">Accuracy Score</p>
        </div>

        {missed.length > 0 && (
          <div className="space-y-6 mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Mistake Breakdown</h4>
            {missed.map((m, i) => (
              <div key={i} className="bg-[#16161D] border border-[#2D2D3A] p-6 rounded-2xl animate-in slide-in-from-bottom-4 transition-all">
                 <p className="text-white font-bold mb-4 text-sm leading-relaxed">"{m.question}"</p>
                 <div className="space-y-2 mb-4">
                   <div className="flex items-center gap-2 text-xs font-bold">
                     <span className="text-[#FF2E63] uppercase tracking-tighter w-20 shrink-0">Your Choice:</span>
                     <span className="text-white/80">{m.options[m.selected]}</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold">
                     <span className="text-[#00FF94] uppercase tracking-tighter w-20 shrink-0">Correct:</span>
                     <span className="text-white">{m.options[m.correct]}</span>
                   </div>
                 </div>
                 <div className="pt-4 border-t border-[#2D2D3A] text-xs leading-relaxed">
                    <span className="text-[#00F2FF] font-black uppercase tracking-widest block mb-1">Feedback:</span>
                    <p className="text-white/60 italic">{m.feedback}</p>
                 </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setView('dashboard')} className="w-full btn-primary bg-[#00F2FF] text-[#0A0A0C] py-5 rounded-2xl font-bold text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all">
            Return to Learning
        </button>
      </div>
    );
  };

  const ProgressView = () => {
    const [showMastered, setShowMastered] = useState(true);
    const [activeTerm, setActiveTerm] = useState(null);

    useEffect(() => {
      let active = true;
      (async () => {
        if (studentTeacherName) return;
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;
          const { data: studentRow } = await supabase
            .from('students')
            .select('teacher_id')
            .eq('id', userId)
            .maybeSingle();
          const teacherUserId = studentRow?.teacher_id;
        if (!teacherUserId) return;
        const name = await getTeacherNameByUserId(teacherUserId);
        if (name && active) setStudentTeacherName(name);
      })();
      return () => { active = false; };
    }, []);
    const masteredVocab = new Set();
    const masteredGrammar = new Set();
    const upcomingVocab = new Set();
    const upcomingGrammar = new Set();

    streakState.completedHistory.forEach(h => {
        if (h.passed) {
             const key = `${h.material}_${h.level}_${h.lessonId}`;
             if (LESSON_SKILLS[key]) {
                 LESSON_SKILLS[key].vocab.forEach(v => masteredVocab.add(v));
                 LESSON_SKILLS[key].grammar.forEach(g => masteredGrammar.add(g));
             }
        }
    });

    Object.keys(LESSON_SKILLS).forEach(k => {
        const parts = k.split('_');
        const isPassed = streakState.completedHistory.some(h => h.material === parts[0] && h.level === parts[1] && h.lessonId == parts[2] && h.passed);
        if (!isPassed) {
             LESSON_SKILLS[k].vocab.forEach(v => upcomingVocab.add(v));
             LESSON_SKILLS[k].grammar.forEach(g => upcomingGrammar.add(g));
        }
    });

    // --- LOGIC: FAILED ITEMS TREND ---
    const failedItemCounts = {};
    streakState.completedHistory.forEach(h => {
        if (!h.passed) {
            const key = `${h.material}_${h.level}_${h.lessonId}`;
            const skills = LESSON_SKILLS[key];
            if (skills) {
                [...skills.vocab, ...skills.grammar].forEach(skill => {
                    failedItemCounts[skill] = (failedItemCounts[skill] || 0) + 1;
                });
            }
        }
    });
    const consistentFailures = Object.entries(failedItemCounts)
        .filter(([_, count]) => count >= 2)
        .map(([name]) => name);

    // --- QUIZ STATS LOGIC ---
    const totalTaken = streakState.completedHistory.length;
    const sessionMap = {};
    streakState.completedHistory.forEach(h => {
        const key = `${h.material}_${h.level}_${h.lessonId}`;
        sessionMap[key] = (sessionMap[key] || 0) + 1;
    });
    const totalRetaken = Object.values(sessionMap).reduce((acc, count) => acc + (count > 1 ? count - 1 : 0), 0);

    const passedLessons = streakState.completedHistory.filter(h => h.passed);
    const uniquePassedCount = [...new Set(passedLessons.map(h => `${h.material}_${h.level}_${h.lessonId}`))].length;
    
    // Consecutive 100% logic
    let consecutivePerfects = 0;
    let maxPerfectStreak = 0;
    streakState.completedHistory.forEach(h => {
        if (h.score === 100) {
            consecutivePerfects++;
            if (consecutivePerfects > maxPerfectStreak) maxPerfectStreak = consecutivePerfects;
        } else {
            consecutivePerfects = 0;
        }
    });

    // Badge Logic as requested
    const badgeData = [
      { id: 1, name: "Starter Star", desc: "Complete 1 lesson", icon: Star, achieved: uniquePassedCount >= 1 },
      { id: 2, name: "Pioneer Milestone", desc: "Complete 5 lessons", icon: Compass, achieved: uniquePassedCount >= 5 },
      { id: 3, name: "Weekly Warrior", desc: "Achieve weekly goal", icon: Zap, achieved: streakState.weeklyActivityCount >= onboardingData.lessonsPerWeek },
      { id: 4, name: "Perfectionist", desc: "10 consecutive 100% scores", icon: Target, achieved: maxPerfectStreak >= 10 },
      { id: 5, name: "Language Veteran", desc: "Complete 20 lessons", icon: Medal, achieved: uniquePassedCount >= 20 },
      { id: 6, name: "Language Master", desc: "Complete 40 lessons", icon: Award, achieved: uniquePassedCount >= 40 },
      { id: 7, name: "Language Legend", desc: "Complete 60 lessons", icon: Trophy, achieved: uniquePassedCount >= 60 },
      { id: 8, name: "Ultimate Sage", desc: "Complete 100 lessons", icon: BrainCircuit, achieved: uniquePassedCount >= 100 },
    ];

    return (
      <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
        <Header title="View Progress" subtitle="Tracking your mastery" />

        {studentTeacherName && (
          <div className="mb-6 p-4 bg-[#00F2FF10] border border-[#00F2FF40] rounded-2xl text-white">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-1">Your Teacher</div>
            <div className="text-sm font-bold">{studentTeacherName}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl">
              <div className="text-[10px] font-black uppercase text-[#00F2FF] mb-1 tracking-widest">Lessons Passed</div>
              <div className="text-3xl font-black text-white">{uniquePassedCount}</div>
           </div>
           <div className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl">
              <div className="text-[10px] font-black uppercase text-[#7000FF] mb-1 tracking-widest">Perfect Streak</div>
              <div className="text-3xl font-black text-white">{maxPerfectStreak}</div>
           </div>
        </div>

        {uniquePassedCount >= 5 && consistentFailures.length > 0 && (
            <div className="mb-8 p-6 bg-[#FF2E6310] border border-[#FF2E6340] rounded-3xl animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FF2E63] text-white flex items-center justify-center">
                        <Icon name="TrendingDown" size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-[#FF2E63]">Critical Review</h3>
                        <p className="text-[10px] text-white/40">Vocabulary & Grammar failed consistently</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {consistentFailures.map(item => (
                        <button key={item} onClick={() => setActiveTerm({ term: item, type: 'Needs Practice' })} className="px-3 py-1.5 bg-[#FF2E6320] border border-[#FF2E6340] rounded-lg text-white text-[10px] font-bold uppercase hover:bg-[#FF2E6340] transition-colors">
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm uppercase flex items-center gap-2"><BarChart3 size={14} className="text-[#00F2FF]" /> Progress Trend</h3>
            <div className="flex bg-[#2D2D3A] rounded-lg p-1">
                <button onClick={() => setShowMastered(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${showMastered ? 'bg-[#00F2FF] text-[#0A0A0C]' : 'text-white/40'}`}>Mastered</button>
                <button onClick={() => setShowMastered(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!showMastered ? 'bg-[#FF2E63] text-white' : 'text-white/40'}`}>To Master</button>
            </div>
        </div>

        <div className="bg-[#16161D] border border-[#2D2D3A] p-6 rounded-3xl mb-8 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${showMastered ? 'bg-[#00FF94]' : 'bg-[#FF2E63]'}`}></div>
            <div className="mb-8">
                <h4 className="font-bold text-[10px] uppercase text-[#00F2FF] mb-4 flex items-center gap-2"><BrainCircuit size={12} /> Vocabulary</h4>
                <div className="flex flex-wrap gap-2">
                    {Array.from(showMastered ? masteredVocab : upcomingVocab).map(v => (
                        <button key={v} onClick={() => setActiveTerm({ term: v, type: 'Vocabulary' })} className="px-3 py-1.5 bg-[#00F2FF10] border border-[#00F2FF30] rounded-lg text-[#00F2FF] text-[10px] font-bold uppercase hover:bg-[#00F2FF20] transition-colors">{v}</button>
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-bold text-[10px] uppercase text-[#FFD700] mb-4 flex items-center gap-2"><Book size={12} /> Grammar</h4>
                <div className="flex flex-wrap gap-2">
                    {Array.from(showMastered ? masteredGrammar : upcomingGrammar).map(g => (
                        <button key={g} onClick={() => setActiveTerm({ term: g, type: 'Grammar' })} className="px-3 py-1.5 bg-[#FFD70010] border border-[#FFD70030] rounded-lg text-[#FFD700] text-[10px] font-bold uppercase hover:bg-[#FFD70020] transition-colors">{g}</button>
                    ))}
                </div>
            </div>
        </div>

        <div className="mb-8">
            <h3 className="font-bold text-sm uppercase flex items-center gap-2 mb-4 text-white/40"><Medal size={14} className="text-[#FFD700]" /> Achievements & Badges</h3>
            <div className="grid grid-cols-2 gap-4">
                {badgeData.map(badge => (
                  <div key={badge.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${badge.achieved ? 'bg-[#FFD70010] border-[#FFD70040]' : 'bg-[#16161D] border-[#2D2D3A] opacity-20'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${badge.achieved ? 'bg-[#FFD700] text-[#0A0A0C]' : 'bg-white/10 text-white'}`}>
                          <Icon name={badge.icon} size={24} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{badge.name}</p>
                      <p className="text-[9px] text-white/50 leading-tight">{badge.desc}</p>
                  </div>
                ))}
            </div>
        </div>

        {activeTerm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#16161D] border border-[#2D2D3A] p-8 rounded-3xl max-sm-w-full relative shadow-2xl">
                    <button onClick={() => setActiveTerm(null)} className="absolute top-6 right-6 text-white/40 hover:text-white"><X size={20} /></button>
                    <div className="mb-3"><span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/10 text-white/60 tracking-widest">{activeTerm.type}</span></div>
                    <h3 className="text-2xl font-bold text-white mb-3">{activeTerm.term}</h3>
                    <p className="text-white/80 text-sm leading-relaxed mb-6">{SKILL_DEFINITIONS[activeTerm.term]?.def || 'Detailed definition coming soon.'}</p>
                </div>
            </div>
        )}
      </div>
    );
  };

  const LessonSelectionView = () => {
    const history = streakState.completedHistory.filter(h => h.material === selection.material?.id && h.level === selection.level);
    const maxCompleted = history.filter(h => h.passed).reduce((max, h) => Math.max(max, h.lessonId), 0);

    return (
      <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
        <Header title="Learning Path" subtitle={`${selection.material?.title} • ${selection.level}`} showBack onBack={() => setView('dashboard')} />
        <div className="relative flex flex-col items-center pb-40 space-y-24">
          <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#00F2FF] via-[#00F2FF30] to-transparent left-1/2 -translate-x-1/2 -z-10" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => {
            const h = history.filter(a => a.lessonId === num).slice(-1)[0];
            const isPassed = h && h.passed;
            const isFailed = h && !h.passed;
            const isCurrent = num === maxCompleted + 1;
            const isFuture = num > maxCompleted + 1;

            return (
              <div key={num} className={`relative flex items-center w-full ${i % 2 !== 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-1/2 flex flex-col items-center relative">
                  <div className={`absolute -top-12 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-lg ${isFailed ? 'bg-[#FF2E63] text-white border-[#FF2E63]' : (isPassed ? 'bg-[#1C1C26] text-[#00FF94] border-[#00FF9430]' : (isCurrent ? 'bg-[#00F2FF] text-[#0A0A0C] border-[#00F2FF]' : 'bg-[#1C1C26] text-white/20 border-[#2D2D3A]'))}`}>Lesson {num}</div>
                  <button onClick={() => { 
                    if (!isFuture || isCurrent) {
                        setSelection({ ...selection, lessonNumber: num }); 
                        setQuizState({ currentQuestionIndex: 0, isAnswered: false, selectedOption: null, score: 0, history: [] }); 
                        setView('quiz'); 
                    }
                  }}
                    className={`w-20 h-20 rounded-2xl border-2 relative flex items-center justify-center transition-all shadow-[0_8px_20px_rgba(0,0,0,0.5)] focus:border-[#00F2FF] focus:outline-none ${isFailed ? 'border-[#FF2E63] text-[#FF2E63]' : (isPassed ? 'border-[#00FF9440] text-[#00FF94]' : (isCurrent ? 'border-[#00F2FF] text-[#0A0A0C] scale-110 shadow-[0_0_30px_rgba(0,242,255,0.3),0_8px_20px_rgba(0,0,0,0.5)]' : 'border-gray-200 text-gray-400'))} ${isCurrent ? 'bg-[#00F2FF]' : 'bg-gray-100'} ${isFuture && !isCurrent ? 'opacity-30' : 'opacity-100'}`}
                  >
                    {isPassed ? <Icon name="CheckCircle2" size={32} /> : (isFailed ? <Icon name="Flag" size={32} /> : <span className="font-bold text-2xl">{num}</span>)}
                  </button>
                </div>
                <div className="w-1/2" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const SelectionPath = () => (
    <div className="max-w-md mx-auto py-8 px-6 min-h-screen">
      <Header title="Choose Level" subtitle={selection.material?.title} showBack onBack={() => setView('dashboard')} />
      <div className="space-y-4">
        {selection.material?.levels.map(l => (
          <Card key={l} onClick={() => { setSelection({ ...selection, level: l }); setView('select_lesson'); }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{l}</span>
              <Icon name="ChevronRight" size={20} className="opacity-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 w-full bg-[#0A0A0C]/90 backdrop-blur-xl border-t border-[#2D2D3A] flex justify-around py-5 z-20">
      {[
        { id: 'dashboard', icon: 'Book', label: 'Learning' },
        { id: 'progress', icon: 'BarChart3', label: 'Progress' },
        { id: 'settings', icon: 'Settings', label: 'Settings' },
      ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} className={`flex flex-col items-center gap-1.5 transition-all ${view === tab.id ? 'text-[#00F2FF]' : 'text-white opacity-30 hover:opacity-100'}`}>
            <Icon name={tab.icon} size={22} />
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
      ))}
    </div>
  );

    const login = async (name) => {
    if (!email || !password) {
      setLoginError('Please enter email and password');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const user = await studentAuthSignIn(email.toLowerCase(), password);
      const { material, level } = await loadStudentData(user);
      setView(material && level ? 'dashboard' : 'ob_screen1');
    } catch (error) {
      setLoginError(error.message || 'Email login failed');
      console.error('Email login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  const isValidEmail = (em) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  };

  const getInviteToken = () => {
    try {
      return new URLSearchParams(window.location.search).get('invite');
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const urlToken = getInviteToken();
    if (!urlToken) return;
    setInviteToken(urlToken);
    setInviteConfirmed(false);
    let active = true;
    (async () => {
      const teacherUserId = await redeemTeacherInvite(urlToken);
      if (!teacherUserId || !active) return;
      const name = await getTeacherNameByUserId(teacherUserId);
      if (name && active) setInviteTeacherName(name);
    })();
    return () => { active = false; };
  }, []);

  const getStoredInviteToken = () => inviteToken || null;
  const clearStoredInviteToken = () => setInviteToken(null);
  const getInviteConfirmed = () => inviteConfirmed;
  const setInviteConfirmedValue = (val) => {
    setInviteConfirmed(!!val);
  };

  const clearInviteToken = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, document.title, url.toString());
    } catch {
      // no-op
    }
  };

  const confirmInvite = () => {
    const token = getStoredInviteToken();
    if (!token) return;
    setInviteConfirmedValue(true);
  };

  const cancelInvite = () => {
    clearInviteToken();
    clearStoredInviteToken();
    setInviteConfirmedValue(false);
    setInviteTeacherName('');
  };

  if (loading) return null;

  const handleTeacherLogin = async () => {
    if (!email) { setLoginError('Enter email'); return; }
    if (!password) { setLoginError('Enter password'); return; }
    if (!isValidEmail(email)) { setLoginError('Enter a valid email address'); return; }
    
    try {
      setLoginLoading(true);
      setLoginError('');
      await teacherAuthSignIn(email.toLowerCase(), password);
      setView('tutor_dashboard');
    } catch (error) {
      setLoginError(error.message || 'Email login failed');
      console.error('Teacher login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-32 selection:bg-[#00F2FF] selection:text-[#0A0A0C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Open+Sans:wght@400;600;800&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        @keyframes swing {
            0% { transform: rotate(0deg); }
            20% { transform: rotate(15deg); }
            40% { transform: rotate(-10deg); }
            60% { transform: rotate(5deg); }
            80% { transform: rotate(-5deg); }
            100% { transform: rotate(0deg); }
        }
        .animate-swing { animation: swing 2s ease infinite; }
      `}</style>
      {/* Invite confirmation modal - shown when an invite exists but is not yet confirmed */}
      {inviteTeacherName && !inviteConfirmed && getStoredInviteToken() && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6">
          <div className="max-w-lg w-full bg-[#16161D] border border-[#2D2D3A] rounded-2xl p-6 text-center">
            <h3 className="text-xl font-extrabold mb-2">Confirm Teacher Invitation</h3>
            <p className="text-white/70 mb-4">You were invited to join <strong className="text-[#00F2FF]">{inviteTeacherName}</strong>.</p>
            <button onClick={confirmInvite} aria-label="Confirm teacher invitation" className="w-full px-6 py-3 rounded-xl bg-[#00F2FF] text-[#0A0A0C] font-bold text-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#16161D] transition-all">Confirm</button>
            <button onClick={cancelInvite} aria-label="Cancel teacher invitation" className="w-full text-red-500 font-bold bg-transparent py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#16161D] rounded transition-all">Cancel</button>
            <p className="text-xs text-white/50 mt-3">If this is not your teacher, do not accept. Only accept invitations from your teacher.</p>
          </div>
        </div>
      )}
      
            {view === 'login' && (
        <div className="max-w-md mx-auto min-h-[90vh] flex flex-col items-center justify-center px-8 animate-in fade-in duration-700">
          <div className="mb-12 text-center">
            <h1 className="text-6xl font-extrabold tracking-tighter text-white mb-2" style={{ fontFamily: "'Open Sans', sans-serif" }}>iSpeaktu</h1>
            <p className="text-[#00F2FF] font-semibold text-sm tracking-wide opacity-90">turn mistakes into progress</p>
          </div>
          
          <div className="w-full max-w-xs space-y-4">
            {loginError && (
              <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                {loginError}
              </div>
            )}
            {loginNotice && (
              <div className="bg-[#00F2FF]/10 border border-[#00F2FF] text-[#00F2FF] px-4 py-3 rounded-lg text-sm font-semibold">
                {loginNotice}
              </div>
            )}
            {inviteTeacherName && (
              <div className="bg-[#00F2FF10] border border-[#00F2FF40] text-white px-4 py-3 rounded-lg text-sm font-semibold">
                Joining teacher <span className="text-[#00F2FF]">{inviteTeacherName}</span>
              </div>
            )}

            {/* Full name removed from login form: signup will prompt for name separately */}

            <div className="relative group">
               <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FF] transition-colors" size={18} />
               <input 
                 type="text" placeholder="Email or username" value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 disabled={loginLoading}
                 className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
               />
            </div>

            <div className="relative group">
               <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
               <input 
                 type="password" placeholder="Password" value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 disabled={loginLoading}
                 className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
               />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  if (!email) { setLoginError('Enter email or username'); return; }
                  if (!password) { setLoginError('Enter password'); return; }

                  try {
                    setLoginLoading(true);
                    setLoginError('');

                    let loginEmail = null;
                    if (email.includes('@')) {
                      if (!isValidEmail(email)) { setLoginError('Enter a valid email address'); setLoginLoading(false); return; }
                      loginEmail = email.toLowerCase();
                    } else {
                      // treat input as username, resolve to email
                      const resolved = await findStudentEmailByUsername(email);
                      if (!resolved) { setLoginError('No account found for that username'); setLoginLoading(false); return; }
                      loginEmail = resolved.toLowerCase();
                    }

                    const user = await studentAuthSignIn(loginEmail, password);
                    if (user?.user_metadata?.role === 'teacher') {
                      await supabase.auth.signOut();
                      setLoginError('Teacher accounts must sign in under "I am a Tutor"');
                      setLoginLoading(false);
                      return;
                    }
                    const inviteToken = getInviteToken() || getStoredInviteToken();
                    if (inviteToken && getInviteConfirmed()) {
                      try {
                        const teacherUserId = await redeemTeacherInvite(inviteToken);
                        if (teacherUserId) {
                          await assignStudentToTeacher(user.id, teacherUserId);
                          clearInviteToken();
                          clearStoredInviteToken();
                          setInviteConfirmedValue(false);
                        }
                      } catch (e) {
                        console.error('Invite assign failed:', e);
                      }
                    }
                    const { material, level } = await loadStudentData(user);
                    setView(material && level ? 'dashboard' : 'ob_screen1');
                  } catch (err) {
                    setLoginError(err.message || 'Email login failed');
                  } finally { setLoginLoading(false); }
                }}
                disabled={loginLoading}
                aria-label="Sign in to your student account"
                className="flex-1 bg-[#00F2FF] text-[#0A0A0C] py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </button>

              <button 
                onClick={() => { setLoginError(''); setView('signup'); }}
                disabled={loginLoading}
                aria-label="Create a new student account"
                className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
              >
                Sign up
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button onClick={() => { setView('tutor_login'); setLoginError(''); }} disabled={loginLoading} aria-label="Switch to tutor login mode" className="w-1/2 pt-2 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 rounded px-2 py-1">
                 <Icon name="Settings" size={12} />
                 I am a Tutor
              </button>
              <button onClick={() => { setView('reset'); setLoginError(''); }} aria-label="Reset forgotten password" className="w-1/2 pt-2 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-colors disabled:opacity-50 rounded px-2 py-1">
                  Forgot password?
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'tutor_login' && (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
            <div className="mb-12 text-center">
               <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Tutor Portal</h2>
               <p className="text-[#00F2FF] text-[10px] font-black uppercase tracking-widest opacity-60">Email Access</p>
            </div>
            <div className="w-full max-w-xs space-y-4">
                {loginError && (
                  <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginError}
                  </div>
                )}
                {loginNotice && (
                  <div className="bg-[#00F2FF]/10 border border-[#00F2FF] text-[#00F2FF] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginNotice}
                  </div>
                )}
                {inviteTeacherName && (
                  <div className="bg-[#00F2FF10] border border-[#00F2FF40] text-white px-4 py-3 rounded-lg text-sm font-semibold">
                    Joining teacher <span className="text-[#00F2FF]">{inviteTeacherName}</span>
                  </div>
                )}
                <div className="relative group">
                   <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="email" placeholder="Email" value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>
                <div className="relative group">
                   <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="password" placeholder="Password" value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleTeacherLogin}
                    disabled={loginLoading}
                    aria-label="Sign in to tutor dashboard"
                    className="flex-1 bg-[#00F2FF] text-[#0A0A0C] py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] disabled:opacity-50"
                  >
                    {loginLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                  <button 
                    onClick={() => { setLoginError(''); setView('tutor_signup'); }}
                    disabled={loginLoading}
                    aria-label="Create a new tutor account"
                    className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
                  >
                    Sign up
                  </button>
                </div>
                <button onClick={() => { setView('login'); setLoginError(''); setLoginNotice(''); }} disabled={loginLoading} aria-label="Back to student login" className="w-full pt-6 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] rounded px-2 py-1 transition-colors disabled:opacity-50">Back to Student Login</button>
            </div>
        </div>
      )}

      {view === 'tutor_signup' && (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
            <div className="mb-8 text-center">
               <h2 className="text-3xl font-black text-white mb-2">Create Tutor Account</h2>
               <p className="text-white/50 text-sm">Sign up with your name, email and password</p>
            </div>
            <div className="w-full max-w-xs space-y-4">
                {loginError && (
                  <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginError}
                  </div>
                )}
                {loginNotice && (
                  <div className="bg-[#00F2FF]/10 border border-[#00F2FF] text-[#00F2FF] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginNotice}
                  </div>
                )}

                <div className="relative group">
                   <Icon name="User" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={20} />
                   <input 
                     autoFocus type="text" placeholder="Full name" value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="relative group">
                   <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="email" placeholder="Email" value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="relative group">
                   <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="password" placeholder="Password" value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (!fullName) { setLoginError('Enter your full name'); setLoginNotice(''); return; }
                      if (!email || !password) { setLoginError('Enter email and password'); setLoginNotice(''); return; }
                      if (!isValidEmail(email)) { setLoginError('Enter a valid email address'); setLoginNotice(''); return; }
                      if (password.length < 6) { setLoginError('Password must be at least 6 characters'); setLoginNotice(''); return; }
                      try {
                        setLoginLoading(true);
                        setLoginError('');
                        setLoginNotice('');
                        await teacherAuthSignUp(email.toLowerCase(), password, fullName);
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (!sessionData?.session) {
                          setLoginNotice('Check your email to confirm your account before signing in.');
                          setLoginLoading(false);
                          return;
                        }
                        const userId = sessionData.session.user?.id;
                        if (userId) {
                          await upsertProfile(userId, { full_name: fullName, role: 'teacher' });
                        }
                        setView('tutor_dashboard');
                      } catch (err) {
                        const msg = (err?.message || '').toLowerCase();
                        if (msg.includes('rate limit') || msg.includes('rate-limit')) {
                          setLoginError('Too many sign-up attempts. Please wait a bit and try again.');
                        } else {
                          setLoginError(err.message || 'Signup failed');
                        }
                      } finally { setLoginLoading(false); }
                    }}
                    disabled={loginLoading}
                    aria-label="Create new tutor account"
                    className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
                  >
                    {loginLoading ? 'Signing up...' : 'Sign up'}
                  </button>

                  <button onClick={() => { setView('tutor_login'); setLoginError(''); setLoginNotice(''); }} aria-label="Go back to tutor login" className="flex-1 bg-[#16161D] text-white py-3 rounded-xl font-bold text-lg border border-[#2D2D3A] focus:outline-none focus:ring-2 focus:ring-[#2D2D3A] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">Back</button>
                </div>
            </div>
        </div>
      )}

      {view === 'signup' && (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
            <div className="mb-8 text-center">
               <h2 className="text-3xl font-black text-white mb-2">Create an Account</h2>
               <p className="text-white/50 text-sm">Sign up with your name, email and password</p>
            </div>
            <div className="w-full max-w-xs space-y-4">
                {loginError && (
                  <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginError}
                  </div>
                )}
                {loginNotice && (
                  <div className="bg-[#00F2FF]/10 border border-[#00F2FF] text-[#00F2FF] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginNotice}
                  </div>
                )}

                <div className="relative group">
                   <Icon name="User" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={20} />
                   <input 
                     autoFocus type="text" placeholder="Full name" value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="relative group">
                   <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="email" placeholder="Email" value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="relative group">
                   <Icon name="Lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     type="password" placeholder="Password" value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (!fullName) { setLoginError('Enter your full name'); setLoginNotice(''); return; }
                      if (!email || !password) { setLoginError('Enter email and password'); setLoginNotice(''); return; }
                      if (!isValidEmail(email)) { setLoginError('Enter a valid email address'); setLoginNotice(''); return; }
                      if (password.length < 6) { setLoginError('Password must be at least 6 characters'); setLoginNotice(''); return; }
                      try {
                        setLoginLoading(true);
                        setLoginError('');
                        setLoginNotice('');
                        const user = await studentAuthSignUp(email.toLowerCase(), password, fullName);
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (!sessionData?.session) {
                          setLoginNotice('Check your email to confirm your account before signing in.');
                          setLoginLoading(false);
                          return;
                        }
                        const inviteToken = getInviteToken() || getStoredInviteToken();
                        if (inviteToken && getInviteConfirmed()) {
                          try {
                            const teacherUserId = await redeemTeacherInvite(inviteToken);
                            if (teacherUserId) {
                              await assignStudentToTeacher(user.id, teacherUserId);
                              clearInviteToken();
                              clearStoredInviteToken();
                              setInviteConfirmedValue(false);
                            }
                          } catch (e) {
                            console.error('Invite assign failed:', e);
                          }
                        }

                        const normalized = (user?.user_metadata?.username || (user?.email || '').split('@')[0] || email).toLowerCase();
                        setUserName(normalized);

                        const baseOnboarding = { material: null, level: null, lessonsPerWeek: onboardingData.lessonsPerWeek };
                        setOnboardingData(baseOnboarding);
                        await persistData({ userName: normalized, displayName: fullName, onboardingData: baseOnboarding, streakState, xp: 0 });
                        setView('ob_screen1');
                      } catch (err) {
                        const msg = (err?.message || '').toLowerCase();
                        if (msg.includes('rate limit') || msg.includes('rate-limit')) {
                          setLoginError('Too many sign-up attempts. Please wait a bit and try again.');
                        } else {
                          setLoginError(err.message || 'Signup failed');
                        }
                      } finally { setLoginLoading(false); }
                    }}
                    disabled={loginLoading}
                    aria-label="Create new student account"
                    className="flex-1 bg-[#7000FF] text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7000FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all disabled:opacity-50"
                  >
                    {loginLoading ? 'Signing up...' : 'Sign up'}
                  </button>

                  <button onClick={() => { setView('login'); setLoginError(''); setLoginNotice(''); }} aria-label="Go back to student login" className="flex-1 bg-[#16161D] text-white py-3 rounded-xl font-bold text-lg border border-[#2D2D3A] focus:outline-none focus:ring-2 focus:ring-[#2D2D3A] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">Back</button>
                </div>
            </div>
        </div>
      )}

      {view === 'reset' && (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-10">
            <div className="mb-8 text-center">
               <h2 className="text-3xl font-black text-white mb-2">Reset Password</h2>
               <p className="text-white/50 text-sm">Enter your email or username to receive a password reset link</p>
            </div>
            <div className="w-full max-w-xs space-y-4">
                {loginError && (
                  <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                    {loginError}
                  </div>
                )}

                <div className="relative group">
                   <Icon name="Mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors" size={18} />
                   <input 
                     autoFocus type="text" placeholder="Email or username" value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={loginLoading}
                     className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 outline-none transition-all placeholder:text-white/10 font-bold disabled:opacity-50"
                   />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (!email) { setLoginError('Enter email or username'); return; }
                      try {
                        setLoginLoading(true);
                        setLoginError('');
                        let targetEmail = null;
                        if (email.includes('@')) {
                          if (!isValidEmail(email)) { setLoginError('Enter a valid email address'); setLoginLoading(false); return; }
                          targetEmail = email.toLowerCase();
                        } else {
                          const resolved = await findStudentEmailByUsername(email);
                          if (!resolved) { setLoginError('No account found for that username'); setLoginLoading(false); return; }
                          targetEmail = resolved.toLowerCase();
                        }
                        await studentAuthResetPassword(targetEmail);
                        setLoginError('Password reset email sent. Check your inbox.');
                      } catch (err) {
                        setLoginError(err.message || 'Failed to send reset email');
                      } finally { setLoginLoading(false); }
                    }}
                    disabled={loginLoading}
                    aria-label="Send password reset email"
                    className="flex-1 bg-[#00F2FF] text-[#0A0A0C] py-3 rounded-xl font-bold text-lg hover:brightness-110 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all shadow-[0_0_20px_rgba(0,242,255,0.2)] disabled:opacity-50"
                  >
                    {loginLoading ? 'Sending...' : 'Send reset email'}
                  </button>

                  <button onClick={() => { setView('login'); setLoginError(''); }} aria-label="Go back to login" className="flex-1 bg-[#16161D] text-white py-3 rounded-xl font-bold text-lg border border-[#2D2D3A] focus:outline-none focus:ring-2 focus:ring-[#2D2D3A] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">Back</button>
                </div>
            </div>
        </div>
      )}

      {view === 'tutor_dashboard' && <TutorDashboard onLogout={() => setView('login')} />}
      
      {view === 'ob_screen1' && (
        <div className="max-w-md mx-auto min-h-[90vh] flex flex-col items-center justify-center px-8 animate-in fade-in">
            <h2 className="text-2xl font-bold mb-10 text-center leading-snug">Do you study English with<br/><span className="text-[#00F2FF]">iSpeaktu?</span></h2>
            <button onClick={() => setView('ob_screen2')} aria-label="Yes, I study English with iSpeaktu" className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-4 font-bold text-lg hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">Yes,</button>
            <button onClick={() => { persistData({ userName, onboardingData, streakState }); setView('dashboard'); }} aria-label="No, I prefer self-studying" className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl font-bold text-lg hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">No, I'm self-studying</button>
        </div>
      )}

      {view === 'ob_screen2' && (
        <div className="max-w-md mx-auto py-10 px-8 animate-in slide-in-from-right-10">
            <h2 className="text-2xl font-bold mb-10 text-center">What do you study?</h2>
            {MATERIALS_DATA.map(m => (
                <button key={m.id} onClick={() => { setOnboardingData({ ...onboardingData, material: m }); setView('ob_screen3'); }} aria-label={`Select ${m.title} as your study track`} className="w-full p-5 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-3 flex items-center gap-4 hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">
                    <div style={{ color: m.color }} className="bg-[#0A0A0C] p-2 rounded-lg"><Icon name={m.icon} style={{ color: m.color }} /></div>
                    <span className="font-bold">{m.title}</span>
                </button>
            ))}
        </div>
      )}

      {view === 'ob_screen3' && (
        <div className="max-w-md mx-auto min-h-[80vh] flex flex-col items-center justify-center px-8 animate-in slide-in-from-right-10">
            <h2 className="text-2xl font-bold mb-10 text-center">What's your level?</h2>
            {onboardingData.material?.levels.map(l => (
              <button key={l} onClick={() => { 
                const finalOb = { ...onboardingData, level: l };
                setOnboardingData(finalOb); 
                persistData({ userName, onboardingData: finalOb, streakState }); 
                setView('dashboard'); 
              }} aria-label={`Select ${l} as your level`} className="w-full p-6 bg-[#16161D] border border-[#2D2D3A] rounded-2xl mb-3 font-bold text-lg hover:border-[#00F2FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all">
                {l}
              </button>
            ))}
        </div>
      )}

      {view === 'dashboard' && <Dashboard />}
      {view === 'select_level' && <SelectionPath />}
      {view === 'select_lesson' && <LessonSelectionView />}
      {view === 'quiz' && <QuizView />}
      {view === 'results' && <ResultsView />}
      {view === 'progress' && <ProgressView />}
      {view === 'settings' && (
        <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
            <Header title="Settings" subtitle="Your Account & Goals" />
            
            <div className="space-y-8">
                {/* --- Profile --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Profile Information</h4>
                    <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Name</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={userName} 
                                    onChange={(e) => {
                                        setUserName(e.target.value);
                                        persistData({ userName: e.target.value });
                                    }}
                                    className="w-full bg-[#0A0A0C] border border-[#2D2D3A] rounded-xl py-3 px-4 text-sm font-bold text-white focus:border-[#00F2FF40] outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Goals --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Learning Goals</h4>
                    <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center ml-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Lessons Per Week</label>
                                <span className="text-xs font-black text-[#00F2FF]">{onboardingData.lessonsPerWeek} Lessons</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={onboardingData.lessonsPerWeek} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const updated = { ...onboardingData, lessonsPerWeek: val };
                                    setOnboardingData(updated);
                                    persistData({ onboardingData: updated });
                                }}
                                className="w-full accent-[#00F2FF]"
                            />
                        </div>
                    </div>
                </div>

                {/* --- Curriculum --- */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Track & Level</h4>
                    <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2 block">Track</label>
                            <div className="grid grid-cols-1 gap-2">
                                {MATERIALS_DATA.map(m => (
                                    <button 
                                        key={m.id}
                                        onClick={() => {
                                            const updated = { ...onboardingData, material: m, level: m.levels[0] };
                                            setOnboardingData(updated);
                                            persistData({ onboardingData: updated });
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${onboardingData.material?.id === m.id ? 'bg-[#00F2FF10] border-[#00F2FF] text-white' : 'bg-[#0A0A0C] border-[#2D2D3A] text-white/40'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon name={m.icon} size={14} style={{ color: onboardingData.material?.id === m.id ? m.color : 'inherit' }} />
                                            <span className="text-xs font-bold">{m.title}</span>
                                        </div>
                                        {onboardingData.material?.id === m.id && <Check size={14} className="text-[#00F2FF]" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-[#2D2D3A]">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2 block">Current Level</label>
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.material?.levels.map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => {
                                            const updated = { ...onboardingData, level: l };
                                            setOnboardingData(updated);
                                            persistData({ onboardingData: updated });
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${onboardingData.level === l ? 'bg-[#7000FF] border-[#7000FF] text-white shadow-[0_0_15px_rgba(112,0,255,0.3)]' : 'bg-[#0A0A0C] border-[#2D2D3A] text-white/40'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="pt-10 flex flex-col items-center gap-4">
                    <button 
                        onClick={() => setView('dashboard')}
                        className="w-full bg-[#00F2FF] text-[#0A0A0C] py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        Save & Return
                    </button>
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Settings are synced to your local device</p>
                </div>
            </div>
        </div>
      )}
      
      {['dashboard', 'progress', 'settings', 'select_level', 'select_lesson'].includes(view) && <BottomNav />}
    </div>
  );
}

// Minimal TutorDashboard subcomponent within the same file for consistency
function TutorDashboard({ onLogout }) {
    const [searchQuery, setSearchQuery] = useState('');
  const [teacherName, setTeacherName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [expandedQuiz, setExpandedQuiz] = useState(null);
    const [inviteLink, setInviteLink] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [reminders, setReminders] = useState({});
    const [praises, setPraises] = useState({});
    
    useEffect(() => {
        let active = true;
        (async () => {
            const list = await getTeacherStudents();
            if (active) setStudents(list);
        })();
        (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData?.session?.user;
            if (user && active) {
                const name = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.username || (user.email || '').split('@')[0] || '';
                if (active && name) setTeacherName(name);
            }
        })();
        (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const teacherId = sessionData?.session?.user?.id;
            if (!teacherId || !active) return;
            const { data: sent, error } = await supabase
              .from('notifications')
              .select('recipient_id, type')
              .eq('sender_id', teacherId);
            if (error) {
              console.error('Failed to load notifications:', error);
              return;
            }
            const r = {};
            const p = {};
            (sent || []).forEach(n => {
              if (n.type === 'remind') r[n.recipient_id] = true;
              if (n.type === 'praise') p[n.recipient_id] = true;
            });
            if (active) {
              setReminders(r);
              setPraises(p);
            }
        })();
        return () => { active = false; };
    }, []);
    
    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const handleRemind = async (e, s) => {
        e.stopPropagation();
        // Prevent reminders for students with no quiz history
        if (!s.history || s.history.length === 0) {
            return;
        }
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const teacherId = sessionData?.session?.user?.id;
            if (!teacherId) return;
            await createNotification(s.id, 'remind', teacherId, s.lastLessonId || null);
            setReminders({ ...reminders, [s.id]: true });
        } catch (err) {
            console.error('Failed to send reminder:', err);
        }
    };

    const handlePraise = async (e, s) => {
        e.stopPropagation();
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const teacherId = sessionData?.session?.user?.id;
            if (!teacherId) return;
            await createNotification(s.id, 'praise', teacherId, s.lastLessonId || null);
            setPraises({ ...praises, [s.id]: true });
        } catch (err) {
            console.error('Failed to send praise:', err);
        }
    };

    const handleCreateInvite = async () => {
        try {
            setInviteLoading(true);
            setInviteError('');
            const invite = await createTeacherInvite();
            const token = invite?.token;
            if (!token) throw new Error('Invite token not created');
            const link = `${window.location.origin}?invite=${token}`;
            setInviteLink(link);
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
            }
        } catch (err) {
            setInviteError(err.message || 'Failed to create invite');
        } finally {
            setInviteLoading(false);
        }
    };
    
    if (selectedStudent) {
        // Derive Focus Grammar Points
        const grammarFailures = {};
        selectedStudent.history.filter(h => !h.passed).forEach(h => {
            const key = `${h.material}_${h.level}_${h.lessonId}`;
            const skills = LESSON_SKILLS[key];
            if (skills) {
                skills.grammar.forEach(g => {
                    grammarFailures[g] = (grammarFailures[g] || 0) + 1;
                });
            }
        });
        const focalGrammar = Object.entries(grammarFailures)
            .filter(([_, count]) => count >= 1)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        return (
          <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-right-8">
            <button
              onClick={() => { setSelectedStudent(null); setExpandedQuiz(null); }}
              aria-label="Back to student overview"
              className="flex items-center gap-2 text-[#00F2FF] font-black uppercase text-[10px] tracking-widest mb-6 group focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] rounded px-2 py-1 transition-all"
            >
                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Overview
            </button>
            <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00F2FF] to-[#7000FF]" />
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#7000FF20] border border-[#7000FF40] flex items-center justify-center">
                        <User className="text-[#7000FF]" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">{selectedStudent.name}</h2>
                        <p className="text-[#00F2FF] text-[10px] font-black uppercase tracking-widest">{selectedStudent.progress}</p>
                    </div>
                </div>
                
                {/* --- TREND ANALYSIS / SKILL BREAKDOWN --- */}
                <div className="space-y-4 mt-6 border-t border-[#2D2D3A] pt-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-2 flex items-center gap-2">
                        <BarChart3 size={12} /> Trend Analysis
                    </h4>
                    {['Vocabulary', 'Grammar', 'Comprehension'].map(skill => {
                        const val = selectedStudent.skills?.[skill.toLowerCase()] || 0;
                        return (
                            <div key={skill} className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-white/60">{skill}</span>
                                    <span className="text-white">{val}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#0A0A0C] rounded-full overflow-hidden border border-[#2D2D3A]">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] transition-all duration-1000" 
                                        style={{ width: `${val}%` }} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- FOCUS GRAMMAR AREAS --- */}
            {focalGrammar.length > 0 && (
                <div className="bg-[#FF2E6310] border border-[#FF2E6340] rounded-2xl p-6 mb-8 animate-in slide-in-from-top-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF2E63] mb-4 flex items-center gap-2">
                        <AlertTriangle size={12} /> Attention Areas: Grammar
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {focalGrammar.map(g => (
                            <div key={g} className="px-3 py-1 bg-[#FF2E6320] border border-[#FF2E6330] rounded-lg text-[10px] font-bold text-white uppercase">
                                {g}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 px-2">Quiz History</h3>
            <div className="space-y-3">
                {selectedStudent.history && selectedStudent.history.length > 0 ? (
                  selectedStudent.history.slice().sort((a,b) => (a.lessonId || 0) - (b.lessonId || 0)).map((h, i) => {
                    const isExpanded = expandedQuiz === i;
                    return (
                      <div key={i}>
                        <div 
                          onClick={() => setExpandedQuiz(isExpanded ? null : i)}
                          className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all cursor-pointer"
                        >
                                    <div>
                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-tighter mb-1">
                                            {new Date(h.date).toLocaleDateString()} • {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="font-bold text-white leading-none">Lesson {h.lessonId}</div>
                                        <div className="text-[9px] text-[#00F2FF] font-black uppercase tracking-widest mt-1.5">{h.material} • {h.level}</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-2xl font-black ${h.passed ? 'text-[#00FF94]' : 'text-[#FF2E63]'}`}>{h.score}%</div>
                                        <div className={`text-[8px] font-black uppercase tracking-widest ${h.passed ? 'text-[#00FF9440]' : 'text-[#FF2E6340]'}`}>
                                            {h.passed ? 'Passed' : 'Needs Review'}
                                        </div>
                                    </div>
                                </div>
                                
                                {isExpanded && h.failures && h.failures.length > 0 && (
                                    <div className="bg-[#16161D] border border-[#2D2D3A] border-t-0 rounded-b-2xl p-5 animate-in slide-in-from-top-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF2E63] mb-4 flex items-center gap-2">
                                            <AlertTriangle size={12} /> Incorrect Answers
                                        </h4>
                                        <div className="space-y-4">
                                            {h.failures.map((f, idx) => (
                                                <div key={idx} className="bg-[#0A0A0C] border border-[#FF2E6330] rounded-xl p-4 space-y-2">
                                                    <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Question {idx + 1}</div>
                                                    <p className="text-sm font-bold text-white mb-3">{f.question}</p>
                                                    <div className="space-y-2">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-[#FF2E63]/20 border border-[#FF2E63] flex items-center justify-center shrink-0 text-[#FF2E63] text-[10px] font-black">✕</div>
                                                            <div className="text-sm text-white/70">
                                                                <span className="text-[#FF2E63] font-bold">Student answered:</span> {f.answer}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-[#00FF94]/20 border border-[#00FF94] flex items-center justify-center shrink-0 text-[#00FF94] text-[10px] font-black">✓</div>
                                                            <div className="text-sm text-white/70">
                                                                <span className="text-[#00FF94] font-bold">Correct answer:</span> {f.correct}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center opacity-20 py-10">No history available.</p>
                )}
            </div>
          </div>
        );
    }

    return (
      <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-start mb-10 px-2">
            <div>
               <h1 className="text-2xl font-black text-white tracking-tighter">{teacherName ? `Tutor ${teacherName}` : 'Tutor'}</h1>
               <p className="text-[#00F2FF] text-[10px] font-black tracking-widest opacity-60">Welcome to your classroom</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateInvite}
                  disabled={inviteLoading}
                  aria-label="Create teacher invite link"
                  className="px-3 py-2 rounded-xl bg-[#16161D] border border-[#2D2D3A] text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-[#00F2FF40] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Creating...' : 'Invite Link'}
                </button>
                <button
                  onClick={onLogout}
                  aria-label="Logout from tutor dashboard"
                  className="w-10 h-10 rounded-full bg-[#16161D] border border-[#2D2D3A] flex items-center justify-center text-white/40 hover:text-[#FF2E63] focus:outline-none focus:ring-2 focus:ring-[#FF2E63] transition-colors"
                >
                    <Icon name="LogOut" size={18}/>
                </button>
            </div>
        </div>

        {(inviteLink || inviteError) && (
          <div className="mb-6 px-2">
            {inviteError && (
              <div className="bg-[#FF2E63]/10 border border-[#FF2E63] text-[#FF2E63] px-4 py-3 rounded-lg text-sm font-semibold">
                {inviteError}
              </div>
            )}
            {inviteLink && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  aria-label="Invite link URL"
                  className="flex-1 bg-[#16161D] border border-[#2D2D3A] rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 outline-none focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 transition-all"
                />
                <button
                  onClick={async () => {
                    if (navigator?.clipboard?.writeText) {
                      await navigator.clipboard.writeText(inviteLink);
                    }
                  }}
                  aria-label="Copy invite link to clipboard"
                  className="px-3 py-2 rounded-xl bg-[#00F2FF] text-[#0A0A0C] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- SEARCH BAR --- */}
        <div className="relative mb-10 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FF] transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="Find a student..." 
                aria-label="Search for a student by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16161D] border border-[#2D2D3A] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-[#00F2FF] focus:ring-2 focus:ring-[#00F2FF]/20 transition-all placeholder:text-white/10"
            />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-[#16161D] p-5 rounded-2xl border border-[#2D2D3A] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-[#00F2FF40]" />
                <div className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF] mb-1">Total Enrolled</div>
                <div className="text-4xl font-black text-white">{students.length}</div>
            </div>
            <div className="bg-[#16161D] p-5 rounded-2xl border border-[#2D2D3A] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-[#FF2E6340]" />
                <div className="text-[10px] font-black uppercase tracking-widest text-[#FF2E63] mb-1">Feedback Sent</div>
                <div className="text-4xl font-black text-white">{Object.keys(reminders).length + Object.keys(praises).length}</div>
            </div>
        </div>

        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 px-2">Student Directory</h4>
        <div className="space-y-3">
            {filteredStudents.length === 0 ? (
                <div className="text-center opacity-20 py-20 border-2 border-dashed border-[#2D2D3A] rounded-3xl">
                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-widest">No matching students</p>
                </div>
            ) : filteredStudents.map(s => {
                const needsRetake = s.lastScore < 70;
                return (
                    <div 
                        key={s.id} 
                        onClick={() => { setSelectedStudent(s); setExpandedQuiz(null); }}
                        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && (e.target === e.currentTarget)) { e.preventDefault(); setSelectedStudent(s); setExpandedQuiz(null); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for student ${s.name}, ${s.progress} level, ${s.lastScore}% score`}
                        className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#00F2FF40] hover:bg-[#1C1C26] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all active:scale-[0.99] group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#0A0A0C] border border-[#2D2D3A] flex items-center justify-center text-white/20 group-hover:text-[#00F2FF] group-hover:border-[#00F2FF20] transition-all">
                                <User size={24} />
                            </div>
                            <div>
                                <div className="font-black text-white text-lg">{s.name}</div>
                                <div className="text-[10px] text-[#00F2FF] font-black uppercase tracking-widest">
                                  {s.progress} • {s.lastScore}% Score
                                </div>
                            </div>
                        </div>
                        
                        {needsRetake && s.history && s.history.length > 0 ? (
                            <button 
                                onClick={(e) => handleRemind(e, s)}
                                aria-label={`Remind ${s.name} to complete lesson`}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 ${reminders[s.id] ? 'bg-[#2D2D3A] text-white/20 focus:ring-[#2D2D3A]' : 'bg-[#FF2E63] text-white hover:brightness-110 active:scale-95 focus:ring-[#FF2E63]'}`}
                            >
                                <Icon name="Bell" size={12} />
                                {reminders[s.id] ? 'Reminded' : 'Remind'}
                            </button>
                        ) : (!needsRetake && s.history && s.history.length > 0) ? (
                            <button 
                                onClick={(e) => handlePraise(e, s)}
                                aria-label={`Send praise to ${s.name}`}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 ${praises[s.id] ? 'bg-[#2D2D3A] text-white/20 focus:ring-[#2D2D3A]' : 'bg-[#00FF94] text-[#0A0A0C] hover:brightness-110 active:scale-95 focus:ring-[#00FF94]'}`}
                            >
                                <Icon name="ThumbsUp" size={12} />
                                {praises[s.id] ? 'Sent' : 'Thumbs Up'}
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </div>
      </div>
    );
}








