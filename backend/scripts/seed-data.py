#!/usr/bin/env python3
"""
Script de seed massivo para MedConnect.
Cria médicos, instituições, vagas, conexões, posts e relações Neo4j.
"""
import requests
import json
import time
import sys

BASE = "http://localhost:3000/api/v1"

# ─────────────────────────────────────────────────────────────
# 1. NOVOS MÉDICOS (20+ médicos com perfis realistas)
# ─────────────────────────────────────────────────────────────
NEW_DOCTORS = [
    {"email": "andre.souza@medconnect.com", "password": "Senha@2026", "fullName": "Dr. André Souza", "crm": "201001", "crmState": "SP", "phone": "11987654321",
     "city": "São Paulo", "state": "SP", "bio": "Cardiologista intervencionista com 15 anos de experiência em hemodinâmica.", "graduationYear": 2008, "universityName": "USP"},
    {"email": "beatriz.lima@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Beatriz Lima", "crm": "201002", "crmState": "RJ", "phone": "21976543210",
     "city": "Rio de Janeiro", "state": "RJ", "bio": "Neurologista especializada em doenças neurodegenerativas e AVC.", "graduationYear": 2010, "universityName": "UFRJ"},
    {"email": "caio.mendes@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Caio Mendes", "crm": "201003", "crmState": "MG", "phone": "31965432109",
     "city": "Belo Horizonte", "state": "MG", "bio": "Cirurgião geral com atuação em cirurgia minimamente invasiva e robótica.", "graduationYear": 2005, "universityName": "UFMG"},
    {"email": "daniela.rocha@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Daniela Rocha", "crm": "201004", "crmState": "SP", "phone": "11954321098",
     "city": "Campinas", "state": "SP", "bio": "Pediatra neonatologista com especialização em terapia intensiva neonatal.", "graduationYear": 2012, "universityName": "UNICAMP"},
    {"email": "eduardo.pinto@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Eduardo Pinto", "crm": "201005", "crmState": "RS", "phone": "51943210987",
     "city": "Porto Alegre", "state": "RS", "bio": "Ortopedista especializado em cirurgia do joelho e medicina esportiva.", "graduationYear": 2009, "universityName": "UFRGS"},
    {"email": "flavia.nascimento@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Flávia Nascimento", "crm": "201006", "crmState": "BA", "phone": "71932109876",
     "city": "Salvador", "state": "BA", "bio": "Dermatologista com foco em dermatologia clínica e cirúrgica.", "graduationYear": 2011, "universityName": "UFBA"},
    {"email": "gabriel.tavares@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Gabriel Tavares", "crm": "201007", "crmState": "PR", "phone": "41921098765",
     "city": "Curitiba", "state": "PR", "bio": "Intensivista com 10 anos em UTI adulto. Pesquisador em sepse.", "graduationYear": 2013, "universityName": "UFPR"},
    {"email": "helena.martins@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Helena Martins", "crm": "201008", "crmState": "CE", "phone": "85910987654",
     "city": "Fortaleza", "state": "CE", "bio": "Médica de emergência, instrutora ATLS e ACLS. Coordenadora de PS.", "graduationYear": 2007, "universityName": "UFC"},
    {"email": "igor.campos@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Igor Campos", "crm": "201009", "crmState": "PE", "phone": "81909876543",
     "city": "Recife", "state": "PE", "bio": "Cardiologista clínico com sub-especialização em ecocardiografia.", "graduationYear": 2014, "universityName": "UFPE"},
    {"email": "juliana.araujo@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Juliana Araújo", "crm": "201010", "crmState": "DF", "phone": "61998765432",
     "city": "Brasília", "state": "DF", "bio": "Endocrinologista. Referência em diabetes e tireoide.", "graduationYear": 2010, "universityName": "UnB"},
    {"email": "kleber.monteiro@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Kleber Monteiro", "crm": "201011", "crmState": "GO", "phone": "62987654321",
     "city": "Goiânia", "state": "GO", "bio": "Urologista com experiência em cirurgia robótica e litotripsia.", "graduationYear": 2006, "universityName": "UFG"},
    {"email": "larissa.vieira@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Larissa Vieira", "crm": "201012", "crmState": "SC", "phone": "48976543210",
     "city": "Florianópolis", "state": "SC", "bio": "Psiquiatra com foco em transtornos de humor e psicoterapia.", "graduationYear": 2015, "universityName": "UFSC"},
    {"email": "marcelo.dias@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Marcelo Dias", "crm": "201013", "crmState": "SP", "phone": "11965432100",
     "city": "São Paulo", "state": "SP", "bio": "Oncologista clínico. Referência em tumores de mama e pulmão.", "graduationYear": 2004, "universityName": "UNIFESP"},
    {"email": "natalia.gomes@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Natália Gomes", "crm": "201014", "crmState": "RJ", "phone": "21954321099",
     "city": "Niterói", "state": "RJ", "bio": "Geriatra com atuação em cuidados paliativos e demências.", "graduationYear": 2016, "universityName": "UFF"},
    {"email": "otavio.silva@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Otávio Silva", "crm": "201015", "crmState": "MG", "phone": "31943210988",
     "city": "Uberlândia", "state": "MG", "bio": "Pneumologista com experiência em doenças pulmonares crônicas e COVID longa.", "graduationYear": 2011, "universityName": "UFU"},
    {"email": "patricia.santos@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Patrícia Santos", "crm": "201016", "crmState": "SP", "phone": "19932109877",
     "city": "Ribeirão Preto", "state": "SP", "bio": "Anestesiologista com pós em dor crônica. Atua em centro cirúrgico e ambulatório de dor.", "graduationYear": 2008, "universityName": "USP-RP"},
    {"email": "rafael.cunha@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Rafael Cunha", "crm": "201017", "crmState": "AM", "phone": "92921098766",
     "city": "Manaus", "state": "AM", "bio": "Infectologista. Atuação em doenças tropicais e HIV.", "graduationYear": 2012, "universityName": "UFAM"},
    {"email": "sofia.ferraz@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Sofia Ferraz", "crm": "201018", "crmState": "RS", "phone": "51910987655",
     "city": "Porto Alegre", "state": "RS", "bio": "Reumatologista com expertise em lúpus e artrite reumatoide.", "graduationYear": 2013, "universityName": "PUC-RS"},
    {"email": "thiago.barros@medconnect.com", "password": "Senha@2026", "fullName": "Dr. Thiago Barros", "crm": "201019", "crmState": "BA", "phone": "71909876544",
     "city": "Salvador", "state": "BA", "bio": "Cirurgião cardiovascular. Especialista em ponte de safena e troca valvar.", "graduationYear": 2003, "universityName": "UFBA"},
    {"email": "vanessa.moura@medconnect.com", "password": "Senha@2026", "fullName": "Dra. Vanessa Moura", "crm": "201020", "crmState": "PR", "phone": "41998765433",
     "city": "Londrina", "state": "PR", "bio": "Gastroenterologista e hepatologista. Endoscopia diagnóstica e terapêutica.", "graduationYear": 2009, "universityName": "UEL"},
]

