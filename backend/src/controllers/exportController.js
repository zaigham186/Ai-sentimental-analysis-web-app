const { Participant, Video, VideoResponse, Coding } = require('../models');
const XLSX = require('xlsx');

/**
 * Export Controller
 * Comprehensive, Empirical Research Data Export for Supervisors and Inspectors
 * 
 * 1. Participant Data: All original student participant records with full demographics & study metrics
 * 2. Responses Data: Participant Name + student demographics + sequential stimulus responses
 * 3. Coding Data: Participant Name + student demographics + responses + qualitative/quantitative coding outcomes
 * 4. Combined Research Dataset: Primary master dataset combining Participant Demographics + Responses + Coding
 * 
 * DESIGN PRINCIPLES:
 * - Identified strictly by Participant Name & student profile (NO raw database IDs / ObjectIds / internal mongo hashes)
 * - Zero irrelevant technical metadata (no _id, __v, or ObjectId strings)
 * - 100% accurate database records consistent with the live Admin Panel
 * - Standardized human-readable dates ('YYYY-MM-DD HH:mm:ss') and title casing for academic review
 * - Available in both CSV and Microsoft Excel (.xlsx) formats
 */

// Helper: Format Date cleanly for Excel / CSV without raw ISO 'T' or '.000Z'
const formatDate = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Helper: Format Capitalized Title (e.g., 'male' -> 'Male', 'prefer_not_to_say' -> 'Prefer not to say')
const formatCapitalize = (val) => {
  if (!val) return '';
  const str = String(val).replace(/_/g, ' ').trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper: Calculate duration in minutes
const calculateDurationMinutes = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return '';
  return ((e - s) / 60000).toFixed(1);
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
 * All original details of each participant identified by Name & student demographics (No database IDs)
 */
const exportParticipants = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const query = {};
    if (condition) query.condition = condition;
    
    const participants = await Participant.find(query).sort({ name: 1, createdAt: 1 }).lean();
    
    // Aggregate response counts per participant
    const responseCounts = await VideoResponse.aggregate([
      { $group: { _id: '$participant', count: { $sum: 1 } } }
    ]);
    const responseCountMap = new Map(responseCounts.map(r => [r._id.toString(), r.count]));

    // Aggregate primary coded response counts per participant
    const codings = await Coding.find({ coderRole: 'primary' }).select('response').lean();
    const codedResponseIds = new Set(codings.map(c => c.response.toString()));
    
    const allResponses = await VideoResponse.find({}).select('_id participant').lean();
    const codedCountMap = new Map();
    for (const r of allResponses) {
      if (r.participant && codedResponseIds.has(r._id.toString())) {
        const pid = r.participant.toString();
        codedCountMap.set(pid, (codedCountMap.get(pid) || 0) + 1);
      }
    }
    
    const data = participants.map((p) => {
      const pid = p._id.toString();
      const responsesSubmitted = responseCountMap.get(pid) || 0;
      const responsesCoded = codedCountMap.get(pid) || 0;
      const durationMins = calculateDurationMinutes(p.experimentStartedAt, p.completedAt);
      
      return {
        'Participant Name': p.name || '',
        'Username': p.username || '',
        'Age': p.age ?? '',
        'Gender': formatCapitalize(p.gender),
        'University': p.university || '',
        'Department': p.department || '',
        'Assigned Condition': formatCapitalize(p.condition),
        'Condition Assigned': p.conditionAssigned ? 'Yes' : 'No',
        'Condition Assignment Date': formatDate(p.assignedAt),
        'Assignment Method': p.assignmentVersion || 'Standard',
        'Consent Given': p.consentGiven ? 'Yes' : 'No',
        'Consent Date': formatDate(p.consentAt),
        'Consent Form Version': p.consentVersion || '1.0',
        'Study Status': formatCapitalize(p.status),
        'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
        'Total Responses Submitted': responsesSubmitted,
        'Total Responses Coded': responsesCoded,
        'Registration Date': formatDate(p.createdAt),
        'Experiment Started Date': formatDate(p.experimentStartedAt),
        'Experiment Completed Date': formatDate(p.completedAt),
        'Study Duration (Minutes)': durationMins,
        'Withdrawal Status': p.withdrawalStatus ? 'Yes' : 'No',
        'Withdrawal Reason': p.withdrawalReason || '',
        'Withdrawal Date': formatDate(p.withdrawalDate)
      };
    });
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `participants_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
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
 * All original participant responses tied to Participant Name and demographics (No database IDs)
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
    
    // Fetch coded response set to indicate coding status accurately
    const codings = await Coding.find({ coderRole: 'primary' }).select('response').lean();
    const codedResponseIds = new Set(codings.map(c => c.response.toString()));

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
      'Age': r.participant?.age ?? '',
      'Gender': formatCapitalize(r.participant?.gender),
      'University': r.participant?.university || '',
      'Department': r.participant?.department || '',
      'Assigned Condition': formatCapitalize(r.participant?.condition),
      'Study Status': formatCapitalize(r.participant?.status),
      'Video Number': r.video?.order !== undefined ? r.video.order : '',
      'Video Title': r.video?.title || '',
      'Video Topic': r.video?.topic || '',
      'Response Text': r.responseText || '',
      'Response Word Count': r.responseWordCount ?? 0,
      'Response Character Length': r.responseLength ?? 0,
      'Response Time (Seconds)': r.responseTime ?? '',
      'Coding Status': codedResponseIds.has(r._id.toString()) ? 'Coded' : 'Uncoded',
      'Response Submitted Date': formatDate(r.submittedAt)
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
 * Participant Name + student demographics + video responses + qualitative/quantitative coding outcomes (No database IDs)
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
      'Age': c.response?.participant?.age ?? '',
      'Gender': formatCapitalize(c.response?.participant?.gender),
      'University': c.response?.participant?.university || '',
      'Department': c.response?.participant?.department || '',
      'Assigned Condition': formatCapitalize(c.response?.participant?.condition),
      'Video Number': c.response?.video?.order !== undefined ? c.response.video.order : '',
      'Video Title': c.response?.video?.title || '',
      'Video Topic': c.response?.video?.topic || '',
      'Response Text': c.response?.responseText || '',
      'Response Word Count': c.response?.responseWordCount ?? 0,
      'Response Time (Seconds)': c.response?.responseTime ?? '',
      'Response Submitted Date': formatDate(c.response?.submittedAt),
      'Sentiment': formatCapitalize(c.sentiment),
      'Sentiment Score': c.sentimentScore !== undefined && c.sentimentScore !== null ? c.sentimentScore : '',
      'Aggression Level (0-10)': c.aggression?.level !== undefined && c.aggression?.level !== null ? c.aggression.level : '',
      'Aggression Category': formatCapitalize(c.aggression?.category),
      'Aggression Score': c.aggression?.score !== undefined && c.aggression?.score !== null ? c.aggression.score : '',
      'Aggression Indicators': Array.isArray(c.aggression?.indicators) ? c.aggression.indicators.join('; ') : '',
      'Cyberbullying Present': c.cyberbullying?.present !== undefined && c.cyberbullying?.present !== null ? (c.cyberbullying.present ? 'Yes' : 'No') : '',
      'Cyberbullying Type': formatCapitalize(c.cyberbullying?.type),
      'Cyberbullying Severity (0-10)': c.cyberbullying?.severity !== undefined && c.cyberbullying?.severity !== null ? c.cyberbullying.severity : '',
      'Cyberbullying Score': c.cyberbullying?.score !== undefined && c.cyberbullying?.score !== null ? c.cyberbullying.score : '',
      'Cyberbullying Indicators': Array.isArray(c.cyberbullying?.indicators) ? c.cyberbullying.indicators.join('; ') : '',
      'Coding Confidence': formatCapitalize(c.confidence),
      'Coding Notes': c.notes || '',
      'Coder Name': c.codedBy?.name || 'Primary Researcher',
      'Coder Username': c.codedBy?.username || '',
      'Review Status': formatCapitalize(c.reviewStatus),
      'Reviewer Name': c.reviewedBy?.name || '',
      'Coding Framework Version': c.codingFrameworkVersion || '1.0',
      'Coded Date': formatDate(c.codedAt)
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
 * Comprehensive Primary Analysis Dataset: Student Details + Video Responses + Coding Results (No database IDs)
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

    // Pre-calculate coded counts per participant
    const codedCountMap = new Map();
    for (const [pid, pResps] of responsesByParticipant.entries()) {
      let coded = 0;
      for (const r of pResps) {
        if (codingsByResponse.has(r._id.toString())) {
          coded++;
        }
      }
      codedCountMap.set(pid, coded);
    }
    
    const data = [];
    
    for (const p of participants) {
      const pid = p._id.toString();
      const pResponses = responsesByParticipant.get(pid) || [];
      const responsesSubmitted = pResponses.length;
      const responsesCoded = codedCountMap.get(pid) || 0;
      const durationMins = calculateDurationMinutes(p.experimentStartedAt, p.completedAt);
      
      // Sort responses by video order
      pResponses.sort((a, b) => (a.video?.order ?? 999) - (b.video?.order ?? 999));
      
      if (pResponses.length > 0) {
        for (const r of pResponses) {
          const rid = r._id.toString();
          const coding = codingsByResponse.get(rid) || null;
          
          data.push({
            // Student / Participant Information
            'Participant Name': p.name || '',
            'Username': p.username || '',
            'Age': p.age ?? '',
            'Gender': formatCapitalize(p.gender),
            'University': p.university || '',
            'Department': p.department || '',
            'Assigned Condition': formatCapitalize(p.condition),
            'Study Status': formatCapitalize(p.status),
            'Consent Given': p.consentGiven ? 'Yes' : 'No',
            'Consent Date': formatDate(p.consentAt),
            'Consent Form Version': p.consentVersion || '1.0',
            'Condition Assigned Date': formatDate(p.assignedAt),
            'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
            'Total Responses Submitted': responsesSubmitted,
            'Total Responses Coded': responsesCoded,
            'Registration Date': formatDate(p.createdAt),
            'Experiment Started Date': formatDate(p.experimentStartedAt),
            'Experiment Completed Date': formatDate(p.completedAt),
            'Study Duration (Minutes)': durationMins,
            
            // Response Information
            'Video Number': r.video?.order !== undefined ? r.video.order : '',
            'Video Title': r.video?.title || '',
            'Video Topic': r.video?.topic || '',
            'Response Text': r.responseText || '',
            'Response Word Count': r.responseWordCount ?? 0,
            'Response Character Length': r.responseLength ?? 0,
            'Response Time (Seconds)': r.responseTime ?? '',
            'Response Submitted Date': formatDate(r.submittedAt),
            
            // Coding & Analysis Outcomes
            'Coding Status': coding ? 'CODED' : 'UNCODED',
            'Sentiment': coding ? formatCapitalize(coding.sentiment) : '',
            'Sentiment Score': coding?.sentimentScore !== undefined && coding?.sentimentScore !== null ? coding.sentimentScore : '',
            'Aggression Level (0-10)': coding?.aggression?.level !== undefined && coding?.aggression?.level !== null ? coding.aggression.level : '',
            'Aggression Category': coding?.aggression?.category ? formatCapitalize(coding.aggression.category) : '',
            'Aggression Score': coding?.aggression?.score !== undefined && coding?.aggression?.score !== null ? coding.aggression.score : '',
            'Aggression Indicators': Array.isArray(coding?.aggression?.indicators) ? coding.aggression.indicators.join('; ') : '',
            'Cyberbullying Present': coding?.cyberbullying?.present !== undefined && coding?.cyberbullying?.present !== null ? (coding.cyberbullying.present ? 'Yes' : 'No') : '',
            'Cyberbullying Type': coding?.cyberbullying?.type ? formatCapitalize(coding.cyberbullying.type) : '',
            'Cyberbullying Severity (0-10)': coding?.cyberbullying?.severity !== undefined && coding?.cyberbullying?.severity !== null ? coding.cyberbullying.severity : '',
            'Cyberbullying Score': coding?.cyberbullying?.score !== undefined && coding?.cyberbullying?.score !== null ? coding.cyberbullying.score : '',
            'Cyberbullying Indicators': Array.isArray(coding?.cyberbullying?.indicators) ? coding.cyberbullying.indicators.join('; ') : '',
            'Coding Confidence': coding ? formatCapitalize(coding.confidence) : '',
            'Coding Notes': coding?.notes || '',
            'Coder Name': coding?.codedBy?.name || (coding ? 'Primary Researcher' : ''),
            'Coder Username': coding?.codedBy?.username || '',
            'Review Status': coding ? formatCapitalize(coding.reviewStatus) : '',
            'Reviewer Name': coding?.reviewedBy?.name || '',
            'Coding Framework Version': coding?.codingFrameworkVersion || (coding ? '1.0' : ''),
            'Coded Date': coding ? formatDate(coding.codedAt) : ''
          });
        }
      } else {
        // Participant has no responses yet - retain student record with blank response and coding values
        data.push({
          'Participant Name': p.name || '',
          'Username': p.username || '',
          'Age': p.age ?? '',
          'Gender': formatCapitalize(p.gender),
          'University': p.university || '',
          'Department': p.department || '',
          'Assigned Condition': formatCapitalize(p.condition),
          'Study Status': formatCapitalize(p.status),
          'Consent Given': p.consentGiven ? 'Yes' : 'No',
          'Consent Date': formatDate(p.consentAt),
          'Consent Form Version': p.consentVersion || '1.0',
          'Condition Assigned Date': formatDate(p.assignedAt),
          'Completed Videos Count': Array.isArray(p.completedVideos) ? p.completedVideos.length : 0,
          'Total Responses Submitted': 0,
          'Total Responses Coded': 0,
          'Registration Date': formatDate(p.createdAt),
          'Experiment Started Date': formatDate(p.experimentStartedAt),
          'Experiment Completed Date': formatDate(p.completedAt),
          'Study Duration (Minutes)': '',
          
          'Video Number': '',
          'Video Title': '',
          'Video Topic': '',
          'Response Text': '',
          'Response Word Count': '',
          'Response Character Length': '',
          'Response Time (Seconds)': '',
          'Response Submitted Date': '',
          
          'Coding Status': 'UNCODED',
          'Sentiment': '',
          'Sentiment Score': '',
          'Aggression Level (0-10)': '',
          'Aggression Category': '',
          'Aggression Score': '',
          'Aggression Indicators': '',
          'Cyberbullying Present': '',
          'Cyberbullying Type': '',
          'Cyberbullying Severity (0-10)': '',
          'Cyberbullying Score': '',
          'Cyberbullying Indicators': '',
          'Coding Confidence': '',
          'Coding Notes': '',
          'Coder Name': '',
          'Coder Username': '',
          'Review Status': '',
          'Reviewer Name': '',
          'Coding Framework Version': '',
          'Coded Date': ''
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
        note: 'Review and address data quality issues before final supervisor export'
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
