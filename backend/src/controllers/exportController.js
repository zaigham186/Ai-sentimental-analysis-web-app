const { Participant, Video, VideoResponse, Coding } = require('../models');
const XLSX = require('xlsx');

/**
 * Export Controller
 * Comprehensive Research Data Export
 * 
 * 1. Participant Data: All participant records with complete database fields
 * 2. Responses Data: Participant Name + their responses (traceable, ordered by participant and video)
 * 3. Coding Data: Participant Name + Responses + Coding Results (Participant -> Response -> Coding)
 * 4. Combined Research Dataset: Complete participant journey combining Participant + Responses + Coding
 * 
 * Accurately connects records using MongoDB ObjectIds.
 * Preserves exact participant names consistently across all exports.
 * Removes de-identified export options as requested.
 */

// Helper to format Date
const formatDate = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString();
};

// Helper: Convert array of objects to CSV string
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) return (headers || []).join(',') + '\n';
  
  const actualHeaders = headers && headers.length > 0 ? headers : Object.keys(data[0]);
  const headerLine = actualHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
  
  const rows = data.map(row => {
    return actualHeaders.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      const strVal = String(value).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',');
  });
  
  return headerLine + '\n' + rows.join('\n');
};

// Helper: Convert array of objects to Excel buffer
const convertToExcel = (data, sheetName = 'Research Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * 1. Export participants
 * GET /api/admin/export/participants?format=csv
 * Contains all participant records from database with their real name and full demographics.
 */
const exportParticipants = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const query = {};
    if (condition) query.condition = condition;
    
    const participants = await Participant.find(query).sort({ name: 1, createdAt: 1 });
    
    const data = participants.map((p) => ({
      'Participant Name': p.name || '',
      'Username': p.username || '',
      'Age': p.age ?? '',
      'Gender': p.gender || '',
      'University': p.university || '',
      'Department': p.department || '',
      'Condition': p.condition || '',
      'Condition Assigned': p.conditionAssigned ? 'Yes' : 'No',
      'Assigned At': formatDate(p.assignedAt),
      'Assignment Version': p.assignmentVersion || '',
      'Consent Given': p.consentGiven ? 'Yes' : 'No',
      'Consent Date': formatDate(p.consentAt),
      'Consent Version': p.consentVersion || '',
      'Study Status': p.status || '',
      'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
      'Experiment Started At': formatDate(p.experimentStartedAt),
      'Completed At': formatDate(p.completedAt),
      'Withdrawal Status': p.withdrawalStatus ? 'Yes' : 'No',
      'Withdrawal Reason': p.withdrawalReason || '',
      'Withdrawal Date': formatDate(p.withdrawalDate),
      'Registered Date': formatDate(p.createdAt),
      'Participant Database ID': p._id.toString()
    }));
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `participant_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Participants');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
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
 * 2. Export responses
 * GET /api/admin/export/responses?format=csv
 * Contains participant names and their actual responses, accurately connected.
 */
const exportResponses = async (req, res) => {
  try {
    const { format = 'csv', condition, video } = req.query;
    
    const query = {};
    if (condition) {
      const matchingPids = await Participant.find({ condition }).distinct('_id');
      query.participant = { $in: matchingPids };
    }
    if (video) {
      query.video = video;
    }
    
    const allResponses = await VideoResponse.find(query)
      .populate('participant')
      .populate('video')
      .sort({ createdAt: 1 });
    
    // Filter out any orphaned records where participant does not exist
    const responses = allResponses.filter(r => r.participant && (r.participant.name || r.participant.username));
    
    // Sort primarily by Participant Name, secondarily by Video Order
    responses.sort((a, b) => {
      const nameA = (a.participant?.name || '').toLowerCase();
      const nameB = (b.participant?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      const orderA = a.video?.order ?? 999;
      const orderB = b.video?.order ?? 999;
      return orderA - orderB;
    });
    
    const data = responses.map((r) => ({
      'Participant Name': r.participant?.name || '',
      'Username': r.participant?.username || '',
      'Participant Database ID': r.participant?._id?.toString() || '',
      'Condition': r.participant?.condition || '',
      'Video Number': r.video?.order !== undefined ? r.video.order : '',
      'Video Title': r.video?.title || '',
      'Video Topic': r.video?.topic || '',
      'Response Text': r.responseText || '',
      'Response Word Count': r.responseWordCount ?? 0,
      'Response Character Length': r.responseLength ?? 0,
      'Response Time (seconds)': r.responseTime ?? '',
      'Submitted At': formatDate(r.submittedAt),
      'Response Database ID': r._id.toString()
    }));
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `responses_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Responses');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
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
 * 3. Export codings
 * GET /api/admin/export/codings?format=csv
 * Contains Participant Name + Responses + Coding Results (Participant -> Response -> Coding)
 */
const exportCodings = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const codings = await Coding.find({ coderRole: 'primary' })
      .populate({
        path: 'response',
        populate: [
          { path: 'participant' },
          { path: 'video' }
        ]
      })
      .populate('codedBy', 'name username')
      .populate('reviewedBy', 'name username')
      .sort({ codedAt: 1 });
    
    let filteredCodings = codings;
    if (condition) {
      filteredCodings = codings.filter(c => c.response?.participant?.condition === condition);
    }
    
    // Filter out any orphaned records where response or participant does not exist
    const validCodings = filteredCodings.filter(c => c.response && c.response.participant && (c.response.participant.name || c.response.participant.username));

    // Sort primarily by Participant Name, secondarily by Video Order
    validCodings.sort((a, b) => {
      const nameA = (a.response?.participant?.name || '').toLowerCase();
      const nameB = (b.response?.participant?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      const orderA = a.response?.video?.order ?? 999;
      const orderB = b.response?.video?.order ?? 999;
      return orderA - orderB;
    });
    
    const data = validCodings.map((c) => ({
      'Participant Name': c.response?.participant?.name || '',
      'Username': c.response?.participant?.username || '',
      'Participant Database ID': c.response?.participant?._id?.toString() || '',
      'Condition': c.response?.participant?.condition || '',
      'Video Number': c.response?.video?.order !== undefined ? c.response.video.order : '',
      'Video Title': c.response?.video?.title || '',
      'Video Topic': c.response?.video?.topic || '',
      'Response Text': c.response?.responseText || '',
      'Response Submitted At': formatDate(c.response?.submittedAt),
      'Response Database ID': c.response?._id?.toString() || '',
      'Sentiment': c.sentiment || '',
      'Sentiment Score': c.sentimentScore !== undefined && c.sentimentScore !== null ? c.sentimentScore : '',
      'Aggression Level': c.aggression?.level !== undefined && c.aggression?.level !== null ? c.aggression.level : '',
      'Aggression Category': c.aggression?.category || '',
      'Aggression Score': c.aggression?.score !== undefined && c.aggression?.score !== null ? c.aggression.score : '',
      'Aggression Indicators': Array.isArray(c.aggression?.indicators) ? c.aggression.indicators.join('; ') : '',
      'Cyberbullying Present': c.cyberbullying?.present !== undefined && c.cyberbullying?.present !== null ? (c.cyberbullying.present ? 'Yes' : 'No') : '',
      'Cyberbullying Type': c.cyberbullying?.type || '',
      'Cyberbullying Severity': c.cyberbullying?.severity !== undefined && c.cyberbullying?.severity !== null ? c.cyberbullying.severity : '',
      'Cyberbullying Score': c.cyberbullying?.score !== undefined && c.cyberbullying?.score !== null ? c.cyberbullying.score : '',
      'Cyberbullying Indicators': Array.isArray(c.cyberbullying?.indicators) ? c.cyberbullying.indicators.join('; ') : '',
      'Coding Confidence': c.confidence || '',
      'Coding Notes': c.notes || '',
      'Coder Name': c.codedBy?.name || '',
      'Coder Username': c.codedBy?.username || '',
      'Review Status': c.reviewStatus || '',
      'Reviewer Name': c.reviewedBy?.name || '',
      'Coding Version': c.codingVersion || '',
      'Coded At': formatDate(c.codedAt),
      'Coding Database ID': c._id.toString()
    }));
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `coding_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Coding Data');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
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
 * 4. Export combined research dataset
 * GET /api/admin/export/research-dataset?format=csv
 * Complete research record for every participant: Participant Data + Responses + Coding Data
 */
const exportResearchDataset = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const participantQuery = {};
    if (condition) {
      participantQuery.condition = condition;
    }
    
    const participants = await Participant.find(participantQuery).sort({ name: 1, createdAt: 1 }).lean();
    
    // Fetch all responses and codings
    const allResponses = await VideoResponse.find({})
      .populate('video')
      .lean();
    
    const allCodings = await Coding.find({ coderRole: 'primary' })
      .populate('codedBy', 'name username')
      .populate('reviewedBy', 'name username')
      .lean();
    
    // Map responses by participant ID
    const responsesByParticipant = new Map();
    for (const r of allResponses) {
      const pid = r.participant ? r.participant.toString() : null;
      if (pid) {
        if (!responsesByParticipant.has(pid)) {
          responsesByParticipant.set(pid, []);
        }
        responsesByParticipant.get(pid).push(r);
      }
    }
    
    // Map codings by response ID
    const codingsByResponse = new Map();
    for (const c of allCodings) {
      const rid = c.response ? c.response.toString() : null;
      if (rid) {
        codingsByResponse.set(rid, c);
      }
    }
    
    const data = [];
    
    for (const p of participants) {
      const pid = p._id.toString();
      const pResponses = responsesByParticipant.get(pid) || [];
      
      // Sort responses by video order
      pResponses.sort((a, b) => (a.video?.order ?? 999) - (b.video?.order ?? 999));
      
      if (pResponses.length > 0) {
        for (const r of pResponses) {
          const rid = r._id.toString();
          const coding = codingsByResponse.get(rid) || null;
          
          data.push({
            // Participant Information
            'Participant Name': p.name || '',
            'Username': p.username || '',
            'Age': p.age ?? '',
            'Gender': p.gender || '',
            'University': p.university || '',
            'Department': p.department || '',
            'Condition': p.condition || '',
            'Study Status': p.status || '',
            'Consent Given': p.consentGiven ? 'Yes' : 'No',
            'Consent Date': formatDate(p.consentAt),
            'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
            'Experiment Started At': formatDate(p.experimentStartedAt),
            'Completed At': formatDate(p.completedAt),
            'Participant Database ID': pid,
            
            // Response Information
            'Video Number': r.video?.order !== undefined ? r.video.order : '',
            'Video Title': r.video?.title || '',
            'Video Topic': r.video?.topic || '',
            'Response Text': r.responseText || '',
            'Response Word Count': r.responseWordCount ?? 0,
            'Response Character Length': r.responseLength ?? 0,
            'Response Time (seconds)': r.responseTime ?? '',
            'Response Submitted At': formatDate(r.submittedAt),
            'Response Database ID': rid,
            
            // Coding Information
            'Coding Status': coding ? 'CODED' : 'UNCODED',
            'Sentiment': coding?.sentiment || '',
            'Sentiment Score': coding?.sentimentScore !== undefined && coding?.sentimentScore !== null ? coding.sentimentScore : '',
            'Aggression Level': coding?.aggression?.level !== undefined && coding?.aggression?.level !== null ? coding.aggression.level : '',
            'Aggression Category': coding?.aggression?.category || '',
            'Aggression Score': coding?.aggression?.score !== undefined && coding?.aggression?.score !== null ? coding.aggression.score : '',
            'Aggression Indicators': Array.isArray(coding?.aggression?.indicators) ? coding.aggression.indicators.join('; ') : '',
            'Cyberbullying Present': coding?.cyberbullying?.present !== undefined && coding?.cyberbullying?.present !== null ? (coding.cyberbullying.present ? 'Yes' : 'No') : '',
            'Cyberbullying Type': coding?.cyberbullying?.type || '',
            'Cyberbullying Severity': coding?.cyberbullying?.severity !== undefined && coding?.cyberbullying?.severity !== null ? coding.cyberbullying.severity : '',
            'Cyberbullying Score': coding?.cyberbullying?.score !== undefined && coding?.cyberbullying?.score !== null ? coding.cyberbullying.score : '',
            'Cyberbullying Indicators': Array.isArray(coding?.cyberbullying?.indicators) ? coding.cyberbullying.indicators.join('; ') : '',
            'Coding Confidence': coding?.confidence || '',
            'Coding Notes': coding?.notes || '',
            'Coder Name': coding?.codedBy?.name || '',
            'Coder Username': coding?.codedBy?.username || '',
            'Review Status': coding?.reviewStatus || '',
            'Reviewer Name': coding?.reviewedBy?.name || '',
            'Coding Version': coding?.codingVersion || '',
            'Coded At': formatDate(coding?.codedAt),
            'Coding Database ID': coding ? coding._id.toString() : ''
          });
        }
      } else {
        // Participant has no responses yet - retain participant row with blank response and coding values
        data.push({
          'Participant Name': p.name || '',
          'Username': p.username || '',
          'Age': p.age ?? '',
          'Gender': p.gender || '',
          'University': p.university || '',
          'Department': p.department || '',
          'Condition': p.condition || '',
          'Study Status': p.status || '',
          'Consent Given': p.consentGiven ? 'Yes' : 'No',
          'Consent Date': formatDate(p.consentAt),
          'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
          'Experiment Started At': formatDate(p.experimentStartedAt),
          'Completed At': formatDate(p.completedAt),
          'Participant Database ID': pid,
          
          'Video Number': '',
          'Video Title': '',
          'Video Topic': '',
          'Response Text': '',
          'Response Word Count': '',
          'Response Character Length': '',
          'Response Time (seconds)': '',
          'Response Submitted At': '',
          'Response Database ID': '',
          
          'Coding Status': 'UNCODED',
          'Sentiment': '',
          'Sentiment Score': '',
          'Aggression Level': '',
          'Aggression Category': '',
          'Aggression Score': '',
          'Aggression Indicators': '',
          'Cyberbullying Present': '',
          'Cyberbullying Type': '',
          'Cyberbullying Severity': '',
          'Cyberbullying Score': '',
          'Cyberbullying Indicators': '',
          'Coding Confidence': '',
          'Coding Notes': '',
          'Coder Name': '',
          'Coder Username': '',
          'Review Status': '',
          'Reviewer Name': '',
          'Coding Version': '',
          'Coded At': '',
          'Coding Database ID': ''
        });
      }
    }
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `combined_research_dataset_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Combined Research Dataset');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
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
