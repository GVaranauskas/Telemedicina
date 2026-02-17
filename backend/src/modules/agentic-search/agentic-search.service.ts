import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { RedisService } from '../../database/redis/redis.service';
import { SearchAgent } from './agents/search.agent';
import { RecommendationAgent } from './agents/recommendation.agent';
import * as crypto from 'crypto';

// Cache TTL in seconds
const QUERY_CACHE_TTL = 600; // 10 minutes
const RECOMMENDATION_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AgenticSearchService {
  private readonly logger = new Logger(AgenticSearchService.name);
  private readonly hasLLM: boolean;

  constructor(
    private readonly searchAgent: SearchAgent,
    private readonly recommendationAgent: RecommendationAgent,
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
    this.logger.log(
      `Agentic search: "${queryText}" by doctor ${doctorId}`,
    );

    // ─── Strategy 1: Redis response cache ─────────────────────────────
    const cacheKey = this.buildCacheKey('search', doctorId, queryText);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT for query: "${queryText}"`);
      return { ...cached, cached: true };
    }

    let result: any;

    if (!this.hasLLM) {
      result = await this.queryWithFallback(doctorId, queryText);
    } else {
      // ─── Strategy 2: Smart routing ────────────────────────────────
      // Simple pattern-based queries go direct to Neo4j/Prisma (no LLM cost)
      const directResult = await this.tryDirectQuery(doctorId, queryText);
      if (directResult) {
        result = directResult;
      } else {
        result = await this.queryWithLLM(doctorId, queryText);
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

  // ─── Smart Routing: bypass LLM for simple queries ───────────────────
  // Returns null if the query is too complex for direct handling.
  private async tryDirectQuery(doctorId: string, queryText: string): Promise<any | null> {
    const q = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Detect query complexity markers that need LLM reasoning
    const complexMarkers = [
      'como', 'por que', 'porque', 'explique', 'analise', 'compare',
      'caminho', 'path', 'em comum', 'quem na minha', 'minha rede',
      'mais conectado', 'mais endossado', 'top', 'ranking',
      'recomend', 'sugir', 'sugeri',
      // Career & Mentorship markers
      'mentor', 'mentoria', 'carreira', 'trajetoria', 'certificacao',
      'certificado', 'progresso', 'milestone', 'marco',
      // Events & Courses markers
      'evento', 'congresso', 'simposio', 'workshop', 'webinar', 'palestra',
      'curso', 'treinamento', 'capacitacao', 'trilha', 'aprendizado',
    ];
    if (complexMarkers.some((m) => q.includes(m))) {
      return null; // Too complex, use LLM
    }

    // Simple specialty + city queries
    const matchedSpec = await this.matchSpecialty(q);
    const matchedCity = this.matchCity(q);

    // Is it a job search?
    const isJob = /vaga|vagas|plantao|plantoes|emprego/.test(q);
    // Is it an institution search?
    const isInst = /hospital|hospitais|clinica|clinicas|instituicao|ubs|upa/.test(q);
    // Is it a skill search?
    const isSkill = /sabe|faz|procedimento|habilidade|skill/.test(q);

    // Only handle clear single-dimension queries
    if (isJob && (matchedSpec || matchedCity)) {
      return this.directJobSearch(matchedSpec, matchedCity, q);
    }
    if (isInst && matchedCity) {
      return this.directInstitutionSearch(matchedCity);
    }
    if (!isJob && !isInst && !isSkill && matchedSpec && matchedCity) {
      return this.directDoctorSearch(doctorId, matchedSpec, matchedCity);
    }
    if (!isJob && !isInst && !isSkill && matchedSpec && !matchedCity) {
      return this.directDoctorSearch(doctorId, matchedSpec, null);
    }

    return null; // Not a simple query, use LLM
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
      routed: 'direct', // Indicates this bypassed LLM
    };
  }

  private async directInstitutionSearch(city: any) {
    const institutions = await this.prisma.institution.findMany({
      where: { city: { contains: city.city, mode: 'insensitive' } },
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
      answer: `Encontrei ${institutions.length} instituição(ões) em ${city.city}. ${institutions.map((i) => i.name).join(', ')}.`,
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

  // ─── Helper: match specialty from query ─────────────────────────────
  private async matchSpecialty(q: string) {
    const allSpecialties = await this.prisma.specialty.findMany();
    return allSpecialties.find((s) => {
      const specNorm = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const firstWord = specNorm.split(' ')[0];
      if (q.includes(specNorm) || q.includes(firstWord)) return true;
      const stem = firstWord.replace(/logia$/, 'log').replace(/ia$/, '');
      if (q.includes(stem + 'ista') || q.includes(stem + 'istas')) return true;
      if (stem.length >= 5 && q.includes(stem)) return true;
      return false;
    }) || null;
  }

  // ─── Helper: match city from query ──────────────────────────────────
  private matchCity(q: string) {
    const cityPatterns = [
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
    return cityPatterns.find((cp) => cp.pattern.test(q)) || null;
  }

  // ─── Cache key builder ──────────────────────────────────────────────
  // Normalizes the query so "Cardiologistas em SP" and "cardiologistas em sp"
  // hit the same cache entry.
  private buildCacheKey(prefix: string, doctorId: string, query: string): string {
    const normalized = query
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
    const hash = crypto.createHash('md5').update(normalized).digest('hex').slice(0, 12);
    return `agentic:${prefix}:${doctorId}:${hash}`;
  }

  private async queryWithLLM(doctorId: string, queryText: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, fullName: true },
    });

    const context = doctor
      ? { doctorId: doctor.id, fullName: doctor.fullName }
      : undefined;

    const result = await this.searchAgent.processQuery(queryText, context);

    // Extract structured results from sources
    const structuredResults: any[] = [];
    for (const source of result.sources || []) {
      if (source.data && Array.isArray(source.data)) {
        for (const item of source.data) {
          structuredResults.push(this.formatResultItem(item, source.tool));
        }
      }
    }

    return {
      query: queryText,
      answer: result.answer,
      results: structuredResults.length > 0 ? structuredResults : result.sources || [],
      toolsUsed: [...new Set((result.sources || []).map((s: any) => s.tool).filter(Boolean))],
    };
  }

  private formatResultItem(item: any, toolName: string): any {
    if (!item) return null;
    // Doctor result
    if (item.fullName || item.crm) {
      return {
        type: 'doctor',
        id: item.pgId || item.id,
        title: `${item.fullName || item.name}${item.crm ? ` - CRM ${item.crm}/${item.crmState || ''}` : ''}`,
        subtitle: item.city ? `${item.city}/${item.state || ''}` : undefined,
        data: item,
      };
    }
    // Job result
    if (item.title && (item.shift || item.isActive !== undefined)) {
      return {
        type: 'job',
        id: item.pgId || item.id,
        title: item.title,
        subtitle: `${item.institution?.name || item.institution || ''} - ${item.city || ''}`,
        data: item,
      };
    }
    // Institution result
    if (item.type && item.name && (item.city || item.state)) {
      return {
        type: 'institution',
        id: item.pgId || item.id,
        title: item.name,
        subtitle: `${item.type} - ${item.city || ''}/${item.state || ''}`,
        data: item,
      };
    }
    // Generic
    return {
      type: toolName?.includes('job') ? 'job' : toolName?.includes('institution') ? 'institution' : 'doctor',
      id: item.pgId || item.id || '',
      title: item.fullName || item.name || item.title || JSON.stringify(item).slice(0, 80),
      subtitle: item.city ? `${item.city}/${item.state || ''}` : undefined,
      data: item,
    };
  }

  /**
   * Fallback search using Neo4j graph + Prisma when no LLM is configured.
   */
  private async queryWithFallback(doctorId: string, queryText: string) {
    const q = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const matchedSpec = await this.matchSpecialty(q);
    const matchedCity = this.matchCity(q);

    const isJob = /vaga|vagas|plantao|plantoes|emprego|trabalho/.test(q);
    const isInst = /hospital|hospitais|clinica|clinicas|instituicao|instituicoes|upa|ubs/.test(q);

    if (isJob) return this.directJobSearch(matchedSpec, matchedCity, q);
    if (isInst) return this.directInstitutionSearch(matchedCity);
    return this.directDoctorSearch(doctorId, matchedSpec, matchedCity);
  }

  async getRecommendations(doctorId: string) {
    // ─── Redis cache for recommendations ──────────────────────────────
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
}
