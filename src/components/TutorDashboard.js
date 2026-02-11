// Extracted from App.js - TutorDashboard component (original lines 2291-2912)
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  User,
  Search,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { Icon } from './common';
import { MATERIALS_DATA } from '../constants/materials';
import { supabase, getTeacherStudents, createNotification, createTeacherInvite } from '../config/supabase';

/**
 * TutorDashboard - Teacher classroom management interface
 * Displays enrolled students, quiz history, feedback options, and invite functionality.
 * 
 * @param {Function} onLogout - Callback to logout and return to login view
 */
export default function TutorDashboard({ onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [students, setStudents] = useState([]);
  const [reminders, setReminders] = useState({});
  const [praises, setPraises] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const tutorIdRef = useRef(null);

  const getTrackLabel = (materialId) => {
      const m = MATERIALS_DATA.find(x => x.id === materialId);
      return m?.title || 'Track';
  };

  const getLessonKey = (studentId, lessonId, type) => `${studentId || ''}_${lessonId || ''}_${type || ''}`;
  const getLocalSentMap = (key) => {
      try {
          return JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
          return {};
      }
  };
  const setLocalSentMap = (key, value) => {
      localStorage.setItem(key, JSON.stringify(value || {}));
  };
  const getLastSeenKey = (teacherId) => `ispeaktu_tutor_last_seen_${teacherId}`;
  const getLocalLastSeenMap = (key) => {
      try {
          return JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
          return {};
      }
  };
  const setLocalLastSeenMap = (key, value) => {
      localStorage.setItem(key, JSON.stringify(value || {}));
  };
  const getSelectedStudentKey = (teacherId) => `ispeaktu_tutor_selected_${teacherId}`;
  
  useEffect(() => {
      let active = true;
      let pollId = null;
      const fetchStudents = async () => {
          const list = await getTeacherStudents();
          if (active) setStudents(list);
          const currentTeacherId = tutorIdRef.current;
          if (active && currentTeacherId) {
              const key = getLastSeenKey(currentTeacherId);
              setLastSeenMap(prev => {
                  const next = { ...(prev || {}) };
                  let changed = false;
                  (list || []).forEach(s => {
                      if (!next[s.id] && s.history && s.history.length > 0) {
                          const lastDate = s.history[s.history.length - 1]?.date;
                          if (lastDate) {
                              next[s.id] = lastDate;
                              changed = true;
                          }
                      }
                  });
                  if (changed) {
                      setLocalLastSeenMap(key, next);
                      return next;
                  }
                  return prev;
              });
              if (!selectedStudent) {
                  try {
                      const storedId = localStorage.getItem(getSelectedStudentKey(currentTeacherId));
                      if (storedId) {
                          const found = (list || []).find(s => s.id === storedId);
                          if (found) setSelectedStudent(found);
                      }
                  } catch {
                      return;
                  }
              }
          }
      };
      fetchStudents();
      pollId = setInterval(fetchStudents, 10000);
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
          tutorIdRef.current = teacherId;
          const lastSeenKey = getLastSeenKey(teacherId);
          const localSeen = getLocalLastSeenMap(lastSeenKey);
          if (active) setLastSeenMap(localSeen);
          const reminderKey = `ispeaktu_tutor_reminders_${teacherId}`;
          const praiseKey = `ispeaktu_tutor_praises_${teacherId}`;
          const localReminders = getLocalSentMap(reminderKey);
          const localPraises = getLocalSentMap(praiseKey);
          if (active) {
            setReminders(localReminders);
            setPraises(localPraises);
          }
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
            if (n.type === 'reminder') r[getLessonKey(n.recipient_id, n.lesson_id, 'reminder')] = true;
            if (n.type === 'praise') p[getLessonKey(n.recipient_id, n.lesson_id, 'praise')] = true;
          });
          if (active) {
            const mergedReminders = { ...localReminders, ...r };
            const mergedPraises = { ...localPraises, ...p };
            setReminders(mergedReminders);
            setPraises(mergedPraises);
            setLocalSentMap(reminderKey, mergedReminders);
            setLocalSentMap(praiseKey, mergedPraises);
          }
      })();
      return () => {
          active = false;
          if (pollId) clearInterval(pollId);
      };
  }, []);
  
  const filteredStudents = students.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemind = async (e, s, lessonId) => {
      e.stopPropagation();
      if (!s.history || s.history.length === 0) {
          return;
      }
      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const teacherId = sessionData?.session?.user?.id;
          if (!teacherId) return;
          await createNotification(s.id, 'reminder', teacherId, lessonId || null);
          const reminderKey = `ispeaktu_tutor_reminders_${teacherId}`;
          const next = { ...reminders, [getLessonKey(s.id, lessonId, 'reminder')]: true };
          setReminders(next);
          setLocalSentMap(reminderKey, next);
      } catch (err) {
          console.error('Failed to send reminder:', err);
      }
  };

  const handlePraise = async (e, s, lessonId) => {
      e.stopPropagation();
      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const teacherId = sessionData?.session?.user?.id;
          if (!teacherId) return;
          await createNotification(s.id, 'praise', teacherId, lessonId || null);
          const praiseKey = `ispeaktu_tutor_praises_${teacherId}`;
          const next = { ...praises, [getLessonKey(s.id, lessonId, 'praise')]: true };
          setPraises(next);
          setLocalSentMap(praiseKey, next);
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
          if (navigator?.clipboard?.copyText) {
              await navigator.clipboard.writeText(link);
          }
      } catch (err) {
          setInviteError(err.message || 'Failed to create invite');
      } finally {
          setInviteLoading(false);
      }
  };
  
  if (selectedStudent) {
      // Grammar failure analysis now comes from database (database-driven)
      const focalGrammar = [];

      return (
        <div className="max-w-xl mx-auto py-8 px-6 animate-in slide-in-from-right-8">
          <button
            onClick={() => {
              setSelectedStudent(null);
              setExpandedQuiz(null);
              const currentTeacherId = tutorIdRef.current;
              if (currentTeacherId) {
                try {
                  localStorage.removeItem(getSelectedStudentKey(currentTeacherId));
                } catch {
                  return;
                }
              }
            }}
            aria-label="Back to student overview"
            className="flex items-center gap-2 text-[#00F2FF] font-black uppercase text-[10px] tracking-widest mb-6 group focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] rounded px-2 py-1 transition-all"
          >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Overview
          </button>
          <div className="bg-[#16161D] border border-[#2D2D3A] rounded-3xl p-8 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00F2FF] to-[#7000FF]" />
              <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#7000FF20] border border-[#7000FF40] flex items-center justify-center overflow-hidden">
                          {selectedStudent.avatarUrl ? (
                              <img src={selectedStudent.avatarUrl} alt={`${selectedStudent.name} avatar`} className="w-full h-full object-cover" />
                          ) : (
                              <User className="text-[#7000FF]" size={32} />
                          )}
                      </div>
                  <div>
                      <h2 className="text-2xl font-black text-white">{selectedStudent.name}</h2>
                      <p className="text-[#00F2FF] text-[10px] font-black tracking-widest">
                        {getTrackLabel(selectedStudent.lastMaterialId)} • {selectedStudent.lastLevel || selectedStudent.progress}
                      </p>
                  </div>
              </div>
              
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
                selectedStudent.history
                  .slice()
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .reduce((acc, h) => {
                    const idx = acc.findIndex(x => x.lessonId === h.lessonId);
                    if (idx === -1) acc.push(h);
                    else if (new Date(h.date) > new Date(acc[idx].date)) acc[idx] = h;
                    return acc;
                  }, [])
                  .sort((a, b) => (a.lessonId || 0) - (b.lessonId || 0))
                  .map((h, i) => {
                  const isExpanded = expandedQuiz === i;
                  const reminderKey = getLessonKey(selectedStudent.id, h.lessonId, 'reminder');
                  const praiseKey = getLessonKey(selectedStudent.id, h.lessonId, 'praise');
                  const reminderSent = !!reminders[reminderKey];
                  const praiseSent = !!praises[praiseKey];
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
                                      <div className="mt-3">
                                        {h.passed ? (
                                          <button
                                            onClick={(e) => handlePraise(e, selectedStudent, h.lessonId)}
                                            aria-label={`Send praise for lesson ${h.lessonId}`}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 ${praiseSent ? 'bg-[#2D2D3A] text-white/20 focus:ring-[#2D2D3A]' : 'bg-[#00FF94] text-[#0A0A0C] hover:brightness-110 active:scale-95 focus:ring-[#00FF94]'}`}
                                          >
                                            <Icon name="ThumbsUp" size={10} />
                                            {praiseSent ? 'Sent' : 'Thumbs Up'}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={(e) => handleRemind(e, selectedStudent, h.lessonId)}
                                            aria-label={`Remind for lesson ${h.lessonId}`}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 ${reminderSent ? 'bg-[#2D2D3A] text-white/20 focus:ring-[#2D2D3A]' : 'bg-[#FF2E63] text-white hover:brightness-110 active:scale-95 focus:ring-[#FF2E63]'}`}
                                          >
                                            <Icon name="Bell" size={10} />
                                            {reminderSent ? 'Reminded' : 'Remind'}
                                          </button>
                                        )}
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
                id="invite-link"
                name="invite_link"
                readOnly
                value={inviteLink}
                aria-label="Invite link URL"
                className="flex-1 bg-[#16161D] border border-[#2D2D3A] rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 outline-none focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 transition-all"
              />
              <button
                onClick={async () => {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(inviteLink);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }
                }}
                aria-label="Copy invite link to clipboard"
                className="px-3 py-2 rounded-xl bg-[#00F2FF] text-[#0A0A0C] text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all"
              >
                {inviteCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative mb-10 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00F2FF] transition-colors" size={18} />
          <input 
              id="tutor-student-search"
              name="tutor_student_search"
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
              const quizCount = (s.history && s.history.length) ? s.history.length : 0;
              const lastHistory = (s.history && s.history.length)
                ? s.history.slice().sort((a, b) => new Date(a.date) - new Date(b.date))[s.history.length - 1]
                : null;
              const lastLessonId = lastHistory?.lessonId || null;
              const reminderKey = lastLessonId ? getLessonKey(s.id, lastLessonId, 'reminder') : null;
              const praiseKey = lastLessonId ? getLessonKey(s.id, lastLessonId, 'praise') : null;
              const feedbackSentForLast = lastLessonId
                ? (!!reminders[reminderKey] || !!praises[praiseKey])
                : false;
              return (
                  <div 
                      key={s.id} 
                      onClick={() => {
                        setSelectedStudent(s);
                        setExpandedQuiz(null);
                        const currentTeacherId = tutorIdRef.current;
                        if (currentTeacherId) {
                          try {
                            localStorage.setItem(getSelectedStudentKey(currentTeacherId), s.id);
                          } catch {
                            return;
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && (e.target === e.currentTarget)) {
                          e.preventDefault();
                          setSelectedStudent(s);
                          setExpandedQuiz(null);
                          const currentTeacherId = tutorIdRef.current;
                          if (currentTeacherId) {
                            try {
                              localStorage.setItem(getSelectedStudentKey(currentTeacherId), s.id);
                            } catch {
                              return;
                            }
                          }
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for student ${s.name}, ${s.progress} level, ${s.lastScore}% score`}
                      className="bg-[#16161D] border border-[#2D2D3A] p-5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#00F2FF40] hover:bg-[#1C1C26] focus:outline-none focus:ring-2 focus:ring-[#00F2FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0C] transition-all active:scale-[0.99] group"
                  >
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#0A0A0C] border border-[#2D2D3A] flex items-center justify-center overflow-hidden text-white/20 group-hover:text-[#00F2FF] group-hover:border-[#00F2FF20] transition-all">
                              {s.avatarUrl ? (
                                  <img src={s.avatarUrl} alt={`${s.name} avatar`} className="w-full h-full object-cover" />
                              ) : (
                                  <User size={24} />
                              )}
                          </div>
                          <div>
                              <div className="font-black text-white text-lg">{s.name}</div>
                              <div className="text-[10px] text-[#00F2FF] font-black tracking-widest">
                                {getTrackLabel(s.lastMaterialId)} • {s.lastLevel || s.progress}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                          <div className="text-[9px] font-black uppercase tracking-widest text-white/40">{quizCount} Quiz{quizCount === 1 ? '' : 'zes'} Taken</div>
                          {(() => {
                              const lastSeen = lastSeenMap[s.id];
                              const newQuizCount = lastSeen
                                ? (s.history || []).filter(h => new Date(h.date) > new Date(lastSeen)).length
                                : 0;
                              if (newQuizCount <= 0) return null;
                              if (feedbackSentForLast) return null;
                              return (
                                <div className="px-3 py-1 rounded-lg bg-[#00F2FF20] border border-[#00F2FF50] text-[9px] font-black uppercase tracking-widest text-[#00F2FF]">
                                  {newQuizCount} New quiz{newQuizCount > 1 ? 'es' : ''} taken
                                </div>
                              );
                          })()}
                          {(() => {
                              if (!lastLessonId) return null;
                              if (feedbackSentForLast) return null;
                              return (
                                <div className="px-3 py-1 rounded-lg bg-[#FF2E6310] border border-[#FF2E6340] text-[9px] font-black uppercase tracking-widest text-[#FF2E63]">
                                  Feedback not sent
                                </div>
                              );
                          })()}
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
}
