const { Participant, Video, VideoResponse, Coding } = require('../models');
const XLSX = require('xlsx');

/**
 * Export Controller
 * Phase 11: Research Data Export
 * CRITICAL: Never export passwords, tokens, or secrets
 * CRITICAL: Researcher authorization required
 * CRITICAL: Support identity-linked and de-identified exports
 */

/**
 * Helper: Convert data to CSV format
 */
const convertToCSV = (data, headers) => {
  if (data.length === 0) return headers.join(',') + '\n';
  
  const headerLine = headers.join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      // Escape commas and quotes
      const stringValue = String(value).replace(/"/g, '""');
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
    }).join(',');
  });
  
  return headerLine + '\n' + rows.join('\n');
};

/**
 * Helper: Convert data to Excel format
 */
const convertToExcel = (data, sheetName = 'Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Export participants
 * GET /api/admin/export/participants?format=csv&identityLinked=false
 */
const exportParticipants = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition } = req.query;
    
    const query = {};
    if (condition) query.condition = condition;
    
    const participants = await Participant.find(query).sort({ createdAt: 1 });
    
    // Prepare data
    const data = participants.map((p, index) => {
      const baseData = {
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        condition: p.condition,
        status: p.status,
        consentGiven: p.consentGiven,
        consentDate: p.consentAt ? new Date(p.consentAt).toISOString() : '',
        experimentStarted: p.experimentStarted || false,
        experimentCompleted: p.experimentCompleted || false,
        startedAt: p.startedAt ? new Date(p.startedAt).toISOString() : '',
        completedAt: p.completedAt ? new Date(p.completedAt).toISOString() : '',
        createdAt: new Date(p.createdAt).toISOString()
      };
      
      // Add identity fields only if authorized
      if (identityLinked === 'true') {
        return {
          ...baseData,
          name: p.name,
          username: p.username,
          age: p.age,
          gender: p.gender,
          university: p.university,
          department: p.department
        };
      }
      
      return baseData;
    });
    
    if (format === 'xlsx' || format === 'excel') {
      const buffer = convertToExcel(data, 'Participants');
      const filename = identityLinked === 'true' 
        ? 'participants-identity-linked.xlsx' 
        : 'participants-deidentified.xlsx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      // CSV
      const headers = Object.keys(data[0] || {});
      const csv = convertToCSV(data, headers);
      const filename = identityLinked === 'true' 
        ? 'participants-identity-linked.csv' 
        : 'participants-deidentified.csv';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export participants'
    });
  }
};

/**
 * Export responses
 * GET /api/admin/export/responses?format=csv&identityLinked=false
 */
const exportResponses = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition, video } = req.query;
    
    const query = {};
    
    // Filter by condition
    if (condition) {
      const participants = await Participant.find({ condition }).distinct('_id');
      query.participant = { $in: participants };
    }
    
    // Filter by video
    if (video) {
      query.video = video;
    }
    
    const responses = await VideoResponse.find(query)
      .populate('participant', 'condition username name')
      .populate('video', 'title order')
      .sort({ submittedAt: 1 });
    
    // Prepare data
    const data = responses.map((r, index) => {
      const baseData = {
        responseId: `R${String(index + 1).padStart(4, '0')}`,
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        condition: r.participant?.condition || '',
        videoTitle: r.video?.title || '',
        videoOrder: r.video?.order || '',
        responseText: r.responseText,
        responseTime: r.responseTime || '',
        submittedAt: new Date(r.submittedAt).toISOString()
      };
      
      // Add identity fields only if authorized
      if (identityLinked === 'true') {
        return {
          ...baseData,
          participantName: r.participant?.name || '',
          participantUsername: r.participant?.username || ''
        };
      }
      
      return baseData;
    });
    
    if (format === 'xlsx' || format === 'excel') {
      const buffer = convertToExcel(data, 'Responses');
      const filename = identityLinked === 'true' 
        ? 'responses-identity-linked.xlsx' 
        : 'responses-deidentified.xlsx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const headers = Object.keys(data[0] || {});
      const csv = convertToCSV(data, headers);
      const filename = identityLinked === 'true' 
        ? 'responses-identity-linked.csv' 
        : 'responses-deidentified.csv';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export responses'
    });
  }
};

