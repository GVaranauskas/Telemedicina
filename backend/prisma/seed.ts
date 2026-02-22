import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const specialties = [
  { name: 'Cardiologia', code: 'CARDIO' },
  { name: 'Dermatologia', code: 'DERMA' },
  { name: 'Endocrinologia', code: 'ENDO' },
  { name: 'Gastroenterologia', code: 'GASTRO' },
  { name: 'Geriatria', code: 'GERIA' },
  { name: 'Ginecologia e Obstetrícia', code: 'GINOBS' },
  { name: 'Infectologia', code: 'INFEC' },
  { name: 'Medicina de Emergência', code: 'EMERG' },
  { name: 'Medicina de Família e Comunidade', code: 'MFC' },
  { name: 'Medicina do Trabalho', code: 'TRAB' },
  { name: 'Medicina Intensiva', code: 'UTI' },
  { name: 'Nefrologia', code: 'NEFRO' },
  { name: 'Neurologia', code: 'NEURO' },
  { name: 'Oftalmologia', code: 'OFTAL' },
  { name: 'Oncologia Clínica', code: 'ONCO' },
  { name: 'Ortopedia e Traumatologia', code: 'ORTO' },
  { name: 'Otorrinolaringologia', code: 'ORL' },
  { name: 'Pediatria', code: 'PED' },
  { name: 'Pneumologia', code: 'PNEUMO' },
  { name: 'Psiquiatria', code: 'PSIQ' },
  { name: 'Radiologia', code: 'RADIO' },
  { name: 'Reumatologia', code: 'REUMA' },
  { name: 'Urologia', code: 'URO' },
  { name: 'Cirurgia Geral', code: 'CIRGER' },
  { name: 'Cirurgia Cardiovascular', code: 'CIRCARDIO' },
  { name: 'Cirurgia Plástica', code: 'CIRPLAS' },
  { name: 'Anestesiologia', code: 'ANEST' },
  { name: 'Patologia Clínica', code: 'PATCLI' },
  { name: 'Hematologia', code: 'HEMATO' },
  { name: 'Clínica Médica', code: 'CLINMED' },
  { name: 'Neurocirurgia', code: 'NEUROCI' },
  { name: 'Cirurgia Torácica', code: 'CIRTORA' },
  { name: 'Genética Médica', code: 'GENET' },
];

const skills = [
  'Ecocardiograma',
  'Eletrocardiograma',
  'Ultrassonografia',
  'Endoscopia',
  'Colonoscopia',
  'Cirurgia Laparoscópica',
  'Cirurgia Robótica',
  'Suporte Avançado de Vida',
  'Ventilação Mecânica',
  'Hemodiálise',
  'Quimioterapia',
  'Radioterapia',
  'Broncoscopia',
  'Cateterismo Cardíaco',
  'Angioplastia',
  'Marca-passo',
  'Terapia Intensiva Neonatal',
  'Ressonância Magnética',
  'Tomografia Computadorizada',
  'Telemedicina',
  'Medicina Baseada em Evidências',
  'Gestão Hospitalar',
  'Pesquisa Clínica',
  'Docência em Medicina',
  'Acupuntura Médica',
];

async function main() {
  console.log('Seeding specialties...');
  for (const specialty of specialties) {
    await prisma.specialty.upsert({
      where: { code: specialty.code },
      update: {},
      create: specialty,
    });
  }
  console.log(`${specialties.length} specialties seeded`);

  console.log('Seeding skills...');
  for (const skillName of skills) {
    await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
  }
  console.log(`${skills.length} skills seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
