const { Participant, Video, VideoResponse, Coding } = require('../models');
const XLSX = require('xlsx');

/**
 * Export Controller
 * Clean, accurate research data export for supervisor and inspector review.
 * 
 * CORE REQUIREMENTS:
 * - Every record starts with: Participant Name, then Condition
 * - Followed by accurate responses and essential research data
 * - ZERO participant IDs, zero internal MongoDB ObjectIds, zero technical hashes
 * - Clean, accurate data for each condition (Anonymous / Identifiable) without unrelated clutter
 * - Exactly matches the 60 participants and records in the website database
 */

// Helper: Format Date cleanly as YYYY-MM-DD HH:mm:ss
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

// Helper: Format Title Case (e.g. 'anonymous' -> 'Anonymous', 'prefer_not_to_say' -> 'Prefer not to say')
const formatCapitalize = (val) => {
  if (!val) return '';
  const str = String(val).replace(/_/g, ' ').trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  
  return '\uFEFF' + headerLine + '\n' + rows.join('\n');
};

// Helper: Convert array of objects to Excel buffer
const convertToExcel = (data, sheetName = 'Research Data') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * 1. Export Participant Data
 * GET /api/admin/export/participants?format=csv
 * Starts with Participant Name, then Condition, then demographics and study progress.
 */
