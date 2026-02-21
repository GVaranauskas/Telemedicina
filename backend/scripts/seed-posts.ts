/**
 * Seed script to populate ScyllaDB with realistic posts from demo doctors.
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-posts.ts
 */
import { PrismaClient } from '@prisma/client';
import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const scylla = new Client({
  contactPoints: ['localhost:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'medconnect',
  protocolOptions: { port: 9042 },
});

// ─── Post templates by specialty ────────────────────────────────────────────

const postsBySpecialty: Record<string, string[]> = {
  Cardiologia: [
    'Nova diretriz da SBC sobre insuficiência cardíaca: o que mudou na prática clínica em 2026? O uso de SGLT2 como pilar central do tratamento está consolidado, mas a individualização ainda é chave. Compartilhando minha experiência com 3 casos que me fizeram rever protocolos.',
    'Reflexão após plantonão de 12h na UTI cardíaca: os pacientes mais jovens com FA estão chegando mais graves. Lifestyle, sedentarismo e obesidade como fatores combinados. Prevenção primária precisa chegar mais cedo.',
    'Acabei de concluir meu primeiro implante de Watchman guiado por ecocardiografia intracardíaca. Procedimento sem floroscopia, menor exposição à radiação, recuperação mais rápida. O futuro da cardiologia intervencionista está aqui.',
    'Pergunta para a rede: vocês utilizam troponina de alta sensibilidade com protocolo 0h/1h ou 0h/2h na DOR de dor torácica? Minha experiência com o 0h/1h tem sido excelente em termos de negativo preditivo. Comentem!',
  ],
  Neurologia: [
    'Novo estudo NEJM confirma benefício do lecanemab em pacientes com Alzheimer precoce. Os resultados de função cognitiva em 18 meses são promissores, mas os critérios de seleção ainda limitam a aplicabilidade em nosso contexto. Discutindo isso com residentes hoje.',
    'AVC isquêmico: janela terapêutica ampliada com trombectomia mecânica até 24h em pacientes selecionados. Tivemos resultado excelente ontem com paciente que chegou 19h após início dos sintomas. Neuroimagem funcional como aliada.',
    'Enxaqueca crônica: CGRP antagonistas estão mudando a vida dos pacientes refratários. Compartilho caso de paciente com 18 anos de enxaqueca que zerou as crises em 3 meses de tratamento. Alguém mais usando fremanezumab?',
    'Miastenia gravis juvenil: diagnóstico desafiador que tarda em média 2 anos. Sintomas flutuantes, ptose e diplopia que "melhoram com repouso" devem sempre acender o alerta. Publica nosso protocolo diagnóstico.',
  ],
  Ortopedia: [
    'Artroplastia total de joelho assistida por robótica: após 50 casos com o sistema Mako, posso afirmar que a precisão no alinhamento do implante melhorou significativamente. Menos revisões em 2 anos de acompanhamento.',
    'Lesão do LCA: retorno ao esporte em 9 meses ainda é um debate. Minha conduta atual prioriza critérios funcionais (hop test, força muscular) sobre critérios temporais. O que vocês pensam?',
    'Fratura por estresse em atletas de alto rendimento: a combinação de carga progressiva, análise biomecânica e suporte nutricional reduz recidiva em 60%. Menos imobilização, mais reabilitação orientada.',
    'Curiosidade do dia: a taxa de sucesso da infiltração guiada por ultrassom em ombro é 2x maior que a infiltração às cegas no bursite subacromial. Sonografia no consultório se tornou indispensável na minha prática.',
  ],
  Pediatria: [
    'Bronquiolite em lactentes: menos intervenção, mais suporte. Aspiração nasal salina e posicionamento continuam sendo o pilar. Oxigênio de alto fluxo em casos moderados/graves. Resistindo à pressão por broncodilatadores sem evidência.',
    'Vacinação em dia = vida protegida. Atendi hoje família que recusou vacinas por "informação da internet". Conversa longa, respeitosa, baseada em evidências. Ao final, cartão de vacinas atualizado. Vale cada minuto.',
    'Dermatite atópica pediátrica: o mepolizumab e dupilumab pediátrico estão chegando. Para casos graves refratários a corticoide tópico, finalmente temos opções. Compartilhando protocolo de primeira avaliação.',
    'Alerta: casos de coqueluche aumentando nas últimas semanas. Confirme imunização da gestante (dTpa no 3º trimestre) e cocoon strategy para recém-nascidos de risco. Tossiu por mais de 2 semanas? Investigar!',
  ],
  Ginecologia: [
    'Endometriose: o diagnóstico ainda demora em média 7-10 anos. Sintomas que NÃO devem ser normalizados: dismenorreia incapacitante, dispareunia, dor pélvica crônica. Mulheres merecem ser ouvidas.',
    'Novo protocolo de screening para HPV: teste primário de DNA-HPV a partir dos 25 anos substitui o Papanicolau convencional em muitos países. Brasil em transição. O que vocês estão usando na prática?',
    'SOP e resistência insulínica: tratamento com metformina + inositol tem mostrado resultados superiores ao metformina isolado em regularização menstrual e marcadores metabólicos. Alguém mais usando essa combinação?',
    'Menopausa e TH: o medo irracional da terapia hormonal ainda priva mulheres de qualidade de vida. Risco-benefício individualizado, via transdérmica de estrogênio e progesterona micronizada natural. Desmistificando com a rede.',
  ],
  Psiquiatria: [
    'Saúde mental pós-pandemia: burnout em médicos atingiu 60% da categoria segundo último levantamento CFM. Precisamos normalizar pedir ajuda. Cuide-se para cuidar melhor.',
    'TDAH no adulto ainda subdiagnosticado: dificuldade de atenção, impulsividade e procrastinação crônica afetam produtividade e relacionamentos. Tratamento multimodal (farmacológico + TCC) com resultados expressivos.',
    'Depressão resistente: esketamina intranasal como opção após 2 falhas terapêuticas. Protocolo de 8 semanas com monitoramento rigoroso. Tivemos 3 remissões completas no último trimestre. Esperança existe.',
    'Psicoterapia online: eficácia comparável à presencial para transtornos de ansiedade e depressão leve-moderada. Aumenta acesso, reduz abandono. Regulamentação avançando no Brasil.',
  ],
  Dermatologia: [
    'Melanoma: ABCDE ainda é o melhor guia para o paciente, mas dermatoscopia aumenta sensibilidade diagnóstica em 35%. Todo nevus com dermatoscopia atípica merece biopsia. Não normalize mudanças.',
    'Dermatite seborreica: microbioma cutâneo alterado com predominância de Malassezia. Zinco piritiona + cetoconazol tópico 2x/semana de manutenção com excelentes resultados de longo prazo.',
    'Psoríase moderada-grave: biológicos anti-IL-17 e anti-IL-23 transformaram o prognóstico. PASI 90 em 3 meses como meta atingível. Iniciando nova série de casos acompanhados.',
    'Fotoproteção no Brasil: FPS 30 é absolutamente insuficiente no verão tropical. FPS 50+ de amplo espectro, reaplicação a cada 2h e evitar pico solar. Campanha simples que salva vidas.',
  ],
  Clínica: [
    'Rastreamento de diabetes tipo 2: glicemia de jejum + HbA1c em todo paciente acima de 45 anos OU acima de 35 com fatores de risco. Prevenção custa menos que complicação.',
    'Polifarmácia no idoso: média de 8 medicamentos por paciente acima de 75 anos. Revisão farmacológica com critérios de Beers é mandatória. Tiramos 3 medicamentos de um paciente hoje e ele disse que se sente "como novo".',
    'Hipertensão resistente: antes de considerar resistência verdadeira, exclua pseudo-resistência (adesão, técnica de aferição, efeito jaleco branco). MAPA de 24h como aliado essencial.',
    'Vitamina D: não solicite para todo mundo, suplemente para quem tem indicação. Deficiência real merece tratamento. Mas suplementação universal em assintomáticos não tem evidência para desfechos duros.',
  ],
};

const defaultPosts = [
  'Mais um dia de aprendizado na medicina. Cada paciente traz um desafio único que nos faz crescer profissionalmente. Gratidão pela profissão.',
  'Networking médico importa: conectei hoje um paciente meu com especialista da minha rede e ele vai ter acesso a um tratamento que não estava disponível na cidade dele. Isso é MedConnect em ação.',
  'Revisando literatura sobre IA no diagnóstico médico: os modelos de linguagem estão chegando ao lado do médico, não para substituí-lo. Quanto melhor a IA, mais importante o julgamento clínico humano.',
  'Congresso da especialidade semana que vem. Apresentando dados do nosso protocolo local. Rede, alguém mais vai? Vamos marcar um café!',
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding Posts into ScyllaDB ===\n');

  await scylla.connect();
  console.log('✓ Connected to ScyllaDB\n');

  // Get all doctors with specialty info
  const doctors = await prisma.doctor.findMany({
    include: {
      specialties: { include: { specialty: true } },
    },
  });

  if (doctors.length === 0) {
    console.log('⚠️  No doctors found. Run make seed-all first.');
    return;
  }

  console.log(`Found ${doctors.length} doctors\n`);

  // Get all doctor IDs for feed fan-out
  const allDoctorIds = doctors.map((d) => d.id);

  let totalPosts = 0;

  for (const doctor of doctors) {
    const specialtyName =
      doctor.specialties[0]?.specialty?.name ?? 'Clínica';

    const templates =
      postsBySpecialty[specialtyName] ??
      postsBySpecialty['Clínica'] ??
      defaultPosts;

    // 2-4 posts per doctor with dates spread over last 30 days
    const numPosts = Math.floor(Math.random() * 3) + 2;
    const posts = [...templates, ...defaultPosts]
      .sort(() => Math.random() - 0.5)
      .slice(0, numPosts);

    for (let i = 0; i < posts.length; i++) {
      const postId = uuidv4();
      const daysAgo = Math.floor(Math.random() * 30) + i;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const content = posts[i];
      const postType = 'TEXT';
      const tags = Array.from(extractTags(specialtyName, content));

      // Insert into post_by_id
      await scylla.execute(
        `INSERT INTO post_by_id
          (post_id, author_id, author_name, author_pic_url, content, post_type, media_urls, tags, likes_count, comments_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          postId,
          doctor.id,
          doctor.fullName,
          doctor.profilePicUrl ?? '',
          content,
          postType,
          [],
          tags,
          Math.floor(Math.random() * 40),
          createdAt,
          createdAt,
        ],
        { prepare: true },
      );

      // Insert into posts_by_author
      await scylla.execute(
        `INSERT INTO posts_by_author
          (author_id, created_at, post_id, content, post_type, media_urls, tags, likes_count, comments_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          doctor.id,
          createdAt,
          postId,
          content,
          postType,
          [],
          tags,
          Math.floor(Math.random() * 40),
        ],
        { prepare: true },
      );

      // Fan-out: insert into feed_by_user for ALL doctors (simulates connections)
      const feedTargets = allDoctorIds;
      for (const targetId of feedTargets) {
        await scylla.execute(
          `INSERT INTO feed_by_user
            (user_id, created_at, post_id, author_id, author_name, author_pic_url, content, post_type, media_urls, tags, likes_count, comments_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            targetId,
            createdAt,
            postId,
            doctor.id,
            doctor.fullName,
            doctor.profilePicUrl ?? '',
            content,
            postType,
            [],
            tags,
          ],
          { prepare: true },
        );
      }

      totalPosts++;
    }

    console.log(
      `  ✓ ${doctor.fullName} (${specialtyName}) — ${posts.length} posts`,
    );
  }

  console.log(`\n✅ ${totalPosts} posts created and distributed to all feeds`);
}

function extractTags(specialty: string, content: string): Set<string> {
  const tags = new Set<string>([specialty.toLowerCase().replace(/\s+/g, '').replace(/[áàãâä]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íì]/g, 'i').replace(/[óòõô]/g, 'o').replace(/[úù]/g, 'u')]);

  const keywords: Record<string, string> = {
    'evidência': 'evidencia',
    'protocolo': 'protocolo',
    'congresso': 'congresso',
    'pesquisa': 'pesquisa',
    'inovação': 'inovacao',
    'diagnóstico': 'diagnostico',
    'tratamento': 'tratamento',
    'prevenção': 'prevencao',
    'caso clínico': 'casoclinico',
    'UTI': 'uti',
    'cirurgia': 'cirurgia',
    'IA': 'ia',
    'inteligência artificial': 'ia',
    'newe': 'novidades',
  };

  for (const [keyword, tag] of Object.entries(keywords)) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      tags.add(tag);
    }
  }

  return tags;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await scylla.shutdown();
  });
