import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LessonModel } from './models/Lesson';

type VocabItem = {
  id?: string;
  lemma?: string;
  surface?: string;
  article?: string | null;
  gender?: string | null;
  pos?: string;
  translation_en?: string;
  tags?: string[];
};

type GrammarRule = {
  id?: string;
  title: string;
  explanation: string;
  examples?: Array<{ de: string; en?: string }>;
  tags?: string[];
};

function uniqByKey<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function alphabetVocab(): VocabItem[] {
  const letters = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z'.split(',');
  const specials = ['Ä', 'Ö', 'Ü', 'ß'];

  const items: VocabItem[] = [];
  for (const l of [...letters, ...specials]) {
    items.push({
      lemma: l,
      surface: l,
      article: null,
      gender: null,
      pos: 'letter',
      translation_en: l,
      tags: ['alphabet', 'a0', 'pronunciation'],
    });
  }

  // Common meta terms for alphabet lesson
  items.push(
    {
      lemma: 'Alphabet',
      surface: 'das Alphabet',
      article: 'das',
      gender: 'n',
      pos: 'noun',
      translation_en: 'alphabet',
      tags: ['alphabet', 'a0', 'pronunciation'],
    },
    {
      lemma: 'Buchstabe',
      surface: 'der Buchstabe',
      article: 'der',
      gender: 'm',
      pos: 'noun',
      translation_en: 'letter',
      tags: ['alphabet', 'a0', 'pronunciation'],
    },
    {
      lemma: 'buchstabieren',
      surface: 'buchstabieren',
      article: null,
      gender: null,
      pos: 'verb',
      translation_en: 'to spell',
      tags: ['alphabet', 'a0', 'pronunciation'],
    }
  );

  return uniqByKey(items, (v) => (v.surface ?? v.lemma ?? '').toLowerCase());
}

function numberVocab0To100(): VocabItem[] {
  // Canonical German number words 0-20
  const base: Record<number, string> = {
    0: 'null',
    1: 'eins',
    2: 'zwei',
    3: 'drei',
    4: 'vier',
    5: 'fünf',
    6: 'sechs',
    7: 'sieben',
    8: 'acht',
    9: 'neun',
    10: 'zehn',
    11: 'elf',
    12: 'zwölf',
    13: 'dreizehn',
    14: 'vierzehn',
    15: 'fünfzehn',
    16: 'sechzehn',
    17: 'siebzehn',
    18: 'achtzehn',
    19: 'neunzehn',
    20: 'zwanzig',
  };

  const tens: Record<number, string> = {
    30: 'dreißig',
    40: 'vierzig',
    50: 'fünfzig',
    60: 'sechzig',
    70: 'siebzig',
    80: 'achtzig',
    90: 'neunzig',
    100: 'hundert',
  };

  function germanNumber(n: number): string {
    if (base[n]) return base[n];
    if (tens[n]) return tens[n];
    if (n > 20 && n < 100) {
      const t = Math.floor(n / 10) * 10;
      const u = n % 10;
      const unit = u === 1 ? 'ein' : base[u];
      return `${unit}und${tens[t]}`;
    }
    return String(n);
  }

  const items: VocabItem[] = [];
  for (let n = 0; n <= 100; n++) {
    const de = germanNumber(n);
    items.push({
      lemma: de,
      surface: de,
      article: null,
      gender: null,
      pos: 'number',
      translation_en: String(n),
      tags: ['numbers', 'a0'],
    });
  }

  items.push(
    {
      lemma: 'Zahl',
      surface: 'die Zahl',
      article: 'die',
      gender: 'f',
      pos: 'noun',
      translation_en: 'number',
      tags: ['numbers', 'a0'],
    },
    {
      lemma: 'wie viel',
      surface: 'Wie viel?',
      article: null,
      gender: null,
      pos: 'phrase',
      translation_en: 'How much?',
      tags: ['numbers', 'a0'],
    }
  );

  return uniqByKey(items, (v) => (v.surface ?? v.lemma ?? '').toLowerCase());
}

