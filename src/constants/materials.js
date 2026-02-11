// Extracted from App.js (original lines 72-81)
import { MessagesSquare, Briefcase, Plane, Star, MessageCircle, Book, GraduationCap } from 'lucide-react';
import { COLORS } from './colors';

export const MATERIALS_DATA = [
  { id: 'conv', title: 'Conversational English', icon: MessagesSquare, color: COLORS.success, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'bus', title: 'Business English', icon: Briefcase, color: COLORS.primary, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'grammar', title: 'Grammar', icon: Book, color: COLORS.warning, levels: ['Beginner', 'Intermediate', 'Advanced'] },
  { id: 'travel', title: 'Travel English', icon: Plane, color: COLORS.secondary, levels: ['Beginner', 'Intermediate'] },
  { id: 'exam', title: 'Exam Prep', icon: GraduationCap, color: COLORS.danger, levels: ['Intermediate', 'Advanced'] },
  { id: 'kids', title: 'Kids Course', icon: Star, color: COLORS.secondary, levels: ['Level 1', 'Level 2', 'Level 3'] },
  { id: 'free', title: 'Free Talk', icon: MessageCircle, color: COLORS.primary, levels: ['Beginner', 'Intermediate', 'Advanced'] }
];