/**
 * Export codings
 * GET /api/admin/export/codings?format=csv
 */
const exportCodings = async (req, res) => {
  try {
    const { format = 'csv', condition, codingStatus } = req.query;
    
    let query = { coderRole: 'primary' };
    
    const codings = await Coding.find(query)
      .populate({
        path: 'response',
        populate: [
          { path: 'participant', select: 'condition' },
          { path: 'video', select: 'title order' }
        ]
      })
      .populate('codedBy', 'name username')
      .sort({ codedAt: 1 });
    
    // Filter by condition if specified
    let filteredCodings = codings;
    if (condition) {
      filteredCodings = codings.filter(c => c.response?.participant?.condition === condition);
    }
    
    // Prepare data
    const data = filteredCodings.map((c, index) => ({
      codingId: `C${String(index + 1).padStart(4, '0')}`,
      responseId: `R${String(index + 1).padStart(4, '0')}`,
      participantId: `P${String(index + 1).padStart(3, '0')}`,
      condition: c.response?.participant?.condition || '',
      videoTitle: c.response?.video?.title || '',
      videoOrder: c.response?.video?.order || '',
      sentiment: c.sentiment || '',
      aggressionLevel: c.aggression?.level !== undefined ? c.aggression.level : '',
      aggressionCategory: c.aggression?.category || '',
      cyberbullyingPresent: c.cyberbullying?.present !== undefined ? c.cyberbullying.present : '',
      cyberbullyingType: c.cyberbullying?.type || '',
      cyberbullyingSeverity: c.cyberbullying?.severity !== undefined ? c.cyberbullying.severity : '',
      notes: c.notes || '',
      coder: c.codedBy?.name || '',
      codingVersion: c.codingVersion || '',
      confidence: c.confidence || '',
      codedAt: new Date(c.codedAt).toISOString()
    }));
    
    if (format === 'xlsx' || format === 'excel') {
      const buffer = convertToExcel(data, 'Codings');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="codings.xlsx"');
      return res.send(buffer);
    } else {
      const headers = Object.keys(data[0] || {});
      const csv = convertToCSV(data, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="codings.csv"');
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export codings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export codings'
    });
  }
};

/**
 * Export combined research dataset
 * GET /api/admin/export/research-dataset?format=csv&identityLinked=false
 */
