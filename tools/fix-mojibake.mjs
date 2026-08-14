import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
const cp1252 = new Map([
  ['€',0x80],['‚',0x82],['ƒ',0x83],['„',0x84],['…',0x85],['†',0x86],['‡',0x87],
  ['ˆ',0x88],['‰',0x89],['Š',0x8a],['‹',0x8b],['Œ',0x8c],['Ž',0x8e],['‘',0x91],
  ['’',0x92],['“',0x93],['”',0x94],['•',0x95],['–',0x96],['—',0x97],['˜',0x98],
  ['™',0x99],['š',0x9a],['›',0x9b],['œ',0x9c],['ž',0x9e],['Ÿ',0x9f]
]);
const decoder = new TextDecoder('utf-8', { fatal: true });

function repairRun(run) {
  if (!/[ÃÂâðï]/.test(run)) return run;
  try {
    const bytes = Uint8Array.from([...run], char => {
      const code = char.codePointAt(0);
      if (code <= 0xff) return code;
      if (cp1252.has(char)) return cp1252.get(char);
      throw new Error('not cp1252');
    });
    return decoder.decode(bytes);
  } catch {
    return run;
  }
}

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let repaired = original;
  for (let pass = 0; pass < 2; pass++) {
    repaired = repaired.replace(/[^\x00-\x7f]+/gu, repairRun);
  }
  if (repaired !== original) writeFileSync(file, repaired, 'utf8');
}
