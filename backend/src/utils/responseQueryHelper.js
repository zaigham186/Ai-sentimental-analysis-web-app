const { VideoResponse, Participant, Video, Coding } = require('../models');

/**
 * Shared helper to query, search, sort, and paginate video responses
 * Used by:
 * - GET /api/responses
 * - GET /api/admin/responses
 * - GET /api/admin/coding/responses
 */
async function buildResponseQueryAndResults(queryParams = {}) {
  const {
    condition,
    gender,
    video,
    coded,
    search,
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
    participantRangeStart,
    participantRangeEnd,
    participantIndex,
    participantNumber
  } = queryParams;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';

  const buildGenderRegex = (g) => {
    const clean = String(g).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[_\s-]+/g, '[_\\s-]*');
    return new RegExp(`^${clean}$`, 'i');
  };

  // Retrieve all active participants who have video responses (respecting condition and gender filters if set)
  const pIdsWithResponses = await VideoResponse.distinct('participant');
  const pFilter = { _id: { $in: pIdsWithResponses } };
  if (condition) {
    pFilter.condition = condition;
  }
  if (gender) {
    pFilter.gender = buildGenderRegex(gender);
  }
  const allActiveParticipants = await Participant.find(pFilter)
    .sort({ name: 1, createdAt: 1 })
    .lean();

  const participantsList = allActiveParticipants.map((p, idx) => ({
    index: idx + 1,
    id: p._id.toString(),
    name: p.name || 'Unnamed Participant',
    username: p.username || 'unknown',
    condition: p.condition || 'anonymous',
    gender: p.gender
  }));

  // Base Mongo query for VideoResponse
  const query = {};

  // 1. Participant search / condition / gender filtering
  let matchingParticipantIds = null;
  let matchedParticipantIndex = null;

  if (trimmedSearch) {
    const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    // Search by participant name, username, or department
    const participantFilter = {
      $or: [
        { name: searchRegex },
        { username: searchRegex },
        { department: searchRegex }
      ]
    };
    
    const lowerSearch = trimmedSearch.toLowerCase();
    if (['male', 'female', 'other', 'prefer not to say'].includes(lowerSearch)) {
      participantFilter.$or.push({ gender: new RegExp(`^${escapedSearch}$`, 'i') });
    }

    if (condition) {
      participantFilter.condition = condition;
    }
    if (gender) {
      participantFilter.gender = buildGenderRegex(gender);
    }

    const matchingParticipants = await Participant.find(participantFilter).select('_id');
    matchingParticipantIds = matchingParticipants.map(p => p._id);

    // If search matched a single participant, find their index in participantsList
    if (matchingParticipantIds.length === 1) {
      const matchedIdStr = matchingParticipantIds[0].toString();
      const found = participantsList.find(p => p.id === matchedIdStr);
      if (found) matchedParticipantIndex = found.index;
    }

    // Filter by condition / gender when searching
    if (condition || gender) {
      const scopedParticipantFilter = {};
      if (condition) scopedParticipantFilter.condition = condition;
      if (gender) scopedParticipantFilter.gender = buildGenderRegex(gender);
      const scopedParticipantIds = await Participant.find(scopedParticipantFilter).distinct('_id');

      if (matchingParticipantIds.length > 0) {
        query.$and = [
          { participant: { $in: scopedParticipantIds } },
          {
            $or: [
              { participant: { $in: matchingParticipantIds } },
              { responseText: searchRegex }
            ]
          }
        ];
      } else {
        query.participant = { $in: scopedParticipantIds };
        query.responseText = searchRegex;
      }
    } else {
      if (matchingParticipantIds.length > 0) {
        query.$or = [
          { participant: { $in: matchingParticipantIds } },
          { responseText: searchRegex }
        ];
      } else {
        query.responseText = searchRegex;
      }
    }
  } else {
    // 2. Participant index / navigation (when not searching)
    const rawParticipantIndex = participantIndex || participantNumber || 
      (participantRangeStart && participantRangeEnd && parseInt(participantRangeStart, 10) === parseInt(participantRangeEnd, 10) ? participantRangeStart : null);

    if (rawParticipantIndex && participantsList.length > 0) {
      let pIdx = parseInt(rawParticipantIndex, 10);
      if (isNaN(pIdx) || pIdx < 1) pIdx = 1;
      if (pIdx > participantsList.length) pIdx = participantsList.length;

      const selectedTarget = allActiveParticipants[pIdx - 1];
      if (selectedTarget) {
        query.participant = selectedTarget._id;
        matchedParticipantIndex = pIdx;
      }
    } else if (rawParticipantIndex && participantsList.length === 0) {
      // Filter resulted in 0 matching participants
      query.participant = { $in: [] };
    } else if (participantRangeStart && participantRangeEnd) {
      // Legacy participant range
      const start = Math.max(1, parseInt(participantRangeStart, 10));
      const end = Math.min(participantsList.length, Math.max(start, parseInt(participantRangeEnd, 10)));
      const rangeSlice = allActiveParticipants.slice(start - 1, end);
      query.participant = { $in: rangeSlice.map(p => p._id) };
    } else if (condition || gender) {
      // Condition/gender filter without search or participantIndex
      const filterCriteria = {};
      if (condition) filterCriteria.condition = condition;
      if (gender) filterCriteria.gender = buildGenderRegex(gender);
      const matchingParticipantIds = await Participant.find(filterCriteria).distinct('_id');
      query.participant = { $in: matchingParticipantIds };
    }
  }

  // 3. Filter by video
  if (video) {
    query.video = video;
  }

  // Fetch responses with populated participant and video details
  const responses = await VideoResponse.find(query)
    .populate('participant', 'username name condition status gender age department createdAt')
    .populate('video', 'title order topic description duration');

  // 4. Batch fetch primary codings for all retrieved responses
  const responseIds = responses.map(r => r._id);
  const codings = await Coding.find({
    response: { $in: responseIds },
    coderRole: 'primary'
  })
    .populate('codedBy', 'name username')
    .populate('reviewedBy', 'name username');

  const codingMap = new Map();
  for (const c of codings) {
    codingMap.set(c.response.toString(), c);
  }

  // 5. Build enriched response objects
  let enrichedResponses = responses.map(response => {
    const coding = codingMap.get(response._id.toString()) || null;

    // Check if actually coded (human review or final coding dimensions)
    const isActuallyCoded = coding && (
      coding.reviewStatus === 'reviewed' ||
      coding.reviewStatus === 'approved' ||
      Boolean(coding.codedBy) ||
      ((coding.reviewStatus === null || coding.reviewStatus === undefined || coding.reviewStatus === 'pending') &&
        Boolean(coding.sentiment || coding.aggression?.category || (coding.cyberbullying?.present !== undefined && coding.cyberbullying?.present !== null)) &&
        !Boolean(coding.aiCoding && !coding.codedBy && (coding.reviewStatus === 'pending' || coding.reviewStatus === 'pending_review' || coding.reviewStatus === 'ai_generated'))
      )
    );

    const respObj = response.toObject();
    const respIdStr = respObj._id.toString();

    return {
      ...respObj,
      id: respIdStr,
      _id: respObj._id,
      coding: coding ? coding.toObject() : null,
      codingId: coding?._id || null,
      coded: Boolean(isActuallyCoded),
      codingStatus: isActuallyCoded ? 'CODED' : 'UNCODED',
      hasAISuggestion: Boolean(coding && coding.aiCoding),
      reviewStatus: coding?.reviewStatus || null
    };
  });

  // Filter out any orphaned records where participant no longer exists
  enrichedResponses = enrichedResponses.filter(r => r.participant && (r.participant.name || r.participant.username));

  // 6. Filter by coded status if requested
  if (coded === 'true') {
    enrichedResponses = enrichedResponses.filter(r => r.coded);
  } else if (coded === 'false') {
    enrichedResponses = enrichedResponses.filter(r => !r.coded);
  }

  // 7. Sort responses according to Requirements 3 & 4:
  // - Default: participant name A-Z
  // - Secondary: video number ascending (Video #1, #2, #3, #4... in order)
  // - Group by participant when name is searched
  // - Also allow sort by: date, status, condition, video
  const dir = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
  const sortField = (sortBy || 'name').toLowerCase();

  enrichedResponses.sort((a, b) => {
    const videoOrderA = a.video?.order ?? 999;
    const videoOrderB = b.video?.order ?? 999;
    const nameA = (a.participant?.name || a.participant?.username || '').toLowerCase();
    const nameB = (b.participant?.name || b.participant?.username || '').toLowerCase();
    const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
    const statusA = a.codingStatus || (a.coded ? 'CODED' : 'UNCODED');
    const statusB = b.codingStatus || (b.coded ? 'CODED' : 'UNCODED');
    const condA = (a.participant?.condition || '').toLowerCase();
    const condB = (b.participant?.condition || '').toLowerCase();

    if (sortField === 'date') {
      if (dateA !== dateB) return (dateA - dateB) * dir;
      if (videoOrderA !== videoOrderB) return videoOrderA - videoOrderB;
      return nameA.localeCompare(nameB);
    }

    if (sortField === 'status') {
      const statusComp = statusA.localeCompare(statusB) * dir;
      if (statusComp !== 0) return statusComp;
      const nameComp = nameA.localeCompare(nameB);
      if (nameComp !== 0) return nameComp;
      return videoOrderA - videoOrderB;
    }

    if (sortField === 'condition') {
      const condComp = condA.localeCompare(condB) * dir;
      if (condComp !== 0) return condComp;
      const nameComp = nameA.localeCompare(nameB);
      if (nameComp !== 0) return nameComp;
      return videoOrderA - videoOrderB;
    }

    if (sortField === 'video') {
      if (videoOrderA !== videoOrderB) return (videoOrderA - videoOrderB) * dir;
      return nameA.localeCompare(nameB);
    }

    // Default / 'name'
    // Primary: participant name
    const nameComp = nameA.localeCompare(nameB) * dir;
    if (nameComp !== 0) return nameComp;

    // Secondary: video number ascending (Video #1, #2, #3, #4...)
    if (videoOrderA !== videoOrderB) return videoOrderA - videoOrderB;

    // Tertiary: date
    return dateA - dateB;
  });

  // 8. Pagination calculation (10 per page default)
  const total = enrichedResponses.length;
  const pages = Math.max(1, Math.ceil(total / parsedLimit));
  const safePage = Math.min(parsedPage, pages);
  const startIndex = (safePage - 1) * parsedLimit;
  const paginatedResponses = enrichedResponses.slice(startIndex, startIndex + parsedLimit);

  // Current participant info if participant-scoped or search matched
  const activeParticipantIndex = matchedParticipantIndex || null;
  const currentParticipant = activeParticipantIndex && participantsList[activeParticipantIndex - 1]
    ? participantsList[activeParticipantIndex - 1]
    : null;

  return {
    responses: paginatedResponses,
    pagination: {
      page: safePage,
      limit: parsedLimit,
      total,
      pages,
      from: total === 0 ? 0 : startIndex + 1,
      to: Math.min(startIndex + parsedLimit, total),
      totalParticipants: participantsList.length,
      currentParticipantIndex: activeParticipantIndex,
      currentParticipant,
      participantsList,
      participantRangeStart: participantRangeStart ? parseInt(participantRangeStart, 10) : null,
      participantRangeEnd: participantRangeEnd ? parseInt(participantRangeEnd, 10) : null
    }
  };
}

module.exports = {
  buildResponseQueryAndResults
};
