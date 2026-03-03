import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Neo4jService } from '../../database/neo4j/neo4j.service';
import { GroupsQueryDto } from './dto/groups-query.dto';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class StudyGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
  ) {}

  async findAll(query: GroupsQueryDto) {
    const { specialty, search, page = 1, limit = 20 } = query;

    const where: any = { isPublic: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (specialty) {
      where.specialty = { name: { contains: specialty, mode: 'insensitive' } };
    }

    const [groups, total] = await Promise.all([
      this.prisma.studyGroup.findMany({
        where,
        orderBy: { memberCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          specialty: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.studyGroup.count({ where }),
    ]);

    return {
      data: groups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requestingDoctorId?: string) {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id },
      include: {
        specialty: { select: { id: true, name: true } },
        members: {
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          take: 50,
          include: {
            doctor: {
              select: {
                id: true,
                crm: true,
                fullName: true,
                profilePicUrl: true,
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!group) throw new NotFoundException(`Study group ${id} not found`);

    const isMember = requestingDoctorId
      ? group.members.some(m => m.doctorId === requestingDoctorId)
      : false;

    return { ...group, isMember };
  }

  async create(dto: CreateGroupDto, doctorId: string) {
    const group = await this.prisma.studyGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        specialtyId: dto.specialtyId,
        isPublic: dto.isPublic ?? true,
        maxMembers: dto.maxMembers,
        memberCount: 1,
      },
      include: { specialty: { select: { id: true, name: true } } },
    });

    await this.prisma.studyGroupMember.create({ data: { groupId: group.id, doctorId, role: 'ADMIN' } });

    // Sync to Neo4j
    await this.neo4j.write(
      `MERGE (g:StudyGroup {pgId: $gId}) SET g.name = $name
       WITH g MATCH (d:Doctor {pgId: $dId}) MERGE (d)-[:MEMBER_OF]->(g)`,
      { gId: group.id, name: group.name, dId: doctorId },
    );

    return group;
  }

  async join(groupId: string, doctorId: string) {
    const group = await this.prisma.studyGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Study group ${groupId} not found`);

    if (group.maxMembers && group.memberCount >= group.maxMembers) {
      throw new ConflictException('Group is at full capacity');
    }

    const existing = await this.prisma.studyGroupMember.findFirst({
      where: { groupId, doctorId },
    });
    if (existing) throw new ConflictException('Already a member of this group');

    const [member] = await this.prisma.$transaction([
      this.prisma.studyGroupMember.create({ data: { groupId, doctorId } }),
      this.prisma.studyGroup.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    await this.neo4j.write(
      `MATCH (g:StudyGroup {pgId: $gId}), (d:Doctor {pgId: $dId}) MERGE (d)-[:MEMBER_OF]->(g)`,
      { gId: groupId, dId: doctorId },
    );

    return { message: 'Joined group successfully', member };
  }

  async leave(groupId: string, doctorId: string) {
    const existing = await this.prisma.studyGroupMember.findFirst({
      where: { groupId, doctorId },
    });
    if (!existing) throw new NotFoundException('Membership not found');

    if (existing.role === 'ADMIN') {
      const memberCount = await this.prisma.studyGroupMember.count({ where: { groupId } });
      if (memberCount === 1) {
        throw new ForbiddenException('Admin cannot leave a group with no other members — delete the group instead');
      }
      // Promote another member
      const nextMember = await this.prisma.studyGroupMember.findFirst({
        where: { groupId, doctorId: { not: doctorId } },
        orderBy: { joinedAt: 'asc' },
      });
      if (nextMember) {
        await this.prisma.studyGroupMember.update({
          where: { id: nextMember.id },
          data: { role: 'ADMIN' },
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.studyGroupMember.delete({ where: { id: existing.id } }),
      this.prisma.studyGroup.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    await this.neo4j.write(
      `MATCH (d:Doctor {pgId: $dId})-[r:MEMBER_OF]->(g:StudyGroup {pgId: $gId}) DELETE r`,
      { gId: groupId, dId: doctorId },
    );

    return { message: 'Left group successfully' };
  }
}
