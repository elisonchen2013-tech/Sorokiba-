(function () {
  'use strict';
  if (window.__kibaLocalAI) return;
  window.__kibaLocalAI = true;

  var history = [];
  var busy = false;
  var recentAnswers = [];
  var stopWords = new Set(('a as o os um uma uns umas de da do das dos e em no na nos nas para por com sem que qual quais quem como onde quando quanto quanta quantos quantas eu voce seu sua meu minha me meu minha ao aos ate ou se isso essa esse sobre pelo pela pelos pelas pode posso tem ter esta este esta foi sao ser mais muito agora jogo cidade sorokiba').split(' '));
  var aliases = {
    'emprego': 'profissao', 'trabalho': 'profissao', 'carreira': 'profissao',
    'habitantes': 'populacao', 'moradores': 'populacao',
    'remedio': 'medicamento', 'remedios': 'medicamento', 'medicamentos': 'medicamento',
    'doencas': 'doenca', 'enfermidades': 'doenca',
    'tratamentos': 'tratamento', 'sintomas': 'sintoma',
    'condicoes': 'condicao', 'gravidades': 'gravidade',
    'exames': 'exame', 'consultas': 'consulta',
    'missoes': 'missao', 'recompensas': 'recompensa',
    'novidades': 'noticia', 'noticias': 'noticia',
    'eventos': 'evento', 'empresas': 'empresa', 'lojas': 'loja',
    'sinais': 'sinal', 'vitais': 'vital',
    'precos': 'preco', 'valores': 'preco', 'salarios': 'salario',
    'atualizacao': 'atualizar', 'atualizacoes': 'atualizar'
  };

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function tokens(value) {
    return normalize(value).split(/\s+/).filter(function (word) {
      return word.length > 1 && !stopWords.has(word);
    }).map(function (word) {
      return aliases[word] || word;
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function format(text) {
    return escapeHtml(text)
      .replace(/^### (.+)$/gm, '<strong class="kiba-title">$1</strong>')
      .replace(/^## (.+)$/gm, '<strong class="kiba-title">$1</strong>')
      .replace(/^\* (.+)$/gm, '<div class="kiba-bullet">• $1</div>')
      .replace(/^- (.+)$/gm, '<div class="kiba-bullet">• $1</div>')
      .replace(/\n/g, '<br>');
  }

  function add(text, role) {
    var messages = document.getElementById('kibaMsgs');
    if (!messages) return null;
    var element = document.createElement('div');
    element.className = 'msg ' + (role === 'user' ? 'usr' : 'bot');
    if (role === 'user') element.textContent = text;
    else element.innerHTML = format(text);
    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;
    return element;
  }

  function thinking(messages) {
    if (!messages) return null;
    var element = document.createElement('div');
    element.className = 'msg bot kiba-thinking';
    element.setAttribute('role', 'status');
    element.textContent = 'Estou consultando as informações atuais de Sorokiba…';
    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;
    return element;
  }

  function list(title, lines) {
    return '### ' + title + '\n' + lines.map(function (line) {
      return '* ' + line;
    }).join('\n');
  }

  function money(value) {
    var amount = Number(value);
    return 'R$ ' + (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function number(value) {
    var amount = Number(value);
    return (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR');
  }

  function choose(lines, key) {
    var available = lines.filter(function (line) {
      return recentAnswers.indexOf(key + ':' + line) < 0;
    });
    var result = available.length ? available[Math.floor(Math.random() * available.length)] : lines[Math.floor(Math.random() * lines.length)];
    recentAnswers.push(key + ':' + result);
    recentAnswers = recentAnswers.slice(-8);
    return result;
  }

  function getContext() {
    var token = localStorage.getItem('sorokiba_token');
    return fetch('/api/kiba/context', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    }).then(function (response) {
      if (response.status === 401) {
        if (typeof handleAuthExpired === 'function') handleAuthExpired();
        throw new Error('Sua sessão expirou. Entre novamente para conversar com o Kiba.');
      }
      if (!response.ok) throw new Error('Não foi possível atualizar os dados do jogo.');
      return response.json();
    }).then(function (data) {
      if (!data || !data.player || !data.city) throw new Error('O contexto recebido está incompleto.');
      return data;
    });
  }

  function memoryMatches(query, memories) {
    var queryTokens = new Set(tokens(query));
    if (!queryTokens.size || !Array.isArray(memories)) return [];
    return memories.map(function (memory) {
      var text = [memory.title, memory.category, memory.content].join(' ');
      var memoryTokens = new Set(tokens(text));
      var hits = Array.from(queryTokens).filter(function (word) { return memoryTokens.has(word); }).length;
      var score = hits / Math.sqrt(queryTokens.size * Math.max(1, memoryTokens.size));
      if (normalize(query).length > 4 && normalize(text).includes(normalize(query))) score += 1;
      return { memory: memory, score: score, hits: hits };
    }).filter(function (match) {
      return match.hits > 0 && match.score >= 0.12;
    }).sort(function (a, b) {
      return b.score - a.score;
    }).slice(0, 4).map(function (match) {
      return match.memory;
    });
  }

  function makeFacts(data) {
    var facts = [];
    var addFact = function (title, detail, keywords, category) {
      if (!detail) return;
      facts.push({ title: title, detail: detail, text: title + ' ' + detail, keywords: keywords || '', category: category || '' });
    };
    var city = data.city || {};
    var player = data.player || {};
    addFact('População', number(city.population) + ' habitantes.', 'cidade habitantes moradores', 'cidade');
    addFact('Economia', 'Indicador atual: ' + number(city.economy) + '.', 'economia pib', 'cidade');
    addFact('Infraestrutura', 'Indicador atual: ' + number(city.infrastructure) + '.', 'infraestrutura', 'cidade');
    addFact('Qualidade de vida', 'Indicador atual: ' + number(city.quality) + '.', 'qualidade vida', 'cidade');
    addFact('Impostos', 'A taxa municipal atual é ' + number(city.taxRate) + '%.', 'imposto taxa prefeitura', 'cidade');
    addFact('Tesouro municipal', 'Saldo atual: ' + money(city.treasury) + '.', 'tesouro prefeitura', 'cidade');

    (Array.isArray(data.jobs) ? data.jobs : []).forEach(function (job) {
      addFact('Profissão: ' + job.name, 'Salário ' + money(job.salary) + ', requisito de ' + number(job.xpRequired) + ' XP. ' + (job.task || ''), 'profissao emprego carreira salario xp', 'profissao');
    });
    (Array.isArray(data.shop) ? data.shop : []).forEach(function (item) {
      addFact('Loja: ' + item.name, money(item.price) + (item.description ? '. ' + item.description : ''), 'loja comprar item produto preco', 'loja'));
    });
    (Array.isArray(data.companies) ? data.companies : []).forEach(function (company) {
      addFact('Empresa: ' + company.name, (company.type || 'Loja') + '. ' + (company.description || '') + ((company.products || []).length ? ' Produtos: ' + company.products.map(function (item) { return item.name + ' (' + money(item.price) + ')'; }).join(', ') : ''), 'empresa loja produto cidade', 'empresa');
    });
    (Array.isArray(city.news) ? city.news : []).forEach(function (item) {
      addFact('Notícia: ' + item.title, item.description || 'Notícia recente da cidade.', 'noticia novidade atualizacao cidade', 'noticia');
    });
    (Array.isArray(city.events) ? city.events : []).forEach(function (item) {
      addFact('Evento: ' + item.title, item.description || 'Evento registrado na cidade.', 'evento acontecimento cidade', 'evento');
    });
    (Array.isArray(data.proposals) ? data.proposals : []).forEach(function (item) {
      addFact('Proposta: ' + item.title, item.description + ' Status: ' + item.status + (item.response ? '. Resposta: ' + item.response : ''), 'proposta prefeitura', 'proposta');
    });

    var hospital = data.hospital || {};
    (Array.isArray(hospital.services) ? hospital.services : []).forEach(function (service) {
      addFact('Exame/serviço: ' + service.name, service.category + ', ' + money(service.price) + '. ' + service.description + (service.estimatedTime ? ' Tempo estimado: ' + service.estimatedTime + '.' : ''), 'hospital consulta exame medico preco', 'hospital');
    });
    (Array.isArray(hospital.conditions) ? hospital.conditions : []).forEach(function (condition) {
      addFact('Condição acompanhada no jogo: ' + condition.name, 'Gravidade: ' + condition.severity + '. ' + condition.treatment + ((condition.medications || []).length ? ' Itens de suporte associados: ' + condition.medications.join(', ') + '.' : ''), 'hospital doenca saude tratamento gravidade', 'hospital'));
    });
    (Array.isArray(hospital.pharmacy) ? hospital.pharmacy : []).forEach(function (item) {
      addFact('Farmácia: ' + item.name, money(item.price) + '. ' + item.description + (item.note ? ' ' + item.note : ''), 'farmacia remedio medicamento comprar preco', 'farmacia'));
    });

    var rewards = city.missionRewards || {};
    (Array.isArray(data.jobs) ? data.jobs : []).forEach(function (job) {
      var reward = rewards[job.id];
      if (reward) addFact('Recompensas de missão: ' + job.name, number(reward.questionsPerMission) + ' perguntas, ' + number(reward.xpPerMission) + ' XP e ' + money(reward.moneyPerMission) + '.', 'missao recompensa profissao xp dinheiro', 'missao');
    });

    (Array.isArray(data.systems) ? data.systems : []).forEach(function (system) {
      addFact('Sistema da cidade: ' + system, 'Use a seção correspondente no menu para consultar as informações e realizar ações.', system, 'sistema');
    });
    return facts;
  }

  function searchFacts(query, facts) {
    var queryTokens = Array.from(new Set(tokens(query)));
    if (!queryTokens.length) return [];
    var normalizedQuery = normalize(query);
    return facts.map(function (fact) {
      var searchable = new Set(tokens([fact.title, fact.detail, fact.keywords, fact.category].join(' ')));
      var overlap = queryTokens.filter(function (word) { return searchable.has(word); }).length;
      var score = overlap / Math.sqrt(queryTokens.length * Math.max(1, searchable.size));
      var normalizedTitle = normalize(fact.title);
      if (normalizedTitle && normalizedQuery.includes(normalizedTitle)) score += 0.8;
      if (fact.category && queryTokens.includes(fact.category)) score += 0.15;
      return { fact: fact, score: score, overlap: overlap };
    }).filter(function (entry) {
      return entry.overlap > 0 && entry.score >= 0.16;
    }).sort(function (a, b) {
      return b.score - a.score;
    }).slice(0, 5).map(function (entry) { return entry.fact; });
  }

  function answer(query, data) {
    var normalized = normalize(query);
    var intent = tokens(query).join(' ');
    var has = function (term) { return intent.indexOf(term) >= 0; };
    var player = data.player;
    var city = data.city;
    var hospital = data.hospital || {};
    var jobs = Array.isArray(data.jobs) ? data.jobs : [];
    var memories = memoryMatches(query, data.knowledge);

    if (/^(oi|ola|e ai|opa|fala|bom dia|boa tarde|boa noite)\b/.test(normalized)) {
      return list(choose(['Oi, ' + player.name + '!', 'Olá, ' + player.name + '!', 'Que bom falar com você, ' + player.name + '!'], 'greeting'), [
        choose(['Consultei os dados mais recentes da cidade.', 'Estou com as informações atuais de Sorokiba abertas.', 'Posso buscar informações atualizadas dos sistemas do jogo.'], 'greeting-detail'),
        'Pergunte sobre seu personagem, profissões, missões, lojas, empresas, hospital, notícias ou eventos.'
      ]);
    }
    if (/^(quem e voce|quem e o kiba|sobre voce|o que voce e)$/.test(normalized)) {
      return list('Quem é o Kiba?', ['Sou o mascote e assistente local de Sorokiba.', 'Não uso um modelo externo: encontro informações nas regras e nos dados atuais do jogo, além das memórias cadastradas pela Prefeitura.']);
    }
    if (normalized.includes('ajuda') || normalized.includes('o que voce sabe') || normalized.includes('que voce sabe')) {
      return list('Posso consultar', (data.systems || []).concat(['Seu progresso e seus recursos', 'Informações ensinadas pela Prefeitura']));
    }
    if (has('atualizar') || normalized.includes('ultima atualizacao') || normalized.includes('novidade')) {
      var updates = (Array.isArray(city.news) ? city.news.slice(-5).reverse() : []).map(function (item) { return item.title + (item.description ? ': ' + item.description : ''); });
      if (updates.length) return list('Informações recentes', updates);
      return list('Informações recentes', ['Não há notícias recentes registradas na cidade neste momento.', 'Os dados de sistemas, lojas e serviços são consultados novamente a cada pergunta.']);
    }
    if (has('noticia')) {
      var news = (Array.isArray(city.news) ? city.news.slice(-8).reverse() : []).map(function (item) { return item.title + (item.description ? ': ' + item.description : ''); });
      return news.length ? list('Notícias recentes', news) : 'Ainda não há notícias registradas na cidade.';
    }
    if (normalized.includes('cidade') || normalized.includes('sorokiba')) {
      return list('Sorokiba agora', [
        'População: ' + number(city.population) + ' habitantes.',
        'Economia: ' + number(city.economy) + '.',
        'Infraestrutura: ' + number(city.infrastructure) + '.',
        'Qualidade de vida: ' + number(city.quality) + '.',
        'Também posso consultar notícias, eventos, profissões, lojas e serviços.'
      ]);
    }
    if (has('evento')) {
      var events = (Array.isArray(city.events) ? city.events.slice(-8).reverse() : []).map(function (item) { return item.title + (item.description ? ': ' + item.description : ''); });
      return events.length ? list('Eventos da cidade', events) : 'Ainda não há eventos registrados na cidade.';
    }
    if (has('doenca') || has('condicao') || has('gravidade') || has('exame') || has('hospital') || has('tratamento') || has('consulta') || has('retorno') || has('internacao') || has('internar') || has('sintoma') || has('medico')) {
      if (has('doenca') || has('gravidade')) {
        var conditions = hospital.conditions || [];
        return conditions.length ? list('Condições investigadas no Hospital', conditions.map(function (condition) { return condition.name + ' — gravidade ' + condition.severity + '. ' + condition.treatment; })) : 'Não consegui carregar a lista de condições do Hospital.';
      }
      var requestedCondition = (hospital.conditions || []).find(function (condition) {
        return tokens(condition.name).some(function (word) { return intent.split(' ').indexOf(word) >= 0; });
      });
      if (requestedCondition && has('tratamento')) return list(requestedCondition.name, ['Gravidade registrada no jogo: ' + requestedCondition.severity + '.', requestedCondition.treatment]);
      if (has('exame')) {
        var services = hospital.services || [];
        return services.length ? list('Exames e serviços hospitalares', services.map(function (service) { return service.name + ' — ' + money(service.price) + (service.estimatedTime ? ', ' + service.estimatedTime : '') + '. ' + service.description; })) : 'Não consegui carregar os exames do Hospital.';
      }
      if (hospital.visit) return list('Seu atendimento atual', ['Etapa: ' + (hospital.visit.stage || 'em andamento') + '.', hospital.visit.diagnosis ? 'Avaliação: ' + hospital.visit.diagnosis.name + '.' : 'A equipe ainda está avaliando os dados do atendimento.', 'Consulte a tela Hospital para acompanhar orientações e próximos passos.']);
      return list('Hospital de Sorokiba', ['A equipe realiza triagem, consulta, exames, diagnóstico, tratamento e retorno.', 'A avaliação individual acontece na tela Hospital; não consigo diagnosticar seu personagem pelo chat.']);
    }
    if (has('farmacia') || has('medicamento')) {
      var products = hospital.pharmacy || [];
      return products.length ? list('Farmácia Hospitalar', products.map(function (item) { return item.name + ' — ' + money(item.price) + '. ' + item.description; })) : 'Não consegui carregar o catálogo da Farmácia agora.';
    }
    if (has('profissao') || has('salario')) {
      var results = jobs;
      if ((normalized.includes('minha') || normalized.includes('meu') || normalized.includes('atual')) && data.currentJob) {
        return list('Sua profissão atual', [data.currentJob.name + ' — salário ' + money(data.currentJob.salary) + ', requisito de ' + number(data.currentJob.xpRequired) + ' XP. ' + (data.currentJob.task || '')]);
      }
      if (has('melhor') || intent.includes('maior salario')) results = results.slice().sort(function (a, b) { return Number(b.salary) - Number(a.salary); }).slice(0, 1);
      return results.length ? list(has('salario') ? 'Salários das profissões' : 'Profissões da cidade', results.map(function (job) {
        return job.name + ' — salário ' + money(job.salary) + ', requisito de ' + number(job.xpRequired) + ' XP. ' + (job.task || '');
      })) : 'Não consegui consultar as profissões agora.';
    }
    if (has('missao')) {
      var active = data.missions && data.missions.active || [];
      var reward = data.currentJob && (city.missionRewards || {})[data.currentJob.id];
      return list('Missões', [
        active.length ? 'Você tem ' + active.length + ' missão(ões) ativa(s).' : 'Você não tem uma missão ativa agora.',
        data.currentJob ? 'Sua profissão atual é ' + data.currentJob.name + '.' : 'Você ainda não tem profissão definida.',
        reward ? 'Cada missão da sua profissão pode render ' + number(reward.xpPerMission) + ' XP e ' + money(reward.moneyPerMission) + '.' : 'Consulte a tela Missões para ver disponibilidade e recompensas atuais.'
      ]);
    }
    if (has('xp') || has('experiencia') || has('nivel') || has('progresso')) {
      return list('Seu progresso', ['Nível ' + number(player.level) + ' • ' + number(player.xp) + ' XP.', player.jobName ? 'Profissão: ' + player.jobName + '.' : 'Você ainda não escolheu uma profissão.']);
    }
    if (has('dinheiro') || has('saldo') || has('grana') || has('banco')) {
      return list('Seus recursos', ['Dinheiro disponível: ' + money(player.money) + '.', 'Saldo bancário: ' + money(player.bankBalance) + '.', 'Para depositar, sacar ou transferir, use a tela Banco; o chat não realiza operações financeiras.']);
    }
    if (has('inventario') || has('estoque') || has('comprei')) {
      var inventory = Object.entries(player.inventory || {}).filter(function (entry) { return Number(entry[1]) > 0; }).map(function (entry) { return entry[0] + ': ' + number(entry[1]); });
      var medicines = Object.entries(player.hospitalPharmacyInventory || {}).filter(function (entry) { return Number(entry[1]) > 0; }).map(function (entry) { return entry[0] + ': ' + number(entry[1]); });
      return list('Seu inventário', inventory.concat(medicines).length ? inventory.concat(medicines) : ['Seu inventário está vazio no momento.']);
    }
    if (has('saude') || has('vida') || has('fome') || has('sede') || has('energia') || intent.includes('sinal vital') || normalized.includes('como estou')) {
      return list('Como está seu personagem', ['Vida: ' + number(player.life) + '.', 'Fome: ' + number(player.hunger) + '.', 'Hidratação: ' + number(player.hydration) + '.', 'Energia: ' + number(player.energy) + '.']);
    }
    if (has('prefeitura') || has('prefeito')) {
      return list('Prefeitura', ['A Prefeitura acompanha propostas, indicadores e comunicados da cidade.', player.isMayor ? 'Seu perfil possui acesso aos controles administrativos.' : 'Você pode enviar propostas pela área correspondente e acompanhar a resposta.']);
    }
    if (has('bug') || has('erro') || has('problema') || intent.includes('nao funciona')) {
      return list('Vamos entender o que houve', ['Em qual tela aconteceu?', 'O que você fez antes do problema?', 'Se apareceu uma mensagem de erro, copie o texto para eu ajudar a localizar o sistema envolvido.']);
    }

    var facts = searchFacts(query, makeFacts(data));
    if (!facts.length && history.length && tokens(query).length <= 4) {
      var previousQuestion = history.slice().reverse().find(function (item) { return item.role === 'user'; });
      if (previousQuestion) facts = searchFacts(previousQuestion.content + ' ' + query, makeFacts(data));
    }
    if (facts.length) return list(choose(['Encontrei estas informações', 'Veja o que está registrado agora', 'Aqui está o que encontrei'], 'search-title'), facts.map(function (fact) {
      return fact.title + ': ' + fact.detail;
    }));
    if (memories.length) return list('O que a Prefeitura registrou', memories.map(function (item) {
      return item.title + ': ' + item.content;
    }));
    return list(choose(['Ainda não encontrei essa informação', 'Não achei esse assunto nos dados que consultei', 'Essa informação não apareceu na minha busca local'], 'unknown'), [
      'Consultei os dados atuais do jogo, mas não encontrei uma resposta confiável para essa pergunta.',
      'Tente dizer o nome de um sistema, serviço, item ou assunto específico. A Prefeitura também pode cadastrar informações para eu consultar.'
    ]);
  }

  function ask(text) {
    var query = String(text || '').trim();
    if (!query || busy) return;
    busy = true;
    add(query, 'user');
    var messages = document.getElementById('kibaMsgs');
    var waiting = thinking(messages);
    getContext().then(function (data) {
      var response = answer(query, data);
      if (waiting) waiting.remove();
      add(response, 'assistant');
      history.push({ role: 'user', content: query }, { role: 'assistant', content: response });
      history = history.slice(-16);
    }).catch(function (error) {
      if (waiting) waiting.remove();
      add(list('Não consegui atualizar as informações', [error.message || 'Verifique sua conexão e tente novamente.', 'Não vou inventar uma resposta enquanto os dados do jogo estiverem indisponíveis.']), 'assistant');
    }).finally(function () {
      busy = false;
    });
  }

  function bind() {
    var chat = document.getElementById('kibaChat');
    if (!chat) return;
    var subtitle = chat.querySelector('.kh small');
    if (subtitle) subtitle.textContent = 'Assistente local • consulta os dados atuais do jogo';
    if (chat.dataset.localAiBound) return;
    chat.dataset.localAiBound = '1';
    var form = chat.querySelector('.kf');
    var input = form && form.querySelector('input');
    if (form) form.onsubmit = function (event) {
      event.preventDefault();
      if (!input || busy) return;
      var text = input.value.trim();
      input.value = '';
      ask(text);
    };
    chat.querySelectorAll('.kq button').forEach(function (button) {
      button.onclick = function () { ask(button.textContent); };
    });
  }

  var style = document.createElement('style');
  style.textContent = '.kiba-thinking{color:#d7c08d;animation:kibaPulse 1s ease-in-out infinite alternate}.kiba-title{display:block;font-size:14px;margin:2px 0 7px;font-weight:800;letter-spacing:.2px}.kiba-bullet{margin:4px 0;padding-left:2px;line-height:1.45}.msg.bot br{content:"";display:block;margin-top:3px}@keyframes kibaPulse{from{opacity:.55}to{opacity:1}}';
  document.head.appendChild(style);
  var observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  bind();
  window.sorokibaKibaAI = { ask: ask, clear: function () { history = []; recentAnswers = []; } };
})();
