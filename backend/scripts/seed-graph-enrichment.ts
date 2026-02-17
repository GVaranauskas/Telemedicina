/**
 * Graph Enrichment Script
 * Populates Neo4j with Skills, HAS_SKILL, WORKS_AT, ENDORSED, and APPLIED_TO relationships.
 * Also creates corresponding PostgreSQL records (Skill, DoctorSkill, DoctorExperience).
 */
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'medconnect_dev_2026',
  ),
);

// ─── Skills by specialty area ────────────────────────────────────────────────
const SKILLS_BY_AREA: Record<string, string[]> = {
  Cardiologia: [
    'Ecocardiograma',
    'Eletrocardiograma',
    'Teste Ergométrico',
    'Cateterismo Cardíaco',
    'Holter 24h',
  ],
  Pediatria: [
    'Puericultura',
    'Neonatologia',
    'Vacinação Infantil',
    'Desenvolvimento Infantil',
  ],
  'Ortopedia e Traumatologia': [
    'Artroscopia',
    'Cirurgia de Coluna',
    'Prótese de Quadril',
    'Medicina Esportiva',
  ],
  Dermatologia: [
    'Dermatoscopia',
    'Laser Dermatológico',
    'Biópsia de Pele',
    'Cirurgia Dermatológica',
  ],
  'Medicina Intensiva': [
    'Intubação Orotraqueal',
    'Ventilação Mecânica',
    'Acesso Venoso Central',
    'RCP Avançada',
    'ECMO',
  ],
  Neurologia: [
    'Eletroencefalograma',
    'Eletroneuromiografia',
    'Doppler Transcraniano',
    'Toxina Botulínica',
  ],
  Ginecologia: [
    'Colposcopia',
    'Histeroscopia',
    'Ultrassonografia Obstétrica',
    'Cirurgia Laparoscópica',
  ],
  Oftalmologia: [
    'Cirurgia de Catarata',
    'Retinoscopia',
    'Campimetria',
    'Fotocoagulação a Laser',
  ],
  // General skills any doctor might have
  _general: [
    'Ultrassonografia',
    'Sutura Avançada',
    'ACLS',
    'ATLS',
    'Telemedicina',
    'Pesquisa Clínica',
    'Gestão Hospitalar',
  ],
};

// Roles for WORKS_AT relationships
const ROLES = [
  'Médico Plantonista',
  'Médico Assistente',
  'Coordenador Médico',
  'Médico Staff',
  'Diretor Clínico',
  'Preceptor',
  'Médico Residente',
];

