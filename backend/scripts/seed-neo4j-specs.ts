/**
 * Seed Neo4j with SPECIALIZES_IN relationships and additional connections.
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-neo4j-specs.ts
 */
import neo4j from 'neo4j-driver';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Connect to Neo4j
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'neo4jpassword',
    ),
  );

  const session = driver.session();

  try {
    // ─── STEP 1: Create SPECIALIZES_IN relationships ──────
    console.log('=== Creating SPECIALIZES_IN relationships ===\n');
    
    const doctorSpecs = await prisma.doctorSpecialty.findMany({
      include: { doctor: true, specialty: true },
    });

    for (const ds of doctorSpecs) {
      try {
        await session.run(
          `MERGE (s:Specialty {name: $specName, pgId: $specId})
           WITH s
           MATCH (d:Doctor {pgId: $doctorId})
           MERGE (d)-[:SPECIALIZES_IN]->(s)`,
          { specName: ds.specialty.name, specId: ds.specialty.id, doctorId: ds.doctor.id },
        );
        console.log(`  ✓ ${ds.doctor.fullName} -> ${ds.specialty.name}`);
      } catch (e: any) {
        console.log(`  ✗ ${ds.doctor.fullName}: ${e.message?.substring(0, 60)}`);
      }
    }

    // ─── STEP 2: Create Institution nodes in Neo4j ────────
    console.log('\n=== Creating Institution nodes ===\n');
    
    const institutions = await prisma.institution.findMany();
    for (const inst of institutions) {
      try {
        await session.run(
          `MERGE (i:Institution {pgId: $id})
           SET i.name = $name, i.type = $type, i.city = $city, i.state = $state`,
          { id: inst.id, name: inst.name, type: inst.type, city: inst.city, state: inst.state },
        );
        console.log(`  ✓ ${inst.name}`);
      } catch (e: any) {
        console.log(`  ✗ ${inst.name}: ${e.message?.substring(0, 60)}`);
      }
    }

    // ─── STEP 3: Link jobs to institutions & specialties ──
    console.log('\n=== Linking Jobs to Institutions and Specialties ===\n');
    
    const jobs = await prisma.job.findMany({
      include: { institution: true, specialty: true },
    });
    for (const job of jobs) {
      try {
        // Create job node
        await session.run(
          `MERGE (j:Job {pgId: $id})
           SET j.title = $title, j.type = $type, j.shift = $shift,
               j.city = $city, j.state = $state,
               j.salaryMin = $salaryMin, j.salaryMax = $salaryMax`,
          {
            id: job.id, title: job.title, type: job.type, shift: job.shift,
            city: job.city, state: job.state,
            salaryMin: job.salaryMin || 0, salaryMax: job.salaryMax || 0,
          },
        );

        // Link to institution
        if (job.institutionId) {
          await session.run(
            `MATCH (j:Job {pgId: $jobId}), (i:Institution {pgId: $instId})
             MERGE (i)-[:OFFERS_JOB]->(j)`,
            { jobId: job.id, instId: job.institutionId },
          );
        }

        // Link to specialty
        if (job.specialtyId) {
          await session.run(
            `MATCH (j:Job {pgId: $jobId}), (s:Specialty {pgId: $specId})
             MERGE (j)-[:REQUIRES_SPECIALTY]->(s)`,
            { jobId: job.id, specId: job.specialtyId },
          );
        }

        console.log(`  ✓ ${job.title} (${job.city}/${job.state})`);
      } catch (e: any) {
        console.log(`  ✗ ${job.title}: ${e.message?.substring(0, 60)}`);
      }
    }

    // ─── STEP 4: Link doctors to institutions (experience) ──
    console.log('\n=== Linking Doctors to Institutions via jobs/city ===\n');
    
    // Create LOCATED_IN relationships for doctors
    const doctors = await prisma.doctor.findMany({
      where: { city: { not: null } },
    });
    for (const doc of doctors) {
      if (doc.city) {
        try {
          await session.run(
            `MATCH (d:Doctor {pgId: $doctorId})
             SET d.city = $city, d.state = $state`,
            { doctorId: doc.id, city: doc.city, state: doc.state || '' },
          );
        } catch (e) {}
      }
    }
    console.log(`  Updated ${doctors.length} doctor nodes with city/state`);

    // ─── STEP 5: Additional FOLLOWS relationships ────────
    console.log('\n=== Creating FOLLOWS relationships ===\n');
    
    // Some doctors follow others (directional, not mutual)
    const allDoctors = await prisma.doctor.findMany();
    const docIds = allDoctors.map(d => d.id);
    
    // Create some follows (doctors following others they're not connected to)
    const followPairs: string[][] = [];
    for (let i = 0; i < docIds.length; i++) {
      // Each doctor follows 2-3 random others
      const shuffled = [...docIds].sort(() => Math.random() - 0.5);
      for (let j = 0; j < Math.min(3, shuffled.length); j++) {
        if (shuffled[j] !== docIds[i]) {
          followPairs.push([docIds[i], shuffled[j]]);
        }
      }
    }

    let followCount = 0;
    for (const [followerId, targetId] of followPairs) {
      try {
        await session.run(
          `MATCH (a:Doctor {pgId: $followerId}), (b:Doctor {pgId: $targetId})
           MERGE (a)-[:FOLLOWS]->(b)`,
          { followerId, targetId },
        );
        followCount++;
      } catch (e) {}
    }
    console.log(`  Created ${followCount} FOLLOWS relationships`);

    // ─── STEP 6: Verify graph stats ──────────────────────
    console.log('\n=== Graph Statistics ===\n');
    
    const stats = await session.run(`
      MATCH (d:Doctor) WITH count(d) as doctors
      MATCH (s:Specialty) WITH doctors, count(s) as specialties
      MATCH (i:Institution) WITH doctors, specialties, count(i) as institutions
      MATCH (j:Job) WITH doctors, specialties, institutions, count(j) as jobs
      MATCH ()-[c:CONNECTED_TO]->() WITH doctors, specialties, institutions, jobs, count(c) as connections
      MATCH ()-[sp:SPECIALIZES_IN]->() WITH doctors, specialties, institutions, jobs, connections, count(sp) as specRels
      MATCH ()-[f:FOLLOWS]->() WITH doctors, specialties, institutions, jobs, connections, specRels, count(f) as follows
      RETURN doctors, specialties, institutions, jobs, connections, specRels, follows
    `);
    
    const record = stats.records[0];
    console.log(`  Doctors:           ${record.get('doctors')}`);
    console.log(`  Specialties:       ${record.get('specialties')}`);
    console.log(`  Institutions:      ${record.get('institutions')}`);
    console.log(`  Jobs:              ${record.get('jobs')}`);
    console.log(`  CONNECTED_TO:      ${record.get('connections')}`);
    console.log(`  SPECIALIZES_IN:    ${record.get('specRels')}`);
    console.log(`  FOLLOWS:           ${record.get('follows')}`);

  } finally {
    await session.close();
    await driver.close();
    await prisma.$disconnect();
  }

  console.log('\n=== Neo4j seed complete ===');
}

main().catch(console.error);