const exportResearchDataset = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition } = req.query;
    
    // Get all responses with full population
    let query = {};
    if (condition) {
      const participants = await Participant.find({ condition }).distinct('_id');
      query.participant = { $in: participants };
    }
    
    const responses = await VideoResponse.find(query)
      .populate('participant')
      .populate('video', 'title order topic')
      .sort({ submittedAt: 1 });
    
    // Get all codings
    const allCodings = await Coding.find({ coderRole: 'primary' })
      .populate('codedBy', 'name username');
    
    const codingMap = {};
    allCodings.forEach(c => {
      codingMap[c.response.toString()] = c;
    });
    
    // Combine data
    const data = responses.map((r, index) => {
      const coding = codingMap[r._id.toString()];
      const participant = r.participant;
      
      const baseData = {
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        condition: participant?.condition || '',
        participantStatus: participant?.status || '',
        videoTitle: r.video?.title || '',
        videoOrder: r.video?.order || '',
        videoTopic: r.video?.topic || '',
        responseText: r.responseText,
        responseTime: r.responseTime || '',
        submittedAt: new Date(r.submittedAt).toISOString(),
        coded: !!coding,
        sentiment: coding?.sentiment || '',
        aggressionLevel: coding?.aggression?.level !== undefined ? coding.aggression.level : '',
        aggressionCategory: coding?.aggression?.category || '',
        cyberbullyingPresent: coding?.cyberbullying?.present !== undefined ? coding.cyberbullying.present : '',
        cyberbullyingType: coding?.cyberbullying?.type || '',
        cyberbullyingSeverity: coding?.cyberbullying?.severity !== undefined ? coding.cyberbullying.severity : '',
        coder: coding?.codedBy?.name || '',
        codingVersion: coding?.codingVersion || '',
        codedAt: coding?.codedAt ? new Date(coding.codedAt).toISOString() : ''
      };
      
      // Add identity fields only if authorized
      if (identityLinked === 'true' && participant) {
        return {
          ...baseData,
          participantName: participant.name,
          participantUsername: participant.username,
          participantAge: participant.age,
          participantGender: participant.gender,
          participantUniversity: participant.university,
          participantDepartment: participant.department
        };
      }
      
      return baseData;
    });
    
    if (format === 'xlsx' || format === 'excel') {
      const buffer = convertToExcel(data, 'Research Dataset');
      const filename = identityLinked === 'true' 
        ? 'research-dataset-identity-linked.xlsx' 
        : 'research-dataset-deidentified.xlsx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const headers = Object.keys(data[0] || {});
      const csv = convertToCSV(data, headers);
      const filename = identityLinked === 'true' 
        ? 'research-dataset-identity-linked.csv' 
        : 'research-dataset-deidentified.csv';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export research dataset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export research dataset'
    });
  }
};

/**
 * Get data quality check
 * GET /api/admin/export/data-quality
 */
const getDataQuality = async (req, res) => {
  try {
    const issues = [];
    
    // Check for participants without condition
    const missingCondition = await Participant.countDocuments({ 
      condition: { $exists: false } 
    });
    if (missingCondition > 0) {
      issues.push({
        type: 'missing_condition',
        severity: 'high',
        count: missingCondition,
        message: `${missingCondition} participant(s) missing condition assignment`
      });
    }
    
    // Check for incomplete experiments
    const incompleteExperiments = await Participant.countDocuments({ 
      experimentStarted: true,
      experimentCompleted: false,
      status: { $ne: 'withdrawn' }
    });
    if (incompleteExperiments > 0) {
      issues.push({
        type: 'incomplete_experiment',
        severity: 'medium',
        count: incompleteExperiments,
        message: `${incompleteExperiments} participant(s) started but did not complete experiment`
      });
    }
    
    // Check for missing response text
    const missingResponseText = await VideoResponse.countDocuments({ 
      $or: [
        { responseText: { $exists: false } },
        { responseText: '' }
      ]
    });
    if (missingResponseText > 0) {
      issues.push({
        type: 'missing_response_text',
        severity: 'high',
        count: missingResponseText,
        message: `${missingResponseText} response(s) missing response text`
      });
    }
    
    // Check for uncoded responses
    const totalResponses = await VideoResponse.countDocuments();
    const codedResponses = await Coding.countDocuments({ coderRole: 'primary' });
    const uncodedCount = totalResponses - codedResponses;
    if (uncodedCount > 0) {
      issues.push({
        type: 'uncoded_responses',
        severity: 'low',
        count: uncodedCount,
        message: `${uncodedCount} response(s) not yet coded`
      });
    }
    
    // Check for duplicate responses (same participant + video)
    const duplicates = await VideoResponse.aggregate([
      {
        $group: {
          _id: { participant: '$participant', video: '$video' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_responses',
        severity: 'high',
        count: duplicates.length,
        message: `${duplicates.length} duplicate response record(s) detected`
      });
    }
    
    res.json({
      success: true,
      data: {
        hasIssues: issues.length > 0,
        issueCount: issues.length,
        issues,
        note: 'Review and address data quality issues before final export'
      }
    });
  } catch (error) {
    console.error('Data quality check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform data quality check'
    });
  }
};

module.exports = {
  exportParticipants,
  exportResponses,
  exportCodings,
  exportResearchDataset,
  getDataQuality
};
