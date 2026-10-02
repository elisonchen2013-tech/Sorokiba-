'use strict';
/*
 * Motor de conversa do Hospital de Sorokiba — SOMENTE ESTRUTURA.
 * Nenhuma fala de personagem existe aqui: cada nó aponta para uma textKey
 * (ex.: "doctor.results.reviewed.abnormal"). Os textos ficam no frontend,
 * em hospital-lines.js, que começa vazio. Para criar uma fala nova basta
 * registrar a chave lá; para criar um novo comportamento basta adicionar
 * uma regra em RULES. Nada precisa ser refeito.
 *
 * O servidor analisa o CONTEXTO (cena, risco da triagem, exames pendentes,
 * resultados novos, última ação do jogador, tópico perguntado, dinheiro...)
 * e escolhe a primeira regra (por prioridade) cujas condições batem.
 */

const TOPICS = ['diagnosis', 'exams', 'medication', 'rest', 'cost', 'prognosis', 'queue', 'results'];
const SYMPTOMS = ['fever', 'headache', 'nausea', 'dizziness', 'fatigue', 'thirst', 'weakness', 'chest_pain', 'shortness_of_breath', 'cough', 'abdominal_pain', 'injury'];

// Ações que o cliente pode enviar em /api/hospital/talk. As demais são geradas pelo servidor
// quando uma ação real acontece (check-in, triagem, pagamento de exame, alta...).
const CLIENT_INTENTS = new Set(['enter', 'idle', 'describe_symptoms', 'ask', 'request_exam', 'review_results', 'observe', 'pharmacy', 'finish', 'return_visit']);

const SCENE_SPEAKER = {
  reception: 'nurse', queue: 'nurse', triage: 'nurse', observation: 'nurse', pharmacy: 'nurse',
  office: 'doctor', exams: 'doctor', pending: 'doctor', results: 'doctor', return: 'doctor',
  urgent: 'doctor', discharge: 'doctor', history: 'nurse'
};

// Disponibilidade de cada ação do jogador, decidida pelo servidor.
const AVAILABLE = {
  describe_symptoms: c => c.consultActive || c.scene === 'triage',
  ask: c => c.hasVisit,
  request_exam: c => c.consultActive && c.pendingCount < 8,
  review_results: c => c.consultActive && c.unreviewedReady > 0,
  observe: c => c.hasVisit,
  pharmacy: () => true,
  finish: c => c.state === 'in_care' && c.pendingCount === 0,
  return_visit: c => c.consultActive && c.unreviewedReady > 0
};

const SCENE_CHOICES = {
  reception: ['pharmacy'],
  queue: ['ask', 'pharmacy'],
  triage: ['describe_symptoms', 'ask'],
  office: ['describe_symptoms', 'ask', 'request_exam', 'review_results', 'observe', 'pharmacy', 'finish'],
  exams: ['request_exam', 'ask'],
  pending: ['ask', 'review_results'],
  results: ['review_results', 'request_exam', 'ask'],
  return: ['review_results', 'ask', 'request_exam', 'finish'],
  observation: ['ask', 'describe_symptoms'],
  pharmacy: ['ask'],
  urgent: ['describe_symptoms', 'ask'],
  discharge: ['ask'],
  history: []
};

const sp = c => SCENE_SPEAKER[c.scene] || 'nurse';

