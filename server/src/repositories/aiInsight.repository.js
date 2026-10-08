const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class AIInsightRepository extends BaseRepository {
  constructor() {
    super('aiInsights');
  }

  async create(data, transaction = null) {
    const payload = {
      ...data,
      title: data.title || 'Emergency Donor Network Analysis',
      summary: data.summary || '',
      metrics: data.metrics || {},
      recommendations: data.recommendations || [],
      rawResponse: data.rawResponse || '',
      generatedAt: data.generatedAt ? new Date(data.generatedAt) : new Date(),
    };
    return await super.create(payload, transaction);
  }

  async getLatest(limit = 10) {
    return await this.find()
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

const aiInsightRepo = new AIInsightRepository();
registerRepository('aiInsights', aiInsightRepo);

module.exports = aiInsightRepo;
