/**
 * Graph Showcase Seed — 35 additional doctors with dense Neo4j relationships.
 *
 * Creates doctors across 12 Brazilian cities, connects them to existing
 * 15 demo doctors, and builds a rich graph with:
 *   - CONNECTED_TO (peer connections)
 *   - SPECIALIZES_IN (specialty links)
 *   - HAS_SKILL (skill links)
 *   - WORKS_AT (institution links)
 *   - LOCATED_IN (city links)
 *
 * Run with: npm run seed:showcase
 */
import { PrismaClient, UserRole, ConnectionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'medconnect_dev_2026';

const DEMO_PASSWORD = 'MedConnect@2026';

// ─── 35 New Doctors ─────────────────────────────────────────────────────────

const NEW_DOCTORS = [
  // São Paulo (7)
  {
    email: 'carlos.yamamoto@medconnect.dev',
    fullName: 'Dr. Carlos Yamamoto',
    crm: '600001', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5614, longitude: -46.6560,
    graduationYear: 2009, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99002-0001',
    bio: 'Cirurgião geral com foco em cirurgia do aparelho digestivo. Membro titular do CBC.',
    specialtyCodes: ['CIRGERAL'],
    skillNames: ['Cirurgia Laparoscópica', 'Cirurgia Robótica', 'Endoscopia'],
  },
  {
    email: 'renata.bastos@medconnect.dev',
    fullName: 'Dra. Renata Bastos Figueiredo',
    crm: '600002', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5500, longitude: -46.6340,
    graduationYear: 2013, universityName: 'UNIFESP — Universidade Federal de São Paulo',
    phone: '(11) 99002-0002',
    bio: 'Nefrologista com experiência em transplante renal e diálise peritoneal.',
    specialtyCodes: ['NEFRO'],
    skillNames: ['Hemodiálise', 'Ultrassonografia', 'Pesquisa Clínica'],
  },
  {
    email: 'marcos.teixeira@medconnect.dev',
    fullName: 'Dr. Marcos Antônio Teixeira',
    crm: '600003', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5445, longitude: -46.6290,
    graduationYear: 2007, universityName: 'UNICAMP — Universidade Estadual de Campinas',
    phone: '(11) 99002-0003',
    bio: 'Radiologista intervencionista com expertise em embolização e drenagens percutâneas.',
    specialtyCodes: ['RADIO'],
    skillNames: ['Ultrassonografia', 'Ressonância Magnética', 'Tomografia Computadorizada'],
  },
  {
    email: 'larissa.campos@medconnect.dev',
    fullName: 'Dra. Larissa Campos Duarte',
    crm: '600004', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5580, longitude: -46.6620,
    graduationYear: 2016, universityName: 'Santa Casa de São Paulo',
    phone: '(11) 99002-0004',
    bio: 'Hematologista com foco em doenças linfoproliferativas e transplante de medula óssea.',
    specialtyCodes: ['HEMATO'],
    skillNames: ['Quimioterapia', 'Pesquisa Clínica', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'diego.machado@medconnect.dev',
    fullName: 'Dr. Diego Machado Ramos',
    crm: '600005', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5700, longitude: -46.6900,
    graduationYear: 2011, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99002-0005',
    bio: 'Urologista com subespecialização em uro-oncologia e cirurgia robótica.',
    specialtyCodes: ['URO'],
    skillNames: ['Cirurgia Robótica', 'Cirurgia Laparoscópica'],
  },
  {
    email: 'aline.nascimento@medconnect.dev',
    fullName: 'Dra. Aline Nascimento Borges',
    crm: '600006', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5330, longitude: -46.6250,
    graduationYear: 2014, universityName: 'UNIFESP — Universidade Federal de São Paulo',
    phone: '(11) 99002-0006',
    bio: 'Oftalmologista especializada em retina e vítreo. Experiência em injeções intravítreas.',
    specialtyCodes: ['OFTALMO'],
    skillNames: ['Cirurgia Laparoscópica', 'Ultrassonografia'],
  },
  {
    email: 'henrique.azevedo@medconnect.dev',
    fullName: 'Dr. Henrique Azevedo Lima',
    crm: '600007', crmState: 'SP',
    city: 'São Paulo', state: 'SP', latitude: -23.5550, longitude: -46.6700,
    graduationYear: 2008, universityName: 'USP — Universidade de São Paulo',
    phone: '(11) 99002-0007',
    bio: 'Anestesiologista com atuação em anestesia cardiovascular e dor crônica.',
    specialtyCodes: ['ANEST'],
    skillNames: ['Ventilação Mecânica', 'Suporte Avançado de Vida'],
  },
  // Rio de Janeiro (5)
  {
    email: 'priscila.monteiro@medconnect.dev',
    fullName: 'Dra. Priscila Monteiro Braga',
    crm: '600008', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9100, longitude: -43.1800,
    graduationYear: 2012, universityName: 'UFRJ — Universidade Federal do Rio de Janeiro',
    phone: '(21) 99002-0008',
    bio: 'Cardiologista com foco em arritmias e eletrofisiologia cardíaca.',
    specialtyCodes: ['CARDIO'],
    skillNames: ['Eletrocardiograma', 'Ecocardiograma', 'Marca-passo'],
  },
  {
    email: 'vinicius.gomes@medconnect.dev',
    fullName: 'Dr. Vinícius Gomes Faria',
    crm: '600009', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9150, longitude: -43.1750,
    graduationYear: 2010, universityName: 'UERJ — Universidade do Estado do Rio de Janeiro',
    phone: '(21) 99002-0009',
    bio: 'Cirurgião plástico com especialização em microcirurgia reconstrutiva e queimados.',
    specialtyCodes: ['CIRPLAS'],
    skillNames: ['Cirurgia Laparoscópica', 'Cirurgia Robótica'],
  },
  {
    email: 'tatiana.araujo@medconnect.dev',
    fullName: 'Dra. Tatiana Araújo Pires',
    crm: '600010', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9200, longitude: -43.1900,
    graduationYear: 2015, universityName: 'PUC-Rio — Pontifícia Universidade Católica do Rio',
    phone: '(21) 99002-0010',
    bio: 'Pediatra com atuação em emergência pediátrica e medicina do adolescente.',
    specialtyCodes: ['PED'],
    skillNames: ['Suporte Avançado de Vida', 'Telemedicina'],
  },
  {
    email: 'felipe.correia@medconnect.dev',
    fullName: 'Dr. Felipe Correia Neto',
    crm: '600011', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9050, longitude: -43.1650,
    graduationYear: 2006, universityName: 'UFRJ — Universidade Federal do Rio de Janeiro',
    phone: '(21) 99002-0011',
    bio: 'Neurocirurgião com expertise em tumores cerebrais e cirurgia de coluna.',
    specialtyCodes: ['NEUROCI'],
    skillNames: ['Cirurgia Robótica', 'Ressonância Magnética'],
  },
  {
    email: 'amanda.ribeiro@medconnect.dev',
    fullName: 'Dra. Amanda Ribeiro Leal',
    crm: '600012', crmState: 'RJ',
    city: 'Rio de Janeiro', state: 'RJ', latitude: -22.9300, longitude: -43.2000,
    graduationYear: 2017, universityName: 'UFF — Universidade Federal Fluminense',
    phone: '(21) 99002-0012',
    bio: 'Médica de família com ênfase em saúde comunitária e atenção primária.',
    specialtyCodes: ['MFC'],
    skillNames: ['Telemedicina', 'Medicina Baseada em Evidências'],
  },
  // Belo Horizonte (4)
  {
    email: 'guilherme.moreira@medconnect.dev',
    fullName: 'Dr. Guilherme Moreira Castro',
    crm: '600013', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9200, longitude: -43.9400,
    graduationYear: 2011, universityName: 'UFMG — Universidade Federal de Minas Gerais',
    phone: '(31) 99002-0013',
    bio: 'Otorrinolaringologista com foco em cirurgia endoscópica nasal e implante coclear.',
    specialtyCodes: ['ORL'],
    skillNames: ['Endoscopia', 'Cirurgia Laparoscópica'],
  },
  {
    email: 'carolina.vieira@medconnect.dev',
    fullName: 'Dra. Carolina Vieira Souza',
    crm: '600014', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9250, longitude: -43.9350,
    graduationYear: 2013, universityName: 'UFMG — Universidade Federal de Minas Gerais',
    phone: '(31) 99002-0014',
    bio: 'Geriatra com foco em demências e cuidados paliativos.',
    specialtyCodes: ['GERIA'],
    skillNames: ['Telemedicina', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'ricardo.cunha@medconnect.dev',
    fullName: 'Dr. Ricardo Cunha Almeida',
    crm: '600015', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9300, longitude: -43.9500,
    graduationYear: 2009, universityName: 'UFMG — Universidade Federal de Minas Gerais',
    phone: '(31) 99002-0015',
    bio: 'Oncologista cirúrgico especialista em tumores do trato gastrointestinal.',
    specialtyCodes: ['ONCO'],
    skillNames: ['Cirurgia Laparoscópica', 'Quimioterapia', 'Pesquisa Clínica'],
  },
  {
    email: 'daniela.fonseca@medconnect.dev',
    fullName: 'Dra. Daniela Fonseca Reis',
    crm: '600016', crmState: 'MG',
    city: 'Belo Horizonte', state: 'MG', latitude: -19.9150, longitude: -43.9280,
    graduationYear: 2015, universityName: 'PUC Minas',
    phone: '(31) 99002-0016',
    bio: 'Endocrinologista pediátrica com foco em distúrbios do crescimento e puberdade precoce.',
    specialtyCodes: ['ENDO'],
    skillNames: ['Pesquisa Clínica', 'Telemedicina'],
  },
  // Porto Alegre (3)
  {
    email: 'bruno.scherer@medconnect.dev',
    fullName: 'Dr. Bruno Scherer Fontana',
    crm: '600017', crmState: 'RS',
    city: 'Porto Alegre', state: 'RS', latitude: -30.0300, longitude: -51.2100,
    graduationYear: 2010, universityName: 'UFRGS — Universidade Federal do Rio Grande do Sul',
    phone: '(51) 99002-0017',
    bio: 'Cirurgião torácico com experiência em videotoracoscopia e transplante pulmonar.',
    specialtyCodes: ['CIRTORA'],
    skillNames: ['Cirurgia Laparoscópica', 'Ventilação Mecânica', 'Broncoscopia'],
  },
  {
    email: 'juliana.weber@medconnect.dev',
    fullName: 'Dra. Juliana Weber Müller',
    crm: '600018', crmState: 'RS',
    city: 'Porto Alegre', state: 'RS', latitude: -30.0280, longitude: -51.2050,
    graduationYear: 2014, universityName: 'PUC-RS — Pontifícia Universidade Católica do RS',
    phone: '(51) 99002-0018',
    bio: 'Reumatologista com pesquisa em espondiloartrites e artrite psoriásica.',
    specialtyCodes: ['REUMA'],
    skillNames: ['Pesquisa Clínica', 'Medicina Baseada em Evidências', 'Ultrassonografia'],
  },
  {
    email: 'gustavo.becker@medconnect.dev',
    fullName: 'Dr. Gustavo Becker Silveira',
    crm: '600019', crmState: 'RS',
    city: 'Porto Alegre', state: 'RS', latitude: -30.0350, longitude: -51.2200,
    graduationYear: 2008, universityName: 'UFRGS — Universidade Federal do Rio Grande do Sul',
    phone: '(51) 99002-0019',
    bio: 'Psiquiatra com foco em dependência química e psicofarmacologia.',
    specialtyCodes: ['PSIQ'],
    skillNames: ['Telemedicina', 'Pesquisa Clínica'],
  },
  // Salvador (3)
  {
    email: 'lucas.sacramento@medconnect.dev',
    fullName: 'Dr. Lucas Sacramento Dias',
    crm: '600020', crmState: 'BA',
    city: 'Salvador', state: 'BA', latitude: -12.9750, longitude: -38.5100,
    graduationYear: 2012, universityName: 'UFBA — Universidade Federal da Bahia',
    phone: '(71) 99002-0020',
    bio: 'Infectologista especialista em doenças tropicais negligenciadas e medicina do viajante.',
    specialtyCodes: ['INFEC'],
    skillNames: ['Pesquisa Clínica', 'Telemedicina', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'natalia.jesus@medconnect.dev',
    fullName: 'Dra. Natália de Jesus Santos',
    crm: '600021', crmState: 'BA',
    city: 'Salvador', state: 'BA', latitude: -12.9800, longitude: -38.5050,
    graduationYear: 2016, universityName: 'UFBA — Universidade Federal da Bahia',
    phone: '(71) 99002-0021',
    bio: 'Dermatologista com atuação em dermatologia étnica e laser dermatológico.',
    specialtyCodes: ['DERMA'],
    skillNames: ['Pesquisa Clínica'],
  },
  {
    email: 'rafael.conceicao@medconnect.dev',
    fullName: 'Dr. Rafael da Conceição Lima',
    crm: '600022', crmState: 'BA',
    city: 'Salvador', state: 'BA', latitude: -12.9680, longitude: -38.4950,
    graduationYear: 2007, universityName: 'Escola Bahiana de Medicina',
    phone: '(71) 99002-0022',
    bio: 'Ortopedista com especialização em cirurgia de mão e microcirurgia.',
    specialtyCodes: ['ORTO'],
    skillNames: ['Cirurgia Laparoscópica'],
  },
  // Curitiba (3)
  {
    email: 'patricia.kowalski@medconnect.dev',
    fullName: 'Dra. Patrícia Kowalski Fernandes',
    crm: '600023', crmState: 'PR',
    city: 'Curitiba', state: 'PR', latitude: -25.4300, longitude: -49.2700,
    graduationYear: 2011, universityName: 'UFPR — Universidade Federal do Paraná',
    phone: '(41) 99002-0023',
    bio: 'Gastroenterologista com foco em hepatologia e doenças inflamatórias intestinais.',
    specialtyCodes: ['GASTRO'],
    skillNames: ['Endoscopia', 'Colonoscopia', 'Ultrassonografia'],
  },
  {
    email: 'anderson.oliveira@medconnect.dev',
    fullName: 'Dr. Anderson de Oliveira Prado',
    crm: '600024', crmState: 'PR',
    city: 'Curitiba', state: 'PR', latitude: -25.4350, longitude: -49.2800,
    graduationYear: 2013, universityName: 'PUC-PR — Pontifícia Universidade Católica do Paraná',
    phone: '(41) 99002-0024',
    bio: 'Cardiologista com interesse em imagem cardiovascular e tomografia cardíaca.',
    specialtyCodes: ['CARDIO'],
    skillNames: ['Ecocardiograma', 'Eletrocardiograma', 'Tomografia Computadorizada'],
  },
  {
    email: 'marcia.santos@medconnect.dev',
    fullName: 'Dra. Márcia Santos Gonçalves',
    crm: '600025', crmState: 'PR',
    city: 'Curitiba', state: 'PR', latitude: -25.4250, longitude: -49.2650,
    graduationYear: 2009, universityName: 'UFPR — Universidade Federal do Paraná',
    phone: '(41) 99002-0025',
    bio: 'Neurologista com foco em esclerose múltipla e doenças desmielinizantes.',
    specialtyCodes: ['NEURO'],
    skillNames: ['Ressonância Magnética', 'Pesquisa Clínica', 'Telemedicina'],
  },
  // Brasília (3)
  {
    email: 'rodrigo.amaral@medconnect.dev',
    fullName: 'Dr. Rodrigo Amaral Barros',
    crm: '600026', crmState: 'DF',
    city: 'Brasília', state: 'DF', latitude: -15.7830, longitude: -47.9300,
    graduationYear: 2010, universityName: 'UnB — Universidade de Brasília',
    phone: '(61) 99002-0026',
    bio: 'Médico intensivista com expertise em ECMO e suporte circulatório mecânico.',
    specialtyCodes: ['UTI'],
    skillNames: ['Ventilação Mecânica', 'Suporte Avançado de Vida', 'Hemodiálise'],
  },
  {
    email: 'cintia.lago@medconnect.dev',
    fullName: 'Dra. Cíntia Lago Ferreira',
    crm: '600027', crmState: 'DF',
    city: 'Brasília', state: 'DF', latitude: -15.7850, longitude: -47.9250,
    graduationYear: 2014, universityName: 'UnB — Universidade de Brasília',
    phone: '(61) 99002-0027',
    bio: 'Ginecologista com foco em reprodução humana e endometriose profunda.',
    specialtyCodes: ['GINOBS'],
    skillNames: ['Ultrassonografia', 'Cirurgia Laparoscópica', 'Cirurgia Robótica'],
  },
  {
    email: 'leonardo.santana@medconnect.dev',
    fullName: 'Dr. Leonardo Santana Reis',
    crm: '600028', crmState: 'DF',
    city: 'Brasília', state: 'DF', latitude: -15.7900, longitude: -47.9350,
    graduationYear: 2006, universityName: 'ESCS — Escola Superior de Ciências da Saúde',
    phone: '(61) 99002-0028',
    bio: 'Pneumologista com atuação em pneumologia pediátrica e fibrose cística.',
    specialtyCodes: ['PNEUMO'],
    skillNames: ['Broncoscopia', 'Ventilação Mecânica', 'Telemedicina'],
  },
  // Recife (2)
  {
    email: 'fabiana.lopes@medconnect.dev',
    fullName: 'Dra. Fabiana Lopes de Souza',
    crm: '600029', crmState: 'PE',
    city: 'Recife', state: 'PE', latitude: -8.0476, longitude: -34.8770,
    graduationYear: 2012, universityName: 'UFPE — Universidade Federal de Pernambuco',
    phone: '(81) 99002-0029',
    bio: 'Oncologista clínica com foco em tumores de mama e ginecológicos.',
    specialtyCodes: ['ONCO'],
    skillNames: ['Quimioterapia', 'Pesquisa Clínica', 'Medicina Baseada em Evidências'],
  },
  {
    email: 'thales.cavalcanti@medconnect.dev',
    fullName: 'Dr. Thales Cavalcanti Melo',
    crm: '600030', crmState: 'PE',
    city: 'Recife', state: 'PE', latitude: -8.0500, longitude: -34.8800,
    graduationYear: 2008, universityName: 'UFPE — Universidade Federal de Pernambuco',
    phone: '(81) 99002-0030',
    bio: 'Cirurgião cardiovascular com experiência em TAVI e cirurgias minimamente invasivas.',
    specialtyCodes: ['CIRCARDIO'],
    skillNames: ['Cirurgia Robótica', 'Cateterismo Cardíaco', 'Angioplastia'],
  },
  // Fortaleza (2)
  {
    email: 'vanessa.pinheiro@medconnect.dev',
    fullName: 'Dra. Vanessa Pinheiro Costa',
    crm: '600031', crmState: 'CE',
    city: 'Fortaleza', state: 'CE', latitude: -3.7172, longitude: -38.5433,
    graduationYear: 2015, universityName: 'UFC — Universidade Federal do Ceará',
    phone: '(85) 99002-0031',
    bio: 'Endocrinologista com atuação em tireoide e metabolismo ósseo.',
    specialtyCodes: ['ENDO'],
    skillNames: ['Ultrassonografia', 'Telemedicina', 'Pesquisa Clínica'],
  },
  {
    email: 'joao.nogueira@medconnect.dev',
    fullName: 'Dr. João Pedro Nogueira',
    crm: '600032', crmState: 'CE',
    city: 'Fortaleza', state: 'CE', latitude: -3.7200, longitude: -38.5400,
    graduationYear: 2011, universityName: 'UFC — Universidade Federal do Ceará',
    phone: '(85) 99002-0032',
    bio: 'Nefrologista com foco em glomerulopatias e transplante renal.',
    specialtyCodes: ['NEFRO'],
    skillNames: ['Hemodiálise', 'Pesquisa Clínica'],
  },
  // Campinas (1)
  {
    email: 'simone.garcia@medconnect.dev',
    fullName: 'Dra. Simone Garcia Pimentel',
    crm: '600033', crmState: 'SP',
    city: 'Campinas', state: 'SP', latitude: -22.9099, longitude: -47.0626,
    graduationYear: 2010, universityName: 'UNICAMP — Universidade Estadual de Campinas',
    phone: '(19) 99002-0033',
    bio: 'Geneticista médica com foco em doenças raras e aconselhamento genético.',
    specialtyCodes: ['GENET'],
    skillNames: ['Pesquisa Clínica', 'Medicina Baseada em Evidências'],
  },
  // Florianópolis (1)
  {
    email: 'eduardo.zimmermann@medconnect.dev',
    fullName: 'Dr. Eduardo Zimmermann',
    crm: '600034', crmState: 'SC',
    city: 'Florianópolis', state: 'SC', latitude: -27.5954, longitude: -48.5480,
    graduationYear: 2009, universityName: 'UFSC — Universidade Federal de Santa Catarina',
    phone: '(48) 99002-0034',
    bio: 'Psiquiatra especializado em transtornos de ansiedade e TEPT. Supervisor de residência.',
    specialtyCodes: ['PSIQ'],
    skillNames: ['Telemedicina', 'Docência em Medicina'],
  },
  // Goiânia (1)
  {
    email: 'livia.rocha@medconnect.dev',
    fullName: 'Dra. Lívia Rocha Mendonça',
    crm: '600035', crmState: 'GO',
    city: 'Goiânia', state: 'GO', latitude: -16.6869, longitude: -49.2648,
    graduationYear: 2013, universityName: 'UFG — Universidade Federal de Goiás',
    phone: '(62) 99002-0035',
    bio: 'Pediatra com subespecialização em alergia e imunologia infantil.',
    specialtyCodes: ['PED'],
    skillNames: ['Telemedicina', 'Pesquisa Clínica'],
  },
];

// ─── Connections: new doctors ↔ existing (15) + inter-new ─────────────────

// Emails of existing 15 doctors from seed-master
const EXISTING_EMAILS = [
  'ana.silva@medconnect.dev',         // 0  Cardio SP
  'rafael.costa@medconnect.dev',      // 1  Neuro SP
  'mariana.oliveira@medconnect.dev',   // 2  Onco RJ
  'pedro.santos@medconnect.dev',      // 3  Orto SP
  'fernanda.lima@medconnect.dev',      // 4  Endo MG
  'lucas.pereira@medconnect.dev',      // 5  Infecto RS
  'camila.souza@medconnect.dev',       // 6  Psiq SP
  'gabriel.ferreira@medconnect.dev',   // 7  Gastro SP
  'julia.mendes@medconnect.dev',       // 8  GinObs RJ
  'thiago.barbosa@medconnect.dev',     // 9  UTI BA
  'beatriz.alves@medconnect.dev',      // 10 Derma PR
  'rodrigo.tavares@medconnect.dev',    // 11 CirCardio SP
  'isabela.franco@medconnect.dev',     // 12 Ped SP
  'andre.pinto@medconnect.dev',        // 13 Pneumo MG
  'patricia.moura@medconnect.dev',     // 14 Reuma DF
];

// Cross-connections: [new doctor email, existing doctor email]
const CROSS_CONNECTIONS: [string, string][] = [
  // SP new ↔ SP existing
  ['carlos.yamamoto@medconnect.dev', 'ana.silva@medconnect.dev'],
  ['carlos.yamamoto@medconnect.dev', 'gabriel.ferreira@medconnect.dev'],
  ['renata.bastos@medconnect.dev', 'ana.silva@medconnect.dev'],
  ['renata.bastos@medconnect.dev', 'fernanda.lima@medconnect.dev'],
  ['marcos.teixeira@medconnect.dev', 'rafael.costa@medconnect.dev'],
  ['marcos.teixeira@medconnect.dev', 'rodrigo.tavares@medconnect.dev'],
  ['larissa.campos@medconnect.dev', 'mariana.oliveira@medconnect.dev'],
  ['larissa.campos@medconnect.dev', 'isabela.franco@medconnect.dev'],
  ['diego.machado@medconnect.dev', 'pedro.santos@medconnect.dev'],
  ['diego.machado@medconnect.dev', 'rodrigo.tavares@medconnect.dev'],
  ['aline.nascimento@medconnect.dev', 'camila.souza@medconnect.dev'],
  ['henrique.azevedo@medconnect.dev', 'ana.silva@medconnect.dev'],
  ['henrique.azevedo@medconnect.dev', 'rodrigo.tavares@medconnect.dev'],
  // RJ new ↔ RJ existing
  ['priscila.monteiro@medconnect.dev', 'mariana.oliveira@medconnect.dev'],
  ['priscila.monteiro@medconnect.dev', 'julia.mendes@medconnect.dev'],
  ['vinicius.gomes@medconnect.dev', 'julia.mendes@medconnect.dev'],
  ['tatiana.araujo@medconnect.dev', 'mariana.oliveira@medconnect.dev'],
  ['felipe.correia@medconnect.dev', 'rafael.costa@medconnect.dev'],
  ['amanda.ribeiro@medconnect.dev', 'julia.mendes@medconnect.dev'],
  // MG new ↔ MG existing
  ['guilherme.moreira@medconnect.dev', 'fernanda.lima@medconnect.dev'],
  ['guilherme.moreira@medconnect.dev', 'andre.pinto@medconnect.dev'],
  ['carolina.vieira@medconnect.dev', 'fernanda.lima@medconnect.dev'],
  ['ricardo.cunha@medconnect.dev', 'mariana.oliveira@medconnect.dev'],
  ['ricardo.cunha@medconnect.dev', 'andre.pinto@medconnect.dev'],
  ['daniela.fonseca@medconnect.dev', 'fernanda.lima@medconnect.dev'],
  // RS new ↔ RS existing
  ['bruno.scherer@medconnect.dev', 'lucas.pereira@medconnect.dev'],
  ['bruno.scherer@medconnect.dev', 'andre.pinto@medconnect.dev'],
  ['juliana.weber@medconnect.dev', 'patricia.moura@medconnect.dev'],
  ['juliana.weber@medconnect.dev', 'lucas.pereira@medconnect.dev'],
  ['gustavo.becker@medconnect.dev', 'camila.souza@medconnect.dev'],
  // BA new ↔ BA existing
  ['lucas.sacramento@medconnect.dev', 'thiago.barbosa@medconnect.dev'],
  ['lucas.sacramento@medconnect.dev', 'lucas.pereira@medconnect.dev'],
  ['natalia.jesus@medconnect.dev', 'beatriz.alves@medconnect.dev'],
  ['rafael.conceicao@medconnect.dev', 'pedro.santos@medconnect.dev'],
  // PR new ↔ PR existing
  ['patricia.kowalski@medconnect.dev', 'gabriel.ferreira@medconnect.dev'],
  ['patricia.kowalski@medconnect.dev', 'beatriz.alves@medconnect.dev'],
  ['anderson.oliveira@medconnect.dev', 'ana.silva@medconnect.dev'],
  ['marcia.santos@medconnect.dev', 'rafael.costa@medconnect.dev'],
  // DF new ↔ DF existing
  ['rodrigo.amaral@medconnect.dev', 'thiago.barbosa@medconnect.dev'],
  ['rodrigo.amaral@medconnect.dev', 'patricia.moura@medconnect.dev'],
  ['cintia.lago@medconnect.dev', 'julia.mendes@medconnect.dev'],
  ['leonardo.santana@medconnect.dev', 'andre.pinto@medconnect.dev'],
  // Cross-region connections (specialty-based)
  ['priscila.monteiro@medconnect.dev', 'ana.silva@medconnect.dev'],     // Cardio RJ ↔ Cardio SP
  ['fabiana.lopes@medconnect.dev', 'mariana.oliveira@medconnect.dev'],  // Onco PE ↔ Onco RJ
  ['thales.cavalcanti@medconnect.dev', 'rodrigo.tavares@medconnect.dev'], // CirCardio PE ↔ CirCardio SP
  ['vanessa.pinheiro@medconnect.dev', 'fernanda.lima@medconnect.dev'],  // Endo CE ↔ Endo MG
  ['joao.nogueira@medconnect.dev', 'renata.bastos@medconnect.dev'],     // Nefro CE ↔ Nefro SP
  ['eduardo.zimmermann@medconnect.dev', 'camila.souza@medconnect.dev'], // Psiq SC ↔ Psiq SP
  ['livia.rocha@medconnect.dev', 'isabela.franco@medconnect.dev'],      // Ped GO ↔ Ped SP
  ['simone.garcia@medconnect.dev', 'isabela.franco@medconnect.dev'],    // Genet Campinas ↔ Ped SP
];

// Inter-new connections (among the 35 new doctors)
const INTER_NEW_CONNECTIONS: [string, string][] = [
  // Same city clusters
  ['carlos.yamamoto@medconnect.dev', 'renata.bastos@medconnect.dev'],
  ['carlos.yamamoto@medconnect.dev', 'diego.machado@medconnect.dev'],
  ['marcos.teixeira@medconnect.dev', 'henrique.azevedo@medconnect.dev'],
  ['larissa.campos@medconnect.dev', 'aline.nascimento@medconnect.dev'],
  ['priscila.monteiro@medconnect.dev', 'felipe.correia@medconnect.dev'],
  ['vinicius.gomes@medconnect.dev', 'tatiana.araujo@medconnect.dev'],
  ['amanda.ribeiro@medconnect.dev', 'priscila.monteiro@medconnect.dev'],
  ['guilherme.moreira@medconnect.dev', 'carolina.vieira@medconnect.dev'],
  ['ricardo.cunha@medconnect.dev', 'daniela.fonseca@medconnect.dev'],
  ['bruno.scherer@medconnect.dev', 'juliana.weber@medconnect.dev'],
  ['gustavo.becker@medconnect.dev', 'juliana.weber@medconnect.dev'],
  ['lucas.sacramento@medconnect.dev', 'natalia.jesus@medconnect.dev'],
  ['rafael.conceicao@medconnect.dev', 'lucas.sacramento@medconnect.dev'],
  ['patricia.kowalski@medconnect.dev', 'anderson.oliveira@medconnect.dev'],
  ['marcia.santos@medconnect.dev', 'anderson.oliveira@medconnect.dev'],
  ['rodrigo.amaral@medconnect.dev', 'cintia.lago@medconnect.dev'],
  ['leonardo.santana@medconnect.dev', 'rodrigo.amaral@medconnect.dev'],
  ['fabiana.lopes@medconnect.dev', 'thales.cavalcanti@medconnect.dev'],
  ['vanessa.pinheiro@medconnect.dev', 'joao.nogueira@medconnect.dev'],
  // Cross-city specialty links
  ['renata.bastos@medconnect.dev', 'joao.nogueira@medconnect.dev'],         // Nefro
  ['priscila.monteiro@medconnect.dev', 'anderson.oliveira@medconnect.dev'], // Cardio
  ['gustavo.becker@medconnect.dev', 'eduardo.zimmermann@medconnect.dev'],  // Psiq
  ['tatiana.araujo@medconnect.dev', 'livia.rocha@medconnect.dev'],          // Ped
  ['ricardo.cunha@medconnect.dev', 'fabiana.lopes@medconnect.dev'],         // Onco
  ['daniela.fonseca@medconnect.dev', 'vanessa.pinheiro@medconnect.dev'],   // Endo
];

// ─── Workplace assignments for new doctors ────────────────────────────────

const NEW_WORKPLACE_ASSIGNMENTS: { email: string; instName: string }[] = [
  // SP doctors → Einstein or Sírio-Libanês
  { email: 'carlos.yamamoto@medconnect.dev', instName: 'Hospital Albert Einstein' },
  { email: 'renata.bastos@medconnect.dev', instName: 'Hospital Sírio-Libanês' },
  { email: 'marcos.teixeira@medconnect.dev', instName: 'Hospital Albert Einstein' },
  { email: 'larissa.campos@medconnect.dev', instName: 'Hospital Sírio-Libanês' },
  { email: 'diego.machado@medconnect.dev', instName: 'Hospital Albert Einstein' },
  { email: 'aline.nascimento@medconnect.dev', instName: 'Hospital Sírio-Libanês' },
  { email: 'henrique.azevedo@medconnect.dev', instName: 'Hospital Albert Einstein' },
  // RJ → Copa D'Or
  { email: 'priscila.monteiro@medconnect.dev', instName: 'Hospital Copa D\'Or' },
  { email: 'vinicius.gomes@medconnect.dev', instName: 'Hospital Copa D\'Or' },
  { email: 'tatiana.araujo@medconnect.dev', instName: 'Hospital Copa D\'Or' },
  { email: 'felipe.correia@medconnect.dev', instName: 'Hospital Copa D\'Or' },
  { email: 'amanda.ribeiro@medconnect.dev', instName: 'Hospital Copa D\'Or' },
  // MG → HC-UFMG
  { email: 'guilherme.moreira@medconnect.dev', instName: 'Hospital das Clínicas UFMG' },
  { email: 'carolina.vieira@medconnect.dev', instName: 'Hospital das Clínicas UFMG' },
  { email: 'ricardo.cunha@medconnect.dev', instName: 'Hospital das Clínicas UFMG' },
  { email: 'daniela.fonseca@medconnect.dev', instName: 'Hospital das Clínicas UFMG' },
  // RS → Moinhos de Vento
  { email: 'bruno.scherer@medconnect.dev', instName: 'Hospital Moinhos de Vento' },
  { email: 'juliana.weber@medconnect.dev', instName: 'Hospital Moinhos de Vento' },
  { email: 'gustavo.becker@medconnect.dev', instName: 'Hospital Moinhos de Vento' },
  // BA → Roberto Santos
  { email: 'lucas.sacramento@medconnect.dev', instName: 'Hospital Roberto Santos' },
  { email: 'natalia.jesus@medconnect.dev', instName: 'Hospital Roberto Santos' },
  { email: 'rafael.conceicao@medconnect.dev', instName: 'Hospital Roberto Santos' },
  // PR → Evangélico
  { email: 'patricia.kowalski@medconnect.dev', instName: 'Hospital Evangélico Mackenzie' },
  { email: 'anderson.oliveira@medconnect.dev', instName: 'Hospital Evangélico Mackenzie' },
  { email: 'marcia.santos@medconnect.dev', instName: 'Hospital Evangélico Mackenzie' },
  // DF → Hospital de Base
  { email: 'rodrigo.amaral@medconnect.dev', instName: 'Hospital de Base de Brasília' },
  { email: 'cintia.lago@medconnect.dev', instName: 'Hospital de Base de Brasília' },
  { email: 'leonardo.santana@medconnect.dev', instName: 'Hospital de Base de Brasília' },
];

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MedConnect — Graph Showcase Seed (35 docs)  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    // Load lookups
    const allSpecialties = await prisma.specialty.findMany();
    const allSkills = await prisma.skill.findMany();
    const specialtyByCode = Object.fromEntries(allSpecialties.map((s) => [s.code, s]));
    const skillByName = Object.fromEntries(allSkills.map((s) => [s.name, s]));
    console.log(`Loaded ${allSpecialties.length} specialties, ${allSkills.length} skills\n`);

    // ── STEP 1: Create 35 doctors ──────────────────────────────────────
    console.log('👩‍⚕️ Step 1: Creating 35 new doctors...');
    let created = 0;
    let skipped = 0;

    for (const doc of NEW_DOCTORS) {
      const existing = await prisma.user.findUnique({ where: { email: doc.email } });
      if (existing) {
        skipped++;
        continue;
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

        // Specialties
        for (const code of doc.specialtyCodes) {
          const spec = specialtyByCode[code];
          if (spec) {
            await prisma.doctorSpecialty.upsert({
              where: { doctorId_specialtyId: { doctorId: doctor.id, specialtyId: spec.id } },
              update: {},
              create: { doctorId: doctor.id, specialtyId: spec.id, isPrimary: true },
            });
          }
        }

        // Skills
        for (const name of doc.skillNames) {
          const skill = skillByName[name];
          if (skill) {
            await prisma.doctorSkill.upsert({
              where: { doctorId_skillId: { doctorId: doctor.id, skillId: skill.id } },
              update: {},
              create: { doctorId: doctor.id, skillId: skill.id },
            });
          }
        }

        // Neo4j: Doctor node
        await session.run(
          `MERGE (d:Doctor {pgId: $id})
           SET d.fullName = $fullName, d.email = $email, d.city = $city,
               d.state = $state, d.crmVerified = true`,
          { id: doctor.id, fullName: doc.fullName, email: doc.email, city: doc.city, state: doc.state },
        );

        // Neo4j: Specialty relationships
        for (const code of doc.specialtyCodes) {
          const spec = specialtyByCode[code];
          if (spec) {
            await session.run(
              `MERGE (s:Specialty {pgId: $specId})
               SET s.name = $specName, s.code = $specCode
               WITH s
               MATCH (d:Doctor {pgId: $doctorId})
               MERGE (d)-[:SPECIALIZES_IN]->(s)`,
              { specId: spec.id, specName: spec.name, specCode: spec.code, doctorId: doctor.id },
            );
          }
        }

        // Neo4j: Skill relationships
        for (const name of doc.skillNames) {
          const skill = skillByName[name];
          if (skill) {
            await session.run(
              `MERGE (sk:Skill {pgId: $skillId})
               SET sk.name = $skillName
               WITH sk
               MATCH (d:Doctor {pgId: $doctorId})
               MERGE (d)-[:HAS_SKILL]->(sk)`,
              { skillId: skill.id, skillName: skill.name, doctorId: doctor.id },
            );
          }
        }

        // Neo4j: City
        if (doc.city && doc.state) {
          await session.run(
            `MERGE (c:City {name: $city, state: $state})
             WITH c
             MATCH (d:Doctor {pgId: $doctorId})
             MERGE (d)-[:LOCATED_IN]->(c)`,
            { city: doc.city, state: doc.state, doctorId: doctor.id },
          );
        }

        created++;
        console.log(`  ✓ ${doc.fullName}`);
      } catch (e: any) {
        console.log(`  ✗ ${doc.fullName}: ${e.message?.substring(0, 80)}`);
      }
    }
    console.log(`  Created: ${created}, Skipped: ${skipped}\n`);

    // ── STEP 2: Workplaces ────────────────────────────────────────────
    console.log('🏥 Step 2: Assigning workplaces...');
    let wpCreated = 0;

    for (const wp of NEW_WORKPLACE_ASSIGNMENTS) {
      const user = await prisma.user.findUnique({ where: { email: wp.email } });
      if (!user) continue;
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) continue;

      const inst = await prisma.institution.findFirst({ where: { name: wp.instName } });
      if (!inst) continue;

      const exists = await prisma.doctorWorkplace.findFirst({ where: { doctorId: doctor.id, name: inst.name } });
      if (exists) continue;

      try {
        await prisma.doctorWorkplace.create({
          data: {
            doctorId: doctor.id,
            name: inst.name,
            city: inst.city,
            state: inst.state,
            latitude: inst.latitude ?? 0,
            longitude: inst.longitude ?? 0,
            isActive: true,
          },
        });

        await session.run(
          `MATCH (d:Doctor {pgId: $doctorId}), (i:Institution {pgId: $instId})
           MERGE (d)-[:WORKS_AT]->(i)`,
          { doctorId: doctor.id, instId: inst.id },
        );
        wpCreated++;
      } catch { /* ignore */ }
    }
    console.log(`  ✓ ${wpCreated} workplaces assigned\n`);

    // ── STEP 3: Cross-connections (new ↔ existing) ────────────────────
    console.log('🔗 Step 3: Creating cross-connections (new ↔ existing)...');
    let crossCount = 0;

    for (const [emailA, emailB] of CROSS_CONNECTIONS) {
      const userA = await prisma.user.findUnique({ where: { email: emailA } });
      const userB = await prisma.user.findUnique({ where: { email: emailB } });
      if (!userA || !userB) continue;

      const docA = await prisma.doctor.findUnique({ where: { userId: userA.id } });
      const docB = await prisma.doctor.findUnique({ where: { userId: userB.id } });
      if (!docA || !docB) continue;

      try {
        const ex1 = await prisma.connectionRequest.findUnique({
          where: { senderId_receiverId: { senderId: docA.id, receiverId: docB.id } },
        });
        if (!ex1) {
          await prisma.connectionRequest.create({
            data: { senderId: docA.id, receiverId: docB.id, status: ConnectionStatus.ACCEPTED },
          });
        }
        const ex2 = await prisma.connectionRequest.findUnique({
          where: { senderId_receiverId: { senderId: docB.id, receiverId: docA.id } },
        });
        if (!ex2) {
          await prisma.connectionRequest.create({
            data: { senderId: docB.id, receiverId: docA.id, status: ConnectionStatus.ACCEPTED },
          });
        }

        await session.run(
          `MATCH (a:Doctor {pgId: $aId}), (b:Doctor {pgId: $bId})
           MERGE (a)-[:CONNECTED_TO]->(b)
           MERGE (b)-[:CONNECTED_TO]->(a)`,
          { aId: docA.id, bId: docB.id },
        );
        crossCount++;
      } catch { /* ignore */ }
    }
    console.log(`  ✓ ${crossCount} cross-connections\n`);

    // ── STEP 4: Inter-new connections ─────────────────────────────────
    console.log('🔗 Step 4: Creating inter-new connections...');
    let interCount = 0;

    for (const [emailA, emailB] of INTER_NEW_CONNECTIONS) {
      const userA = await prisma.user.findUnique({ where: { email: emailA } });
      const userB = await prisma.user.findUnique({ where: { email: emailB } });
      if (!userA || !userB) continue;

      const docA = await prisma.doctor.findUnique({ where: { userId: userA.id } });
      const docB = await prisma.doctor.findUnique({ where: { userId: userB.id } });
      if (!docA || !docB) continue;

      try {
        const ex1 = await prisma.connectionRequest.findUnique({
          where: { senderId_receiverId: { senderId: docA.id, receiverId: docB.id } },
        });
        if (!ex1) {
          await prisma.connectionRequest.create({
            data: { senderId: docA.id, receiverId: docB.id, status: ConnectionStatus.ACCEPTED },
          });
        }
        const ex2 = await prisma.connectionRequest.findUnique({
          where: { senderId_receiverId: { senderId: docB.id, receiverId: docA.id } },
        });
        if (!ex2) {
          await prisma.connectionRequest.create({
            data: { senderId: docB.id, receiverId: docA.id, status: ConnectionStatus.ACCEPTED },
          });
        }

        await session.run(
          `MATCH (a:Doctor {pgId: $aId}), (b:Doctor {pgId: $bId})
           MERGE (a)-[:CONNECTED_TO]->(b)
           MERGE (b)-[:CONNECTED_TO]->(a)`,
          { aId: docA.id, bId: docB.id },
        );
        interCount++;
      } catch { /* ignore */ }
    }
    console.log(`  ✓ ${interCount} inter-new connections\n`);

    // ── STEP 5: Graph statistics ──────────────────────────────────────
    console.log('📊 Step 5: Final graph statistics...\n');
    try {
      const stats = await session.run(`
        MATCH (d:Doctor) WITH count(d) AS doctors
        OPTIONAL MATCH (s:Specialty) WITH doctors, count(s) AS specialties
        OPTIONAL MATCH (i:Institution) WITH doctors, specialties, count(i) AS institutions
        OPTIONAL MATCH ()-[c:CONNECTED_TO]->() WITH doctors, specialties, institutions, count(c) AS connections
        OPTIONAL MATCH ()-[sp:SPECIALIZES_IN]->() WITH doctors, specialties, institutions, connections, count(sp) AS specRels
        OPTIONAL MATCH ()-[w:WORKS_AT]->() WITH doctors, specialties, institutions, connections, specRels, count(w) AS worksAt
        OPTIONAL MATCH ()-[sk:HAS_SKILL]->() WITH doctors, specialties, institutions, connections, specRels, worksAt, count(sk) AS skills
        OPTIONAL MATCH ()-[l:LOCATED_IN]->() WITH doctors, specialties, institutions, connections, specRels, worksAt, skills, count(l) AS locations
        RETURN doctors, specialties, institutions, connections, specRels, worksAt, skills, locations
      `);
      const r = stats.records[0];
      console.log('  ┌─────────────────────────────────────┐');
      console.log('  │  Neo4j Graph Stats (after showcase) │');
      console.log('  ├─────────────────────────────────────┤');
      console.log(`  │  Doctors:           ${String(r.get('doctors')).padEnd(16)}│`);
      console.log(`  │  Specialties:       ${String(r.get('specialties')).padEnd(16)}│`);
      console.log(`  │  Institutions:      ${String(r.get('institutions')).padEnd(16)}│`);
      console.log(`  │  CONNECTED_TO:      ${String(r.get('connections')).padEnd(16)}│`);
      console.log(`  │  SPECIALIZES_IN:    ${String(r.get('specRels')).padEnd(16)}│`);
      console.log(`  │  WORKS_AT:          ${String(r.get('worksAt')).padEnd(16)}│`);
      console.log(`  │  HAS_SKILL:         ${String(r.get('skills')).padEnd(16)}│`);
      console.log(`  │  LOCATED_IN:        ${String(r.get('locations')).padEnd(16)}│`);
      console.log('  └─────────────────────────────────────┘');
    } catch (e: any) {
      console.log(`  Stats query failed: ${e.message}`);
    }

    console.log('\n✅ Graph showcase seed complete!');
    console.log('   50 total doctors (15 original + 35 new)');
    console.log(`   ${CROSS_CONNECTIONS.length} cross-connections + ${INTER_NEW_CONNECTIONS.length} inter-new connections`);
    console.log(`   ${NEW_WORKPLACE_ASSIGNMENTS.length} workplace assignments\n`);
  } finally {
    await session.close();
    await driver.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('Showcase seed failed:', e); process.exit(1); });
