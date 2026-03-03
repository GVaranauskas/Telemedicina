/**
 * seed-schedule-data.ts
 * Populates workforce & scheduling data:
 *  - Departments per institution
 *  - ShiftTemplates per department
 *  - ShiftAssignments for the next 30 days
 *  - ScheduleBlocks (vacations, conferences) for doctors
 *  - InstitutionContracts linking doctors to institutions
 *  - ContactLogs (CRM entries)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const DEPARTMENT_TEMPLATES = [
  { name: 'UTI Adulto', type: 'UTI' as const },
  { name: 'Pronto-Socorro', type: 'PRONTO_SOCORRO' as const },
  { name: 'Centro Cirúrgico', type: 'CENTRO_CIRURGICO' as const },
  { name: 'Enfermaria Geral', type: 'ENFERMARIA' as const },
  { name: 'Ambulatório', type: 'AMBULATORIO' as const },
  { name: 'Pediatria', type: 'PEDIATRIA' as const },
  { name: 'Maternidade', type: 'MATERNIDADE' as const },
  { name: 'Oncologia', type: 'ONCOLOGIA' as const },
  { name: 'Cardiologia', type: 'CARDIOLOGIA' as const },
  { name: 'Neurologia', type: 'NEUROLOGIA' as const },
];

// Each institution gets a subset of departments
const INSTITUTION_DEPT_MAP: Record<string, string[]> = {
  'Hospital Albert Einstein':    ['UTI Adulto', 'Pronto-Socorro', 'Centro Cirúrgico', 'Enfermaria Geral', 'Cardiologia', 'Neurologia', 'Oncologia'],
  'Hospital Sírio-Libanês':      ['UTI Adulto', 'Pronto-Socorro', 'Centro Cirúrgico', 'Enfermaria Geral', 'Cardiologia', 'Oncologia'],
  'Hospital Copa D\'Or':         ['UTI Adulto', 'Pronto-Socorro', 'Centro Cirúrgico', 'Enfermaria Geral', 'Cardiologia'],
  'Hospital das Clínicas UFMG':  ['UTI Adulto', 'Pronto-Socorro', 'Enfermaria Geral', 'Ambulatório', 'Pediatria', 'Neurologia'],
  'Hospital Moinhos de Vento':   ['UTI Adulto', 'Pronto-Socorro', 'Centro Cirúrgico', 'Cardiologia', 'Oncologia'],
  'Hospital Roberto Santos':     ['Pronto-Socorro', 'Enfermaria Geral', 'Ambulatório', 'Pediatria', 'Maternidade'],
  'Hospital Evangélico Mackenzie': ['Pronto-Socorro', 'Enfermaria Geral', 'Ambulatório', 'Maternidade'],
  'Hospital de Base de Brasília': ['UTI Adulto', 'Pronto-Socorro', 'Centro Cirúrgico', 'Enfermaria Geral', 'Neurologia'],
};

const SHIFT_TEMPLATES_BY_DEPT: Record<string, Array<{ name: string; dayOfWeek: any; startTime: string; endTime: string; shiftType: any; requiredDoctors: number }>> = {
  'UTI Adulto': [
    { name: 'Plantão Diurno UTI', dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '19:00', shiftType: 'PLANTAO_12H', requiredDoctors: 2 },
    { name: 'Plantão Noturno UTI', dayOfWeek: 'MONDAY', startTime: '19:00', endTime: '07:00', shiftType: 'PLANTAO_12H', requiredDoctors: 2 },
    { name: 'Plantão Diurno UTI', dayOfWeek: 'WEDNESDAY', startTime: '07:00', endTime: '19:00', shiftType: 'PLANTAO_12H', requiredDoctors: 2 },
    { name: 'Plantão Noturno UTI', dayOfWeek: 'WEDNESDAY', startTime: '19:00', endTime: '07:00', shiftType: 'PLANTAO_12H', requiredDoctors: 2 },
    { name: 'Plantão 24h UTI FDS', dayOfWeek: 'SATURDAY', startTime: '07:00', endTime: '07:00', shiftType: 'PLANTAO_24H', requiredDoctors: 1 },
  ],
  'Pronto-Socorro': [
    { name: 'Plantão Diurno PS', dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '19:00', shiftType: 'PLANTAO_12H', requiredDoctors: 3 },
    { name: 'Plantão Noturno PS', dayOfWeek: 'MONDAY', startTime: '19:00', endTime: '07:00', shiftType: 'PLANTAO_12H', requiredDoctors: 2 },
    { name: 'Plantão 24h PS Dom', dayOfWeek: 'SUNDAY', startTime: '07:00', endTime: '07:00', shiftType: 'PLANTAO_24H', requiredDoctors: 2 },
  ],
  'Centro Cirúrgico': [
    { name: 'Cirurgias Eletivas Manhã', dayOfWeek: 'TUESDAY', startTime: '07:00', endTime: '13:00', shiftType: 'CIRURGIA', requiredDoctors: 2 },
    { name: 'Cirurgias Eletivas Tarde', dayOfWeek: 'THURSDAY', startTime: '13:00', endTime: '19:00', shiftType: 'CIRURGIA', requiredDoctors: 2 },
    { name: 'Sobreaviso CC FDS', dayOfWeek: 'SATURDAY', startTime: '07:00', endTime: '19:00', shiftType: 'SOBREAVISO', requiredDoctors: 1 },
  ],
  'Enfermaria Geral': [
    { name: 'Visita Matinal', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '12:00', shiftType: 'VISITA', requiredDoctors: 2 },
    { name: 'Visita Matinal', dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '12:00', shiftType: 'VISITA', requiredDoctors: 2 },
    { name: 'Visita Matinal', dayOfWeek: 'FRIDAY', startTime: '08:00', endTime: '12:00', shiftType: 'VISITA', requiredDoctors: 2 },
  ],
  'Ambulatório': [
    { name: 'Consultas Manhã', dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '12:00', shiftType: 'CONSULTA', requiredDoctors: 4 },
    { name: 'Consultas Tarde', dayOfWeek: 'TUESDAY', startTime: '13:00', endTime: '17:00', shiftType: 'CONSULTA', requiredDoctors: 4 },
    { name: 'Consultas Manhã', dayOfWeek: 'THURSDAY', startTime: '08:00', endTime: '12:00', shiftType: 'CONSULTA', requiredDoctors: 4 },
  ],
  'Pediatria': [
    { name: 'Plantão Pediátrico', dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '19:00', shiftType: 'PLANTAO_12H', requiredDoctors: 1 },
    { name: 'Plantão Noturno Pediátrico', dayOfWeek: 'MONDAY', startTime: '19:00', endTime: '07:00', shiftType: 'PLANTAO_12H', requiredDoctors: 1 },
    { name: 'Plantão Pediátrico FDS', dayOfWeek: 'SATURDAY', startTime: '07:00', endTime: '07:00', shiftType: 'PLANTAO_24H', requiredDoctors: 1 },
  ],
  'Maternidade': [
    { name: 'Plantão Obstetrícia', dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '19:00', shiftType: 'PLANTAO_12H', requiredDoctors: 1 },
    { name: 'Plantão Noturno Obstetrícia', dayOfWeek: 'MONDAY', startTime: '19:00', endTime: '07:00', shiftType: 'PLANTAO_12H', requiredDoctors: 1 },
  ],
  'Oncologia': [
    { name: 'Consultas Oncologia', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '17:00', shiftType: 'CONSULTA', requiredDoctors: 2 },
    { name: 'Quimioterapia', dayOfWeek: 'WEDNESDAY', startTime: '07:00', endTime: '15:00', shiftType: 'CONSULTA', requiredDoctors: 2 },
  ],
  'Cardiologia': [
    { name: 'Consultas Cardio', dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '17:00', shiftType: 'CONSULTA', requiredDoctors: 2 },
    { name: 'Hemodinâmica', dayOfWeek: 'THURSDAY', startTime: '07:00', endTime: '13:00', shiftType: 'CIRURGIA', requiredDoctors: 1 },
  ],
  'Neurologia': [
    { name: 'Consultas Neuro', dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '17:00', shiftType: 'CONSULTA', requiredDoctors: 2 },
    { name: 'Sobreaviso AVC', dayOfWeek: 'FRIDAY', startTime: '07:00', endTime: '07:00', shiftType: 'SOBREAVISO', requiredDoctors: 1 },
  ],
};

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   MedConnect — Schedule Data Seed Script   ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const institutions = await prisma.institution.findMany({ orderBy: { name: 'asc' } });
  const doctors = await prisma.doctor.findMany({
    include: { specialties: { include: { specialty: true } } },
    take: 50,
  });
  const specialties = await prisma.specialty.findMany();

  if (institutions.length === 0 || doctors.length === 0) {
    console.error('❌ No institutions or doctors found. Run seed-master.ts first.');
    process.exit(1);
  }

  console.log(`Found ${institutions.length} institutions and ${doctors.length} doctors\n`);

  // ─── Step 1: Departments ───────────────────────────────────────────────────
  console.log('🏥 Step 1: Creating departments...');
  const departmentMap: Record<string, string> = {}; // "institutionId:deptName" -> deptId

  for (const inst of institutions) {
    const deptNames = INSTITUTION_DEPT_MAP[inst.name] || ['Ambulatório', 'Pronto-Socorro'];
    for (const deptName of deptNames) {
      const template = DEPARTMENT_TEMPLATES.find(t => t.name === deptName);
      if (!template) continue;

      const existing = await prisma.department.findFirst({
        where: { institutionId: inst.id, name: deptName },
      });

      if (existing) {
        departmentMap[`${inst.id}:${deptName}`] = existing.id;
        continue;
      }

      const dept = await prisma.department.create({
        data: {
          institutionId: inst.id,
          name: deptName,
          type: template.type,
          isActive: true,
        },
      });
      departmentMap[`${inst.id}:${deptName}`] = dept.id;
      console.log(`  ✓ ${inst.name.split(' ')[1]} → ${deptName}`);
    }
  }
  console.log(`  Total departments: ${Object.keys(departmentMap).length}\n`);

  // ─── Step 2: Shift Templates ───────────────────────────────────────────────
  console.log('📋 Step 2: Creating shift templates...');
  let templateCount = 0;

  for (const [key, deptId] of Object.entries(departmentMap)) {
    const deptName = key.split(':').slice(1).join(':');
    const templates = SHIFT_TEMPLATES_BY_DEPT[deptName] || [];

    for (const t of templates) {
      const existing = await prisma.shiftTemplate.findFirst({
        where: { departmentId: deptId, name: t.name, dayOfWeek: t.dayOfWeek },
      });
      if (existing) continue;

      const instId = key.split(':')[0];
      await prisma.shiftTemplate.create({
        data: {
          institutionId: instId,
          departmentId: deptId,
          name: t.name,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          shiftType: t.shiftType,
          requiredDoctors: t.requiredDoctors,
          isActive: true,
        },
      });
      templateCount++;
    }
  }
  console.log(`  ✓ ${templateCount} shift templates created\n`);

  // ─── Step 3: Shift Assignments (next 30 days) ──────────────────────────────
  console.log('📅 Step 3: Creating shift assignments for next 30 days...');
  let shiftCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const shiftTypes: Array<'PLANTAO_12H' | 'PLANTAO_24H' | 'CONSULTA' | 'SOBREAVISO' | 'CIRURGIA' | 'VISITA'> =
    ['PLANTAO_12H', 'PLANTAO_24H', 'CONSULTA', 'SOBREAVISO'];

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dayOfWeek = dayNames[date.getDay()];

    // Assign 3-8 random shifts per day across institutions
    const shiftsToday = Math.floor(Math.random() * 6) + 3;

    for (let s = 0; s < shiftsToday; s++) {
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];
      const inst = institutions[Math.floor(Math.random() * institutions.length)];
      const deptKey = Object.keys(departmentMap).find(k => k.startsWith(inst.id + ':'));
      const deptId = deptKey ? departmentMap[deptKey] : undefined;

      const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
      let startTime = '07:00', endTime = '19:00';
      if (shiftType === 'PLANTAO_24H') { startTime = '07:00'; endTime = '07:00'; }
      else if (Math.random() > 0.5) { startTime = '19:00'; endTime = '07:00'; }

      const existing = await prisma.shiftAssignment.findFirst({
        where: { doctorId: doctor.id, date, startTime },
      });
      if (existing) continue;

      await prisma.shiftAssignment.create({
        data: {
          doctorId: doctor.id,
          institutionId: inst.id,
          departmentId: deptId || undefined,
          date,
          startTime,
          endTime,
          shiftType,
          status: dayOffset < 7 ? 'CONFIRMED' : 'SCHEDULED',
        },
      });
      shiftCount++;
    }
  }
  console.log(`  ✓ ${shiftCount} shift assignments created\n`);

  // ─── Step 4: Schedule Blocks (vacations, conferences) ─────────────────────
  console.log('🚫 Step 4: Creating schedule blocks...');
  let blockCount = 0;
  const blockTypes = ['VACATION', 'CONFERENCE', 'PERSONAL', 'SICK_LEAVE'] as const;
  const blockReasons = [
    'Férias anuais', 'Congresso Brasileiro de Cardiologia', 'Simpósio de Medicina Intensiva',
    'Licença médica', 'Atualização profissional', 'Workshop cirúrgico', 'Congresso SBC 2026',
  ];

  // Give ~30% of doctors at least one block
  const doctorsWithBlocks = doctors.slice(0, Math.floor(doctors.length * 0.3));
  for (const doctor of doctorsWithBlocks) {
    const numBlocks = Math.random() > 0.5 ? 2 : 1;
    for (let b = 0; b < numBlocks; b++) {
      const startOffset = Math.floor(Math.random() * 60) + 5;
      const duration = Math.floor(Math.random() * 14) + 3;
      const startDate = addDays(today, startOffset);
      const endDate = addDays(startDate, duration);

      await prisma.scheduleBlock.create({
        data: {
          doctorId: doctor.id,
          startDate,
          endDate,
          reason: blockReasons[Math.floor(Math.random() * blockReasons.length)],
          blockType: blockTypes[Math.floor(Math.random() * blockTypes.length)],
        },
      });
      blockCount++;
    }
  }
  console.log(`  ✓ ${blockCount} schedule blocks created\n`);

  // ─── Step 5: Institution Contracts ────────────────────────────────────────
  console.log('📄 Step 5: Creating institution contracts...');
  let contractCount = 0;
  const contractTypes = ['CLT', 'PJ', 'COOPERATIVA', 'TEMPORARIO', 'AUTONOMO'] as const;
  const contractStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING_SIGNATURE', 'EXPIRED'] as const;

  for (const inst of institutions) {
    // Each institution gets 3-6 contracts with doctors
    const contractDoctors = doctors.slice(0, 6).sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4) + 3);

    for (const doctor of contractDoctors) {
      const existing = await prisma.institutionContract.findFirst({
        where: { institutionId: inst.id, doctorId: doctor.id },
      });
      if (existing) continue;

      const contractType = contractTypes[Math.floor(Math.random() * contractTypes.length)];
      const status = contractStatuses[Math.floor(Math.random() * contractStatuses.length)];
      const startOffset = -Math.floor(Math.random() * 365) - 30;
      const startDate = addDays(today, startOffset);
      const endDate = status === 'EXPIRED'
        ? addDays(today, -Math.floor(Math.random() * 30) - 1)
        : addDays(today, Math.floor(Math.random() * 365) + 90);

      const specialty = doctor.specialties[0]?.specialty;

      await prisma.institutionContract.create({
        data: {
          institutionId: inst.id,
          doctorId: doctor.id,
          type: contractType,
          status,
          hourlyRate: contractType === 'PJ' || contractType === 'AUTONOMO'
            ? Math.floor(Math.random() * 200) + 200
            : undefined,
          monthlyRate: contractType === 'CLT' || contractType === 'COOPERATIVA'
            ? Math.floor(Math.random() * 10000) + 8000
            : undefined,
          startDate,
          endDate,
          specialtyId: specialty?.id,
          terms: `Contrato ${contractType} para prestação de serviços médicos em ${inst.name}.`,
        },
      });
      contractCount++;
    }
  }
  console.log(`  ✓ ${contractCount} contracts created\n`);

  // ─── Step 6: Contact Logs (CRM) ───────────────────────────────────────────
  console.log('📞 Step 6: Creating contact logs...');
  let logCount = 0;
  const contactTypes = ['PHONE', 'EMAIL', 'IN_APP', 'WHATSAPP'] as const;
  const outcomes = ['CONTACTED', 'INTERESTED', 'DECLINED', 'NO_RESPONSE', 'SCHEDULED_INTERVIEW'] as const;
  const contactNotes = [
    'Médico demonstrou interesse nas vagas de plantão.',
    'Aguardando retorno após envio da proposta.',
    'Não tem disponibilidade no momento.',
    'Agendou entrevista para a próxima semana.',
    'Solicitou mais informações sobre benefícios.',
    'Tem interesse mas está com contrato em outro hospital.',
    'Retornar em 30 dias - está finalizando especialização.',
  ];

  for (const inst of institutions) {
    const contactDoctors = doctors.sort(() => Math.random() - 0.5).slice(0, 8);

    for (const doctor of contactDoctors) {
      const numLogs = Math.floor(Math.random() * 3) + 1;
      for (let l = 0; l < numLogs; l++) {
        const dayOffset = -Math.floor(Math.random() * 90);
        const followUpOffset = Math.floor(Math.random() * 14) + 3;
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

        await prisma.contactLog.create({
          data: {
            institutionId: inst.id,
            doctorId: doctor.id,
            type: contactTypes[Math.floor(Math.random() * contactTypes.length)],
            outcome,
            notes: contactNotes[Math.floor(Math.random() * contactNotes.length)],
            followUpDate: outcome === 'INTERESTED' || outcome === 'SCHEDULED_INTERVIEW'
              ? addDays(today, followUpOffset)
              : outcome === 'NO_RESPONSE'
              ? addDays(today, 7)
              : undefined,
          },
        });
        logCount++;
      }
    }
  }
  console.log(`  ✓ ${logCount} contact log entries created\n`);

  // ─── Final Summary ─────────────────────────────────────────────────────────
  const summary = await Promise.all([
    prisma.department.count(),
    prisma.shiftTemplate.count(),
    prisma.shiftAssignment.count(),
    prisma.scheduleBlock.count(),
    prisma.institutionContract.count(),
    prisma.contactLog.count(),
  ]);

  console.log('  ┌─────────────────────────────────────┐');
  console.log('  │  Schedule Data Stats                 │');
  console.log('  ├─────────────────────────────────────┤');
  console.log(`  │  Departments:       ${String(summary[0]).padEnd(16)} │`);
  console.log(`  │  Shift Templates:   ${String(summary[1]).padEnd(16)} │`);
  console.log(`  │  Shift Assignments: ${String(summary[2]).padEnd(16)} │`);
  console.log(`  │  Schedule Blocks:   ${String(summary[3]).padEnd(16)} │`);
  console.log(`  │  Contracts:         ${String(summary[4]).padEnd(16)} │`);
  console.log(`  │  Contact Logs:      ${String(summary[5]).padEnd(16)} │`);
  console.log('  └─────────────────────────────────────┘');
  console.log('\n✅ Schedule data seed complete!\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
