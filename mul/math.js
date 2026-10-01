export function makeQuestions(tables, count, random = Math.random) {
  if (!tables.length || !tables.every(n => Number.isInteger(n) && n >= 1 && n <= 12) || !Number.isInteger(count) || count < 1) throw new Error('Invalid quiz settings');
  const deck = tables.flatMap(a => Array.from({length:12}, (_,i) => ({a,b:i+1})));
  const result = [];
  while (result.length < count) {
    const shuffled = [...deck];
    for (let i = shuffled.length-1; i > 0; i--) { const j = Math.floor(random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    if (result.length && shuffled.length > 1 && shuffled[0].a === result.at(-1).a && shuffled[0].b === result.at(-1).b) [shuffled[0],shuffled[1]]=[shuffled[1],shuffled[0]];
    result.push(...shuffled.slice(0,count-result.length));
  }
  return result;
}
const enSmall=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const enTens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const deSmall=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn'];
const deTens=['','','zwanzig','dreißig','vierzig','fünfzig','sechzig','siebzig','achtzig','neunzig'];
export function numberWords(n,lang) {
  if (lang==='de') { if(n<20)return deSmall[n]; if(n<100)return (n%10 ? (n%10===1?'ein':deSmall[n%10])+'und':'')+deTens[Math.floor(n/10)]; return 'einhundert'+(n%100?numberWords(n%100,lang):''); }
  if(n<20)return enSmall[n];if(n<100)return enTens[Math.floor(n/10)]+(n%10?' '+enSmall[n%10]:'');return 'one hundred'+(n%100?' '+numberWords(n%100,lang):'');
}
const normalize = s => s.toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s.,!?\-]/g,'');
const words={en:new Map(),de:new Map()};
for(let n=0;n<=144;n++) { const en=numberWords(n,'en');words.en.set(normalize(en),n);words.en.set(normalize(en.replace('hundred ','hundred and ')),n);const de=numberWords(n,'de');words.de.set(normalize(de),n);if(n>=100)words.de.set(normalize(de.replace(/^ein/,'')),n); }
words.en.set('oh',0);words.en.set('for',4);words.de.set('ein',1);words.de.set('zwo',2);
export function parseSpokenNumber(text,lang) {
  const clean=text.toLowerCase().trim().replace(/^(the answer is|it is|it's|answer|die antwort ist|das ist|es ist|antwort|ist)\s+/,'').replace(/[.!?,]+$/,'').trim();
  if(/^\d{1,3}$/.test(clean)) {const n=Number(clean);return n<=144?n:null;}
  return words[lang]?.get(normalize(clean)) ?? null;
}
