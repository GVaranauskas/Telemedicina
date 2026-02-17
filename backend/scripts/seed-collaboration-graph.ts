/**
 * Seed Collaboration Graph Data
 * Creates Publication, CaseStudy, StudyGroup, ResearchProject nodes and relationships in Neo4j
 * Also creates corresponding PostgreSQL records via Prisma.
 */
import { PrismaClient, PublicationType, AuthorRole, CaseStatus, StudyGroupRole, ProjectRole, ProjectStatus } from '@prisma/client';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'medconnect_dev_2026',
  ),
);

// Sample publication data by specialty
const PUBLICATIONS_DATA = [
  {
    title: 'Tratamento da Insuficiencia Cardiaca com Terapia Celular',
    journal: 'Arquivos Brasileiros de Cardiologia',
    publicationType: PublicationType.ARTICLE,
    specialty: 'Cardiologia',
    keywords: ['insuficiencia cardiaca', 'terapia celular', 'regeneracao'],
  },
  {
    title: 'Eficacia da Intubacao Precoce em Pacientes Criticos',
    journal: 'Revista Brasileira de Terapia Intensiva',
    publicationType: PublicationType.ARTICLE,
    specialty: 'Medicina Intensiva',
    keywords: ['intubacao', 'ventilacao mecanica', 'pacientes criticos'],
  },
  {
    title: 'Casuistica de Fraturas do Femur em Idosos',
    journal: 'Acta Ortopedica Brasileira',
    publicationType: PublicationType.CASE_REPORT,
    specialty: 'Ortopedia e Traumatologia',
    keywords: ['fratura femur', 'idosos', 'artroplastia'],
  },
  {
    title: 'Diagnostico Precoce do Autismo em Pediatria',
    journal: 'Jornal de Pediatria',
    publicationType: PublicationType.REVIEW,
    specialty: 'Pediatria',
    keywords: ['autismo', 'diagnostico precoce', 'desenvolvimento infantil'],
  },
  {
    title: 'Tratamento a Laser de Dermatoses Comuns',
    journal: 'Anais Brasileiros de Dermatologia',
    publicationType: PublicationType.ARTICLE,
    specialty: 'Dermatologia',
    keywords: ['laser', 'dermatoses', 'tratamento'],
  },
  {
    title: 'Ultrassonografia Point-of-Care em Emergencias',
    journal: 'Revista SOCESP',
    publicationType: PublicationType.CONFERENCE_PAPER,
    specialty: 'Medicina Intensiva',
    keywords: ['ultrassonografia', 'POC', 'emergencias'],
  },
  {
    title: 'Ecocardiograma em Valvopatias: Guia Pratico',
    journal: 'Arquivos Brasileiros de Cardiologia',
    publicationType: PublicationType.BOOK_CHAPTER,
    specialty: 'Cardiologia',
    keywords: ['ecocardiograma', 'valvopatias', 'diagnostico'],
  },
  {
    title: 'Neuroimagem em AVC Isquemico Agudo',
    journal: 'Arquivos de Neuro-Psiquiatria',
    publicationType: PublicationType.ARTICLE,
    specialty: 'Neurologia',
    keywords: ['AVC', 'neuroimagem', 'tratamento agudo'],
  },
  {
    title: 'Cirurgia Laparoscopica em Ginecologia',
    journal: 'Revista Brasileira de Ginecologia',
    publicationType: PublicationType.ARTICLE,
    specialty: 'Ginecologia',
    keywords: ['laparoscopia', 'ginecologia', 'minimamente invasivo'],
  },
];

// Sample case studies
const CASE_STUDIES = [
  {
    title: 'Infarto Agudo do Miocardio em Jovem de 35 anos',
    description: 'Paciente masculino, 35 anos, com dor toracica tipica de inicio subito. ECG com supradesnivelamento de ST em derivacoes anteriores.',
    diagnosis: 'Infarto Agudo do Miocardio com supradesnivelamento de ST (IAMCSST)',
    treatment: 'Angioplastia primaria com stent farmacologico',
    specialty: 'Cardiologia',
  },
  {
    title: 'Sepse de Foco Pulmonar em UTI',
    description: 'Paciente idoso, 72 anos, internado por pneumonia comunitaria evoluindo com choque septico.',
    diagnosis: 'Sepse pulmonar grave com disfuncao multipla de orgaos',
    treatment: 'Antibioticoterapia ampla, vasopressores, suporte ventilatorio',
    specialty: 'Medicina Intensiva',
  },
  {
    title: 'Fratura de Colo de Femur em Idosa',
    description: 'Paciente feminina, 82 anos, queda da propria altura com dor em quadril direito e incapacidade de deambular.',
    diagnosis: 'Fratura do colo do femur direito classificacao Garden IV',
    treatment: 'Artroplastia total do quadril',
    specialty: 'Ortopedia e Traumatologia',
  },
  {
    title: 'Exantema em Pediatria: Diagnostico Diferencial',
    description: 'Crianca de 5 anos com febre e exantema maculopapular generalizado.',
    diagnosis: 'Dengue clasica (confirmacao sorologica)',
    treatment: 'Hidratacao, antipireticos, monitoramento de sinais de alarme',
    specialty: 'Pediatria',
  },
  {
    title: 'Cefaleia Cronica: Abordagem Diagnostica',
    description: 'Mulher de 40 anos com cefaleia recorrente ha 6 meses, sem resposta a analgesicos comuns.',
    diagnosis: 'Enxaqueca cronica com aura',
    treatment: 'Profilaxia com topiramato, modificacao de estilo de vida',
    specialty: 'Neurologia',
  },
];

