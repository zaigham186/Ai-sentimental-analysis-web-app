/**
 * Utility Script: Re-analyze Fallback Records
 * Connects to MongoDB, finds all Coding records that used Rule-Based Fallback
 * because the NLP service was offline, and re-analyzes them using the live
 * Python FastAPI NLP Microservice.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Coding, VideoResponse } = require('./src/models');
const { CodingAIService, createCodingProvider } = require('./src/services/codingAI');

async function reanalyzeFallbackRecords() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberbullying-research';
  console.log('Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);

  try {
    const fallbackCodings = await Coding.find({
      'aiCoding.metadata.fallback_used': true
    }).populate({
      path: 'response',
      populate: [
        { path: 'participant', select: 'condition' },
        { path: 'video', select: 'topic order' }
      ]
    });

    console.log(`Found ${fallbackCodings.length} records that used fallback heuristics.\n`);

    if (fallbackCodings.length === 0) {
      console.log('No fallback records found. Everything is already up-to-date!');
      return;
    }

    const codingAI = new CodingAIService(createCodingProvider());

    let successCount = 0;
    let failCount = 0;

    for (const coding of fallbackCodings) {
      const response = coding.response;
      if (!response || !response.responseText) {
        console.warn(`[Skip] Coding ${coding._id} has no associated response text.`);
        continue;
      }

      console.log(`Analyzing coding ${coding._id} (Response ${response._id})...`);
      console.log(`  Text preview: "${response.responseText.slice(0, 50)}..."`);

      const context = {
        condition: response.participant?.condition,
        videoTopic: response.video?.topic,
        videoOrder: response.video?.order
      };

      try {
        const aiResult = await codingAI.analyzeResponse(response.responseText, context);

        if (!aiResult.success) {
          console.error(`  ❌ Failed: ${aiResult.error}`);
          failCount++;
          continue;
        }

        const aiAnalysis = aiResult.data;

        coding.aiCoding = {
          sentiment: {
            label: aiAnalysis.sentiment.label,
            confidence: aiAnalysis.sentiment.confidence,
            evidence: aiAnalysis.sentiment.evidence,
            needsReview: aiAnalysis.sentiment.needsReview
          },
          aggression: {
            label: aiAnalysis.aggression.label,
            level: aiAnalysis.aggression.level,
            confidence: aiAnalysis.aggression.confidence,
            evidence: aiAnalysis.aggression.evidence,
            needsReview: aiAnalysis.aggression.needsReview
          },
          cyberbullying: {
            present: aiAnalysis.cyberbullying.present,
            type: aiAnalysis.cyberbullying.type,
            severity: aiAnalysis.cyberbullying.severity,
            confidence: aiAnalysis.cyberbullying.confidence,
            evidence: aiAnalysis.cyberbullying.evidence,
            criteriaMatched: aiAnalysis.cyberbullying.criteriaMatched || [],
            needsReview: aiAnalysis.cyberbullying.needsReview
          },
          metadata: aiAnalysis.metadata,
          modelName: aiAnalysis.metadata?.provider || 'nlp',
          modelVersion: aiAnalysis.metadata?.provider_version || '1.0',
          detectedLanguage: aiAnalysis.metadata?.detectedLanguage,
          languageConfidence: aiAnalysis.metadata?.languageConfidence,
          needsHumanReview: aiAnalysis.needsHumanReview,
          analyzedAt: new Date()
        };

        if (coding.reviewStatus !== 'reviewed') {
          coding.reviewStatus = 'pending';
        }

        await coding.save();
        console.log(`  ✅ Successfully updated with Primary NLP Service (Provider: ${aiAnalysis.metadata?.provider}, Sentiment: ${aiAnalysis.sentiment.label}, Aggression: ${aiAnalysis.aggression.level})`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Error reanalyzing:`, err.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`RE-ANALYSIS SUMMARY:`);
    console.log(`Total processed: ${fallbackCodings.length}`);
    console.log(`Successfully upgraded to Primary NLP: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('='.repeat(50));
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

reanalyzeFallbackRecords().catch(err => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
