(function () {
  'use strict';
  if (window.__kibaLocalAI) return;
  window.__kibaLocalAI = true;

  var history = [];
  var busy = false;
  var recentAnswers = [];
  var stopTimer = null;
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
    'custa': 'preco', 'custo': 'preco', 'custam': 'preco',
    'atualizacao': 'atualizar', 'atualizacoes': 'atualizar',
    'mudancas': 'mudanca', 'mudou': 'mudanca', 'mudaram': 'mudanca',
    'funciona': 'funcionamento', 'funcionam': 'funcionamento',
    'explica': 'explicar', 'explicar': 'explicar', 'explique': 'explicar',
    'ganha': 'salario', 'ganhar': 'salario', 'recebe': 'salario', 'receber': 'salario',
    'peneumonia': 'pneumonia'
  };

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function tokens(value) {
    return normalize(value).split(/\s+/).filter(function (word) {
      return word.length > 1 && word.length <= 50 && !stopWords.has(word);
    }).map(function (word) {
      return aliases[word] || word;
    }).slice(0, 80);
  }

  function editDistanceWithinOne(left, right) {
    if (Math.abs(left.length - right.length) > 1) return false;
    var row = Array.from({ length: right.length + 1 }, function (_, index) { return index; });
    for (var i = 1; i <= left.length; i++) {
      var previous = row[0];
      row[0] = i;
      var minimum = row[0];
      for (var j = 1; j <= right.length; j++) {
        var old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
        previous = old;
        minimum = Math.min(minimum, row[j]);
      }
      if (minimum > 1) return false;
    }
    return row[right.length] <= 1;
  }

  function tokenOverlap(queryWords, documentWords) {
    var matched = 0;
    queryWords.forEach(function (word) {
      if (documentWords.has(word)) {
        matched += 1;
        return;
      }
      var fuzzy = word.length >= 5 && Array.from(documentWords).some(function (candidate) {
        return candidate.length >= 5 && editDistanceWithinOne(word, candidate);
      });
      if (fuzzy) matched += 0.72;
    });
    return matched;
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

  function thinking(messages, query, followedUp) {
    if (!messages) return null;
    var element = document.createElement('div');
    element.className = 'msg bot kiba-thinking';
    element.setAttribute('role', 'status');
    var status = document.createElement('span');
    status.className = 'kiba-thinking-status';
    status.textContent = 'Entendendo a pergunta e escolhendo onde procurar…';
    var target = document.createElement('small');
    target.className = 'kiba-thinking-target';
    target.textContent = 'Buscando: ' + searchTarget(query, followedUp);
    var elapsed = document.createElement('small');
    elapsed.className = 'kiba-thinking-time';
    element.append(status, target, elapsed);
    messages.appendChild(element);
    messages.scrollTop = messages.scrollHeight;
    return { element: element, status: status, elapsed: elapsed };
  }

  function elapsedSeconds(startedAt) {
    var now = window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
    return Math.max(0, (now - startedAt) / 1000);
  }

  function showElapsed(node, startedAt, label) {
    if (!node) return;
    node.textContent = (label || 'Tempo de busca') + ': ' + elapsedSeconds(startedAt).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' s';
  }

  function addSearchReport(query, followedUp, startedAt, isError) {
    var messages = document.getElementById('kibaMsgs');
    if (!messages) return;
    var report = document.createElement('small');
    report.className = 'kiba-search-report' + (isError ? ' kiba-search-error' : '');
    report.textContent = (isError ? 'Busca interrompida' : 'Busca concluída') + ' em ' +
      elapsedSeconds(startedAt).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' s • ' +
      'Busquei por: ' + searchTarget(query, followedUp) + ' • Fontes: ' + searchSources(query, followedUp).join(', ') + '.';
    var lastMessage = messages.lastElementChild;
    if (lastMessage && lastMessage.classList.contains('bot')) lastMessage.appendChild(report);
    messages.scrollTop = messages.scrollHeight;
  }

  function list(title, lines) {
    return '### ' + title + '\n' + lines.filter(Boolean).map(function (line) {
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

  function dateLabel(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value.split('-').reverse().join('/');
    }
    var date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR') : '';
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
      var hits = tokenOverlap(Array.from(queryTokens), memoryTokens);
      var score = hits / queryTokens.size;
      if (normalize(query).length > 4 && normalize(text).includes(normalize(query))) score += 1;
      return { memory: memory, score: score, hits: hits };
    }).filter(function (match) {
      return match.hits > 0 && match.score >= 0.18;
    }).sort(function (a, b) {
      return b.score - a.score;
    }).slice(0, 4);
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
      addFact('Loja: ' + item.name, money(item.price) + (item.description ? '. ' + item.description : ''), 'loja comprar item produto preco', 'loja');
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
    (Array.isArray(data.releaseNotes) ? data.releaseNotes : []).forEach(function (item) {
      addFact('Atualização do jogo: ' + item.title, item.description + (item.date ? ' (' + item.date + ')' : ''), 'mudanca atualizar atualizacao novidade jogo sistema', 'atualizacao');
    });
    (Array.isArray(data.proposals) ? data.proposals : []).forEach(function (item) {
      addFact('Proposta: ' + item.title, item.description + ' Status: ' + item.status + (item.response ? '. Resposta: ' + item.response : ''), 'proposta prefeitura', 'proposta');
    });
    (Array.isArray(data.guides) ? data.guides : []).forEach(function (item) {
      addFact('Como funciona: ' + item.title, item.content, item.title + ' funcionamento explicar ajuda guia regras', 'guia');
    });

    var hospital = data.hospital || {};
    (Array.isArray(hospital.services) ? hospital.services : []).forEach(function (service) {
      addFact('Exame/serviço: ' + service.name, service.category + ', ' + money(service.price) + '. ' + service.description + (service.estimatedTime ? ' Tempo estimado: ' + service.estimatedTime + '.' : ''), 'hospital consulta exame medico preco', 'hospital');
    });
    (Array.isArray(hospital.conditions) ? hospital.conditions : []).forEach(function (condition) {
      addFact('Condição acompanhada no jogo: ' + condition.name, 'Gravidade: ' + condition.severity + '. ' + condition.treatment + ((condition.medications || []).length ? ' Itens de suporte associados: ' + condition.medications.join(', ') + '.' : ''), 'hospital doenca saude tratamento gravidade', 'hospital');
    });
    (Array.isArray(hospital.pharmacy) ? hospital.pharmacy : []).forEach(function (item) {
      addFact('Farmácia: ' + item.name, money(item.price) + '. ' + item.description + (item.note ? ' ' + item.note : ''), 'farmacia remedio medicamento comprar preco', 'farmacia');
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
      var overlap = tokenOverlap(queryTokens, searchable);
      var score = overlap / queryTokens.length;
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

  function findNamedEntity(query, items, getTerms) {
    var queryWords = Array.from(new Set(tokens(query)));
    if (!queryWords.length || !Array.isArray(items)) return null;
    return items.map(function (item) {
      var entityWords = new Set(tokens(getTerms(item)));
      var matched = tokenOverlap(queryWords, entityWords);
      return { item: item, matched: matched, score: matched / Math.sqrt(queryWords.length * Math.max(1, entityWords.size)) };
    }).filter(function (match) {
      return match.matched > 0 && match.score >= 0.2;
    }).sort(function (left, right) {
      return right.score - left.score;
    })[0]?.item || null;
  }

  function resolveFollowUp(query) {
    var queryWords = tokens(query);
    var previousQuestion = history.slice().reverse().find(function (entry) {
      return entry.role === 'user';
    });
    if (!previousQuestion || !queryWords.length) return { query: query, followedUp: false };
    var normalized = normalize(query);
    var beginsAsFollowUp = /^(e|isso|esse|essa|ele|ela|eles|elas|entao|mas|tambem|e sobre|e quanto|e como|qual deles|qual delas)\b/.test(normalized);
    if (/^(oi|ola|e ai|opa|fala|bom dia|boa tarde|boa noite|obrigado|obrigada)\b/.test(normalized)) return { query: query, followedUp: false };
    var standaloneTopics = new Set(['cidade', 'populacao', 'economia', 'infraestrutura', 'qualidade', 'profissao', 'salario', 'missao', 'xp', 'nivel', 'dinheiro', 'banco', 'saldo', 'loja', 'empresa', 'farmacia', 'medicamento', 'hospital', 'exame', 'doenca', 'noticia', 'evento', 'prefeitura', 'inventario', 'atualizar', 'mudanca', 'vida', 'saude', 'sinal', 'vital', 'fome', 'sede', 'energia', 'personagem', 'ajuda']);
    var hasStandaloneTopic = queryWords.some(function (word) { return standaloneTopics.has(word); });
    var isShortFollowUp = beginsAsFollowUp || (queryWords.length <= 3 && !hasStandaloneTopic);
    if (!isShortFollowUp) return { query: query, followedUp: false };
    return { query: previousQuestion.content + ' ' + query, followedUp: true };
  }

  function searchSources(query, followedUp) {
    var normalized = normalize(query);
    var intent = tokens(query).join(' ');
    var sources = [];
    var addSource = function (condition, label) {
      if (condition) sources.push(label);
    };
    addSource(followedUp, 'assunto da pergunta anterior');
    addSource(intent.includes('atualizar') || intent.includes('mudanca') || normalized.includes('novidade'), 'atualizações registradas');
    addSource(intent.includes('noticia'), 'notícias da cidade');
    addSource(intent.includes('evento'), 'eventos');
    addSource(intent.includes('hospital') || intent.includes('exame') || intent.includes('doenca') || intent.includes('condicao') || intent.includes('gravidade') || intent.includes('tratamento') || intent.includes('sintoma') || intent.includes('consulta') || intent.includes('internar') || /\b(raio|tomografia|ressonancia|eletrocardiograma)\b/.test(normalized), 'Hospital e Farmácia');
    addSource(intent.includes('medicamento') || intent.includes('farmacia'), 'catálogo da Farmácia');
    addSource(intent.includes('profissao') || intent.includes('salario'), 'profissões e salários');
    addSource(intent.includes('missao'), 'missões e recompensas');
    addSource(intent.includes('banco') || intent.includes('dinheiro') || intent.includes('saldo'), 'recursos do personagem');
    addSource(intent.includes('xp') || intent.includes('nivel') || intent.includes('vida') || intent.includes('saude') || intent.includes('inventario') || intent.includes('sinal'), 'perfil do jogador');
    addSource(intent.includes('loja') || intent.includes('produto') || intent.includes('preco') || intent.includes('empresa') || intent.includes('empresas'), 'lojas e empresas');
    addSource(intent.includes('prefeitura') || intent.includes('proposta'), 'Prefeitura e propostas');
    addSource(intent.includes('populacao') || intent.includes('economia') || intent.includes('infraestrutura') || intent.includes('qualidade') || normalized.includes('cidade'), 'indicadores da cidade');
    addSource(intent.includes('funcionamento') || intent.includes('explicar'), 'guias de funcionamento dos sistemas');
    if (!sources.length) sources.push('sistemas do jogo e memória ensinada pela Prefeitura');
    else if (sources.indexOf('sistemas do jogo e memória ensinada pela Prefeitura') < 0) sources.push('memória ensinada pela Prefeitura');
    return sources;
  }

  function searchTarget(query, followedUp) {
    var normalized = normalize(query);
    var intent = tokens(query).join(' ');
    if (followedUp) return 'continuando o assunto anterior: ' + query.trim();
    if (intent.includes('mudanca') || intent.includes('atualizar') || normalized.includes('novidade')) return 'mudanças recentes e atualizações de Sorokiba';
    if (intent.includes('funcionamento') || intent.includes('explicar')) return 'como funcionam os sistemas de Sorokiba';
    if (intent.includes('noticia')) return 'notícias publicadas pela Prefeitura';
    if (intent.includes('evento')) return 'eventos registrados na cidade';
    if (intent.includes('hospital') || intent.includes('exame') || intent.includes('doenca') || intent.includes('tratamento') || /\b(raio|tomografia|ressonancia|eletrocardiograma)\b/.test(normalized)) return 'informações e etapas do Hospital';
    if (intent.includes('profissao') || intent.includes('salario')) return 'profissões, requisitos e salários';
    if (intent.includes('missao')) return 'missões e recompensas disponíveis';
    if (intent.includes('loja') || intent.includes('empresa') || intent.includes('preco') || intent.includes('medicamento')) return 'produtos, lojas e preços';
    if (intent.includes('banco') || intent.includes('dinheiro') || intent.includes('saldo')) return 'saldo e recursos do personagem';
    if (intent.includes('xp') || intent.includes('nivel') || intent.includes('inventario')) return 'progresso e inventário do personagem';
    return 'o significado da pergunta e os dados atuais do jogo';
  }

  function explainGuide(query, guides) {
    var normalized = normalize(query);
    var words = Array.from(new Set(tokens(query)));
    if (!guides.length) return null;
    if (/como funciona o jogo|como jogar|como funciona sorokiba/.test(normalized)) {
      return list('Como funciona Sorokiba', guides.map(function (guide) { return guide.title + ': ' + guide.content; }));
    }
    var generalQuestionWords = new Set(['funcionamento', 'explicar', 'ajuda', 'jogo']);
    if (words.every(function (word) { return generalQuestionWords.has(word); })) {
      return list('Como funciona Sorokiba', guides.map(function (guide) { return guide.title + ': ' + guide.content; }));
    }
    var matches = guides.map(function (guide) {
      var guideWords = new Set(tokens(guide.title + ' ' + guide.content));
      var score = tokenOverlap(words, guideWords) / Math.max(1, words.length);
      return { guide: guide, score: score };
    }).filter(function (result) {
      return result.score >= 0.2;
    }).sort(function (left, right) {
      return right.score - left.score;
    }).slice(0, 3);
    if (!matches.length) return null;
    return list('Como funciona', matches.map(function (result) {
      return result.guide.title + ': ' + result.guide.content;
    }));
  }

  function answer(query, data) {
    var normalized = normalize(query);
    var intentTokens = new Set(tokens(query));
    var intent = Array.from(intentTokens).join(' ');
    var has = function (term) { return intentTokens.has(term); };
    var player = data.player;
    var city = data.city;
    var hospital = data.hospital || {};
    var jobs = Array.isArray(data.jobs) ? data.jobs : [];
    var memories = memoryMatches(query, data.knowledge);
    var namedCondition = findNamedEntity(query, hospital.conditions, function (condition) { return condition.name; });
    var namedExam = findNamedEntity(query, hospital.services, function (service) { return service.name; });
    var namedMedicine = findNamedEntity(query, hospital.pharmacy, function (item) { return item.name; });
    if (namedExam && has('preco')) return list(namedExam.name, [money(namedExam.price) + (namedExam.estimatedTime ? ' • tempo estimado: ' + namedExam.estimatedTime : '') + '.', namedExam.description]);
    if (namedMedicine && has('preco')) return list(namedMedicine.name, [money(namedMedicine.price) + '.', namedMedicine.description, namedMedicine.note || '']);

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
    if (has('explicar') || has('funcionamento') || normalized.includes('como funciona o jogo') || normalized.includes('como jogar') || normalized.includes('como funciona sorokiba')) {
      var guideAnswer = explainGuide(query, data.guides || []);
      if (guideAnswer) return guideAnswer;
    }
    if (memories.length && memories[0].score >= 0.5) return list('O que a Prefeitura ensinou', memories.slice(0, 3).map(function (match) {
      return match.memory.title + ': ' + match.memory.content;
    }));
    if (has('atualizar') || has('mudanca') || normalized.includes('ultima atualizacao') || normalized.includes('novidade')) {
      var combinedUpdates = (Array.isArray(data.releaseNotes) ? data.releaseNotes : []).concat(Array.isArray(city.news) ? city.news : [])
        .sort(function (left, right) {
          var leftDate = Date.parse(left.date || left.createdAt || '') || 0;
          var rightDate = Date.parse(right.date || right.createdAt || '') || 0;
          return rightDate - leftDate;
        }).slice(0, 8).map(function (item) {
          var date = dateLabel(item.date || item.createdAt);
          return (date ? date + ' — ' : '') +
            (item.title || 'Atualização') + (item.description || item.text ? ': ' + (item.description || item.text) : '');
        });
      if (combinedUpdates.length) return list('Mudanças e informações recentes', combinedUpdates);
      return list('Informações recentes', ['Não há um histórico de atualizações ou notícias publicado agora.', 'Os dados atuais dos sistemas são consultados novamente a cada pergunta.']);
    }
    if (has('noticia')) {
      var news = (Array.isArray(city.news) ? city.news.slice(0, 8) : []).map(function (item) { return item.title + (item.description ? ': ' + item.description : ''); });
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
      var events = (Array.isArray(city.events) ? city.events.slice(0, 8) : []).map(function (item) { return item.title + (item.description ? ': ' + item.description : ''); });
      return events.length ? list('Eventos da cidade', events) : 'Ainda não há eventos registrados na cidade.';
    }
    if (has('doenca') || has('condicao') || has('gravidade') || has('exame') || has('hospital') || has('tratamento') || has('consulta') || has('retorno') || has('internacao') || has('internar') || has('sintoma')) {
      if (has('doenca') || has('gravidade')) {
        if (namedCondition) return list(namedCondition.name, ['Gravidade registrada no jogo: ' + namedCondition.severity + '.', namedCondition.treatment]);
        var conditions = hospital.conditions || [];
        return conditions.length ? list('Condições investigadas no Hospital', conditions.map(function (condition) { return condition.name + ' — gravidade ' + condition.severity + '. ' + condition.treatment; })) : 'Não consegui carregar a lista de condições do Hospital.';
      }
      if (namedCondition && (has('tratamento') || has('sintoma') || has('consulta'))) return list(namedCondition.name, ['Gravidade registrada no jogo: ' + namedCondition.severity + '.', namedCondition.treatment]);
      if (has('exame')) {
        if (namedExam) return list(namedExam.name, [money(namedExam.price) + (namedExam.estimatedTime ? ' • tempo estimado: ' + namedExam.estimatedTime : '') + '.', namedExam.description]);
        var services = hospital.services || [];
        return services.length ? list('Exames e serviços hospitalares', services.map(function (service) { return service.name + ' — ' + money(service.price) + (service.estimatedTime ? ', ' + service.estimatedTime : '') + '. ' + service.description; })) : 'Não consegui carregar os exames do Hospital.';
      }
      if (namedCondition) return list(namedCondition.name, ['Gravidade registrada no jogo: ' + namedCondition.severity + '.', namedCondition.treatment]);
      if (namedExam && has('preco')) return list(namedExam.name, [money(namedExam.price) + (namedExam.estimatedTime ? ' • tempo estimado: ' + namedExam.estimatedTime : '') + '.', namedExam.description]);
      if (hospital.visit) return list('Seu atendimento atual', ['Etapa: ' + (hospital.visit.stage || 'em andamento') + '.', hospital.visit.diagnosis ? 'Avaliação: ' + hospital.visit.diagnosis.name + '.' : 'A equipe ainda está avaliando os dados do atendimento.', 'Consulte a tela Hospital para acompanhar orientações e próximos passos.']);
      return list('Hospital de Sorokiba', ['A equipe realiza triagem, consulta, exames, diagnóstico, tratamento e retorno.', 'A avaliação individual acontece na tela Hospital; não consigo diagnosticar seu personagem pelo chat.']);
    }
    if (has('farmacia') || has('medicamento')) {
      if (namedMedicine) return list(namedMedicine.name, [money(namedMedicine.price) + '.', namedMedicine.description, namedMedicine.note || '']);
      var products = hospital.pharmacy || [];
      return products.length ? list('Farmácia Hospitalar', products.map(function (item) { return item.name + ' — ' + money(item.price) + '. ' + item.description; })) : 'Não consegui carregar o catálogo da Farmácia agora.';
    }
    if (has('profissao') || has('salario')) {
      var namedJobs = jobs.filter(function (job) {
        return tokens(job.name).some(function (word) { return intentTokens.has(word); });
      });
      var results = namedJobs.length ? namedJobs : jobs;
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
        reward ? 'Cada missão da sua profissão pode render ' + number(reward.xpPerMission) + ' XP e ' + money(reward.moneyPerMission) + '.' : 'Consulte a tela Missões para ver disponibilidade e recompensas atuais.',
        data.missions && Number.isFinite(Number(data.missions.remaining)) ? 'Missões restantes antes da pausa: ' + number(data.missions.remaining) + '.' : '',
        data.missions && data.missions.cooldownUntil ? 'Há uma pausa de missões até ' + dateLabel(data.missions.cooldownUntil) + '.' : ''
      ]);
    }
    if (has('xp') || has('experiencia') || has('nivel') || has('progresso')) {
      return list('Seu progresso', ['Nível ' + number(player.level) + ' • ' + number(player.xp) + ' XP.', player.jobName ? 'Profissão: ' + player.jobName + '.' : 'Você ainda não escolheu uma profissão.']);
    }
    if (has('dinheiro') || has('saldo') || has('grana') || has('banco')) {
      return list('Seus recursos', ['Dinheiro disponível: ' + money(player.money) + '.', 'Saldo bancário: ' + money(player.bankBalance) + '.', 'Para depositar, sacar ou transferir, use a tela Banco; o chat não realiza operações financeiras.']);
    }
    if (has('inventario') || has('estoque') || has('comprei')) {
      var companyProducts = (data.companies || []).reduce(function (all, company) {
        return all.concat(company.products || []);
      }, []);
      var products = (data.shop || []).concat(hospital.pharmacy || [], companyProducts);
      var inventory = Object.entries(player.inventory || {}).filter(function (entry) { return Number(entry[1]) > 0; }).map(function (entry) {
        var item = products.find(function (product) { return String(product.id) === String(entry[0]); });
        return (item ? item.name : 'Item ' + entry[0]) + ': ' + number(entry[1]);
      });
      var medicines = Object.entries(player.hospitalPharmacyInventory || {}).filter(function (entry) { return Number(entry[1]) > 0; }).map(function (entry) {
        var item = (hospital.pharmacy || []).find(function (product) { return product.id === entry[0]; });
        return (item ? item.name : 'Produto da Farmácia') + ': ' + number(entry[1]);
      });
      var companyInventory = Object.entries(player.companyInventory || {}).filter(function (entry) { return Number(entry[1]) > 0; }).map(function (entry) {
        var item = companyProducts.find(function (product) { return String(product.id) === String(entry[0]); });
        return (item ? item.name : 'Produto de empresa ' + entry[0]) + ': ' + number(entry[1]);
      });
      var items = inventory.concat(medicines, companyInventory);
      return list('Seu inventário', items.length ? items : ['Seu inventário está vazio no momento.']);
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
      return item.memory.title + ': ' + item.memory.content;
    }));
    return list(choose(['Ainda não encontrei essa informação', 'Não achei esse assunto nos dados que consultei', 'Essa informação não apareceu na minha busca local'], 'unknown'), [
      'Consultei os dados atuais do jogo, mas não encontrei uma resposta confiável para essa pergunta.',
      'Tente dizer o nome de um sistema, serviço, item ou assunto específico. A Prefeitura também pode cadastrar informações para eu consultar.'
    ]);
  }

  function ask(text) {
    var query = String(text || '').trim().slice(0, 300);
    if (!query || busy) return;
    busy = true;
    var startedAt = window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
    var resolved = resolveFollowUp(query);
    var sourceQuery = resolved.query;
    add(query, 'user');
    var messages = document.getElementById('kibaMsgs');
    var waiting = thinking(messages, sourceQuery, resolved.followedUp);
    var stages = ['Buscando informações atuais da cidade e dos sistemas do jogo…', 'Comparando resultados e verificando o que é mais relevante…'];
    var stageIndex = 0;
    showElapsed(waiting && waiting.elapsed, startedAt, 'Pensando');
    stopTimer = window.setInterval(function () {
      if (!waiting || !waiting.status) return;
      if (stageIndex < stages.length) waiting.status.textContent = stages[stageIndex++];
      showElapsed(waiting.elapsed, startedAt, 'Pensando');
    }, 1000);
    Promise.resolve().then(getContext).then(function (data) {
      if (waiting && waiting.status) waiting.status.textContent = 'Analisando as informações encontradas…';
      var response = answer(sourceQuery, data);
      if (stopTimer) window.clearInterval(stopTimer);
      if (waiting && waiting.element) waiting.element.remove();
      add(response, 'assistant');
      addSearchReport(sourceQuery, resolved.followedUp, startedAt, false);
      history.push({ role: 'user', content: query }, { role: 'assistant', content: response });
      history = history.slice(-16);
    }).catch(function (error) {
      if (stopTimer) window.clearInterval(stopTimer);
      if (waiting && waiting.element) waiting.element.remove();
      add(list('Não consegui atualizar as informações', [error.message || 'Verifique sua conexão e tente novamente.', 'Não vou inventar uma resposta enquanto os dados do jogo estiverem indisponíveis.']), 'assistant');
      addSearchReport(sourceQuery, resolved.followedUp, startedAt, true);
    }).finally(function () {
      busy = false;
      stopTimer = null;
    });
  }

  function bind() {
    var chat = document.getElementById('kibaChat');
    if (!chat) return;
    var subtitle = chat.querySelector('.kh small');
    if (subtitle) subtitle.textContent = 'Kiba • busca inteligente local e dados atualizados';
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
  style.textContent = '.kiba-thinking{display:flex;flex-direction:column;gap:4px;color:#d7c08d;animation:kibaPulse 1s ease-in-out infinite alternate}.kiba-thinking-target,.kiba-thinking-time,.kiba-search-report{display:block;color:#aebdce;font-size:11px;line-height:1.45}.kiba-search-report{margin-top:8px;padding-top:6px;border-top:1px solid #ffffff18}.kiba-search-error{color:#e7b58c}.kiba-title{display:block;font-size:14px;margin:2px 0 7px;font-weight:800;letter-spacing:.2px}.kiba-bullet{margin:4px 0;padding-left:2px;line-height:1.45}.msg.bot br{content:"";display:block;margin-top:3px}@keyframes kibaPulse{from{opacity:.7}to{opacity:1}}';
  document.head.appendChild(style);
  var observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  bind();
  window.sorokibaKibaAI = { ask: ask, clear: function () { history = []; recentAnswers = []; } };
})();