// Sample study groups
const STUDY_GROUPS = [
  { name: 'Grupo de Estudo em Ecocardiografia', description: 'Discussao semanal de casos e artigos sobre ecocardiografia', specialty: 'Cardiologia', isPublic: true, maxMembers: 30 },
  { name: 'UTI na Pratica', description: 'Compartilhamento de condutas e protocolos em terapia intensiva', specialty: 'Medicina Intensiva', isPublic: true, maxMembers: 50 },
  { name: 'Ortopedia Pediatrica', description: 'Casos de ortopedia em criancas e adolescentes', specialty: 'Ortopedia e Traumatologia', isPublic: false, maxMembers: 20 },
  { name: 'Pediatria Geral', description: 'Discussoes sobre casos clinicos pediatricos', specialty: 'Pediatria', isPublic: true, maxMembers: 40 },
  { name: 'Neurologia Clinica', description: 'Atualizacao em diagnostico e tratamento neurologico', specialty: 'Neurologia', isPublic: true, maxMembers: 25 },
  { name: 'Dermatologia Avancada', description: 'Casos complexos e tratamentos inovadores', specialty: 'Dermatologia', isPublic: false, maxMembers: 15 },
];

// Sample research projects
const RESEARCH_PROJECTS = [
  { title: 'Biomarcadores na Insuficiencia Cardiaca', description: 'Estudo prospectivo de novos biomarcadores prognosticos', status: ProjectStatus.ACTIVE, specialty: 'Cardiologia' },
  { title: 'Inteligencia Artificial em Diagnostico por Imagem', description: 'Aplicacao de ML em ultrassonografia point-of-care', status: ProjectStatus.ACTIVE, specialty: 'Medicina Intensiva' },
  { title: 'Reabilitacao Pos-AVC', description: 'Protocolos de reabilitacao neurologa domiciliar', status: ProjectStatus.PLANNING, specialty: 'Neurologia' },
  { title: 'Telemedicina em Pediatria', description: 'Avaliacao de eficacia de consultas pediatricas remotas', status: ProjectStatus.COMPLETED, specialty: 'Pediatria' },
];

