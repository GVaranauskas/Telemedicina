import { Neo4jService } from './neo4j.service';
import { ConfigService } from '@nestjs/config';

// ─── Shared mock state (must be declared before jest.mock hoisting) ──────────

const mockRun = jest.fn();
const mockExecuteRead = jest.fn();
const mockExecuteWrite = jest.fn();
const mockSessionClose = jest.fn().mockResolvedValue(undefined);
const mockVerifyConnectivity = jest.fn().mockResolvedValue(undefined);
const mockGetServerInfo = jest.fn().mockResolvedValue({ address: 'localhost:7687', protocolVersion: 5.0 });
const mockDriverClose = jest.fn().mockResolvedValue(undefined);

const mockSessionObj = {
  executeRead: mockExecuteRead,
  executeWrite: mockExecuteWrite,
  close: mockSessionClose,
};

const mockDriverSession = jest.fn().mockReturnValue(mockSessionObj);

jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: jest.fn(() => ({
      session: mockDriverSession,
      verifyConnectivity: mockVerifyConnectivity,
      getServerInfo: mockGetServerInfo,
      close: mockDriverClose,
    })),
    auth: { basic: jest.fn().mockReturnValue({}) },
    session: { READ: 'READ', WRITE: 'WRITE' },
  },
}));

function createConfigService(overrides: Record<string, any> = {}): ConfigService {
  const defaults: Record<string, any> = {
    'neo4j.uri': 'bolt://localhost:7687',
    'neo4j.user': 'neo4j',
    'neo4j.password': 'test_password',
    'neo4j.database': 'neo4j',
    'neo4j.maxConnectionPoolSize': 50,
    'neo4j.connectionAcquisitionTimeout': 30000,
    'neo4j.connectionTimeout': 5000,
    'neo4j.maxTransactionRetryTime': 15000,
    'neo4j.encrypted': false,
  };
  const merged = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => merged[key]) } as unknown as ConfigService;
}

