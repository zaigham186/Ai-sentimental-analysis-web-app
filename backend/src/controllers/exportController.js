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
 * UPDATED: Now includes all participant data with their name
 */
const exportParticipants = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition } = req.query;
    
    const query = {};
    if (condition) query.condition = condition;
    
    const participants = await Participant.find(query).sort({ createdAt: 1 });
    
    // Prepare data - Always include participant name as required
    const data = participants.map((p, index) => {
      const participantData = {
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        name: p.name || '', // ALWAYS include name
        username: p.username || '',
        age: p.age || '',
        gender: p.gender || '',
        university: p.university || '',
        department: p.department || '',
        condition: p.condition || '',
        status: p.status || '',
        consentGiven: p.consentGiven !== undefined ? p.consentGiven : false,
        consentDate: p.consentAt ? new Date(p.consentAt).toISOString() : '',
        consentVersion: p.consentVersion || '',
        conditionAssigned: p.conditionAssigned !== undefined ? p.conditionAssigned : false,
        assignedAt: p.assignedAt ? new Date(p.assignedAt).toISOString() : '',
        experimentStartedAt: p.experimentStartedAt ? new Date(p.experimentStartedAt).toISOString() : '',
        completedAt: p.completedAt ? new Date(p.completedAt).toISOString() : '',
        completedVideosCount: p.completedVideos ? p.completedVideos.length : 0,
        withdrawalStatus: p.withdrawalStatus !== undefined ? p.withdrawalStatus : false,
        withdrawalReason: p.withdrawalReason || '',
        withdrawalDate: p.withdrawalDate ? new Date(p.withdrawalDate).toISOString() : '',
        createdAt: new Date(p.createdAt).toISOString(),
        updatedAt: new Date(p.updatedAt).toISOString()
      };
      
      // For de-identified, remove personally identifiable information
      if (identityLinked === 'false') {
        delete participantData.name;
        delete participantData.username;
      }
      
      return participantData;
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
 * UPDATED: Now includes participant name along with their responses
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
      .populate('participant', 'condition username name age gender university department')
      .populate('video', 'title order topic')
      .sort({ submittedAt: 1 });
    
    // Prepare data - Always include participant name with responses
    const data = responses.map((r, index) => {
      const responseData = {
        responseId: `R${String(index + 1).padStart(4, '0')}`,
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        participantName: r.participant?.name || '', // ALWAYS include name
        participantUsername: r.participant?.username || '',
        participantAge: r.participant?.age || '',
        participantGender: r.participant?.gender || '',
        participantUniversity: r.participant?.university || '',
        participantDepartment: r.participant?.department || '',
        condition: r.participant?.condition || '',
        videoTitle: r.video?.title || '',
        videoOrder: r.video?.order || '',
        videoTopic: r.video?.topic || '',
        responseText: r.responseText || '',
        responseLength: r.responseLength || 0,
        responseWordCount: r.responseWordCount || 0,
        responseTime: r.responseTime || '',
        submittedAt: new Date(r.submittedAt).toISOString()
      };
      
      // For de-identified, remove personally identifiable information
      if (identityLinked === 'false') {
        delete responseData.participantName;
        delete responseData.participantUsername;
        delete responseData.participantAge;
        delete responseData.participantGender;
        delete responseData.participantUniversity;
        delete responseData.participantDepartment;
      }
      
      return responseData;
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
 * UPDATED: Now includes participant name + their responses + coding results
 */
const exportCodings = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition, codingStatus } = req.query;
    
    let query = { coderRole: 'primary' };
    
    const codings = await Coding.find(query)
      .populate({
        path: 'response',
        populate: [
          { path: 'participant', select: 'condition name username age gender university department' },
          { path: 'video', select: 'title order topic' }
        ]
      })
      .populate('codedBy', 'name username')
      .sort({ codedAt: 1 });
    
    // Filter by condition if specified
    let filteredCodings = codings;
    if (condition) {
      filteredCodings = codings.filter(c => c.response?.participant?.condition === condition);
    }
    
    // Prepare data - Include participant name, responses, then coding results
    const data = filteredCodings.map((c, index) => {
      const codingData = {
        codingId: `C${String(index + 1).padStart(4, '0')}`,
        responseId: `R${String(index + 1).padStart(4, '0')}`,
        participantId: `P${String(index + 1).padStart(3, '0')}`,
        // Participant Information
        participantName: c.response?.participant?.name || '',
        participantUsername: c.response?.participant?.username || '',
        participantAge: c.response?.participant?.age || '',
        participantGender: c.response?.participant?.gender || '',
        participantUniversity: c.response?.participant?.university || '',
        participantDepartment: c.response?.participant?.department || '',
        condition: c.response?.participant?.condition || '',
        // Video Information
        videoTitle: c.response?.video?.title || '',
        videoOrder: c.response?.video?.order || '',
        videoTopic: c.response?.video?.topic || '',
        // Response Information
        responseText: c.response?.responseText || '',
        responseLength: c.response?.responseLength || 0,
        responseWordCount: c.response?.responseWordCount || 0,
        responseTime: c.response?.responseTime || '',
        responseSubmittedAt: c.response?.submittedAt ? new Date(c.response.submittedAt).toISOString() : '',
        // Coding Results
        sentiment: c.sentiment || '',
        aggressionLevel: c.aggression?.level !== undefined ? c.aggression.level : '',
        aggressionCategory: c.aggression?.category || '',
        aggressionIndicators: c.aggression?.indicators ? c.aggression.indicators.join('; ') : '',
        cyberbullyingPresent: c.cyberbullying?.present !== undefined ? c.cyberbullying.present : '',
        cyberbullyingType: c.cyberbullying?.type || '',
        cyberbullyingSeverity: c.cyberbullying?.severity !== undefined ? c.cyberbullying.severity : '',
        cyberbullyingIndicators: c.cyberbullying?.indicators ? c.cyberbullying.indicators.join('; ') : '',
        notes: c.notes || '',
        coder: c.codedBy?.name || '',
        coderUsername: c.codedBy?.username || '',
        codingVersion: c.codingVersion || '',
        confidence: c.confidence || '',
        codedAt: new Date(c.codedAt).toISOString()
      };
      
      // For de-identified, remove personally identifiable information
      if (identityLinked === 'false') {
        delete codingData.participantName;
        delete codingData.participantUsername;
        delete codingData.participantAge;
        delete codingData.participantGender;
        delete codingData.participantUniversity;
        delete codingData.participantDepartment;
      }
      
      return codingData;
    });
    
    if (format === 'xlsx' || format === 'excel') {
      const buffer = convertToExcel(data, 'Codings');
      const filename = identityLinked === 'true' 
        ? 'codings-identity-linked.xlsx' 
        : 'codings-deidentified.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const headers = Object.keys(data[0] || {});
      const csv = convertToCSV(data, headers);
      const filename = identityLinked === 'true' 
        ? 'codings-identity-linked.csv' 
        : 'codings-deidentified.csv';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
 * UPDATED: Comprehensive dataset with participant name + all responses + all coding data
 * This is the complete participant journey with all their data
 */
const exportResearchDataset = async (req, res) => {
  try {
    const { format = 'csv', identityLinked = 'false', condition } = req.query;
    
    // Get all participants with optional condition filter
    let participantQuery = {};
    if (condition) {
      participantQuery.condition = condition;
    }
    
    const participants = await Participant.find(participantQuery).sort({ createdAt: 1 });
    
    // Get all responses
    const allResponses = await VideoResponse.find({})
      .populate('participant', '_id name username age gender university department condition status')
      .populate('video', 'title order topic')
      .lean();
    
    // Get all codings
    const allCodings = await Coding.find({ coderRole: 'primary' })
      .populate('codedBy', 'name username')
      .lean();
    
    // Create maps for efficient lookup
    const responsesByParticipant = {};
    allResponses.forEach(r => {
      const participantId = r.participant?._id?.toString();
      if (participantId) {
        if (!responsesByParticipant[participantId]) {
          responsesByParticipant[participantId] = [];
        }
        responsesByParticipant[participantId].push(r);
      }
    });
    
    const codingsByResponse = {};
    allCodings.forEach(c => {
      const responseId = c.response?.toString();
      if (responseId) {
        codingsByResponse[responseId] = c;
      }
    });
    
    // Build comprehensive dataset - one row per response with full participant data
    const data = [];
    let responseCounter = 0;
    
    participants.forEach((participant, pIndex) => {
      const participantId = participant._id.toString();
      const responses = responsesByParticipant[participantId] || [];
      
      // If participant has responses, create one row per response
      if (responses.length > 0) {
        responses.forEach(response => {
          responseCounter++;
          const coding = codingsByResponse[response._id.toString()];
          
          const rowData = {
            // IDs
            recordId: `REC${String(responseCounter).padStart(4, '0')}`,
            participantId: `P${String(pIndex + 1).padStart(3, '0')}`,
            responseId: `R${String(responseCounter).padStart(4, '0')}`,
            codingId: coding ? `C${String(responseCounter).padStart(4, '0')}` : '',
            
            // Participant Demographics (FULL DATA)
            participantName: participant.name || '',
            participantUsername: participant.username || '',
            participantAge: participant.age || '',
            participantGender: participant.gender || '',
            participantUniversity: participant.university || '',
            participantDepartment: participant.department || '',
            
            // Participant Study Info
            condition: participant.condition || '',
            participantStatus: participant.status || '',
            consentGiven: participant.consentGiven !== undefined ? participant.consentGiven : false,
            consentDate: participant.consentAt ? new Date(participant.consentAt).toISOString() : '',
            experimentStartedAt: participant.experimentStartedAt ? new Date(participant.experimentStartedAt).toISOString() : '',
            completedAt: participant.completedAt ? new Date(participant.completedAt).toISOString() : '',
            completedVideosCount: participant.completedVideos ? participant.completedVideos.length : 0,
            
            // Video Information
            videoTitle: response.video?.title || '',
            videoOrder: response.video?.order || '',
            videoTopic: response.video?.topic || '',
            
            // Response Data (FULL RESPONSE)
            responseText: response.responseText || '',
            responseLength: response.responseLength || 0,
            responseWordCount: response.responseWordCount || 0,
            responseTime: response.responseTime || '',
            responseSubmittedAt: response.submittedAt ? new Date(response.submittedAt).toISOString() : '',
            
            // Coding Status
            coded: !!coding,
            
            // Coding Results (ALL CODING DATA)
            sentiment: coding?.sentiment || '',
            sentimentScore: coding?.sentimentScore !== undefined ? coding.sentimentScore : '',
            
            aggressionLevel: coding?.aggression?.level !== undefined ? coding.aggression.level : '',
            aggressionCategory: coding?.aggression?.category || '',
            aggressionScore: coding?.aggression?.score !== undefined ? coding.aggression.score : '',
            aggressionIndicators: coding?.aggression?.indicators ? coding.aggression.indicators.join('; ') : '',
            
            cyberbullyingPresent: coding?.cyberbullying?.present !== undefined ? coding.cyberbullying.present : '',
            cyberbullyingType: coding?.cyberbullying?.type || '',
            cyberbullyingSeverity: coding?.cyberbullying?.severity !== undefined ? coding.cyberbullying.severity : '',
            cyberbullyingIndicators: coding?.cyberbullying?.indicators ? coding.cyberbullying.indicators.join('; ') : '',
            
            // Coding Metadata
            codingNotes: coding?.notes || '',
            coder: coding?.codedBy?.name || '',
            coderUsername: coding?.codedBy?.username || '',
            codingVersion: coding?.codingVersion || '',
            codingConfidence: coding?.confidence || '',
            codedAt: coding?.codedAt ? new Date(coding.codedAt).toISOString() : ''
          };
          
          // For de-identified, remove personally identifiable information
          if (identityLinked === 'false') {
            delete rowData.participantName;
            delete rowData.participantUsername;
            delete rowData.participantAge;
            delete rowData.participantGender;
            delete rowData.participantUniversity;
            delete rowData.participantDepartment;
          }
          
          data.push(rowData);
        });
      } else {
        // Participant has no responses - include their info anyway
        const rowData = {
          recordId: `REC${String(responseCounter + 1).padStart(4, '0')}`,
          participantId: `P${String(pIndex + 1).padStart(3, '0')}`,
          responseId: '',
          codingId: '',
          
          // Participant Demographics
          participantName: participant.name || '',
          participantUsername: participant.username || '',
          participantAge: participant.age || '',
          participantGender: participant.gender || '',
          participantUniversity: participant.university || '',
          participantDepartment: participant.department || '',
          
          // Participant Study Info
          condition: participant.condition || '',
          participantStatus: participant.status || '',
          consentGiven: participant.consentGiven !== undefined ? participant.consentGiven : false,
          consentDate: participant.consentAt ? new Date(participant.consentAt).toISOString() : '',
          experimentStartedAt: participant.experimentStartedAt ? new Date(participant.experimentStartedAt).toISOString() : '',
          completedAt: participant.completedAt ? new Date(participant.completedAt).toISOString() : '',
          completedVideosCount: participant.completedVideos ? participant.completedVideos.length : 0,
          
          // Empty response and coding fields
          videoTitle: '',
          videoOrder: '',
          videoTopic: '',
          responseText: '',
          responseLength: 0,
          responseWordCount: 0,
          responseTime: '',
          responseSubmittedAt: '',
          coded: false,
          sentiment: '',
          sentimentScore: '',
          aggressionLevel: '',
          aggressionCategory: '',
          aggressionScore: '',
          aggressionIndicators: '',
          cyberbullyingPresent: '',
          cyberbullyingType: '',
          cyberbullyingSeverity: '',
          cyberbullyingIndicators: '',
          codingNotes: '',
          coder: '',
          coderUsername: '',
          codingVersion: '',
          codingConfidence: '',
          codedAt: ''
        };
        
        // For de-identified, remove personally identifiable information
        if (identityLinked === 'false') {
          delete rowData.participantName;
          delete rowData.participantUsername;
          delete rowData.participantAge;
          delete rowData.participantGender;
          delete rowData.participantUniversity;
          delete rowData.participantDepartment;
        }
        
        data.push(rowData);
      }
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
