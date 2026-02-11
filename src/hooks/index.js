// Barrel export for all custom hooks
export { useAuth, useStudentAuth, useTeacherAuth, usePersistentAuth } from './useAuth';
export { useStudentData } from './useStudentData';
export { useLessonContent, getLessonLoadingUI, getLessonErrorUI, getLessonNoQuestionsUI } from './useLessonContent';
export { useLocalStorage } from './useLocalStorage';
export { useStreak } from './useStreak';
export { useNotifications, getNotificationsByType, getLatestNotificationByType } from './useNotifications';
export { useInviteToken, isValidInviteToken } from './useInviteToken';
