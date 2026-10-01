import {makeQuestions,parseSpokenNumber} from './math.js';
const strings={
en:{brand:'Times Table Club',eyebrow:'A little practice. A big difference.',title:'Let’s make numbers click.',subtitle:'Pick your tables, choose your challenge, and have a go.',choose:'Choose your challenge',practice:'Practice',practiceDesc:'Take your time. Learn as you go.',sprint:'5-second challenge',sprintDesc:'Think fast! Five seconds per answer.',clock:'Beat the clock',clockDesc:'See how fast you finish a whole quiz.',voice:'Voice quiz',voiceDesc:'Listen, then say the answer in 5 seconds.',settings:'Make it your own',tables:'Multiplication tables',all:'Select all',clear:'Clear all',tableHint:'Choose one or more tables, from 1 to 12.',questions:'Number of questions',ready:'Ready when you are',summary:'{count} questions · {tables} tables selected',start:'Let’s play',noTables:'Choose at least one table to get started.',voiceInfo:'Voice quizzes need a microphone and internet. Chrome or Edge works best. Your browser may send speech to its recognition service.',voiceUnavailable:'This browser does not support voice quizzes. Try Chrome or Edge, or choose a typed challenge.',footer:'Small steps, stronger skills. You’ve got this!',install:'Install app',installHelp:'To install: use your browser’s Install app option. On iPhone or iPad, tap Share, then Add to Home Screen.',exit:'End quiz',question:'Question {n} of {total}',check:'Check',answer:'Your answer',correct:'You got it!',tryAgain:'Not quite. Try again!',timeUp:'Time’s up. {a} × {b} = {answer}',wrong:'Good try. {a} × {b} = {answer}',hint:'Show a hint',hintText:'{b} groups of {a}: {sum}',skip:'Skip',score:'{n} correct',streak:'{n} in a row',reading:'Listen to the question…',listening:'Listening… say your answer!',heard:'I heard: “{text}”',voiceRetry:'Try again — there’s still time.',voiceUnknown:'Say one number, or type your answer.',voiceStart:'Getting your microphone ready…',voiceError:'Microphone access is unavailable. Allow microphone access in your browser, then try again, or choose a typed challenge.',voiceNetwork:'Speech recognition is unavailable. Check your connection, then try again, or choose a typed challenge.',typeInstead:'Use the keypad',speakInstead:'Use my voice',done:'Nice work!',perfect:'A perfect round. Brilliant!',doneText:'Every question is another step forward.',accuracy:'Correct',elapsed:'Total time',average:'Average / question',again:'Play again',change:'Change challenge',review:'Let’s practise these',retry:'Practise missed questions',paused:'Quiz ended because microphone access was lost.',questionSpoken:'What is {a} times {b}?',correctSpoken:'Correct!',wrongSpoken:'The answer is {answer}.',backspace:'Delete last digit',seconds:'seconds',offline:'Ready for offline practice',invalidAnswer:'Enter a whole number from 0 to 144.',speechFallback:'The question could not be read aloud. Read it on screen and say your answer.',installButton:'How to install',noSpeech:'No answer heard yet. Try again.'},
de:{brand:'Einmaleins-Club',eyebrow:'Ein bisschen Übung. Ein großer Unterschied.',title:'Zahlen? Kannst du!',subtitle:'Wähle deine Reihen und eine Übung. Los geht’s!',choose:'Wähle deine Herausforderung',practice:'Üben',practiceDesc:'Ganz in Ruhe. Schritt für Schritt.',sprint:'5-Sekunden-Challenge',sprintDesc:'Denk schnell! Fünf Sekunden pro Antwort.',clock:'Gegen die Uhr',clockDesc:'Wie schnell schaffst du das ganze Quiz?',voice:'Sprachquiz',voiceDesc:'Hör zu und antworte in 5 Sekunden.',settings:'Deine Einstellungen',tables:'Einmaleins-Reihen',all:'Alle wählen',clear:'Alle abwählen',tableHint:'Wähle eine oder mehrere Reihen von 1 bis 12.',questions:'Anzahl der Fragen',ready:'Bereit, wenn du es bist',summary:'{count} Fragen · {tables} Reihen ausgewählt',start:'Los geht’s',noTables:'Wähle zuerst mindestens eine Reihe.',voiceInfo:'Sprachquiz: Mikrofon und Internet nötig. Chrome oder Edge funktioniert am besten. Dein Browser kann Sprache an seinen Erkennungsdienst senden.',voiceUnavailable:'Dieser Browser unterstützt kein Sprachquiz. Probiere Chrome oder Edge oder wähle eine Übung zum Tippen.',footer:'Mit jeder Übung wirst du sicherer. Du schaffst das!',install:'App installieren',installHelp:'Zum Installieren: Wähle „App installieren“ im Browser. Auf iPhone oder iPad: Teilen, dann „Zum Home-Bildschirm“.',exit:'Quiz beenden',question:'Frage {n} von {total}',check:'Prüfen',answer:'Deine Antwort',correct:'Richtig!',tryAgain:'Noch nicht ganz. Versuch es noch mal!',timeUp:'Zeit vorbei. {a} × {b} = {answer}',wrong:'Gut versucht. {a} × {b} = {answer}',hint:'Tipp anzeigen',hintText:'{b} Gruppen mit je {a}: {sum}',skip:'Überspringen',score:'{n} richtig',streak:'{n} in Folge',reading:'Hör dir die Frage an…',listening:'Ich höre zu. Sag deine Antwort!',heard:'Ich habe gehört: „{text}“',voiceRetry:'Versuch es noch mal — du hast noch Zeit.',voiceUnknown:'Sag eine Zahl oder tippe deine Antwort.',voiceStart:'Dein Mikrofon wird vorbereitet…',voiceError:'Das Mikrofon ist nicht verfügbar. Erlaube den Mikrofonzugriff im Browser und versuche es erneut oder wähle eine Übung zum Tippen.',voiceNetwork:'Die Spracherkennung ist nicht verfügbar. Prüfe deine Verbindung und versuche es erneut oder wähle eine Übung zum Tippen.',typeInstead:'Tastatur verwenden',speakInstead:'Mit Sprache antworten',done:'Gut gemacht!',perfect:'Alles richtig. Super!',doneText:'Mit jeder Frage kommst du ein Stück weiter.',accuracy:'Richtig',elapsed:'Gesamtzeit',average:'Durchschnitt / Frage',again:'Noch mal spielen',change:'Andere Übung',review:'Diese Aufgaben üben wir noch',retry:'Fehler noch mal üben',paused:'Das Quiz wurde beendet, weil der Mikrofonzugriff verloren ging.',questionSpoken:'Was ist {a} mal {b}?',correctSpoken:'Richtig!',wrongSpoken:'Die Antwort ist {answer}.',backspace:'Letzte Ziffer löschen',seconds:'Sekunden',offline:'Bereit zum Üben ohne Internet',invalidAnswer:'Gib eine ganze Zahl von 0 bis 144 ein.',speechFallback:'Die Frage konnte nicht vorgelesen werden. Lies sie auf dem Bildschirm und sag deine Antwort.',installButton:'So installierst du die App',noSpeech:'Noch keine Antwort gehört. Versuch es noch mal.'}
};
const icons={practice:'<path d="M4 5h6a3 3 0 0 1 3 3v12a4 4 0 0 0-4-2H4z"/><path d="M20 5h-4a3 3 0 0 0-3 3v12a4 4 0 0 1 4-2h3z"/>',sprint:'<path d="M13 2L5 14h6l-1 8 9-13h-7z"/>',clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6M12 2v3"/>',voice:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>'};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const app=document.querySelector('#app');
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let saved={};try{saved=JSON.parse(localStorage.getItem('club-preferences')||'{}');}catch{}
let lang=['en','de'].includes(saved.lang)?saved.lang:(navigator.language.startsWith('de')?'de':'en');
let mode=['practice','sprint','clock','voice'].includes(saved.mode)?saved.mode:'practice';
let count=[20,30,50].includes(saved.count)?saved.count:20;
let tables=new Set(Array.isArray(saved.tables)?saved.tables.filter(n=>Number.isInteger(n)&&n>=1&&n<=12):[1,2,3,4,5,6,7,8,9,10,11,12]);
let view='setup',session=null,questionToken=0,recognizer=null,tickId=null,deadlineId=null,nextId=null,speechWatchdog=null,voiceBlocked=false,voiceTyping=false,installPrompt=null;
const t=(key,vars={})=>Object.entries(vars).reduce((s,[k,v])=>s.replaceAll(`{${k}}`,String(v)),strings[lang][key]||key);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>{try{localStorage.setItem('club-preferences',JSON.stringify({lang,mode,count,tables:[...tables]}));}catch{}};
const announce=s=>document.querySelector('#announcement').textContent=s;
function chrome(){document.documentElement.lang=lang;document.title=t('brand');document.querySelector('#brandName').textContent=t('brand');document.querySelectorAll('[data-lang]').forEach(b=>{b.classList.toggle('active',b.dataset.lang===lang);b.setAttribute('aria-pressed',String(b.dataset.lang===lang));b.disabled=view!=='setup';});document.querySelector('#footer').textContent=t('footer');const install=document.querySelector('#install');install.textContent=t(installPrompt?'install':'installButton');install.hidden=matchMedia('(display-mode: standalone)').matches||navigator.standalone;}
function renderSetup(message=''){
  view='setup';chrome();
  app.innerHTML=`<div class="intro"><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><p>${t('subtitle')}</p></div><div class="setup"><section class="panel"><h2><span class="step">1</span>${t('choose')}</h2><div class="modes" role="group" aria-label="${t('choose')}">${['practice','sprint','clock','voice'].map(m=>`<button class="mode ${mode===m?'selected':''}" data-mode="${m}" aria-pressed="${mode===m}"><span class="icon">${icon(m)}</span><strong>${t(m)}</strong><small>${t(m+'Desc')}</small>${mode===m?'<span class="check" aria-hidden="true">✓</span>':''}</button>`).join('')}</div>${mode==='voice'?`<p class="warning">${t(Recognition?'voiceInfo':'voiceUnavailable')}</p>`:''}</section><section class="panel"><h2><span class="step">2</span>${t('settings')}</h2><div class="panel-label"><span>${t('tables')}</span><button class="text-button" id="all-tables">${t(tables.size===12?'clear':'all')}</button></div><div class="tables" role="group" aria-label="${t('tables')}">${Array.from({length:12},(_,i)=>i+1).map(n=>`<button class="table ${tables.has(n)?'selected':''}" data-table="${n}" aria-pressed="${tables.has(n)}" aria-label="${n} ×">${n}</button>`).join('')}</div><p class="fine">${t('tableHint')}</p><div class="divider"></div><p class="panel-label">${t('questions')}</p><div class="counts" role="group" aria-label="${t('questions')}">${[20,30,50].map(n=>`<button class="${count===n?'selected':''}" data-count="${n}" aria-pressed="${count===n}">${n}</button>`).join('')}</div></section></div><div class="start-bar"><div><strong>${t('ready')}</strong><p>${tables.size?t('summary',{count,tables:tables.size}):t('noTables')}</p></div><button id="start" class="primary" ${!tables.size||mode==='voice'&&!Recognition?'disabled':''}>${t('start')}</button></div>${message?`<p class="warning" role="alert">${escape(message)}</p>`:''}`;
  app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;save();renderSetup();app.querySelector(`[data-mode="${mode}"]`).focus();});
  app.querySelectorAll('[data-table]').forEach(b=>b.onclick=()=>{const n=+b.dataset.table;tables.has(n)?tables.delete(n):tables.add(n);save();renderSetup();app.querySelector(`[data-table="${n}"]`).focus();});
  app.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{count=+b.dataset.count;save();renderSetup();app.querySelector(`[data-count="${count}"]`).focus();});
  app.querySelector('#all-tables').onclick=()=>{tables=tables.size===12?new Set():new Set(Array.from({length:12},(_,i)=>i+1));save();renderSetup();app.querySelector('#all-tables').focus();};
  app.querySelector('#start').onclick=()=>startQuiz();
}
function stopRecognition(){if(recognizer){const old=recognizer;recognizer=null;old.onend=null;old.onresult=null;old.onerror=null;try{old.abort();}catch{}}}
function clearQuestion(){questionToken++;clearInterval(tickId);clearTimeout(deadlineId);clearTimeout(nextId);clearTimeout(speechWatchdog);stopRecognition();window.speechSynthesis?.cancel();}
function exitQuiz(message=''){clearQuestion();session=null;renderSetup(message);window.scrollTo(0,0);}
async function startQuiz(customQuestions){
  if(!tables.size||view==='starting')return;
  if(mode==='voice'){
    if(!Recognition)return;
    view='starting';const button=app.querySelector('#start');if(button){button.disabled=true;button.textContent=t('voiceStart');}
    // Unlock speech synthesis during the user's gesture on mobile browsers.
    if(window.speechSynthesis){const unlock=new SpeechSynthesisUtterance('');window.speechSynthesis.speak(unlock);}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop());}catch{renderSetup(t('voiceError'));return;}
  }
  clearQuestion();voiceTyping=false;voiceBlocked=false;
  session={questions:customQuestions||makeQuestions([...tables],count),index:0,correct:0,streak:0,bestStreak:0,missed:[],answers:[],started:performance.now(),phase:'reading',deadline:0,answerStarted:0,hadMistake:false};
  view='quiz';chrome();window.scrollTo(0,0);showQuestion();
}
function showQuestion(){
  clearQuestion();const token=questionToken;const q=session.questions[session.index];session.phase=mode==='voice'?'reading':'answering';session.hadMistake=false;
  app.innerHTML=`<section class="session"><div class="session-head"><strong>${t(mode)}</strong><button class="quiet" id="exit">${t('exit')} ✕</button></div><div class="progress" role="progressbar" aria-label="${t('questions')}" aria-valuemin="0" aria-valuemax="${session.questions.length}" aria-valuenow="${session.index}"><span style="width:${session.index/session.questions.length*100}%"></span></div><div class="quiz"><div class="question-meta"><span>${t('question',{n:session.index+1,total:session.questions.length})}</span><span class="timer" id="timer">${mode==='sprint'||mode==='voice'?'5.0 s':mode==='clock'?'0:00':'∞'}</span></div><div class="question" aria-label="${t('questionSpoken',q)}">${q.a} <span class="times">×</span> ${q.b} <span class="times">=</span> ?</div><div id="voice-panel" ${mode!=='voice'||voiceTyping?'hidden':''}><div class="mic" id="mic">${icon('voice')}</div><p class="voice-status" id="voice-status">${t('reading')}</p></div><form id="answer-form" ${mode==='voice'&&!voiceTyping?'hidden':''}><div class="answer-row"><input id="answer" aria-label="${t('answer')}" inputmode="numeric" autocomplete="off" pattern="[0-9]*" maxlength="3"><button class="primary" id="check" type="submit">${t('check')}</button></div><div class="keypad" aria-label="${t('typeInstead')}">${[1,2,3,4,5,6,7,8,9,'C',0,'⌫'].map(n=>`<button type="button" data-key="${n}" ${n==='⌫'?`aria-label="${t('backspace')}"`:''}>${n}</button>`).join('')}</div></form><div class="feedback" id="feedback" role="status" aria-live="polite"></div><div class="quiz-bottom">${mode==='practice'?`<button class="text-button" id="hint">${t('hint')}</button><button class="text-button" id="skip">${t('skip')}</button>`:''}${mode==='voice'?`<button class="text-button" id="toggle-input">${t(voiceTyping?'speakInstead':'typeInstead')}</button>`:''}</div></div><div class="score-line"><span id="score">${t('score',{n:session.correct})}</span><span id="streak">${t('streak',{n:session.streak})}</span></div>${mode==='voice'?`<p class="voice-note">${t('voiceInfo')}</p>`:''}</section>`;
  app.querySelector('#exit').onclick=()=>exitQuiz();
  app.querySelector('#answer-form').onsubmit=e=>{e.preventDefault();submitTyped();};
  app.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{if(session.phase!=='answering')return;const input=app.querySelector('#answer');input.value=b.dataset.key==='C'?'':b.dataset.key==='⌫'?input.value.slice(0,-1):(input.value+b.dataset.key).slice(0,3);});
  if(mode==='practice'){
    app.querySelector('#hint').onclick=()=>{session.hadMistake=true;feedback(t('hintText',{...q,sum:Array(q.b).fill(q.a).join(' + ')}));};
    app.querySelector('#skip').onclick=()=>finishAnswer(false,null,'wrong');
  }
  if(mode==='voice'){
    app.querySelector('#toggle-input').onclick=()=>{voiceTyping=!voiceTyping;app.querySelector('#answer-form').hidden=!voiceTyping;app.querySelector('#voice-panel').hidden=voiceTyping;app.querySelector('#toggle-input').textContent=t(voiceTyping?'speakInstead':'typeInstead');if(voiceTyping){stopRecognition();app.querySelector('#answer').focus({preventScroll:true});}else if(session.phase==='answering'&&!voiceBlocked)listen(token);};
    readQuestion(q,token);
  }else{beginAnswer(token);if(matchMedia('(min-width: 761px)').matches)app.querySelector('#answer').focus({preventScroll:true});}
}
function feedback(text,type=''){const node=app.querySelector('#feedback');if(node){node.textContent=text;node.className='feedback '+type;}}
function beginAnswer(token){
  if(token!==questionToken||!session)return;
  session.phase='answering';session.answerStarted=performance.now();session.deadline=session.answerStarted+5000;
  if(mode==='voice'){app.querySelector('#voice-status').textContent=t('listening');app.querySelector('#mic').classList.add('listening');if(!voiceTyping&&!voiceBlocked)listen(token);}
  if(mode==='voice'||mode==='sprint')deadlineId=setTimeout(()=>{if(token===questionToken&&session?.phase==='answering')finishAnswer(false,null,'timeUp');},5000);
  if(mode!=='practice'){updateTimer();tickId=setInterval(updateTimer,50);}
}
function updateTimer(){
  if(!session||session.phase!=='answering')return;
  const timer=app.querySelector('#timer');
  if(mode==='clock'){timer.textContent=formatTime(performance.now()-session.started);return;}
  const remaining=session.deadline-performance.now();timer.textContent=`${Math.max(0,remaining/1000).toFixed(1)} s`;timer.classList.toggle('urgent',remaining<2000);
  if(remaining<=0)finishAnswer(false,null,'timeUp');
}
function submitTyped(){
  if(session?.phase!=='answering')return;
  if((mode==='sprint'||mode==='voice')&&performance.now()>=session.deadline){finishAnswer(false,null,'timeUp');return;}
  const input=app.querySelector('#answer'),raw=input.value.trim();if(!/^\d{1,3}$/.test(raw)||+raw>144){feedback(t('invalidAnswer'),'wrong');return;}
  const q=session.questions[session.index],correct=+raw===q.a*q.b;
  if(!correct&&mode==='practice'){session.hadMistake=true;feedback(t('tryAgain'),'wrong');input.value='';return;}
  finishAnswer(correct,+raw,correct?'correct':'wrong');
}
function finishAnswer(correct,answer,message){
  if(!session||session.phase!=='answering')return;
  session.phase='feedback';clearInterval(tickId);clearTimeout(deadlineId);stopRecognition();
  const q=session.questions[session.index];session.answers.push({q,answer,correct,ms:performance.now()-session.answerStarted});
  if(correct){session.correct++;session.streak++;session.bestStreak=Math.max(session.bestStreak,session.streak);}else session.streak=0;
  if(!correct||session.hadMistake)session.missed.push(q);
  feedback(t(message,{...q,answer:q.a*q.b}),correct?'correct':'wrong');
  app.querySelector('#score').textContent=t('score',{n:session.correct});app.querySelector('#streak').textContent=t('streak',{n:session.streak});app.querySelectorAll('#answer-form button,#answer-form input,.quiz-bottom button').forEach(b=>b.disabled=true);app.querySelector('#mic')?.classList.remove('listening');
  const token=questionToken;const next=()=>{if(token!==questionToken||!session)return;session.index++;if(session.index>=session.questions.length)renderResults();else showQuestion();};
  if(mode==='voice')say(t(correct?'correctSpoken':'wrongSpoken',{answer:q.a*q.b}),token,()=>{nextId=setTimeout(next,correct?300:1000);},2500);
  else nextId=setTimeout(next,correct?700:1800);
}
function say(text,token,done,maxDuration=7000){
  if(!window.speechSynthesis){done(false);return;}
  let finished=false;const finish=ok=>{if(finished)return;finished=true;clearTimeout(speechWatchdog);if(token===questionToken)done(ok);};
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang==='de'?'de-DE':'en-US';utterance.rate=.9;const voice=window.speechSynthesis.getVoices().find(v=>v.lang.startsWith(lang));if(voice)utterance.voice=voice;
  utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);speechWatchdog=setTimeout(()=>{window.speechSynthesis.cancel();finish(false);},maxDuration);window.speechSynthesis.speak(utterance);
}
function readQuestion(q,token){say(t('questionSpoken',q),token,ok=>{if(!ok)feedback(t('speechFallback'));beginAnswer(token);});}
function listen(token){
  if(!Recognition||token!==questionToken||!session||session.phase!=='answering'||voiceTyping||voiceBlocked)return;
  stopRecognition();const rec=new Recognition();recognizer=rec;rec.lang=lang==='de'?'de-DE':'en-US';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
  rec.onresult=event=>{
    if(token!==questionToken||session?.phase!=='answering')return;
    if(performance.now()>=session.deadline){finishAnswer(false,null,'timeUp');return;}
    for(let i=event.resultIndex;i<event.results.length;i++){
      const result=event.results[i],text=result[0].transcript,n=parseSpokenNumber(text,lang),q=session.questions[session.index];
      if(result.isFinal&&n===q.a*q.b){finishAnswer(true,n,'correct');return;}
      if(result.isFinal)feedback(`${t('heard',{text})} ${t(n===null?'voiceUnknown':'voiceRetry')}`);
    }
  };
  rec.onerror=event=>{
    if(token!==questionToken||session?.phase!=='answering')return;
    if(['not-allowed','service-not-allowed','audio-capture'].includes(event.error)){exitQuiz(t('voiceError'));return;}
    if(['network','language-not-supported'].includes(event.error)){exitQuiz(t('voiceNetwork'));return;}
    if(event.error==='no-speech')feedback(t('noSpeech'));
  };
  rec.onend=()=>{if(recognizer===rec)recognizer=null;if(token===questionToken&&session?.phase==='answering'&&!voiceTyping&&!voiceBlocked&&performance.now()<session.deadline)nextId=setTimeout(()=>listen(token),100);};
  try{rec.start();}catch{voiceBlocked=true;voiceTyping=true;app.querySelector('#answer-form').hidden=false;app.querySelector('#voice-panel').hidden=true;app.querySelector('#toggle-input').textContent=t('speakInstead');feedback(t('voiceError'));}
}
function formatTime(ms){const seconds=Math.floor(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function renderResults(){
  const result=session;result.elapsed=performance.now()-result.started;clearQuestion();view='results';chrome();
  const average=result.answers.reduce((sum,a)=>sum+a.ms,0)/result.answers.length/1000;
  const missed=[...new Map(result.missed.map(q=>[`${q.a}x${q.b}`,q])).values()];
  app.innerHTML=`<section class="result panel"><div class="result-mark" aria-hidden="true">✓</div><p class="eyebrow">${t(mode)}</p><h1>${t(result.correct===result.questions.length&&!missed.length?'perfect':'done')}</h1><p class="intro-text">${t('doneText')}</p><div class="stats"><div class="stat"><strong>${result.correct} / ${result.questions.length}</strong><span>${t('accuracy')}</span></div><div class="stat"><strong>${formatTime(result.elapsed)}</strong><span>${t('elapsed')}</span></div><div class="stat"><strong>${average.toFixed(1)} s</strong><span>${t('average')}</span></div></div><div class="result-actions"><button class="primary" id="again">${t('again')}</button><button class="secondary" id="change">${t('change')}</button></div>${missed.length?`<div class="review"><h2>${t('review')}</h2><div class="review-list">${missed.map(q=>`<span class="fact">${q.a} × ${q.b} = <strong>${q.a*q.b}</strong></span>`).join('')}</div><button class="text-button" id="retry" style="margin-top:16px">${t('retry')}</button></div>`:''}</section>`;
  app.querySelector('#again').onclick=()=>startQuiz();app.querySelector('#change').onclick=()=>exitQuiz();if(missed.length)app.querySelector('#retry').onclick=()=>{mode='practice';startQuiz(missed);};
  announce(t('done')+' '+result.correct+' / '+result.questions.length);app.querySelector('#again').focus({preventScroll:true});
}
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{if(view!=='setup')return;lang=b.dataset.lang;save();renderSetup();});
document.querySelector('.brand').onclick=e=>{e.preventDefault();exitQuiz();};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session?.phase==='answering'&&(mode==='voice'||mode==='sprint'))updateTimer();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;chrome();});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.querySelector('#install').hidden=true;});
document.querySelector('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;chrome();}else{const existing=app.querySelector('#install-help');if(existing)existing.remove();else{const p=document.createElement('p');p.id='install-help';p.className='warning';p.textContent=t('installHelp');p.setAttribute('role','status');app.prepend(p);}}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderSetup();
// Optional browser agent support uses the same controls and preferences.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(context.registerTool({name:'configure_multiplication_quiz',description:'Configure the visible quiz setup. Does not start a quiz.',inputSchema:{type:'object',properties:{mode:{enum:['practice','sprint','clock','voice']},language:{enum:['en','de']},count:{enum:[20,30,50]},tables:{type:'array',items:{type:'integer',minimum:1,maximum:12},minItems:1}},additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(view!=='setup')throw new Error('End the current quiz before configuring another.');if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['mode','language','count','tables'].includes(k))||input.mode&&!['practice','sprint','clock','voice'].includes(input.mode)||input.language&&!['en','de'].includes(input.language)||input.count!==undefined&&![20,30,50].includes(input.count)||input.tables!==undefined&&(!Array.isArray(input.tables)||!input.tables.length||!input.tables.every(n=>Number.isInteger(n)&&n>=1&&n<=12)))throw new Error('Invalid quiz settings.');mode=input.mode||mode;lang=input.language||lang;count=input.count||count;tables=input.tables?new Set(input.tables):tables;save();renderSetup();return {mode,language:lang,count,tables:[...tables]};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
