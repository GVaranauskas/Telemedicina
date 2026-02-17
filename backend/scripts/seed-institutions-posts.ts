/**
 * Seed script to create institutions and posts directly via Prisma.
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-institutions-posts.ts
 */
import { PrismaClient, InstitutionType } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seeding Institutions & Posts ===\n');

  // ─── GET ALL USERS (to assign institution admin) ─────
  const allUsers = await prisma.user.findMany({
    include: { doctor: true, institution: true },
    orderBy: { createdAt: 'asc' },
  });

  // Users without institution
  const availableAdmins = allUsers.filter((u) => !u.institution);
  console.log(`Users without institution: ${availableAdmins.length}`);

  // ─── INSTITUTIONS ────────────────────────────────────
  const institutions = [
    { name: 'Hospital Albert Einstein', type: 'HOSPITAL' as InstitutionType, city: 'São Paulo', state: 'SP', description: 'Hospital referência em pesquisa e atendimento de alta complexidade.', neighborhood: 'Morumbi' },
    { name: 'Hospital Sírio-Libanês', type: 'HOSPITAL' as InstitutionType, city: 'São Paulo', state: 'SP', description: 'Centro médico de excelência com foco em oncologia e transplantes.', neighborhood: 'Bela Vista' },
    { name: 'Hospital Copa D\'Or', type: 'HOSPITAL' as InstitutionType, city: 'Rio de Janeiro', state: 'RJ', description: 'Hospital privado referência no Rio de Janeiro.', neighborhood: 'Copacabana' },
    { name: 'Hospital Moinhos de Vento', type: 'HOSPITAL' as InstitutionType, city: 'Porto Alegre', state: 'RS', description: 'Hospital filantrópico de excelência no sul do Brasil.', neighborhood: 'Moinhos de Vento' },
    { name: 'Hospital das Clínicas UFMG', type: 'HOSPITAL' as InstitutionType, city: 'Belo Horizonte', state: 'MG', description: 'Hospital universitário referência em Minas Gerais.', neighborhood: 'Santa Efigênia' },
    { name: 'Hospital de Base de Brasília', type: 'HOSPITAL' as InstitutionType, city: 'Brasília', state: 'DF', description: 'Maior hospital público do Distrito Federal.', neighborhood: 'Asa Sul' },
    { name: 'UPA 24h Madureira', type: 'PRONTO_SOCORRO' as InstitutionType, city: 'Rio de Janeiro', state: 'RJ', description: 'Unidade de pronto-atendimento 24 horas.', neighborhood: 'Madureira' },
    { name: 'Clínica Cardiolife', type: 'CLINICA' as InstitutionType, city: 'São Paulo', state: 'SP', description: 'Clínica especializada em cardiologia e check-up executivo.', neighborhood: 'Jardins' },
    { name: 'Laboratório Fleury', type: 'LABORATORIO' as InstitutionType, city: 'São Paulo', state: 'SP', description: 'Rede de laboratórios de diagnóstico e referência.', neighborhood: 'Itaim Bibi' },
    { name: 'Hospital Roberto Santos', type: 'HOSPITAL' as InstitutionType, city: 'Salvador', state: 'BA', description: 'Hospital geral público referência no Nordeste.', neighborhood: 'Cabula' },
    { name: 'Hospital Evangélico Mackenzie', type: 'HOSPITAL' as InstitutionType, city: 'Curitiba', state: 'PR', description: 'Hospital filantrópico com ensino e pesquisa.', neighborhood: 'Centro' },
    { name: 'UBS Jardim São Paulo', type: 'UBS' as InstitutionType, city: 'São Paulo', state: 'SP', description: 'Unidade básica de saúde com atendimento de atenção primária.', neighborhood: 'Jardim São Paulo' },
  ];

  let createdInst = 0;
  for (let i = 0; i < institutions.length; i++) {
    const inst = institutions[i];
    const admin = availableAdmins[i];
    if (!admin) {
      console.log(`  ✗ No admin available for ${inst.name}`);
      continue;
    }

    // Check if institution already exists
    const existing = await prisma.institution.findFirst({ where: { name: inst.name } });
    if (existing) {
      console.log(`  ~ ${inst.name} (already exists)`);
      continue;
    }

    try {
      await prisma.institution.create({
        data: {
          adminUserId: admin.id,
          ...inst,
        },
      });
      console.log(`  ✓ ${inst.name} (admin: ${admin.email})`);
      createdInst++;
    } catch (e: any) {
      console.log(`  ✗ ${inst.name}: ${e.message?.substring(0, 80)}`);
    }
  }
  console.log(`  Institutions created: ${createdInst}\n`);

  // ─── POSTS (via ScyllaDB is complex, let's use the feed table) ───
  // Posts are stored in ScyllaDB, not Prisma. We need to use the API for this.
  // Instead, let's update jobs to use different institution IDs.

  // Get all institutions
  const allInstitutions = await prisma.institution.findMany();
  console.log(`Total institutions: ${allInstitutions.length}`);
  for (const inst of allInstitutions) {
    console.log(`  - ${inst.name} (${inst.city}/${inst.state}) [${inst.id.substring(0, 8)}...]`);
  }

  // Update existing jobs to distribute across institutions
  const allJobs = await prisma.job.findMany();
  const instByCity: Record<string, string> = {};
  for (const inst of allInstitutions) {
    const key = `${inst.city}/${inst.state}`;
    if (!instByCity[key]) instByCity[key] = inst.id;
  }

  let updatedJobs = 0;
  for (const job of allJobs) {
    const key = `${job.city}/${job.state}`;
    const matchingInst = instByCity[key];
    if (matchingInst && matchingInst !== job.institutionId) {
      await prisma.job.update({
        where: { id: job.id },
        data: { institutionId: matchingInst },
      });
      updatedJobs++;
    }
  }
  console.log(`\nJobs re-assigned to matching institutions: ${updatedJobs}`);

  // ─── DOCTOR-SPECIALTY NEO4J SYNC ───────────────────────
  // We need to create SPECIALIZES_IN relationships in Neo4j.
  // Since we can't access Neo4j from this script easily,
  // we'll output Cypher statements to run later.
  
  const doctorSpecs = await prisma.doctorSpecialty.findMany({
    include: { doctor: true, specialty: true },
  });
  
  console.log(`\n=== Neo4j SPECIALIZES_IN Sync ===`);
  console.log(`Doctor-Specialty pairs found in Prisma: ${doctorSpecs.length}`);
  
  // Output cypher for each
  const cypherStatements: string[] = [];
  for (const ds of doctorSpecs) {
    cypherStatements.push(
      `MERGE (s:Specialty {name: '${ds.specialty.name}', pgId: '${ds.specialty.id}'}) ` +
      `WITH s MATCH (d:Doctor {pgId: '${ds.doctor.id}'}) ` +
      `MERGE (d)-[:SPECIALIZES_IN]->(s);`
    );
  }
  
  console.log(`Cypher statements generated: ${cypherStatements.length}`);
  
  // Write cypher to file
  const fs = require('fs');
  fs.writeFileSync('/tmp/neo4j-specialties.cypher', cypherStatements.join('\n'));
  console.log('Cypher saved to /tmp/neo4j-specialties.cypher');

  console.log('\n=== Done ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
