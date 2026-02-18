/**
 * Seed script for Career, Mentorship, and Certification data
 * Phase 2 of Graph Expansion
 */

import { PrismaClient, CertificationType, MentorshipStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Neo4j connection
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'medconnect_dev_2026';

async function runNeo4jQuery(query: string, params: Record<string, any> = {}) {
  const neo4j = require('neo4j-driver');
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();
  try {
    await session.run(query, params);
  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  console.log('🌱 Seeding Career, Mentorship, and Certification data...\n');

  // Get specialties
  const specialties = await prisma.specialty.findMany();
  const doctors = await prisma.doctor.findMany({
    include: { specialties: true },
  });

  if (specialties.length === 0 || doctors.length === 0) {
    console.log('❌ No specialties or doctors found. Run basic seed first.');
    return;
  }

  // ============================================================
  // 1. CERTIFICATIONS
  // ============================================================
  console.log('📜 Creating Certifications...');

  const certificationData = [
    // Cardiology certifications
    { name: 'Título de Especialista em Cardiologia', issuingBody: 'AMB/CFM', type: CertificationType.SPECIALTY, specialty: 'Cardiologia', validityYears: 10 },
    { name: 'Certificação em Ecocardiografia', issuingBody: 'SBACV', type: CertificationType.SUBSPECIALTY, specialty: 'Cardiologia', validityYears: 5 },
    { name: 'Certificação em Hemodinâmica', issuingBody: 'SBHCI', type: CertificationType.SUBSPECIALTY, specialty: 'Cardiologia', validityYears: 5 },
    { name: 'Certificação em Arritmologia', issuingBody: 'DAEC', type: CertificationType.SUBSPECIALTY, specialty: 'Cardiologia', validityYears: 5 },
    
    // Internal Medicine
    { name: 'Título de Especialista em Clínica Médica', issuingBody: 'AMB/CFM', type: CertificationType.SPECIALTY, specialty: 'Clínica Médica', validityYears: 10 },
    { name: 'Certificação em Medicina Intensiva', issuingBody: 'AMIB', type: CertificationType.SUBSPECIALTY, specialty: 'Medicina Intensiva', validityYears: 5 },
    
    // Orthopedics
    { name: 'Título de Especialista em Ortopedia', issuingBody: 'AMB/CFM', type: CertificationType.SPECIALTY, specialty: 'Ortopedia e Traumatologia', validityYears: 10 },
    { name: 'Certificação em Cirurgia do Joelho', issuingBody: 'SBOT', type: CertificationType.SUBSPECIALTY, specialty: 'Ortopedia e Traumatologia', validityYears: 5 },
    
    // Pediatrics
    { name: 'Título de Especialista em Pediatria', issuingBody: 'AMB/CFM', type: CertificationType.SPECIALTY, specialty: 'Pediatria', validityYears: 10 },
    { name: 'Certificação em Neonatologia', issuingBody: 'SBP', type: CertificationType.SUBSPECIALTY, specialty: 'Pediatria', validityYears: 5 },
    
    // Neurology
    { name: 'Título de Especialista em Neurologia', issuingBody: 'AMB/CFM', type: CertificationType.SPECIALTY, specialty: 'Neurologia', validityYears: 10 },
    
    // General certifications
    { name: 'ACLS - Advanced Cardiovascular Life Support', issuingBody: 'American Heart Association', type: CertificationType.CONTINUING_EDUCATION, validityYears: 2 },
    { name: 'BLS - Basic Life Support', issuingBody: 'American Heart Association', type: CertificationType.CONTINUING_EDUCATION, validityYears: 2 },
    { name: 'ATLS - Advanced Trauma Life Support', issuingBody: 'American College of Surgeons', type: CertificationType.CONTINUING_EDUCATION, validityYears: 4 },
  ];

  const createdCerts: any[] = [];
  for (const certData of certificationData) {
    const specialty = specialties.find(s => 
      s.name.toLowerCase().includes((certData.specialty || '').toLowerCase())
    );
    
    const cert = await prisma.certification.create({
      data: {
        name: certData.name,
        issuingBody: certData.issuingBody,
        certificationType: certData.type,
        validityYears: certData.validityYears,
        specialtyId: specialty?.id,
      },
    });
    
    createdCerts.push(cert);
    
    // Create in Neo4j
    await runNeo4jQuery(`
      MERGE (c:Certification {pgId: $pgId})
      SET c.name = $name, c.certificationType = $type, c.issuingBody = $body
    `, {
      pgId: cert.id,
      name: cert.name,
      type: cert.certificationType,
      body: cert.issuingBody,
    });
    
    // Link to specialty in Neo4j
    if (specialty) {
      await runNeo4jQuery(`
        MATCH (c:Certification {pgId: $certId})
        MATCH (s:Specialty {pgId: $specId})
        MERGE (c)-[:FOR_SPECIALTY]->(s)
      `, { certId: cert.id, specId: specialty.id });
    }
    
    console.log(`  ✓ ${cert.name}`);
  }

  // ============================================================
  // 2. CAREER PATHS
  // ============================================================
  console.log('\n📊 Creating Career Paths...');

  const careerPathData = [
    {
      name: 'Cardiologista Clínico',
      description: 'Carreira focada em diagnóstico e tratamento não invasivo de doenças cardiovasculares',
      specialty: 'Cardiologia',
      avgDurationYears: 12,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Clínica Médica', orderNum: 2, typicalYears: 2, isRequired: true },
        { name: 'Residência em Cardiologia', orderNum: 3, typicalYears: 3, isRequired: true },
        { name: 'Título de Especialista', orderNum: 4, typicalYears: 0, isRequired: true },
        { name: 'Fellowship em Subespecialidade', orderNum: 5, typicalYears: 2, isRequired: false },
        { name: 'Mestrado/Doutorado', orderNum: 6, typicalYears: 4, isRequired: false },
      ],
    },
    {
      name: 'Cirurgião Cardíaco',
      description: 'Carreira em cirurgia cardiovascular',
      specialty: 'Cardiologia',
      avgDurationYears: 14,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Cirurgia Geral', orderNum: 2, typicalYears: 2, isRequired: true },
        { name: 'Residência em Cirurgia Cardiovascular', orderNum: 3, typicalYears: 3, isRequired: true },
        { name: 'Título de Especialista', orderNum: 4, typicalYears: 0, isRequired: true },
        { name: 'Fellowship Internacional', orderNum: 5, typicalYears: 1, isRequired: false },
      ],
    },
    {
      name: 'Intensivista',
      description: 'Especialista em tratamento de pacientes críticos',
      specialty: 'Medicina Intensiva',
      avgDurationYears: 11,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Clínica Médica', orderNum: 2, typicalYears: 2, isRequired: true },
        { name: 'Residência em Medicina Intensiva', orderNum: 3, typicalYears: 2, isRequired: true },
        { name: 'Certificação AMIB', orderNum: 4, typicalYears: 0, isRequired: true },
        { name: 'Mestrado em Ciências Médicas', orderNum: 5, typicalYears: 2, isRequired: false },
      ],
    },
    {
      name: 'Ortopedista Traumatologista',
      description: 'Carreira em ortopedia e traumatologia',
      specialty: 'Ortopedia e Traumatologia',
      avgDurationYears: 11,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Ortopedia', orderNum: 2, typicalYears: 3, isRequired: true },
        { name: 'Título de Especialista', orderNum: 3, typicalYears: 0, isRequired: true },
        { name: 'Fellowship em Subespecialidade', orderNum: 4, typicalYears: 1, isRequired: false },
      ],
    },
    {
      name: 'Pediatra',
      description: 'Especialista em saúde infantil',
      specialty: 'Pediatria',
      avgDurationYears: 9,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Pediatria', orderNum: 2, typicalYears: 3, isRequired: true },
        { name: 'Título de Especialista', orderNum: 3, typicalYears: 0, isRequired: true },
        { name: 'Subespecialização', orderNum: 4, typicalYears: 2, isRequired: false },
      ],
    },
    {
      name: 'Neurologista',
      description: 'Especialista em doenças do sistema nervoso',
      specialty: 'Neurologia',
      avgDurationYears: 11,
      isOfficial: true,
      milestones: [
        { name: 'Graduação em Medicina', orderNum: 1, typicalYears: 6, isRequired: true },
        { name: 'Residência em Neurologia', orderNum: 2, typicalYears: 3, isRequired: true },
        { name: 'Título de Especialista', orderNum: 3, typicalYears: 0, isRequired: true },
        { name: 'Fellowship em Subespecialidade', orderNum: 4, typicalYears: 2, isRequired: false },
      ],
    },
  ];

  const createdCareerPaths: any[] = [];
  for (const pathData of careerPathData) {
    const specialty = specialties.find(s => 
      s.name.toLowerCase().includes(pathData.specialty.toLowerCase())
    );
    
    if (!specialty) continue;

    const careerPath = await prisma.careerPath.create({
      data: {
        name: pathData.name,
        description: pathData.description,
        avgDurationYears: pathData.avgDurationYears,
        isOfficial: pathData.isOfficial,
        specialtyId: specialty.id,
        milestones: {
          create: pathData.milestones.map(m => ({
            name: m.name,
            orderNum: m.orderNum,
            typicalYears: m.typicalYears,
            isRequired: m.isRequired,
          })),
        },
      },
      include: { milestones: true },
    });
    
    createdCareerPaths.push(careerPath);
    
    // Create in Neo4j
    await runNeo4jQuery(`
      MERGE (cp:CareerPath {pgId: $pgId})
      SET cp.name = $name, cp.isOfficial = $official
    `, {
      pgId: careerPath.id,
      name: careerPath.name,
      official: careerPath.isOfficial,
    });
    
    // Link to specialty
    await runNeo4jQuery(`
      MATCH (cp:CareerPath {pgId: $pathId})
      MATCH (s:Specialty {pgId: $specId})
      MERGE (cp)-[:FOR_SPECIALTY]->(s)
    `, { pathId: careerPath.id, specId: specialty.id });
    
    // Create milestones in Neo4j
    for (const milestone of careerPath.milestones) {
      await runNeo4jQuery(`
        MERGE (m:CareerMilestone {pgId: $pgId})
        SET m.name = $name, m.orderNum = $order, m.isRequired = $required
        WITH m
        MATCH (cp:CareerPath {pgId: $pathId})
        MERGE (m)-[:PART_OF]->(cp)
      `, {
        pgId: milestone.id,
        name: milestone.name,
        order: milestone.orderNum,
        required: milestone.isRequired,
        pathId: careerPath.id,
      });
    }
    
    console.log(`  ✓ ${pathData.name}`);
  }

  // ============================================================
  // 3. DOCTOR CERTIFICATIONS
  // ============================================================
  console.log('\n🎓 Assigning Certifications to Doctors...');

  let certCount = 0;
  for (const doctor of doctors) {
    // Assign certifications based on doctor's specialties
    const doctorSpecialtyIds = doctor.specialties.map(s => s.specialtyId);
    const relevantCerts = createdCerts.filter(c => 
      c.specialtyId && doctorSpecialtyIds.includes(c.specialtyId)
    );
    
    // Assign 1-2 relevant certifications per doctor
    const numCerts = Math.min(relevantCerts.length, Math.floor(Math.random() * 2) + 1);
    for (let i = 0; i < numCerts; i++) {
      const cert = relevantCerts[i];
      if (!cert) continue;
      
      const issueDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1);
      const expiryDate = cert.validityYears 
        ? new Date(issueDate.getFullYear() + cert.validityYears, issueDate.getMonth(), 1)
        : null;
      
      try {
        await prisma.doctorCertification.create({
          data: {
            doctorId: doctor.id,
            certificationId: cert.id,
            issueDate,
            expiryDate,
            isVerified: Math.random() > 0.3,
          },
        });
        
        // Create in Neo4j
        await runNeo4jQuery(`
          MATCH (d:Doctor {pgId: $doctorId})
          MATCH (c:Certification {pgId: $certId})
          MERGE (d)-[:HOLDS_CERTIFICATION]->(c)
        `, { doctorId: doctor.id, certId: cert.id });
        
        certCount++;
      } catch (e) {
        // Skip if already exists
      }
    }
  }
  console.log(`  ✓ Created ${certCount} doctor certifications`);

  // ============================================================
  // 4. CAREER PROGRESS
  // ============================================================
  console.log('\n📈 Assigning Career Progress...');

  let progressCount = 0;
  for (const doctor of doctors) {
    // Find relevant career paths
    const doctorSpecialtyIds = doctor.specialties.map(s => s.specialtyId);
    const relevantPaths = createdCareerPaths.filter(cp => 
      cp.specialtyId && doctorSpecialtyIds.includes(cp.specialtyId)
    );
    
    if (relevantPaths.length === 0) continue;
    
    // Assign progress on one path
    const path = relevantPaths[0];
    const graduationYear = doctor.graduationYear || (2025 - Math.floor(Math.random() * 20));
    const yearsSinceGrad = 2025 - graduationYear;
    
    for (const milestone of path.milestones) {
      // Determine status based on years since graduation
      let status = 'NOT_STARTED';
      if (milestone.typicalYears && yearsSinceGrad >= milestone.typicalYears) {
        status = Math.random() > 0.2 ? 'COMPLETED' : 'IN_PROGRESS';
      } else if (milestone.orderNum === 1) {
        status = 'COMPLETED';
      }
      
      if (status === 'NOT_STARTED' && milestone.orderNum <= 2) {
        status = Math.random() > 0.3 ? 'COMPLETED' : 'IN_PROGRESS';
      }
      
      try {
        await prisma.doctorCareerProgress.create({
          data: {
            doctorId: doctor.id,
            careerPathId: path.id,
            milestoneId: milestone.id,
            status,
            completedAt: status === 'COMPLETED' ? new Date(2025, 0, 1) : null,
          },
        });
        
        // Create in Neo4j
        await runNeo4jQuery(`
          MATCH (d:Doctor {pgId: $doctorId})
          MATCH (m:CareerMilestone {pgId: $milestoneId})
          MERGE (d)-[p:PROGRESS_ON]->(m)
          SET p.status = $status
        `, { doctorId: doctor.id, milestoneId: milestone.id, status });
        
        progressCount++;
      } catch (e) {
        // Skip if already exists
      }
    }
  }
  console.log(`  ✓ Created ${progressCount} career progress records`);

  // ============================================================
  // 5. MENTORSHIPS
  // ============================================================
  console.log('\n🤝 Creating Mentorship Relationships...');

  // Find experienced doctors (mentors) and early career doctors (mentees)
  const experiencedDoctors = doctors.filter(d => 
    (d.graduationYear || 2000) <= 2012
  );
  const earlyCareerDoctors = doctors.filter(d => 
    (d.graduationYear || 2000) >= 2018
  );

  let mentorshipCount = 0;
  for (const mentor of experiencedDoctors.slice(0, 15)) {
    // Create 1-3 mentees per mentor
    const numMentees = Math.floor(Math.random() * 3) + 1;
    const mentorSpecialties = mentor.specialties;
    
    for (let i = 0; i < numMentees; i++) {
      // Find mentee with matching specialty
      const matchingMentee = earlyCareerDoctors.find(m => 
        m.specialties.some(s => 
          mentorSpecialties.some(ms => ms.specialtyId === s.specialtyId)
        )
      );
      
      if (!matchingMentee) continue;
      
      const startDate = new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), 1);
      const focusArea = mentorSpecialties[0]?.specialtyId 
        ? specialties.find(s => s.id === mentorSpecialties[0].specialtyId)?.name
        : undefined;
      
      try {
        const mentorship = await prisma.mentorship.create({
          data: {
            mentorId: mentor.id,
            menteeId: matchingMentee.id,
            status: Math.random() > 0.2 ? MentorshipStatus.ACTIVE : MentorshipStatus.COMPLETED,
            startDate,
            goals: 'Desenvolvimento profissional e orientação de carreira',
            focusArea,
          },
        });
        
        // Create in Neo4j
        await runNeo4jQuery(`
          MATCH (mentor:Doctor {pgId: $mentorId})
          MATCH (mentee:Doctor {pgId: $menteeId})
          MERGE (mentee)-[m:MENTORS {pgId: $mId}]->(mentor)
          SET m.status = $status, m.startDate = date($startDate)
        `, {
          mentorId: mentor.id,
          menteeId: matchingMentee.id,
          mId: mentorship.id,
          status: mentorship.status,
          startDate: startDate.toISOString().split('T')[0],
        });
        
        mentorshipCount++;
        
        // Remove from pool
        const idx = earlyCareerDoctors.indexOf(matchingMentee);
        if (idx > -1) earlyCareerDoctors.splice(idx, 1);
      } catch (e) {
        // Skip if already exists
      }
    }
  }
  console.log(`  ✓ Created ${mentorshipCount} mentorship relationships`);

  console.log('\n✅ Career & Mentorship seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
