import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { RedisService } from '../../database/redis/redis.service';
import { SearchAgent } from './agents/search.agent';
import { RecommendationAgent } from './agents/recommendation.agent';
import { CollaborationAgent } from './agents/collaboration.agent';
import { CareerAgent } from './agents/career.agent';
import { EventAgent } from './agents/event.agent';
import { EVENTS } from '../../events/events.constants';
import * as crypto from 'crypto';

// Cache TTL in seconds
const QUERY_CACHE_TTL = 600;           // 10 minutes
const RECOMMENDATION_CACHE_TTL = 300;  // 5 minutes
const AGENT_CACHE_TTL = 300;           // 5 minutes for collaboration/career/events
const SPECIALTY_CACHE_TTL = 3600;      // 1 hour for specialty list

// Rate limiting
const RATE_LIMIT_WINDOW = 60;          // 1 minute window
const RATE_LIMIT_MAX_QUERIES = 20;     // max queries per minute

@Injectable()
export class AgenticSearchService {
  private readonly logger = new Logger(AgenticSearchService.name);
  private readonly hasLLM: boolean;
  private cachedSpecialties: { data: any[]; expiresAt: number } | null = null;
  private inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly searchAgent: SearchAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly collaborationAgent: CollaborationAgent,
    private readonly careerAgent: CareerAgent,
    private readonly eventAgent: EventAgent,
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const openaiKey = this.config.get<string>('llm.openaiApiKey');
    const claudeKey = this.config.get<string>('llm.anthropicApiKey');
    const geminiKey = this.config.get<string>('llm.googleAiApiKey');
    this.hasLLM = !!(openaiKey || claudeKey || geminiKey);
    if (!this.hasLLM) {
      this.logger.warn('No LLM API key configured. Using graph-based fallback search.');
    }
  }

  async query(doctorId: string, queryText: string) {
    // Rate limit check
    await this.checkRateLimit(doctorId);

    // Sanitize input
    const sanitizedQuery = this.sanitizeInput(queryText);

    this.logger.log(
      `Agentic search: "${sanitizedQuery}" by doctor ${doctorId}`,
    );

    // ─── Strategy 1: Redis response cache ─────────────────────────────
    const cacheKey = this.buildCacheKey('search', doctorId, sanitizedQuery);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT for query: "${sanitizedQuery}"`);
      return { ...cached, cached: true };
    }

    let result: any;

    if (!this.hasLLM) {
      result = await this.queryWithFallback(doctorId, sanitizedQuery);
    } else {
      // ─── Strategy 2: Smart routing ────────────────────────────────
      const directResult = await this.tryDirectQuery(doctorId, sanitizedQuery);
      if (directResult) {
        result = directResult;
      } else {
        result = await this.queryWithLLM(doctorId, sanitizedQuery);
      }
    }

    // Cache the result
    try {
      await this.redis.setJson(cacheKey, result, QUERY_CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to cache search result', e?.message);
    }

    return result;
  }

  async getRecommendations(doctorId: string) {
    const cacheKey = `agentic:recommendations:${doctorId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      this.logger.log(`Recommendations cache HIT for doctor ${doctorId}`);
      return { ...cached, cached: true };
    }

    const result = await this.recommendationAgent.getRecommendations(doctorId);

    try {
      await this.redis.setJson(cacheKey, result, RECOMMENDATION_CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to cache recommendations', e?.message);
    }

    return result;
  }

  async getCollaborationSuggestions(doctorId: string) {
    const cacheKey = `agentic:collaboration:${doctorId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const result = await this.collaborationAgent.getCollaborationSuggestions(doctorId);

    try {
      await this.redis.setJson(cacheKey, result, AGENT_CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to cache collaboration suggestions', e?.message);
    }

    return result;
  }

  async getCareerSuggestions(doctorId: string) {
    const cacheKey = `agentic:career:${doctorId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const result = await this.careerAgent.getCareerSuggestions(doctorId);

    try {
      await this.redis.setJson(cacheKey, result, AGENT_CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to cache career suggestions', e?.message);
    }

    return result;
  }

  async getEventSuggestions(doctorId: string) {
    const cacheKey = `agentic:events:${doctorId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const result = await this.eventAgent.getEventSuggestions(doctorId);

    try {
      await this.redis.setJson(cacheKey, result, AGENT_CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to cache event suggestions', e?.message);
    }

    return result;
  }

  async getDashboard(doctorId: string) {
    const [recommendations, collaboration, career, events] = await Promise.all([
      this.getRecommendations(doctorId),
      this.getCollaborationSuggestions(doctorId),
      this.getCareerSuggestions(doctorId),
      this.getEventSuggestions(doctorId),
    ]);

    return { recommendations, collaboration, career, events };
  }

  // ─── Input Sanitization ───────────────────────────────────────────────
  private sanitizeInput(input: string): string {
    return input
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      // Limit length (defense in depth, DTO also validates)
      .slice(0, 500);
  }

  // ─── Rate Limiting (Redis primary, in-memory fallback) ───────────────
  private async checkRateLimit(doctorId: string): Promise<void> {
    const key = `ratelimit:agentic:${doctorId}`;
    try {
      const current = await this.redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= RATE_LIMIT_MAX_QUERIES) {
        throw new Error('Rate limit exceeded. Please wait before making more queries.');
      }

      if (count === 0) {
        await this.redis.set(key, '1', RATE_LIMIT_WINDOW);
      } else {
        await this.redis.incr(key);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit')) {
        throw error;
      }
      // Redis unavailable — fall back to in-memory rate limiting
      this.logger.warn('Redis unavailable for rate limiting, using in-memory fallback');
      this.checkRateLimitInMemory(doctorId);
    }
  }

  private checkRateLimitInMemory(doctorId: string): void {
    const now = Date.now();
    const entry = this.inMemoryRateLimit.get(doctorId);

    if (!entry || now > entry.resetAt) {
      this.inMemoryRateLimit.set(doctorId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW * 1000,
      });
      // Periodic cleanup: remove stale entries when map grows too large
      if (this.inMemoryRateLimit.size > 1000) {
        for (const [key, val] of this.inMemoryRateLimit) {
          if (now > val.resetAt) this.inMemoryRateLimit.delete(key);
        }
      }
      return;
    }

    if (entry.count >= RATE_LIMIT_MAX_QUERIES) {
      throw new Error('Rate limit exceeded. Please wait before making more queries.');
    }

    entry.count++;
  }

  // ─── Smart Routing: bypass LLM for simple queries ───────────────────
  private async tryDirectQuery(doctorId: string, queryText: string): Promise<any | null> {
    const q = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const complexMarkers = [
      'como', 'por que', 'porque', 'explique', 'analise', 'compare',
      'caminho', 'path', 'em comum', 'quem na minha', 'minha rede',
      'mais conectado', 'mais endossado', 'top', 'ranking',
      'recomend', 'sugir', 'sugeri',
      'mentor', 'mentoria', 'carreira', 'trajetoria', 'certificacao',
      'certificado', 'progresso', 'milestone', 'marco',
      'evento', 'congresso', 'simposio', 'workshop', 'webinar', 'palestra',
      'curso', 'treinamento', 'capacitacao', 'trilha', 'aprendizado',
    ];
    if (complexMarkers.some((m) => q.includes(m))) {
      return null;
    }

    const matchedSpec = await this.matchSpecialty(q);
    const matchedCity = await this.matchCity(q);

    const isJob = /vaga|vagas|plantao|plantoes|emprego|oportunidade/.test(q);
    const isInst = /hospital|hospitais|clinica|clinicas|instituicao|ubs|upa|laboratorio/.test(q);
    const isSkill = /sabe|faz|procedimento|habilidade|skill/.test(q);
    const isDoctor = /medico|medicos|doutor|doutora|dra|dr\.?\s|especialista|especialistas/.test(q);

    if (isJob) {
      return this.directJobSearch(matchedSpec, matchedCity, q);
    }
    if (isInst) {
      return this.directInstitutionSearch(matchedCity);
    }
    // Doctor search: by specialty+city, specialty only, or generic "médico" queries
    if (!isJob && !isInst && !isSkill) {
      if (matchedSpec || matchedCity || isDoctor) {
        return this.directDoctorSearch(doctorId, matchedSpec, matchedCity);
      }
    }

    return null;
  }

  private async directJobSearch(spec: any, city: any, q: string) {
    const where: any = { isActive: true };
    if (city) where.city = { contains: city.city, mode: 'insensitive' };
    if (spec) where.specialtyId = spec.id;
    if (q.includes('noturno')) where.shift = 'NOTURNO';
    if (q.includes('diurno')) where.shift = 'DIURNO';

    const jobs = await this.prisma.job.findMany({
      where,
      include: { institution: { select: { name: true } }, specialty: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const results = jobs.map((job) => ({
      type: 'job',
      id: job.id,
      title: job.title,
      subtitle: `${job.institution?.name || ''} - ${job.city}/${job.state} - ${job.salaryMin ? `R$ ${job.salaryMin}` : 'A combinar'}`,
    }));

    return {
      query: '',
      answer: `Encontrei ${jobs.length} vaga(s)${city ? ` em ${city.city}` : ''}${spec ? ` na área de ${spec.name}` : ''}. ${jobs.length > 0 ? `Destaque para "${jobs[0].title}".` : 'Nenhuma vaga encontrada.'}`,
      results,
      toolsUsed: ['search_jobs'],
      routed: 'direct',
    };
  }

  private async directInstitutionSearch(city: any) {
    const where = city ? { city: { contains: city.city, mode: 'insensitive' as const } } : {};
    const institutions = await this.prisma.institution.findMany({
      where,
      take: 10,
      orderBy: { name: 'asc' },
    });

    const results = institutions.map((inst) => ({
      type: 'institution',
      id: inst.id,
      title: inst.name,
      subtitle: `${inst.type} - ${inst.city}/${inst.state}`,
    }));

    return {
      query: '',
      answer: `Encontrei ${institutions.length} instituição(ões)${city ? ` em ${city.city}` : ''}. ${institutions.map((i) => i.name).join(', ')}.`,
      results,
      toolsUsed: ['search_institutions'],
      routed: 'direct',
    };
  }

  private async directDoctorSearch(doctorId: string, spec: any, city: any) {
    const where: any = { id: { not: doctorId } };
    if (city) where.city = { contains: city.city, mode: 'insensitive' };
    if (spec) where.specialties = { some: { specialtyId: spec.id } };

    const doctors = await this.prisma.doctor.findMany({
      where,
      include: { specialties: { include: { specialty: true }, take: 1 } },
      take: 10,
    });

    const results = doctors.map((doc) => {
      const specName = doc.specialties?.[0]?.specialty?.name || '';
      return {
        type: 'doctor',
        id: doc.id,
        title: `${doc.fullName} - CRM ${doc.crm}/${doc.crmState}`,
        subtitle: `${specName}${doc.city ? ` - ${doc.city}/${doc.state}` : ''}`,
      };
    });

    return {
      query: '',
      answer: `Encontrei ${doctors.length} médico(s)${spec ? ` na especialidade ${spec.name}` : ''}${city ? ` em ${city.city}` : ''}. ${results.length > 0 ? results.slice(0, 3).map((r) => r.title.split(' - ')[0]).join(', ') + '.' : 'Nenhum resultado.'}`,
      results,
      toolsUsed: ['search_doctors'],
      routed: 'direct',
    };
  }

  // ─── Helper: match specialty from query (cached) ──────────────────────
  private async matchSpecialty(q: string) {
    const specialties = await this.getCachedSpecialties();
    return specialties.find((s) => {
      const specNorm = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const firstWord = specNorm.split(' ')[0];
      if (q.includes(specNorm) || q.includes(firstWord)) return true;
      const stem = firstWord.replace(/logia$/, 'log').replace(/ia$/, '');
      if (q.includes(stem + 'ista') || q.includes(stem + 'istas')) return true;
      if (stem.length >= 5 && q.includes(stem)) return true;
      return false;
    }) || null;
  }

  private async getCachedSpecialties() {
    if (this.cachedSpecialties && Date.now() < this.cachedSpecialties.expiresAt) {
      return this.cachedSpecialties.data;
    }
    const specialties = await this.prisma.specialty.findMany();
    this.cachedSpecialties = {
      data: specialties,
      expiresAt: Date.now() + SPECIALTY_CACHE_TTL * 1000,
    };
    return specialties;
  }

  // ─── Helper: match city from query (database-backed) ──────────────────
  private async matchCity(q: string): Promise<{ city: string; state: string } | null> {
    // Common city abbreviation map for fast local matching
    const knownCities = [
      { pattern: /sao paulo/i, city: 'São Paulo', state: 'SP' },
      { pattern: /rio de janeiro/i, city: 'Rio de Janeiro', state: 'RJ' },
      { pattern: /belo horizonte/i, city: 'Belo Horizonte', state: 'MG' },
      { pattern: /porto alegre/i, city: 'Porto Alegre', state: 'RS' },
      { pattern: /curitiba/i, city: 'Curitiba', state: 'PR' },
      { pattern: /salvador/i, city: 'Salvador', state: 'BA' },
      { pattern: /fortaleza/i, city: 'Fortaleza', state: 'CE' },
      { pattern: /campinas/i, city: 'Campinas', state: 'SP' },
      { pattern: /brasilia/i, city: 'Brasília', state: 'DF' },
      { pattern: /recife/i, city: 'Recife', state: 'PE' },
      { pattern: /manaus/i, city: 'Manaus', state: 'AM' },
      { pattern: /florianopolis/i, city: 'Florianópolis', state: 'SC' },
      { pattern: /londrina/i, city: 'Londrina', state: 'PR' },
      { pattern: /niteroi/i, city: 'Niterói', state: 'RJ' },
      { pattern: /uberlandia/i, city: 'Uberlândia', state: 'MG' },
      { pattern: /ribeirao preto/i, city: 'Ribeirão Preto', state: 'SP' },
      { pattern: /goiania/i, city: 'Goiânia', state: 'GO' },
    ];
    const localMatch = knownCities.find((cp) => cp.pattern.test(q));
    if (localMatch) return { city: localMatch.city, state: localMatch.state };

    // State code match (e.g., "em SP", "no RJ")
    const stateMatch = q.match(/\b(?:em|no|na|de)\s+([a-z]{2})\b/i);
    if (stateMatch) {
      const stateCode = stateMatch[1].toUpperCase();
      const doctorsInState = await this.prisma.doctor.findFirst({
        where: { state: stateCode },
        select: { city: true, state: true },
      });
      if (doctorsInState?.city) {
        return { city: doctorsInState.city, state: doctorsInState.state || stateCode };
      }
    }

    // Fallback: try to find city in database by partial match
    const words = q.split(' ').filter(w => w.length > 3);
    for (const word of words) {
      const normalized = word.charAt(0).toUpperCase() + word.slice(1);
      const found = await this.prisma.doctor.findFirst({
        where: { city: { contains: normalized, mode: 'insensitive' } },
        select: { city: true, state: true },
      });
      if (found?.city) {
        return { city: found.city, state: found.state || '' };
      }
    }

    return null;
  }

  // ─── Cache key builder (SHA-256 for collision resistance) ─────────────
  private buildCacheKey(prefix: string, doctorId: string, query: string): string {
    const normalized = query
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    return `agentic:${prefix}:${doctorId}:${hash}`;
  }

  // ─── Event-driven cache invalidation ──────────────────────────────────

  async invalidateCacheForDoctor(doctorId: string): Promise<void> {
    const keys = [
      `agentic:recommendations:${doctorId}`,
      `agentic:collaboration:${doctorId}`,
      `agentic:career:${doctorId}`,
      `agentic:events:${doctorId}`,
    ];
    try {
      await Promise.all(keys.map((k) => this.redis.del(k)));
      this.logger.debug(`Cache invalidated for doctor ${doctorId}`);
    } catch (e) {
      this.logger.warn(`Failed to invalidate cache for doctor ${doctorId}`, e?.message);
    }
  }

  @OnEvent(EVENTS.DOCTOR_UPDATED)
  async onDoctorUpdated(payload: { id: string }) {
    await this.invalidateCacheForDoctor(payload.id);
  }

  @OnEvent(EVENTS.CONNECTION_CREATED)
  async onConnectionCreated(payload: { doctorId: string; targetDoctorId: string }) {
    await Promise.all([
      this.invalidateCacheForDoctor(payload.doctorId),
      this.invalidateCacheForDoctor(payload.targetDoctorId),
    ]);
  }

  @OnEvent(EVENTS.CONNECTION_REMOVED)
  async onConnectionRemoved(payload: { doctorId: string; targetDoctorId: string }) {
    await Promise.all([
      this.invalidateCacheForDoctor(payload.doctorId),
      this.invalidateCacheForDoctor(payload.targetDoctorId),
    ]);
  }

  @OnEvent(EVENTS.SPECIALTY_ADDED)
  @OnEvent(EVENTS.SPECIALTY_REMOVED)
  @OnEvent(EVENTS.SKILL_ADDED)
  @OnEvent(EVENTS.SKILL_REMOVED)
  async onDoctorProfileChanged(payload: { doctorId: string }) {
    await this.invalidateCacheForDoctor(payload.doctorId);
    // Also invalidate specialty cache so new searches reflect changes
    this.cachedSpecialties = null;
  }

  @OnEvent(EVENTS.JOB_CREATED)
  @OnEvent(EVENTS.JOB_DEACTIVATED)
  async onJobChanged() {
    // Job changes affect all doctor search caches — clear specialty cache
    // Individual doctor caches will expire via TTL (no full flush needed)
    this.cachedSpecialties = null;
  }

  @OnEvent(EVENTS.CERTIFICATION_AWARDED)
  @OnEvent(EVENTS.MENTORSHIP_CREATED)
  @OnEvent(EVENTS.MENTORSHIP_ENDED)
  async onCareerChanged(payload: { doctorId: string }) {
    await this.invalidateCacheForDoctor(payload.doctorId);
  }

  @OnEvent(EVENTS.PUBLICATION_CREATED)
  @OnEvent(EVENTS.CASE_STUDY_CREATED)
  @OnEvent(EVENTS.STUDY_GROUP_MEMBER_ADDED)
  @OnEvent(EVENTS.RESEARCH_PROJECT_MEMBER_ADDED)
  async onCollaborationChanged(payload: { doctorId: string }) {
    await this.invalidateCacheForDoctor(payload.doctorId);
  }

  private async queryWithLLM(doctorId: string, queryText: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, fullName: true },
    });

    const context = doctor
      ? { doctorId: doctor.id, fullName: doctor.fullName }
      : undefined;

    let result: { answer: string; sources: any[] };
    try {
      result = await this.searchAgent.processQuery(queryText, context);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // All LLM providers failed or none configured — graceful degradation
      this.logger.warn(`LLM unavailable: ${msg}. Falling back to direct search.`);
      const fallback = await this.queryWithFallback(doctorId, queryText);
      return {
        ...fallback,
        answer: fallback.answer || 'Mostrando resultados da busca direta.',
        llmUnavailable: true,
      };
    }

    const structuredResults: any[] = [];
    for (const source of result.sources || []) {
      if (source.data && Array.isArray(source.data)) {
        for (const item of source.data) {
          structuredResults.push(this.formatResultItem(item, source.tool));
        }
      }
    }

    // If LLM ran but produced no structured results, enrich with direct DB fallback
    let finalResults = structuredResults;
    if (finalResults.length === 0) {
      try {
        const fallback = await this.queryWithFallback(doctorId, queryText);
        finalResults = fallback.results || [];
      } catch {
        // ignore — return LLM answer without results
      }
    }

    return {
      query: queryText,
      answer: result.answer,
      results: finalResults,
      toolsUsed: [...new Set((result.sources || []).map((s: any) => s.tool).filter(Boolean))],
    };
  }

  private formatResultItem(item: any, toolName: string): any {
    if (!item) return null;
    if (item.fullName || item.crm) {
      return {
        type: 'doctor',
        id: item.pgId || item.id,
        title: `${item.fullName || item.name}${item.crm ? ` - CRM ${item.crm}/${item.crmState || ''}` : ''}`,
        subtitle: item.city ? `${item.city}/${item.state || ''}` : undefined,
        data: item,
      };
    }
    if (item.title && (item.shift || item.isActive !== undefined)) {
      return {
        type: 'job',
        id: item.pgId || item.id,
        title: item.title,
        subtitle: `${item.institution?.name || item.institution || ''} - ${item.city || ''}`,
        data: item,
      };
    }
    if (item.type && item.name && (item.city || item.state)) {
      return {
        type: 'institution',
        id: item.pgId || item.id,
        title: item.name,
        subtitle: `${item.type} - ${item.city || ''}/${item.state || ''}`,
        data: item,
      };
    }
    return {
      type: toolName?.includes('job') ? 'job' : toolName?.includes('institution') ? 'institution' : 'doctor',
      id: item.pgId || item.id || '',
      title: item.fullName || item.name || item.title || JSON.stringify(item).slice(0, 80),
      subtitle: item.city ? `${item.city}/${item.state || ''}` : undefined,
      data: item,
    };
  }

  private async queryWithFallback(doctorId: string, queryText: string) {
    const q = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const matchedSpec = await this.matchSpecialty(q);
    const matchedCity = await this.matchCity(q);

    const isJob = /vaga|vagas|plantao|plantoes|emprego|trabalho/.test(q);
    const isInst = /hospital|hospitais|clinica|clinicas|instituicao|instituicoes|upa|ubs/.test(q);

    if (isJob) return this.directJobSearch(matchedSpec, matchedCity, q);
    if (isInst) return this.directInstitutionSearch(matchedCity);
    return this.directDoctorSearch(doctorId, matchedSpec, matchedCity);
  }
}