const RULES = [
  { id: 'urgent_alert', prio: 95, once: true, when: { urgent: true, hasVisit: true, scene: ['queue', 'triage', 'office', 'urgent'] }, speaker: 'nurse', key: 'nurse.urgent.alert', anim: 'attend' },
  { id: 'discharged', prio: 92, when: { intent: 'discharged' }, speaker: 'doctor', key: 'doctor.discharge.closing', anim: 'talk' },
  { id: 'results_reviewed_abnormal', prio: 90, when: { intent: 'results_reviewed', abnormalLast: true }, speaker: 'doctor', key: 'doctor.results.reviewed.abnormal', anim: 'think' },
  { id: 'results_reviewed_normal', prio: 89, when: { intent: 'results_reviewed' }, speaker: 'doctor', key: 'doctor.results.reviewed.normal', anim: 'analyze' },
  { id: 'exam_ordered', prio: 88, when: { intent: 'exam_ordered' }, speaker: 'doctor', key: c => (c.pendingCount > 2 ? 'doctor.exams.ordered.many' : 'doctor.exams.ordered'), anim: 'attend' },
  { id: 'triage_done', prio: 87, when: { intent: 'triage_done' }, speaker: 'nurse', key: c => 'nurse.triage.done.' + (c.risk || 'verde'), anim: 'attend' },
  { id: 'consult_start_returning', prio: 86, when: { intent: 'consult_start', historyCount: { min: 1 } }, speaker: 'doctor', key: 'doctor.consult.returning', anim: 'analyze' },
  { id: 'consult_start', prio: 85, when: { intent: 'consult_start' }, speaker: 'doctor', key: c => 'doctor.consult.opening.' + (c.risk || 'verde'), anim: 'analyze' },
  { id: 'checkin', prio: 84, when: { intent: 'checkin' }, speaker: 'nurse', key: c => (c.urgent ? 'nurse.reception.checkin.urgent' : 'nurse.reception.checkin'), anim: 'analyze' },
  { id: 'symptoms_high_risk', prio: 80, when: { intent: 'describe_symptoms', risk: ['vermelho', 'laranja'] }, speaker: sp, key: c => c.speaker + '.symptoms.high_risk', anim: 'think' },
  { id: 'symptoms_received', prio: 79, when: { intent: 'describe_symptoms' }, speaker: sp, key: c => c.speaker + '.symptoms.received', anim: 'think' },
  { id: 'ask_cost_low_money', prio: 78, when: { intent: 'ask', topic: 'cost', moneyLow: true }, speaker: sp, key: c => c.speaker + '.ask.cost.low_money', anim: 'talk' },
  { id: 'ask_exams_pending', prio: 77, when: { intent: 'ask', topic: 'exams', pendingCount: { min: 1 } }, speaker: sp, key: c => c.speaker + '.ask.exams.pending', anim: 'talk' },
  { id: 'ask_results_ready', prio: 76, when: { intent: 'ask', topic: 'results', readyCount: { min: 1 } }, speaker: sp, key: c => c.speaker + '.ask.results.ready', anim: 'analyze' },
  { id: 'ask_queue_urgent', prio: 75, when: { intent: 'ask', topic: 'queue', urgent: true }, speaker: 'nurse', key: 'nurse.ask.queue.urgent', anim: 'talk' },
  { id: 'ask_topic', prio: 70, when: { intent: 'ask' }, speaker: sp, key: c => c.speaker + '.ask.' + (c.topic || 'general'), anim: 'talk' },
  { id: 'results_ready_notice', prio: 65, once: 'readyCount', when: { unreviewedReady: { min: 1 }, scene: ['office', 'return', 'results', 'exams', 'pending'] }, speaker: 'doctor', key: 'doctor.results.ready_notice', anim: 'analyze' },
  { id: 'request_exam_prompt', prio: 64, when: { intent: 'request_exam' }, speaker: 'doctor', key: 'doctor.exams.prompt', anim: 'attend' },
  { id: 'review_prompt', prio: 63, when: { intent: ['review_results', 'return_visit'] }, speaker: 'doctor', key: 'doctor.results.prompt', anim: 'analyze' },
  { id: 'finish_prompt', prio: 62, when: { intent: 'finish' }, speaker: 'doctor', key: 'doctor.discharge.prompt', anim: 'attend' },
  { id: 'waiting_exams', prio: 60, when: { state: 'awaiting_exam', scene: ['office', 'pending', 'exams', 'return'] }, speaker: 'doctor', key: 'doctor.exams.waiting', anim: 'wait' },
  { id: 'enter_reception_return', prio: 50, when: { scene: 'reception', hasVisit: true }, speaker: 'nurse', key: 'nurse.reception.return', anim: 'wait' },
  { id: 'enter_reception', prio: 49, when: { scene: 'reception' }, speaker: 'nurse', key: 'nurse.reception.welcome', anim: 'wait' },
  { id: 'enter_queue_priority', prio: 48, when: { scene: 'queue', urgent: true }, speaker: 'nurse', key: 'nurse.queue.priority', anim: 'attend' },
  { id: 'enter_queue', prio: 47, when: { scene: 'queue' }, speaker: 'nurse', key: 'nurse.queue.position', anim: 'wait' },
  { id: 'enter_triage_start', prio: 46, when: { scene: 'triage', hasTriage: false }, speaker: 'nurse', key: 'nurse.triage.start', anim: 'analyze' },
  { id: 'enter_triage_done', prio: 45, when: { scene: 'triage', hasTriage: true }, speaker: 'nurse', key: 'nurse.triage.review', anim: 'analyze' },
  { id: 'enter_office_waiting', prio: 44, when: { scene: 'office', consultActive: false }, speaker: 'doctor', key: 'doctor.office.waiting', anim: 'wait' },
  { id: 'enter_office', prio: 43, when: { scene: 'office' }, speaker: 'doctor', key: 'doctor.office.idle', anim: 'wait' },
  { id: 'enter_results', prio: 42, when: { scene: 'results' }, speaker: 'doctor', key: c => (c.readyCount > 0 ? 'doctor.results.enter' : 'doctor.results.empty'), anim: 'analyze' },
  { id: 'enter_observation', prio: 41, when: { scene: 'observation' }, speaker: 'nurse', key: 'nurse.observation.enter', anim: 'attend' },
  { id: 'enter_pharmacy', prio: 40, when: { scene: 'pharmacy' }, speaker: 'nurse', key: 'nurse.pharmacy.enter', anim: 'attend' },
  { id: 'enter_urgent', prio: 39, when: { scene: 'urgent' }, speaker: 'doctor', key: 'doctor.urgent.enter', anim: 'attend' },
  { id: 'enter_discharge', prio: 38, when: { scene: 'discharge' }, speaker: 'doctor', key: 'doctor.discharge.enter', anim: 'analyze' }
].sort((a, b) => b.prio - a.prio);

