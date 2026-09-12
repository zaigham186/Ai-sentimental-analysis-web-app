const xlsx = require('xlsx');
const researchAnalyticsService = require('../services/researchAnalyticsService');

/**
 * Research Analytics Controller
 * Phase 7: Complete Research Analytics, Results, Export & Supervisor Reporting
 * 
 * CRITICAL PRINCIPLES:
 * - Read-only analytics endpoints (never modifies participant responses or codings)
 * - Strict authorization: only authenticated researchers/admins can access
 * - Privacy: participant passwords/secrets/credentials never exported
 * - Safe descriptive statistics only (no unsupported causal claims)
 */

class ResearchAnalyticsController {
  async getOverview(req, res) {
    try {
      const data = await researchAnalyticsService.getOverview(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research analytics overview error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve research overview' });
    }
  }

  async getSentiment(req, res) {
    try {
      const data = await researchAnalyticsService.getSentimentAnalytics(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research sentiment analytics error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve sentiment analytics' });
    }
  }

  async getToxicity(req, res) {
    try {
      const data = await researchAnalyticsService.getToxicityAnalytics(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research toxicity analytics error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve toxicity analytics' });
    }
  }

  async getAggression(req, res) {
    try {
      const data = await researchAnalyticsService.getAggressionAnalytics(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research aggression analytics error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve aggression analytics' });
    }
  }

  async getCyberbullying(req, res) {
    try {
      const data = await researchAnalyticsService.getCyberbullyingAnalytics(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research cyberbullying analytics error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve cyberbullying analytics' });
    }
  }

  async getConditionComparison(req, res) {
    try {
      const data = await researchAnalyticsService.getConditionComparison(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research condition comparison error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve condition comparison' });
    }
  }

  async getVideoComparison(req, res) {
    try {
      const data = await researchAnalyticsService.getVideoComparison(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research video comparison error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve video comparison' });
    }
  }

  async getAIHumanAgreement(req, res) {
    try {
      const data = await researchAnalyticsService.getAIHumanAgreement(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research AI vs human agreement error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve AI vs human agreement' });
    }
  }

  async getResponsesTable(req, res) {
    try {
      const data = await researchAnalyticsService.getResponsesTable(req.query, {
        page: req.query.page,
        limit: req.query.limit
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research responses table error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve research responses table' });
    }
  }

  async getValidation(req, res) {
    try {
      const data = researchAnalyticsService.getValidationSummary();
      res.json({ success: true, data });
    } catch (err) {
      console.error('Research validation summary error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve validation summary' });
    }
  }

  async getSupervisorReport(req, res) {
    try {
      const data = await researchAnalyticsService.getSupervisorReport(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Supervisor report error:', err);
      res.status(500).json({ success: false, message: 'Failed to generate supervisor report' });
    }
  }

  async exportCSV(req, res) {
    try {
      const csvData = await researchAnalyticsService.generateCSV(req.query);
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="research_coding_dataset_${timestamp}.csv"`);
      res.send(csvData);
    } catch (err) {
      console.error('CSV export error:', err);
      res.status(500).json({ success: false, message: 'Failed to export CSV' });
    }
  }

  async exportJSON(req, res) {
    try {
      const report = await researchAnalyticsService.getSupervisorReport(req.query);
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="research_dataset_${timestamp}.json"`);
      res.json(report);
    } catch (err) {
      console.error('JSON export error:', err);
      res.status(500).json({ success: false, message: 'Failed to export JSON' });
    }
  }

  async exportXLSX(req, res) {
    try {
      const report = await researchAnalyticsService.getSupervisorReport(req.query);
      const responsesTable = await researchAnalyticsService.getResponsesTable(req.query, { limit: 1000 });

      const wb = xlsx.utils.book_new();

      // Sheet 1: Dataset Summary
      const summaryRows = [
        ['Metric', 'Value'],
        ['Total Responses', report.overview.summary.totalResponses],
        ['Final Coded Responses', report.overview.summary.finalCodedCount],
        ['Pending Review Responses', report.overview.summary.pendingReviewCount],
        ['Uncoded Responses', report.overview.summary.uncodedCount],
        ['Coding Completion Rate (%)', report.overview.summary.codingCompletionRate],
        ['Cyberbullying Count', report.overview.summary.cyberbullyingCount],
        ['Cyberbullying Rate (%)', report.overview.summary.cyberbullyingRate],
        ['Aggressive Count', report.overview.summary.aggressiveCount],
        ['Aggressive Rate (%)', report.overview.summary.aggressiveRate],
        ['Positive Sentiment (%)', report.overview.sentiment.positivePct],
        ['Neutral Sentiment (%)', report.overview.sentiment.neutralPct],
        ['Negative Sentiment (%)', report.overview.sentiment.negativePct]
      ];
      const wsSummary = xlsx.utils.aoa_to_sheet(summaryRows);
      xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Sheet 2: Responses & Final Coding
      const responseRows = [
        ['Response ID', 'Condition', 'Video Order', 'Video Title', 'Final Sentiment', 'Final Aggression Category', 'Final Aggression Level', 'Final Cyberbullying', 'Final CB Type', 'AI Sentiment', 'AI Aggression', 'AI Cyberbullying', 'Review Status', 'Review Action']
      ];
      responsesTable.rows.forEach(r => {
        responseRows.push([
          r.responseId ? r.responseId.toString() : '',
          r.condition,
          r.videoOrder,
          r.videoTitle,
          r.finalCoding.sentiment,
          r.finalCoding.aggressionCategory,
          r.finalCoding.aggressionLevel,
          r.finalCoding.cyberbullyingPresent !== null ? (r.finalCoding.cyberbullyingPresent ? 'Yes' : 'No') : '',
          r.finalCoding.cyberbullyingType,
          r.aiSuggestion.sentiment,
          r.aiSuggestion.aggression,
          r.aiSuggestion.cyberbullying !== null ? (r.aiSuggestion.cyberbullying ? 'Yes' : 'No') : '',
          r.reviewStatus,
          r.reviewAction || ''
        ]);
      });
      const wsResponses = xlsx.utils.aoa_to_sheet(responseRows);
      xlsx.utils.book_append_sheet(wb, wsResponses, 'Coding Dataset');

      // Sheet 3: AI vs Human Agreement
      const aiHumanRows = [
        ['Agreement Metric', 'Count', 'Percentage (%)'],
        ['Total AI Coded', report.aiHuman.summary.totalWithAI, '-'],
        ['Reviewed by Human', report.aiHuman.summary.totalReviewed, '-'],
        ['Accepted AI Suggestions', report.aiHuman.summary.acceptedCount, report.aiHuman.summary.acceptedPercentage],
        ['Modified by Researcher', report.aiHuman.summary.modifiedCount, report.aiHuman.summary.modifiedPercentage],
        ['Rejected by Researcher', report.aiHuman.summary.rejectedCount, report.aiHuman.summary.rejectedPercentage],
        ['Total Discrepancies', report.aiHuman.summary.discrepancyCount, report.aiHuman.summary.discrepancyRate]
      ];
      const wsAIHuman = xlsx.utils.aoa_to_sheet(aiHumanRows);
      xlsx.utils.book_append_sheet(wb, wsAIHuman, 'AI vs Human');

      // Sheet 4: Condition Comparison
      const conditionRows = [
        ['Dimension', 'Anonymous Count', 'Anonymous (%)', 'Identifiable Count', 'Identifiable (%)'],
        ['Total Responses', report.conditionComparison.anonymous.totalResponses, '-', report.conditionComparison.identifiable.totalResponses, '-'],
        ['Coded Responses', report.conditionComparison.anonymous.codedResponses, '-', report.conditionComparison.identifiable.codedResponses, '-'],
        ['Cyberbullying', report.conditionComparison.anonymous.cyberbullying.count, report.conditionComparison.anonymous.cyberbullying.percentage, report.conditionComparison.identifiable.cyberbullying.count, report.conditionComparison.identifiable.cyberbullying.percentage],
        ['Aggression', report.conditionComparison.anonymous.aggression.count, report.conditionComparison.anonymous.aggression.percentage, report.conditionComparison.identifiable.aggression.count, report.conditionComparison.identifiable.aggression.percentage],
        ['Negative Sentiment', report.conditionComparison.anonymous.sentiment.negative.count, report.conditionComparison.anonymous.sentiment.negative.percentage, report.conditionComparison.identifiable.sentiment.negative.count, report.conditionComparison.identifiable.sentiment.negative.percentage]
      ];
      const wsCondition = xlsx.utils.aoa_to_sheet(conditionRows);
      xlsx.utils.book_append_sheet(wb, wsCondition, 'Condition Comparison');

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="research_analytics_${timestamp}.xlsx"`);
      res.send(buffer);
    } catch (err) {
      console.error('XLSX export error:', err);
      res.status(500).json({ success: false, message: 'Failed to export XLSX' });
    }
  }
}

module.exports = new ResearchAnalyticsController();
