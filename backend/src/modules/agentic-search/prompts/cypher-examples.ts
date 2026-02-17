export const CYPHER_EXAMPLES = `
## Exemplos de consultas Cypher para o grafo MedConnect

### === QUERIES BASICAS ===

### Buscar medicos por especialidade
MATCH (d:Doctor)-[:SPECIALIZES_IN]->(s:Specialty {name: 'Cardiologia'})
RETURN d.pgId AS id, d.fullName AS fullName, d.crm AS crm, d.crmState AS crmState, d.city AS city, d.state AS state

### Buscar medicos em uma cidade
MATCH (d:Doctor)-[:LOCATED_IN]->(c:City {name: 'Sao Paulo'})
RETURN d.pgId AS id, d.fullName AS fullName, d.crm AS crm, d.city AS city, d.state AS state

### Buscar medicos por especialidade e cidade
MATCH (d:Doctor)-[:SPECIALIZES_IN]->(s:Specialty {name: 'Cardiologia'})
MATCH (d)-[:LOCATED_IN]->(c:City {name: 'Sao Paulo'})
RETURN d.pgId AS id, d.fullName AS fullName, d.crm AS crm, d.crmState AS crmState

### Buscar medicos que trabalham em uma instituicao
MATCH (d:Doctor)-[:WORKS_AT]->(i:Institution)
WHERE i.name CONTAINS 'Albert Einstein'
RETURN d.pgId AS id, d.fullName AS fullName, i.name AS institution, d.city AS city

### Buscar medicos com uma habilidade/procedimento especifico
MATCH (d:Doctor)-[:HAS_SKILL]->(s:Skill {name: 'Ecocardiograma'})
RETURN d.pgId AS id, d.fullName AS fullName, d.crm AS crm, d.city AS city, d.state AS state

### === QUERIES DE REDE E CONEXOES ===

### Amigos de amigos (sugestoes de conexao)
MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:CONNECTED_TO]->(suggestion:Doctor)
WHERE suggestion.pgId <> $doctorId AND NOT (me)-[:CONNECTED_TO]->(suggestion)
WITH suggestion, count(DISTINCT friend) AS mutualConnections
ORDER BY mutualConnections DESC
LIMIT 10
RETURN suggestion.pgId AS id, suggestion.fullName AS fullName, mutualConnections

### Colegas que trabalham em um hospital
MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:WORKS_AT]->(i:Institution)
WHERE i.name CONTAINS $institutionName
RETURN friend.pgId AS id, friend.fullName AS fullName, i.name AS institution

### Caminho de conexao entre dois medicos
MATCH path = shortestPath((a:Doctor {pgId: $fromDoctorId})-[:CONNECTED_TO*..6]-(b:Doctor {pgId: $toDoctorId}))
RETURN [node IN nodes(path) | {id: node.pgId, name: node.fullName}] AS path, length(path) AS distance

### Medicos mais conectados em uma especialidade
MATCH (d:Doctor)-[:SPECIALIZES_IN]->(s:Specialty {name: 'Ortopedia e Traumatologia'})
MATCH (d)-[c:CONNECTED_TO]-()
WITH d, count(c) AS connections
ORDER BY connections DESC
LIMIT 10
RETURN d.pgId AS id, d.fullName AS fullName, connections

### Medicos mais endossados em uma habilidade
MATCH (target:Doctor)<-[e:ENDORSED]-(endorser:Doctor)
WHERE e.skill = 'Ecocardiograma'
WITH target, count(e) AS endorsements, collect(endorser.fullName)[0..3] AS endorsedBy
ORDER BY endorsements DESC
LIMIT 10
RETURN target.pgId AS id, target.fullName AS fullName, endorsements, endorsedBy

### === QUERIES DE VAGAS ===

### Vagas ativas por especialidade
MATCH (j:Job {isActive: true})-[:REQUIRES_SPECIALTY]->(s:Specialty {name: 'Medicina Intensiva'})
MATCH (j)<-[:POSTED]-(i:Institution)
RETURN j.pgId AS id, j.title AS title, j.type AS type, j.city AS city, j.shift AS shift, i.name AS institution

### Vagas em uma cidade
MATCH (j:Job {isActive: true})<-[:POSTED]-(i:Institution)
WHERE j.city = 'Rio de Janeiro'
RETURN j.pgId AS id, j.title AS title, j.type AS type, j.shift AS shift, i.name AS institution

### === QUERIES DE COLABORACAO CIENTIFICA ===

### Buscar publicacoes por tema/especialidade
MATCH (p:Publication)-[:RELATES_TO]->(s:Specialty {name: 'Cardiologia'})
OPTIONAL MATCH (p)<-[:AUTHORED]-(a:Doctor)
RETURN p.pgId AS id, p.title AS title, p.journal AS journal, 
       collect(a.fullName) AS authors, p.publicationType AS type

### Quem publicou sobre um tema comigo
MATCH (me:Doctor {pgId: $doctorId})-[:AUTHORED]->(p:Publication)<-[:AUTHORED]-(coauthor:Doctor)
WHERE coauthor.pgId <> $doctorId
RETURN DISTINCT coauthor.pgId AS id, coauthor.fullName AS fullName, count(p) AS sharedPapers

### Co-autores da minha rede
MATCH (me:Doctor {pgId: $doctorId})-[:CONNECTED_TO]->(friend:Doctor)-[:AUTHORED]->(p:Publication)
RETURN friend.pgId AS id, friend.fullName AS fullName, p.title AS publication

### Medicos que citaram meus trabalhos
MATCH (me:Doctor {pgId: $doctorId})-[:AUTHORED]->(mypub:Publication)<-[:CITES]-(citing:Publication)<-[:AUTHORED]-(citer:Doctor)
WHERE citer.pgId <> $doctorId
RETURN DISTINCT citer.pgId AS id, citer.fullName AS fullName, citing.title AS citedIn, mypub.title AS myPaper

### Grupos de estudo em uma especialidade
MATCH (sg:StudyGroup)-[:FOCUSES_ON]->(s:Specialty {name: 'Cardiologia'})
OPTIONAL MATCH (sg)<-[:MEMBER_OF]-(m:Doctor)
RETURN sg.pgId AS id, sg.name AS name, sg.description AS description, 
       sg.isPublic AS isPublic, count(m) AS memberCount

### Entrar em grupo de estudo (buscar grupos publicos)
MATCH (sg:StudyGroup {isPublic: true})
WHERE NOT (sg)<-[:MEMBER_OF]-(:Doctor {pgId: $doctorId})
OPTIONAL MATCH (sg)-[:FOCUSES_ON]->(s:Specialty)
RETURN sg.pgId AS id, sg.name AS name, s.name AS specialty, sg.memberCount AS members

### Projetos de pesquisa ativos
MATCH (rp:ResearchProject {status: 'ACTIVE'})
OPTIONAL MATCH (rp)<-[:COLLABORATES_ON]-(m:Doctor)
RETURN rp.pgId AS id, rp.title AS title, rp.description AS description, 
       count(m) AS collaborators, collect(m.fullName)[0..5] AS team

### Medicos colaborando em projetos de pesquisa
MATCH (d:Doctor)-[:COLLABORATES_ON {role: 'PRINCIPAL_INVESTIGATOR'}]->(rp:ResearchProject {status: 'ACTIVE'})
RETURN d.pgId AS id, d.fullName AS fullName, rp.title AS project

### Casos clínicos discutidos por especialidade
MATCH (cs:CaseStudy)-[:RELATES_TO]->(s:Specialty {name: 'Cardiologia'})
OPTIONAL MATCH (cs)<-[:PARTICIPATED_IN]-(p:Doctor)
OPTIONAL MATCH (cs)<-[:AUTHORED]-(author:Doctor)
RETURN cs.pgId AS id, cs.title AS title, cs.status AS status, 
       author.fullName AS author, count(p) AS participants

### Participar de discussão de caso
MATCH (cs:CaseStudy {status: 'OPEN'})
WHERE NOT (cs)<-[:PARTICIPATED_IN]-(:Doctor {pgId: $doctorId})
OPTIONAL MATCH (cs)-[:RELATES_TO]->(s:Specialty)
RETURN cs.pgId AS id, cs.title AS title, s.name AS specialty, cs.viewCount AS views

### Lideres de opiniao (mais publicações e citacoes)
MATCH (d:Doctor)-[:AUTHORED]->(p:Publication)<-[c:CITES]-()
WITH d, count(DISTINCT p) AS pubs, count(c) AS citations
ORDER BY (pubs * 10 + citations) DESC
LIMIT 10
RETURN d.pgId AS id, d.fullName AS fullName, pubs, citations

### Rede de colaboração científica
MATCH (d1:Doctor)-[:AUTHORED]->(p:Publication)<-[:AUTHORED]-(d2:Doctor)
WHERE d1.pgId < d2.pgId
RETURN d1.fullName AS author1, d2.fullName AS author2, count(p) AS collaborations
ORDER BY collaborations DESC

### === QUERIES ANALITICAS ===

### Estatísticas do network de um medico
MATCH (d:Doctor {pgId: $doctorId})
OPTIONAL MATCH (d)-[conn:CONNECTED_TO]-()
OPTIONAL MATCH (d)<-[fol:FOLLOWS]-()
OPTIONAL MATCH (d)-[:HAS_SKILL]->(sk:Skill)
OPTIONAL MATCH (d)<-[end:ENDORSED]-()
OPTIONAL MATCH (d)-[:AUTHORED]->(pub:Publication)
OPTIONAL MATCH (d)-[:MEMBER_OF]->(sg:StudyGroup)
WITH d, count(DISTINCT conn) AS connections, count(DISTINCT fol) AS followers, 
     count(DISTINCT sk) AS skills, count(DISTINCT end) AS endorsements,
     count(DISTINCT pub) AS publications, count(DISTINCT sg) AS studyGroups
RETURN d.fullName AS fullName, connections, followers, skills, endorsements, publications, studyGroups

### O que dois médicos têm em comum
MATCH (a:Doctor {pgId: $doctorId1})-[:SPECIALIZES_IN]->(spec:Specialty)<-[:SPECIALIZES_IN]-(b:Doctor {pgId: $doctorId2})
WITH a, b, collect(spec.name) AS sharedSpecs
OPTIONAL MATCH (a)-[:HAS_SKILL]->(sk:Skill)<-[:HAS_SKILL]-(b)
WITH a, b, sharedSpecs, collect(sk.name) AS sharedSkills
OPTIONAL MATCH (a)-[:WORKS_AT]->(inst:Institution)<-[:WORKS_AT]-(b)
WITH a, b, sharedSpecs, sharedSkills, collect(inst.name) AS sharedInstitutions
OPTIONAL MATCH (a)-[:AUTHORED]->(p:Publication)<-[:AUTHORED]-(b)
WITH a, b, sharedSpecs, sharedSkills, sharedInstitutions, collect(p.title) AS sharedPublications
OPTIONAL MATCH (a)-[:CONNECTED_TO]->(mutual:Doctor)<-[:CONNECTED_TO]-(b)
RETURN sharedSpecs, sharedSkills, sharedInstitutions, sharedPublications, count(mutual) AS mutualConnections

### Equipe medica de uma instituicao
MATCH (d:Doctor)-[w:WORKS_AT]->(i:Institution {pgId: $institutionId})
OPTIONAL MATCH (d)-[:SPECIALIZES_IN]->(spec:Specialty)
RETURN d.pgId AS id, d.fullName AS fullName, w.role AS role, collect(spec.name) AS specialties

### Medicos que se candidataram a vagas de uma instituicao
MATCH (d:Doctor)-[a:APPLIED_TO]->(j:Job)<-[:POSTED]-(i:Institution {pgId: $institutionId})
RETURN d.pgId AS doctorId, d.fullName AS doctor, j.title AS job, a.status AS status

### === QUERIES DE CARREIRA E MENTORIA ===

### Buscar mentores potenciais
MATCH (mentor:Doctor)-[:SPECIALIZES_IN]->(s:Specialty)
WHERE s.name =~ '(?i).*Cardiologia.*'
  AND mentor.graduationYear <= 2014  -- pelo menos 10 anos de experiencia
OPTIONAL MATCH (mentor)<-[m:MENTORS]-(:Doctor)
WITH mentor, count(m) AS menteeCount
ORDER BY menteeCount DESC
LIMIT 10
RETURN mentor.pgId AS id, mentor.fullName AS fullName, mentor.city AS city, 
       mentor.graduationYear AS gradYear, menteeCount

### Buscar mentores na minha rede
MATCH (mentee:Doctor {pgId: $doctorId})-[:CONNECTED_TO]-(mutual:Doctor)-[:CONNECTED_TO]-(mentor:Doctor)
WHERE mentor.graduationYear <= 2010
  AND mentor.pgId <> $doctorId
OPTIONAL MATCH (mentor)-[:SPECIALIZES_IN]->(spec:Specialty)
OPTIONAL MATCH (mentor)<-[m:MENTORS]-(:Doctor)
WITH mentor, spec, count(DISTINCT mutual) AS mutualConnections, count(m) AS menteeCount
ORDER BY mutualConnections DESC, menteeCount DESC
LIMIT 10
RETURN mentor.pgId AS id, mentor.fullName AS fullName, spec.name AS specialty, 
       mutualConnections, menteeCount

### Médicos buscando mentoria (mentees em potencial)
MATCH (mentee:Doctor)-[:SPECIALIZES_IN]->(s:Specialty {name: 'Cardiologia'})
WHERE mentee.graduationYear >= 2019  -- menos de 5 anos
  AND NOT (mentee)-[:MENTORS]->(:Doctor)
RETURN mentee.pgId AS id, mentee.fullName AS fullName, mentee.city AS city, 
       mentee.graduationYear AS gradYear

### Relacoes de mentoria ativas
MATCH (mentor:Doctor)<-[m:MENTORS {status: 'ACTIVE'}]-(mentee:Doctor)
RETURN mentor.pgId AS mentorId, mentor.fullName AS mentorName,
       mentee.pgId AS menteeId, mentee.fullName AS menteeName,
       m.startDate AS startDate, m.focusArea AS focusArea

### Médicos com certificações específicas
MATCH (d:Doctor)-[:HOLDS_CERTIFICATION]->(c:Certification)
WHERE c.certificationType = 'SPECIALTY'
OPTIONAL MATCH (c)-[:FOR_SPECIALTY]->(s:Specialty)
RETURN d.pgId AS doctorId, d.fullName AS doctorName, c.name AS certification, 
       s.name AS specialty, c.issuingBody AS issuingBody

### Certificações disponíveis por especialidade
MATCH (c:Certification)-[:FOR_SPECIALTY]->(s:Specialty {name: 'Cardiologia'})
RETURN c.name AS name, c.certificationType AS type, c.issuingBody AS body, 
       c.validityYears AS validity

### Progresso de carreira de um médico
MATCH (d:Doctor {pgId: $doctorId})-[p:PROGRESS_ON]->(m:CareerMilestone)
MATCH (m)-[:PART_OF]->(cp:CareerPath)
RETURN cp.name AS careerPath, m.name AS milestone, m.orderNum AS order, 
       p.status AS status, p.completedAt AS completedAt
ORDER BY m.orderNum

### Médicos em caminhos de carreira similares
MATCH (d1:Doctor {pgId: $doctorId})-[:PROGRESS_ON]->(m:CareerMilestone)
MATCH (d2:Doctor)-[:PROGRESS_ON]->(m)
WHERE d1.pgId <> d2.pgId
WITH d2, count(m) AS sharedMilestones
ORDER BY sharedMilestones DESC
LIMIT 10
RETURN d2.pgId AS id, d2.fullName AS fullName, sharedMilestones
`;