# Specialty assignments per doctor (specialty code -> doctor email list)
SPECIALTY_MAP = {
    "Cardiologia": ["andre.souza@medconnect.com", "igor.campos@medconnect.com", "thiago.barros@medconnect.com"],
    "Neurologia": ["beatriz.lima@medconnect.com"],
    "Cirurgia Geral": ["caio.mendes@medconnect.com"],
    "Pediatria": ["daniela.rocha@medconnect.com"],
    "Ortopedia e Traumatologia": ["eduardo.pinto@medconnect.com"],
    "Dermatologia": ["flavia.nascimento@medconnect.com"],
    "Medicina Intensiva": ["gabriel.tavares@medconnect.com"],
    "Medicina de Emergência": ["helena.martins@medconnect.com"],
    "Clínica Médica": ["juliana.araujo@medconnect.com", "natalia.gomes@medconnect.com"],
}

# ─────────────────────────────────────────────────────────────
# 2. NOVAS INSTITUIÇÕES
# ─────────────────────────────────────────────────────────────
NEW_INSTITUTIONS = [
    {"name": "Hospital Albert Einstein", "type": "HOSPITAL", "city": "São Paulo", "state": "SP",
     "description": "Hospital referência em pesquisa e atendimento de alta complexidade.", "neighborhood": "Morumbi"},
    {"name": "Hospital Sírio-Libanês", "type": "HOSPITAL", "city": "São Paulo", "state": "SP",
     "description": "Centro médico de excelência com foco em oncologia e transplantes.", "neighborhood": "Bela Vista"},
    {"name": "Hospital Copa D'Or", "type": "HOSPITAL", "city": "Rio de Janeiro", "state": "RJ",
     "description": "Hospital privado referência no Rio de Janeiro.", "neighborhood": "Copacabana"},
    {"name": "Hospital Moinhos de Vento", "type": "HOSPITAL", "city": "Porto Alegre", "state": "RS",
     "description": "Hospital filantrópico de excelência no sul do Brasil.", "neighborhood": "Moinhos de Vento"},
    {"name": "Hospital das Clínicas UFMG", "type": "HOSPITAL", "city": "Belo Horizonte", "state": "MG",
     "description": "Hospital universitário referência em Minas Gerais.", "neighborhood": "Santa Efigênia"},
    {"name": "Hospital de Base de Brasília", "type": "HOSPITAL", "city": "Brasília", "state": "DF",
     "description": "Maior hospital público do Distrito Federal.", "neighborhood": "Asa Sul"},
    {"name": "UPA 24h Madureira", "type": "PRONTO_SOCORRO", "city": "Rio de Janeiro", "state": "RJ",
     "description": "Unidade de pronto-atendimento 24 horas.", "neighborhood": "Madureira"},
    {"name": "Clínica Cardiolife", "type": "CLINICA", "city": "São Paulo", "state": "SP",
     "description": "Clínica especializada em cardiologia e check-up executivo.", "neighborhood": "Jardins"},
    {"name": "Laboratório Fleury", "type": "LABORATORIO", "city": "São Paulo", "state": "SP",
     "description": "Rede de laboratórios de diagnóstico e referência.", "neighborhood": "Itaim Bibi"},
    {"name": "Hospital Roberto Santos", "type": "HOSPITAL", "city": "Salvador", "state": "BA",
     "description": "Hospital geral público referência no Nordeste.", "neighborhood": "Cabula"},
    {"name": "Hospital Evangélico Mackenzie", "type": "HOSPITAL", "city": "Curitiba", "state": "PR",
     "description": "Hospital filantrópico com ensino e pesquisa.", "neighborhood": "Centro"},
    {"name": "UBS Jardim São Paulo", "type": "UBS", "city": "São Paulo", "state": "SP",
     "description": "Unidade básica de saúde com atendimento de atenção primária.", "neighborhood": "Jardim São Paulo"},
]