describe('Neo4jService', () => {
  let service: Neo4jService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVerifyConnectivity.mockResolvedValue(undefined);
    mockGetServerInfo.mockResolvedValue({ address: 'localhost:7687', protocolVersion: 5.0 });
    mockDriverClose.mockResolvedValue(undefined);
    mockSessionClose.mockResolvedValue(undefined);
    mockDriverSession.mockReturnValue(mockSessionObj);

    const config = createConfigService();
    service = new Neo4jService(config);
    await service.onModuleInit();
  });

  // ─── Initialization ──────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should connect to Neo4j and log server info', () => {
      expect(mockVerifyConnectivity).toHaveBeenCalled();
      expect(mockGetServerInfo).toHaveBeenCalled();
    });

    it('should not crash when connection fails', async () => {
      jest.clearAllMocks();
      mockVerifyConnectivity.mockRejectedValueOnce(new Error('Connection refused'));

      const config = createConfigService();
      const newService = new Neo4jService(config);
      await expect(newService.onModuleInit()).resolves.toBeUndefined();
    });
  });

  // ─── Shutdown ──────────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('should close the driver', async () => {
      await service.onModuleDestroy();
      expect(mockDriverClose).toHaveBeenCalled();
    });

    it('should handle double-close gracefully', async () => {
      await service.onModuleDestroy();
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  // ─── isHealthy ────────────────────────────────────────────────────────

  describe('isHealthy', () => {
    it('should return true when connected', async () => {
      mockVerifyConnectivity.mockResolvedValueOnce(undefined);
      expect(await service.isHealthy()).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockVerifyConnectivity.mockRejectedValueOnce(new Error('Connection lost'));
      expect(await service.isHealthy()).toBe(false);
    });

    it('should return false when driver is null', async () => {
      await service.onModuleDestroy();
      expect(await service.isHealthy()).toBe(false);
    });
  });

  // ─── getSession ───────────────────────────────────────────────────────

  describe('getSession', () => {
    it('should throw when driver is null', async () => {
      await service.onModuleDestroy();
      expect(() => service.getSession()).toThrow('Neo4j driver not initialized');
    });
  });

  // ─── read ─────────────────────────────────────────────────────────────

  describe('read', () => {
    it('should execute read query and return mapped results', async () => {
      const mockRecords = [
        { toObject: () => ({ name: 'Dr. Test', city: 'São Paulo' }) },
        { toObject: () => ({ name: 'Dr. Test2', city: 'Rio' }) },
      ];
      mockExecuteRead.mockImplementation(async () => ({ records: mockRecords }));

      const results = await service.read('MATCH (n:Doctor) RETURN n');
      expect(results).toEqual([
        { name: 'Dr. Test', city: 'São Paulo' },
        { name: 'Dr. Test2', city: 'Rio' },
      ]);
    });

    it('should return empty array when no records', async () => {
      mockExecuteRead.mockImplementation(async () => ({ records: [] }));
      const results = await service.read('MATCH (n:Nothing) RETURN n');
      expect(results).toEqual([]);
    });
  });

  // ─── write ────────────────────────────────────────────────────────────

  describe('write', () => {
    it('should execute write query', async () => {
      mockExecuteWrite.mockImplementation(async () => ({ records: [] }));
      const results = await service.write('CREATE (n:Test) RETURN n');
      expect(results).toEqual([]);
      expect(mockExecuteWrite).toHaveBeenCalled();
    });
  });

  // ─── writeTransaction ────────────────────────────────────────────────

  describe('writeTransaction', () => {
    it('should execute multiple operations in single transaction', async () => {
      const txRun = jest.fn().mockResolvedValue({ records: [] });
      mockExecuteWrite.mockImplementation(async (fn) => {
        await fn({ run: txRun });
      });

      await service.writeTransaction([
        { cypher: 'MERGE (n:Doctor {id: $id})', params: { id: '1' } },
        { cypher: 'MERGE (m:Specialty {name: $name})', params: { name: 'Cardiologia' } },
      ]);

      expect(txRun).toHaveBeenCalledTimes(2);
      expect(txRun).toHaveBeenCalledWith('MERGE (n:Doctor {id: $id})', { id: '1' });
      expect(txRun).toHaveBeenCalledWith('MERGE (m:Specialty {name: $name})', { name: 'Cardiologia' });
    });

    it('should close session even on error', async () => {
      mockExecuteWrite.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(
        service.writeTransaction([{ cypher: 'INVALID' }]),
      ).rejects.toThrow('Transaction failed');
      expect(mockSessionClose).toHaveBeenCalled();
    });

    it('should use empty params when not provided', async () => {
      const txRun = jest.fn().mockResolvedValue({ records: [] });
      mockExecuteWrite.mockImplementation(async (fn) => {
        await fn({ run: txRun });
      });

      await service.writeTransaction([{ cypher: 'MERGE (n:Test)' }]);
      expect(txRun).toHaveBeenCalledWith('MERGE (n:Test)', {});
    });
  });

  // ─── Retry logic ──────────────────────────────────────────────────────

  describe('executeWithRetry', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    });

    it('should retry on transient errors', async () => {
      const transientError = new Error('Connection lost');
      (transientError as any).code = 'Neo.TransientError.General';

      mockExecuteRead
        .mockRejectedValueOnce(transientError)
        .mockImplementationOnce(async () => ({
          records: [{ toObject: () => ({ ok: true }) }],
        }));

      const results = await service.read('MATCH (n) RETURN n');
      expect(results).toEqual([{ ok: true }]);
      expect(mockExecuteRead).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-transient errors', async () => {
      const syntaxError = new Error('Syntax error');
      (syntaxError as any).code = 'Neo.ClientError.Statement.SyntaxError';

      mockExecuteRead.mockRejectedValueOnce(syntaxError);

      await expect(service.read('INVALID CYPHER')).rejects.toThrow('Syntax error');
      expect(mockExecuteRead).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retry attempts', async () => {
      const transientError = new Error('Service unavailable');
      (transientError as any).code = 'ServiceUnavailable';

      mockExecuteRead.mockRejectedValue(transientError);

      await expect(service.read('MATCH (n) RETURN n')).rejects.toThrow('Service unavailable');
      expect(mockExecuteRead).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const sleepSpy = jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
      const transientError = new Error('Transient');
      (transientError as any).code = 'ServiceUnavailable';

      mockExecuteRead.mockRejectedValue(transientError);

      await expect(service.read('MATCH (n) RETURN n')).rejects.toThrow();

      // First retry: 200ms, Second retry: 400ms
      expect(sleepSpy).toHaveBeenCalledWith(200);
      expect(sleepSpy).toHaveBeenCalledWith(400);
    });
  });

  // ─── isTransientError ─────────────────────────────────────────────────

  describe('isTransientError', () => {
    const isTransient = (error: any) => (service as any).isTransientError(error);

    it('should classify TransientError as transient', () => {
      expect(isTransient({ code: 'Neo.TransientError.General' })).toBe(true);
    });

    it('should classify ServiceUnavailable as transient', () => {
      expect(isTransient({ code: 'ServiceUnavailable' })).toBe(true);
    });

    it('should classify SessionExpired as transient', () => {
      expect(isTransient({ code: 'SessionExpired' })).toBe(true);
    });

    it('should classify ECONNRESET as transient', () => {
      expect(isTransient({ code: 'ECONNRESET' })).toBe(true);
    });

    it('should classify ECONNREFUSED as transient', () => {
      expect(isTransient({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should not classify syntax errors as transient', () => {
      expect(isTransient({ code: 'Neo.ClientError.Statement.SyntaxError' })).toBe(false);
    });

    it('should handle null/undefined error', () => {
      expect(isTransient(null)).toBe(false);
      expect(isTransient(undefined)).toBe(false);
    });
  });
});