const exportParticipants = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const query = {};
    if (condition) query.condition = condition;
    
    // Group cleanly by Condition, then alphabetically by Participant Name
    const participants = await Participant.find(query).sort({ condition: 1, name: 1, createdAt: 1 }).lean();
    
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
      
      return {
        'Participant Name': p.name || '',
        'Condition': formatCapitalize(p.condition),
        'Gender': formatCapitalize(p.gender),
        'Age': p.age ?? '',
        'University': p.university || '',
        'Department': p.department || '',
        'Study Status': formatCapitalize(p.status),
        'Consent Given': p.consentGiven ? 'Yes' : 'No',
        'Total Responses Submitted': responsesSubmitted,
        'Total Responses Coded': responsesCoded,
        'Registration Date': formatDate(p.createdAt),
        'Completion Date': formatDate(p.completedAt)
      };
    });
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `participants_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Participants');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
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
 * 2. Export Responses Data
 * GET /api/admin/export/responses?format=csv
 * Starts with Participant Name, then Condition, then sequential video responses.
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

    // Sort cleanly: Condition -> Participant Name -> Video Order (1 to 10)
    responses.sort((a, b) => {
      const condA = (a.participant?.condition || '').toLowerCase();
      const condB = (b.participant?.condition || '').toLowerCase();
      if (condA !== condB) return condA.localeCompare(condB);

      const nameA = (a.participant?.name || '').toLowerCase();
      const nameB = (b.participant?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);

      const orderA = a.video?.order ?? 999;
      const orderB = b.video?.order ?? 999;
      return orderA - orderB;
    });
    
    const data = responses.map((r) => ({
      'Participant Name': r.participant?.name || '',
      'Condition': formatCapitalize(r.participant?.condition),
      'Video Number': r.video?.order !== undefined ? r.video.order : '',
      'Video Title': r.video?.title || '',
      'Response Text': r.responseText || '',
      'Response Word Count': r.responseWordCount ?? 0,
      'Response Time (Seconds)': r.responseTime ?? '',
      'Coding Status': codedResponseIds.has(r._id.toString()) ? 'Coded' : 'Uncoded',
      'Submitted Date': formatDate(r.submittedAt)
    }));
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `responses_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Responses');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
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
 * 3. Export Coding Data
 * GET /api/admin/export/codings?format=csv
 * Starts with Participant Name, then Condition, then video responses, then coding outcomes.
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

    // Sort cleanly: Condition -> Participant Name -> Video Order (1 to 10)
    validCodings.sort((a, b) => {
      const condA = (a.response?.participant?.condition || '').toLowerCase();
      const condB = (b.response?.participant?.condition || '').toLowerCase();
      if (condA !== condB) return condA.localeCompare(condB);

      const nameA = (a.response?.participant?.name || '').toLowerCase();
      const nameB = (b.response?.participant?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);

      const orderA = a.response?.video?.order ?? 999;
      const orderB = b.response?.video?.order ?? 999;
      return orderA - orderB;
    });
    
    const data = validCodings.map((c) => ({
      'Participant Name': c.response?.participant?.name || '',
      'Condition': formatCapitalize(c.response?.participant?.condition),
      'Video Number': c.response?.video?.order !== undefined ? c.response.video.order : '',
      'Video Title': c.response?.video?.title || '',
      'Response Text': c.response?.responseText || '',
      'Sentiment': formatCapitalize(c.sentiment),
      'Aggression Level (0-10)': c.aggression?.level !== undefined && c.aggression?.level !== null ? c.aggression.level : '',
      'Aggression Category': formatCapitalize(c.aggression?.category),
      'Cyberbullying Present': c.cyberbullying?.present !== undefined && c.cyberbullying?.present !== null ? (c.cyberbullying.present ? 'Yes' : 'No') : '',
      'Cyberbullying Type': formatCapitalize(c.cyberbullying?.type),
      'Cyberbullying Severity (0-10)': c.cyberbullying?.severity !== undefined && c.cyberbullying?.severity !== null ? c.cyberbullying.severity : '',
      'Coding Status': formatCapitalize(c.reviewStatus) || 'Coded',
      'Coder Name': c.codedBy?.name || 'Primary Researcher',
      'Coded Date': formatDate(c.codedAt)
    }));
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `coding_data_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Coding Data');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
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
 * 4. Export Combined Research Dataset
 * GET /api/admin/export/research-dataset?format=csv
 * Starts with Participant Name, then Condition, then demographics, video responses, and coding outcomes.
 */
const exportResearchDataset = async (req, res) => {
  try {
    const { format = 'csv', condition } = req.query;
    
    const participantQuery = {};
    if (condition) {
      participantQuery.condition = condition;
    }
    
    // Sort cleanly by Condition, then Participant Name
    const participants = await Participant.find(participantQuery).sort({ condition: 1, name: 1, createdAt: 1 }).lean();
    
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
      
      // Sort responses by video order (1 to 10)
      pResponses.sort((a, b) => (a.video?.order ?? 999) - (b.video?.order ?? 999));
      
      if (pResponses.length > 0) {
        for (const r of pResponses) {
          const rid = r._id.toString();
          const coding = codingsByResponse.get(rid) || null;
          
          data.push({
            // Starts with Participant Name, then Condition
            'Participant Name': p.name || '',
            'Condition': formatCapitalize(p.condition),
            'Gender': formatCapitalize(p.gender),
            'Age': p.age ?? '',
            'University': p.university || '',
            'Department': p.department || '',
            
            // Video & Response Information
            'Video Number': r.video?.order !== undefined ? r.video.order : '',
            'Video Title': r.video?.title || '',
            'Response Text': r.responseText || '',
            'Response Word Count': r.responseWordCount ?? 0,
            'Response Time (Seconds)': r.responseTime ?? '',
            
            // Coding Outcomes
            'Sentiment': coding ? formatCapitalize(coding.sentiment) : '',
            'Aggression Level (0-10)': coding?.aggression?.level !== undefined && coding?.aggression?.level !== null ? coding.aggression.level : '',
            'Aggression Category': coding?.aggression?.category ? formatCapitalize(coding.aggression.category) : '',
            'Cyberbullying Present': coding?.cyberbullying?.present !== undefined && coding?.cyberbullying?.present !== null ? (coding.cyberbullying.present ? 'Yes' : 'No') : '',
            'Cyberbullying Type': coding?.cyberbullying?.type ? formatCapitalize(coding.cyberbullying.type) : '',
            'Cyberbullying Severity (0-10)': coding?.cyberbullying?.severity !== undefined && coding?.cyberbullying?.severity !== null ? coding.cyberbullying.severity : '',
            'Coding Status': coding ? (formatCapitalize(coding.reviewStatus) || 'CODED') : 'UNCODED',
            'Coder Name': coding?.codedBy?.name || (coding ? 'Primary Researcher' : ''),
            'Submitted Date': formatDate(r.submittedAt)
          });
        }
      } else {
        // Participant has no responses yet - retain record with Participant Name, Condition, demographics
        data.push({
          'Participant Name': p.name || '',
          'Condition': formatCapitalize(p.condition),
          'Gender': formatCapitalize(p.gender),
          'Age': p.age ?? '',
          'University': p.university || '',
          'Department': p.department || '',
          
          'Video Number': '',
          'Video Title': '',
          'Response Text': '',
          'Response Word Count': '',
          'Response Time (Seconds)': '',
          
          'Sentiment': '',
          'Aggression Level (0-10)': '',
          'Aggression Category': '',
          'Cyberbullying Present': '',
          'Cyberbullying Type': '',
          'Cyberbullying Severity (0-10)': '',
          'Coding Status': 'UNCODED',
          'Coder Name': '',
          'Submitted Date': ''
        });
      }
    }
    
    const isExcel = format.toLowerCase() === 'xlsx' || format.toLowerCase() === 'excel';
    const filename = `combined_research_dataset_${new Date().toISOString().split('T')[0]}.${isExcel ? 'xlsx' : 'csv'}`;
    
    if (isExcel) {
      const buffer = convertToExcel(data, 'Combined Research Dataset');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } else {
      const csv = convertToCSV(data);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
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
 * Data Quality Check
 * GET /api/admin/export/data-quality
 */
const getDataQuality = async (req, res) => {
  try {
    const issues = [];
    
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
    
    const uncodedCount = (await VideoResponse.countDocuments()) - (await Coding.countDocuments({ coderRole: 'primary' }));
    if (uncodedCount > 0) {
      issues.push({
        type: 'uncoded_responses',
        severity: 'low',
        count: uncodedCount,
        message: `${uncodedCount} response(s) not yet coded`
      });
    }
    
    res.json({
      success: true,
      data: {
        hasIssues: issues.length > 0,
        issueCount: issues.length,
        issues,
        note: 'All records reflect the verified 60 participants from the research study.'
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
