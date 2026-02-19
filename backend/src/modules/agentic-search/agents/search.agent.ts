import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../../database/neo4j/neo4j.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LLMFactory } from '../llm/llm.factory';
import { LLMMessage, LLMToolCall } from '../llm/llm-adapter.interface';
import { ALL_SEARCH_TOOLS } from '../tools/cypher-query.tool';
import { SEARCH_AGENT_SYSTEM_PROMPT } from '../prompts/system-prompts';
import { CYPHER_EXAMPLES } from '../prompts/cypher-examples';

const MAX_ITERATIONS = 5;

@Injectable()
export class SearchAgent {
  private readonly logger = new Logger(SearchAgent.name);

  constructor(
    private readonly llmFactory: LLMFactory,
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
  ) {}

  async processQuery(
    query: string,
    doctorContext?: { doctorId: string; fullName: string },
  ): Promise<{ answer: string; sources: any[] }> {
    const sources: any[] = [];

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `${SEARCH_AGENT_SYSTEM_PROMPT}\n\n${CYPHER_EXAMPLES}\n\n${
          doctorContext
            ? `Contexto do médico logado: ID=${doctorContext.doctorId}, Nome=${doctorContext.fullName}. Use este ID quando a busca se referir a "eu", "meu", "minha rede", etc.`
            : ''
        }`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    // Agent loop — uses chatWithFallback for automatic provider failover
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      this.logger.log(`Agent iteration ${i + 1}/${MAX_ITERATIONS}`);
      const response = await this.llmFactory.chatWithFallback(messages, ALL_SEARCH_TOOLS);

      if (response.toolCalls.length === 0) {
        // Agent is done, return the final answer
        return { answer: response.content || 'Sem resultados encontrados.', sources };
      }

      // Process each tool call - include tool_use blocks for Claude compatibility
      const assistantContent: any[] = [];
      if (response.content) {
        assistantContent.push({ type: 'text', text: response.content });
      }
      for (const tc of response.toolCalls) {
        assistantContent.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }
      messages.push({
        role: 'assistant',
        content: assistantContent.length === 1 && assistantContent[0].type === 'text'
          ? response.content || ''
          : JSON.stringify(assistantContent),
      });

      for (const toolCall of response.toolCalls) {
        this.logger.log(`Executing tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.arguments)}`);
        const toolResult = await this.executeTool(toolCall);
        sources.push({
          tool: toolCall.name,
          args: toolCall.arguments,
          resultCount: Array.isArray(toolResult)
            ? toolResult.length
            : toolResult ? 1 : 0,
          data: Array.isArray(toolResult) ? toolResult : toolResult ? [toolResult] : [],
        });

        // Truncate large tool results to reduce tokens sent back to LLM.
        // Keep first 15 items max, and trim large nested objects.
        const truncatedResult = this.truncateToolResult(toolResult);

        messages.push({
          role: 'tool',
          content: JSON.stringify(truncatedResult),
          toolCallId: toolCall.id,
          name: toolCall.name,
        });
      }
    }