function matches(when, ctx) {
  for (const k of Object.keys(when)) {
    const cond = when[k], v = ctx[k];
    if (Array.isArray(cond)) { if (Array.isArray(v) ? !v.some(x => cond.includes(x)) : !cond.includes(v)) return false; }
    else if (cond && typeof cond === 'object') { const n = Number(v); if ((cond.min !== undefined && !(n >= cond.min)) || (cond.max !== undefined && !(n <= cond.max))) return false; }
    else if (typeof cond === 'boolean') { if (!!v !== cond) return false; }
    else if (v !== cond) return false;
  }
  return true;
}

const onceKey = (r, ctx) => (r.once === true ? r.id : r.id + ':' + ctx[r.once]);

function isAvailable(intent, ctx) {
  const f = AVAILABLE[intent];
  return f ? !!f(ctx) : true;
}

function choicesFor(ctx) {
  return (SCENE_CHOICES[ctx.scene] || []).filter(i => isAvailable(i, ctx));
}

function respond(ctx, conv) {
  conv.fired = conv.fired || {};
  const rule = RULES.find(r => matches(r.when, ctx) && !(r.once && conv.fired[onceKey(r, ctx)]));
  const speaker = rule ? (typeof rule.speaker === 'function' ? rule.speaker(ctx) : rule.speaker) : sp(ctx);
  const c2 = Object.assign({}, ctx, { speaker });
  if (rule && rule.once) conv.fired[onceKey(rule, ctx)] = true;
  const textKey = rule ? (typeof rule.key === 'function' ? rule.key(c2) : rule.key) : speaker + '.' + ctx.scene + '.fallback';
  const factors = ['scene:' + ctx.scene, 'intent:' + ctx.intent];
  if (ctx.risk) factors.push('risk:' + ctx.risk);
  if (ctx.urgent) factors.push('urgent');
  if (ctx.pendingCount) factors.push('pending:' + ctx.pendingCount);
  if (ctx.unreviewedReady) factors.push('new_results:' + ctx.unreviewedReady);
  if (ctx.topic) factors.push('topic:' + ctx.topic);
  return {
    ruleId: rule ? rule.id : 'fallback',
    speaker,
    textKey,
    anim: rule ? rule.anim : 'wait',
    choices: choicesFor(ctx),
    factors,
    scene: ctx.scene,
    turn: Number(conv.turn || 0)
  };
}

module.exports = { TOPICS, SYMPTOMS, CLIENT_INTENTS, RULES, respond, isAvailable, choicesFor };
