import { AgenticSearchService } from './agentic-search.service';

// ─── Mock Setup ────────────────────────────────────────────────────────────────

const mockSearchAgent = { processQuery: jest.fn() };
const mockRecommendationAgent = { getRecommendations: jest.fn() };
const mockCollaborationAgent = { getCollaborationSuggestions: jest.fn() };
const mockCareerAgent = { getCareerSuggestions: jest.fn() };
const mockEventAgent = { getEventSuggestions: jest.fn() };

const redisStore: Record<string, string> = {};
const mockRedis = {
  get: jest.fn(async (key: string) => redisStore[key] || null),
  set: jest.fn(async (key: string, value: string, _ttl?: number) => {
    redisStore[key] = value;
  }),
  del: jest.fn(async (key: string) => { delete redisStore[key]; }),
  incr: jest.fn(async (key: string) => {
    const current = parseInt(redisStore[key] || '0', 10);
    redisStore[key] = String(current + 1);
    return current + 1;
  }),
  getJson: jest.fn(async (key: string) => {
    const v = redisStore[key];
    return v ? JSON.parse(v) : null;
  }),
  setJson: jest.fn(async (key: string, value: any, _ttl?: number) => {
    redisStore[key] = JSON.stringify(value);
  }),
};

const mockNeo4j = { read: jest.fn().mockResolvedValue([]) };

const mockPrisma = {
  specialty: { findMany: jest.fn().mockResolvedValue([]) },
  doctor: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
  job: { findMany: jest.fn().mockResolvedValue([]) },
  institution: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      'llm.openaiApiKey': 'sk-test',
      'llm.anthropicApiKey': undefined,
      'llm.googleAiApiKey': undefined,
    };
    return map[key];
  }),
};