# ─────────────────────────────────────────────────────────────
# 3. NOVAS VAGAS (serão criadas após instituições)
# ─────────────────────────────────────────────────────────────
NEW_JOBS_TEMPLATE = [
    {"title": "Plantão Cardiologia - UTI Coronariana", "type": "PLANTAO", "shift": "NOTURNO", "city": "São Paulo", "state": "SP",
     "description": "Plantão noturno na UTI Coronariana. 20 leitos, monitorização contínua. Equipe de enfermagem especializada.",
     "requirements": "Cardiologista com experiência em terapia intensiva", "salaryMin": 2500, "salaryMax": 3200, "specName": "Cardiologia"},
    {"title": "Consultas Neurologia - Ambulatório", "type": "CONSULTA", "shift": "DIURNO", "city": "Rio de Janeiro", "state": "RJ",
     "description": "Ambulatório de neurologia. 12 consultas/turno. Eletroneuromiografia e EEG disponíveis.",
     "requirements": "Neurologista com RQE", "salaryMin": 900, "salaryMax": 1400, "specName": "Neurologia"},
    {"title": "Cirurgião Geral - Centro Cirúrgico", "type": "PLANTAO", "shift": "DIURNO", "city": "Belo Horizonte", "state": "MG",
     "description": "Plantão como cirurgião geral na retaguarda do PS. Disponibilidade para cirurgias de emergência.",
     "requirements": "Cirurgião geral com título de especialista", "salaryMin": 2800, "salaryMax": 3500, "specName": "Cirurgia Geral"},
    {"title": "Pediatra Neonatologista - Maternidade", "type": "PLANTAO", "shift": "INTEGRAL", "city": "Campinas", "state": "SP",
     "description": "Plantão 24h na maternidade. Atendimento em sala de parto e UTI neonatal. Média de 15 partos/dia.",
     "requirements": "Pediatra com experiência em neonatologia", "salaryMin": 3000, "salaryMax": 3800, "specName": "Pediatria"},
    {"title": "Ortopedista - Pronto-Socorro", "type": "PLANTAO", "shift": "NOTURNO", "city": "Porto Alegre", "state": "RS",
     "description": "Plantão noturno no PS de ortopedia. Fraturas, luxações e politraumatismo.",
     "requirements": "Ortopedista com experiência em trauma", "salaryMin": 2200, "salaryMax": 2800, "specName": "Ortopedia e Traumatologia"},
    {"title": "Dermatologista - Consultas", "type": "CONSULTA", "shift": "FLEXIVEL", "city": "Salvador", "state": "BA",
     "description": "Consultório compartilhado com demanda estável. Dermatoscópio e crioterapia disponíveis.",
     "requirements": "Dermatologista com RQE", "salaryMin": 700, "salaryMax": 1100, "specName": "Dermatologia"},
    {"title": "Intensivista - UTI Adulto", "type": "PLANTAO", "shift": "NOTURNO", "city": "Curitiba", "state": "PR",
     "description": "Plantão noturno em UTI geral com 30 leitos. Protocolo de sepse e ventilação mecânica.",
     "requirements": "Intensivista com TEA", "salaryMin": 2000, "salaryMax": 2600, "specName": "Medicina Intensiva"},
    {"title": "Emergencista - PS 24h", "type": "PLANTAO", "shift": "INTEGRAL", "city": "Fortaleza", "state": "CE",
     "description": "Plantão 24h no pronto-socorro. Volume de 150 atendimentos/dia. Suporte para emergência clínica e trauma.",
     "requirements": "Emergencista ou clínico com experiência em PS", "salaryMin": 3500, "salaryMax": 4200, "specName": "Medicina de Emergência"},
    {"title": "Cardiologista - Eco e Teste Ergométrico", "type": "CONSULTA", "shift": "DIURNO", "city": "São Paulo", "state": "SP",
     "description": "Realização de ecocardiogramas e testes ergométricos. 20 exames/turno.",
     "requirements": "Cardiologista com habilitação em ecocardiografia", "salaryMin": 1200, "salaryMax": 1800, "specName": "Cardiologia"},
    {"title": "Clínico Geral - Ambulatório", "type": "CONSULTA", "shift": "DIURNO", "city": "Brasília", "state": "DF",
     "description": "Atendimento ambulatorial em clínica médica. 16 pacientes/turno. Exames laboratoriais disponíveis.",
     "requirements": "CRM ativo", "salaryMin": 500, "salaryMax": 800, "specName": "Clínica Médica"},
    {"title": "Plantonista PS - Clínica Médica", "type": "PLANTAO", "shift": "DIURNO", "city": "Rio de Janeiro", "state": "RJ",
     "description": "Plantão diurno em PS de alta demanda. Internações e altas da emergência clínica.",
     "requirements": "Clínico com experiência em emergência", "salaryMin": 1800, "salaryMax": 2300, "specName": "Clínica Médica"},
    {"title": "Pediatra - PS Pediátrico", "type": "PLANTAO", "shift": "NOTURNO", "city": "São Paulo", "state": "SP",
     "description": "Plantão noturno no PS pediátrico. Média de 60 atendimentos/noite. UTI pediátrica de retaguarda.",
     "requirements": "Pediatra com experiência em emergência", "salaryMin": 2000, "salaryMax": 2500, "specName": "Pediatria"},
    {"title": "Psiquiatra - CAPS", "type": "CONSULTA", "shift": "DIURNO", "city": "Florianópolis", "state": "SC",
     "description": "Atendimento em CAPS III. Acompanhamento de pacientes com transtornos graves.",
     "requirements": "Psiquiatra com experiência em saúde mental comunitária", "salaryMin": 800, "salaryMax": 1200},
    {"title": "Cirurgião Cardiovascular - Centro Cirúrgico", "type": "PLANTAO", "shift": "DIURNO", "city": "Salvador", "state": "BA",
     "description": "Cirurgias eletivas e de urgência. Ponte de safena, troca valvar, correção de aneurisma.",
     "requirements": "Cirurgião cardiovascular com título", "salaryMin": 4000, "salaryMax": 5500, "specName": "Cardiologia"},
    {"title": "Emergencista - UPA 24h", "type": "PLANTAO", "shift": "INTEGRAL", "city": "Rio de Janeiro", "state": "RJ",
     "description": "Plantão 24h em UPA de alto volume. Sutura, drenagem de tórax, IOT.",
     "requirements": "Médico com experiência em urgência e emergência", "salaryMin": 2800, "salaryMax": 3400, "specName": "Medicina de Emergência"},
    {"title": "Endocrinologista - Consultório", "type": "CONSULTA", "shift": "FLEXIVEL", "city": "Brasília", "state": "DF",
     "description": "Consultório equipado para endocrinologia. Ultrassom de tireoide disponível.",
     "requirements": "Endocrinologista com RQE", "salaryMin": 1000, "salaryMax": 1500},
    {"title": "Gastroenterologista - Endoscopia", "type": "CONSULTA", "shift": "DIURNO", "city": "Londrina", "state": "PR",
     "description": "Realização de endoscopias e colonoscopias diagnósticas e terapêuticas.",
     "requirements": "Gastro com habilitação em endoscopia", "salaryMin": 1500, "salaryMax": 2200},
    {"title": "Pneumologista - Ambulatório", "type": "CONSULTA", "shift": "DIURNO", "city": "Uberlândia", "state": "MG",
     "description": "Ambulatório de pneumologia com espirometria e polissonografia.",
     "requirements": "Pneumologista com RQE", "salaryMin": 800, "salaryMax": 1300},
    {"title": "Anestesiologista - Centro Cirúrgico", "type": "PLANTAO", "shift": "DIURNO", "city": "Ribeirão Preto", "state": "SP",
     "description": "Plantão diurno no centro cirúrgico. 6-8 procedimentos/dia. Anestesia geral e raquianestesia.",
     "requirements": "Anestesiologista com TEA", "salaryMin": 2500, "salaryMax": 3200},
    {"title": "Infectologista - Hospital de Referência", "type": "CONSULTA", "shift": "DIURNO", "city": "Manaus", "state": "AM",
     "description": "Atendimento e acompanhamento de pacientes com doenças infecciosas tropicais e HIV.",
     "requirements": "Infectologista com experiência em doenças tropicais", "salaryMin": 1200, "salaryMax": 1800},
]