async function main() {
  console.log('=== Graph Enrichment Script ===\n');

  // 1. Get all doctors with their specialties
  const doctors = await prisma.doctor.findMany({
    include: {
      specialties: { include: { specialty: true } },
      skills: { include: { skill: true } },
      experiences: true,
    },
  });
  console.log(`Found ${doctors.length} doctors`);

  // 2. Get all institutions
  const institutions = await prisma.institution.findMany();
  console.log(`Found ${institutions.length} institutions`);

  // 3. Get all jobs
  const jobs = await prisma.job.findMany({ where: { isActive: true } });
  console.log(`Found ${jobs.length} active jobs`);

  // ─── Step 1: Create Skills in PostgreSQL ───────────────────────────────
  console.log('\n--- Creating Skills in PostgreSQL ---');
  const allSkillNames = new Set<string>();
  for (const skills of Object.values(SKILLS_BY_AREA)) {
    skills.forEach((s) => allSkillNames.add(s));
  }

  const skillMap: Record<string, string> = {}; // name -> id
  for (const skillName of allSkillNames) {
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      create: { name: skillName },
      update: {},
    });
    skillMap[skillName] = skill.id;
  }
  console.log(`  Created/verified ${Object.keys(skillMap).length} skills`);

  // ─── Step 2: Assign Skills to Doctors ──────────────────────────────────
  console.log('\n--- Assigning Skills to Doctors ---');
  let skillAssignments = 0;

  for (const doctor of doctors) {
    // Get skills relevant to this doctor's specialties
    const relevantSkills: string[] = [...SKILLS_BY_AREA._general];
    for (const ds of doctor.specialties) {
      const specSkills = SKILLS_BY_AREA[ds.specialty.name];
      if (specSkills) relevantSkills.push(...specSkills);
    }

    // Assign 3-6 random skills
    const shuffled = relevantSkills.sort(() => Math.random() - 0.5);
    const numSkills = 3 + Math.floor(Math.random() * 4); // 3-6
    const selectedSkills = shuffled.slice(0, numSkills);

    for (const skillName of selectedSkills) {
      const skillId = skillMap[skillName];
      if (!skillId) continue;

      // Check if already exists
      const existing = doctor.skills.find((s) => s.skill.name === skillName);
      if (existing) continue;

      try {
        await prisma.doctorSkill.create({
          data: { doctorId: doctor.id, skillId },
        });
        skillAssignments++;
      } catch (e) {
        // Unique constraint violation - skip
      }
    }
  }
  console.log(`  Created ${skillAssignments} doctor-skill assignments`);

  // ─── Step 3: Create DoctorExperience (WORKS_AT) in PostgreSQL ──────────
  console.log('\n--- Creating Work Experiences ---');
  let experienceCount = 0;

  for (const doctor of doctors) {
    if (doctor.experiences.length > 0) continue; // Already has experiences

    // Assign 1-2 institutions (prefer same city/state)
    const sameCity = institutions.filter(
      (i) => i.city === doctor.city || i.state === doctor.state,
    );
    const pool = sameCity.length > 0 ? sameCity : institutions;
    const numInstitutions = 1 + Math.floor(Math.random() * 2); // 1-2

    const shuffledInst = pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(numInstitutions, shuffledInst.length); i++) {
      const inst = shuffledInst[i];
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const yearsAgo = 1 + Math.floor(Math.random() * 8);
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - yearsAgo);

      try {
        await prisma.doctorExperience.create({
          data: {
            doctorId: doctor.id,
            institutionId: inst.id,
            role,
            description: `Atuação como ${role} no ${inst.name}`,
            startDate,
            isCurrent: Math.random() > 0.4, // 60% chance of being current
          },
        });
        experienceCount++;
      } catch (e) {
        // Skip on error
      }
    }
  }
  console.log(`  Created ${experienceCount} work experiences`);

  // ─── Step 4: Sync to Neo4j ─────────────────────────────────────────────
  console.log('\n--- Syncing to Neo4j ---');
  const session = driver.session();

  try {
    // 4a. Create Skill nodes
    console.log('  Creating Skill nodes...');
    for (const [name, id] of Object.entries(skillMap)) {
      await session.run(
        `MERGE (s:Skill {pgId: $id}) ON CREATE SET s.name = $name ON MATCH SET s.name = $name`,
        { id, name },
      );
    }
    console.log(`  Created ${Object.keys(skillMap).length} Skill nodes`);

    // 4b. Create HAS_SKILL relationships
    console.log('  Creating HAS_SKILL relationships...');
    const doctorSkills = await prisma.doctorSkill.findMany({
      include: { skill: true },
    });
    let hasSkillCount = 0;
    for (const ds of doctorSkills) {
      await session.run(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (s:Skill {pgId: $skillId})
         MERGE (d)-[:HAS_SKILL]->(s)`,
        { doctorId: ds.doctorId, skillId: ds.skillId },
      );
      hasSkillCount++;
    }
    console.log(`  Created ${hasSkillCount} HAS_SKILL relationships`);

    // 4c. Create WORKS_AT relationships
    console.log('  Creating WORKS_AT relationships...');
    const experiences = await prisma.doctorExperience.findMany({
      where: { institutionId: { not: null } },
    });
    let worksAtCount = 0;
    for (const exp of experiences) {
      await session.run(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (i:Institution {pgId: $institutionId})
         MERGE (d)-[r:WORKS_AT]->(i)
         ON CREATE SET r.since = $since, r.role = $role
         ON MATCH SET r.role = $role`,
        {
          doctorId: exp.doctorId,
          institutionId: exp.institutionId,
          since: exp.startDate.toISOString().split('T')[0],
          role: exp.role,
        },
      );
      worksAtCount++;
    }
    console.log(`  Created ${worksAtCount} WORKS_AT relationships`);

    // 4d. Create ENDORSED relationships between connected doctors
    console.log('  Creating ENDORSED relationships...');
    const connections = await session.run(
      `MATCH (a:Doctor)-[:CONNECTED_TO]->(b:Doctor)
       RETURN a.pgId AS from, b.pgId AS to`,
    );
    const connPairs = connections.records.map((r) => ({
      from: r.get('from'),
      to: r.get('to'),
    }));

    // For each connected pair, randomly endorse 1-2 skills
    let endorsedCount = 0;
    const doctorSkillMap: Record<string, string[]> = {};
    for (const ds of doctorSkills) {
      if (!doctorSkillMap[ds.doctorId]) doctorSkillMap[ds.doctorId] = [];
      doctorSkillMap[ds.doctorId].push(ds.skill.name);
    }

    for (const pair of connPairs) {
      if (Math.random() > 0.5) continue; // 50% chance of endorsing
      const targetSkills = doctorSkillMap[pair.to];
      if (!targetSkills || targetSkills.length === 0) continue;

      const skillToEndorse =
        targetSkills[Math.floor(Math.random() * targetSkills.length)];
      await session.run(
        `MATCH (endorser:Doctor {pgId: $from})
         MATCH (target:Doctor {pgId: $to})
         MERGE (endorser)-[e:ENDORSED {skill: $skill}]->(target)
         ON CREATE SET e.count = 1
         ON MATCH SET e.count = e.count + 1`,
        { from: pair.from, to: pair.to, skill: skillToEndorse },
      );
      endorsedCount++;
    }
    console.log(`  Created ${endorsedCount} ENDORSED relationships`);

    // 4e. Create more APPLIED_TO relationships
    console.log('  Creating APPLIED_TO relationships...');
    let appliedCount = 0;
    for (const doctor of doctors) {
      if (Math.random() > 0.5) continue; // 50% of doctors apply
      const numApps = 1 + Math.floor(Math.random() * 3); // 1-3 applications
      const shuffledJobs = jobs.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(numApps, shuffledJobs.length); i++) {
        const job = shuffledJobs[i];
        const status = ['PENDING', 'ACCEPTED', 'REJECTED'][
          Math.floor(Math.random() * 3)
        ];
        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId})
           MATCH (j:Job {pgId: $jobId})
           MERGE (d)-[a:APPLIED_TO]->(j)
           ON CREATE SET a.status = $status`,
          { doctorId: doctor.id, jobId: job.id, status },
        );
        appliedCount++;
      }
    }
    console.log(`  Created ${appliedCount} APPLIED_TO relationships`);

    // 4f. Ensure REQUIRES_SPECIALTY on jobs that have specialtyId
    console.log('  Ensuring REQUIRES_SPECIALTY on jobs...');
    const jobsWithSpec = await prisma.job.findMany({
      where: { specialtyId: { not: null } },
    });
    let reqSpecCount = 0;
    for (const job of jobsWithSpec) {
      await session.run(
        `MATCH (j:Job {pgId: $jobId})
         MATCH (s:Specialty {pgId: $specId})
         MERGE (j)-[:REQUIRES_SPECIALTY]->(s)`,
        { jobId: job.id, specId: job.specialtyId },
      );
      reqSpecCount++;
    }
    console.log(`  Ensured ${reqSpecCount} REQUIRES_SPECIALTY relationships`);

  } finally {
    await session.close();
  }

  // ─── Final Stats ───────────────────────────────────────────────────────
  console.log('\n--- Final Graph Stats ---');
  const statsSession = driver.session();
  try {
    const relStats = await statsSession.run(
      `MATCH ()-[r]->() RETURN type(r) AS relType, count(r) AS cnt ORDER BY cnt DESC`,
    );
    for (const rec of relStats.records) {
      console.log(`  ${rec.get('relType')}: ${rec.get('cnt')}`);
    }
    const nodeStats = await statsSession.run(
      `MATCH (n) RETURN labels(n)[0] AS nodeType, count(n) AS cnt ORDER BY cnt DESC`,
    );
    console.log('');
    for (const rec of nodeStats.records) {
      console.log(`  ${rec.get('nodeType')}: ${rec.get('cnt')}`);
    }
  } finally {
    await statsSession.close();
  }

  await driver.close();
  await prisma.$disconnect();
  console.log('\n=== Graph enrichment complete! ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
