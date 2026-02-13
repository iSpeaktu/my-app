const express = require('express');
const router = express.Router();

const auth = require('../controllers/auth');
const materials = require('../controllers/materials');
const students = require('../controllers/students');
const teachers = require('../controllers/teachers');
const notifications = require('../controllers/notifications');

// Auth
router.post('/auth/student/login', auth.studentLogin);
router.post('/auth/student/signup', auth.studentSignup);
router.post('/auth/reset-password', auth.resetPassword);

// Materials & lessons
router.get('/materials', materials.getMaterials);
router.get('/materials/:materialId/lesson', materials.getLessonByCompositeKey);
router.get('/lessons/:lessonId/questions', materials.getLessonQuestions);

// Students
router.get('/students/:studentId/profile', students.getProfile);
router.get('/students/:studentId/progress', students.getProgress);
router.post('/students/:studentId/progress', students.updateProgress);
router.get('/students/:studentId/history', students.getHistory);
router.post('/students/:studentId/history', students.recordHistory);
router.get('/students/:studentId/achievements', students.getAchievements);

// Teachers
router.get('/teachers/:teacherId/roster', teachers.getRoster);
router.post('/teachers/:teacherId/invite', teachers.createInvite);
router.post('/invites/redeem', teachers.redeemInvite);

// Notifications
router.get('/users/:userId/notifications', notifications.getNotifications);
router.post('/notifications', notifications.createNotification);
router.delete('/notifications/:id', notifications.deleteNotification);

module.exports = router;