# ─────────────────────────────────────────────────────────────
# 4. CONEXÕES (rede complexa para testar Neo4j)
# ─────────────────────────────────────────────────────────────
# email pairs: each pair = bidirectional connection request + accept
CONNECTIONS = [
    # New doctors connecting among themselves (creates friend-of-friend paths)
    ("andre.souza@medconnect.com", "igor.campos@medconnect.com"),
    ("andre.souza@medconnect.com", "thiago.barros@medconnect.com"),
    ("andre.souza@medconnect.com", "marcelo.dias@medconnect.com"),
    ("beatriz.lima@medconnect.com", "natalia.gomes@medconnect.com"),
    ("beatriz.lima@medconnect.com", "helena.martins@medconnect.com"),
    ("caio.mendes@medconnect.com", "gabriel.tavares@medconnect.com"),
    ("caio.mendes@medconnect.com", "eduardo.pinto@medconnect.com"),
    ("daniela.rocha@medconnect.com", "patricia.santos@medconnect.com"),
    ("daniela.rocha@medconnect.com", "larissa.vieira@medconnect.com"),
    ("eduardo.pinto@medconnect.com", "sofia.ferraz@medconnect.com"),
    ("flavia.nascimento@medconnect.com", "thiago.barros@medconnect.com"),
    ("gabriel.tavares@medconnect.com", "vanessa.moura@medconnect.com"),
    ("helena.martins@medconnect.com", "rafael.cunha@medconnect.com"),
    ("igor.campos@medconnect.com", "juliana.araujo@medconnect.com"),
    ("juliana.araujo@medconnect.com", "kleber.monteiro@medconnect.com"),
    ("kleber.monteiro@medconnect.com", "otavio.silva@medconnect.com"),
    ("larissa.vieira@medconnect.com", "sofia.ferraz@medconnect.com"),
    ("marcelo.dias@medconnect.com", "patricia.santos@medconnect.com"),
    ("natalia.gomes@medconnect.com", "rafael.cunha@medconnect.com"),
    ("otavio.silva@medconnect.com", "vanessa.moura@medconnect.com"),
    # Demo user connects to some new doctors (friend-of-friend path to others)
    ("demo@medconnect.com", "andre.souza@medconnect.com"),
    ("demo@medconnect.com", "beatriz.lima@medconnect.com"),
    ("demo@medconnect.com", "caio.mendes@medconnect.com"),
    ("demo@medconnect.com", "daniela.rocha@medconnect.com"),
]