function createService(): AgenticSearchService {
  return new AgenticSearchService(
    mockSearchAgent as any,
    mockRecommendationAgent as any,
    mockCollaborationAgent as any,
    mockCareerAgent as any,
    mockEventAgent as any,
    mockPrisma as any,
    mockNeo4j as any,
    mockRedis as any,
    mockConfig as any,
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AgenticSearchService', () => {
  let service: AgenticSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear redis store
    for (const key of Object.keys(redisStore)) delete redisStore[key];
    service = createService();
  });

  // ─── sanitizeInput ──────────────────────────────────────────────────────

  describe('sanitizeInput', () => {
    const sanitize = (input: string) => (service as any).sanitizeInput(input);

    it('should trim whitespace', () => {
      expect(sanitize('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitize('hello    world')).toBe('hello world');
    });

    it('should remove control characters', () => {
      // \x00 and \x07 are both in the 0x00-0x08 control range, both removed
      expect(sanitize('hello\x00world\x07test')).toBe('helloworldtest');
    });

    it('should remove null bytes', () => {
      expect(sanitize('test\x00injection')).toBe('testinjection');
    });

    it('should limit to 500 characters', () => {
      const long = 'a'.repeat(600);
      expect(sanitize(long)).toHaveLength(500);
    });

    it('should handle empty string', () => {
      expect(sanitize('')).toBe('');
    });

    it('should preserve Portuguese characters', () => {
      expect(sanitize('cardiologista em São Paulo')).toBe('cardiologista em São Paulo');
    });
  });

  // ─── checkRateLimit ─────────────────────────────────────────────────────

  describe('checkRateLimit', () => {
    const checkRateLimit = (doctorId: string) => (service as any).checkRateLimit(doctorId);

    it('should allow first request (count = 0)', async () => {
      await expect(checkRateLimit('doctor-1')).resolves.toBeUndefined();
    });

    it('should set key to "1" on first request', async () => {
      await checkRateLimit('doctor-1');
      expect(mockRedis.set).toHaveBeenCalledWith('ratelimit:agentic:doctor-1', '1', 60);
    });

    it('should increment counter on subsequent requests', async () => {
      redisStore['ratelimit:agentic:doctor-1'] = '5';
      await checkRateLimit('doctor-1');
      expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:agentic:doctor-1');
    });

    it('should throw when rate limit exceeded', async () => {
      redisStore['ratelimit:agentic:doctor-1'] = '20';
      await expect(checkRateLimit('doctor-1')).rejects.toThrow('Rate limit exceeded');
    });

    it('should fail open when Redis is down', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection lost'));
      await expect(checkRateLimit('doctor-1')).resolves.toBeUndefined();
    });

    it('should isolate rate limits per doctor', async () => {
      redisStore['ratelimit:agentic:doctor-1'] = '20';
      // doctor-2 should not be affected
      await expect(checkRateLimit('doctor-2')).resolves.toBeUndefined();
    });
  });

  // ─── buildCacheKey ──────────────────────────────────────────────────────

  describe('buildCacheKey', () => {
    const buildKey = (prefix: string, doctorId: string, query: string) =>
      (service as any).buildCacheKey(prefix, doctorId, query);

    it('should normalize case and accents for consistent hashing', () => {
      const key1 = buildKey('search', 'doc1', 'Cardiologista em São Paulo');
      const key2 = buildKey('search', 'doc1', 'cardiologista em sao paulo');
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different queries', () => {
      const key1 = buildKey('search', 'doc1', 'cardiologista');
      const key2 = buildKey('search', 'doc1', 'dermatologista');
      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different doctors', () => {
      const key1 = buildKey('search', 'doc1', 'cardiologista');
      const key2 = buildKey('search', 'doc2', 'cardiologista');
      expect(key1).not.toBe(key2);
    });

    it('should include prefix in key', () => {
      const key = buildKey('search', 'doc1', 'test');
      expect(key).toMatch(/^agentic:search:doc1:/);
    });

    it('should collapse whitespace before hashing', () => {
      const key1 = buildKey('search', 'doc1', 'hello   world');
      const key2 = buildKey('search', 'doc1', 'hello world');
      expect(key1).toBe(key2);
    });
  });

  // ─── query method (cache integration) ──────────────────────────────────

  describe('query — caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = { answer: 'Cached answer', results: [] };
      mockRedis.getJson.mockResolvedValueOnce(cachedResult);

      const result = await service.query('doc-1', 'test query');
      expect(result).toEqual({ ...cachedResult, cached: true });
      // Should not call search agent
      expect(mockSearchAgent.processQuery).not.toHaveBeenCalled();
    });

    it('should call search agent on cache miss', async () => {
      mockRedis.getJson.mockResolvedValueOnce(null); // cache miss
      mockSearchAgent.processQuery.mockResolvedValueOnce({
        answer: 'Found results',
        sources: [],
      });
      mockPrisma.doctor.findUnique.mockResolvedValueOnce({
        id: 'doc-1',
        fullName: 'Dr. Test',
      });

      const result = await service.query('doc-1', 'cardiologistas em São Paulo');
      expect(result.answer).toBeDefined();
    });
  });

  // ─── getRecommendations caching ──────────────────────────────────────

  describe('getRecommendations — caching', () => {
    it('should return cached recommendations', async () => {
      const cached = { suggestedConnections: [{ id: '1' }] };
      mockRedis.getJson.mockResolvedValueOnce(cached);

      const result = await service.getRecommendations('doc-1');
      expect(result).toEqual({ ...cached, cached: true });
      expect(mockRecommendationAgent.getRecommendations).not.toHaveBeenCalled();
    });

    it('should call agent and cache on miss', async () => {
      mockRedis.getJson.mockResolvedValueOnce(null);
      const agentResult = { suggestedConnections: [{ id: '2' }] };
      mockRecommendationAgent.getRecommendations.mockResolvedValueOnce(agentResult);

      const result = await service.getRecommendations('doc-1');
      expect(result).toEqual(agentResult);
      expect(mockRedis.setJson).toHaveBeenCalledWith(
        'agentic:recommendations:doc-1',
        agentResult,
        300,
      );
    });
  });

  // ─── getDashboard ──────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('should aggregate all agent results', async () => {
      const recommendations = { suggestedConnections: [] };
      const collaboration = { suggestedCoauthors: [] };
      const career = { careerProgress: [] };
      const events = { upcomingEvents: [] };

      mockRedis.getJson
        .mockResolvedValueOnce(recommendations)
        .mockResolvedValueOnce(collaboration)
        .mockResolvedValueOnce(career)
        .mockResolvedValueOnce(events);

      const result = await service.getDashboard('doc-1');

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('collaboration');
      expect(result).toHaveProperty('career');
      expect(result).toHaveProperty('events');
    });
  });

  // ─── matchSpecialty ─────────────────────────────────────────────────────

  describe('matchSpecialty', () => {
    const matchSpecialty = (q: string) => (service as any).matchSpecialty(q);

    beforeEach(() => {
      mockPrisma.specialty.findMany.mockResolvedValue([
        { id: 'spec-1', name: 'Cardiologia' },
        { id: 'spec-2', name: 'Dermatologia' },
        { id: 'spec-3', name: 'Ortopedia' },
      ]);
    });

    it('should match exact specialty name', async () => {
      const result = await matchSpecialty('cardiologia');
      expect(result).toEqual({ id: 'spec-1', name: 'Cardiologia' });
    });

    it('should match specialist form (-ista)', async () => {
      const result = await matchSpecialty('cardiologista');
      expect(result).toEqual({ id: 'spec-1', name: 'Cardiologia' });
    });

    it('should match first word of multi-word specialty', async () => {
      // "ortopedia" first word is "ortopedia", stem "ortoped" >= 5 chars
      const result = await matchSpecialty('preciso de um ortopedista');
      expect(result).toEqual({ id: 'spec-3', name: 'Ortopedia' });
    });

    it('should return null when no match found', async () => {
      const result = await matchSpecialty('pizza delivery');
      expect(result).toBeNull();
    });
  });

  // ─── matchCity ──────────────────────────────────────────────────────────

  describe('matchCity', () => {
    const matchCity = (q: string) => (service as any).matchCity(q);

    it('should match known cities from local list', async () => {
      const result = await matchCity('medicos em sao paulo');
      expect(result).toEqual({ city: 'São Paulo', state: 'SP' });
    });

    it('should match known city: Rio de Janeiro', async () => {
      const result = await matchCity('vagas rio de janeiro');
      expect(result).toEqual({ city: 'Rio de Janeiro', state: 'RJ' });
    });

    it('should match state code (e.g. "em SP")', async () => {
      mockPrisma.doctor.findFirst.mockResolvedValueOnce({
        city: 'Campinas',
        state: 'SP',
      });

      // Using a query that won't match local cities
      const result = await matchCity('medicos em sp');
      // Should match "sao paulo" from local list first
      expect(result).not.toBeNull();
    });

    it('should return null for unrecognizable location', async () => {
      mockPrisma.doctor.findFirst.mockResolvedValue(null);
      const result = await matchCity('buscar algo');
      expect(result).toBeNull();
    });
  });

  // ─── Smart routing (tryDirectQuery) ──────────────────────────────────────

  describe('tryDirectQuery — smart routing', () => {
    const tryDirect = (doctorId: string, q: string) => (service as any).tryDirectQuery(doctorId, q);

    it('should return null for complex queries', async () => {
      const result = await tryDirect('doc-1', 'como encontrar mentores na minha área');
      expect(result).toBeNull();
    });

    it('should return null for recommendation queries', async () => {
      const result = await tryDirect('doc-1', 'recomende cardiologistas');
      expect(result).toBeNull();
    });

    it('should return null for career queries', async () => {
      const result = await tryDirect('doc-1', 'minha carreira como cardiologista');
      expect(result).toBeNull();
    });

    it('should return null for event queries', async () => {
      const result = await tryDirect('doc-1', 'eventos de cardiologia');
      expect(result).toBeNull();
    });

    it('should route job queries directly when specialty matched', async () => {
      mockPrisma.specialty.findMany.mockResolvedValue([
        { id: 'spec-1', name: 'Cardiologia' },
      ]);
      mockPrisma.job.findMany.mockResolvedValueOnce([
        { id: 'job-1', title: 'Cardiologista', city: 'São Paulo', state: 'SP', institution: { name: 'HSP' } },
      ]);

      const result = await tryDirect('doc-1', 'vagas cardiologia sao paulo');
      expect(result).not.toBeNull();
      expect(result.routed).toBe('direct');
      expect(result.toolsUsed).toContain('search_jobs');
    });
  });
});
