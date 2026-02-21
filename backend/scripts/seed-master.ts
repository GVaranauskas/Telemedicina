/**
 * Master seed script — creates realistic demo data for MedConnect.
 *
 * Creates 15 doctors, 8 institutions, 25 jobs, 10 events, connections,
 * workplaces, and syncs everything to Neo4j.
 *
 * Run with: npm run seed:all
 */
import neo4j from 'neo4j-driver';
import { PrismaClient, UserRole, ConnectionStatus, InstitutionType, JobType, JobShift, EventType, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'medconnect_dev_2026';

const DEMO_PASSWORD = 'MedConnect@2026';

// ─── Doctors ─────────────────────────────────────────────────────────────────

const DOCTORS = [
  {
    email: 'ana.silva@medconnect.dev',
    fullName: 'Dra. Ana Carolina Silva',
    crm: '123456', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5505, longitude: -46.6333,
    graduationYear: 2010, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99001-0001',
    bio: 'Cardiologista com 14 anos de experiência em cardiologia intervencionista. Especialista em ecocardiografia e insuficiência cardíaca.',
    specialtyCodes: ['CARDIO'],
    skillNames: ['Ecocardiograma', 'Eletrocardiograma', 'Cateterismo Cardíaco'],
  },
  {
    email: 'rafael.costa@medconnect.dev',
    fullName: 'Dr. Rafael Augusto Costa',
    crm: '234567', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5489, longitude: -46.6388,
    graduationYear: 2012, universityName: 'UNIFESP — Universidade Federal de São Paulo',
    phone: '(11) 99001-0002',
    bio: 'Neurologista dedicado ao estudo de doenças neurodegenerativas e epilepsia. Pesquisador da UNIFESP.',
    specialtyCodes: ['NEURO'],
    skillNames: ['Ressonância Magnética', 'Medicina Baseada em Evidências', 'Pesquisa Clínica'],
  },
  {
    email: 'mariana.oliveira@medconnect.dev',
    fullName: 'Dra. Mariana Ferreira Oliveira',
    crm: '345678', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9068, longitude: -43.1729,
    graduationYear: 2008, universityName: 'UFRJ — Universidade Federal do Rio de Janeiro',
    phone: '(21) 99001-0003',
    bio: 'Oncologista clínica com expertise em tumores sólidos. Participa de estudos clínicos internacionais.',
    specialtyCodes: ['ONCO'],
    skillNames: ['Quimioterapia', 'Pesquisa Clínica', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'pedro.santos@medconnect.dev',
    fullName: 'Dr. Pedro Henrique Santos',
    crm: '456789', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5629, longitude: -46.6544,
    graduationYear: 2015, universityName: 'Santa Casa de São Paulo',
    phone: '(11) 99001-0004',
    bio: 'Ortopedista especializado em cirurgia do joelho e quadril. Cirurgião do time Palmeiras.',
    specialtyCodes: ['ORTO'],
    skillNames: ['Cirurgia Laparoscópica', 'Cirurgia Robótica'],
  },
  {
    email: 'fernanda.lima@medconnect.dev',
    fullName: 'Dra. Fernanda Lima Rodrigues',
    crm: '567890', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9167, longitude: -43.9345,
    graduationYear: 2011, universityName: 'UFMG — Universidade Federal de Minas Gerais',
    phone: '(31) 99001-0005',
    bio: 'Endocrinologista com foco em diabetes e obesidade. Coordena o programa de obesidade do HC-UFMG.',
    specialtyCodes: ['ENDO'],
    skillNames: ['Telemedicina', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'lucas.pereira@medconnect.dev',
    fullName: 'Dr. Lucas Pereira Alves',
    crm: '678901', crmState: 'RS',
    city: 'Porto Alegre', state: 'RS', latitude: -30.0346, longitude: -51.2177,
    graduationYear: 2009, universityName: 'UFRGS — Universidade Federal do Rio Grande do Sul',
    phone: '(51) 99001-0006',
    bio: 'Infectologista com experiência em doenças tropicais e HIV/AIDS. Consultor para a OMS.',
    specialtyCodes: ['INFEC'],
    skillNames: ['Pesquisa Clínica', 'Medicina Baseada em Evidências', 'Telemedicina'],
  },
  {
    email: 'camila.souza@medconnect.dev',
    fullName: 'Dra. Camila Souza Martins',
    crm: '789012', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5329, longitude: -46.6395,
    graduationYear: 2014, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99001-0007',
    bio: 'Psiquiatra especializada em transtornos do humor e psicoterapia cognitivo-comportamental.',
    specialtyCodes: ['PSIQ'],
    skillNames: ['Telemedicina', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'gabriel.ferreira@medconnect.dev',
    fullName: 'Dr. Gabriel Ferreira Nunes',
    crm: '890123', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5755, longitude: -46.6956,
    graduationYear: 2007, universityName: 'UNICAMP — Universidade Estadual de Campinas',
    phone: '(11) 99001-0008',
    bio: 'Gastroenterologista com 17 anos de experiência. Referência em endoscopia diagnóstica e terapêutica.',
    specialtyCodes: ['GASTRO'],
    skillNames: ['Endoscopia', 'Colonoscopia', 'Ultrassonografia'],
  },
  {
    email: 'julia.mendes@medconnect.dev',
    fullName: 'Dra. Julia Mendes Carvalho',
    crm: '901234', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9519, longitude: -43.2106,
    graduationYear: 2013, universityName: 'PUC-Rio — Pontifícia Universidade Católica do Rio',
    phone: '(21) 99001-0009',
    bio: 'Ginecologista e obstetra com especialização em medicina fetal e ultrassonografia obstétrica.',
    specialtyCodes: ['GINOBS'],
    skillNames: ['Ultrassonografia', 'Telemedicina'],
  },
  {
    email: 'thiago.barbosa@medconnect.dev',
    fullName: 'Dr. Thiago Barbosa Campos',
    crm: '012345', crmState: 'BA',
    city: 'Salvador', state: 'BA', latitude: -12.9714, longitude: -38.5014,
    graduationYear: 2016, universityName: 'UFBA — Universidade Federal da Bahia',
    phone: '(71) 99001-0010',
    bio: 'Intensivista atuando em UTI adulto. Especialista em ventilação mecânica e sepse.',
    specialtyCodes: ['UTI'],
    skillNames: ['Ventilação Mecânica', 'Suporte Avançado de Vida', 'Hemodiálise'],
  },
  {
    email: 'beatriz.alves@medconnect.dev',
    fullName: 'Dra. Beatriz Alves Cardoso',
    crm: '111222', crmState: 'PR',
    city: 'Curitiba', state: 'PR', latitude: -25.4284, longitude: -49.2733,
    graduationYear: 2010, universityName: 'UFPR — Universidade Federal do Paraná',
    phone: '(41) 99001-0011',
    bio: 'Dermatologista com expertise em dermatoscopia e tratamento de melanoma.',
    specialtyCodes: ['DERMA'],
    skillNames: ['Pesquisa Clínica', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'rodrigo.tavares@medconnect.dev',
    fullName: 'Dr. Rodrigo Tavares Medeiros',
    crm: '222333', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5204, longitude: -46.6272,
    graduationYear: 2006, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99001-0012',
    bio: 'Cirurgião cardiovascular com 18 anos de experiência. Realizou mais de 2000 cirurgias cardíacas.',
    specialtyCodes: ['CIRCARDIO'],
    skillNames: ['Cirurgia Robótica', 'Marca-passo', 'Angioplastia', 'Cateterismo Cardíaco'],
  },
  {
    email: 'isabela.franco@medconnect.dev',
    fullName: 'Dra. Isabela Franco Nascimento',
    crm: '333444', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5475, longitude: -46.6361,
    graduationYear: 2018, universityName: 'UNIFESP — Universidade Federal de São Paulo',
    phone: '(11) 99001-0013',
    bio: 'Pediatra com subespecialização em neonatologia. Coordena a UTI neonatal do Hospital Albert Einstein.',
    specialtyCodes: ['PED'],
    skillNames: ['Terapia Intensiva Neonatal', 'Suporte Avançado de Vida', 'Telemedicina'],
  },
  {
    email: 'andre.pinto@medconnect.dev',
    fullName: 'Dr. André Pinto Rezende',
    crm: '444555', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9322, longitude: -43.9389,
    graduationYear: 2005, universityName: 'UFMG — Universidade Federal de Minas Gerais',
    phone: '(31) 99001-0014',
    bio: 'Pneumologista especialista em doenças intersticiais e DPOC. Professor associado da UFMG.',
    specialtyCodes: ['PNEUMO'],
    skillNames: ['Broncoscopia', 'Ventilação Mecânica', 'Docência em Medicina'],
  },
  {
    email: 'patricia.moura@medconnect.dev',
    fullName: 'Dra. Patrícia Moura Vieira',
    crm: '555666', crmState: 'DF',
    city: 'Brasília', state: 'DF', latitude: -15.7801, longitude: -47.9292,
    graduationYear: 2012, universityName: 'UnB — Universidade de Brasília',
    phone: '(61) 99001-0015',
    bio: 'Reumatologista com especialização em artrite reumatoide e lúpus. Pesquisadora do CNPq.',
    specialtyCodes: ['REUMA'],
    skillNames: ['Pesquisa Clínica', 'Medicina Baseada em Evidências', 'Telemedicina'],
  },
];

// ─── Connections ──────────────────────────────────────────────────────────────

const CONNECTION_PAIRS: [number, number][] = [
  [0, 1], [0, 3], [0, 11],
  [1, 5], [1, 6],
  [2, 4], [2, 9],
  [3, 7], [3, 11],
  [4, 5], [4, 14],
  [5, 9], [5, 12],
  [6, 14], [6, 1],
  [7, 8], [7, 2],
  [8, 2], [8, 12],
  [9, 13], [9, 4],
  [10, 0], [10, 11],
  [11, 0], [11, 3],
  [12, 8], [12, 6],
  [13, 3], [13, 14],
  [14, 4], [14, 13],
];

// ─── Institutions ─────────────────────────────────────────────────────────────

const INSTITUTIONS = [
  {
    adminEmail: 'admin.einstein@medconnect.dev',
    name: 'Hospital Albert Einstein',
    type: InstitutionType.HOSPITAL,
    cnpj: '60.765.823/0001-30',
    city: 'São Paulo', state: 'SP',
    latitude: -23.5994, longitude: -46.7176,
    description: 'Referência mundial em excelência médica, o Hospital Albert Einstein é um dos melhores da América Latina.',
    website: 'https://www.einstein.br',
    phone: '(11) 2151-1233',
    email: 'contato@einstein.br',
  },
  {
    adminEmail: 'admin.sirio@medconnect.dev',
    name: 'Hospital Sírio-Libanês',
    type: InstitutionType.HOSPITAL,
    cnpj: '61.585.865/0001-51',
    city: 'São Paulo', state: 'SP',
    latitude: -23.5574, longitude: -46.6620,
    description: 'Hospital de excelência com foco em oncologia, cardiologia e neurologia.',
    website: 'https://www.hsl.org.br',
    phone: '(11) 3155-0200',
    email: 'contato@hsl.org.br',
  },
  {
    adminEmail: 'admin.copador@medconnect.dev',
    name: 'Hospital Copa D\'Or',
    type: InstitutionType.HOSPITAL,
    cnpj: '30.679.003/0001-09',
    city: 'Rio de Janeiro', state: 'RJ',
    latitude: -22.9655, longitude: -43.1836,
    description: 'Hospital privado de alto padrão no Rio de Janeiro, referência em oncologia e cardiologia.',
    website: 'https://www.copador.com.br',
    phone: '(21) 2545-3600',
    email: 'contato@copador.com.br',
  },
  {
    adminEmail: 'admin.hcufmg@medconnect.dev',
    name: 'Hospital das Clínicas UFMG',
    type: InstitutionType.HOSPITAL,
    cnpj: '17.217.985/0001-04',
    city: 'Belo Horizonte', state: 'MG',
    latitude: -19.9218, longitude: -43.9553,
    description: 'Hospital universitário de referência em Minas Gerais, vinculado à UFMG.',
    website: 'https://www.ebserh.gov.br/web/hc-ufmg',
    phone: '(31) 3409-9000',
    email: 'contato@hc.ufmg.br',
  },
  {
    adminEmail: 'admin.moinhos@medconnect.dev',
    name: 'Hospital Moinhos de Vento',
    type: InstitutionType.HOSPITAL,
    cnpj: '92.695.790/0001-60',
    city: 'Porto Alegre', state: 'RS',
    latitude: -30.0243, longitude: -51.2046,
    description: 'Um dos melhores hospitais do Sul do Brasil, destaque em pesquisa e ensino.',
    website: 'https://www.hmv.org.br',
    phone: '(51) 3314-3434',
    email: 'contato@hmv.org.br',
  },
  {
    adminEmail: 'admin.roberto@medconnect.dev',
    name: 'Hospital Roberto Santos',
    type: InstitutionType.HOSPITAL,
    cnpj: '13.937.821/0001-91',
    city: 'Salvador', state: 'BA',
    latitude: -12.9741, longitude: -38.5016,
    description: 'Hospital de referência do estado da Bahia, vinculado à SESAB.',
    website: 'https://www.hospitaldoestado.ba.gov.br',
    phone: '(71) 3116-8300',
    email: 'contato@hospitaldoestado.ba.gov.br',
  },
  {
    adminEmail: 'admin.evangelico@medconnect.dev',
    name: 'Hospital Evangélico Mackenzie',
    type: InstitutionType.HOSPITAL,
    cnpj: '76.835.020/0001-08',
    city: 'Curitiba', state: 'PR',
    latitude: -25.4416, longitude: -49.2765,
    description: 'Hospital filantrópico de referência no Paraná, com mais de 70 anos de história.',
    website: 'https://www.hospitalevangélico.com.br',
    phone: '(41) 3240-5000',
    email: 'contato@hospitalevangélico.com.br',
  },
  {
    adminEmail: 'admin.basebsb@medconnect.dev',
    name: 'Hospital de Base de Brasília',
    type: InstitutionType.HOSPITAL,
    cnpj: '00.394.544/0001-67',
    city: 'Brasília', state: 'DF',
    latitude: -15.7967, longitude: -47.8943,
    description: 'Maior hospital público do Distrito Federal, referência em emergências e trauma.',
    website: 'https://www.saude.df.gov.br/hbdf',
    phone: '(61) 3325-5050',
    email: 'contato@hbdf.df.gov.br',
  },
];

// ─── Workplace assignments (doctor index → institution name) ─────────────────

const WORKPLACE_ASSIGNMENTS = [
  { doctorIdx: 0,  instName: 'Hospital Albert Einstein' },    // Ana — Cardio
  { doctorIdx: 1,  instName: 'Hospital Sírio-Libanês' },      // Rafael — Neuro
  { doctorIdx: 2,  instName: 'Hospital Copa D\'Or' },         // Mariana — Onco
  { doctorIdx: 3,  instName: 'Hospital Albert Einstein' },    // Pedro — Ortopedia
  { doctorIdx: 4,  instName: 'Hospital das Clínicas UFMG' },  // Fernanda — Endo
  { doctorIdx: 5,  instName: 'Hospital Moinhos de Vento' },   // Lucas — Infecto
  { doctorIdx: 6,  instName: 'Hospital Sírio-Libanês' },      // Camila — Psiq
  { doctorIdx: 7,  instName: 'Hospital Albert Einstein' },    // Gabriel — Gastro
  { doctorIdx: 8,  instName: 'Hospital Copa D\'Or' },         // Julia — Gineco
  { doctorIdx: 9,  instName: 'Hospital Roberto Santos' },     // Thiago — UTI
  { doctorIdx: 10, instName: 'Hospital Evangélico Mackenzie' }, // Beatriz — Derma
  { doctorIdx: 11, instName: 'Hospital Albert Einstein' },    // Rodrigo — CirCardio
  { doctorIdx: 12, instName: 'Hospital Albert Einstein' },    // Isabela — Ped
  { doctorIdx: 13, instName: 'Hospital das Clínicas UFMG' },  // André — Pneumo
  { doctorIdx: 14, instName: 'Hospital de Base de Brasília' }, // Patricia — Reuma
];

// ─── Jobs ─────────────────────────────────────────────────────────────────────

// Each job references an institution by name and optionally a specialty by code.
const JOBS_DATA = [
  // São Paulo — Einstein
  { instName: 'Hospital Albert Einstein', specCode: 'CARDIO', title: 'Cardiologista Intervencionista', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'São Paulo', state: 'SP', salaryMin: 25000, salaryMax: 40000, description: 'Buscamos cardiologista intervencionista para compor nossa equipe de hemodinâmica. Experiência em cateterismo e angioplastia exigida.', requirements: 'RQE em Cardiologia Intervencionista, mínimo 5 anos de experiência.' },
  { instName: 'Hospital Albert Einstein', specCode: 'NEURO', title: 'Neurologista — UTI Neurológica', type: JobType.PLANTAO, shift: JobShift.NOTURNO, city: 'São Paulo', state: 'SP', salaryMin: 18000, salaryMax: 28000, description: 'Plantão noturno na UTI Neurológica do Einstein. Experiência em AVC e trauma craniano.', requirements: 'Título de especialista em Neurologia, experiência em terapia intensiva.' },
  { instName: 'Hospital Albert Einstein', specCode: 'PED', title: 'Neonatologista — UTI Neonatal', type: JobType.PLANTAO, shift: JobShift.DIURNO, city: 'São Paulo', state: 'SP', salaryMin: 20000, salaryMax: 32000, description: 'Médico neonatologista para UTI neonatal de alto risco. Excelência no cuidado ao recém-nascido.', requirements: 'Residência em Pediatria com subespecialização em Neonatologia.' },
  // São Paulo — Sírio-Libanês
  { instName: 'Hospital Sírio-Libanês', specCode: 'ONCO', title: 'Oncologista Clínico', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'São Paulo', state: 'SP', salaryMin: 30000, salaryMax: 50000, description: 'Oncologista clínico para o centro oncológico do Sírio-Libanês. Foco em protocolos de quimioterapia e imunoterapia.', requirements: 'Título de especialista, experiência em estudos clínicos fase II/III.' },
  { instName: 'Hospital Sírio-Libanês', specCode: 'NEURO', title: 'Neurologista — Ambulatório', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'São Paulo', state: 'SP', salaryMin: 22000, salaryMax: 35000, description: 'Atendimento ambulatorial em neurologia geral e doenças neurodegenerativas.', requirements: 'RQE em Neurologia, interesse em pesquisa.' },
  { instName: 'Hospital Sírio-Libanês', specCode: 'PSIQ', title: 'Psiquiatra — Internação', type: JobType.PLANTAO, shift: JobShift.FLEXIVEL, city: 'São Paulo', state: 'SP', salaryMin: 16000, salaryMax: 24000, description: 'Médico psiquiatra para ala de internação psiquiátrica. Horário flexível com escala mensal.', requirements: 'Residência médica em Psiquiatria.' },
  // Rio de Janeiro — Copa D'Or
  { instName: 'Hospital Copa D\'Or', specCode: 'ONCO', title: 'Onco-hematologista', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Rio de Janeiro', state: 'RJ', salaryMin: 28000, salaryMax: 45000, description: 'Médico especialista em onco-hematologia para o centro de transplante de medula óssea.', requirements: 'Residência em Hematologia e Hemoterapia com foco em doenças onco-hematológicas.' },
  { instName: 'Hospital Copa D\'Or', specCode: 'GINOBS', title: 'Ginecologista Obstetra', type: JobType.PLANTAO, shift: JobShift.NOTURNO, city: 'Rio de Janeiro', state: 'RJ', salaryMin: 15000, salaryMax: 22000, description: 'Plantão noturno em obstetrícia de alto risco. Hospital com maternidade nível 3.', requirements: 'RQE em Ginecologia e Obstetrícia, experiência em gestações de risco.' },
  { instName: 'Hospital Copa D\'Or', specCode: 'CIRCARDIO', title: 'Cirurgião Cardiovascular', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Rio de Janeiro', state: 'RJ', salaryMin: 35000, salaryMax: 60000, description: 'Cirurgião cardiovascular para equipe de cirurgia cardíaca adulta.', requirements: 'Título em Cirurgia Cardiovascular, experiência em cirurgia robótica.' },
  // Belo Horizonte — HC-UFMG
  { instName: 'Hospital das Clínicas UFMG', specCode: 'ENDO', title: 'Endocrinologista — Ambulatório', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Belo Horizonte', state: 'MG', salaryMin: 14000, salaryMax: 20000, description: 'Ambulatório de endocrinologia e metabologia. Foco em diabetes e obesidade.', requirements: 'Residência em Endocrinologia, interesse em docência e pesquisa.' },
  { instName: 'Hospital das Clínicas UFMG', specCode: 'PNEUMO', title: 'Pneumologista — UTI', type: JobType.PLANTAO, shift: JobShift.NOTURNO, city: 'Belo Horizonte', state: 'MG', salaryMin: 16000, salaryMax: 23000, description: 'Plantão em UTI adulto com foco em suporte ventilatório. Hospital escola de referência.', requirements: 'Residência em Pneumologia ou Medicina Intensiva.' },
  { instName: 'Hospital das Clínicas UFMG', specCode: 'REUMA', title: 'Reumatologista — Pesquisa Clínica', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Belo Horizonte', state: 'MG', salaryMin: 18000, salaryMax: 27000, description: 'Médico reumatologista para ambulatório e participação em estudos clínicos multicêntricos.', requirements: 'Título de especialista em Reumatologia, experiência em pesquisa clínica.' },
  // Porto Alegre — Moinhos de Vento
  { instName: 'Hospital Moinhos de Vento', specCode: 'INFEC', title: 'Infectologista — SCIH', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Porto Alegre', state: 'RS', salaryMin: 20000, salaryMax: 30000, description: 'Infectologista para a Comissão de Controle de Infecção Hospitalar e atendimento clínico.', requirements: 'Título de especialista em Infectologia, experiência em controle de infecção.' },
  { instName: 'Hospital Moinhos de Vento', specCode: 'CARDIO', title: 'Cardiologista — Ecocardiografia', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Porto Alegre', state: 'RS', salaryMin: 22000, salaryMax: 33000, description: 'Cardiologista com habilidade em ecocardiografia para o serviço de diagnóstico por imagem.', requirements: 'RQE em Cardiologia, certificação em Ecocardiografia.' },
  // Salvador — Roberto Santos
  { instName: 'Hospital Roberto Santos', specCode: 'UTI', title: 'Médico Intensivista — UTI Adulto', type: JobType.PLANTAO, shift: JobShift.NOTURNO, city: 'Salvador', state: 'BA', salaryMin: 14000, salaryMax: 20000, description: 'Plantão noturno em UTI adulto do maior hospital público da Bahia.', requirements: 'Residência em Medicina Intensiva ou Anestesiologia, experiência em sepse.' },
  { instName: 'Hospital Roberto Santos', specCode: 'EMERG', title: 'Médico de Emergência', type: JobType.PLANTAO, shift: JobShift.FLEXIVEL, city: 'Salvador', state: 'BA', salaryMin: 12000, salaryMax: 18000, description: 'Médico para pronto-socorro de alto volume. Experiência em emergências clínicas e trauma.', requirements: 'Residência em Medicina de Emergência ou Clínica Médica.' },
  // Curitiba — Evangélico
  { instName: 'Hospital Evangélico Mackenzie', specCode: 'DERMA', title: 'Dermatologista — Oncologia Cutânea', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Curitiba', state: 'PR', salaryMin: 20000, salaryMax: 30000, description: 'Dermatologista com foco em dermatoscopia digital e oncologia cutânea.', requirements: 'Título de especialista em Dermatologia, experiência em melanoma.' },
  { instName: 'Hospital Evangélico Mackenzie', specCode: 'ORTO', title: 'Ortopedista — Cirurgia do Joelho', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Curitiba', state: 'PR', salaryMin: 25000, salaryMax: 38000, description: 'Ortopedista especializado em cirurgia do joelho e artroscopia.', requirements: 'RQE em Ortopedia, certificação em Cirurgia do Joelho.' },
  // Brasília — Hospital de Base
  { instName: 'Hospital de Base de Brasília', specCode: 'REUMA', title: 'Reumatologista — Ambulatório', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Brasília', state: 'DF', salaryMin: 18000, salaryMax: 26000, description: 'Reumatologista para ambulatório especializado em doenças autoimunes.', requirements: 'Residência em Reumatologia.' },
  { instName: 'Hospital de Base de Brasília', specCode: 'UTI', title: 'Intensivista — UTI Trauma', type: JobType.PLANTAO, shift: JobShift.NOTURNO, city: 'Brasília', state: 'DF', salaryMin: 15000, salaryMax: 22000, description: 'Médico intensivista para UTI de trauma do maior hospital público do DF.', requirements: 'Residência em Medicina Intensiva, ACLS e ATLS obrigatórios.' },
  { instName: 'Hospital Albert Einstein', specCode: 'GASTRO', title: 'Gastroenterologista — Endoscopia', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'São Paulo', state: 'SP', salaryMin: 22000, salaryMax: 35000, description: 'Gastroenterologista com habilidade em endoscopia terapêutica para serviço de alta complexidade.', requirements: 'Título em Gastroenterologia, certificação em Endoscopia Digestiva.' },
  { instName: 'Hospital Moinhos de Vento', specCode: 'PSIQ', title: 'Psiquiatra — Saúde Mental Corporativa', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Porto Alegre', state: 'RS', salaryMin: 18000, salaryMax: 28000, description: 'Psiquiatra para programa de saúde mental com foco em burnout e transtornos do trabalho.', requirements: 'Residência em Psiquiatria, interesse em saúde ocupacional.' },
  { instName: 'Hospital Copa D\'Or', specCode: 'NEURO', title: 'Neurologista — Doenças do Movimento', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Rio de Janeiro', state: 'RJ', salaryMin: 25000, salaryMax: 38000, description: 'Neurologista especialista em doenças do movimento (Parkinson, distonias) para ambulatório especializado.', requirements: 'Subespecialização em Doenças do Movimento.' },
  { instName: 'Hospital das Clínicas UFMG', specCode: 'INFEC', title: 'Infectologista — Doenças Tropicais', type: JobType.CONSULTA, shift: JobShift.INTEGRAL, city: 'Belo Horizonte', state: 'MG', salaryMin: 16000, salaryMax: 24000, description: 'Infectologista para ambulatório de doenças tropicais e parasitárias do HC-UFMG.', requirements: 'Residência em Infectologia, experiência com leishmaniose e doença de Chagas.' },
  { instName: 'Hospital de Base de Brasília', specCode: 'PNEUMO', title: 'Pneumologista — Ambulatório DPOC', type: JobType.CONSULTA, shift: JobShift.DIURNO, city: 'Brasília', state: 'DF', salaryMin: 16000, salaryMax: 24000, description: 'Pneumologista para ambulatório especializado em DPOC e doenças intersticiais.', requirements: 'Título de especialista em Pneumologia.' },
];

// ─── Events ───────────────────────────────────────────────────────────────────

const now = new Date();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const EVENTS_DATA = [
  {
    instName: 'Hospital Albert Einstein',
    title: '43º Congresso Brasileiro de Cardiologia — SBC 2026',
    eventType: EventType.CONGRESS,
    startDate: addDays(now, 30),
    endDate: addDays(now, 33),
    location: 'Expo Center Norte, São Paulo — SP',
    isOnline: false,
    isFree: false,
    price: 890,
    maxAttendees: 5000,
    description: 'O maior evento de cardiologia do Brasil reúne os principais especialistas para discutir inovações em prevenção, diagnóstico e tratamento cardiovascular.',
    speakerEmails: ['ana.silva@medconnect.dev', 'rodrigo.tavares@medconnect.dev'],
  },
  {
    instName: 'Hospital Sírio-Libanês',
    title: 'Webinar: Inteligência Artificial na Medicina — Presente e Futuro',
    eventType: EventType.WEBINAR,
    startDate: addDays(now, 7),
    endDate: addDays(now, 7),
    location: null,
    isOnline: true,
    isFree: true,
    price: null,
    maxAttendees: 2000,
    description: 'Especialistas discutem o impacto da IA no diagnóstico clínico, gestão hospitalar e medicina personalizada. Casos práticos de implementação.',
    speakerEmails: ['rafael.costa@medconnect.dev'],
  },
  {
    instName: 'Hospital Albert Einstein',
    title: 'Workshop: Cirurgia Robótica em Ortopedia — Técnicas Avançadas',
    eventType: EventType.WORKSHOP,
    startDate: addDays(now, 14),
    endDate: addDays(now, 15),
    location: 'Hospital Albert Einstein, São Paulo — SP',
    isOnline: false,
    isFree: false,
    price: 1200,
    maxAttendees: 30,
    description: 'Workshop hands-on de cirurgia robótica com sistema Da Vinci. Treinamento prático supervisionado por especialistas.',
    speakerEmails: ['pedro.santos@medconnect.dev', 'rodrigo.tavares@medconnect.dev'],
  },
  {
    instName: 'Hospital Copa D\'Or',
    title: '28º Simpósio de Oncologia do Rio de Janeiro',
    eventType: EventType.SYMPOSIUM,
    startDate: addDays(now, 21),
    endDate: addDays(now, 22),
    location: 'Windsor Barra Hotel, Rio de Janeiro — RJ',
    isOnline: false,
    isFree: false,
    price: 650,
    maxAttendees: 800,
    description: 'Simpósio com foco em imunoterapia, terapias-alvo e tratamento multidisciplinar do câncer. Apresentação de casos clínicos e protocolos recentes.',
    speakerEmails: ['mariana.oliveira@medconnect.dev'],
  },
  {
    instName: 'Hospital Moinhos de Vento',
    title: 'Congresso Sul-Brasileiro de Infectologia',
    eventType: EventType.CONGRESS,
    startDate: addDays(now, 45),
    endDate: addDays(now, 47),
    location: 'Centro de Eventos do Sul, Porto Alegre — RS',
    isOnline: false,
    isFree: false,
    price: 550,
    maxAttendees: 1200,
    description: 'Encontro anual dos infectologistas do sul do Brasil. Temas: antimicrobianos, controle de infecção hospitalar, doenças emergentes.',
    speakerEmails: ['lucas.pereira@medconnect.dev'],
  },
  {
    instName: 'Hospital das Clínicas UFMG',
    title: 'Jornada de Endocrinologia — Diabetes & Metabolismo 2026',
    eventType: EventType.CONFERENCE,
    startDate: addDays(now, 18),
    endDate: addDays(now, 19),
    location: 'Hospital das Clínicas UFMG, Belo Horizonte — MG',
    isOnline: false,
    isFree: false,
    price: 350,
    maxAttendees: 400,
    description: 'Atualização em diabetes tipo 1 e tipo 2, novos hipoglicemiantes e abordagem multidisciplinar da obesidade.',
    speakerEmails: ['fernanda.lima@medconnect.dev', 'andre.pinto@medconnect.dev'],
  },
  {
    instName: 'Hospital Sírio-Libanês',
    title: 'Webinar: Telemedicina na Prática — Regulação e Boas Práticas',
    eventType: EventType.WEBINAR,
    startDate: addDays(now, 5),
    endDate: addDays(now, 5),
    location: null,
    isOnline: true,
    isFree: true,
    price: null,
    maxAttendees: 3000,
    description: 'Aspectos legais da telemedicina no Brasil, protocolos de atendimento remoto e experiências de sucesso durante a pandemia.',
    speakerEmails: ['camila.souza@medconnect.dev', 'patricia.moura@medconnect.dev'],
  },
  {
    instName: 'Hospital Roberto Santos',
    title: 'Simpósio Baiano de Medicina Intensiva',
    eventType: EventType.SYMPOSIUM,
    startDate: addDays(now, 25),
    endDate: addDays(now, 26),
    location: 'Salvador Convention Center, Salvador — BA',
    isOnline: false,
    isFree: false,
    price: 450,
    maxAttendees: 600,
    description: 'Atualização em sepse, choque, ventilação mecânica e suporte de órgãos na terapia intensiva.',
    speakerEmails: ['thiago.barbosa@medconnect.dev'],
  },
  {
    instName: 'Hospital Evangélico Mackenzie',
    title: 'Workshop: Dermatoscopia Digital e Mapeamento Corporal Total',
    eventType: EventType.WORKSHOP,
    startDate: addDays(now, 10),
    endDate: addDays(now, 10),
    location: 'Hospital Evangélico Mackenzie, Curitiba — PR',
    isOnline: false,
    isFree: false,
    price: 800,
    maxAttendees: 40,
    description: 'Treinamento prático em dermatoscopia digital e mapeamento corporal total para diagnóstico precoce do melanoma.',
    speakerEmails: ['beatriz.alves@medconnect.dev'],
  },
  {
    instName: 'Hospital de Base de Brasília',
    title: 'Congresso Nacional de Reumatologia — Doenças Autoimunes 2026',
    eventType: EventType.CONGRESS,
    startDate: addDays(now, 60),
    endDate: addDays(now, 63),
    location: 'Centro de Convenções Ulysses Guimarães, Brasília — DF',
    isOnline: false,
    isFree: false,
    price: 750,
    maxAttendees: 1500,
    description: 'Maior evento de reumatologia do país. Foco em biológicos, pequenas moléculas e monitorização de doenças autoimunes.',
    speakerEmails: ['patricia.moura@medconnect.dev'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    MedConnect — Master Seed Script       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const neo4jSession = driver.session();

  try {
    // ── STEP 1: Specialties & skills ───────────────────────────────────
    console.log('📚 Step 1: Ensuring specialties & skills exist...');
    const { execSync } = require('child_process');
    try { execSync('npx prisma db seed', { cwd: process.cwd(), stdio: 'pipe' }); } catch { /* already up to date */ }

    const allSpecialties = await prisma.specialty.findMany();
    const allSkills = await prisma.skill.findMany();
    const specialtyByCode = Object.fromEntries(allSpecialties.map((s) => [s.code, s]));
    const skillByName = Object.fromEntries(allSkills.map((s) => [s.name, s]));
    console.log(`  ✓ ${allSpecialties.length} specialties, ${allSkills.length} skills ready\n`);

    // ── STEP 2: Institutions ────────────────────────────────────────────
    console.log('🏥 Step 2: Creating institutions...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const institutionById: Record<string, string> = {}; // name → id

    for (const inst of INSTITUTIONS) {
      try {
        let user = await prisma.user.findUnique({ where: { email: inst.adminEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: { email: inst.adminEmail, passwordHash, role: UserRole.INSTITUTION_ADMIN, isVerified: true },
          });
        }

        let institution = await prisma.institution.findFirst({ where: { name: inst.name } });
        if (!institution) {
          institution = await prisma.institution.create({
            data: {
              adminUserId: user.id,
              name: inst.name,
              type: inst.type,
              cnpj: inst.cnpj,
              city: inst.city,
              state: inst.state,
              latitude: inst.latitude,
              longitude: inst.longitude,
              description: inst.description,
              website: inst.website,
              phone: inst.phone,
              email: inst.email,
              isVerified: true,
            },
          });
          console.log(`  ✓ ${inst.name}`);
        } else {
          console.log(`  ~ ${inst.name} (already exists)`);
        }
        institutionById[inst.name] = institution.id;

        // Sync to Neo4j
        await neo4jSession.run(
          `MERGE (i:Institution {pgId: $id})
           SET i.name = $name, i.type = $type, i.city = $city, i.state = $state,
               i.latitude = $lat, i.longitude = $lng`,
          { id: institution.id, name: inst.name, type: inst.type, city: inst.city, state: inst.state, lat: inst.latitude, lng: inst.longitude },
        );
      } catch (e: any) {
        console.log(`  ✗ ${inst.name}: ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  Total: ${Object.keys(institutionById).length} institutions ready\n`);

    // ── STEP 3: Doctors ─────────────────────────────────────────────────
    console.log('👩‍⚕️ Step 3: Creating doctors...');
    const createdDoctors: Array<{ id: string; userId: string; fullName: string; email: string }> = [];

    for (const doc of DOCTORS) {
      const existing = await prisma.user.findUnique({ where: { email: doc.email } });
      if (existing) {
        const existingDoctor = await prisma.doctor.findUnique({ where: { userId: existing.id } });
        if (existingDoctor) {
          createdDoctors.push({ id: existingDoctor.id, userId: existing.id, fullName: doc.fullName, email: doc.email });
          console.log(`  ~ ${doc.fullName} (already exists)`);
          continue;
        }
      }

      try {
        const user = await prisma.user.create({
          data: { email: doc.email, passwordHash, role: UserRole.DOCTOR, isVerified: true },
        });

        const doctor = await prisma.doctor.create({
          data: {
            userId: user.id,
            fullName: doc.fullName,
            crm: doc.crm,
            crmState: doc.crmState,
            crmVerified: true,
            phone: doc.phone,
            bio: doc.bio,
            city: doc.city,
            state: doc.state,
            latitude: doc.latitude,
            longitude: doc.longitude,
            graduationYear: doc.graduationYear,
            universityName: doc.universityName,
            profilePicUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doc.fullName)}`,
          },
        });

        for (const code of doc.specialtyCodes) {
          const specialty = specialtyByCode[code];
          if (specialty) {
            await prisma.doctorSpecialty.upsert({
              where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: specialty.id } },
              update: {},
              create: { doctorId: doctor.id, specialtyId: specialty.id, isPrimary: true },
            });
          }
        }

        for (const skillName of doc.skillNames) {
          const skill = skillByName[skillName];
          if (skill) {
            await prisma.doctorSkill.upsert({
              where: { doctorId_skillId: { doctorId: doctor.id, skillId: skill.id } },
              update: {},
              create: { doctorId: doctor.id, skillId: skill.id },
            });
          }
        }

        createdDoctors.push({ id: doctor.id, userId: user.id, fullName: doc.fullName, email: doc.email });
        console.log(`  ✓ ${doc.fullName} (${doc.email})`);
      } catch (e: any) {
        console.log(`  ✗ ${doc.fullName}: ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  Total: ${createdDoctors.length} doctors ready\n`);

    // ── STEP 4: Sync doctors to Neo4j ───────────────────────────────────
    console.log('🔵 Step 4: Syncing doctors to Neo4j...');
    const doctorsToSync = await prisma.doctor.findMany({
      include: { user: true, specialties: { include: { specialty: true } }, skills: { include: { skill: true } } },
    });

    for (const doc of doctorsToSync) {
      try {
        await neo4jSession.run(
          `MERGE (d:Doctor {pgId: $id})
           SET d.fullName = $fullName, d.email = $email, d.city = $city,
               d.state = $state, d.crmVerified = $crmVerified`,
          { id: doc.id, fullName: doc.fullName, email: doc.user.email, city: doc.city || '', state: doc.state || '', crmVerified: doc.crmVerified },
        );

        for (const ds of doc.specialties) {
          await neo4jSession.run(
            `MERGE (s:Specialty {pgId: $specId})
             SET s.name = $specName, s.code = $specCode
             WITH s
             MATCH (d:Doctor {pgId: $doctorId})
             MERGE (d)-[:SPECIALIZES_IN]->(s)`,
            { specId: ds.specialty.id, specName: ds.specialty.name, specCode: ds.specialty.code, doctorId: doc.id },
          );
        }

        for (const ds of doc.skills) {
          await neo4jSession.run(
            `MERGE (sk:Skill {pgId: $skillId})
             SET sk.name = $skillName
             WITH sk
             MATCH (d:Doctor {pgId: $doctorId})
             MERGE (d)-[:HAS_SKILL]->(sk)`,
            { skillId: ds.skill.id, skillName: ds.skill.name, doctorId: doc.id },
          );
        }

        if (doc.city && doc.state) {
          await neo4jSession.run(
            `MERGE (city:City {name: $city, state: $state})
             WITH city
             MATCH (d:Doctor {pgId: $doctorId})
             MERGE (d)-[:LOCATED_IN]->(city)`,
            { city: doc.city, state: doc.state, doctorId: doc.id },
          );
        }
      } catch (e: any) {
        console.log(`  ✗ Neo4j sync ${doc.fullName}: ${e.message?.substring(0, 60)}`);
      }
    }
    console.log(`  ✓ ${doctorsToSync.length} doctors synced\n`);

    // ── STEP 5: Workplaces (Doctor → Institution) ───────────────────────
    console.log('🔗 Step 5: Creating workplaces...');
    // Build index of doctors
    const demoDoctors: Array<{ id: string }> = [];
    for (const docData of DOCTORS) {
      const user = await prisma.user.findUnique({ where: { email: docData.email } });
      if (user) {
        const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
        demoDoctors.push(doctor ? doctor : { id: '' });
      } else {
        demoDoctors.push({ id: '' });
      }
    }

    let workplaces = 0;
    for (const { doctorIdx, instName } of WORKPLACE_ASSIGNMENTS) {
      const doctorId = demoDoctors[doctorIdx]?.id;
      const instId = institutionById[instName];
      if (!doctorId || !instId) continue;

      const inst = await prisma.institution.findUnique({ where: { id: instId } });
      if (!inst) continue;

      try {
        const existing = await prisma.doctorWorkplace.findFirst({ where: { doctorId, name: inst.name } });
        if (!existing) {
          await prisma.doctorWorkplace.create({
            data: { doctorId, name: inst.name, city: inst.city, state: inst.state, latitude: inst.latitude ?? -23.5505, longitude: inst.longitude ?? -46.6333, isActive: true },
          });
          await neo4jSession.run(
            `MATCH (d:Doctor {pgId: $doctorId}), (i:Institution {pgId: $instId})
             MERGE (d)-[:WORKS_AT]->(i)`,
            { doctorId, instId: inst.id },
          );
          workplaces++;
        }
      } catch { /* ignore */ }
    }
    console.log(`  ✓ ${workplaces} workplaces created\n`);

    // ── STEP 6: Connections ─────────────────────────────────────────────
    console.log('🔗 Step 6: Creating doctor connections...');
    let pgConnections = 0;
    let neo4jConnections = 0;

    for (const [aIdx, bIdx] of CONNECTION_PAIRS) {
      const aId = demoDoctors[aIdx]?.id;
      const bId = demoDoctors[bIdx]?.id;
      if (!aId || !bId) continue;

      try {
        const existing = await prisma.connectionRequest.findUnique({ where: { senderId_receiverId: { senderId: aId, receiverId: bId } } });
        if (!existing) { await prisma.connectionRequest.create({ data: { senderId: aId, receiverId: bId, status: ConnectionStatus.ACCEPTED } }); pgConnections++; }
        const existingR = await prisma.connectionRequest.findUnique({ where: { senderId_receiverId: { senderId: bId, receiverId: aId } } });
        if (!existingR) { await prisma.connectionRequest.create({ data: { senderId: bId, receiverId: aId, status: ConnectionStatus.ACCEPTED } }); }
      } catch { /* ignore */ }

      try {
        await neo4jSession.run(
          `MATCH (a:Doctor {pgId: $aId}), (b:Doctor {pgId: $bId})
           MERGE (a)-[:CONNECTED_TO]->(b) MERGE (b)-[:CONNECTED_TO]->(a)`,
          { aId, bId },
        );
        neo4jConnections++;
      } catch { /* ignore */ }
    }
    console.log(`  ✓ ${pgConnections} connections (PG), ${neo4jConnections} CONNECTED_TO (Neo4j)\n`);

    // ── STEP 7: Jobs ────────────────────────────────────────────────────
    console.log('💼 Step 7: Creating jobs...');
    let jobsCreated = 0;

    for (const job of JOBS_DATA) {
      const instId = institutionById[job.instName];
      const specialty = job.specCode ? specialtyByCode[job.specCode] : null;
      if (!instId) { console.log(`  ✗ Institution not found: ${job.instName}`); continue; }

      try {
        const existing = await prisma.job.findFirst({ where: { title: job.title, institutionId: instId } });
        if (!existing) {
          const created = await prisma.job.create({
            data: {
              institutionId: instId,
              specialtyId: specialty?.id,
              title: job.title,
              type: job.type,
              shift: job.shift,
              city: job.city,
              state: job.state,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              description: job.description,
              requirements: job.requirements,
              isActive: true,
              startsAt: addDays(now, 7),
              expiresAt: addDays(now, 90),
            },
          });

          // Sync to Neo4j
          await neo4jSession.run(
            `MERGE (j:Job {pgId: $id})
             SET j.title = $title, j.type = $type, j.city = $city, j.state = $state, j.isActive = true
             WITH j
             MATCH (i:Institution {pgId: $instId})
             MERGE (i)-[:POSTED]->(j)`,
            { id: created.id, title: job.title, type: job.type, city: job.city, state: job.state, instId },
          );

          if (specialty) {
            await neo4jSession.run(
              `MATCH (j:Job {pgId: $jobId}), (s:Specialty {pgId: $specId})
               MERGE (j)-[:REQUIRES]->(s)`,
              { jobId: created.id, specId: specialty.id },
            );
          }

          jobsCreated++;
        }
      } catch (e: any) {
        console.log(`  ✗ ${job.title}: ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  ✓ ${jobsCreated} jobs created\n`);

    // ── STEP 8: Events ──────────────────────────────────────────────────
    console.log('📅 Step 8: Creating events...');
    let eventsCreated = 0;

    for (const evt of EVENTS_DATA) {
      const instId = institutionById[evt.instName];
      if (!instId) continue;

      try {
        const existing = await prisma.event.findFirst({ where: { title: evt.title } });
        if (existing) { console.log(`  ~ ${evt.title} (already exists)`); continue; }

        const created = await prisma.event.create({
          data: {
            organizerId: instId,
            title: evt.title,
            eventType: evt.eventType,
            status: EventStatus.UPCOMING,
            startDate: evt.startDate,
            endDate: evt.endDate,
            location: evt.location,
            isOnline: evt.isOnline,
            isFree: evt.isFree,
            price: evt.price,
            maxAttendees: evt.maxAttendees,
            description: evt.description,
          },
        });

        // Add speakers
        for (const email of evt.speakerEmails) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) continue;
          const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
          if (!doctor) continue;
          try {
            await prisma.eventSpeaker.create({ data: { eventId: created.id, doctorId: doctor.id } });
          } catch { /* ignore duplicate */ }
        }

        // Sync to Neo4j
        await neo4jSession.run(
          `MERGE (e:Event {pgId: $id})
           SET e.title = $title, e.type = $type, e.startDate = $startDate,
               e.isOnline = $isOnline, e.isFree = $isFree
           WITH e
           MATCH (i:Institution {pgId: $instId})
           MERGE (i)-[:ORGANIZES]->(e)`,
          { id: created.id, title: evt.title, type: evt.eventType, startDate: evt.startDate.toISOString(), isOnline: evt.isOnline, isFree: evt.isFree, instId },
        );

        // Connect speakers to event in Neo4j
        for (const email of evt.speakerEmails) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) continue;
          const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
          if (!doctor) continue;
          try {
            await neo4jSession.run(
              `MATCH (d:Doctor {pgId: $doctorId}), (e:Event {pgId: $eventId})
               MERGE (d)-[:SPEAKS_AT]->(e)`,
              { doctorId: doctor.id, eventId: created.id },
            );
          } catch { /* ignore */ }
        }

        eventsCreated++;
        console.log(`  ✓ ${evt.title}`);
      } catch (e: any) {
        console.log(`  ✗ ${evt.title}: ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  ✓ ${eventsCreated} events created\n`);

    // ── STEP 9: Graph statistics ────────────────────────────────────────
    console.log('📊 Step 9: Final graph statistics...\n');
    try {
      const stats = await neo4jSession.run(`
        MATCH (d:Doctor) WITH count(d) AS doctors
        OPTIONAL MATCH (s:Specialty) WITH doctors, count(s) AS specialties
        OPTIONAL MATCH (i:Institution) WITH doctors, specialties, count(i) AS institutions
        OPTIONAL MATCH (j:Job) WITH doctors, specialties, institutions, count(j) AS jobs
        OPTIONAL MATCH (e:Event) WITH doctors, specialties, institutions, jobs, count(e) AS events
        OPTIONAL MATCH ()-[c:CONNECTED_TO]->() WITH doctors, specialties, institutions, jobs, events, count(c) AS connections
        OPTIONAL MATCH ()-[sp:SPECIALIZES_IN]->() WITH doctors, specialties, institutions, jobs, events, connections, count(sp) AS specRels
        OPTIONAL MATCH ()-[w:WORKS_AT]->() WITH doctors, specialties, institutions, jobs, events, connections, specRels, count(w) AS worksAt
        OPTIONAL MATCH ()-[p:POSTED]->() WITH doctors, specialties, institutions, jobs, events, connections, specRels, worksAt, count(p) AS posted
        RETURN doctors, specialties, institutions, jobs, events, connections, specRels, worksAt, posted
      `);
      const r = stats.records[0];
      console.log(`  ┌─────────────────────────────────────┐`);
      console.log(`  │  Neo4j Graph Stats                  │`);
      console.log(`  ├─────────────────────────────────────┤`);
      console.log(`  │  Doctors:           ${String(r.get('doctors')).padEnd(16)}│`);
      console.log(`  │  Specialties:       ${String(r.get('specialties')).padEnd(16)}│`);
      console.log(`  │  Institutions:      ${String(r.get('institutions')).padEnd(16)}│`);
      console.log(`  │  Jobs:              ${String(r.get('jobs')).padEnd(16)}│`);
      console.log(`  │  Events:            ${String(r.get('events')).padEnd(16)}│`);
      console.log(`  │  CONNECTED_TO:      ${String(r.get('connections')).padEnd(16)}│`);
      console.log(`  │  SPECIALIZES_IN:    ${String(r.get('specRels')).padEnd(16)}│`);
      console.log(`  │  WORKS_AT:          ${String(r.get('worksAt')).padEnd(16)}│`);
      console.log(`  │  POSTED:            ${String(r.get('posted')).padEnd(16)}│`);
      console.log(`  └─────────────────────────────────────┘`);
    } catch (e: any) {
      console.log(`  Stats query failed: ${e.message}`);
    }

    console.log('\n✅ Master seed complete!');
    console.log(`\nDemo credentials:`);
    console.log(`  Doctor:      ana.silva@medconnect.dev / ${DEMO_PASSWORD}`);
    console.log(`  Institution: admin.einstein@medconnect.dev / ${DEMO_PASSWORD}\n`);
  } finally {
    await neo4jSession.close();
    await driver.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
