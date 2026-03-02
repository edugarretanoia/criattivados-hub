// ═══════════════════════════════════════════════════════════════
// SCORING ENGINE — mybrandpersonaV2
// Extracted from index.html for modularity (P2-4)
// All functions and constants are browser globals (no modules)
// Zero DOM dependencies — pure calculation + data
// ═══════════════════════════════════════════════════════════════

async function secureHash(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return 'sha256_' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
// Legacy fallback for stored hashes (migration)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return 'h' + Math.abs(hash).toString(36);
}

// ═══════════════════════════════════════════════════════════════
// SCORING WEIGHTS — P1-1: Named constants for all derivation engines
// Ref: Aaker (1997), Panksepp (1998), Chou (2015)
// ═══════════════════════════════════════════════════════════════
const SCORING_WEIGHTS = {
  // ALG-2: OCEAN → Aaker 5D
  aaker: {
    sincerity:      { A: 0.40, invN: 0.30, E: 0.15, C: 0.15 },
    excitement:     { O: 0.40, E: 0.30, invC: 0.20, invN: 0.10 },
    competence:     { C: 0.40, invN: 0.25, O: 0.20, invE: 0.15 },
    sophistication: { invN: 0.30, O: 0.25, invE: 0.20, A: 0.15, C: 0.10 },
    ruggedness:     { invA: 0.35, invN: 0.25, E: 0.20, invC: 0.20 }
  },
  // ALG-4: Profile → Panksepp 7 Affective Systems
  panksepp: {
    SEEKING:     { O: 0.35, E: 0.25, gardnerVar: 0.20, spontBonus: 20 },
    CARE:        { A: 0.40, gInter: 0.30, invN: 0.15, E: 0.15 },
    PLAY:        { E: 0.35, invN: 0.30, spontBonus: 20, gCorp: 0.15 },
    FEAR:        { N: 0.50, gIntra: 0.25, invA: 0.15, C: 0.10 },
    RAGE:        { invA: 0.40, N: 0.20, E: 0.20, delibBonus: 20 },
    LUST:        { O: 0.30, gCorp: 0.30, emocBonus: 25, E: 0.15 },
    PANIC_GRIEF: { N: 0.40, A: 0.25, gIntra: 0.20, invE: 0.15 }
  },
  // ALG-6: Octalysis Core Drives
  coreDrives: {
    CD1: { O: 0.25, pCARE: 0.25, gExist: 0.20, A: 0.10 },
    CD2: { C: 0.30, pSEEKING: 0.25, gLogic: 0.20, delibBonus: 15, invN: 0.10 },
    CD3: { O: 0.30, spontBonus: 25, pPLAY: 0.20, gEspac: 0.15, invC: 0.10 },
    CD4: { C: 0.30, invA: 0.20, pRAGE: 0.15, gIntra: 0.20, invO: 0.15 },
    CD5: { E: 0.30, A: 0.25, gInter: 0.20, pCARE: 0.15, invN: 0.10 },
    CD6: { N: 0.25, pSEEKING: 0.25, C: 0.20, invE: 0.15, invPLAY: 0.15 },
    CD7: { O: 0.30, pSEEKING: 0.25, gNat: 0.20, spontBonus: 15, invC: 0.10 },
    CD8: { N: 0.30, pFEAR: 0.30, C: 0.20, invPLAY: 0.10, A: 0.10 }
  },
  // ALG-8: Differentiation domains
  diff: {
    domainI:   { gLogic: 0.25, aCompetence: 0.25, C: 0.20, CD2: 0.15, invN: 0.15 },
    domainII:  { O: 0.25, aExcitement: 0.20, gExist: 0.20, gLing: 0.15, aSincerity: 0.10, A: 0.10 },
    domainIII: { gEspac: 0.25, gMusic: 0.20, aSophistication: 0.20, CD3: 0.15, E: 0.10, gInter: 0.10 }
  },
  // Dietrich flow factor
  dietrich: { fluxo: 0.8 }
};

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-2: OCEAN → Aaker 5D (Worker)
// Ref: Aaker (1997), Geuens et al. (2009)
// ═══════════════════════════════════════════════════════════════
function calculateAaker(ocean) {
  const { O, C, E, A, N } = ocean;
  const W = SCORING_WEIGHTS.aaker;
  return {
    sincerity:      +((A * W.sincerity.A) + ((100 - N) * W.sincerity.invN) + (E * W.sincerity.E) + (C * W.sincerity.C)).toFixed(1),
    excitement:     +((O * W.excitement.O) + (E * W.excitement.E) + ((100 - C) * W.excitement.invC) + ((100 - N) * W.excitement.invN)).toFixed(1),
    competence:     +((C * W.competence.C) + ((100 - N) * W.competence.invN) + (O * W.competence.O) + ((100 - E) * W.competence.invE)).toFixed(1),
    sophistication: +(((100 - N) * W.sophistication.invN) + (O * W.sophistication.O) + ((100 - E) * W.sophistication.invE) + (A * W.sophistication.A) + (C * W.sophistication.C)).toFixed(1),
    ruggedness:     +(((100 - A) * W.ruggedness.invA) + ((100 - N) * W.ruggedness.invN) + (E * W.ruggedness.E) + ((100 - C) * W.ruggedness.invC)).toFixed(1)
  };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-3: Aaker + Dietrich → Archetype (Worker)
// Ref: derivation-algorithms.yaml §algorithm_3
// ═══════════════════════════════════════════════════════════════
const AAKER_ARCHETYPE_MAP = {
  sincerity: {
    archetypes: ['inocente', 'cuidador', 'cara-comum'],
    dietrich: { deliberada_cognitiva: 'cara-comum', deliberada_emocional: 'cuidador', espontanea_cognitiva: 'inocente', espontanea_emocional: 'cuidador' }
  },
  excitement: {
    archetypes: ['explorador', 'fora-da-lei', 'bobo-da-corte', 'mago'],
    dietrich: { deliberada_cognitiva: 'mago', deliberada_emocional: 'explorador', espontanea_cognitiva: 'fora-da-lei', espontanea_emocional: 'bobo-da-corte' }
  },
  competence: {
    archetypes: ['sábio', 'governante', 'herói'],
    dietrich: { deliberada_cognitiva: 'sábio', deliberada_emocional: 'herói', espontanea_cognitiva: 'sábio', espontanea_emocional: 'herói' }
  },
  sophistication: {
    archetypes: ['amante', 'governante', 'mago'],
    dietrich: { deliberada_cognitiva: 'governante', deliberada_emocional: 'amante', espontanea_cognitiva: 'mago', espontanea_emocional: 'amante' }
  },
  ruggedness: {
    archetypes: ['explorador', 'herói', 'fora-da-lei'],
    dietrich: { deliberada_cognitiva: 'herói', deliberada_emocional: 'explorador', espontanea_cognitiva: 'explorador', espontanea_emocional: 'fora-da-lei' }
  }
};

const ARCHETYPE_LABELS = {
  'inocente': { name: 'Inocente', emoji: '🕊️', desc: 'Busca pureza, simplicidade e otimismo' },
  'cuidador': { name: 'Cuidador', emoji: '🤲', desc: 'Protege, nutre e serve o próximo' },
  'cara-comum': { name: 'Cara Comum', emoji: '🤝', desc: 'Pertencimento, autenticidade, conexão real' },
  'explorador': { name: 'Explorador', emoji: '🧭', desc: 'Liberdade, descoberta, novos caminhos' },
  'fora-da-lei': { name: 'Fora-da-Lei', emoji: '⚡', desc: 'Rompe regras, desafia o status quo' },
  'bobo-da-corte': { name: 'Bobo da Corte', emoji: '🎭', desc: 'Alegria, leveza, humor que conecta' },
  'mago': { name: 'Mago', emoji: '✨', desc: 'Transformação, visão, possibilidades' },
  'sábio': { name: 'Sábio', emoji: '📚', desc: 'Conhecimento, verdade, compreensão profunda' },
  'governante': { name: 'Governante', emoji: '👑', desc: 'Ordem, controle, liderança estruturada' },
  'herói': { name: 'Herói', emoji: '🛡️', desc: 'Coragem, superação, impacto no mundo' },
  'amante': { name: 'Amante', emoji: '💎', desc: 'Paixão, estética, experiência sensorial' },
  'criador': { name: 'Criador', emoji: '🎨', desc: 'Inovação, expressão, dar forma ao novo' }
};

function calculateArchetype(aaker, dietrichType) {
  // Sort Aaker dimensions by score
  const sorted = Object.entries(aaker).sort((a, b) => b[1] - a[1]);
  const top1Key = sorted[0][0];
  const top2Key = sorted[1][0];
  const top1Score = sorted[0][1];
  const top2Score = sorted[1][1];

  // Resolve archetype via Dietrich refinement
  const map1 = AAKER_ARCHETYPE_MAP[top1Key];
  const map2 = AAKER_ARCHETYPE_MAP[top2Key];
  const primary = map1.dietrich[dietrichType] || map1.archetypes[0];
  let secondary = map2.dietrich[dietrichType] || map2.archetypes[0];
  // Secundário NUNCA pode repetir o primário — pegar alternativa da lista
  if (secondary === primary) {
    secondary = map2.archetypes.find(a => a !== primary) || map1.archetypes.find(a => a !== primary) || 'sabio';
  }

  // Calculate affinity as absolute fit strength (0-100)
  // Each Aaker dimension is already 0-100 (weighted sum, weights=1.0)
  // Score = how strongly this archetype fits you, not ranking vs runner-up
  const primaryAffinity = Math.round(top1Score);
  const secondaryAffinity = Math.round(top2Score);

  return {
    primary: { key: primary, ...(ARCHETYPE_LABELS[primary] || { name: primary, emoji: '🔮', desc: '' }), affinity: primaryAffinity, source: top1Key },
    secondary: { key: secondary, ...(ARCHETYPE_LABELS[secondary] || { name: secondary, emoji: '🔮', desc: '' }), affinity: secondaryAffinity, source: top2Key },
    aaker_dominant: top1Key,
    aaker_secondary: top2Key
  };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION — Dietrich 3 Modes (Worker)
// ═══════════════════════════════════════════════════════════════
function calculateDietrich3Modes(creatScores) {
  const delib = Math.round(((creatScores.deliberada_cognitiva || 0) + (creatScores.deliberada_emocional || 0)) / 2);
  const spont = Math.round(((creatScores.espontanea_cognitiva || 0) + (creatScores.espontanea_emocional || 0)) / 2);
  const fluxo = Math.round(Math.min(delib, spont) * SCORING_WEIGHTS.dietrich.fluxo);
  return { deliberado: delib, espontaneo: spont, fluxo };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-4: Profile → Panksepp 7 Affective Systems
// Ref: Panksepp (1998), weight factors from derivation-algorithms.yaml
// ═══════════════════════════════════════════════════════════════
function calculatePanksepp(ocean, intelScores, creatScores, dietrichDominant) {
  const { O, C, E, A, N } = ocean;
  const gInter = intelScores.interpessoal || 50;
  const gIntra = intelScores.intrapessoal || 50;
  const gCorp = intelScores['corporal_cinestesica'] || 50;
  const gEspac = intelScores['espacial_visual'] || 50;
  const gMusic = intelScores.musical || 50;
  const gardnerVariance = Math.round(Object.values(intelScores).reduce((s, v, _, a) => {
    const mean = a.reduce((x, y) => x + y, 0) / a.length;
    return s + (v - mean) ** 2;
  }, 0) / Object.values(intelScores).length);
  const gardnerVar01 = Math.min(gardnerVariance / 500, 100);
  const isSpontaneous = (dietrichDominant || '').startsWith('espontanea') ? 1 : 0;
  const isDeliberate = (dietrichDominant || '').startsWith('deliberada') ? 1 : 0;
  const isEmocional = (dietrichDominant || '').endsWith('emocional') ? 1 : 0;

  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  const PW = SCORING_WEIGHTS.panksepp;
  return {
    SEEKING:      clamp(O * PW.SEEKING.O + E * PW.SEEKING.E + gardnerVar01 * PW.SEEKING.gardnerVar + isSpontaneous * PW.SEEKING.spontBonus),
    CARE:         clamp(A * PW.CARE.A + gInter * PW.CARE.gInter + (100 - N) * PW.CARE.invN + E * PW.CARE.E),
    PLAY:         clamp(E * PW.PLAY.E + (100 - N) * PW.PLAY.invN + isSpontaneous * PW.PLAY.spontBonus + gCorp * PW.PLAY.gCorp),
    FEAR:         clamp(N * PW.FEAR.N + gIntra * PW.FEAR.gIntra + (100 - A) * PW.FEAR.invA + C * PW.FEAR.C),
    RAGE:         clamp((100 - A) * PW.RAGE.invA + N * PW.RAGE.N + E * PW.RAGE.E + isDeliberate * PW.RAGE.delibBonus),
    LUST:         clamp(O * PW.LUST.O + gCorp * PW.LUST.gCorp + isEmocional * PW.LUST.emocBonus + E * PW.LUST.E),
    PANIC_GRIEF:  clamp(N * PW.PANIC_GRIEF.N + A * PW.PANIC_GRIEF.A + gIntra * PW.PANIC_GRIEF.gIntra + (100 - E) * PW.PANIC_GRIEF.invE)
  };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-5: Panksepp → Plutchik Dyads
// Ref: Plutchik (1980), mapping heuristics from derivation-algorithms.yaml
// ═══════════════════════════════════════════════════════════════
const PLUTCHIK_DYADS = [
  { id: 'otimismo',          name: 'Energia visionária',           emoji: '🌟', components: 'Entusiasmo + Alegria',           condition: (p) => p.SEEKING >= 55 && p.PLAY >= 55, narrative: 'Você irradia uma energia contagiante de possibilidades — enxerga oportunidades onde outros veem obstáculos e transforma entusiasmo em ação.' },
  { id: 'amor',              name: 'Conexão genuína',              emoji: '💚', components: 'Alegria + Ternura',              condition: (p) => p.CARE >= 55 && p.FEAR < 50, narrative: 'Você cria vínculos reais com as pessoas. Sua presença transmite segurança e acolhimento — e isso é a base de marcas que geram lealdade verdadeira.' },
  { id: 'orgulho',           name: 'Força conquistadora',          emoji: '🦁', components: 'Irritação + Entusiasmo',         condition: (p) => p.RAGE >= 50 && p.SEEKING >= 55, narrative: 'Você transforma indignação em combustível. Sua energia combativa aliada à vontade de explorar cria uma marca que não pede permissão — ela conquista.' },
  { id: 'curiosidade',       name: 'Mente exploradora',            emoji: '🔍', components: 'Entusiasmo + Independência',     condition: (p) => p.SEEKING >= 55 && p.CARE < 50, narrative: 'Você é movido por uma busca incansável por respostas. Sua marca tem DNA de desbravador — sempre um passo à frente, questionando o convencional.' },
  { id: 'esperanca',         name: 'Estratégia com fé',            emoji: '🕊️', components: 'Entusiasmo + Cautela',           condition: (p) => p.SEEKING >= 50 && p.FEAR >= 40 && p.FEAR < 65, narrative: 'Você equilibra ambição com prudência. Sonha alto, mas calcula o caminho — uma combinação rara que inspira confiança em quem te acompanha.' },
  { id: 'tensao_criativa',   name: 'Tensão criativa',              emoji: '⚡', components: 'Alegria + Ansiedade',             condition: (p) => p.FEAR >= 55 && p.PLAY >= 50, narrative: 'Você vive entre o prazer de criar e a pressão de entregar. Essa tensão, quando canalizada, produz trabalhos excepcionais — é o desconforto que gera excelência.' },
  { id: 'questionamento',    name: 'Questionamento constante',     emoji: '🎭', components: 'Irritação + Cautela',            condition: (p) => p.RAGE >= 55 && p.SEEKING < 50, narrative: 'Você não aceita o superficial e desafia o status quo. Sua marca exige substância — e isso atrai pessoas que valorizam profundidade e autenticidade.' },
  { id: 'profundidade',      name: 'Profundidade emocional',       emoji: '🌧️', components: 'Solidão + Ternura',              condition: (p) => p.PANIC_GRIEF >= 55 && p.CARE >= 50, narrative: 'Você carrega uma sensibilidade rara que enxerga camadas onde outros veem superfície. Sua marca toca as pessoas porque vem de um lugar genuíno e profundo.' }
];

function calculatePlutchik(panksepp) {
  const matched = PLUTCHIK_DYADS
    .map(d => ({ ...d, strength: d.condition(panksepp) ? 1 : 0 }))
    .filter(d => d.strength > 0);

  if (matched.length === 0) {
    // Fallback: pick by strongest Panksepp pair
    const sorted = Object.entries(panksepp).sort((a, b) => b[1] - a[1]);
    const top1 = sorted[0][0], top2 = sorted[1][0];
    const fallback = PLUTCHIK_DYADS.find(d =>
      (top1 === 'SEEKING' && top2 === 'PLAY') || (top1 === 'PLAY' && top2 === 'SEEKING') ? d.id === 'otimismo' :
      (top1 === 'CARE') ? d.id === 'amor' :
      (top1 === 'SEEKING') ? d.id === 'curiosidade' :
      d.id === 'esperanca'
    ) || PLUTCHIK_DYADS[4]; // esperança as safe default
    matched.push(fallback);
  }

  return {
    primary: matched[0],
    secondary: matched[1] || null,
    all: matched
  };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-6: Profile → Bain Value Pyramid
// Ref: Bain & Company "Elements of Value" (2016)
// ═══════════════════════════════════════════════════════════════
const BAIN_VALUES = {
  functional: [
    { id: 'reduces_risk',   name: 'Redução de Risco',   emoji: '🛡️', condition: (p) => p.ocean.C >= 50 && p.panksepp.FEAR >= 40 },
    { id: 'organization',   name: 'Organização',        emoji: '📋', condition: (p) => p.ocean.C >= 50 && p.intel.logico_matematica >= 45 },
    { id: 'information',    name: 'Informação',         emoji: '📚', condition: (p) => p.ocean.O >= 45 && (p.intel.linguistica >= 45 || p.intel.logico_matematica >= 45) },
    { id: 'variety',        name: 'Variedade',          emoji: '🎨', condition: (p) => p.ocean.O >= 50 && p.panksepp.SEEKING >= 45 },
    { id: 'simplification', name: 'Simplificação',      emoji: '✂️', condition: (p) => p.ocean.C >= 45 && p.intel.linguistica >= 45 },
    { id: 'quality',        name: 'Qualidade',          emoji: '💎', condition: (p) => p.ocean.C >= 45 && p.ocean.N < 60 },
    { id: 'wellness',       name: 'Bem-estar',          emoji: '🧘', condition: (p) => p.intel['corporal_cinestesica'] >= 45 && p.ocean.A >= 40 },
    { id: 'fun',            name: 'Diversão',           emoji: '🎪', condition: (p) => p.panksepp.PLAY >= 45 && p.ocean.E >= 45 }
  ],
  emotional: [
    { id: 'belonging',      name: 'Pertencimento',      emoji: '🤝', condition: (p) => p.intel.interpessoal >= 45 && p.panksepp.CARE >= 40 },
    { id: 'anxiety_reduce', name: 'Redução de Ansiedade', emoji: '☮️', condition: (p) => p.intel.intrapessoal >= 50 && p.ocean.N >= 50 },
    { id: 'attractiveness', name: 'Atratividade',       emoji: '✨', condition: (p) => p.panksepp.SEEKING >= 45 && p.ocean.E >= 45 },
    { id: 'nostalgia',      name: 'Nostalgia',          emoji: '🌅', condition: (p) => p.panksepp.PANIC_GRIEF >= 45 && p.panksepp.CARE >= 40 },
    { id: 'design',         name: 'Design / Estética',  emoji: '🎭', condition: (p) => p.intel['espacial_visual'] >= 45 && p.ocean.O >= 45 },
    { id: 'therapeutic',    name: 'Terapêutico',        emoji: '💆', condition: (p) => p.intel.intrapessoal >= 45 && p.panksepp.FEAR >= 40 },
    { id: 'reward',         name: 'Recompensa',         emoji: '🏆', condition: (p) => p.panksepp.SEEKING >= 45 && p.ocean.C >= 45 }
  ],
  life_changing: [
    { id: 'self_actualize', name: 'Autorrealização',    emoji: '🌱', condition: (p) => p.intel.existencial >= 50 && p.panksepp.SEEKING >= 45 },
    { id: 'hope',           name: 'Esperança',          emoji: '🕊️', condition: (p) => p.ocean.O >= 50 && p.panksepp.CARE >= 45 },
    { id: 'motivation',     name: 'Motivação',          emoji: '🔥', condition: (p) => p.archetype === 'heroi' || p.archetype === 'explorador' },
    { id: 'affiliation',    name: 'Afiliação',          emoji: '👥', condition: (p) => p.ocean.E >= 50 && p.intel.interpessoal >= 45 },
    { id: 'legacy',         name: 'Legado',             emoji: '🏛️', condition: (p) => p.intel.existencial >= 50 && p.ocean.C >= 50 }
  ],
  social_impact: [
    { id: 'transcendence',  name: 'Autotranscendência', emoji: '🌍', condition: (p) => p.intel.existencial >= 55 && p.panksepp.CARE >= 50 },
    { id: 'contribution',   name: 'Contribuição Social', emoji: '💡', condition: (p) => p.intel.interpessoal >= 50 && p.ocean.A >= 50 }
  ]
};

function calculateBainValues(ocean, intelScores, panksepp, archetypeName) {
  // P0-4: Null guard — se arquétipo não calculado, retorna vazio em vez de crashar
  if (!archetypeName) return { levels: [], top5: [], total: 0 };
  // Normalize name → key: lowercase, remove accents
  const archKey = archetypeName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const profile = {
    ocean,
    intel: intelScores,
    panksepp,
    archetype: archKey
  };

  const result = {};
  let allMatched = [];

  for (const [level, values] of Object.entries(BAIN_VALUES)) {
    const matched = values.filter(v => v.condition(profile));
    result[level] = matched;
    allMatched = allMatched.concat(matched.map(v => ({ ...v, level })));
  }

  return { byLevel: result, top5: allMatched.slice(0, 5), total: allMatched.length };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-7: Profile → Core Drives Octalysis
// Ref: Yu-kai Chou, "Actionable Gamification" (2015)
// ═══════════════════════════════════════════════════════════════
const CORE_DRIVE_LABELS = [
  { id: 'CD1', name: 'Significado Épico',        emoji: '⭐', desc: 'Propósito maior que si mesmo' },
  { id: 'CD2', name: 'Realização & Maestria',    emoji: '🏆', desc: 'Progresso, conquista, competência' },
  { id: 'CD3', name: 'Criatividade & Feedback',  emoji: '🎨', desc: 'Criar, experimentar, iterar' },
  { id: 'CD4', name: 'Posse & Propriedade',      emoji: '🗝️', desc: 'Coletar, personalizar, acumular' },
  { id: 'CD5', name: 'Influência Social',        emoji: '👥', desc: 'Pertencimento, mentoria, competição' },
  { id: 'CD6', name: 'Escassez & Impaciência',   emoji: '⏳', desc: 'Desejo pelo raro, urgência' },
  { id: 'CD7', name: 'Imprevisibilidade',        emoji: '🔮', desc: 'Curiosidade, surpresa, mistério' },
  { id: 'CD8', name: 'Aversão à Perda',          emoji: '🛡️', desc: 'Medo de perder, preservação' }
];

const ARCHETYPE_CD_BONUS = {
  heroi:          { CD1: 10, CD2: 5 },
  sabio:          { CD1: 10, CD2: 5 },
  explorador:     { CD3: 10, CD7: 5 },
  'fora-da-lei':  { CD3: 10, CD7: 5 },
  governante:     { CD4: 10, CD2: 5 },
  cuidador:       { CD5: 10, CD1: 5 },
  'cara-comum':   { CD5: 10, CD1: 5 },
  mago:           { CD7: 10, CD3: 5 },
  'bobo-da-corte':{ CD7: 10, CD3: 5 },
  amante:         { CD5: 5,  CD1: 5 },
  inocente:       { CD1: 5,  CD5: 5 },
  criador:        { CD3: 10, CD2: 5 }
};

const CD_LABEL_MAP = {
  'CD1+CD2': 'Líder-Estrategista',   'CD1+CD3': 'Visionário-Criador',    'CD1+CD4': 'Guardião-Visionário',
  'CD1+CD5': 'Conector-Visionário',  'CD1+CD6': 'Urgente-Visionário',    'CD1+CD7': 'Explorador-Visionário',
  'CD1+CD8': 'Protetor-Visionário',  'CD2+CD1': 'Líder-Estrategista',    'CD2+CD3': 'Maestro-Inovador',
  'CD2+CD4': 'Construtor-Coletor',   'CD2+CD5': 'Maestro-Social',        'CD2+CD6': 'Competidor-Intenso',
  'CD2+CD7': 'Maestro-Explorador',   'CD2+CD8': 'Guardião-Estratégico',  'CD3+CD1': 'Criador-Visionário',
  'CD3+CD2': 'Maestro-Inovador',     'CD3+CD4': 'Criador-Colecionador',  'CD3+CD5': 'Criador-Social',
  'CD3+CD6': 'Criador-Urgente',      'CD3+CD7': 'Criador-Explorador',    'CD3+CD8': 'Criador-Cauteloso',
  'CD4+CD2': 'Construtor-Coletor',   'CD4+CD3': 'Colecionador-Criativo', 'CD4+CD5': 'Curador-Social',
  'CD4+CD6': 'Acumulador-Estratégico','CD4+CD7': 'Colecionador-Curioso', 'CD4+CD8': 'Guardião-Protetor',
  'CD5+CD1': 'Conector-Visionário',  'CD5+CD2': 'Social-Estratégico',    'CD5+CD3': 'Social-Criativo',
  'CD5+CD7': 'Social-Curioso',       'CD5+CD8': 'Social-Cauteloso',      'CD6+CD7': 'Caçador-Explorador',
  'CD6+CD8': 'Urgente-Protetor',     'CD7+CD3': 'Explorador-Criativo',   'CD7+CD5': 'Explorador-Social',
  'CD7+CD8': 'Explorador-Cauteloso', 'CD8+CD2': 'Guardião-Estratégico',  'CD8+CD6': 'Guardião-Urgente'
};

function calculateCoreDrives(ocean, intelScores, creatScores, panksepp, archetypeName) {
  const { O, C, E, A, N } = ocean;
  const gExist = intelScores.existencial || 50;
  const gLogic = intelScores.logico_matematica || 50;
  const gEspac = intelScores['espacial_visual'] || 50;
  const gIntra = intelScores.intrapessoal || 50;
  const gInter = intelScores.interpessoal || 50;
  const gNat = intelScores.naturalista || 50;

  const isSpontaneous = (Object.keys(creatScores).find(k => k.startsWith('espontanea') && creatScores[k] === Math.max(...Object.values(creatScores)))) ? 1 : 0;
  const isDeliberate = 1 - isSpontaneous;

  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const P = panksepp;

  const CW = SCORING_WEIGHTS.coreDrives;
  const base = {
    CD1: clamp(O * CW.CD1.O + P.CARE * CW.CD1.pCARE + gExist * CW.CD1.gExist + A * CW.CD1.A),
    CD2: clamp(C * CW.CD2.C + P.SEEKING * CW.CD2.pSEEKING + gLogic * CW.CD2.gLogic + isDeliberate * CW.CD2.delibBonus + (100 - N) * CW.CD2.invN),
    CD3: clamp(O * CW.CD3.O + isSpontaneous * CW.CD3.spontBonus + P.PLAY * CW.CD3.pPLAY + gEspac * CW.CD3.gEspac + (100 - C) * CW.CD3.invC),
    CD4: clamp(C * CW.CD4.C + (100 - A) * CW.CD4.invA + P.RAGE * CW.CD4.pRAGE + gIntra * CW.CD4.gIntra + (100 - O) * CW.CD4.invO),
    CD5: clamp(E * CW.CD5.E + A * CW.CD5.A + gInter * CW.CD5.gInter + P.CARE * CW.CD5.pCARE + (100 - N) * CW.CD5.invN),
    CD6: clamp(N * CW.CD6.N + P.SEEKING * CW.CD6.pSEEKING + C * CW.CD6.C + (100 - E) * CW.CD6.invE + (100 - P.PLAY) * CW.CD6.invPLAY),
    CD7: clamp(O * CW.CD7.O + P.SEEKING * CW.CD7.pSEEKING + gNat * CW.CD7.gNat + isSpontaneous * CW.CD7.spontBonus + (100 - C) * CW.CD7.invC),
    CD8: clamp(N * CW.CD8.N + P.FEAR * CW.CD8.pFEAR + C * CW.CD8.C + (100 - P.PLAY) * CW.CD8.invPLAY + A * CW.CD8.A)
  };

  // Apply archetype bonus (normalize name → key: lowercase, remove accents)
  // P0-4: Null guard — se archetypeName não existir, pula bonus
  const archKey = archetypeName ? archetypeName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  const bonus = ARCHETYPE_CD_BONUS[archKey] || {};
  for (const [cd, val] of Object.entries(bonus)) {
    if (base[cd] !== undefined) base[cd] = clamp(base[cd] + val);
  }

  // Sort and classify
  const sorted = Object.entries(base).sort((a, b) => b[1] - a[1]);
  const top2key = sorted[0][0] + '+' + sorted[1][0];
  const cdInfo1 = CORE_DRIVE_LABELS.find(d => d.id === sorted[0][0]) || { name: sorted[0][0] };
  const cdInfo2 = CORE_DRIVE_LABELS.find(d => d.id === sorted[1][0]) || { name: sorted[1][0] };
  const label = CD_LABEL_MAP[top2key] || cdInfo1.name.split(' ')[0] + ' + ' + cdInfo2.name.split(' ')[0];

  const whiteHat = Math.round((base.CD1 + base.CD2 + base.CD3) / 3);
  const blackHat = Math.round((base.CD6 + base.CD7 + base.CD8) / 3);
  const hatDiff = whiteHat - blackHat;
  const hatClass = hatDiff >= 10 ? 'whiteHat' : hatDiff <= -10 ? 'blackHat' : 'equilibrado';
  const hatLabel = hatClass === 'whiteHat' ? 'Propósito Dominante' : hatClass === 'blackHat' ? 'Urgência Dominante' : 'Equilibrado';

  return { drives: base, sorted, top3: sorted.slice(0, 3), label, whiteHat, blackHat, hatClass, hatLabel };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-8: Profile → UNNIKO Taxonomia Diferenciais
// Ref: Keller, Kapferer, Aaker, Sharp, Porter — Taxonomia Edu Garretano
// 3 Domínios × 9 Classes × 27 Ordens
// ═══════════════════════════════════════════════════════════════
const UNNIKO_TAXONOMY = {
  I: {
    name: 'Diferenciação Substantiva', emoji: '⚙️', desc: 'O que você FAZ de factualmente distinto',
    classes: [
      { id: 1, name: 'Produto/Serviço', orders: [
        { id: '1.1', name: 'Funcionalidade', pb: 'Metodologia proprietária' },
        { id: '1.2', name: 'Qualidade percebida', pb: 'Consistência de entregas' },
        { id: '1.3', name: 'Customização', pb: 'Adaptar frameworks ao cliente' },
        { id: '1.4', name: 'Escopo', pb: 'Amplitude vs. profundidade' },
        { id: '1.5', name: 'Design', pb: 'Qualidade visual do output' }
      ]},
      { id: 2, name: 'Modelo', orders: [
        { id: '2.1', name: 'Modelo de negócio', pb: 'Retainer vs. projeto' },
        { id: '2.2', name: 'Canal/Distribuição', pb: 'Canal principal' },
        { id: '2.3', name: 'Processo', pb: 'Framework documentado' },
        { id: '2.4', name: 'Velocidade', pb: 'Turnaround rápido' }
      ]},
      { id: 3, name: 'Evidência', orders: [
        { id: '3.1', name: 'Track record', pb: 'Resultados documentados' },
        { id: '3.2', name: 'Propriedade intelectual', pb: 'Modelo conceitual autoral' },
        { id: '3.3', name: 'Credenciais', pb: 'Certificações, publicações' },
        { id: '3.4', name: 'Social proof', pb: 'Depoimentos, endorsements' }
      ]}
    ]
  },
  II: {
    name: 'Diferenciação Simbólica', emoji: '✨', desc: 'O que você SIGNIFICA e faz sentir',
    classes: [
      { id: 4, name: 'Identidade Narrativa', orders: [
        { id: '4.1', name: 'Propósito/Tese central', pb: 'Visão de mundo que orienta' },
        { id: '4.2', name: 'Narrativa de origem', pb: 'Sua história como autoridade' },
        { id: '4.3', name: 'Ponto de vista', pb: 'Opinião forte e consistente' },
        { id: '4.4', name: 'Linguagem/Vocabulário', pb: 'Conceitos autorais' }
      ]},
      { id: 5, name: 'Personalidade', orders: [
        { id: '5.1', name: 'Tom de voz', pb: 'Estilo de escrita reconhecível' },
        { id: '5.2', name: 'Arquétipo dominante', pb: 'Postura arquetípica coerente' },
        { id: '5.3', name: 'Postura relacional', pb: 'Dinâmica com a audiência' }
      ]},
      { id: 6, name: 'Cultura e Valores', orders: [
        { id: '6.1', name: 'Valores declarados', pb: 'Valores que filtram decisões' },
        { id: '6.2', name: 'Comunidade', pb: 'Comunidade ao redor da marca' },
        { id: '6.3', name: 'Posicionamento cultural', pb: 'Identificação com uma cena' }
      ]}
    ]
  },
  III: {
    name: 'Distintividade', emoji: '🎯', desc: 'Como você é RECONHECIDA e lembrada',
    classes: [
      { id: 7, name: 'Ativos Visuais', orders: [
        { id: '7.1', name: 'Marca gráfica', pb: 'Logo pessoal, avatar' },
        { id: '7.2', name: 'Sistema cromático', pb: 'Paleta visual reconhecível' },
        { id: '7.3', name: 'Tipografia', pb: 'Estilo tipográfico' },
        { id: '7.4', name: 'Estilo visual', pb: 'Identidade visual postagens' },
        { id: '7.5', name: 'Personagem/Mascote', pb: 'Imagem do fundador' }
      ]},
      { id: 8, name: 'Ativos Sensoriais', orders: [
        { id: '8.1', name: 'Sonoro/Musical', pb: 'Vinheta de podcast' },
        { id: '8.2', name: 'Verbal/Linguístico', pb: 'Frase-assinatura, bordão' },
        { id: '8.3', name: 'Tátil/Material', pb: 'Qualidade do material' },
        { id: '8.4', name: 'Formato/Shape', pb: 'Formato recorrente de conteúdo' }
      ]},
      { id: 9, name: 'Ativos Comportamentais', orders: [
        { id: '9.1', name: 'Rituais de marca', pb: 'Série semanal, formato recorrente' },
        { id: '9.2', name: 'Estilo de interação', pb: 'Como responde a críticas' },
        { id: '9.3', name: 'Cadência', pb: 'Frequência previsível' }
      ]}
    ]
  }
};

function calculateDifferentiation(ocean, intelScores, aaker, coreDrives) {
  const gLogic = intelScores.logico_matematica || 50;
  const gExist = intelScores.existencial || 50;
  const gEspac = intelScores['espacial_visual'] || 50;
  const gMusic = intelScores.musical || 50;
  const gLing = intelScores.linguistica || 50;
  const gInter = intelScores.interpessoal || 50;
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  const DW = SCORING_WEIGHTS.diff;
  const domainI = clamp(gLogic * DW.domainI.gLogic + aaker.competence * DW.domainI.aCompetence + ocean.C * DW.domainI.C + (coreDrives?.drives?.CD2 || 50) * DW.domainI.CD2 + (100 - ocean.N) * DW.domainI.invN);
  const domainII = clamp(ocean.O * DW.domainII.O + aaker.excitement * DW.domainII.aExcitement + gExist * DW.domainII.gExist + gLing * DW.domainII.gLing + aaker.sincerity * DW.domainII.aSincerity + ocean.A * DW.domainII.A);
  const domainIII = clamp(gEspac * DW.domainIII.gEspac + gMusic * DW.domainIII.gMusic + aaker.sophistication * DW.domainIII.aSophistication + (coreDrives?.drives?.CD3 || 50) * DW.domainIII.CD3 + ocean.E * DW.domainIII.E + gInter * DW.domainIII.gInter);

  function recommendOrders(domainKey) {
    const rules = {
      I: [
        { id: '1.1', score: gLogic * 0.5 + ocean.O * 0.3 + aaker.competence * 0.2 },
        { id: '1.2', score: ocean.C * 0.5 + (100 - ocean.N) * 0.3 + aaker.competence * 0.2 },
        { id: '1.3', score: ocean.O * 0.4 + ocean.A * 0.3 + gInter * 0.3 },
        { id: '1.5', score: gEspac * 0.5 + ocean.O * 0.3 + aaker.sophistication * 0.2 },
        { id: '2.3', score: ocean.C * 0.4 + gLogic * 0.3 + aaker.competence * 0.3 },
        { id: '3.1', score: ocean.C * 0.4 + (100 - ocean.N) * 0.3 + aaker.competence * 0.3 },
        { id: '3.2', score: ocean.O * 0.4 + gLogic * 0.3 + ocean.C * 0.3 }
      ],
      II: [
        { id: '4.1', score: gExist * 0.4 + ocean.O * 0.3 + aaker.sincerity * 0.3 },
        { id: '4.2', score: gLing * 0.3 + ocean.O * 0.3 + (100 - ocean.N) * 0.2 + ocean.E * 0.2 },
        { id: '4.3', score: (100 - ocean.A) * 0.3 + ocean.O * 0.3 + aaker.excitement * 0.2 + aaker.ruggedness * 0.2 },
        { id: '4.4', score: gLing * 0.4 + ocean.O * 0.3 + aaker.excitement * 0.3 },
        { id: '5.1', score: gLing * 0.3 + ocean.O * 0.3 + ocean.E * 0.2 + aaker.excitement * 0.2 },
        { id: '5.2', score: 60 },
        { id: '6.1', score: ocean.A * 0.4 + ocean.C * 0.3 + aaker.sincerity * 0.3 },
        { id: '6.2', score: ocean.E * 0.4 + gInter * 0.3 + ocean.A * 0.3 }
      ],
      III: [
        { id: '7.1', score: gEspac * 0.5 + aaker.sophistication * 0.3 + ocean.C * 0.2 },
        { id: '7.2', score: gEspac * 0.4 + gMusic * 0.3 + aaker.sophistication * 0.3 },
        { id: '7.4', score: gEspac * 0.4 + ocean.O * 0.3 + aaker.excitement * 0.3 },
        { id: '8.1', score: gMusic * 0.5 + ocean.O * 0.3 + ocean.E * 0.2 },
        { id: '8.2', score: gLing * 0.4 + ocean.E * 0.3 + aaker.excitement * 0.3 },
        { id: '9.1', score: ocean.C * 0.4 + ocean.E * 0.3 + (100 - ocean.N) * 0.3 },
        { id: '9.3', score: ocean.C * 0.5 + (100 - ocean.N) * 0.3 + ocean.E * 0.2 }
      ]
    };
    return (rules[domainKey] || []).sort((a, b) => b.score - a.score).slice(0, 3).map(r => r.id);
  }

  function getOrderInfo(orderId) {
    for (const dom of Object.values(UNNIKO_TAXONOMY)) {
      for (const cls of dom.classes) {
        const order = cls.orders.find(o => o.id === orderId);
        if (order) return { ...order, className: cls.name };
      }
    }
    return { id: orderId, name: orderId, pb: '', className: '' };
  }

  const sorted = [
    { key: 'I', score: domainI, label: 'Substantiva' },
    { key: 'II', score: domainII, label: 'Simbólica' },
    { key: 'III', score: domainIII, label: 'Distintiva' }
  ].sort((a, b) => b.score - a.score);

  return {
    domains: { I: domainI, II: domainII, III: domainIII },
    sorted,
    styleLabel: sorted[0].label + '-' + sorted[1].label,
    recommendations: {
      I: recommendOrders('I').map(getOrderInfo),
      II: recommendOrders('II').map(getOrderInfo),
      III: recommendOrders('III').map(getOrderInfo)
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// VURS VALIDATOR — Quality Gate for Persona Claims
// V=Verdadeiro (score≥60), U=Único (not generic), R=Relevante, S=Sustentável (margin≥10)
// ═══════════════════════════════════════════════════════════════
const GENERIC_CLAIMS_BLACKLIST = [
  'criativo e inovador', 'líder nato', 'pensador fora da caixa', 'apaixonado por desafios',
  'orientado a resultados', 'multidisciplinar', 'visionário', 'empreendedor nato',
  'autodidata', 'perfeccionista', 'proativo', 'workaholic positivo',
  'comunicador nato', 'solucionador de problemas', 'estrategista nato'
];

// ═══════════════════════════════════════════════════════════════
// PERSONA SINTÉTICA — Geração Narrativa Determinística (E4.1-E4.3)
// ═══════════════════════════════════════════════════════════════

const OCEAN_TRANSLATE = {
  O_alto: 'Sua mente busca o novo — ideias, perspectivas, possibilidades',
  O_baixo: 'Você valoriza o que já funciona — estabilidade e praticidade',
  C_alto: 'Você tem uma disciplina natural que transforma planos em resultados',
  C_baixo: 'Você é flexível e adaptável — prefere improvisar a seguir roteiros rígidos',
  E_alto: 'Sua energia vem das pessoas — conectar, conversar, compartilhar',
  E_baixo: 'Seu mundo interior é rico — você recarrega em silêncio e profundidade',
  A_alto: 'Harmonia importa para você — busca consenso e cuida das relações',
  A_baixo: 'Você toma decisões com a cabeça, não com o coração dos outros',
  N_alto: 'Você sente as coisas com intensidade — o que é uma força quando canalizado',
  N_baixo: 'Você é emocionalmente estável — mantém a calma sob pressão'
};

const PANKSEPP_TRANSLATE = {
  SEEKING: 'busca por entendimento e novidade',
  CARE: 'cuidado genuíno com os outros',
  PLAY: 'leveza e prazer na interação',
  FEAR: 'cautela e sensibilidade ao risco',
  RAGE: 'determinação e energia para mudar o que incomoda',
  LUST: 'desejo por experiências sensoriais e estéticas',
  PANIC_GRIEF: 'profundidade emocional e capacidade de vínculo'
};

const DIETRICH_TRANSLATE = {
  deliberada_cognitiva: 'criatividade metódica — como um engenheiro que testa hipóteses',
  deliberada_emocional: 'criatividade intencional guiada por valores — como um líder inspirador',
  espontanea_cognitiva: 'momentos eureka — insights que surgem quando menos espera',
  espontanea_emocional: 'expressão autêntica e visceral — como um artista improvisando'
};

const PERSONA_NAME_PATTERNS = {
  sabio:       { prefix: ['O Estrategista','O Analista','O Visionário'], suffix: ['Silencioso','Profundo','Metódico'] },
  heroi:       { prefix: ['O Líder','O Executor','O Campeão'], suffix: ['Incansável','Corajoso','Determinado'] },
  explorador:  { prefix: ['O Desbravador','O Curioso','O Nômade'], suffix: ['Inquieto','Versátil','Aventureiro'] },
  criador:     { prefix: ['O Criador','O Artífice','O Inventor'], suffix: ['Visionário','Original','Ousado'] },
  mago:        { prefix: ['O Alquimista','O Transformador','O Mago'], suffix: ['Intuitivo','Misterioso','Potente'] },
  cuidador:    { prefix: ['O Guardião','O Mentor','O Curador'], suffix: ['Dedicado','Empático','Presente'] },
  rebelde:     { prefix: ['O Disruptor','O Provocador','O Rebelde'], suffix: ['Audaz','Iconoclasta','Intenso'] },
  bobo:        { prefix: ['O Comunicador','O Conector','O Animador'], suffix: ['Magnético','Espontâneo','Contagiante'] },
  amante:      { prefix: ['O Esteta','O Apaixonado','O Sensorial'], suffix: ['Envolvente','Elegante','Sensível'] },
  governante:  { prefix: ['O Diretor','O Comandante','O Estrategista'], suffix: ['Decisivo','Estruturado','Firme'] },
  inocente:    { prefix: ['O Otimista','O Idealista','O Luminoso'], suffix: ['Genuíno','Transparente','Puro'] },
  cara_comum:  { prefix: ['O Parceiro','O Confiável','O Autêntico'], suffix: ['Acessível','Constante','Prático'] }
};

function generatePersonaSynthetica(r) {
  const archName = r.archetype?.primary?.key || 'sabio';
  const profile = MBTI_PROFILES[r.mbti] || MBTI_PROFILES['INTJ'];
  const intelSorted = Object.entries(r.intelScores).sort((a,b) => b[1]-a[1]);
  const creatSorted = Object.entries(r.creatScores).sort((a,b) => b[1]-a[1]);
  const pankSorted = Object.entries(r.panksepp).sort((a,b) => b[1]-a[1]);

  // ── Nome criativo ──
  const patterns = PERSONA_NAME_PATTERNS[archName] || PERSONA_NAME_PATTERNS.sabio;
  const oIdx = r.ocean.O >= 65 ? 2 : r.ocean.O >= 40 ? 1 : 0;
  const eIdx = r.ocean.E >= 60 ? 0 : r.ocean.E >= 40 ? 1 : 2;
  const nome = patterns.prefix[oIdx] + ' ' + patterns.suffix[eIdx];
  const subtitulo = `${(r.archetype?.primary?.label || archName)} | ${r.mbti} | ${CREAT_NAMES[r.dietrichDominant]?.name?.split(' ')[0] || 'Deliberado'}`;
  const topOceanKeys = ['O','C','E','A','N'].sort((a,b) => r.ocean[b] - r.ocean[a]);
  const palavrasChave = [
    OCEAN_DETAILS[topOceanKeys[0]]?.name?.split(' ')[0] || topOceanKeys[0],
    INTEL_NAMES[intelSorted[0][0]]?.split('-')[0] || intelSorted[0][0],
    (r.archetype?.primary?.label || archName)
  ];

  // ── Seção 2: Sua Personalidade ──
  const oceanDescs = ['O','C','E','A','N'].map(k => {
    const key = k + (r.ocean[k] >= 55 ? '_alto' : '_baixo');
    return OCEAN_TRANSLATE[key];
  }).filter(Boolean);
  const topGardner = intelSorted.slice(0,3).map(([k]) => INTEL_NAMES[k] || k);
  const dietrichDesc = DIETRICH_TRANSLATE[r.dietrichDominant] || DIETRICH_TRANSLATE.deliberada_cognitiva;

  const quemVoceE = [
    `${oceanDescs[0]}. ${oceanDescs[2]}. Como ${r.mbti} (${profile.nick}), você combina essas características de forma única.`,
    `Suas inteligências mais fortes — ${topGardner[0]}, ${topGardner[1]} e ${topGardner[2]} — revelam um perfil cognitivo que processa o mundo de forma particular. ${oceanDescs[1]}.`,
    `Seu estilo criativo é marcado por ${dietrichDesc}. ${oceanDescs[3]}. ${oceanDescs[4]}.`
  ];

  // ── Seção 3: Como Você Funciona ──
  const topPank = pankSorted.slice(0,3).map(([k]) => PANKSEPP_TRANSLATE[k] || k);
  const plutchikName = r.plutchik?.primary?.name || 'otimismo';
  const aaker5d = r.aaker ? Object.entries(r.aaker).sort((a,b) => b[1]-a[1]) : [];
  const topAaker = aaker5d.slice(0,2).map(([k]) => k);
  const bainTop = r.bainValues?.top5?.slice(0,3).map(v => v.name) || [];

  const comoFunciona = [
    `Emocionalmente, você é movido por ${topPank[0]}, ${topPank[1]} e ${topPank[2]}. Essa combinação cria uma assinatura emocional de ${plutchikName} — uma energia que as pessoas sentem ao interagir com você.`,
    `Sua marca transmite ${topAaker[0] || 'competência'} e ${topAaker[1] || 'sinceridade'}${bainTop.length > 0 ? `. Os valores que você entrega ao mundo incluem ${bainTop.join(', ')}` : ''}.`
  ];

  // ── Seção 4: Persona Sintética ──
  const personaSintetica = [
    `Você é ${nome} — um perfil ${r.archetype?.primary?.label || archName} que combina ${topGardner[0].toLowerCase()} com ${(CREAT_NAMES[r.dietrichDominant]?.name || 'criatividade').toLowerCase()}. Essa fusão é rara e poderosa.`,
    `As pessoas percebem em você ${r.ocean.E >= 55 ? 'uma presença magnética que inspira ação' : 'uma profundidade silenciosa que transmite autoridade'}. Seu superpoder de marca pessoal é ${r.ocean.O >= 65 ? 'transformar ideias abstratas em visões concretas' : r.ocean.C >= 65 ? 'transformar caos em estrutura com precisão cirúrgica' : r.ocean.A >= 65 ? 'criar conexões genuínas que geram confiança imediata' : 'sua capacidade de manter o foco no que realmente importa'}.`
  ];

  // ── Seção 5: Marca Pessoal ──
  const forcas = [];
  if (r.ocean.O >= 60) forcas.push({ titulo: 'Mente Aberta', desc: 'Sua abertura a experiências permite inovação constante e adaptação rápida.' });
  if (r.ocean.C >= 60) forcas.push({ titulo: 'Disciplina Natural', desc: 'Sua conscienciosidade transforma intenções em resultados concretos e mensuráveis.' });
  if (r.ocean.E >= 60) forcas.push({ titulo: 'Energia Social', desc: 'Sua extroversão cria conexões que amplificam seu alcance e influência.' });
  if (r.ocean.A >= 60) forcas.push({ titulo: 'Ponte Humana', desc: 'Sua amabilidade constrói confiança e lealdade nas relações profissionais.' });
  if (intelSorted[0][1] >= 65) forcas.push({ titulo: `Inteligência ${topGardner[0]}`, desc: `Seu domínio em ${topGardner[0].toLowerCase()} é um diferencial competitivo autêntico.` });
  if (forcas.length < 3) forcas.push({ titulo: 'Autenticidade', desc: 'Seu perfil único é em si um diferencial — não tente ser o que não é.' });

  const pontosCegos = [];
  if (r.ocean.N >= 60) pontosCegos.push({ titulo: 'Intensidade Emocional', desc: 'Sua sensibilidade é uma força, mas pode gerar desgaste se não for canalizada.' });
  if (r.ocean.E < 40) pontosCegos.push({ titulo: 'Visibilidade', desc: 'Seu rico mundo interior pode ficar invisível — invista em formatos que mostrem sua profundidade.' });
  if (r.ocean.C < 40) pontosCegos.push({ titulo: 'Consistência', desc: 'Sua flexibilidade pode ser vista como falta de foco — crie um sistema mínimo de rotina criativa.' });
  if (r.ocean.A < 40) pontosCegos.push({ titulo: 'Conexão Emocional', desc: 'Sua objetividade é eficiente, mas pode afastar pessoas que precisam de empatia explícita.' });
  if (pontosCegos.length < 2) pontosCegos.push({ titulo: 'Zona de Conforto', desc: 'Toda força tem um ângulo cego — observe onde seu ponto forte vira previsibilidade.' });

  const acoes = [
    { acao: `Crie conteúdo que destaque sua ${topGardner[0].toLowerCase()}`, justificativa: 'Autenticidade atrai audiência qualificada.' },
    { acao: `Use seu tom ${(r.voiceDNA?.tone || 'analítico').toLowerCase()} como assinatura`, justificativa: 'Consistência de voz constrói reconhecimento.' },
    { acao: `Posicione-se como ${(r.archetype?.primary?.label || archName)} no seu nicho`, justificativa: 'Arquétipos geram conexão inconsciente.' }
  ];
  if (r.ocean.E >= 55) acoes.push({ acao: 'Participe de eventos e podcasts como convidado', justificativa: 'Sua presença social é um ativo.' });
  else acoes.push({ acao: 'Invista em conteúdo escrito profundo e newsletters', justificativa: 'Profundidade é seu diferencial comunicativo.' });

  return { nome, subtitulo, palavrasChave, quemVoceE, comoFunciona, personaSintetica, forcas: forcas.slice(0,5), pontosCegos: pontosCegos.slice(0,3), acoes: acoes.slice(0,5) };
}

// ═══════════════════════════════════════════════════════════════
// JORNADA DO HERÓI — Teoria dos Metais (E4.4)
// ═══════════════════════════════════════════════════════════════

const JORNADA_ESTAGIOS = {
  descoberta: {
    id: 'descoberta', metal: 'ferro', nome: 'Fase Descoberta', icone: '🌱',
    desc: 'Você está explorando quem é como marca pessoal. Há muitas possibilidades abertas e isso é natural — cada teste, cada tentativa, constrói a fundação do que virá.',
    proximo: 'Identifique seus 2-3 pontos fortes mais consistentes e comece a comunicar apenas eles. Foco é seu próximo passo.',
    acoes: ['Escolha 3 temas que você domina e fale só sobre eles por 30 dias', 'Peça feedback a 5 pessoas próximas: "Com o que você me associa?"', 'Crie um bio de 1 linha que resuma seu posicionamento atual']
  },
  construcao: {
    id: 'construcao', metal: 'bronze', nome: 'Fase Construção', icone: '🔨',
    desc: 'Você já sabe o que tem de especial — suas forças estão claras. O desafio agora é transformar habilidades em posicionamento: como as pessoas percebem você?',
    proximo: 'Alinhe como você é percebido com como quer ser percebido. Consistência entre canais é seu próximo salto.',
    acoes: ['Audite seus perfis: a mesma mensagem aparece em todos?', 'Crie um "manual de marca pessoal" com tom, visual e mensagens-chave', 'Escolha 1 formato de conteúdo e seja consistente por 60 dias']
  },
  influencia: {
    id: 'influencia', metal: 'prata', nome: 'Fase Influência', icone: '⭐',
    desc: 'Sua marca já é reconhecida — as pessoas sabem quem você é e o que entrega. O risco agora é crescer perdendo essência, ou adaptar-se tanto ao mercado que sua voz original se dilui.',
    proximo: 'Proteja sua autenticidade enquanto escala. Diga mais "não" para preservar o que te trouxe até aqui.',
    acoes: ['Defina seus "inegociáveis" — o que você nunca faria por engajamento', 'Crie rituais de criação que preservem sua voz original', 'Mentor alguém — ensinar cristaliza o que você realmente acredita']
  },
  autenticidade: {
    id: 'autenticidade', metal: 'ouro', nome: 'Fase Autenticidade', icone: '💎',
    desc: 'Você alcançou o alinhamento raro onde essência e aparência são uma coisa só. Sua marca pessoal não é uma performance — é simplesmente quem você é. As pessoas sentem isso.',
    proximo: 'Seu próximo passo não é crescer mais, é aprofundar. Deixe um legado que transcenda métricas.',
    acoes: ['Documente seus princípios para quem vem depois de você', 'Crie algo que exista independentemente de você (método, comunidade, movimento)', 'Use sua influência para elevar outros — isso amplifica sua marca de forma orgânica']
  }
};

function calculateJornada(r) {
  // Coerência interna: quanto mais alinhados os scores, mais evoluída a marca
  const ocean = r.ocean;

  // 1. Clareza MBTI (quanto mais polarizado, mais claro o perfil)
  const polaridade = [r.mindE, r.energyN, r.natureT, r.tacticsJ].map(v => Math.abs(v - 50));
  const clarezaMbti = polaridade.reduce((a,b) => a+b, 0) / 4; // 0-50 range

  // 2. Coerência OCEAN-Aaker (correlação entre traços e dimensões de marca)
  const oceanArr = [ocean.O, ocean.C, ocean.E, ocean.A, ocean.N];
  const aaker = r.aaker || {};
  const aaker5 = [aaker.sincerity||50, aaker.excitement||50, aaker.competence||50, aaker.sophistication||50, aaker.ruggedness||50];
  const oceanVar = Math.sqrt(oceanArr.map(v => (v - oceanArr.reduce((a,b)=>a+b,0)/5)**2).reduce((a,b)=>a+b,0)/5);
  const aakerVar = Math.sqrt(aaker5.map(v => (v - aaker5.reduce((a,b)=>a+b,0)/5)**2).reduce((a,b)=>a+b,0)/5);
  const coerencia = 100 - (Math.abs(oceanVar - aakerVar)); // 0-100, higher = more aligned

  // 3. Força do Archetype (clareza do tipo dominante)
  const archScore = r.archetype?.primary?.affinity || 50;

  // 4. Voice DNA alignment (se tom é coerente com perfil)
  const voiceAlignment = r.voiceDNA ? 70 : 40; // simplified — voice exists = aligned

  // 5. Differentiation clarity
  const diffDomains = r.differentiation?.domains || {};
  const diffMax = Math.max(diffDomains.I||0, diffDomains.II||0, diffDomains.III||0);

  // Composite score 0-100
  const jornadaScore = Math.round(
    clarezaMbti * 0.20 * 2 +  // normalized to 0-100 range (max 50 * 2)
    coerencia * 0.25 +
    archScore * 0.20 +
    voiceAlignment * 0.15 +
    diffMax * 0.20
  );

  let estagio;
  if (jornadaScore >= 75) estagio = 'autenticidade';
  else if (jornadaScore >= 55) estagio = 'influencia';
  else if (jornadaScore >= 35) estagio = 'construcao';
  else estagio = 'descoberta';

  return {
    estagio,
    score: jornadaScore,
    detalhes: JORNADA_ESTAGIOS[estagio],
    allEstagios: ['descoberta','construcao','influencia','autenticidade']
  };
}

// ═══════════════════════════════════════════════════════════════
// E5 — COLLECTIVE ENGINE (Agregação + K-Means + Personas de Grupo)
// ═══════════════════════════════════════════════════════════════

// ── Statistical utilities ──
function statMedian(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a-b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid-1] + s[mid]) / 2;
}
function statStdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
  return Math.sqrt(arr.map(v => (v - mean) ** 2).reduce((a,b) => a+b, 0) / arr.length);
}
function statMode(arr) {
  const freq = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a,b) => b[1] - a[1])[0]?.[0] || null;
}

function collectiveAggregate(profiles) {
  if (!profiles || profiles.length < 2) return null;
  const oceanKeys = ['O','C','E','A','N'];
  const oceanAgg = {};
  oceanKeys.forEach(k => {
    const vals = profiles.map(p => p.ocean?.[k]).filter(v => v != null);
    oceanAgg[k] = { median: Math.round(statMedian(vals)), stdDev: Math.round(statStdDev(vals)), n: vals.length };
  });

  const mbtiDist = {};
  profiles.forEach(p => { if (p.mbti) { mbtiDist[p.mbti] = (mbtiDist[p.mbti] || 0) + 1; } });
  const mbtiSorted = Object.entries(mbtiDist).sort((a,b) => b[1] - a[1]);

  // Gardner aggregation
  const allIntelKeys = new Set();
  profiles.forEach(p => { if (p.intelScores) Object.keys(p.intelScores).forEach(k => allIntelKeys.add(k)); });
  const gardnerAgg = {};
  allIntelKeys.forEach(k => {
    const vals = profiles.map(p => p.intelScores?.[k]).filter(v => v != null);
    gardnerAgg[k] = { median: Math.round(statMedian(vals)), stdDev: Math.round(statStdDev(vals)) };
  });
  const gardnerTop3 = Object.entries(gardnerAgg).sort((a,b) => b[1].median - a[1].median).slice(0,3);

  return { n: profiles.length, ocean: oceanAgg, mbtiDist: mbtiSorted, gardnerTop3, gardnerAgg };
}

// ── K-Means (pure JS, K-means++ init) ──
function kmeansCluster(profiles, maxK = 4) {
  if (!profiles || profiles.length < 4) return null;
  const oceanKeys = ['O','C','E','A','N'];
  const data = profiles.map(p => oceanKeys.map(k => p.ocean?.[k] || 50));

  function dist(a, b) { return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0)); }
  function mean(points) {
    const d = points[0].length;
    const m = new Array(d).fill(0);
    points.forEach(p => p.forEach((v, i) => { m[i] += v; }));
    return m.map(v => v / points.length);
  }

  // K-means++ initialization
  function initPP(data, k) {
    const centers = [data[Math.floor(Math.random() * data.length)]];
    for (let c = 1; c < k; c++) {
      const dists = data.map(p => Math.min(...centers.map(ctr => dist(p, ctr) ** 2)));
      const sum = dists.reduce((a,b) => a+b, 0);
      let r = Math.random() * sum, acc = 0;
      for (let i = 0; i < dists.length; i++) {
        acc += dists[i];
        if (acc >= r) { centers.push(data[i]); break; }
      }
    }
    return centers;
  }

  function runKmeans(data, k, maxIter = 50) {
    let centers = initPP(data, k);
    let assignments = new Array(data.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      const newAssign = data.map(p => {
        let best = 0, bestD = Infinity;
        centers.forEach((c, i) => { const d2 = dist(p, c); if (d2 < bestD) { bestD = d2; best = i; } });
        return best;
      });
      if (newAssign.every((v, i) => v === assignments[i])) break;
      assignments = newAssign;
      centers = [];
      for (let i = 0; i < k; i++) {
        const pts = data.filter((_, j) => assignments[j] === i);
        centers.push(pts.length > 0 ? mean(pts) : initPP(data, 1)[0]);
      }
    }
    // Silhouette score
    let silTotal = 0;
    data.forEach((p, i) => {
      const myCluster = assignments[i];
      const sameCluster = data.filter((_, j) => j !== i && assignments[j] === myCluster);
      const a = sameCluster.length > 0 ? sameCluster.reduce((s, q) => s + dist(p, q), 0) / sameCluster.length : 0;
      let minB = Infinity;
      for (let c = 0; c < centers.length; c++) {
        if (c === myCluster) continue;
        const other = data.filter((_, j) => assignments[j] === c);
        if (other.length > 0) {
          const b = other.reduce((s, q) => s + dist(p, q), 0) / other.length;
          if (b < minB) minB = b;
        }
      }
      if (minB === Infinity) minB = 0;
      silTotal += (Math.max(a, minB) === 0 ? 0 : (minB - a) / Math.max(a, minB));
    });
    return { k, assignments, centers, silhouette: silTotal / data.length };
  }

  // Elbow: try k=2..maxK, pick best silhouette
  let best = null;
  for (let k = 2; k <= Math.min(maxK, Math.floor(data.length / 2)); k++) {
    const result = runKmeans(data, k);
    if (!best || result.silhouette > best.silhouette) best = result;
  }

  // Build cluster profiles
  const clusters = [];
  for (let c = 0; c < best.k; c++) {
    const members = profiles.filter((_, i) => best.assignments[i] === c);
    if (members.length === 0) continue;
    const agg = collectiveAggregate(members);
    const mbtiMode = statMode(members.map(m => m.mbti));
    clusters.push({ id: c, size: members.length, aggregate: agg, mbtiMode, center: best.centers[c] });
  }

  // Tension points: dimensions where clusters differ by >= 15
  const tensions = [];
  for (let d = 0; d < oceanKeys.length; d++) {
    const vals = clusters.map(cl => cl.center[d]);
    const range = Math.max(...vals) - Math.min(...vals);
    if (range >= 15) tensions.push({ dimension: oceanKeys[d], range: Math.round(range), values: vals.map(v => Math.round(v)) });
  }

  return { k: best.k, silhouette: Math.round(best.silhouette * 100) / 100, clusters, tensions };
}

// ═══════════════════════════════════════════════════════════════
// E6 — AGENT TRANSLATION (Persona → Agente AIOS)
// ═══════════════════════════════════════════════════════════════

const ARCH_SENTENCE_STARTERS = {
  sabio: ['Analisando os dados...', 'A evidência sugere que...', 'Do ponto de vista lógico...'],
  heroi: ['Vamos direto ao ponto:', 'O que precisa ser feito é...', 'Sem rodeios:'],
  explorador: ['Olha que interessante:', 'E se a gente tentasse...', 'Isso me lembra de...'],
  criador: ['Imagina isso:', 'A forma visual seria...', 'Vou criar uma abordagem...'],
  mago: ['Transformando a perspectiva:', 'O que não é óbvio aqui é...', 'A chave escondida é...'],
  cuidador: ['Pensando em como ajudar:', 'O que importa para as pessoas é...', 'Vamos cuidar de...'],
  rebelde: ['Vou ser direto:', 'Isso não funciona porque...', 'A verdade incômoda é...'],
  bobo: ['Bom, olha só:', 'Deixa eu te contar:', 'Sabe o que é engraçado?'],
  amante: ['Sinta isso:', 'A experiência deveria ser...', 'O que toca as pessoas é...'],
  governante: ['A decisão é clara:', 'Estrategicamente falando:', 'O plano é o seguinte:'],
  inocente: ['Acredito que podemos:', 'O caminho mais simples é...', 'Com otimismo:'],
  cara_comum: ['Na prática:', 'O que funciona é...', 'Sem complicar:']
};

function validateVURS(claim, score, margin, context) {
  const results = {
    V: { pass: score >= 60, reason: score >= 60 ? 'Score suporta claim' : `Score ${score} < 60 — insuficiente` },
    U: { pass: !GENERIC_CLAIMS_BLACKLIST.some(g => claim.toLowerCase().includes(g)), reason: '' },
    R: { pass: true, reason: 'Contexto válido' },
    S: { pass: margin >= 10, reason: margin >= 10 ? 'Margem suficiente' : `Margem ${margin} < 10 — usar "tendência" em vez de afirmação` }
  };
  results.U.reason = results.U.pass ? 'Claim específico' : 'Claim genérico — na blacklist';
  const allPass = results.V.pass && results.U.pass && results.R.pass && results.S.pass;
  return { claim, allPass, results, suggestion: !results.S.pass ? claim.replace(/^é |^tem /i, 'tende a ') : claim };
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION ENGINE — ALG-9: Voice DNA
// Archetype → Tom base + OCEAN modifiers + Dietrich style + Panksepp energy
// ═══════════════════════════════════════════════════════════════
const VOICE_ARCHETYPE_MAP = {
  sabio:          { tone: 'Analítico, preciso', register: 'Formal-médio', energy: 'Calma intelectual' },
  heroi:          { tone: 'Assertivo, direto', register: 'Direto', energy: 'Alta determinação' },
  explorador:     { tone: 'Curioso, leve', register: 'Informal', energy: 'Inquieta' },
  criador:        { tone: 'Expressivo, visual', register: 'Livre', energy: 'Criativa intensa' },
  mago:           { tone: 'Expressivo, visual', register: 'Livre', energy: 'Mística' },
  cuidador:       { tone: 'Acolhedor, empático', register: 'Suave', energy: 'Nutritiva' },
  'fora-da-lei':  { tone: 'Provocativo, ousado', register: 'Informal-intenso', energy: 'Rebelde' },
  'bobo-da-corte':{ tone: 'Irreverente, leve', register: 'Informal-leve', energy: 'Lúdica' },
  amante:         { tone: 'Sensual, envolvente', register: 'Suave-intenso', energy: 'Apaixonada' },
  governante:     { tone: 'Autoritativo, seguro', register: 'Formal', energy: 'Controlada' },
  inocente:       { tone: 'Otimista, simples', register: 'Acessível', energy: 'Leve' },
  'cara-comum':   { tone: 'Próximo, acessível', register: 'Coloquial', energy: 'Equilibrada' }
};

const VOICE_WORDS_MAP = {
  sabio:          { use: ['análise', 'dados', 'framework', 'evidência', 'sistema'], avoid: ['achismo', 'vibe', 'sinto que', 'talvez', 'não sei'] },
  heroi:          { use: ['conquista', 'meta', 'resultado', 'ação', 'superar'], avoid: ['esperar', 'talvez', 'delicado', 'frágil', 'medo'] },
  explorador:     { use: ['descoberta', 'possibilidade', 'jornada', 'horizonte', 'novo'], avoid: ['sempre foi assim', 'regra', 'obrigação', 'rotina', 'padrão'] },
  criador:        { use: ['criar', 'design', 'visão', 'protótipo', 'arte'], avoid: ['cópia', 'template', 'genérico', 'padrão', 'normal'] },
  mago:           { use: ['transformar', 'visão', 'possibilidade', 'magia', 'alquimia'], avoid: ['impossível', 'limitação', 'realista', 'óbvio', 'simples'] },
  cuidador:       { use: ['cuidar', 'apoiar', 'juntos', 'nós', 'comunidade'], avoid: ['competição', 'sozinho', 'individualismo', 'ego', 'ranking'] },
  'fora-da-lei':  { use: ['quebrar', 'desafiar', 'revolucionar', 'questionar', 'coragem'], avoid: ['conformidade', 'regra', 'tradição', 'seguro', 'aprovação'] },
  'bobo-da-corte':{ use: ['brincar', 'rir', 'leveza', 'diversão', 'absurdo'], avoid: ['sério', 'formal', 'protocolo', 'gravidade', 'pesado'] },
  amante:         { use: ['paixão', 'conexão', 'intimidade', 'desejo', 'beleza'], avoid: ['racional', 'frio', 'distante', 'mecânico', 'objetivo'] },
  governante:     { use: ['liderar', 'controlar', 'excelência', 'padrão', 'estratégia'], avoid: ['caos', 'improvisação', 'descontrole', 'amador', 'tentativa'] },
  inocente:       { use: ['simples', 'verdade', 'felicidade', 'pureza', 'esperança'], avoid: ['complexo', 'manipulação', 'cinismo', 'sarcasmo', 'ironia'] },
  'cara-comum':   { use: ['real', 'gente', 'dia a dia', 'prático', 'honesto'], avoid: ['elite', 'exclusivo', 'sofisticado', 'premium', 'luxo'] }
};

const VOICE_PATTERNS_MAP = {
  sabio:          ['Segundo [dado/fonte]...', 'A análise mostra que...', 'O padrão sugere...'],
  heroi:          ['Vamos conquistar...', 'O caminho é...', 'Hora de agir:'],
  explorador:     ['E se tentássemos...?', 'Descobri que...', 'Existe um caminho...'],
  criador:        ['Imagine...', 'Vamos criar...', 'A visão é...'],
  mago:           ['A transformação começa quando...', 'Veja além de...', 'A chave é...'],
  cuidador:       ['Juntos, podemos...', 'Você não está sozinho em...', 'Nós entendemos que...'],
  'fora-da-lei':  ['Esqueça o que te disseram sobre...', 'A verdade que ninguém conta:', 'Hora de quebrar...'],
  'bobo-da-corte':['Plot twist:', 'Spoiler:', 'Confissão:'],
  amante:         ['Sinta...', 'Conecte-se com...', 'A beleza está em...'],
  governante:     ['A estratégia é clara:', 'O padrão de excelência é...', 'Decidi que...'],
  inocente:       ['É simples:', 'A verdade é que...', 'Acredite:'],
  'cara-comum':   ['Na real,', 'Vou ser direto:', 'No dia a dia,']
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE LAYER — Archetype Tone Calibration
// From: archetype-tone-calibration.yaml (12 archetypes)
// ═══════════════════════════════════════════════════════════════
const ARCHETYPE_CALIBRATION = {
  sabio:          { tom: 'Reflexivo, profundo, contemplativo', vocabulario: ['entender','decifrar','mapear','investigar','compreender'], metaforas: ['laboratório','biblioteca','lente de aumento','mapa','bússola interna'], registro: 'Frases mais longas, pausadas, com camadas de significado', exemplo: 'Sua mente funciona como um laboratório interno — cada experiência é um experimento, cada conversa, dados para análise.' },
  explorador:     { tom: 'Dinâmico, aberto, aventureiro', vocabulario: ['descobrir','experimentar','expandir','desbravar','explorar'], metaforas: ['viagem','horizonte','território desconhecido','trilha','mochila'], registro: 'Frases curtas e energéticas, ritmo rápido, verbos de ação', exemplo: 'Você coleciona experiências como outros colecionam selos — cada nova descoberta é combustível para a próxima.' },
  cuidador:       { tom: 'Acolhedor, conectado, nutritivo', vocabulario: ['nutrir','proteger','construir juntos','cultivar','cuidar'], metaforas: ['jardim','lar','ponte','raízes','abrigo'], registro: 'Frases calorosas, inclusivas, tom de proximidade', exemplo: 'Você é daqueles que percebem quando alguém na sala está desconfortável — e fazem algo a respeito sem esperar que peçam.' },
  criador:        { tom: 'Inventivo, expressivo, visionário', vocabulario: ['moldar','transformar','criar','dar forma','materializar'], metaforas: ['atelier','paleta de cores','argila','tela em branco','protótipo'], registro: 'Linguagem sensorial, visual, tangível', exemplo: 'Onde outros veem um problema, você vê matéria-prima — algo para moldar, transformar, reinventar.' },
  heroi:          { tom: 'Determinado, corajoso, direto', vocabulario: ['superar','conquistar','liderar','enfrentar','vencer'], metaforas: ['arena','montanha','escudo','campo de batalha','fortaleza'], registro: 'Frases assertivas, curtas, com peso — cada palavra conta', exemplo: 'Você não recua diante de um desafio — você calcula o risco, monta a estratégia, e avança.' },
  mago:           { tom: 'Visionário, transformador, revelador', vocabulario: ['catalisar','revelar','alquimia','transmutar','despertar'], metaforas: ['portal','elixir','metamorfose','alquimia','revelação'], registro: 'Linguagem elevada mas acessível, tom de quem sabe algo que outros não veem', exemplo: 'Você tem essa habilidade de olhar para o caos e enxergar a ordem que está prestes a emergir.' },
  rebelde:        { tom: 'Provocador, autêntico, sem filtro', vocabulario: ['romper','questionar','desafiar','sacudir','libertar'], metaforas: ['fogo','fronteira','manifesto','revolução','território proibido'], registro: 'Direto, provocativo, quebra de expectativa', exemplo: 'Quando alguém diz "sempre foi assim", algo dentro de você se rebela — e geralmente com razão.' },
  amante:         { tom: 'Sensorial, intenso, envolvente', vocabulario: ['sentir','absorver','imergir','conectar','saborear'], metaforas: ['oceano','textura','sabor','magnetismo','dança'], registro: 'Linguagem rica em sensações, ritmo fluido', exemplo: 'Você não apenas ouve música — você sente cada nota no corpo. Essa intensidade se estende a tudo que faz.' },
  bobo:           { tom: 'Leve, espontâneo, surpreendente', vocabulario: ['brincar','surpreender','improvisar','rir','inventar'], metaforas: ['palco','festa','mágica de rua','comédia','plot twist'], registro: 'Ritmo imprevisível, humor inteligente, linguagem de conversa', exemplo: 'Você é a pessoa que transforma uma reunião chata numa sessão produtiva — só porque mudou a energia da sala.' },
  cara_comum:     { tom: 'Acessível, genuíno, sem pretensão', vocabulario: ['pertencer','compartilhar','simplificar','juntos','real'], metaforas: ['vizinhança','mesa de jantar','conversa de portão','chão firme'], registro: 'Coloquial, próximo, sem palavras difíceis', exemplo: 'Você faz as pessoas se sentirem em casa — não pela decoração, mas pela forma como ouve sem julgar.' },
  governante:     { tom: 'Estruturado, assertivo, confiante', vocabulario: ['organizar','decidir','estabelecer','comandar','estruturar'], metaforas: ['trono','mapa estratégico','fundação','torre de controle','xadrez'], registro: 'Frases bem construídas, autoridade natural, sem enrolação', exemplo: 'Quando você entra num projeto, a primeira coisa que faz é criar ordem — e os outros naturalmente seguem.' },
  inocente:       { tom: 'Otimista, puro, esperançoso', vocabulario: ['acreditar','confiar','simplificar','iluminar','renovar'], metaforas: ['aurora','caminho de luz','jardim limpo','dia claro','recomeço'], registro: 'Frases claras, positivas, sem cinismo', exemplo: 'Você tem essa capacidade rara de olhar para uma situação complicada e enxergar o caminho mais simples — e geralmente está certo.' }
};

// Key normalization: maps archetype keys used in codebase to ARCHETYPE_CALIBRATION keys
function _archCalibKey(key) {
  const map = { 'fora-da-lei': 'rebelde', 'fora_da_lei': 'rebelde', 'bobo-da-corte': 'bobo', 'bobo_da_corte': 'bobo', 'cara-comum': 'cara_comum' };
  const resolved = map[key] || key;
  if (!ARCHETYPE_CALIBRATION[resolved]) {
    console.warn('Archetype key not found in ARCHETYPE_CALIBRATION:', key, '→ fallback sabio');
  }
  return resolved;
}

// ═══════════════════════════════════════════════════════════════
// HUMANIZER THRESHOLDS — Named constants for all scoreHumanizer conditions
// Extracted from inline magic numbers for auditability (PV audit A2)
// ═══════════════════════════════════════════════════════════════
const HUMANIZER_THRESHOLDS = {
  blind_spots: {
    E_high: 65, E_low: 35,           // OCEAN.E vs MBTI mismatch
    O_C_both_high: 70,               // O+C internal tension
    A_low: 35, E_social: 65,         // A low + E high tension
  },
  paradoxos: {
    O_C_explorer: 65,                // Explorador Disciplinado
    N_E_intensity: 60,               // Intensidade Social
    A_low_care: 40, CARE_high: 60,   // Cuidador Duro
    E_low_play: 40, PLAY_high: 60,   // Introvertido Brincalhão
    N_sage: 60, A_hero: 65, C_rebel: 65, // Archetype paradoxes
    pank_fallback: 55,               // Panksepp fallback minimum
  },
  fingerprints: {
    O_seeking: 65,                   // Triple Curiosidade
    C_deliberada: 65,                // Executora Nata
    min_count: 5,                    // Minimum fingerprints
  },
  memorias: {
    O_extreme: 75, C_extreme: 75, E_extreme: 75, A_extreme: 75,
    N_extreme: 70,                   // OCEAN extremes
    pank_extreme: 70,                // Panksepp extreme
    min_count: 3,                    // Minimum memorias
  }
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE TEMPLATES — Human-first text generators
// Each template: (d) => string. Leads with lived experience,
// scores as confirmation in parentheses, zero framework names.
// ═══════════════════════════════════════════════════════════════
const AAKER_LABEL = { sincerity:'Sinceridade', excitement:'Entusiasmo', competence:'Competência', sophistication:'Sofisticação', ruggedness:'Robustez' };
const AAKER_PERCEPTION = { sincerity:'autenticidade', excitement:'energia', competence:'confiabilidade', sophistication:'refinamento', ruggedness:'força' };
const ARCH_INNER = { sabio:'curiosidade', heroi:'determinação', explorador:'inquietude', cuidador:'empatia', criador:'visão', mago:'transformação', rebelde:'autenticidade', amante:'conexão', bobo:'leveza', inocente:'esperança', governante:'ordem' };
const ARCH_ICP_SEEKS = { sabio:'profundidade antes de tudo', heroi:'resultados tangíveis', explorador:'novidade e liberdade', cuidador:'segurança e pertencimento', criador:'originalidade e expressão', mago:'transformação visível', rebelde:'autenticidade radical', amante:'conexão genuína', bobo:'diversão e leveza', inocente:'simplicidade e confiança', governante:'estabilidade e controle' };
const ARCH_ICP_REJECTS = { sabio:'superficiais ou sensacionalistas', heroi:'passivas ou indecisas', rebelde:'corporativas ou polidas demais', cuidador:'frias ou transacionais', criador:'genéricas ou copiadas', mago:'previsíveis ou burocráticas', explorador:'restritivas ou repetitivas', amante:'distantes ou impessoais', bobo:'sérias demais ou rígidas', inocente:'cínicas ou manipuladoras', governante:'caóticas ou irresponsáveis' };
const GARDNER_EARLY = { linguistica:'palavras e histórias', logico_matematica:'puzzles e sistemas', interpessoal:'dinâmicas sociais', espacial_visual:'formas e cores', musical:'sons e ritmos', corporal_cinestesica:'movimento e toque', intrapessoal:'reflexão interior', naturalista:'padrões da natureza', existencial:'grandes perguntas da vida' };

const NARRATIVE_TEMPLATES = {
  // ── blind_spots (8) ──
  'BS-001': (d) => `Você é daquelas pessoas que ilumina qualquer sala — mas depois precisa de horas sozinha para recarregar. Seus dados confirmam essa dualidade (energia social a ${d.ocean.E}%, tipo cognitivo ${d.mbti}). Na prática, cuidado para não achar que precisa "performar" sempre.`,
  'BS-002': (d) => `Você aprendeu a parecer sociável — e faz isso bem — mas esse não é seu estado natural (${d.ocean.E}% de energia social, perfil ${d.mbti}). Na prática, observe se não está se forçando a ser "ligado" o tempo todo.`,
  'BS-003': (d) => `Quando cria, você provavelmente começa pela emoção mas depois racionaliza — seu raciocínio dominante é analítico (${d.topGardnerName}, ${d.gardnerSorted[0][1]}%), mas seu estilo criativo é emocional. O risco: matar a ideia cedo demais com excesso de análise.`,
  'BS-004': (d) => `Suas inteligências mais fortes são sensoriais (${d.topGardnerName}), mas você cria de forma metódica e deliberada. Seus melhores insights podem surgir justamente quando você para de tentar — música, caminhada, banho.`,
  'BS-005': (d) => `Sua marca é percebida como robusta e intensa (${Math.round(d.asSorted[0][1])}%), mas seu arquétipo ${d.archName} é suave. Seu público pode se confundir — eles veem força mas sentem delicadeza. Alinhe ou use como contraste intencional.`,
  'BS-006': (d) => `Sua personalidade de marca lidera por sinceridade (${Math.round(d.asSorted[0][1])}%), mas seu arquétipo ${d.archName} pede intensidade. Não suavize sua mensagem para parecer "simpático" — autenticidade no seu caso é ser direto.`,
  'BS-007': (d) => `Você quer explorar tudo MAS também quer organizar tudo (abertura ${d.ocean.O}%, disciplina ${d.ocean.C}%). O ponto cego: você pode gastar mais tempo planejando aventuras do que vivendo-as.`,
  'BS-008': (d) => `Você é social (${d.ocean.E}%) mas nem sempre agradável (${d.ocean.A}%). As pessoas se aproximam pela sua energia mas podem se afastar pela sua franqueza. Ponto cego: confundir honestidade com falta de tato.`,

  // ── paradoxos (10) ──
  'PX-001': (d) => `O Paradoxo do Explorador Disciplinado — você sonha alto (abertura ${d.ocean.O}%) E executa com rigor (disciplina ${d.ocean.C}%). A maioria tem um ou outro. Essa tensão é seu superpoder: visão + entrega.`,
  'PX-002': (d) => `O Paradoxo da Intensidade Social — você sente tudo profundamente (sensibilidade ${d.ocean.N}%) E busca interação constante (energia social ${d.ocean.E}%). Resultado: conexões intensas que drenam e alimentam ao mesmo tempo.`,
  'PX-003': (d) => `O Paradoxo do Cuidador Duro — você não é exatamente diplomático (amabilidade ${d.ocean.A}%), mas cuida profundamente das pessoas (impulso de cuidado a ${d.pank.CARE}%). Seu amor é em ações, não em palavras doces.`,
  'PX-004': (d) => `O Paradoxo do Introvertido Brincalhão — você não busca multidões (energia social ${d.ocean.E}%), mas tem uma leveza rara (impulso lúdico a ${d.pank.PLAY}%). Você é divertido... em doses controladas, com as pessoas certas.`,
  'PX-005': (d) => `O Sábio Emocional — seu arquétipo pede racionalidade, mas sua sensibilidade (${d.ocean.N}%) traz intensidade. A sabedoria que você oferece não é fria — é temperada pela experiência de sentir demais.`,
  'PX-006': (d) => `O Herói Gentil — seu arquétipo pede assertividade, mas sua gentileza (amabilidade ${d.ocean.A}%) traz suavidade. Você lidera sem esmagar. Raro e poderoso.`,
  'PX-007': (d) => `O Rebelde Metódico — você desafia o sistema com precisão cirúrgica (disciplina ${d.ocean.C}%). Não é caos — é revolução planejada.`,
  'PX-008': (d) => `Tensão emocional produtiva: ${d.topPankName} (${d.pankSorted[0][1]}%) coexiste com ${PANKSEPP_TRANSLATE[d.pankSorted[1]?.[0]] || d.pankSorted[1]?.[0]} (${d.pankSorted[1]?.[1]}%). Essas forças opostas não se cancelam — criam dinamismo.`,
  'PX-009': (d) => `Sua mente opera em dois canais: ${INTEL_NAMES[d.gardnerSorted[0][0]] || d.gardnerSorted[0][0]} (${d.gardnerSorted[0][1]}%) + ${INTEL_NAMES[d.gardnerSorted[1]?.[0]] || d.gardnerSorted[1]?.[0]} (${d.gardnerSorted[1]?.[1]}%). Combinação incomum que cria uma lente única para resolver problemas.`,
  'PX-010': (d) => `Seu perfil combina ${d.archName} com modo criativo ${d.dietrichLabel} — a essência do seu arquétipo é filtrada por um processo criativo que nem sempre combina. Essa fricção gera originalidade.`,

  // ── fingerprints (7) ──
  'FP-001': (d) => `Você é um ${d.archName.toLowerCase()} que processa o mundo através de ${d.topGardnerName.toLowerCase()} e cria de forma ${d.dietrichLabel.toLowerCase()}. Essa combinação específica define como suas ideias nascem.`,
  'FP-002': (d) => `${d.topPankName} (${d.topPank[1]}%) como combustível de um ${d.archName}: sua motivação emocional primária alimenta sua narrativa de marca. Quando você comunica a partir dessa emoção, é autêntico.`,
  'FP-003': (d) => `${d.topAakerName} percebida externamente + ${d.archName} sentido internamente: seu público vê ${AAKER_PERCEPTION[d.topAaker[0]] || d.topAaker[0]}, mas você opera a partir de ${ARCH_INNER[d.archKey] || 'intensidade'}.`,
  'FP-004': (d) => `Tríplice curiosidade: abertura alta + busca constante por novidade + ${d.topGardnerName} — você está sempre caçando a próxima ideia, e sua inteligência dominante determina ONDE você procura.`,
  'FP-005': (d) => `Executora nata: disciplina alta (${d.ocean.C}%) + criação deliberada — você não só tem ideias, você as materializa com consistência. Esse é seu diferencial mais raro.`,
  'FP-006': (d) => `Seu valor de marca combina ${d.bainTop[0]?.name || 'valor funcional'} + ${d.bainTop[1]?.name || 'valor emocional'} — filtrados pelo olhar de ${d.archName}. Poucos competidores conseguem entregar esses dois valores com a autenticidade que seu perfil permite.`,
  'FP-007': (d) => {
    const oKey = d.oceanSorted[d._padIdx % 5] || d.oceanSorted[0];
    const oLabel = { O:'abertura', C:'disciplina', E:'energia social', A:'amabilidade', N:'sensibilidade' }[oKey[0]] || oKey[0];
    const pankLabel = PANKSEPP_TRANSLATE[d.pankSorted[d._padIdx % d.pankSorted.length]?.[0]] || 'busca';
    return `Combinação ${oLabel} (${oKey[1]}%) + ${d.archName} + ${pankLabel}: essa interseção específica cria nuances únicas no seu estilo de comunicação e tomada de decisão.`;
  },

  // ── memorias (9) ──
  'ME-001': (d) => `Com abertura a ${d.ocean.O}%, é provável que na infância você fosse a criança que perguntava "por quê?" até esgotar os adultos. Essa curiosidade não diminuiu — ela se sofisticou.`,
  'ME-002': (d) => `Com disciplina a ${d.ocean.C}%, você provavelmente era quem organizava os trabalhos em grupo. Não por controle — por não suportar o caos. Isso moldou sua marca.`,
  'ME-003': (d) => `Com energia social a ${d.ocean.E}%, você provavelmente era a criança que fazia amizade no primeiro dia. Essa habilidade de conectar rapidamente é um ativo de marca que muitos tentam fabricar.`,
  'ME-004': (d) => `Com amabilidade a ${d.ocean.A}%, você é daqueles que compartilhava o lanche. Essa generosidade natural é o que torna sua marca confiável — as pessoas sentem que você se importa.`,
  'ME-005': (d) => `Com sensibilidade emocional a ${d.ocean.N}%, você provavelmente lembra de momentos da infância com intensidade incomum. Essa memória emocional é matéria-prima criativa pura.`,
  'ME-006': (d) => `Com ${d.topPankName} a ${d.topPank[1]}%, essa emoção provavelmente foi formada cedo. Momentos que ativaram esse impulso na infância ainda ecoam no que você cria hoje.`,
  'ME-007': (d) => `Seu perfil ${d.mbti} sugere que desde cedo você processava o mundo de forma particular — e isso moldou não só quem você é, mas como sua marca se expressa.`,
  'ME-008': (d) => `A combinação do arquétipo ${d.archName} com ${d.topGardnerName} como inteligência dominante indica padrões formativos: experiências precoces com ${GARDNER_EARLY[d.topGard[0]] || 'exploração'} deixaram marca.`,
  'ME-009': (d) => `O modo criativo ${d.dietrichLabel} provavelmente se consolidou em experiências formativas onde você descobriu como suas melhores ideias surgiam — e passou a cultivar esse canal.`,

  // ── ICP: sistema_imunologico (3) ──
  'SIM-001': (d) => `Seu cliente ideal rejeita mensagens que parecem ${ARCH_ICP_REJECTS[d.archKey] || 'desalinhadas com seus valores'}. Esse é o filtro que sua comunicação precisa passar.`,
  'SIM-002': (d) => `Seu público responde a estímulos que ativam ${d.topPankName} — e ignora o que não ativa. Cada peça de conteúdo deve tocar esse impulso emocional.`,
  'SIM-003': (d) => `Com ${d.topAakerName} como dimensão dominante de personalidade de marca, inconsistências nessa dimensão são detectadas imediatamente pelo seu público — é onde eles são mais exigentes.`,

  // ── ICP: meta_axiomas (3) ──
  'MAX-001': (d) => `O público do ${d.archName} busca ${ARCH_ICP_SEEKS[d.archKey] || 'conexão genuína'}. Toda comunicação deve começar por aí.`,
  'MAX-002': (d) => `Axioma de valor: entregue ${d.bainTop[0]?.name || 'valor funcional'} como prova, ${d.bainTop[1]?.name || 'valor emocional'} como recompensa. Nessa ordem.`,
  'MAX-003': (d) => `Axioma emocional: a decisão de compra do seu público é influenciada primeiro por ${d.topPankName}, depois racionalizada por ${d.topAaker[0] === 'competence' ? 'competência percebida' : d.topAaker[0] === 'sincerity' ? 'confiança' : 'afinidade emocional'}.`,
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE LAYER — scoreHumanizer(r, mode)
// Generates cross-framework insights: blind spots, paradoxes,
// fingerprints, memories. Pure function, zero DOM.
// ═══════════════════════════════════════════════════════════════
function scoreHumanizer(r, mode) {
  mode = mode || 'self';
  const ocean = r.ocean || {};
  const mbti = r.mbti || 'INTJ';
  const archKey = r.archetype?.primary?.key || 'sabio';
  const archName = r.archetype?.primary?.name || 'Sábio';
  const pank = r.panksepp || {};
  const gardner = r.intelScores || {};
  const dietrichDom = r.dietrichDominant || 'deliberada_cognitiva';
  const aaker = r.aaker || {};
  const bain = r.bainValues || {};

  const pankSorted = Object.entries(pank).sort((a,b) => b[1] - a[1]);
  const gardnerSorted = Object.entries(gardner).sort((a,b) => b[1] - a[1]);
  const asSorted = Object.entries(aaker).sort((a,b) => b[1] - a[1]);
  const oceanSorted = ['O','C','E','A','N'].map(k => [k, ocean[k] || 50]).sort((a,b) => b[1] - a[1]);

  const topPank = pankSorted[0] || ['SEEKING', 50];
  const topGard = gardnerSorted[0] || ['linguistic', 50];
  const topAaker = asSorted[0] || ['competence', 50];
  const dietrichLabel = dietrichDom.replace(/_/g, ' ');
  const bainTop = (bain.top5 || []).slice(0,2);

  // ── shared data object for templates ──
  const d = {
    ocean, mbti, archKey, archName, pank, gardner, dietrichDom, aaker, bain,
    pankSorted, gardnerSorted, asSorted, oceanSorted,
    topPank, topGard, topAaker, dietrichLabel, bainTop,
    topGardnerName: INTEL_NAMES[topGard[0]] || topGard[0],
    topPankName: PANKSEPP_TRANSLATE[topPank[0]] || topPank[0],
    topAakerName: AAKER_LABEL[topAaker[0]] || topAaker[0],
    _padIdx: 0, // used by FP-007
  };

  const T = HUMANIZER_THRESHOLDS;

  // ── blind_spots ──
  const blind_spots = [];
  if (ocean.E >= T.blind_spots.E_high && mbti.includes('I')) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-001'](d), fonte: 'OCEAN.E ' + ocean.E + '% vs MBTI ' + mbti });
  if (ocean.E <= T.blind_spots.E_low && mbti.includes('E')) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-002'](d), fonte: 'OCEAN.E ' + ocean.E + '% vs MBTI ' + mbti });
  if (topGard[0] === 'logico_matematica' && dietrichDom.includes('emocional')) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-003'](d), fonte: 'Gardner ' + topGard[0] + ' ' + topGard[1] + '% vs Dietrich ' + dietrichDom });
  if ((topGard[0] === 'musical' || topGard[0] === 'espacial_visual') && dietrichDom.includes('deliberada')) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-004'](d), fonte: 'Gardner ' + topGard[0] + ' vs Dietrich ' + dietrichDom });
  if (asSorted[0] && asSorted[0][0] === 'ruggedness' && ['cuidador','inocente','amante'].includes(archKey)) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-005'](d), fonte: 'Aaker ruggedness ' + Math.round(asSorted[0][1]) + '% vs Arquétipo ' + archName });
  if (asSorted[0] && asSorted[0][0] === 'sincerity' && ['rebelde','mago','heroi'].includes(archKey)) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-006'](d), fonte: 'Aaker sincerity ' + Math.round(asSorted[0][1]) + '% vs Arquétipo ' + archName });
  if (ocean.O >= T.blind_spots.O_C_both_high && ocean.C >= T.blind_spots.O_C_both_high) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-007'](d), fonte: 'OCEAN O=' + ocean.O + '% C=' + ocean.C + '%' });
  if (ocean.A <= T.blind_spots.A_low && ocean.E >= T.blind_spots.E_social) blind_spots.push({ text: NARRATIVE_TEMPLATES['BS-008'](d), fonte: 'OCEAN E=' + ocean.E + '% A=' + ocean.A + '%' });

  // ── paradoxos ──
  const paradoxos = [];
  if (ocean.O >= T.paradoxos.O_C_explorer && ocean.C >= T.paradoxos.O_C_explorer) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-001'](d), fonte: 'OCEAN O=' + ocean.O + '% C=' + ocean.C + '%' });
  if (ocean.N >= T.paradoxos.N_E_intensity && ocean.E >= T.paradoxos.N_E_intensity) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-002'](d), fonte: 'OCEAN N=' + ocean.N + '% E=' + ocean.E + '%' });
  if (ocean.A <= T.paradoxos.A_low_care && pank.CARE >= T.paradoxos.CARE_high) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-003'](d), fonte: 'OCEAN A=' + ocean.A + '% Panksepp CARE=' + pank.CARE + '%' });
  if (ocean.E <= T.paradoxos.E_low_play && pank.PLAY >= T.paradoxos.PLAY_high) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-004'](d), fonte: 'OCEAN E=' + ocean.E + '% Panksepp PLAY=' + pank.PLAY + '%' });
  if (archKey === 'sabio' && ocean.N >= T.paradoxos.N_sage) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-005'](d), fonte: 'Arquétipo Sábio + OCEAN N=' + ocean.N + '%' });
  if (archKey === 'heroi' && ocean.A >= T.paradoxos.A_hero) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-006'](d), fonte: 'Arquétipo Herói + OCEAN A=' + ocean.A + '%' });
  if (archKey === 'rebelde' && ocean.C >= T.paradoxos.C_rebel) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-007'](d), fonte: 'Arquétipo Rebelde + OCEAN C=' + ocean.C + '%' });

  // Ensure minimum 3
  if (paradoxos.length < 3) {
    if (pankSorted.length >= 2 && pankSorted[0][1] >= T.paradoxos.pank_fallback && pankSorted[1][1] >= T.paradoxos.pank_fallback) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-008'](d), fonte: 'Panksepp ' + pankSorted[0][0] + '=' + pankSorted[0][1] + '% + ' + pankSorted[1][0] + '=' + pankSorted[1][1] + '%' });
    if (paradoxos.length < 3 && gardnerSorted.length >= 2) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-009'](d), fonte: 'Gardner top 2' });
    if (paradoxos.length < 3) paradoxos.push({ text: NARRATIVE_TEMPLATES['PX-010'](d), fonte: 'Arquétipo ' + archName + ' + Dietrich ' + dietrichDom });
  }

  // ── fingerprints ──
  const fingerprints = [];
  fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-001'](d), fonte: 'Arquétipo + Gardner + Dietrich' });
  fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-002'](d), fonte: 'Panksepp ' + topPank[0] + ' + Arquétipo ' + archName });
  fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-003'](d), fonte: 'Aaker ' + topAaker[0] + ' + Arquétipo ' + archName });
  if (ocean.O >= T.fingerprints.O_seeking && topPank[0] === 'SEEKING') fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-004'](d), fonte: 'OCEAN O=' + ocean.O + '% + Panksepp SEEKING + Gardner ' + topGard[0] });
  if (ocean.C >= T.fingerprints.C_deliberada && dietrichDom.includes('deliberada')) fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-005'](d), fonte: 'OCEAN C=' + ocean.C + '% + Dietrich ' + dietrichDom });
  if (bainTop.length >= 2) fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-006'](d), fonte: 'Bain top 2 + Arquétipo ' + archName });

  // Pad to min 5
  while (fingerprints.length < 5) {
    d._padIdx = fingerprints.length;
    fingerprints.push({ text: NARRATIVE_TEMPLATES['FP-007'](d), fonte: 'OCEAN ' + (oceanSorted[fingerprints.length % 5] || oceanSorted[0])[0] + ' + Arquétipo + Panksepp' });
  }

  // ── memorias ──
  const memorias = [];
  if (ocean.O >= T.memorias.O_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-001'](d), fonte: 'OCEAN O=' + ocean.O + '%' });
  if (ocean.C >= T.memorias.C_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-002'](d), fonte: 'OCEAN C=' + ocean.C + '%' });
  if (ocean.E >= T.memorias.E_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-003'](d), fonte: 'OCEAN E=' + ocean.E + '%' });
  if (ocean.A >= T.memorias.A_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-004'](d), fonte: 'OCEAN A=' + ocean.A + '%' });
  if (ocean.N >= T.memorias.N_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-005'](d), fonte: 'OCEAN N=' + ocean.N + '%' });
  if (topPank[1] >= T.memorias.pank_extreme) memorias.push({ text: NARRATIVE_TEMPLATES['ME-006'](d), fonte: 'Panksepp ' + topPank[0] + '=' + topPank[1] + '%' });

  // Pad to min 3
  const memFallbackKeys = ['ME-007', 'ME-008', 'ME-009'];
  const memFallbackFontes = ['MBTI ' + mbti, 'Arquétipo + Gardner', 'Dietrich ' + dietrichDom];
  while (memorias.length < 3) {
    const idx = memorias.length;
    memorias.push({ text: NARRATIVE_TEMPLATES[memFallbackKeys[idx] || 'ME-007'](d), fonte: memFallbackFontes[idx] || memFallbackFontes[0] });
  }

  const result = { blind_spots, paradoxos, fingerprints, memorias };

  // ── ICP-only modules ──
  if (mode === 'icp') {
    result.sistema_imunologico = [
      { text: NARRATIVE_TEMPLATES['SIM-001'](d), fonte: 'Arquétipo ' + archName + ' invertido' },
      { text: NARRATIVE_TEMPLATES['SIM-002'](d), fonte: 'Panksepp ' + topPank[0] },
      { text: NARRATIVE_TEMPLATES['SIM-003'](d), fonte: 'Aaker ' + topAaker[0] },
    ];
    result.meta_axiomas = [
      { text: NARRATIVE_TEMPLATES['MAX-001'](d), fonte: 'Arquétipo ' + archName },
      { text: NARRATIVE_TEMPLATES['MAX-002'](d), fonte: 'Bain top values' },
      { text: NARRATIVE_TEMPLATES['MAX-003'](d), fonte: 'Panksepp + Aaker' },
    ];
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE LAYER — narrativeVoice(humanized, archetype, mode)
// Rewrites humanized texts with archetype-calibrated tone.
// Pure function, zero DOM.
// ═══════════════════════════════════════════════════════════════
function narrativeVoice(humanized, archetype, mode) {
  mode = mode || 'self';
  const calKey = _archCalibKey(archetype);
  const cal = ARCHETYPE_CALIBRATION[calKey] || ARCHETYPE_CALIBRATION.sabio;
  const starters = ARCH_SENTENCE_STARTERS[calKey] || ARCH_SENTENCE_STARTERS.sabio;

  // Technical terms to replace with human language
  const termMap = {
    'OCEAN': 'perfil de personalidade', 'Openness': 'Abertura', 'Conscientiousness': 'Conscienciosidade',
    'Extraversion': 'Extroversão', 'Agreeableness': 'Amabilidade', 'Neuroticism': 'Sensibilidade Emocional',
    'SEEKING': 'busca', 'CARE': 'cuidado', 'PLAY': 'leveza', 'FEAR': 'cautela',
    'RAGE': 'intensidade', 'LUST': 'paixão', 'PANIC_GRIEF': 'profundidade',
    'Panksepp': 'sistema emocional', 'Gardner': 'inteligências', 'Dietrich': 'modo criativo',
    'Aaker': 'personalidade de marca', 'Bain': 'pirâmide de valor'
  };

  // Round-robin counters — deterministic, no repetition
  let _metaIdx = 0;
  let _starterIdx = 0;
  let _textCount = 0;

  function rewriteText(text) {
    let result = text;
    _textCount++;
    for (const [term, replacement] of Object.entries(termMap)) {
      result = result.replace(new RegExp('\\b' + term + '\\b', 'g'), replacement);
    }
    // Add archetype sentence starter every 3rd item (deterministic)
    if (_textCount % 3 === 0 && starters.length > 0) {
      const starter = starters[_starterIdx % starters.length];
      _starterIdx++;
      result = starter + ' ' + result.charAt(0).toLowerCase() + result.slice(1);
    }
    // Weave in one metaphor from calibration — round-robin, never repeats consecutively
    const meta = cal.metaforas[_metaIdx % cal.metaforas.length];
    _metaIdx++;
    if (meta && result.length > 100 && !result.includes(meta)) {
      result = result.replace(/\.$/, ' — como em um(a) ' + meta + '.');
    }
    // Mode: ICP uses 3rd person
    if (mode === 'icp') {
      result = result.replace(/\bvocê\b/gi, 'seu cliente ideal').replace(/\bseu\b/gi, 'do seu ICP').replace(/\bsua\b/gi, 'da sua audiência');
    }
    return result;
  }

  function rewriteArray(items) {
    return items.map(item => ({ text: rewriteText(item.text), fonte: item.fonte }));
  }

  const result = {
    blind_spots: rewriteArray(humanized.blind_spots || []),
    paradoxos: rewriteArray(humanized.paradoxos || []),
    fingerprints: rewriteArray(humanized.fingerprints || []),
    memorias: rewriteArray(humanized.memorias || [])
  };

  if (humanized.sistema_imunologico) result.sistema_imunologico = rewriteArray(humanized.sistema_imunologico);
  if (humanized.meta_axiomas) result.meta_axiomas = rewriteArray(humanized.meta_axiomas);

  return result;
}

function deriveVoiceDNA(archetype, ocean, dietrichDominant, panksepp) {
  const archName = archetype?.primary?.key || 'sabio';
  const base = VOICE_ARCHETYPE_MAP[archName] || VOICE_ARCHETYPE_MAP.sabio;
  const words = VOICE_WORDS_MAP[archName] || VOICE_WORDS_MAP.sabio;
  const patterns = VOICE_PATTERNS_MAP[archName] || VOICE_PATTERNS_MAP.sabio;

  // OCEAN modifiers
  const modifiers = [];
  if (ocean.O >= 70) modifiers.push('+ metáforas e analogias');
  if (ocean.C >= 70) modifiers.push('+ listas e estrutura');
  if (ocean.E >= 70) modifiers.push('+ exclamações e diálogo');
  if (ocean.A >= 70) modifiers.push('+ linguagem inclusiva ("nós")');
  if (ocean.N >= 70) modifiers.push('+ intensidade emocional');

  // Dietrich style
  const isDeliberate = (dietrichDominant || '').startsWith('deliberada');
  const isEmocional = (dietrichDominant || '').endsWith('emocional');
  const style = isDeliberate
    ? (isEmocional ? 'Estruturado-empático' : 'Estruturado-analítico')
    : (isEmocional ? 'Fluido-emotivo' : 'Fluido-intelectual');

  // Panksepp energy
  const pSorted = Object.entries(panksepp || {}).sort((a, b) => b[1] - a[1]);
  const topAffect = pSorted[0]?.[0] || 'SEEKING';
  const energyMap = {
    SEEKING: 'Curiosa e antecipativa', CARE: 'Acolhedora e nutritiva', PLAY: 'Leve e lúdica',
    FEAR: 'Cautelosa e protetora', RAGE: 'Intensa e assertiva', LUST: 'Apaixonada e sensorial',
    PANIC_GRIEF: 'Profunda e nostálgica'
  };
  const energy = energyMap[topAffect] || base.energy;

  return {
    tone: base.tone, register: base.register, style, energy,
    modifiers, wordsToUse: words.use, wordsToAvoid: words.avoid,
    sentencePatterns: patterns, archetype: archName
  };
}