    return { answer: 'A busca excedeu o número máximo de iterações.', sources };
  }

  /**
   * Truncates tool results to reduce token usage.
   * Arrays are limited to 15 items, and long string values are trimmed.
   */
  private truncateToolResult(result: any): any {
    if (Array.isArray(result)) {
      const limited = result.slice(0, 15);
      const truncated = limited.map((item) => this.trimObject(item));
      if (result.length > 15) {
        truncated.push({ _note: `...and ${result.length - 15} more results (truncated)` });
      }
      return truncated;
    }
    if (result && typeof result === 'object') {
      return this.trimObject(result);
    }
    return result;
  }

  private trimObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const trimmed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip large nested objects that aren't essential for LLM reasoning
      if (key === 'data' || key === '_raw') continue;
      if (typeof value === 'string' && value.length > 300) {
        trimmed[key] = value.slice(0, 300) + '...';
      } else if (Array.isArray(value)) {
        trimmed[key] = value.slice(0, 5);
      } else {
        trimmed[key] = value;
      }
    }
    return trimmed;
  }

  private async executeTool(toolCall: LLMToolCall): Promise<any> {
    try {
      switch (toolCall.name) {
        case 'execute_cypher':
          return this.executeCypher(
            toolCall.arguments.query,
            toolCall.arguments.params || {},
          );
        case 'lookup_doctor_details':
          return this.lookupDoctor(toolCall.arguments.doctorId);
        case 'search_jobs':
          return this.searchJobs(toolCall.arguments);
        case 'search_institutions':
          return this.searchInstitutions(toolCall.arguments);
        case 'find_connection_path':
          return this.findConnectionPath(
            toolCall.arguments.fromDoctorId,
            toolCall.arguments.toDoctorId,
          );
        case 'find_doctors_by_skill':
          return this.findDoctorsBySkill(toolCall.arguments as { skillName: string; city?: string; limit?: number });
        case 'get_doctor_network_stats':
          return this.getDoctorNetworkStats(toolCall.arguments.doctorId as string);
        case 'find_common_ground':
          return this.findCommonGround(
            toolCall.arguments.doctorId1 as string,
            toolCall.arguments.doctorId2 as string,
          );
        case 'get_institution_staff':
          return this.getInstitutionStaff(toolCall.arguments as { institutionName?: string; institutionId?: string });
        // Collaboration tools
        case 'find_publications':
          return this.findPublications(toolCall.arguments as { specialty?: string; keyword?: string; authorId?: string; limit?: number });
        case 'find_coauthors':
          return this.findCoauthors(toolCall.arguments as { doctorId: string; limit?: number });
        case 'find_study_groups':
          return this.findStudyGroups(toolCall.arguments as { specialty?: string; doctorId?: string; isPublic?: boolean; limit?: number });
        case 'find_case_studies':
          return this.findCaseStudies(toolCall.arguments as { specialty?: string; status?: string; doctorId?: string; limit?: number });
        case 'find_research_projects':
          return this.findResearchProjects(toolCall.arguments as { status?: string; doctorId?: string; limit?: number });
        case 'find_opinion_leaders':
          return this.findOpinionLeaders(toolCall.arguments as { specialty: string; limit?: number });
        // Career & Mentorship tools
        case 'find_mentors':
          return this.findMentors(toolCall.arguments as { specialty?: string; menteeId?: string; minYearsExperience?: number; limit?: number });
        case 'find_mentees':
          return this.findMentees(toolCall.arguments as { mentorId?: string; specialty?: string; maxYearsExperience?: number; limit?: number });
        case 'analyze_career_paths':
          return this.analyzeCareerPaths(toolCall.arguments as { doctorId: string; specialty?: string });
        case 'find_certifications':
          return this.findCertifications(toolCall.arguments as { specialty?: string; doctorId?: string; certificationType?: string; limit?: number });
        case 'find_career_progress':
          return this.findCareerProgress(toolCall.arguments as { doctorId: string; careerPathId?: string });
        // Events & Courses tools
        case 'find_events':
          return this.findEvents(toolCall.arguments as { eventType?: string; topic?: string; city?: string; isOnline?: boolean; startDate?: string; doctorId?: string; limit?: number });
        case 'find_courses':
          return this.findCourses(toolCall.arguments as { topic?: string; instructorId?: string; enrolledDoctorId?: string; level?: string; limit?: number });
        case 'get_learning_paths':
          return this.getLearningPaths(toolCall.arguments as { doctorId: string; specialty?: string });
        case 'find_event_speakers':
          return this.findEventSpeakers(toolCall.arguments as { eventId?: string; doctorId?: string; topic?: string; limit?: number });
        default:
          return { error: `Unknown tool: ${toolCall.name}` };
      }
    } catch (error) {
      this.logger.error(`Tool ${toolCall.name} failed`, error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async executeCypher(query: string, params: Record<string, any>) {
    // Security: strip comments that could hide dangerous keywords
    const stripped = query
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '')            // Remove line comments
      .trim();

    // Tokenize: only allow MATCH, OPTIONAL MATCH, WHERE, WITH, RETURN, ORDER BY,
    // LIMIT, SKIP, UNWIND, UNION, CASE, COLLECT, COUNT, EXISTS, shortestPath, allShortestPaths
    const dangerousPatterns = [
      /\bDELETE\b/i,
      /\bCREATE\b/i,
      /\bSET\b/i,
      /\bREMOVE\b/i,
      /\bDROP\b/i,
      /\bMERGE\b/i,
      /\bDETACH\b/i,
      /\bCALL\b/i,
      /\bFOREACH\b/i,
      /\bLOAD\b/i,
      /\bPERIODIC\b/i,
    ];
    if (dangerousPatterns.some((pattern) => pattern.test(stripped))) {
      return { error: 'Only read queries (MATCH/RETURN) are allowed' };
    }

    // Must start with MATCH or OPTIONAL or UNWIND or WITH or RETURN
    if (!/^\s*(MATCH|OPTIONAL|UNWIND|WITH|RETURN)\b/i.test(stripped)) {
      return { error: 'Query must start with MATCH, OPTIONAL MATCH, UNWIND, WITH, or RETURN' };
    }

    // Must contain RETURN
    if (!/\bRETURN\b/i.test(stripped)) {
      return { error: 'Query must contain a RETURN clause' };
    }

    // Enforce LIMIT to prevent full graph scans
    const hasLimit = /\bLIMIT\b/i.test(stripped);
    const queryWithLimit = hasLimit ? stripped : `${stripped} LIMIT 50`;

    const results = await this.neo4j.read(queryWithLimit, params);
    return results.slice(0, 50).map((r: any) => {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(r)) {
        if (value && typeof value === 'object' && (value as any).low !== undefined) {
          cleaned[key] = (value as any).low;
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    });
  }

  private async lookupDoctor(doctorId: string) {
    return this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialties: { include: { specialty: true } },
        skills: { include: { skill: true } },
        experiences: {
          include: { institution: { select: { name: true, city: true } } },
          take: 5,
        },
      },
    });
  }

  private async searchJobs(filters: any) {
    const where: any = { isActive: true };
    if (filters.type) where.type = filters.type;
    if (filters.shift) where.shift = filters.shift;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = filters.state.toUpperCase();

    return this.prisma.job.findMany({
      where,
      include: {
        institution: { select: { name: true, city: true } },
        specialty: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async searchInstitutions(filters: any) {
    const where: any = {};
    if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
    if (filters.type) where.type = filters.type;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.state = filters.state.toUpperCase();

    return this.prisma.institution.findMany({
      where,
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  private async findConnectionPath(fromId: string, toId: string) {
    return this.neo4j.read(
      `MATCH path = shortestPath(
        (a:Doctor {pgId: $fromId})-[:CONNECTED_TO*..6]-(b:Doctor {pgId: $toId})
      )
      RETURN [node IN nodes(path) | {id: node.pgId, name: node.fullName}] AS path,
             length(path) AS distance`,
      { fromId, toId },
    );
  }

  private async findDoctorsBySkill(args: {
    skillName: string;
    city?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    const conditions: string[] = [
      `s.name =~ $skillPattern`,
    ];
    const params: any = {
      skillPattern: `(?i).*${args.skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`,
      limit,
    };

    let matchClause = `MATCH (d:Doctor)-[:HAS_SKILL]->(s:Skill)`;

    if (args.city) {
      matchClause += `\nMATCH (d)-[:LOCATED_IN]->(c:City)`;
      conditions.push(`c.name =~ $cityPattern`);
      params.cityPattern = `(?i).*${args.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`;
    }

    const query = `
      ${matchClause}
      WHERE ${conditions.join(' AND ')}
      OPTIONAL MATCH (d)<-[e:ENDORSED {skill: s.name}]-(endorser:Doctor)
      WITH d, s, count(e) AS endorsements
      ORDER BY endorsements DESC
      LIMIT toInteger($limit)
      RETURN d.pgId AS id, d.fullName AS fullName, d.crm AS crm, d.crmState AS crmState,
             d.city AS city, d.state AS state, s.name AS skill, endorsements
    `;

    return this.neo4j.read(query, params).then((results) =>
      results.map((r: any) => ({
        ...r,
        endorsements: r.endorsements?.low ?? r.endorsements ?? 0,
      })),
    );
  }

  private async getDoctorNetworkStats(doctorId: string) {
    const results = await this.neo4j.read(
      `MATCH (d:Doctor {pgId: $doctorId})
       OPTIONAL MATCH (d)-[conn:CONNECTED_TO]-()
       WITH d, count(DISTINCT conn) AS connections
       OPTIONAL MATCH (d)<-[fol:FOLLOWS]-()
       WITH d, connections, count(DISTINCT fol) AS followers
       OPTIONAL MATCH (d)-[:FOLLOWS]->()
       WITH d, connections, followers, count(*) AS following
       OPTIONAL MATCH (d)-[:HAS_SKILL]->(sk:Skill)
       WITH d, connections, followers, following, collect(DISTINCT sk.name) AS skills
       OPTIONAL MATCH (d)<-[end:ENDORSED]-(endorser:Doctor)
       WITH d, connections, followers, following, skills, count(DISTINCT end) AS endorsements
       OPTIONAL MATCH (d)-[:SPECIALIZES_IN]->(spec:Specialty)
       WITH d, connections, followers, following, skills, endorsements, collect(DISTINCT spec.name) AS specialties
       OPTIONAL MATCH (d)-[w:WORKS_AT]->(inst:Institution)
       RETURN d.fullName AS fullName, d.city AS city, d.state AS state,
              connections, followers, following, skills, endorsements, specialties,
              collect({name: inst.name, role: w.role}) AS institutions`,
      { doctorId },
    );

    if (results.length === 0) return { error: 'Doctor not found in graph' };

    const r = results[0] as Record<string, any>;
    return {
      fullName: r.fullName as string,
      city: r.city as string,
      state: r.state as string,
      connections: (r.connections as any)?.low ?? r.connections ?? 0,
      followers: (r.followers as any)?.low ?? r.followers ?? 0,
      following: (r.following as any)?.low ?? r.following ?? 0,
      skills: (r.skills as string[]) || [],
      endorsements: (r.endorsements as any)?.low ?? r.endorsements ?? 0,
      specialties: (r.specialties as string[]) || [],
      institutions: (r.institutions as any[]) || [],
    };
  }

  private async findCommonGround(doctorId1: string, doctorId2: string) {
    const results = await this.neo4j.read(
      `MATCH (a:Doctor {pgId: $id1}), (b:Doctor {pgId: $id2})
       OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(spec:Specialty)<-[:SPECIALIZES_IN]-(b)
       WITH a, b, collect(DISTINCT spec.name) AS sharedSpecs
       OPTIONAL MATCH (a)-[:HAS_SKILL]->(sk:Skill)<-[:HAS_SKILL]-(b)
       WITH a, b, sharedSpecs, collect(DISTINCT sk.name) AS sharedSkills
       OPTIONAL MATCH (a)-[:WORKS_AT]->(inst:Institution)<-[:WORKS_AT]-(b)
       WITH a, b, sharedSpecs, sharedSkills, collect(DISTINCT inst.name) AS sharedInstitutions
       OPTIONAL MATCH (a)-[:CONNECTED_TO]->(mutual:Doctor)<-[:CONNECTED_TO]-(b)
       RETURN a.fullName AS doctor1, b.fullName AS doctor2,
              sharedSpecs, sharedSkills, sharedInstitutions,
              count(DISTINCT mutual) AS mutualConnections`,
      { id1: doctorId1, id2: doctorId2 },
    );

    if (results.length === 0) return { error: 'One or both doctors not found' };
    const r = results[0] as Record<string, any>;
    return {
      doctor1: r.doctor1 as string,
      doctor2: r.doctor2 as string,
      sharedSpecialties: (r.sharedSpecs as string[]) || [],
      sharedSkills: (r.sharedSkills as string[]) || [],
      sharedInstitutions: (r.sharedInstitutions as string[]) || [],
      mutualConnections: (r.mutualConnections as any)?.low ?? r.mutualConnections ?? 0,
    };
  }

  private async getInstitutionStaff(args: {
    institutionName?: string;
    institutionId?: string;
  }) {
    let matchClause = '';
    const params: any = {};

    if (args.institutionId) {
      matchClause = `MATCH (d:Doctor)-[w:WORKS_AT]->(i:Institution {pgId: $institutionId})`;
      params.institutionId = args.institutionId;
    } else if (args.institutionName) {
      matchClause = `MATCH (d:Doctor)-[w:WORKS_AT]->(i:Institution) WHERE i.name =~ $namePattern`;
      params.namePattern = `(?i).*${args.institutionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`;
    } else {
      return { error: 'Provide institutionName or institutionId' };
    }

    const results = await this.neo4j.read(
      `${matchClause}
       OPTIONAL MATCH (d)-[:SPECIALIZES_IN]->(spec:Specialty)
       RETURN i.name AS institution, i.type AS type, i.city AS city,
              d.pgId AS doctorId, d.fullName AS doctorName, w.role AS role,
              collect(DISTINCT spec.name) AS specialties
       ORDER BY d.fullName`,
      params,
    );

    return results;
  }

  // ============================================================================
  // COLLABORATION TOOLS
  // ============================================================================

  private async findPublications(args: {
    specialty?: string;
    keyword?: string;
    authorId?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    let query = `MATCH (p:Publication)`;
    const conditions: string[] = [];
    const params: any = { limit };

    if (args.specialty) {
      query += `\nMATCH (p)-[:RELATES_TO]->(s:Specialty)`;
      conditions.push(`s.name =~ $specialtyPattern`);
      params.specialtyPattern = `(?i).*${args.specialty}.*`;
    }

    if (args.keyword) {
      conditions.push(`p.title =~ $keywordPattern`);
      params.keywordPattern = `(?i).*${args.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`;
    }

    if (args.authorId) {
      query += `\nMATCH (p)<-[:AUTHORED]-(a:Doctor {pgId: $authorId})`;
      params.authorId = args.authorId;
    }

    if (conditions.length > 0) {
      query += `\nWHERE ${conditions.join(' AND ')}`;
    }

    query += `
      OPTIONAL MATCH (p)<-[:AUTHORED]-(author:Doctor)
      WITH p, collect(author.fullName) AS authors
      RETURN p.pgId AS id, p.title AS title, p.journal AS journal,
             p.publicationType AS type, authors
      LIMIT toInteger($limit)`;

    return this.neo4j.read(query, params);
  }

  private async findCoauthors(args: { doctorId: string; limit?: number }) {
    const limit = args.limit || 10;
    return this.neo4j.read(
      `MATCH (me:Doctor {pgId: $doctorId})-[:AUTHORED]->(p:Publication)<-[:AUTHORED]-(coauthor:Doctor)
       WHERE coauthor.pgId <> $doctorId
       WITH coauthor, count(DISTINCT p) AS sharedPapers, collect(DISTINCT p.title)[0..3] AS papers
       ORDER BY sharedPapers DESC
       LIMIT toInteger($limit)
       RETURN coauthor.pgId AS id, coauthor.fullName AS fullName, sharedPapers, papers`,
      { doctorId: args.doctorId, limit },
    );
  }

  private async findStudyGroups(args: {
    specialty?: string;
    doctorId?: string;
    isPublic?: boolean;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    let query = `MATCH (sg:StudyGroup)`;
    const conditions: string[] = [];
    const params: any = { limit };

    if (args.specialty) {
      query += `\nMATCH (sg)-[:FOCUSES_ON]->(s:Specialty)`;
      conditions.push(`s.name =~ $specialtyPattern`);
      params.specialtyPattern = `(?i).*${args.specialty}.*`;
    }

    if (args.doctorId) {
      conditions.push(`NOT (sg)<-[:MEMBER_OF]-(:Doctor {pgId: $doctorId})`);
      params.doctorId = args.doctorId;
    }

    if (args.isPublic !== undefined) {
      conditions.push(`sg.isPublic = $isPublic`);
      params.isPublic = args.isPublic;
    }

    if (conditions.length > 0) {
      query += `\nWHERE ${conditions.join(' AND ')}`;
    }

    query += `
      OPTIONAL MATCH (sg)-[:FOCUSES_ON]->(spec:Specialty)
      OPTIONAL MATCH (sg)<-[:MEMBER_OF]-(m:Doctor)
      RETURN sg.pgId AS id, sg.name AS name, sg.description AS description,
             sg.isPublic AS isPublic, sg.memberCount AS memberCount,
             spec.name AS specialty, count(m) AS actualMembers
      LIMIT toInteger($limit)`;

    return this.neo4j.read(query, params);
  }

  private async findCaseStudies(args: {
    specialty?: string;
    status?: string;
    doctorId?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    let query = `MATCH (cs:CaseStudy)`;
    const conditions: string[] = [];
    const params: any = { limit };

    if (args.specialty) {
      query += `\nMATCH (cs)-[:RELATES_TO]->(s:Specialty)`;
      conditions.push(`s.name =~ $specialtyPattern`);
      params.specialtyPattern = `(?i).*${args.specialty}.*`;
    }

    if (args.status) {
      conditions.push(`cs.status = $status`);
      params.status = args.status;
    }

    if (args.doctorId) {
      conditions.push(`NOT (cs)<-[:PARTICIPATED_IN]-(:Doctor {pgId: $doctorId})`);
      conditions.push(`NOT (cs)<-[:AUTHORED]-(:Doctor {pgId: $doctorId})`);
      params.doctorId = args.doctorId;
    }

    if (conditions.length > 0) {
      query += `\nWHERE ${conditions.join(' AND ')}`;
    }

    query += `
      OPTIONAL MATCH (cs)<-[:AUTHORED]-(author:Doctor)
      OPTIONAL MATCH (cs)-[:RELATES_TO]->(spec:Specialty)
      OPTIONAL MATCH (cs)<-[:PARTICIPATED_IN]-(p:Doctor)
      RETURN cs.pgId AS id, cs.title AS title, cs.status AS status,
             author.fullName AS author, spec.name AS specialty,
             cs.viewCount AS views, count(p) AS participants
      LIMIT toInteger($limit)`;

    return this.neo4j.read(query, params);
  }

  private async findResearchProjects(args: {
    status?: string;
    doctorId?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    let query = `MATCH (rp:ResearchProject)`;
    const conditions: string[] = [];
    const params: any = { limit };

    if (args.status) {
      conditions.push(`rp.status = $status`);
      params.status = args.status;
    }

    if (conditions.length > 0) {
      query += `\nWHERE ${conditions.join(' AND ')}`;
    }

    query += `
      OPTIONAL MATCH (rp)<-[:COLLABORATES_ON]-(m:Doctor)
      WITH rp, count(m) AS collaborators, collect(m.fullName)[0..5] AS team
      RETURN rp.pgId AS id, rp.title AS title, rp.description AS description,
             rp.status AS status, collaborators, team
      ORDER BY rp.status = 'ACTIVE' DESC, rp.status = 'PLANNING' DESC
      LIMIT toInteger($limit)`;

    return this.neo4j.read(query, params);
  }

  private async findOpinionLeaders(args: { specialty: string; limit?: number }) {
    const limit = args.limit || 10;
    return this.neo4j.read(
      `MATCH (d:Doctor)-[:AUTHORED]->(p:Publication)-[:RELATES_TO]->(s:Specialty)
       WHERE s.name =~ $specialtyPattern
       OPTIONAL MATCH (p)<-[c:CITES]-()
       WITH d, count(DISTINCT p) AS publications, count(c) AS citations,
            (count(DISTINCT p) * 10 + count(c)) AS influenceScore
       ORDER BY influenceScore DESC
       LIMIT toInteger($limit)
       RETURN d.pgId AS id, d.fullName AS fullName, d.city AS city,
              publications, citations, influenceScore`,
      {
        specialtyPattern: `(?i).*${args.specialty}.*`,
        limit,
      },
    );
  }

  // ============================================================================
  // CAREER & MENTORSHIP TOOLS - Phase 2
  // ============================================================================

  private async findMentors(args: {
    specialty?: string;
    menteeId?: string;
    minYearsExperience?: number;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    const minYears = args.minYearsExperience || 10;
    const currentYear = new Date().getFullYear();

    const params: any = { limit, minYears, currentYear };
    
    // Build query based on parameters
    let query = `MATCH (mentor:Doctor)`;
    
    if (args.specialty) {
      query += `\nMATCH (mentor)-[:SPECIALIZES_IN]->(spec:Specialty)`;
      params.specialtyPattern = `(?i).*${args.specialty}.*`;
    }

    // Build WHERE clause
    const conditions: string[] = [];
    conditions.push(`mentor.graduationYear <= $currentYear - $minYears`);
    
    if (args.specialty) {
      conditions.push(`spec.name =~ $specialtyPattern`);
    }

    query += `\nWHERE ${conditions.join(' AND ')}`;

    // If menteeId provided, find mentors connected to mentee's network
    if (args.menteeId) {
      params.menteeId = args.menteeId;
      query += `
       AND mentor.pgId <> $menteeId
       OPTIONAL MATCH (:Doctor {pgId: $menteeId})-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(mentor)
       WITH mentor, count(DISTINCT mutual) AS mutualConnections
       OPTIONAL MATCH (mentor)<-[m:MENTORS]-(:Doctor)
       WITH mentor, mutualConnections, count(m) AS menteeCount
       ORDER BY menteeCount DESC, mutualConnections DESC
       LIMIT toInteger($limit)
       RETURN mentor.pgId AS id, mentor.fullName AS fullName, mentor.city AS city,
              mentor.graduationYear AS graduationYear, menteeCount, mutualConnections`;
    } else {
      query += `
       OPTIONAL MATCH (mentor)<-[m:MENTORS]-(:Doctor)
       WITH mentor, count(m) AS menteeCount
       ORDER BY menteeCount DESC
       LIMIT toInteger($limit)
       RETURN mentor.pgId AS id, mentor.fullName AS fullName, mentor.city AS city,
              mentor.graduationYear AS graduationYear, menteeCount`;
    }

    return this.neo4j.read(query, params);
  }

  private async findMentees(args: {
    mentorId?: string;
    specialty?: string;
    maxYearsExperience?: number;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    const maxYears = args.maxYearsExperience || 5;
    const currentYear = new Date().getFullYear();

    const params: any = { limit, maxYears, currentYear };
    
    let query = `MATCH (mentee:Doctor)`;
    
    if (args.specialty) {
      query += `\nMATCH (mentee)-[:SPECIALIZES_IN]->(spec:Specialty)`;
      params.specialtyPattern = `(?i).*${args.specialty}.*`;
    }

    // Build WHERE clause
    const conditions: string[] = [];
    conditions.push(`mentee.graduationYear >= $currentYear - $maxYears`);
    
    if (args.specialty) {
      conditions.push(`spec.name =~ $specialtyPattern`);
    }
    conditions.push(`NOT (mentee)-[:MENTORS]->(:Doctor)`);

    query += `\nWHERE ${conditions.join(' AND ')}`;

    if (args.mentorId) {
      params.mentorId = args.mentorId;
      query += `
       AND mentee.pgId <> $mentorId
       OPTIONAL MATCH (:Doctor {pgId: $mentorId})-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(mentee)
       WITH mentee, count(DISTINCT mutual) AS mutualConnections
       ORDER BY mutualConnections DESC, mentee.graduationYear DESC
       LIMIT toInteger($limit)
       RETURN mentee.pgId AS id, mentee.fullName AS fullName, mentee.city AS city,
              mentee.graduationYear AS graduationYear, mutualConnections`;
    } else {
      query += `
       ORDER BY mentee.graduationYear DESC
       LIMIT toInteger($limit)
       RETURN mentee.pgId AS id, mentee.fullName AS fullName, mentee.city AS city,
              mentee.graduationYear AS graduationYear`;
    }

    return this.neo4j.read(query, params);
  }

  private async analyzeCareerPaths(args: { doctorId: string; specialty?: string }) {
    // Get doctor's current state
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: args.doctorId },
      include: {
        specialties: { include: { specialty: true } },
        certifications: { include: { certification: true } },
        experiences: true,
        careerProgress: {
          include: {
            careerPath: true,
            milestone: true,
          },
        },
      },
    });

    if (!doctor) return { error: 'Doctor not found' };

    // Find relevant career paths
    const specialtyIds = doctor.specialties.map((s) => s.specialtyId);
    const careerPaths = await this.prisma.careerPath.findMany({
      where: args.specialty
        ? {
            specialty: { name: { contains: args.specialty, mode: 'insensitive' } },
          }
        : { specialtyId: { in: specialtyIds } },
      include: {
        milestones: { orderBy: { orderNum: 'asc' } },
        specialty: true,
      },
    });

    // Analyze progress for each path
    const analysis = careerPaths.map((path) => {
      const progress = doctor.careerProgress.filter((p) => p.careerPathId === path.id);
      const completedMilestones = progress.filter((p) => p.status === 'COMPLETED');
      const inProgressMilestones = progress.filter((p) => p.status === 'IN_PROGRESS');

      const nextMilestone = path.milestones.find(
        (m) => !progress.some((p) => p.milestoneId === m.id && p.status === 'COMPLETED'),
      );

      return {
        careerPath: {
          id: path.id,
          name: path.name,
          specialty: path.specialty?.name,
          avgDurationYears: path.avgDurationYears,
        },
        progress: {
          total: path.milestones.length,
          completed: completedMilestones.length,
          inProgress: inProgressMilestones.length,
          percentage: path.milestones.length > 0
            ? Math.round((completedMilestones.length / path.milestones.length) * 100)
            : 0,
        },
        nextMilestone: nextMilestone
          ? {
              id: nextMilestone.id,
              name: nextMilestone.name,
              order: nextMilestone.orderNum,
              typicalYears: nextMilestone.typicalYears,
            }
          : null,
        completedMilestones: completedMilestones.map((p) => ({
          name: p.milestone.name,
          completedAt: p.completedAt,
        })),
      };
    });

    return {
      doctor: {
        id: doctor.id,
        fullName: doctor.fullName,
        graduationYear: doctor.graduationYear,
        specialties: doctor.specialties.map((s) => s.specialty.name),
        certifications: doctor.certifications.map((c) => c.certification.name),
      },
      careerPaths: analysis,
    };
  }

  private async findCertifications(args: {
    specialty?: string;
    doctorId?: string;
    certificationType?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;

    if (args.doctorId) {
      // Return doctor's certifications
      const certs = await this.prisma.doctorCertification.findMany({
        where: { doctorId: args.doctorId },
        include: { certification: { include: { specialty: true } } },
        orderBy: { issueDate: 'desc' },
        take: limit,
      });

      return certs.map((c) => ({
        id: c.id,
        name: c.certification.name,
        type: c.certification.certificationType,
        issuingBody: c.certification.issuingBody,
        issueDate: c.issueDate,
        expiryDate: c.expiryDate,
        isVerified: c.isVerified,
        specialty: c.certification.specialty?.name,
      }));
    }

    // Find available certifications
    const where: any = {};
    if (args.specialty) {
      where.specialty = { name: { contains: args.specialty, mode: 'insensitive' } };
    }
    if (args.certificationType) {
      where.certificationType = args.certificationType;
    }

    const certs = await this.prisma.certification.findMany({
      where,
      include: { specialty: true },
      take: limit,
    });

    return certs.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.certificationType,
      issuingBody: c.issuingBody,
      validityYears: c.validityYears,
      specialty: c.specialty?.name,
      description: c.description,
    }));
  }

  private async findCareerProgress(args: { doctorId: string; careerPathId?: string }) {
    const where: any = { doctorId: args.doctorId };
    if (args.careerPathId) {
      where.careerPathId = args.careerPathId;
    }

    const progress = await this.prisma.doctorCareerProgress.findMany({
      where,
      include: {
        careerPath: { include: { specialty: true } },
        milestone: true,
      },
      orderBy: { milestone: { orderNum: 'asc' } },
    });

    if (progress.length === 0) {
      return { message: 'No career progress found for this doctor' };
    }

    return progress.map((p) => ({
      careerPath: p.careerPath.name,
      specialty: p.careerPath.specialty?.name,
      milestone: {
        id: p.milestone.id,
        name: p.milestone.name,
        order: p.milestone.orderNum,
        isRequired: p.milestone.isRequired,
      },
      status: p.status,
      completedAt: p.completedAt,
      notes: p.notes,
    }));
  }

  // ============================================================================
  // EVENTS & COURSES TOOLS - Phase 3
  // ============================================================================

  private async findEvents(args: {
    eventType?: string;
    topic?: string;
    city?: string;
    isOnline?: boolean;
    startDate?: string;
    doctorId?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;
    const where: any = { status: { in: ['UPCOMING', 'ONGOING'] } };

    if (args.eventType) where.eventType = args.eventType;
    if (args.isOnline !== undefined) where.isOnline = args.isOnline;
    if (args.startDate) where.startDate = { gte: new Date(args.startDate) };
    if (args.city) where.location = { contains: args.city, mode: 'insensitive' };

    if (args.topic) {
      where.topics = {
        some: {
          topic: { name: { contains: args.topic, mode: 'insensitive' } },
        },
      };
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        organizer: { select: { name: true } },
        topics: { include: { topic: true } },
        _count: { select: { attendees: true, speakers: true } },
      },
      take: limit,
      orderBy: { startDate: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.eventType,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location,
      isOnline: e.isOnline,
      isFree: e.isFree,
      price: e.price,
      organizer: e.organizer.name,
      topics: e.topics.map((t) => t.topic.name),
      attendeeCount: e._count.attendees,
      speakerCount: e._count.speakers,
      eventUrl: e.eventUrl,
    }));
  }

  private async findCourses(args: {
    topic?: string;
    instructorId?: string;
    enrolledDoctorId?: string;
    level?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;

    if (args.enrolledDoctorId) {
      // Find courses the doctor is enrolled in
      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { doctorId: args.enrolledDoctorId },
        include: {
          course: {
            include: {
              instructor: { select: { fullName: true } },
              topics: { include: { topic: true } },
            },
          },
        },
        take: limit,
        orderBy: { enrolledAt: 'desc' },
      });

      return enrollments.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        instructor: e.course.instructor.fullName,
        topics: e.course.topics.map((t) => t.topic.name),
        level: e.course.level,
        progress: e.progress,
        status: e.status,
        enrolledAt: e.enrolledAt,
      }));
    }

    const where: any = { status: 'PUBLISHED' };
    if (args.instructorId) where.instructorId = args.instructorId;
    if (args.level) where.level = args.level;

    if (args.topic) {
      where.topics = {
        some: {
          topic: { name: { contains: args.topic, mode: 'insensitive' } },
        },
      };
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        instructor: { select: { fullName: true } },
        topics: { include: { topic: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
      take: limit,
      orderBy: { enrollmentCount: 'desc' },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      instructor: c.instructor.fullName,
      topics: c.topics.map((t) => t.topic.name),
      level: c.level,
      durationHours: c.durationHours,
      price: c.price,
      rating: c.rating,
      enrollmentCount: c._count.enrollments,
      moduleCount: c._count.modules,
    }));
  }

  private async getLearningPaths(args: { doctorId: string; specialty?: string }) {
    // Get doctor's current state
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: args.doctorId },
      include: {
        specialties: { include: { specialty: true } },
        certifications: { include: { certification: true } },
        courseEnrollments: {
          where: { status: { in: ['ENROLLED', 'IN_PROGRESS'] } },
          include: { course: { include: { topics: { include: { topic: true } } } } },
        },
      },
    });

    if (!doctor) return { error: 'Doctor not found' };

    // Find upcoming events matching specialty
    const specialtyNames = doctor.specialties.map((s) => s.specialty.name);
    const searchSpecialty = args.specialty || specialtyNames[0];

    const events = await this.prisma.event.findMany({
      where: {
        status: { in: ['UPCOMING', 'ONGOING'] },
        startDate: { gte: new Date() },
        OR: [
          { topics: { some: { topic: { name: { contains: searchSpecialty || '', mode: 'insensitive' } } } } },
        ],
      },
      include: {
        organizer: { select: { name: true } },
        topics: { include: { topic: true } },
      },
      take: 5,
      orderBy: { startDate: 'asc' },
    });

    // Find courses matching specialty
    const courses = await this.prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        topics: { some: { topic: { name: { contains: searchSpecialty || '', mode: 'insensitive' } } } },
        NOT: {
          enrollments: { some: { doctorId: args.doctorId } },
        },
      },
      include: {
        instructor: { select: { fullName: true } },
        topics: { include: { topic: true } },
      },
      take: 5,
      orderBy: { rating: 'desc' },
    });

    // Find relevant certifications
    const certifications = await this.prisma.certification.findMany({
      where: {
        specialty: { name: { contains: searchSpecialty || '', mode: 'insensitive' } },
        NOT: {
          doctorCerts: { some: { doctorId: args.doctorId } },
        },
      },
      include: { specialty: true },
      take: 5,
    });

    return {
      doctor: {
        fullName: doctor.fullName,
        specialties: specialtyNames,
        currentCertifications: doctor.certifications.map((c) => c.certification.name),
        currentCourses: doctor.courseEnrollments.map((e) => ({
          title: e.course.title,
          progress: e.progress,
        })),
      },
      recommendedEvents: events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.eventType,
        startDate: e.startDate,
        location: e.location,
        organizer: e.organizer.name,
      })),
      recommendedCourses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        instructor: c.instructor.fullName,
        level: c.level,
        rating: c.rating,
      })),
      recommendedCertifications: certifications.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.certificationType,
        issuingBody: c.issuingBody,
        validityYears: c.validityYears,
      })),
    };
  }

  private async findEventSpeakers(args: {
    eventId?: string;
    doctorId?: string;
    topic?: string;
    limit?: number;
  }) {
    const limit = args.limit || 10;

    if (args.doctorId) {
      // Find events where this doctor is a speaker
      const speakerAt = await this.prisma.eventSpeaker.findMany({
        where: { doctorId: args.doctorId },
        include: {
          event: {
            include: { organizer: { select: { name: true } } },
          },
        },
        take: limit,
        orderBy: { event: { startDate: 'desc' } },
      });

      return speakerAt.map((s) => ({
        eventId: s.eventId,
        eventTitle: s.event.title,
        eventType: s.event.eventType,
        startDate: s.event.startDate,
        location: s.event.location,
        organizer: s.event.organizer.name,
        topic: s.topic,
        orderNum: s.orderNum,
      }));
    }

    if (args.eventId) {
      // Find speakers for a specific event
      const speakers = await this.prisma.eventSpeaker.findMany({
        where: { eventId: args.eventId },
        include: { doctor: { select: { fullName: true, city: true } } },
        orderBy: { orderNum: 'asc' },
        take: limit,
      });

      return speakers.map((s) => ({
        doctorId: s.doctorId,
        doctorName: s.doctor.fullName,
        city: s.doctor.city,
        topic: s.topic,
        orderNum: s.orderNum,
      }));
    }

    // Find speakers by topic
    if (args.topic) {
      const speakers = await this.prisma.eventSpeaker.findMany({
        where: {
          topic: { contains: args.topic, mode: 'insensitive' },
        },
        include: {
          doctor: { select: { fullName: true, city: true } },
          event: { select: { title: true, eventType: true, startDate: true } },
        },
        take: limit,
        orderBy: { event: { startDate: 'desc' } },
      });

      return speakers.map((s) => ({
        doctorId: s.doctorId,
        doctorName: s.doctor.fullName,
        city: s.doctor.city,
        eventTitle: s.event.title,
        eventType: s.event.eventType,
        eventDate: s.event.startDate,
        topic: s.topic,
      }));
    }

    return { error: 'Provide eventId, doctorId, or topic' };
  }
}