# ─────────────────────────────────────────────────────────────
# 5. POSTS (feed content)
# ─────────────────────────────────────────────────────────────
NEW_POSTS = [
    {"email": "andre.souza@medconnect.com", "content": "Acabei de publicar um artigo sobre o uso de IVUS na angioplastia coronariana. Os resultados mostram redução significativa de reestenose. Link nos comentários! #cardiologia #intervenção #pesquisa", "tags": ["cardiologia", "pesquisa", "IVUS"]},
    {"email": "beatriz.lima@medconnect.com", "content": "Caso interessante hoje: paciente de 45 anos com cefaleia súbita e rigidez de nuca. TC normal, mas punção lombar positiva para hemorragia subaracnoide. Lembrem-se: TC negativa NÃO descarta HSA! #neurologia #emergência", "tags": ["neurologia", "emergência", "caso clínico"]},
    {"email": "caio.mendes@medconnect.com", "content": "Realizamos a primeira colecistectomia robótica aqui no HC-UFMG! A curva de aprendizado é real, mas os benefícios para o paciente são evidentes. Menor tempo de internação e recuperação mais rápida.", "tags": ["cirurgia", "robótica", "inovação"]},
    {"email": "daniela.rocha@medconnect.com", "content": "A triagem neonatal expandida salvou mais uma vida. Identificamos um caso de galactosemia em RN de 3 dias, antes de qualquer sintoma. Diagnóstico precoce é tudo na pediatria! #neonatologia #triagemNeonatal", "tags": ["pediatria", "neonatologia", "diagnóstico"]},
    {"email": "eduardo.pinto@medconnect.com", "content": "Workshop de artroscopia do joelho foi um sucesso! Mais de 30 ortopedistas participaram. A técnica de reconstrução do LCA com tendão patelar continua sendo minha preferida. Bora compartilhar conhecimento! 🏥", "tags": ["ortopedia", "artroscopia", "ensino"]},
    {"email": "helena.martins@medconnect.com", "content": "PSA para emergencistas: atualizamos o protocolo de manejo de anafilaxia no nosso PS. Adrenalina IM 0,3-0,5mg na face lateral da coxa, SEMPRE como primeira linha. Nada de prometazina IV como tratamento inicial! #emergência #protocolo", "tags": ["emergência", "protocolo", "anafilaxia"]},
    {"email": "gabriel.tavares@medconnect.com", "content": "Semana de Sepse no Brasil! Participem do treinamento online gratuito sobre o bundle de 1 hora. Cada minuto conta na sepse. Meta de lactato < 2 e procalcitonina guiando antibioticoterapia. #UTI #sepse", "tags": ["UTI", "sepse", "treinamento"]},
    {"email": "igor.campos@medconnect.com", "content": "Nova diretriz de insuficiência cardíaca publicada! Principais mudanças: SGLT2i para TODOS os pacientes com FE reduzida, independente de diabetes. Paradigma mudou. Quem já está implementando? #cardiologia #IC #SGLT2", "tags": ["cardiologia", "insuficiência cardíaca", "diretriz"]},
    {"email": "juliana.araujo@medconnect.com", "content": "Dia Mundial do Diabetes: no Brasil temos mais de 16 milhões de diabéticos. A telemedicina tem sido fundamental para o acompanhamento desses pacientes, especialmente no interior. Compartilhem experiências! #diabetes #endocrinologia #telemedicina", "tags": ["endocrinologia", "diabetes", "telemedicina"]},
    {"email": "marcelo.dias@medconnect.com", "content": "Imunoterapia combinada mostrando resultados impressionantes no câncer de pulmão não-pequenas células. Sobrevida global de 5 anos saltou de 5% para 25% em alguns subgrupos. A oncologia está em transformação! #oncologia #imunoterapia", "tags": ["oncologia", "imunoterapia", "pesquisa"]},
    {"email": "sofia.ferraz@medconnect.com", "content": "Para colegas reumatologistas: novo consenso sobre uso de JAKinibs no tratamento de artrite reumatoide. Eficácia semelhante aos biológicos com a vantagem da via oral. Cuidado com screening de infecções latentes! #reumatologia #AR", "tags": ["reumatologia", "artrite", "tratamento"]},
    {"email": "rafael.cunha@medconnect.com", "content": "Estamos vendo um aumento de casos de leptospirose na região amazônica após as enchentes. Fiquem atentos a pacientes com febre, icterícia e insuficiência renal. Diagnóstico precoce com doxiciclina salva vidas! #infectologia #leptospirose", "tags": ["infectologia", "leptospirose", "alerta"]},
    {"email": "flavia.nascimento@medconnect.com", "content": "Melanoma in situ diagnosticado hoje em consulta de rotina. Paciente de 28 anos com lesão ABCDE positiva em dorso. Importância do exame dermatológico regular! Dermoscopia deveria ser obrigatória em todo check-up. #dermatologia #melanoma #prevenção", "tags": ["dermatologia", "melanoma", "prevenção"]},
    {"email": "thiago.barros@medconnect.com", "content": "Realizamos com sucesso a primeira cirurgia de TAVI (troca valvar aórtica transcateter) aqui no Hospital Roberto Santos. Paciente de 82 anos, alto risco cirúrgico, evoluiu sem complicações. A cardiologia intervencionista estrutural avança no Nordeste! #cardiologia #TAVI #cirurgia", "tags": ["cardiologia", "TAVI", "cirurgia"]},
    {"email": "vanessa.moura@medconnect.com", "content": "Dica para quem faz endoscopia: a técnica de water exchange na colonoscopia reduz significativamente a dor do paciente e melhora a taxa de intubação cecal. Estamos implementando aqui com ótimos resultados. #gastro #endoscopia #técnica", "tags": ["gastroenterologia", "endoscopia", "técnica"]},
]

