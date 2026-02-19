import { SearchAgent } from './search.agent';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockNeo4jRead = jest.fn();
const mockNeo4j = { read: mockNeo4jRead } as any;
const mockPrisma = {} as any;
const mockLLMFactory = {
  getAdapter: jest.fn(),
  chatWithFallback: jest.fn(),
} as any;

describe('SearchAgent', () => {
  let agent: SearchAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new SearchAgent(mockLLMFactory, mockNeo4j, mockPrisma);
    mockNeo4jRead.mockResolvedValue([]);
  });

  // Helper: call private executeCypher directly
  const executeCypher = (query: string, params: Record<string, any> = {}) =>
    (agent as any).executeCypher(query, params);

  // ─── Dangerous keyword blocking ──────────────────────────────────────────

  describe('executeCypher — dangerous keyword blocking', () => {
    const dangerousQueries = [
      { keyword: 'DELETE', query: 'MATCH (n) DELETE n RETURN n' },
      { keyword: 'CREATE', query: 'CREATE (n:Doctor {name: "hack"}) RETURN n' },
      { keyword: 'SET', query: 'MATCH (n) SET n.name = "hacked" RETURN n' },
      { keyword: 'REMOVE', query: 'MATCH (n) REMOVE n.password RETURN n' },
      { keyword: 'DROP', query: 'MATCH (n) DROP n RETURN n' },
      { keyword: 'MERGE', query: 'MERGE (n:Doctor {name: "new"}) RETURN n' },
      { keyword: 'DETACH', query: 'MATCH (n) DETACH DELETE n RETURN n' },
      { keyword: 'CALL', query: 'CALL db.labels() YIELD label RETURN label' },
      { keyword: 'FOREACH', query: 'MATCH (n) FOREACH (x IN [1] | SET n.x = x) RETURN n' },
      { keyword: 'LOAD', query: 'LOAD CSV FROM "file:///etc/passwd" AS line RETURN line' },
      { keyword: 'PERIODIC', query: 'MATCH (n) CALL { WITH n DELETE n } IN TRANSACTIONS PERIODIC COMMIT RETURN count(*)' },
    ];

    for (const { keyword, query } of dangerousQueries) {
      it(`should block ${keyword} keyword`, async () => {
        const result = await executeCypher(query);
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('Only read queries');
        expect(mockNeo4jRead).not.toHaveBeenCalled();
      });
    }

    it('should block case-insensitive dangerous keywords', async () => {
      const result = await executeCypher('MATCH (n) dElEtE n RETURN n');
      expect(result).toHaveProperty('error');
    });
  });

  // ─── Comment stripping ────────────────────────────────────────────────────

  describe('executeCypher — comment stripping', () => {
    it('should strip block comments that hide dangerous keywords', async () => {
      const result = await executeCypher('MATCH (n) /* safe */ DELETE n RETURN n');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Only read queries');
    });

    it('should strip line comments that hide dangerous keywords', async () => {
      const result = await executeCypher('MATCH (n) // safe\nDELETE n RETURN n');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Only read queries');
    });

    it('should strip block comment wrapping entire dangerous query', async () => {
      const result = await executeCypher('/* MATCH (n) RETURN n */ CREATE (n:Hack) RETURN n');
      expect(result).toHaveProperty('error');
    });
  });

  // ─── Start keyword validation ─────────────────────────────────────────────

  describe('executeCypher — must start with allowed keyword', () => {
    it('should allow queries starting with MATCH', async () => {
      const result = await executeCypher('MATCH (n:Doctor) RETURN n LIMIT 10');
      expect(result).not.toHaveProperty('error');
    });

    it('should allow queries starting with OPTIONAL MATCH', async () => {
      const result = await executeCypher('OPTIONAL MATCH (n:Doctor) RETURN n LIMIT 10');
      expect(result).not.toHaveProperty('error');
    });

    it('should allow queries starting with UNWIND', async () => {
      const result = await executeCypher('UNWIND [1,2,3] AS x MATCH (n) WHERE n.id = x RETURN n');
      expect(result).not.toHaveProperty('error');
    });

    it('should allow queries starting with WITH', async () => {
      const result = await executeCypher('WITH 1 AS num MATCH (n) WHERE n.id = num RETURN n');
      expect(result).not.toHaveProperty('error');
    });

    it('should allow queries starting with RETURN', async () => {
      const result = await executeCypher('RETURN 1 AS test');
      expect(result).not.toHaveProperty('error');
    });

    it('should reject queries starting with unknown keywords', async () => {
      const result = await executeCypher('EXPLAIN MATCH (n) RETURN n');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Query must start with');
    });

    it('should reject empty queries', async () => {
      const result = await executeCypher('');
      expect(result).toHaveProperty('error');
    });
  });

  // ─── RETURN clause required ───────────────────────────────────────────────

  describe('executeCypher — RETURN clause required', () => {
    it('should reject query without RETURN', async () => {
      const result = await executeCypher('MATCH (n:Doctor) WHERE n.name = "test"');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('RETURN clause');
    });
  });

  // ─── Auto LIMIT ────────────────────────────────────────────────────────────

  describe('executeCypher — auto LIMIT enforcement', () => {
    it('should auto-append LIMIT 50 when no LIMIT specified', async () => {
      await executeCypher('MATCH (n:Doctor) RETURN n');
      expect(mockNeo4jRead).toHaveBeenCalledWith(
        'MATCH (n:Doctor) RETURN n LIMIT 50',
        {},
      );
    });

    it('should not modify query when LIMIT already present', async () => {
      await executeCypher('MATCH (n:Doctor) RETURN n LIMIT 10');
      expect(mockNeo4jRead).toHaveBeenCalledWith(
        'MATCH (n:Doctor) RETURN n LIMIT 10',
        {},
      );
    });

    it('should pass params to neo4j.read', async () => {
      const params = { doctorId: 'abc-123' };
      await executeCypher('MATCH (n:Doctor {pgId: $doctorId}) RETURN n', params);
      expect(mockNeo4jRead).toHaveBeenCalledWith(
        expect.any(String),
        params,
      );
    });
  });

  // ─── Result cleaning (Neo4j Integer objects) ─────────────────────────────

  describe('executeCypher — Neo4j Integer cleaning', () => {
    it('should convert Neo4j Integer objects (low/high) to plain numbers', async () => {
      mockNeo4jRead.mockResolvedValueOnce([
        { name: 'Dr. Test', connections: { low: 42, high: 0 } },
      ]);

      const result = await executeCypher('MATCH (n:Doctor) RETURN n.name AS name, count(*) AS connections');
      expect(result).toEqual([{ name: 'Dr. Test', connections: 42 }]);
    });

    it('should pass through regular values unchanged', async () => {
      mockNeo4jRead.mockResolvedValueOnce([
        { name: 'Dr. Test', city: 'São Paulo' },
      ]);

      const result = await executeCypher('MATCH (n:Doctor) RETURN n.name AS name, n.city AS city');
      expect(result).toEqual([{ name: 'Dr. Test', city: 'São Paulo' }]);
    });

    it('should limit results to 50 items', async () => {
      const manyResults = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      mockNeo4jRead.mockResolvedValueOnce(manyResults);

      const result = await executeCypher('MATCH (n) RETURN n');
      expect(result).toHaveLength(50);
    });
  });

  // ─── Injection via comments ──────────────────────────────────────────────

  describe('executeCypher — injection attempts', () => {
    it('should block DELETE hidden in block comment', async () => {
      // Attacker tries: MATCH (n) /*RETURN n*/ DELETE n RETURN n
      const result = await executeCypher('MATCH (n) /*RETURN n*/ DELETE n RETURN n');
      expect(result).toHaveProperty('error');
    });

    it('should block CREATE after line comment strip', async () => {
      // After stripping "// safe query", "CREATE" becomes visible
      const result = await executeCypher('MATCH (n) // safe query\nCREATE (n:Hack) RETURN n');
      expect(result).toHaveProperty('error');
    });

    it('should block queries trying to bypass with whitespace', async () => {
      const result = await executeCypher('   MATCH (n)   DELETE   n   RETURN n');
      expect(result).toHaveProperty('error');
    });

    it('should handle multiline dangerous queries', async () => {
      const query = `MATCH (n:Doctor)
WHERE n.name = "test"
SET n.name = "hacked"
RETURN n`;
      const result = await executeCypher(query);
      expect(result).toHaveProperty('error');
    });
  });

  // ─── processQuery with chatWithFallback ──────────────────────────────────

  describe('processQuery', () => {
    it('should return answer from LLM when no tool calls', async () => {
      mockLLMFactory.chatWithFallback.mockResolvedValueOnce({
        content: 'Found 5 cardiologists in São Paulo.',
        toolCalls: [],
        finishReason: 'stop',
        provider: 'openai',
      });

      const result = await agent.processQuery('cardiologistas em São Paulo');
      expect(result.answer).toBe('Found 5 cardiologists in São Paulo.');
      expect(result.sources).toEqual([]);
    });

    it('should return max iterations message when limit exceeded', async () => {
      // Mock always returning tool calls to exhaust iterations
      mockLLMFactory.chatWithFallback.mockResolvedValue({
        content: 'Searching...',
        toolCalls: [{ id: 'call_1', name: 'execute_cypher', arguments: { query: 'MATCH (n) RETURN n', params: {} } }],
        finishReason: 'tool_calls',
        provider: 'openai',
      });

      const result = await agent.processQuery('complex query');
      expect(result.answer).toContain('excedeu o número máximo');
      expect(mockLLMFactory.chatWithFallback).toHaveBeenCalledTimes(5); // MAX_ITERATIONS
    });
  });
});
