(function(){'use strict';
if(window.__kibaLoaded)return;window.__kibaLoaded=true;
var S=document.createElement('style');
S.textContent="\n#kibaBtn{position:fixed;right:20px;bottom:20px;width:64px;height:64px;z-index:99990;border:1px solid rgba(215,167,75,.65);border-radius:20px;background:#0b1420;box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 0 5px rgba(215,167,75,.06);cursor:pointer;padding:4px;transition:transform .2s,box-shadow .2s}#kibaBtn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 18px 44px rgba(0,0,0,.55),0 0 0 6px rgba(215,167,75,.08)}\n.kibaSvg{width:100%;height:100%;overflow:visible}\n#kibaChat{position:fixed;right:20px;bottom:96px;width:500px;height:700px;z-index:99989;background:#0b1017;border:1px solid rgba(255,255,255,.09);border-radius:24px;display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(14px) scale(.985);transition:opacity .2s,transform .2s;box-shadow:0 32px 100px rgba(0,0,0,.62);color:#e8edf3}\n#kibaChat.open{opacity:1;pointer-events:auto;transform:none}\n.kh{height:62px;min-height:62px;display:flex;align-items:center;padding:9px 11px;background:#0d141d;border-bottom:1px solid rgba(255,255,255,.07)}\n.ka{width:38px;height:38px;margin-right:9px;border-radius:11px;overflow:hidden;background:#111b26}.kh b{font-size:13px}.kh small{display:block;margin-top:2px;font-size:9px;color:#758295}.kstatus{margin-left:auto!important;padding:5px 7px;border-radius:999px;font-size:7px;letter-spacing:.08em;background:rgba(94,225,170,.07);color:#70ddb0;display:flex;align-items:center;gap:5px}.kstatus:before{content:\"\";width:6px;height:6px;border-radius:50%;background:#62d9a5;box-shadow:0 0 9px rgba(98,217,165,.55)}\n.khead-action,.kc{width:30px;height:30px;margin-left:5px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025);color:#8e9aaa;cursor:pointer}.khead-action:hover,.kc:hover{background:rgba(255,255,255,.06);color:#d7dce3}.kc{font-size:20px;line-height:20px}\n.kibaChatBody{position:relative;flex:1;min-height:0;display:flex;overflow:hidden}.km{flex:1;overflow:auto;padding:18px 20px 20px;scroll-behavior:smooth;scrollbar-width:thin}.km::-webkit-scrollbar{width:7px}.km::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}\n.kibaWelcome{padding:42px 5px 26px}.kibaWelcome .welcomeMark{width:40px;height:40px;border-radius:13px;background:rgba(215,167,75,.08);border:1px solid rgba(215,167,75,.15);display:grid;place-items:center;font-size:19px;margin-bottom:13px}.kibaWelcome h3{font-size:24px;letter-spacing:-.03em;margin:0 0 7px}.kibaWelcome p{max-width:390px;margin:0;color:#7f8b9c;font-size:11px;line-height:1.65}\n.kibaPromptGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.kibaPrompt{padding:11px 12px;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#101822;color:#b6c1cd;cursor:pointer;transition:.16s}.kibaPrompt:hover{border-color:rgba(215,167,75,.3);background:#131e29;transform:translateY(-1px)}.kibaPrompt b{display:block;font-size:10px;margin-bottom:3px}.kibaPrompt span{display:block;font-size:8px;color:#687587}\n.kibaMessage{display:flex;gap:10px;margin:18px 0}.kibaMessage.user{justify-content:flex-end}.kibaMessage.user .kibaBubble{max-width:80%;background:#d7a74b;color:#12171d;border-radius:17px 17px 6px 17px;padding:10px 13px;box-shadow:0 7px 22px rgba(0,0,0,.15);font-size:13px;line-height:1.55}.kibaMessage.assistant .kibaAvatarMini{width:25px;height:25px;flex:0 0 25px;border-radius:8px;background:#111b26;border:1px solid rgba(255,255,255,.07);display:grid;place-items:center;color:#d7a74b;font-size:12px}.kibaMessage.assistant .kibaContent{min-width:0;max-width:calc(100% - 35px)}.kibaMessage.assistant .kibaBubble{color:#e7ecf1;font-size:13px;line-height:1.68;white-space:pre-wrap;word-break:break-word;padding:1px 0}.kibaMessage.assistant .kibaBubble strong{font-weight:750;color:#f3f5f7}\n.kibaAnswerMeta{display:flex;align-items:center;gap:7px;margin-top:9px;color:#616f82;font-size:8px}.kibaAnswerAction{border:0;background:transparent;padding:0;color:#7c899b;font-size:8px;cursor:pointer}.kibaAnswerAction:hover{color:#d7a74b}.kibaAnswerDivider{opacity:.35}\n.kibaThought{display:flex;align-items:center;gap:8px;margin:12px 0 7px;padding-left:35px;animation:kibaFade .18s ease}.kibaThoughtIcon{width:17px;height:17px;border-radius:6px;background:rgba(215,167,75,.07);border:1px solid rgba(215,167,75,.14);display:grid;place-items:center;flex:0 0 17px}.kibaThoughtIcon i{width:3px;height:3px;border-radius:50%;background:#d7a74b;box-shadow:5px 0 0 #d7a74b,10px 0 0 #d7a74b;transform:translateX(-5px);animation:kibaThinkingDots .9s infinite ease-in-out}.kibaThoughtMain{min-width:0;flex:1}.kibaThoughtLine{display:flex;gap:6px;align-items:center;color:#798699;font-size:9px}.kibaThoughtTitle{font-weight:700;color:#aeb8c5}.kibaThoughtState{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kibaThoughtTimer{font-variant-numeric:tabular-nums;color:#667388;margin-left:auto}.kibaThoughtBar{margin-top:5px;width:min(250px,80%);height:2px;border-radius:99px;background:rgba(255,255,255,.05);overflow:hidden}.kibaThoughtBar i{display:block;width:35%;height:100%;background:linear-gradient(90deg,transparent,#d7a74b,transparent);animation:kibaThoughtSweep 1.15s infinite}\n.kibaThoughtDone{display:flex;align-items:center;gap:6px;margin:3px 0 5px;padding-left:35px;color:#657286;font-size:8px}.kibaThoughtDoneIcon{width:15px;height:15px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(94,225,170,.2);background:rgba(94,225,170,.05);color:#63d6a5}.kibaThoughtDone button{border:0;background:transparent;color:#788598;padding:0;font-size:8px;cursor:pointer}.kibaThoughtDone button:hover{color:#d7a74b}\n.kibaResearch{margin:0 0 8px 35px;max-width:420px}.kibaResearchBody{padding:10px 11px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:#0f161f}.kibaResearchTitle{font-size:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#657285;margin-bottom:6px}.kibaResearchList{display:flex;flex-wrap:wrap;gap:5px}.kibaSource{padding:5px 7px;border-radius:999px;background:#111a24;border:1px solid rgba(255,255,255,.07);color:#b6c0cc;font-size:9px;cursor:help}.kibaAgent{font-size:9px;color:#8995a4;margin-top:5px;line-height:1.35}.kibaAgent b{color:#b8c2ce}.kibaResearchPlan{color:#7a8798;font-size:9px;line-height:1.45}\n.kibaBottom{background:#0a1119;border-top:1px solid rgba(255,255,255,.07)}.kibaQuick{display:flex;gap:6px;padding:8px 12px 7px;overflow:auto;scrollbar-width:none}.kibaQuick::-webkit-scrollbar{display:none}.kibaQuick button{flex:0 0 auto;height:31px;display:flex;align-items:center;gap:6px;padding:0 10px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:#101822;color:#9eabb9;font-size:9px;cursor:pointer}.kibaQuick button:hover{background:#141f2a;border-color:rgba(215,167,75,.26);color:#ddcfaa}\n.kf{display:flex;align-items:center;gap:7px;padding:10px 11px 11px}.kf input{flex:1;height:46px;min-width:0;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:#111923;color:#edf2f7;padding:0 14px;outline:0;font-size:13px}.kf input:focus{border-color:rgba(215,167,75,.38);box-shadow:0 0 0 3px rgba(215,167,75,.05)}.kf input::placeholder{color:#586678}.kf button{width:44px;height:44px;border:0;border-radius:14px;background:#d7a74b;color:#10151b;font-size:18px;cursor:pointer}.kf button:hover{filter:brightness(1.05)}.kf button:disabled{opacity:.45;cursor:default}\n.kibaHistory{position:absolute;inset:0;background:#0b1017;transform:translateX(-102%);transition:transform .2s ease;z-index:5;display:flex;flex-direction:column}.kibaHistory.open{transform:none}.kibaHistoryHead{display:flex;align-items:center;gap:9px;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.07)}.kibaHistoryHead b{font-size:12px}.kibaHistoryClose{margin-left:auto;width:29px;height:29px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:transparent;color:#8d99aa;cursor:pointer}.kibaHistoryNew{margin:12px;border:1px solid rgba(215,167,75,.25);background:rgba(215,167,75,.06);color:#d7c58f;border-radius:11px;padding:9px;font-size:10px;font-weight:750;cursor:pointer}.kibaHistoryList{flex:1;overflow:auto;padding:0 10px}.kibaHistoryItem{width:100%;text-align:left;padding:10px;border-radius:11px;margin:3px 0;color:#98a4b2;font-size:9px;cursor:pointer;background:transparent;border:0}.kibaHistoryItem:hover{background:rgba(255,255,255,.04)}.kibaHistoryItem.active{background:#121b25;color:#e4e9ee}.kibaHistoryItem b{display:block;color:inherit;font-size:10px;margin-bottom:3px}.kibaHistoryItem small{font-size:8px;color:#677488}.kibaHistoryFooter{padding:10px;border-top:1px solid rgba(255,255,255,.06)}.kibaClearAll{width:100%;border:1px solid rgba(255,255,255,.07);background:transparent;color:#7d8999;border-radius:10px;padding:8px;font-size:9px;cursor:pointer}\n.kibaScrollBottom{position:absolute;right:17px;bottom:18px;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.09);background:#121b25;color:#a7b1bf;box-shadow:0 8px 24px rgba(0,0,0,.3);display:none;place-items:center;cursor:pointer;z-index:4}.kibaScrollBottom.show{display:grid}\n.kibaStop{position:absolute;right:62px;bottom:19px;width:28px;height:28px;border:1px solid rgba(215,167,75,.25);border-radius:9px;background:#111923;color:#d7a74b;font-size:10px;display:none;place-items:center;cursor:pointer;z-index:4}.kibaStop.show{display:grid}\n";
document.head.appendChild(S);
var KIBA_COMPACT_STYLE=document.createElement('style');KIBA_COMPACT_STYLE.textContent="\n/* Kiba Chat compact polish */\n#kibaChat{width:400px;height:570px;right:18px;bottom:90px;border-radius:19px;box-shadow:0 22px 65px rgba(0,0,0,.50);background:#0b1118}\n.kh{height:54px;min-height:54px;padding:8px 10px}\n.ka{width:34px;height:34px;border-radius:10px;margin-right:8px}\n.kh b{font-size:12px}.kh small{font-size:8px}\n.kstatus{font-size:6px!important;padding:4px 6px!important}\n.khead-action,.kc{width:27px;height:27px;margin-left:4px}.kc{font-size:18px}\n.km{padding:14px 14px 12px}\n.kibaWelcome{padding:26px 3px 16px}.kibaWelcome .welcomeMark{width:34px;height:34px;border-radius:11px;font-size:16px;margin-bottom:11px}.kibaWelcome h3{font-size:20px}.kibaWelcome p{font-size:10px;line-height:1.55}\n.kibaPromptGrid{gap:7px;margin-top:13px}.kibaPrompt{padding:9px 10px;border-radius:11px}.kibaPrompt b{font-size:9px}.kibaPrompt span{font-size:7px}\n.kibaMessage{gap:8px;margin:14px 0}.kibaMessage.user .kibaBubble{max-width:78%;padding:8px 11px;border-radius:14px 14px 5px 14px;font-size:12px;line-height:1.5}.kibaMessage.assistant .kibaAvatarMini{width:22px;height:22px;flex-basis:22px;border-radius:7px;font-size:10px}.kibaMessage.assistant .kibaContent{max-width:calc(100% - 30px)}.kibaMessage.assistant .kibaBubble{font-size:12px;line-height:1.6}\n.kibaAnswerMeta{margin-top:7px;font-size:7px;gap:6px}.kibaAnswerAction{font-size:7px}\n.kibaThought{padding-left:30px;margin:9px 0 5px;gap:7px}.kibaThoughtIcon{width:15px;height:15px;flex-basis:15px}.kibaThoughtLine{font-size:8px;gap:5px}.kibaThoughtTitle{font-size:8px}.kibaThoughtState{font-size:8px}.kibaThoughtTimer{font-size:8px}.kibaThoughtBar{width:170px;height:1.5px;margin-top:4px}\n.kibaThoughtDone{padding-left:30px;margin:2px 0 4px;font-size:7px;gap:5px}.kibaThoughtDoneIcon{width:14px;height:14px}.kibaThoughtDone button{font-size:7px}\n.kibaResearch{margin-left:30px}.kibaResearchBody{padding:8px 9px;border-radius:10px}.kibaResearchTitle{font-size:7px}.kibaSource{font-size:8px;padding:4px 6px}.kibaAgent{font-size:8px}.kibaResearchPlan{font-size:8px}\n.kibaBottom{background:#0a1118}.kibaQuick{padding:6px 9px 5px;gap:5px}.kibaQuick button{height:28px;padding:0 8px;border-radius:9px;font-size:8px}.kf{padding:8px 9px 9px}.kf input{height:41px;border-radius:13px;font-size:12px;padding:0 12px}.kf button{width:41px;height:41px;border-radius:12px;font-size:16px}\n.kibaScrollBottom{width:27px;height:27px;right:12px;bottom:12px;font-size:12px}.kibaStop{width:25px;height:25px;right:48px;bottom:13px}\n@media(max-width:700px){#kibaChat{width:calc(100vw - 18px);height:68vh;right:9px;bottom:82px}.km{padding:12px 11px 10px}}\n";document.head.appendChild(KIBA_COMPACT_STYLE);

function svg(){return '<svg class="kibaSvg" viewBox="0 0 112 156" aria-label="Kiba, ornitorrinco mascote de Sorokiba"><g class="tail"><path d="M79 101c18 1 29 7 29 17-1 12-18 18-31 10-7-4-10-10-8-17 3-7 5-9 10-10z" fill="#5a372a" stroke="#211611" stroke-width="3.5"/><path d="M83 106c13 3 19 8 18 13-1 5-8 7-14 5" fill="none" stroke="#85513a" stroke-width="3" stroke-linecap="round"/></g><g class="crawlL"><path d="M39 119c-5 10-8 20-5 27 3 6 10 7 16 3l-3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M32 145c7 3 13 3 20 0-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="crawlR"><path d="M68 119c4 10 8 20 5 27-3 6-10 7-16 3l3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M54 148c7 3 14 2 20-2-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="bodyLift"><path d="M31 68c-7 12-9 33-5 48 5 20 21 29 39 27 20-2 30-16 28-36-2-18-9-32-21-39-14-8-32-8-41 0z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M43 77c-4 16-2 35 5 49 9 7 18 7 27-2 5-14 3-31-4-44-8-5-20-7-28-3z" fill="#e5c49e" stroke="#241712" stroke-width="2"/><path d="M36 75c10 7 27 9 38 1l-3 13c-11 6-24 5-35-1z" fill="#151a20"/><path d="M47 79h11l6 7-12 7-11-7z" fill="#d7a74b"/></g><g class="pawL"><path d="M33 78c-12 5-20 13-23 23 8 2 17-1 24-8l7-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M11 100c-4 2-7 4-9 7 6 2 12 1 16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="pawR"><path d="M75 78c12 5 19 13 22 23-8 2-17-1-24-8l-6-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M94 100c4 2 7 4 9 7-6 2-12 1-16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="headTurn"><path d="M31 60c-8-12-7-27 1-37C40 12 56 7 70 12c14 5 23 18 21 32-2 14-12 23-27 27-14 3-27-1-33-11z" fill="#805039" stroke="#241712" stroke-width="3.5"/><path d="M37 43c3-12 12-21 23-25 9-3 19-2 26 2-11 3-18 9-21 18-4 10 0 19 7 25-16 2-29-6-35-20z" fill="#9c6447" opacity=".55"/><g class="eyes"><ellipse cx="49" cy="36" rx="6" ry="8" fill="#151318"/><ellipse cx="74" cy="36" rx="6" ry="8" fill="#151318"/><circle cx="51" cy="34" r="2.4" fill="#fff"/><circle cx="76" cy="34" r="2.4" fill="#fff"/></g><path d="M42 50c10-5 28-5 38 0 2 7-3 12-10 14-9 2-19 0-27-5-3-2-4-6-1-9z" fill="#c98534" stroke="#241712" stroke-width="3"/><path d="M46 53c9-3 21-3 30 0" fill="none" stroke="#8a4e22" stroke-width="2"/><circle cx="51" cy="59" r="1.5" fill="#f7c76d"/><circle cx="70" cy="59" r="1.5" fill="#f7c76d"/></g></svg>'}


function safe(value){return String(value==null?'':value).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
function nowId(){return 'kc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
var USER=null,chats=[],activeChat=null,sending=false,activeAbort=null,kibaBankPluginData=new Map();
var KIBA_TRANSFER_DRAFTS=new Map();
var KIBA_REQUEST_TIMEOUT_MS=12000;
var KIBA_PLUGIN_STYLE=document.createElement('style');
KIBA_PLUGIN_STYLE.textContent=".kibaPluginCard{margin-top:10px;padding:11px;border:1px solid rgba(215,167,75,.2);border-radius:12px;background:#101822;color:#b8c2ce;font-size:10px;line-height:1.55}.kibaPluginCard h4{margin:0 0 7px;color:#e6ebf0;font-size:10px}.kibaPluginCard p{margin:5px 0}.kibaPluginActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.kibaPluginActions button{border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#182330;color:#cbd3dc;padding:7px 9px;font-size:9px;cursor:pointer}.kibaPluginActions button.primary{background:#d7a74b;border-color:#d7a74b;color:#111820;font-weight:700}.kibaPluginActions button:disabled{opacity:.55;cursor:wait}.kibaPluginData{margin:7px 0;color:#9ca9b8}.kibaPluginMovements{max-height:180px;overflow:auto;margin:7px 0 0;padding-left:17px;color:#9ca9b8}.kibaPluginMovements li{margin:4px 0}.kibaPluginNotice{color:#d7c58f}.kibaProposalText{white-space:pre-wrap;border-left:2px solid rgba(215,167,75,.4);padding-left:9px;margin-top:8px;color:#d5dce4}";
document.head.appendChild(KIBA_PLUGIN_STYLE);

var KIBA_PLUGIN_POLISH=document.createElement('style');
KIBA_PLUGIN_POLISH.textContent=".kibaPluginCard{background:linear-gradient(145deg,#0f1822,#0c141c);border-color:rgba(215,167,75,.16);box-shadow:0 8px 20px rgba(0,0,0,.12)}.kibaPluginCard h4{font-size:10px;letter-spacing:.01em}.kibaPluginActions button{transition:.16s}.kibaPluginActions button:hover{transform:translateY(-1px);border-color:rgba(215,167,75,.3)}.kibaFinanceGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.kibaFinanceStat{padding:7px 8px;border:1px solid rgba(255,255,255,.06);border-radius:9px;background:#0c141d}.kibaFinanceStat small{display:block;color:#667487;font-size:7px}.kibaFinanceStat b{display:block;color:#dbe2e9;font-size:10px;margin-top:2px}.kibaPluginMovements li{list-style:none;margin:5px 0;padding:6px 7px;border-radius:8px;background:rgba(255,255,255,.025)}.kibaProposalMeta{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.kibaProposalTag{padding:4px 6px;border-radius:999px;background:rgba(215,167,75,.07);color:#cdbd91;border:1px solid rgba(215,167,75,.12);font-size:7px}";
document.head.appendChild(KIBA_PLUGIN_POLISH);


function userKey(){return String((USER&&USER.username)||'citizen').replace(/[^a-zA-Z0-9_-]/g,'_')}
function storageKey(){return 'sorokiba_kiba_chats_v3_'+userKey()}
function freshChat(){return {id:nowId(),title:'Nova conversa',createdAt:Date.now(),updatedAt:Date.now(),messages:[]}}
function loadChats(){
  try{var parsed=JSON.parse(localStorage.getItem(storageKey())||'null');if(Array.isArray(parsed)&&parsed.length)chats=parsed.slice(0,20)}catch(e){chats=[]}
  chats.forEach(function(chat){(Array.isArray(chat.messages)?chat.messages:[]).forEach(function(message){if(message.plugin?.status==='loading')message.plugin.status='pending';if(message.plugin?.status==='submitting'||message.plugin?.status==='cancelling')message.plugin.status='error'})});
  if(!chats.length){activeChat=freshChat();chats=[activeChat]}else activeChat=chats[0]
}
function saveChats(){try{chats=chats.slice(0,20);localStorage.setItem(storageKey(),JSON.stringify(chats))}catch(e){}}
function titleFrom(text){var t=String(text||'').replace(/\s+/g,' ').trim();if(t.length>38)t=t.slice(0,38).replace(/\s+\S*$/,'')+'…';return t||'Nova conversa'}
function createNewChat(){var chat=freshChat();chats.unshift(chat);activeChat=chat;saveChats();renderChat();closeHistory();focusInput()}
function deleteAllChats(){chats=[freshChat()];activeChat=chats[0];kibaBankPluginData.clear();saveChats();renderChat();closeHistory()}
function selectChat(id){var found=chats.find(function(item){return item.id===id});if(!found)return;activeChat=found;chats=chats.filter(function(item){return item.id!==id});chats.unshift(found);saveChats();renderChat();closeHistory()}
function formatAnswer(text){return safe(text||'').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}
function getConversation(){return activeChat?activeChat.messages.slice(-12).map(function(msg){return {role:msg.role,content:String(msg.content||'').slice(0,500)}}):[]}

function normalizeKibaPluginText(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function detectKibaPlugin(question){
  var q=normalizeKibaPluginText(question);
  if(/\b(proposta|propostas)\b/.test(q)&&/\b(cria|crie|criar|escreve|escrever|redige|redigir|elabora|elaborar|monta|montar|faca|fazer|formaliza|formalizar|ajuda|ajudar|envia|enviar)\b/.test(q))return 'proposalDraft';
  var transferAction=/\b(transfira|transferir|transfere|manda|mandar|envia|enviar|pague|pagar|fa[cç]a um pagamento|faca um pagamento)\b/.test(q);
  var hasTransferWord=/\b(transferencia|transferencias|pagamento|pagamentos)\b/.test(q);
  if(transferAction&&(/\b\d+(?:[.,]\d{1,2})?\b/.test(q))&&(/\b(para|ao|a)\b/.test(q)))return 'bankTransferDraft';
  if((/\b(extrato|movimentacao|movimentacoes|transacao|transacoes)\b/.test(q)&&/\b(banco|saldo|depositos?|saques?|meu|minha|meus|minhas|seu|sua|seus|suas|organiza|organize|organizar|resume|resuma|resumir)\b/.test(q))||(/\b(meu|minha|meus|minhas|seu|sua|seus|suas|organiza|organize|organizar|resume|resuma|resumir)\b/.test(q)&&/\b(banco|saldo|depositos?|saques?)\b/.test(q))||(hasTransferWord&&/\b(meu|minha|meus|minhas|extrato|saldo)\b/.test(q)))return 'bankConsent';
  return '';
}
function parseKibaTransferRequest(question){
  var q=normalizeKibaPluginText(question);
  var match=q.match(/\b(\d+(?:[.,]\d{1,2})?)\b/),amount=match?Number(String(match[1]).replace(',','.')):NaN;
  var after=q.match(/\b(?:para|ao|a)\s+(?:o\s+|a\s+)?([a-z0-9_]{3,30})\b/);
  var username=after?after[1]:'';
  return {amount:amount,username:username,note:''};
}
function requestKibaPlugin(url,options,controller){
  var requestController=controller||new AbortController(),timedOut=false,timeoutId=setTimeout(function(){timedOut=true;requestController.abort()},KIBA_REQUEST_TIMEOUT_MS);
  var request=Object.assign({},options||{});
  request.headers=Object.assign({'Content-Type':'application/json'},request.headers||{},{Authorization:'Bearer '+(localStorage.getItem('sorokiba_token')||'')});
  request.signal=requestController.signal;
  return fetch(url,request).then(function(response){
    return response.json().catch(function(){throw new Error('O servidor retornou uma resposta inválida.')}).then(function(data){
      if(!response.ok)throw new Error(data.error||'Não foi possível concluir a ação do Kiba.');
      return data;
    });
  }).catch(function(error){
    if(timedOut)throw new Error('O plugin demorou para responder. Tente novamente.');
    throw error;
  }).finally(function(){clearTimeout(timeoutId)});
}
function findKibaMessage(messageId){
  for(var i=0;i<chats.length;i++){
    var message=chats[i].messages.find(function(item){return item.id===messageId});
    if(message)return {chat:chats[i],message:message};
  }
  return null;
}
function saveKibaPluginMessage(messageId){
  var found=findKibaMessage(messageId);if(!found)return null;
  found.chat.updatedAt=Date.now();saveChats();
  if(activeChat&&activeChat.id===found.chat.id)renderChat();
  return found.message;
}
function formatKibaCurrency(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function formatKibaDate(value){
  var date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('pt-BR'):'Data não informada';
}
function pluginButton(label,onClick,primary,disabled){
  var button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=!!disabled;
  if(primary)button.className='primary';button.onclick=onClick;return button;
}
function makeKibaPluginCard(msg){
  var plugin=msg.plugin||{},card=document.createElement('div');card.className='kibaPluginCard';
  if(plugin.type==='bankConsent'){
    var data=kibaBankPluginData.get(msg.id);
    if(data){
      var deposits=data.deposits||{},withdrawals=data.withdrawals||{};
      card.innerHTML='<h4>Visão financeira do Kiba</h4><div class="kibaFinanceGrid"></div>';
      var grid=card.querySelector('.kibaFinanceGrid'),stats=[
        ['Em mãos',formatKibaCurrency(data.cash)],['No banco',formatKibaCurrency(data.bankBalance)],
        ['Entradas',formatKibaCurrency(data.summary?.incoming)],['Saídas',formatKibaCurrency(data.summary?.outgoing)],
        ['Transferido',formatKibaCurrency(data.summary?.transfersSent)],['Recebido',formatKibaCurrency(data.summary?.transfersReceived)]
      ];
      stats.forEach(function(pair){var el=document.createElement('div');el.className='kibaFinanceStat';el.innerHTML='<small>'+safe(pair[0])+'</small><b>'+safe(pair[1])+'</b>';grid.appendChild(el)});
      var totals=document.createElement('div');totals.className='kibaPluginData';
      totals.textContent='O Kiba agrupou '+Number(data.movements?.length||0)+' movimentações recentes por categoria, sem alterar seu dinheiro.';
      card.appendChild(totals);
      var movements=Array.isArray(data.movements)?data.movements:[];
      var list=document.createElement('ul');list.className='kibaPluginMovements';
      movements.slice(0,12).forEach(function(item){
        var row=document.createElement('li');row.textContent=formatKibaDate(item.date)+' · '+String(item.type||'Movimentação')+' · '+formatKibaCurrency(item.amount)+(item.person?' · '+String(item.person):'');list.appendChild(row);
      });
      if(movements.length)card.appendChild(list);
      else{var empty=document.createElement('p');empty.textContent='Não há depósitos ou saques registrados.';card.appendChild(empty)}
      if(movements.length){var recent=document.createElement('p');recent.textContent='Exibindo até 12 lançamentos recentes; os totais abrangem todo o histórico.';card.appendChild(recent)}
      var notice=document.createElement('p');notice.className='kibaPluginNotice';notice.textContent='Somente consulta: nenhum dinheiro foi movimentado.';card.appendChild(notice);
      return card;
    }
    var bankState=plugin.status||'pending';
    card.innerHTML='<h4>Autorização necessária · acesso somente para leitura</h4><p>O Kiba consultará seu saldo e os registros de depósitos e saques para organizar um resumo. Ele não fará depósitos, saques nem transferências.</p>';
    if(bankState==='denied'){var denied=document.createElement('p');denied.textContent='Consulta não autorizada. Nenhum dado bancário foi acessado.';card.appendChild(denied)}
    else if(bankState==='loading'){var loading=document.createElement('p');loading.textContent='Consultando os registros autorizados…';card.appendChild(loading)}
    else if(bankState==='error'){var error=document.createElement('p');error.textContent='Não foi possível consultar agora. Você pode tentar novamente.';card.appendChild(error)}
    if(bankState!=='loading'){
      var actions=document.createElement('div');actions.className='kibaPluginActions';
      actions.appendChild(pluginButton(bankState==='error'?'Tentar novamente':bankState==='denied'?'Autorizar agora':'Autorizar consulta',function(){authorizeKibaBankRead(msg.id)},true,false));
      if(bankState==='pending'||bankState==='error'||bankState==='denied')actions.appendChild(pluginButton('Não autorizar',function(){plugin.status='denied';saveKibaPluginMessage(msg.id)},false,false));
      card.appendChild(actions);
    }
    return card;
  }
  if(plugin.type==='bankTransferDraft'){
    card.innerHTML='<h4>Transferência preparada pelo Kiba</h4>';
    var targetName=String(plugin.targetName||plugin.target?.name||plugin.username||'destinatário');
    var rows=document.createElement('div');rows.className='kibaFinanceGrid';
    [['Destinatário',targetName],['Valor',formatKibaCurrency(plugin.amount)],['Saldo após',formatKibaCurrency(plugin.remainingBankBalance)]].forEach(function(pair){
      var el=document.createElement('div');el.className='kibaFinanceStat';el.innerHTML='<small>'+safe(pair[0])+'</small><b>'+safe(pair[1])+'</b>';rows.appendChild(el);
    });
    card.appendChild(rows);
    var notice=document.createElement('p');notice.className='kibaPluginNotice';notice.textContent='Nada foi transferido ainda. Esta etapa é apenas uma autorização para você revisar os dados.';card.appendChild(notice);
    var state=plugin.status||'awaiting_confirmation';
    if(state==='submitted'){
      var sent=document.createElement('p');sent.className='kibaPluginNotice';sent.textContent='Transferência realizada após sua confirmação.';card.appendChild(sent);
    }else if(state==='cancelled'){
      var cancelled=document.createElement('p');cancelled.textContent='Transferência cancelada. Nenhum valor foi movimentado.';card.appendChild(cancelled);
    }else if(state==='submitting'||state==='cancelling'){
      var busy=document.createElement('p');busy.textContent=state==='cancelling'?'Cancelando a autorização…':'Confirmando a transferência…';card.appendChild(busy);
    }else if(state==='error'){
      var failed=document.createElement('p');failed.textContent='Não foi possível concluir a autorização. Confira seu saldo e tente novamente.';card.appendChild(failed);
    }else{
      var actions=document.createElement('div');actions.className='kibaPluginActions';
      actions.appendChild(pluginButton('Confirmar transferência',function(){submitKibaTransfer(msg.id)},true,false));
      actions.appendChild(pluginButton('Cancelar',function(){cancelKibaTransfer(msg.id)},false,false));
      card.appendChild(actions);
    }
    return card;
  }
  if(plugin.type==='proposalDraft'){
    card.innerHTML='<h4>Documento cívico preparado pelo Kiba</h4>';
    var title=document.createElement('p');title.textContent='Título: '+String(plugin.title||'');card.appendChild(title);
    var tags=document.createElement('div');tags.className='kibaProposalMeta';if(plugin.category){var cat=document.createElement('span');cat.className='kibaProposalTag';cat.textContent=plugin.category;tags.appendChild(cat)}if(plugin.priority){var pri=document.createElement('span');pri.className='kibaProposalTag';pri.textContent='Prioridade '+plugin.priority;tags.appendChild(pri)}card.appendChild(tags);
    var description=document.createElement('div');description.className='kibaProposalText';description.textContent=String(plugin.description||'');card.appendChild(description);
    var proposalState=plugin.status||'awaiting_confirmation';
    if(proposalState==='submitted'){
      var sent=document.createElement('p');sent.className='kibaPluginNotice';sent.textContent='Proposta enviada à Prefeitura após sua confirmação.';card.appendChild(sent);
    }else if(proposalState==='cancelled'){
      var cancelled=document.createElement('p');cancelled.textContent='Minuta cancelada. Nenhuma proposta foi enviada.';card.appendChild(cancelled);
    }else if(proposalState==='submitting'||proposalState==='cancelling'){
      var submitting=document.createElement('p');submitting.textContent=proposalState==='cancelling'?'Cancelando a minuta…':'Enviando a proposta confirmada…';card.appendChild(submitting);
    }else if(proposalState==='error'){
      var failed=document.createElement('p');failed.textContent='Não foi possível confirmar o resultado do envio. Confira a página Propostas antes de tentar novamente.';card.appendChild(failed);
    }else{
      var notice=document.createElement('p');notice.className='kibaPluginNotice';notice.textContent='A minuta ainda não foi enviada. Leia o texto e autorize explicitamente se quiser encaminhá-la.';card.appendChild(notice);
      var actions=document.createElement('div');actions.className='kibaPluginActions';
      actions.appendChild(pluginButton('Confirmar e enviar à Prefeitura',function(){submitKibaProposal(msg.id)},true,false));
      actions.appendChild(pluginButton('Cancelar minuta',function(){cancelKibaProposal(msg.id)},false,false));card.appendChild(actions);
    }
    return card;
  }
  return card;
}
async function authorizeKibaBankRead(messageId){
  var found=findKibaMessage(messageId);if(!found||found.message.plugin?.status==='loading')return;
  found.message.plugin.status='loading';saveKibaPluginMessage(messageId);
  try{
    var data=await requestKibaPlugin('/api/kiba/plugins/bank',{method:'GET'});
    kibaBankPluginData.set(messageId,data);
    var updated=findKibaMessage(messageId);if(updated){updated.message.plugin.status='authorized';saveKibaPluginMessage(messageId)}
  }catch{
    var failed=findKibaMessage(messageId);if(failed){failed.message.plugin.status='error';saveKibaPluginMessage(messageId)}
  }
}
async function submitKibaTransfer(messageId){
  var found=findKibaMessage(messageId);if(!found||found.message.plugin?.status!=='awaiting_confirmation')return;
  found.message.plugin.status='submitting';saveKibaPluginMessage(messageId);
  try{
    var result=await requestKibaPlugin('/api/kiba/plugins/bank/transfer-draft/'+encodeURIComponent(found.message.plugin.draftId)+'/submit',{method:'POST',body:'{}'});
    var submitted=findKibaMessage(messageId);if(submitted){
      submitted.message.plugin.status='submitted';
      submitted.message.plugin.transactionId=result.transaction?.id||null;
      submitted.message.plugin.remainingBankBalance=Number(result.bankBalance||0);
      saveKibaPluginMessage(messageId);
    }
  }catch{
    var failed=findKibaMessage(messageId);if(failed){failed.message.plugin.status='error';saveKibaPluginMessage(messageId)}
  }
}
async function cancelKibaTransfer(messageId){
  var found=findKibaMessage(messageId);if(!found||found.message.plugin?.status!=='awaiting_confirmation')return;
  found.message.plugin.status='cancelling';saveKibaPluginMessage(messageId);
  try{
    await requestKibaPlugin('/api/kiba/plugins/bank/transfer-draft/'+encodeURIComponent(found.message.plugin.draftId),{method:'DELETE'});
    var cancelled=findKibaMessage(messageId);if(cancelled){cancelled.message.plugin.status='cancelled';saveKibaPluginMessage(messageId)}
  }catch{
    var failed=findKibaMessage(messageId);if(failed){failed.message.plugin.status='awaiting_confirmation';saveKibaPluginMessage(messageId)}
  }
}
async function submitKibaProposal(messageId){
  var found=findKibaMessage(messageId);if(!found||found.message.plugin?.status!=='awaiting_confirmation')return;
  found.message.plugin.status='submitting';saveKibaPluginMessage(messageId);
  try{
    var result=await requestKibaPlugin('/api/kiba/plugins/proposals/draft/'+encodeURIComponent(found.message.plugin.draftId)+'/submit',{method:'POST',body:'{}'});
    var submitted=findKibaMessage(messageId);if(submitted){submitted.message.plugin.status='submitted';submitted.message.plugin.proposalId=result.proposal?.id||null;saveKibaPluginMessage(messageId)}
  }catch{
    var failed=findKibaMessage(messageId);if(failed){failed.message.plugin.status='error';saveKibaPluginMessage(messageId)}
  }
}
async function cancelKibaProposal(messageId){
  var found=findKibaMessage(messageId);if(!found||found.message.plugin?.status!=='awaiting_confirmation')return;
  found.message.plugin.status='cancelling';saveKibaPluginMessage(messageId);
  try{
    await requestKibaPlugin('/api/kiba/plugins/proposals/draft/'+encodeURIComponent(found.message.plugin.draftId),{method:'DELETE'});
    var cancelled=findKibaMessage(messageId);if(cancelled){cancelled.message.plugin.status='cancelled';saveKibaPluginMessage(messageId)}
  }catch{
    var failed=findKibaMessage(messageId);if(failed){failed.message.plugin.status='awaiting_confirmation';saveKibaPluginMessage(messageId)}
  }
}

function makeAssistantMessage(msg){
  var row=document.createElement('div');row.className='kibaMessage assistant';row.dataset.id=msg.id;
  row.innerHTML='<div class="kibaAvatarMini">✦</div><div class="kibaContent"><div class="kibaBubble">'+formatAnswer(msg.content)+'</div></div>';
  var content=row.querySelector('.kibaContent'),meta=document.createElement('div');meta.className='kibaAnswerMeta';
  if(msg.elapsedMs)meta.innerHTML='<span>✦ Kiba</span><span class="kibaAnswerDivider">·</span><span>'+((Number(msg.elapsedMs)/1000).toFixed(2))+' s</span>';
  var copy=document.createElement('button');copy.className='kibaAnswerAction';copy.textContent='Copiar';copy.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(msg.content||'').then(function(){copy.textContent='Copiado'}).catch(function(){})};meta.appendChild(copy);
  if(msg.question){var retry=document.createElement('button');retry.className='kibaAnswerAction';retry.textContent='Refazer';retry.onclick=function(){send(msg.question)};meta.appendChild(retry)}
  content.appendChild(meta);
  if(msg.elapsedMs){
    var done=document.createElement('div');done.className='kibaThoughtDone';done.innerHTML='<span class="kibaThoughtDoneIcon">✓</span><span>Pensou por '+((Number(msg.elapsedMs)/1000).toFixed(2))+' s</span><span>·</span><button type="button">ver pesquisa</button>';
    var research=document.createElement('div');research.className='kibaResearch';research.style.display='none';
    var sources=Array.isArray(msg.sources)?msg.sources:[],chips=sources.map(function(s){return '<span class="kibaSource" title="'+safe(String(s.detail||''))+'">✓ '+safe(String(s.name||'Fonte interna'))+'</span>'}).join('');
    var agents=Array.isArray(msg.agents)?msg.agents:[],agentHtml=agents.slice(0,6).map(function(a){return '<div class="kibaAgent">✓ <b>'+safe(String(a.agent||'Agente'))+'</b> — '+safe(String(a.reason||''))+'</div>'}).join('');
    var plan=Array.isArray(msg.plan)?msg.plan:[];
    research.innerHTML='<div class="kibaResearchBody"><div class="kibaResearchTitle">Fontes consultadas</div><div class="kibaResearchList">'+(chips||'<span class="kibaSource">Dados internos de Sorokiba</span>')+'</div>'+(agentHtml?'<div class="kibaResearchTitle" style="margin-top:10px">Agentes</div>'+agentHtml:'')+(plan.length?'<div class="kibaResearchTitle" style="margin-top:10px">Plano</div><div class="kibaResearchPlan">'+safe(plan.join(' → '))+'</div>':'')+'</div>';
    done.querySelector('button').onclick=function(){var open=research.style.display!=='none';research.style.display=open?'none':'block';this.textContent=open?'ver pesquisa':'ocultar pesquisa';scrollToEnd()};
    content.appendChild(done);content.appendChild(research);
  }
  if(msg.plugin)content.appendChild(makeKibaPluginCard(msg));
  return row;
}
function renderChat(){
  var messages=document.getElementById('kibaMsgs');if(!messages)return;
  messages.textContent='';
  var items=activeChat&&Array.isArray(activeChat.messages)?activeChat.messages:[];
  if(!items.length){
    var welcome=document.createElement('div');welcome.className='kibaWelcome';
    welcome.innerHTML='<div class="welcomeMark">✦</div><h3>Olá! Eu sou o Kiba.</h3><p>Faça uma pergunta sobre Sorokiba. Também posso organizar seu extrato com sua autorização ou preparar uma minuta formal para a Prefeitura, que só será enviada após sua confirmação.</p>';
    messages.appendChild(welcome);
  }else{
    items.forEach(function(msg){
      if(msg&&msg.role==='assistant'){
        messages.appendChild(makeAssistantMessage(msg));
      }else if(msg&&msg.role==='user'){
        var row=document.createElement('div');row.className='kibaMessage user';
        var bubble=document.createElement('div');bubble.className='kibaBubble';bubble.textContent=String(msg.content||'');
        row.appendChild(bubble);messages.appendChild(row);
      }
    });
  }
  renderHistory();scrollToEnd();
}
function renderHistory(){
  var list=document.getElementById('kibaHistoryList');if(!list)return;list.innerHTML='';
  chats.forEach(function(chat){
    var item=document.createElement('button');item.type='button';item.className='kibaHistoryItem '+(activeChat&&chat.id===activeChat.id?'active':'');
    var first=chat.messages.find(function(m){return m.role==='user'});
    item.innerHTML='<b>'+safe(chat.title||'Nova conversa')+'</b><small>'+safe(first?String(first.content).slice(0,58):'Sem mensagens')+'</small>';
    item.onclick=function(){selectChat(chat.id)};list.appendChild(item);
  });
}
function openHistory(){var e=document.getElementById('kibaHistory');if(e)e.classList.add('open')}
function closeHistory(){var e=document.getElementById('kibaHistory');if(e)e.classList.remove('open')}
function focusInput(){setTimeout(function(){var i=document.querySelector('#kibaChat .kf input');if(i)i.focus()},50)}
function scrollToEnd(){var m=document.getElementById('kibaMsgs');if(m)m.scrollTop=m.scrollHeight}
function updateScrollButton(){var m=document.getElementById('kibaMsgs'),b=document.getElementById('kibaScrollBottom');if(!m||!b)return;b.classList.toggle('show',m.scrollTop+m.clientHeight<m.scrollHeight-100)}

function startThought(){
  var m=document.getElementById('kibaMsgs'),el=document.createElement('div');el.className='kibaThought';
  el.innerHTML='<div class="kibaThoughtIcon"><i></i></div><div class="kibaThoughtMain"><div class="kibaThoughtLine"><span class="kibaThoughtTitle">Kiba</span><span class="kibaThoughtState">entendendo a pergunta</span><span class="kibaThoughtTimer">0,0 s</span></div><div class="kibaThoughtBar"><i></i></div></div>';
  m.appendChild(el);scrollToEnd();
  var started=performance.now(),states=['analisando o contexto','buscando dados do jogo','comparando informações','checando coerência da resposta'],index=0;
  var timer=setInterval(function(){index=(index+1)%states.length;var st=el.querySelector('.kibaThoughtState'),clock=el.querySelector('.kibaThoughtTimer');if(st)st.textContent=states[index];if(clock)clock.textContent=((performance.now()-started)/1000).toFixed(1).replace('.',',')+' s';scrollToEnd()},760);
  return {el:el,timer:timer,started:started};
}
async function send(question){
  var t=String(question||'').trim();if(!t||sending)return;
  var pluginType=detectKibaPlugin(t);
  sending=true;
  var input=document.querySelector('#kibaChat .kf input'),button=document.querySelector('#kibaChat .kf button'),stop=document.getElementById('kibaStop');
  if(input)input.disabled=false;if(button)button.disabled=true;if(stop)stop.classList.add('show');
  if(!activeChat)createNewChat();
  var targetChat=activeChat;
  if(targetChat.title==='Nova conversa')targetChat.title=titleFrom(t);
  targetChat.messages.push({id:nowId(),role:'user',content:t,createdAt:Date.now()});targetChat.updatedAt=Date.now();saveChats();renderChat();
  var thought=null,started=performance.now(),controller=new AbortController(),timeoutId=null,timedOut=false;activeAbort=controller;
  try{
    if(pluginType==='bankTransferDraft'){
      thought=startThought();
      var transfer=parseKibaTransferRequest(t);
      if(!transfer.username||!Number.isFinite(transfer.amount)||transfer.amount<=0){
        throw new Error('Para transferir, diga o valor e o destinatário. Ex.: "transfira 100 para joao".');
      }
      var draftTransfer=await requestKibaPlugin('/api/kiba/plugins/bank/transfer-draft',{method:'POST',body:JSON.stringify({username:transfer.username,amount:transfer.amount,note:transfer.note})},controller);
      targetChat.messages.push({id:nowId(),role:'assistant',content:'Preparei uma transferência para sua revisão. Ela só será realizada se você confirmar.',question:t,createdAt:Date.now(),plugin:{type:'bankTransferDraft',draftId:draftTransfer.draftId,username:draftTransfer.target?.username||transfer.username,targetName:draftTransfer.target?.name||transfer.username,amount:draftTransfer.amount,remainingBankBalance:draftTransfer.remainingBankBalance,status:'awaiting_confirmation'}});
      targetChat.updatedAt=Date.now();saveChats();if(activeChat&&activeChat.id===targetChat.id)renderChat();else renderHistory();return;
    }
    if(pluginType==='bankConsent'){
      targetChat.messages.push({id:nowId(),role:'assistant',content:'Posso consultar seu painel financeiro para organizar entradas, saídas, transferências e categorias. Nenhum valor será movimentado apenas pela consulta.',createdAt:Date.now(),plugin:{type:'bankConsent',status:'pending'}});
      targetChat.updatedAt=Date.now();saveChats();if(activeChat&&activeChat.id===targetChat.id)renderChat();return;
    }
    thought=startThought();
    if(pluginType==='proposalDraft'){
      var draft=await requestKibaPlugin('/api/kiba/plugins/proposals/draft',{method:'POST',body:JSON.stringify({idea:t})},controller);
      targetChat.messages.push({id:nowId(),role:'assistant',content:'Preparei uma minuta em linguagem formal. Revise o texto abaixo; ela só será enviada se você confirmar.',question:t,createdAt:Date.now(),plugin:{type:'proposalDraft',draftId:draft.draftId,title:draft.title,description:draft.description,category:draft.category,priority:draft.priority,status:'awaiting_confirmation'}});
      targetChat.updatedAt=Date.now();saveChats();if(activeChat&&activeChat.id===targetChat.id)renderChat();else renderHistory();return;
    }
    var token=localStorage.getItem('sorokiba_token')||'';
    timeoutId=setTimeout(function(){timedOut=true;try{controller.abort()}catch(e){}},KIBA_REQUEST_TIMEOUT_MS);
    var response=await fetch('/api/kiba/ask',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},signal:controller.signal,body:JSON.stringify({question:t,currentPage:window.currentPage||window.sorokibaCurrentPage||'city',conversation:getConversation()})});
    var data;
    try{data=await response.json()}catch(parseError){throw new Error('O servidor retornou uma resposta inválida.')}
    if(!response.ok)throw new Error(data.error||'Não consegui consultar Sorokiba.');
    var elapsed=Number(data.elapsedMs)||Math.round(performance.now()-started);
    targetChat.messages.push({id:nowId(),role:'assistant',content:String(data.answer||'Não encontrei uma resposta.'),question:t,createdAt:Date.now(),elapsedMs:elapsed,sources:Array.isArray(data.searched)?data.searched:[],agents:Array.isArray(data.agents)?data.agents:[],plan:Array.isArray(data.researchPlan)?data.researchPlan:[]});
    targetChat.updatedAt=Date.now();saveChats();if(activeChat&&activeChat.id===targetChat.id)renderChat();else renderHistory();
  }catch(err){
    addTemporary(timedOut?'O Kiba demorou para responder. Tente novamente em alguns instantes.':err&&err.name==='AbortError'?'A consulta foi interrompida.':'Não consegui consultar os dados de Sorokiba agora: '+String(err.message||err));
  }finally{
    if(timeoutId!==null)clearTimeout(timeoutId);
    if(thought){clearInterval(thought.timer);if(thought.el&&thought.el.parentNode)thought.el.remove()}
    activeAbort=null;sending=false;if(input)input.disabled=false;if(button)button.disabled=false;if(stop)stop.classList.remove('show');focusInput();
  }
}
function addTemporary(text){
  var m=document.getElementById('kibaMsgs'),row=document.createElement('div');row.className='kibaMessage assistant';row.innerHTML='<div class="kibaAvatarMini">!</div><div class="kibaContent"><div class="kibaBubble"></div></div>';row.querySelector('.kibaBubble').textContent=text;m.appendChild(row);scrollToEnd();
}

function mount(){
  if(document.getElementById('kibaBtn'))return;
  loadChats();
  var b=document.createElement('button');b.id='kibaBtn';b.title='Abrir Kiba';b.innerHTML=svg();document.body.appendChild(b);
  var c=document.createElement('section');c.id='kibaChat';
  c.innerHTML='<header class="kh"><div class="ka">'+svg()+'</div><div><b>Kiba</b><small>IA própria · Assistente de Sorokiba</small></div><span class="kstatus">ONLINE</span><button type="button" class="khead-action" id="kibaHistoryBtn" title="Conversas">☰</button><button type="button" class="khead-action" id="kibaNewChat" title="Nova conversa">＋</button><button type="button" class="kc" title="Fechar">×</button></header><div class="kibaChatBody"><div class="kibaHistory" id="kibaHistory"><div class="kibaHistoryHead"><b>Conversas recentes</b><button class="kibaHistoryClose" type="button">×</button></div><button class="kibaHistoryNew" type="button">＋ Nova conversa</button><div class="kibaHistoryList" id="kibaHistoryList"></div><div class="kibaHistoryFooter"><button class="kibaClearAll" type="button">Limpar histórico local</button></div></div><div class="km" id="kibaMsgs"></div><button type="button" class="kibaScrollBottom" id="kibaScrollBottom" title="Ir para o fim">↓</button><button type="button" class="kibaStop" id="kibaStop" title="Parar consulta">■</button></div><div class="kibaBottom"><div class="kibaQuick"><button type="button" data-q="Como está Sorokiba agora?">🏙️ Cidade</button><button type="button" data-q="Qual profissão paga mais?">💼 Profissões</button><button type="button" data-q="O que tem no hospital?">🏥 Hospital</button><button type="button" data-q="Mostre as empresas da cidade.">🏢 Empresas</button></div><form class="kf"><input maxlength="500" autocomplete="off" placeholder="Pergunte qualquer coisa sobre Sorokiba..."><button aria-label="Enviar">↑</button></form></div></section>';
  document.body.appendChild(c);
  c.querySelector('#kibaHistoryBtn').onclick=openHistory;c.querySelector('#kibaNewChat').onclick=createNewChat;c.querySelector('.kibaHistoryClose').onclick=closeHistory;c.querySelector('.kibaHistoryNew').onclick=createNewChat;c.querySelector('.kibaClearAll').onclick=deleteAllChats;c.querySelector('.kc').onclick=function(){c.classList.remove('open');closeHistory()};c.querySelector('#kibaScrollBottom').onclick=scrollToEnd;c.querySelector('#kibaStop').onclick=function(){if(activeAbort)activeAbort.abort()};
  b.onclick=function(){c.classList.add('open');renderChat();focusInput()};
  c.querySelectorAll('.kibaQuick button').forEach(function(btn){btn.onclick=function(){send(btn.dataset.q)}});
  c.querySelector('.kf').onsubmit=function(e){e.preventDefault();var i=c.querySelector('.kf input'),t=i.value.trim();if(t&&!sending){i.value='';send(t)}};
  c.querySelector('.km').addEventListener('scroll',updateScrollButton);
  renderChat();
}
function arrival(){
  var account=String((USER&&USER.username)||'citizen');
  var key='sorokiba_kiba_intro_20260930_'+account;
  if(localStorage.getItem(key))return;
  localStorage.setItem(key,'1');
  if(document.getElementById('kibaArrival'))return;
  var wrap=document.createElement('div');wrap.id='kibaArrival';
  wrap.innerHTML='<div class="kibaShadow"></div><div class="kibaDust"></div><div class="kibaWalker">'+svg()+'</div><div class="kibaTalk"><strong>🐾 Kiba chegou!</strong><p>Olá! Eu sou o Kiba, o mascote de Sorokiba. Estou aqui para ajudar você a entender a cidade e seus sistemas.</p><button type="button">Continuar</button></div>';
  document.body.appendChild(wrap);
  var btn=wrap.querySelector('button');if(btn)btn.onclick=function(){wrap.remove()};
  setTimeout(function(){if(wrap.parentNode)wrap.remove()},9000);
}

function start(){var g=document.getElementById('gameView');if(!g||g.classList.contains('hidden'))return;mount();if(localStorage.getItem('sorokiba_token'))arrival();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('sorokiba:game-ready',start);
window.sorokibaKiba={open:function(){var c=document.getElementById('kibaChat');if(c){c.classList.add('open');focusInput()}},setUser:function(user){var previous=String(USER&&USER.username||'');USER=user||null;if(previous!==String(USER&&USER.username||''))kibaBankPluginData.clear();loadChats();if(document.getElementById('kibaChat'))renderChat()},start:start,stop:function(){if(activeAbort)activeAbort.abort()}};
})();