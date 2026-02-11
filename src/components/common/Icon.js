// Extracted from App.js - Icon component and icon map (original lines 44-71)
import React from 'react';
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
  ThumbsUp,
  Lock
} from 'lucide-react';

export const iconsMap = {
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
  ThumbsUp,
  Check,
  Lock
};

/**
 * Renders an icon by name from lucide-react
 * @param {string|Component} name - Icon name or component
 * @param {number} size - Icon size
 * @param {string} className - CSS classes
 * @param {object} style - Inline styles
 */
export const Icon = ({ name, size = 20, className = '', style = {} }) => {
  const LucideIcon = typeof name === 'string' ? iconsMap[name] : name;
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} style={style} />;
};
