const express = require('express');
const router = express.Router();

const auth = require('../controllers/auth');
const materials = require('../controllers/materials');
const students = require('../controllers/students');
const teachers = require('../controllers/teachers');
const notifications = require('../controllers/notifications');
const { verifyToken, requireAuth, requireOwnerOrTeacher } = require('../middleware/auth');
const { validateCreateNotification, validateCreateInvite } = require('../middleware/validation');

// Auth
router.post('/auth/student/login', auth.studentLogin);
router.post('/auth/student/signup', auth.studentSignup);
router.post('/auth/reset-password', auth.resetPassword);

// Materials & lessons
router.get('/materials', materials.getMaterials);
router.get('/materials/:materialId/lesson', materials.getLessonByCompositeKey);
router.get('/lessons/:lessonId/questions', materials.getLessonQuestions);

// Students
router.get('/students/:studentId/profile', verifyToken, requireOwnerOrTeacher('studentId'), students.getProfile);
router.get('/students/:studentId/progress', verifyToken, requireOwnerOrTeacher('studentId'), students.getProgress);
router.post('/students/:studentId/progress', verifyToken, requireOwnerOrTeacher('studentId'), students.updateProgress);
router.get('/students/:studentId/history', verifyToken, requireOwnerOrTeacher('studentId'), students.getHistory);
router.post('/students/:studentId/history', verifyToken, requireOwnerOrTeacher('studentId'), require('../middleware/validation').validateRecordHistory, students.recordHistory);
router.get('/students/:studentId/achievements', verifyToken, requireOwnerOrTeacher('studentId'), students.getAchievements);

// Teachers
router.get('/teachers/:teacherId/roster', verifyToken, requireOwnerOrTeacher('teacherId'), teachers.getRoster);
router.post('/teachers/:teacherId/invite', verifyToken, requireOwnerOrTeacher('teacherId'), validateCreateInvite, teachers.createInvite);
router.post('/invites/redeem', verifyToken, requireAuth, teachers.redeemInvite);

// Notifications
router.get('/users/:userId/notifications', verifyToken, requireOwnerOrTeacher('userId'), notifications.getNotifications);
router.post('/notifications', verifyToken, requireAuth, validateCreateNotification, notifications.createNotification);
router.delete('/notifications/:id', verifyToken, requireAuth, notifications.deleteNotification);

module.exports = router;
