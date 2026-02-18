import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { EVENTS } from '../../events/events.constants';

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Connection Requests ────────────────────────────────────

  async sendConnectionRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot connect to yourself');
    }

    // Check if request already exists
    const existing = await this.prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Already connected');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Connection request already pending');
      }
    }

    return this.prisma.connectionRequest.create({
      data: { senderId, receiverId },
      include: {
        receiver: { select: { id: true, fullName: true, profilePicUrl: true } },
      },
    });
  }

  async acceptConnectionRequest(requestId: string, currentDoctorId: string) {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== currentDoctorId) {
      throw new BadRequestException('Not your request to accept');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    // Update PG
    await this.prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Create bidirectional connection in Neo4j
    await this.neo4j.write(
      `MATCH (a:Doctor {pgId: $senderId})
       MATCH (b:Doctor {pgId: $receiverId})
       MERGE (a)-[:CONNECTED_TO {since: datetime()}]->(b)
       MERGE (b)-[:CONNECTED_TO {since: datetime()}]->(a)`,
      { senderId: request.senderId, receiverId: request.receiverId },
    );

    this.eventEmitter.emit(EVENTS.CONNECTION_CREATED, {
      senderId: request.senderId,
      receiverId: request.receiverId,
    });

    return { message: 'Connection accepted' };
  }

  async rejectConnectionRequest(requestId: string, currentDoctorId: string) {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiverId !== currentDoctorId) {
      throw new BadRequestException('Not your request to reject');
    }

    await this.prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { message: 'Connection rejected' };
  }

  async removeConnection(doctorId: string, otherDoctorId: string) {
    // Remove from PG
    await this.prisma.connectionRequest.deleteMany({
      where: {
        OR: [
          { senderId: doctorId, receiverId: otherDoctorId, status: 'ACCEPTED' },
          { senderId: otherDoctorId, receiverId: doctorId, status: 'ACCEPTED' },
        ],
      },
    });

    // Remove from Neo4j
    await this.neo4j.write(
      `MATCH (a:Doctor {pgId: $doctorId})-[r:CONNECTED_TO]-(b:Doctor {pgId: $otherDoctorId})
       DELETE r`,
      { doctorId, otherDoctorId },
    );

    this.eventEmitter.emit(EVENTS.CONNECTION_REMOVED, {
      doctorId,
      otherDoctorId,
    });

    return { message: 'Connection removed' };
  }

  // ─── Follow / Unfollow ─────────────────────────────────────

  async follow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.neo4j.write(
      `MATCH (a:Doctor {pgId: $followerId})
       MATCH (b:Doctor {pgId: $targetId})
       MERGE (a)-[:FOLLOWS]->(b)`,
      { followerId, targetId },
    );

    return { message: 'Now following' };
  }

  async unfollow(followerId: string, targetId: string) {
    await this.neo4j.write(
      `MATCH (a:Doctor {pgId: $followerId})-[r:FOLLOWS]->(b:Doctor {pgId: $targetId})
       DELETE r`,
      { followerId, targetId },
    );

    return { message: 'Unfollowed' };
  }

  // ─── Queries ───────────────────────────────────────────────

  async getMyConnections(doctorId: string) {
    const results = await this.neo4j.read<any>(
      `MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(other:Doctor)
       RETURN other.pgId AS id, other.fullName AS fullName,
              other.crm AS crm, other.crmState AS crmState,
              other.profilePicUrl AS profilePicUrl`,
      { doctorId },
    );
    return results;
  }

  async getMyFollowers(doctorId: string) {
    const results = await this.neo4j.read<any>(
      `MATCH (follower:Doctor)-[:FOLLOWS]->(me:Doctor {pgId: $doctorId})
       RETURN follower.pgId AS id, follower.fullName AS fullName,
              follower.profilePicUrl AS profilePicUrl`,
      { doctorId },
    );
    return results;
  }

  async getMyFollowing(doctorId: string) {
    const results = await this.neo4j.read<any>(
      `MATCH (me:Doctor {pgId: $doctorId})-[:FOLLOWS]->(target:Doctor)
       RETURN target.pgId AS id, target.fullName AS fullName,
              target.profilePicUrl AS profilePicUrl`,
      { doctorId },
    );
    return results;
  }

  async getPendingRequests(doctorId: string) {
    return this.prisma.connectionRequest.findMany({
      where: { receiverId: doctorId, status: 'PENDING' },
      include: {
        sender: {
          select: { id: true, fullName: true, crm: true, profilePicUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Suggestions (Graph-powered) ───────────────────────────

  async getSuggestions(doctorId: string, limit = 10) {
    const results: any[] = [];
    const existingIds: string[] = [];

    // Strategy 1: Friends of friends who are NOT already connected
    try {
      const fofResults = await this.neo4j.read<any>(
        `MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:CONNECTED_TO]->(suggestion:Doctor)
         WHERE suggestion.pgId <> $doctorId
           AND NOT (me)-[:CONNECTED_TO]->(suggestion)
         WITH suggestion, count(friend) AS mutualConnections
         ORDER BY mutualConnections DESC
         LIMIT toInteger($limit)
         RETURN suggestion.pgId AS id,
                suggestion.fullName AS fullName,
                suggestion.crm AS crm,
                suggestion.crmState AS crmState,
                suggestion.profilePicUrl AS profilePicUrl,
                mutualConnections`,
        { doctorId, limit },
      );
      // Convert Neo4j Integer to JS number
      const normalized = fofResults.map((r: any) => ({
        ...r,
        mutualConnections: typeof r.mutualConnections === 'object'
          ? (r.mutualConnections.low ?? r.mutualConnections.toNumber?.() ?? 0)
          : Number(r.mutualConnections ?? 0),
      }));
      results.push(...normalized);
      existingIds.push(...normalized.map((r: any) => r.id));
    } catch (e) {
      this.logger.error('FoF suggestion query failed', e);
    }

    // Strategy 2: Same specialty via Neo4j
    if (results.length < limit) {
      try {
        const remaining = limit - results.length;
        const specialtySuggestions = await this.neo4j.read<any>(
          `MATCH (me:Doctor {pgId: $doctorId})-[:SPECIALIZES_IN]->(spec:Specialty)<-[:SPECIALIZES_IN]-(suggestion:Doctor)
           WHERE suggestion.pgId <> $doctorId
             AND NOT (me)-[:CONNECTED_TO]->(suggestion)
             AND NOT suggestion.pgId IN $existingIds
           WITH suggestion, collect(spec.name) AS sharedSpecialties
           LIMIT toInteger($remaining)
           RETURN suggestion.pgId AS id,
                  suggestion.fullName AS fullName,
                  suggestion.crm AS crm,
                  suggestion.crmState AS crmState,
                  suggestion.profilePicUrl AS profilePicUrl,
                  sharedSpecialties,
                  0 AS mutualConnections`,
          { doctorId, existingIds, remaining },
        );
        results.push(...specialtySuggestions);
        existingIds.push(...specialtySuggestions.map((r: any) => r.id));
      } catch (e) {
        this.logger.error('Specialty suggestion query failed', e);
      }
    }

    // Strategy 3: Fallback - any doctors not yet connected (uses Prisma)
    if (results.length < limit) {
      try {
        // Get all accepted connection IDs from PG
        const accepted = await this.prisma.connectionRequest.findMany({
          where: {
            OR: [
              { senderId: doctorId, status: 'ACCEPTED' },
              { receiverId: doctorId, status: 'ACCEPTED' },
            ],
          },
          select: { senderId: true, receiverId: true },
        });
        const connectedIds = new Set<string>();
        connectedIds.add(doctorId);
        for (const c of accepted) {
          connectedIds.add(c.senderId);
          connectedIds.add(c.receiverId);
        }
        // Also exclude those already in results
        for (const id of existingIds) {
          connectedIds.add(id);
        }

        // Get pending requests to exclude those too
        const pending = await this.prisma.connectionRequest.findMany({
          where: {
            OR: [
              { senderId: doctorId, status: 'PENDING' },
              { receiverId: doctorId, status: 'PENDING' },
            ],
          },
          select: { senderId: true, receiverId: true },
        });
        for (const p of pending) {
          connectedIds.add(p.senderId);
          connectedIds.add(p.receiverId);
        }

        const remaining = limit - results.length;
        const fallbackDoctors = await this.prisma.doctor.findMany({
          where: {
            id: { notIn: Array.from(connectedIds) },
          },
          include: {
            specialties: { include: { specialty: true }, take: 1 },
          },
          take: remaining,
          orderBy: { createdAt: 'desc' },
        });

        for (const doc of fallbackDoctors) {
          const spec = doc.specialties?.[0]?.specialty?.name;
          results.push({
            id: doc.id,
            fullName: doc.fullName,
            crm: doc.crm,
            crmState: doc.crmState,
            profilePicUrl: doc.profilePicUrl,
            mutualConnections: 0,
            reason: spec ? `Especialista em ${spec}` : 'Médico na plataforma',
          });
        }
      } catch (e) {
        this.logger.error('Fallback suggestion query failed', e);
      }
    }

    return results;
  }

  // ─── Endorsements ──────────────────────────────────────────

  async endorseSkill(
    endorserId: string,
    targetDoctorId: string,
    skillName: string,
  ) {
    await this.neo4j.write(
      `MATCH (endorser:Doctor {pgId: $endorserId})
       MATCH (target:Doctor {pgId: $targetDoctorId})-[:HAS_SKILL]->(skill:Skill {name: $skillName})
       MERGE (endorser)-[e:ENDORSED {skill: $skillName}]->(target)
       ON CREATE SET e.count = 1
       ON MATCH SET e.count = e.count + 1`,
      { endorserId, targetDoctorId, skillName },
    );

    return { message: `Endorsed ${skillName}` };
  }

  async getEndorsements(doctorId: string) {
    const results = await this.neo4j.read<any>(
      `MATCH (endorser:Doctor)-[e:ENDORSED]->(me:Doctor {pgId: $doctorId})
       RETURN e.skill AS skill, count(endorser) AS endorsementCount,
              collect({name: endorser.fullName, id: endorser.pgId})[0..5] AS endorsers`,
      { doctorId },
    );
    return results;
  }
}