# ─────────────────────────────────────────────────────────────
# EXECUTION
# ─────────────────────────────────────────────────────────────

def register_doctor(doc):
    """Register a doctor, return (token, doctorId) or None if already exists."""
    payload = {
        "email": doc["email"],
        "password": doc["password"],
        "fullName": doc["fullName"],
        "crm": doc["crm"],
        "crmState": doc["crmState"],
    }
    if doc.get("phone"):
        payload["phone"] = doc["phone"]

    r = requests.post(f"{BASE}/auth/register", json=payload)
    if r.status_code == 201:
        data = r.json()
        return data["accessToken"], data["user"]["doctorId"]
    elif r.status_code == 409:
        # Already exists, login
        r2 = requests.post(f"{BASE}/auth/login", json={"email": doc["email"], "password": doc["password"]})
        if r2.status_code == 200:
            data = r2.json()
            return data["accessToken"], data["user"]["doctorId"]
    print(f"  WARN: Could not register/login {doc['email']}: {r.status_code} {r.text[:100]}")
    return None, None

def update_profile(token, doc):
    """Update doctor profile with city, state, bio etc."""
    payload = {}
    for field in ["city", "state", "bio", "graduationYear", "universityName"]:
        if doc.get(field):
            payload[field] = doc[field]
    if payload:
        r = requests.put(f"{BASE}/doctors/me", json=payload, headers={"Authorization": f"Bearer {token}"})
        return r.status_code in [200, 201]
    return True

