/**
 * Models Index
 * Central export for all database models
 */

const Participant = require('./Participant');
const Video = require('./Video');
const VideoResponse = require('./VideoResponse');
const Questionnaire = require('./Questionnaire');
const QuestionnaireResponse = require('./QuestionnaireResponse');
const Coding = require('./Coding');
const Admin = require('./Admin');
const AuditLog = require('./AuditLog');
const StudySettings = require('./StudySettings');

module.exports = {
  Participant,
  Video,
  VideoResponse,
  Questionnaire,
  QuestionnaireResponse,
  Coding,
  Admin,
  AuditLog,
  StudySettings
};