async function main() {
  console.log('=== Seeding Collaboration Graph Data ===\n');

  const session = driver.session();

  try {
    // 1. Get existing doctors and specialties from PostgreSQL
    const doctors = await prisma.doctor.findMany({
      include: { specialties: { include: { specialty: true } } },
    });
    const specialties = await prisma.specialty.findMany();
    console.log(`Found ${doctors.length} doctors and ${specialties.length} specialties`);

    const specialtyMap = new Map(specialties.map(s => [s.name, s.id]));
    const doctorMap = new Map(doctors.map(d => [d.id, d]));

    // 2. Create Publications
    console.log('\n--- Creating Publications ---');
    let pubCount = 0;
    for (const pubData of PUBLICATIONS_DATA) {
      const specialtyId = specialtyMap.get(pubData.specialty);
      if (!specialtyId) continue;

      const publication = await prisma.publication.create({
        data: {
          title: pubData.title,
          journal: pubData.journal,
          publicationType: pubData.publicationType,
          keywords: pubData.keywords,
          publishDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          specialties: { create: { specialtyId } },
        },
      });

      // Select 2-4 random authors from doctors with that specialty
      const relevantDoctors = doctors.filter(d => 
        d.specialties.some(s => s.specialty.name === pubData.specialty)
      );
      const authorCount = Math.min(2 + Math.floor(Math.random() * 3), relevantDoctors.length);
      const selectedAuthors = relevantDoctors.sort(() => Math.random() - 0.5).slice(0, authorCount);

      for (let i = 0; i < selectedAuthors.length; i++) {
        const author = selectedAuthors[i];
        await prisma.publicationAuthor.create({
          data: {
            publicationId: publication.id,
            doctorId: author.id,
            authorRole: i === 0 ? AuthorRole.FIRST_AUTHOR : AuthorRole.CO_AUTHOR,
            authorOrder: i + 1,
          },
        });
      }

      // Create node in Neo4j
      await session.run(
        `CREATE (p:Publication {pgId: $id, title: $title, journal: $journal, publicationType: $type})`,
        { id: publication.id, title: publication.title, journal: publication.journal, type: publication.publicationType },
      );

      // Create AUTHORED relationships
      for (let i = 0; i < selectedAuthors.length; i++) {
        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId})
           MATCH (p:Publication {pgId: $pubId})
           MERGE (d)-[:AUTHORED {role: $role, authorOrder: $order}]->(p)`,
          { doctorId: selectedAuthors[i].id, pubId: publication.id, role: i === 0 ? 'first_author' : 'co_author', order: i + 1 },
        );
      }

      // Link publication to specialty
      await session.run(
        `MATCH (p:Publication {pgId: $pubId})
         MATCH (s:Specialty {pgId: $specId})
         MERGE (p)-[:RELATES_TO]->(s)`,
        { pubId: publication.id, specId: specialtyId },
      );

      pubCount++;
    }
    console.log(`  Created ${pubCount} publications with authors`);

    // 3. Create Case Studies
    console.log('\n--- Creating Case Studies ---');
    let caseCount = 0;
    for (const caseData of CASE_STUDIES) {
      const specialtyId = specialtyMap.get(caseData.specialty);
      if (!specialtyId) continue;

      // Find a doctor with this specialty to be the author
      const relevantDoctors = doctors.filter(d => 
        d.specialties.some(s => s.specialty.name === caseData.specialty)
      );
      if (relevantDoctors.length === 0) continue;

      const author = relevantDoctors[Math.floor(Math.random() * relevantDoctors.length)];

      const caseStudy = await prisma.caseStudy.create({
        data: {
          title: caseData.title,
          description: caseData.description,
          diagnosis: caseData.diagnosis,
          treatment: caseData.treatment,
          specialtyId,
          authorId: author.id,
          status: CaseStatus.OPEN,
          viewCount: Math.floor(Math.random() * 100),
        },
      });

      // Create node in Neo4j
      await session.run(
        `CREATE (c:CaseStudy {pgId: $id, title: $title, status: $status})`,
        { id: caseStudy.id, title: caseStudy.title, status: caseStudy.status },
      );

      // Create AUTHORED relationship
      await session.run(
        `MATCH (d:Doctor {pgId: $doctorId})
         MATCH (c:CaseStudy {pgId: $caseId})
         MERGE (d)-[:AUTHORED]->(c)`,
        { doctorId: author.id, caseId: caseStudy.id },
      );

      // Link to specialty
      await session.run(
        `MATCH (c:CaseStudy {pgId: $caseId})
         MATCH (s:Specialty {pgId: $specId})
         MERGE (c)-[:RELATES_TO]->(s)`,
        { caseId: caseStudy.id, specId: specialtyId },
      );

      // Add some participants
      const participants = relevantDoctors.filter(d => d.id !== author.id).slice(0, 3);
      for (const p of participants) {
        await prisma.caseParticipant.create({
          data: { caseId: caseStudy.id, doctorId: p.id },
        });
        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId})
           MATCH (c:CaseStudy {pgId: $caseId})
           MERGE (d)-[:PARTICIPATED_IN]->(c)`,
          { doctorId: p.id, caseId: caseStudy.id },
        );
      }

      caseCount++;
    }
    console.log(`  Created ${caseCount} case studies with participants`);

    // 4. Create Study Groups
    console.log('\n--- Creating Study Groups ---');
    let groupCount = 0;
    for (const groupData of STUDY_GROUPS) {
      const specialtyId = specialtyMap.get(groupData.specialty);

      const studyGroup = await prisma.studyGroup.create({
        data: {
          name: groupData.name,
          description: groupData.description,
          specialtyId,
          isPublic: groupData.isPublic,
          maxMembers: groupData.maxMembers,
        },
      });

      // Create node in Neo4j
      await session.run(
        `CREATE (g:StudyGroup {pgId: $id, name: $name, isPublic: $isPublic})`,
        { id: studyGroup.id, name: studyGroup.name, isPublic: studyGroup.isPublic },
      );

      // Link to specialty
      if (specialtyId) {
        await session.run(
          `MATCH (g:StudyGroup {pgId: $groupId})
           MATCH (s:Specialty {pgId: $specId})
           MERGE (g)-[:FOCUSES_ON]->(s)`,
          { groupId: studyGroup.id, specId: specialtyId },
        );
      }

      // Add members
      const relevantDoctors = doctors.filter(d => 
        !specialtyId || d.specialties.some(s => s.specialtyId === specialtyId)
      );
      const memberCount = Math.min(3 + Math.floor(Math.random() * 8), relevantDoctors.length);
      const selectedMembers = relevantDoctors.sort(() => Math.random() - 0.5).slice(0, memberCount);

      for (let i = 0; i < selectedMembers.length; i++) {
        const member = selectedMembers[i];
        const role = i === 0 ? StudyGroupRole.ADMIN : (i === 1 ? StudyGroupRole.MODERATOR : StudyGroupRole.MEMBER);
        await prisma.studyGroupMember.create({
          data: { groupId: studyGroup.id, doctorId: member.id, role },
        });
        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId})
           MATCH (g:StudyGroup {pgId: $groupId})
           MERGE (d)-[:MEMBER_OF {role: $role}]->(g)`,
          { doctorId: member.id, groupId: studyGroup.id, role },
        );
      }

      await prisma.studyGroup.update({
        where: { id: studyGroup.id },
        data: { memberCount: selectedMembers.length },
      });

      groupCount++;
    }
    console.log(`  Created ${groupCount} study groups with members`);

    // 5. Create Research Projects
    console.log('\n--- Creating Research Projects ---');
    let projectCount = 0;
    for (const projData of RESEARCH_PROJECTS) {
      const specialtyId = specialtyMap.get(projData.specialty);

      const project = await prisma.researchProject.create({
        data: {
          title: projData.title,
          description: projData.description,
          status: projData.status,
          startDate: projData.status === ProjectStatus.COMPLETED ? 
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) :
            new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        },
      });

      // Create node in Neo4j
      await session.run(
        `CREATE (r:ResearchProject {pgId: $id, title: $title, status: $status})`,
        { id: project.id, title: project.title, status: project.status },
      );

      // Add members (researchers)
      const relevantDoctors = specialtyId 
        ? doctors.filter(d => d.specialties.some(s => s.specialtyId === specialtyId))
        : doctors;
      const memberCount = Math.min(2 + Math.floor(Math.random() * 5), relevantDoctors.length);
      const selectedMembers = relevantDoctors.sort(() => Math.random() - 0.5).slice(0, memberCount);

      for (let i = 0; i < selectedMembers.length; i++) {
        const member = selectedMembers[i];
        const role = i === 0 ? ProjectRole.PRINCIPAL_INVESTIGATOR : 
                     (i === 1 ? ProjectRole.CO_INVESTIGATOR : ProjectRole.RESEARCHER);
        await prisma.researchProjectMember.create({
          data: { projectId: project.id, doctorId: member.id, role },
        });
        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId})
           MATCH (r:ResearchProject {pgId: $projectId})
           MERGE (d)-[:COLLABORATES_ON {role: $role}]->(r)`,
          { doctorId: member.id, projectId: project.id, role },
        );
      }

      projectCount++;
    }
    console.log(`  Created ${projectCount} research projects with members`);

    // 6. Create some citations between publications
    console.log('\n--- Creating Citations ---');
    const publications = await prisma.publication.findMany({ take: 10 });
    let citationCount = 0;
    for (let i = 1; i < publications.length; i++) {
      // Newer publications cite older ones
      if (Math.random() > 0.5) {
        try {
          await prisma.citation.create({
            data: {
              citingPubId: publications[i].id,
              citedPubId: publications[i - 1].id,
            },
          });
          await session.run(
            `MATCH (citing:Publication {pgId: $citingId})
             MATCH (cited:Publication {pgId: $citedId})
             MERGE (citing)-[:CITES]->(cited)`,
            { citingId: publications[i].id, citedId: publications[i - 1].id },
          );
          citationCount++;
        } catch (e) {
          // Skip if already exists
        }
      }
    }
    console.log(`  Created ${citationCount} citations between publications`);

    // 7. Final stats
    console.log('\n--- Final Graph Stats ---');
    const relStats = await session.run(
      `MATCH ()-[r]->() RETURN type(r) AS relType, count(r) AS cnt ORDER BY cnt DESC`,
    );
    for (const rec of relStats.records) {
      console.log(`  ${rec.get('relType')}: ${rec.get('cnt')}`);
    }

    const nodeStats = await session.run(
      `MATCH (n) RETURN labels(n)[0] AS nodeType, count(n) AS cnt ORDER BY cnt DESC`,
    );
    console.log('');
    for (const rec of nodeStats.records) {
      console.log(`  ${rec.get('nodeType')}: ${rec.get('cnt')}`);
    }

  } finally {
    await session.close();
  }

  await driver.close();
  await prisma.$disconnect();
  console.log('\n=== Collaboration graph seeding complete! ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