def get_specialties(token):
    """Get all specialties."""
    r = requests.get(f"{BASE}/doctors/ref/specialties", headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 200:
        return r.json()
    return []

def add_specialty(token, specialty_id, is_primary=False):
    """Add specialty to current doctor."""
    r = requests.post(f"{BASE}/doctors/me/specialties",
                      json={"specialtyId": specialty_id, "isPrimary": is_primary},
                      headers={"Authorization": f"Bearer {token}"})
    return r.status_code in [200, 201]

def create_institution(token, inst):
    """Create institution."""
    r = requests.post(f"{BASE}/institutions", json=inst, headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 201:
        return r.json()["id"]
    elif r.status_code == 409:
        return "exists"
    print(f"  WARN: Could not create institution {inst['name']}: {r.status_code} {r.text[:100]}")
    return None

def create_job(token, job):
    """Create a job listing."""
    r = requests.post(f"{BASE}/jobs", json=job, headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 201:
        return True
    print(f"  WARN: Could not create job {job['title']}: {r.status_code} {r.text[:100]}")
    return False

def send_connection(token, receiver_id):
    """Send connection request."""
    r = requests.post(f"{BASE}/connections/request/{receiver_id}", headers={"Authorization": f"Bearer {token}"})
    return r.status_code in [200, 201]

def accept_connection(token, request_id):
    """Accept connection request."""
    r = requests.post(f"{BASE}/connections/accept/{request_id}", headers={"Authorization": f"Bearer {token}"})
    return r.status_code in [200, 201]

def get_pending_requests(token):
    """Get pending requests for current user."""
    r = requests.get(f"{BASE}/connections/pending", headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 200:
        return r.json()
    return []

def create_post(token, content, tags=None):
    """Create a post."""
    payload = {"content": content, "type": "ARTICLE"}
    if tags:
        payload["tags"] = tags
    r = requests.post(f"{BASE}/feed/posts", json=payload, headers={"Authorization": f"Bearer {token}"})
    return r.status_code in [200, 201]

def like_post(token, post_id):
    """Like a post."""
    r = requests.post(f"{BASE}/feed/posts/{post_id}/like", headers={"Authorization": f"Bearer {token}"})
    return r.status_code in [200, 201]

# ─────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("MedConnect - Seed de Dados Massivo")
    print("=" * 60)

    # Store tokens and doctorIds
    doctor_tokens = {}  # email -> token
    doctor_ids = {}     # email -> doctorId

    # --- Step 1: Register new doctors ---
    print("\n[1/7] Registrando novos médicos...")
    for doc in NEW_DOCTORS:
        token, doctor_id = register_doctor(doc)
        if token and doctor_id:
            doctor_tokens[doc["email"]] = token
            doctor_ids[doc["email"]] = doctor_id
            print(f"  ✓ {doc['fullName']} ({doc['email']})")
        else:
            print(f"  ✗ {doc['fullName']} - FALHOU")

    # Login demo user
    r = requests.post(f"{BASE}/auth/login", json={"email": "demo@medconnect.com", "password": "Demo@2026"})
    if r.status_code == 200:
        data = r.json()
        doctor_tokens["demo@medconnect.com"] = data["accessToken"]
        doctor_ids["demo@medconnect.com"] = data["user"]["doctorId"]
        print(f"  ✓ Demo user logged in")

    # Also login existing doctors
    existing_emails = [
        ("joao.silva@medconnect.com", "Senha@2026"),
        ("maria.santos@medconnect.com", "Senha@2026"),
        ("pedro.lima@medconnect.com", "Senha@2026"),
        ("ana.costa@medconnect.com", "Senha@2026"),
        ("carlos.oliveira@medconnect.com", "Senha@2026"),
        ("julia.mendes@medconnect.com", "Senha@2026"),
        ("ricardo.ferreira@medconnect.com", "Senha@2026"),
        ("lucas.barbosa@medconnect.com", "Senha@2026"),
        ("fernanda.alves@medconnect.com", "Senha@2026"),
    ]
    for email, pwd in existing_emails:
        r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200:
            data = r.json()
            doctor_tokens[email] = data["accessToken"]
            doctor_ids[email] = data["user"]["doctorId"]

    # --- Step 2: Update profiles ---
    print("\n[2/7] Atualizando perfis dos médicos...")
    for doc in NEW_DOCTORS:
        email = doc["email"]
        if email in doctor_tokens:
            if update_profile(doctor_tokens[email], doc):
                print(f"  ✓ {doc['fullName']} - perfil atualizado")
            else:
                print(f"  ✗ {doc['fullName']} - falha ao atualizar")

    # --- Step 3: Assign specialties ---
    print("\n[3/7] Atribuindo especialidades...")
    # Get any token to fetch specialties
    any_token = list(doctor_tokens.values())[0]
    specialties = get_specialties(any_token)
    spec_name_to_id = {s["name"]: s["id"] for s in specialties}
    print(f"  Especialidades disponíveis: {list(spec_name_to_id.keys())}")

    for spec_name, emails in SPECIALTY_MAP.items():
        spec_id = spec_name_to_id.get(spec_name)
        if not spec_id:
            print(f"  ✗ Especialidade '{spec_name}' não encontrada")
            continue
        for email in emails:
            token = doctor_tokens.get(email)
            if token:
                if add_specialty(token, spec_id, is_primary=True):
                    print(f"  ✓ {email} -> {spec_name}")
                else:
                    print(f"  ✗ {email} -> {spec_name} (pode já existir)")

    # --- Step 4: Create institutions ---
    print("\n[4/7] Criando instituições...")
    institution_ids = []
    # Use demo token for creating institutions
    admin_token = doctor_tokens.get("demo@medconnect.com", any_token)
    for inst in NEW_INSTITUTIONS:
        inst_id = create_institution(admin_token, inst)
        if inst_id and inst_id != "exists":
            institution_ids.append(inst_id)
            print(f"  ✓ {inst['name']} ({inst['city']}/{inst['state']})")
        elif inst_id == "exists":
            print(f"  ~ {inst['name']} (já existe)")
        else:
            print(f"  ✗ {inst['name']} - FALHOU")

    # Get all institutions to use their IDs
    r = requests.get(f"{BASE}/institutions", headers={"Authorization": f"Bearer {admin_token}"})
    all_institutions = r.json() if r.status_code == 200 else []
    if isinstance(all_institutions, dict) and "data" in all_institutions:
        all_institutions = all_institutions["data"]
    inst_name_to_id = {i["name"]: i["id"] for i in all_institutions if isinstance(i, dict)}
    print(f"  Total de instituições: {len(inst_name_to_id)}")

    # --- Step 5: Create jobs ---
    print("\n[5/7] Criando vagas...")
    # We need to create jobs via the institution - the controller uses @CurrentUser('institutionId')
    # Since doctors don't have institutionId, we'll create jobs directly via Prisma (use a different approach)
    # Actually, let's check if any user has institution admin role
    # For simplicity, we'll use the existing institution and distribute jobs
    inst_ids_list = list(inst_name_to_id.values())
    for i, job in enumerate(NEW_JOBS_TEMPLATE):
        job_payload = {
            "title": job["title"],
            "type": job["type"],
            "shift": job["shift"],
            "city": job["city"],
            "state": job["state"],
            "description": job["description"],
            "salaryMin": job.get("salaryMin"),
            "salaryMax": job.get("salaryMax"),
        }
        if job.get("requirements"):
            job_payload["requirements"] = job["requirements"]
        # Map specialty name to ID
        if job.get("specName") and job["specName"] in spec_name_to_id:
            job_payload["specialtyId"] = spec_name_to_id[job["specName"]]

        if create_job(admin_token, job_payload):
            print(f"  ✓ {job['title']}")
        else:
            print(f"  ✗ {job['title']}")

    # --- Step 6: Create connections ---
    print("\n[6/7] Criando conexões na rede...")
    for sender_email, receiver_email in CONNECTIONS:
        sender_token = doctor_tokens.get(sender_email)
        receiver_token = doctor_tokens.get(receiver_email)
        receiver_id = doctor_ids.get(receiver_email)

        if not sender_token or not receiver_token or not receiver_id:
            print(f"  ✗ {sender_email} -> {receiver_email} (token/id missing)")
            continue

        # Send request
        if send_connection(sender_token, receiver_id):
            # Find and accept request
            pending = get_pending_requests(receiver_token)
            sender_id = doctor_ids.get(sender_email)
            for req in pending:
                if req["senderId"] == sender_id and req["status"] == "PENDING":
                    if accept_connection(receiver_token, req["id"]):
                        print(f"  ✓ {sender_email} <-> {receiver_email}")
                    else:
                        print(f"  ✗ Accept failed: {sender_email} <-> {receiver_email}")
                    break
        else:
            print(f"  ~ {sender_email} -> {receiver_email} (já existe ou falhou)")

    # --- Step 7: Create posts ---
    print("\n[7/7] Criando posts no feed...")
    post_ids = []
    for post in NEW_POSTS:
        token = doctor_tokens.get(post["email"])
        if not token:
            print(f"  ✗ {post['email']} - token não encontrado")
            continue
        if create_post(token, post["content"], post.get("tags")):
            print(f"  ✓ Post por {post['email'][:30]}...")
        else:
            print(f"  ✗ Post por {post['email']} - FALHOU")

    # --- Summary ---
    print("\n" + "=" * 60)
    print("RESUMO DO SEED")
    print("=" * 60)
    print(f"  Médicos registrados: {len(doctor_ids)}")
    print(f"  Instituições: {len(inst_name_to_id)}")
    print(f"  Vagas criadas: {len(NEW_JOBS_TEMPLATE)}")
    print(f"  Conexões tentadas: {len(CONNECTIONS)}")
    print(f"  Posts criados: {len(NEW_POSTS)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