function timeVocab(): VocabItem[] {
  const items: VocabItem[] = [
    { lemma: 'Uhr', surface: 'die Uhr', article: 'die', gender: 'f', pos: 'noun', translation_en: 'clock / o’clock', tags: ['time', 'a0'] },
    { lemma: 'Wie spät', surface: 'Wie spät ist es?', article: null, gender: null, pos: 'phrase', translation_en: 'What time is it?', tags: ['time', 'a0'] },
    { lemma: 'Es ist', surface: 'Es ist … Uhr.', article: null, gender: null, pos: 'phrase', translation_en: 'It is … o’clock.', tags: ['time', 'a0'] },
    { lemma: 'halb', surface: 'halb', article: null, gender: null, pos: 'time_word', translation_en: 'half (to)', tags: ['time', 'a0'] },
    { lemma: 'Viertel', surface: 'Viertel', article: null, gender: null, pos: 'time_word', translation_en: 'quarter', tags: ['time', 'a0'] },
    { lemma: 'nach', surface: 'nach', article: null, gender: null, pos: 'time_word', translation_en: 'past', tags: ['time', 'a0'] },
    { lemma: 'vor', surface: 'vor', article: null, gender: null, pos: 'time_word', translation_en: 'to / before', tags: ['time', 'a0'] },
    { lemma: 'um', surface: 'um', article: null, gender: null, pos: 'prep', translation_en: 'at (time)', tags: ['time', 'a0'] },
    { lemma: 'morgens', surface: 'morgens', article: null, gender: null, pos: 'adv', translation_en: 'in the morning', tags: ['time', 'a0'] },
    { lemma: 'mittags', surface: 'mittags', article: null, gender: null, pos: 'adv', translation_en: 'at noon', tags: ['time', 'a0'] },
    { lemma: 'abends', surface: 'abends', article: null, gender: null, pos: 'adv', translation_en: 'in the evening', tags: ['time', 'a0'] },
    { lemma: 'nachts', surface: 'nachts', article: null, gender: null, pos: 'adv', translation_en: 'at night', tags: ['time', 'a0'] },
    { lemma: 'formal', surface: 'offiziell (24-Stunden-Zeit)', article: null, gender: null, pos: 'note', translation_en: 'formal (24-hour time)', tags: ['time', 'a0'] },
    { lemma: 'informal', surface: 'inoffiziell (12-Stunden-Zeit)', article: null, gender: null, pos: 'note', translation_en: 'informal (12-hour time)', tags: ['time', 'a0'] },
  ];
  return uniqByKey(items, (v) => (v.surface ?? v.lemma ?? '').toLowerCase());
}

function timeGrammar(): GrammarRule[] {
  return [
    {
      title: 'Telling the time: formal vs informal',
      explanation:
        "German commonly uses 24-hour time in formal contexts (schedules, announcements): 14:30 = 'vierzehn Uhr dreißig'. In everyday speech you often use informal time with 'halb', 'Viertel', 'nach', 'vor': 14:30 = 'halb drei'.",
      examples: [
        { de: 'Wie spät ist es?', en: 'What time is it?' },
        { de: 'Es ist 14:30. (formal)', en: 'It is 14:30 (formal).' },
        { de: 'Es ist vierzehn Uhr dreißig. (formal)', en: 'It is fourteen thirty.' },
        { de: 'Es ist halb drei. (informal)', en: 'It is half past two.' },
        { de: 'Es ist Viertel nach drei.', en: 'It is a quarter past three.' },
        { de: 'Es ist zehn vor vier.', en: 'It is ten to four.' },
      ],
      tags: ['time', 'a0'],
    },
    {
      title: 'Appointments with „um“',
      explanation: "Use 'um' to say when something happens: 'um 8 Uhr' (at 8 o’clock). You can add parts of day: 'um 8 Uhr morgens' (at 8 in the morning).",
      examples: [
        { de: 'Der Kurs ist um 8 Uhr.', en: 'The class is at 8 o’clock.' },
        { de: 'Wir treffen uns um 18 Uhr.', en: 'We meet at 18:00.' },
        { de: 'Ich arbeite um 7 Uhr morgens.', en: 'I work at 7 in the morning.' },
      ],
      tags: ['time', 'a0'],
    },
  ];
}

function alphabetGrammar(): GrammarRule[] {
  return [
    {
      title: 'Spelling: „Wie schreibt man das?“ / „Wie buchstabiert man das?“',
      explanation: "To ask how to spell something, use: 'Wie schreibt man das?' or 'Wie buchstabiert man das?'. To spell out loud, say each letter one by one.",
      examples: [
        { de: 'Wie buchstabiert man das?', en: 'How do you spell that?' },
        { de: 'A – N – N – A', en: 'A – N – N – A' },
      ],
      tags: ['alphabet', 'a0'],
    },
  ];
}

async function patchLessonByExternalId(externalId: string, patch: Partial<any>) {
  const lesson = await LessonModel.findOne({ externalId });
  if (!lesson) {
    console.log(`⚠️  Lesson not found for externalId=${externalId}`);
    return;
  }

  await LessonModel.updateOne({ _id: lesson._id }, { $set: patch });
  console.log(`✅ Patched lesson externalId=${externalId} (mongoId=${lesson._id.toString()})`);
}

async function run() {
  await connectToDatabase(env.MONGODB_URI);

  // Target lessons by generated curriculum IDs.
  const soundsAlphabetLessonExternalId = 'les_a0_a0-m1_1';
  const numbersTimeLessonExternalId = 'les_a0_a0-m3_1';

  await patchLessonByExternalId(soundsAlphabetLessonExternalId, {
    vocabulary: alphabetVocab(),
    grammarRules: alphabetGrammar(),
  });

  await patchLessonByExternalId(numbersTimeLessonExternalId, {
    vocabulary: uniqByKey([...numberVocab0To100(), ...timeVocab()], (v) => (v.surface ?? v.lemma ?? '').toLowerCase()),
    grammarRules: timeGrammar(),
  });

  console.log('🎉 Special lesson patch complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
