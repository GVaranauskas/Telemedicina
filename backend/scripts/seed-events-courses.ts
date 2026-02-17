/**
 * Seed script for Events, Courses, and Topics data
 * Phase 3 of Graph Expansion
 */

import { PrismaClient, EventType, EventStatus, CourseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Events, Courses, and Topics data...\n');

  // Get existing data
  const specialties = await prisma.specialty.findMany();
  const doctors = await prisma.doctor.findMany();
  const institutions = await prisma.institution.findMany();

  if (specialties.length === 0 || doctors.length === 0) {
    console.log('❌ No specialties or doctors found. Run basic seed first.');
    return;
  }

  // ============================================================
  // 1. TOPICS
  // ============================================================
  console.log('📚 Creating Topics...');

  const topicNames = [
    'Insuficiência Cardíaca',
    'Arritmias Cardíacas',
    'Doença Arterial Coronariana',
    'Ecocardiografia',
    'Cateterismo Cardíaco',
    'Hipertensão Arterial',
    'Medicina de Emergência',
    'Trauma',
    'Cuidados Intensivos',
    'Ventilação Mecânica',
    'Sepsis',
    'Pediatria Geral',
    'Neonatologia',
    'Desenvolvimento Infantil',
    'Ortopedia Pediátrica',
    'Fraturas',
    'Artroscopia',
    'Coluna',
    'Neurologia Clínica',
    'Epilepsia',
    'AVC',
    'Demências',
    'Telemedicina',
    'Gestão em Saúde',
    'Ética Médica',
  ];

  const topics: any[] = [];
  for (const name of topicNames) {
    const topic = await prisma.topic.create({
      data: { name },
    });
    topics.push(topic);
    console.log(`  ✓ ${name}`);
  }

  // ============================================================
  // 2. EVENTS
  // ============================================================
  console.log('\n🎤 Creating Events...');

  const eventData = [
    {
      title: 'Congresso Brasileiro de Cardiologia 2026',
      description: 'O maior evento de cardiologia do Brasil com palestras, workshops e apresentações científicas.',
      eventType: EventType.CONGRESS,
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-05-18'),
      location: 'Centro de Convenções Anhembi, São Paulo',
      isOnline: false,
      isFree: false,
      price: 1500.00,
      maxAttendees: 5000,
      topics: ['Insuficiência Cardíaca', 'Arritmias Cardíacas', 'Doença Arterial Coronariana'],
    },
    {
      title: 'Simpósio de Medicina Intensiva',
      description: 'Discussão de casos complexos e atualizações em cuidados intensivos.',
      eventType: EventType.SYMPOSIUM,
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-21'),
      location: 'Hotel Windsor, Rio de Janeiro',
      isOnline: false,
      isFree: false,
      price: 800.00,
      maxAttendees: 500,
      topics: ['Cuidados Intensivos', 'Ventilação Mecânica', 'Sepsis'],
    },
    {
      title: 'Workshop de Ecocardiografia Avançada',
      description: 'Treinamento prático em técnicas avançadas de ecocardiografia.',
      eventType: EventType.WORKSHOP,
      startDate: new Date('2026-04-10'),
      endDate: null,
      location: 'Hospital Sírio-Libanês, São Paulo',
      isOnline: false,
      isFree: false,
      price: 500.00,
      maxAttendees: 30,
      topics: ['Ecocardiografia'],
    },
    {
      title: 'Webinar: Atualizações em AVC',
      description: 'Abordagem moderna do AVC: do diagnóstico ao tratamento.',
      eventType: EventType.WEBINAR,
      startDate: new Date('2026-02-25'),
      endDate: null,
      location: null,
      isOnline: true,
      isFree: true,
      price: null,
      maxAttendees: 1000,
      topics: ['AVC', 'Neurologia Clínica'],
    },
    {
      title: 'Conferência de Telemedicina',
      description: 'Tendências e melhores práticas em telemedicina pós-pandemia.',
      eventType: EventType.CONFERENCE,
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-06-06'),
      location: 'Online',
      isOnline: true,
      isFree: false,
      price: 200.00,
      maxAttendees: 2000,
      topics: ['Telemedicina', 'Gestão em Saúde'],
    },
    {
      title: 'Meetup de Ortopedia',
      description: 'Encontro informal para discussão de casos clínicos em ortopedia.',
      eventType: EventType.MEETUP,
      startDate: new Date('2026-02-28'),
      endDate: null,
      location: 'Restaurante Figueira Rubaiyat, São Paulo',
      isOnline: false,
      isFree: true,
      price: null,
      maxAttendees: 50,
      topics: ['Fraturas', 'Artroscopia'],
    },
    {
      title: 'Simpósio de Pediatria Neonatal',
      description: 'Atualizações em cuidados neonatais e pediatria.',
      eventType: EventType.SYMPOSIUM,
      startDate: new Date('2026-04-25'),
      endDate: new Date('2026-04-26'),
      location: 'Centro de Eventos FIERGS, Porto Alegre',
      isOnline: false,
      isFree: false,
      price: 600.00,
      maxAttendees: 400,
      topics: ['Neonatologia', 'Pediatria Geral'],
    },
    {
      title: 'Workshop de Emergências Traumatológicas',
      description: 'Simulação e treinamento em atendimento de trauma.',
      eventType: EventType.WORKSHOP,
      startDate: new Date('2026-05-05'),
      endDate: null,
      location: 'Hospital das Clínicas, Belo Horizonte',
      isOnline: false,
      isFree: false,
      price: 350.00,
      maxAttendees: 40,
      topics: ['Trauma', 'Medicina de Emergência'],
    },
  ];

  const events: any[] = [];
  for (const data of eventData) {
    const organizer = institutions[Math.floor(Math.random() * institutions.length)];
    const eventTopics = data.topics.map((t) => topics.find((tp) => tp.name === t)).filter(Boolean);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        isOnline: data.isOnline,
        isFree: data.isFree,
        price: data.price,
        maxAttendees: data.maxAttendees,
        organizerId: organizer.id,
        topics: {
          create: eventTopics.map((t) => ({ topicId: t!.id })),
        },
      },
      include: { topics: true },
    });

    events.push(event);
    console.log(`  ✓ ${data.title}`);
  }

  // ============================================================
  // 3. EVENT SPEAKERS
  // ============================================================
  console.log('\n🎤 Adding Event Speakers...');

  let speakerCount = 0;
  for (const event of events) {
    // Add 2-4 speakers per event
    const numSpeakers = Math.floor(Math.random() * 3) + 2;
    const shuffledDoctors = [...doctors].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numSpeakers && i < shuffledDoctors.length; i++) {
      try {
        await prisma.eventSpeaker.create({
          data: {
            eventId: event.id,
            doctorId: shuffledDoctors[i].id,
            topic: event.topics[i % event.topics.length]?.topic?.name || 'Tema Geral',
            orderNum: i + 1,
          },
        });
        speakerCount++;
      } catch (e) {
        // Skip if error
      }
    }
  }
  console.log(`  ✓ Created ${speakerCount} event speakers`);

  // ============================================================
  // 4. EVENT ATTENDEES
  // ============================================================
  console.log('\n👥 Adding Event Attendees...');

  let attendeeCount = 0;
  for (const event of events) {
    // Add 5-15 attendees per event
    const numAttendees = Math.floor(Math.random() * 11) + 5;
    const shuffledDoctors = [...doctors].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numAttendees && i < shuffledDoctors.length; i++) {
      try {
        await prisma.eventAttendee.create({
          data: {
            eventId: event.id,
            doctorId: shuffledDoctors[i].id,
            registeredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          },
        });
        attendeeCount++;
      } catch (e) {
        // Skip if error
      }
    }

    // Update attendee count
    await prisma.event.update({
      where: { id: event.id },
      data: { attendeeCount: numAttendees },
    });
  }
  console.log(`  ✓ Created ${attendeeCount} event attendees`);

  // ============================================================
  // 5. COURSES
  // ============================================================
  console.log('\n📖 Creating Courses...');

  const courseData = [
    {
      title: 'Ecocardiografia Clínica - Do Básico ao Avançado',
      description: 'Curso completo de ecocardiografia com foco em interpretação clínica.',
      durationHours: 40,
      level: 'INTERMEDIATE',
      price: 450.00,
      topics: ['Ecocardiografia', 'Insuficiência Cardíaca'],
    },
    {
      title: 'Manejo de Pacientes Críticos',
      description: 'Abordagem prática do paciente crítico na UTI.',
      durationHours: 30,
      level: 'ADVANCED',
      price: 600.00,
      topics: ['Cuidados Intensivos', 'Ventilação Mecânica', 'Sepsis'],
    },
    {
      title: 'Introdução à Telemedicina',
      description: 'Fundamentos e práticas de telemedicina para clínicos.',
      durationHours: 20,
      level: 'BEGINNER',
      price: 150.00,
      topics: ['Telemedicina', 'Ética Médica'],
    },
    {
      title: 'Ortopedia Pediátrica',
      description: 'Principais condições ortopédicas na infância.',
      durationHours: 25,
      level: 'INTERMEDIATE',
      price: 300.00,
      topics: ['Ortopedia Pediátrica', 'Pediatria Geral'],
    },
    {
      title: 'Emergências Neurológicas',
      description: 'Diagnóstico e tratamento de emergências neurológicas.',
      durationHours: 35,
      level: 'ADVANCED',
      price: 500.00,
      topics: ['AVC', 'Epilepsia', 'Neurologia Clínica'],
    },
    {
      title: 'Cardiologia Preventiva',
      description: 'Estratégias de prevenção cardiovascular na prática clínica.',
      durationHours: 20,
      level: 'BEGINNER',
      price: 200.00,
      topics: ['Hipertensão Arterial', 'Doença Arterial Coronariana'],
    },
    {
      title: 'Trauma: Atendimento Inicial',
      description: 'Protocolos de atendimento inicial ao paciente traumatizado.',
      durationHours: 25,
      level: 'INTERMEDIATE',
      price: 350.00,
      topics: ['Trauma', 'Medicina de Emergência'],
    },
    {
      title: 'Gestão em Saúde',
      description: 'Princípios de gestão para líderes em saúde.',
      durationHours: 30,
      level: 'INTERMEDIATE',
      price: 400.00,
      topics: ['Gestão em Saúde', 'Ética Médica'],
    },
  ];

  const courses: any[] = [];
  for (const data of courseData) {
    const instructor = doctors[Math.floor(Math.random() * doctors.length)];
    const courseTopics = data.topics.map((t) => topics.find((tp) => tp.name === t)).filter(Boolean);

    const course = await prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        instructorId: instructor.id,
        status: CourseStatus.PUBLISHED,
        durationHours: data.durationHours,
        level: data.level,
        price: data.price,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 50) + 5,
        topics: {
          create: courseTopics.map((t) => ({ topicId: t!.id })),
        },
        modules: {
          create: [
            { title: 'Introdução', orderNum: 1, durationMin: 60 },
            { title: 'Módulo Principal', orderNum: 2, durationMin: 120 },
            { title: 'Casos Práticos', orderNum: 3, durationMin: 90 },
            { title: 'Avaliação Final', orderNum: 4, durationMin: 30 },
          ],
        },
      },
    });

    courses.push(course);
    console.log(`  ✓ ${data.title}`);
  }

  // ============================================================
  // 6. COURSE ENROLLMENTS
  // ============================================================
  console.log('\n📚 Adding Course Enrollments...');

  let enrollmentCount = 0;
  for (const course of courses) {
    // Add 3-10 enrollments per course
    const numEnrollments = Math.floor(Math.random() * 8) + 3;
    const shuffledDoctors = [...doctors].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numEnrollments && i < shuffledDoctors.length; i++) {
      const progress = Math.floor(Math.random() * 100);
      const status = progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'ENROLLED';

      try {
        await prisma.courseEnrollment.create({
          data: {
            courseId: course.id,
            doctorId: shuffledDoctors[i].id,
            status: status as any,
            progress,
            enrolledAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          },
        });
        enrollmentCount++;
      } catch (e) {
        // Skip if error
      }
    }

    // Update enrollment count
    await prisma.course.update({
      where: { id: course.id },
      data: { enrollmentCount: numEnrollments },
    });
  }
  console.log(`  ✓ Created ${enrollmentCount} course enrollments`);

  console.log('\n✅ Events & Courses seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
