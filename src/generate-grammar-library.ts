import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { GrammarModel } from './models/Grammar';

type GrammarItem = {
  id: string;
  title: string;
  level: 'A0' | 'A1' | 'A2' | 'B1';
  explanation: string;
  examples: Array<{ de: string; en: string }>;
  notes?: string[];
  common_errors?: string[];
  keywords?: string[];
  tables?: Array<{ title: string; headers: string[]; rows: string[][] }>;
};

type GrammarSection = {
  title: string;
  items: GrammarItem[];
};

function itemId(level: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `lib_${level.toLowerCase()}_${slug}`;
}

function mk(level: GrammarItem['level'], title: string, explanation: string, examples: GrammarItem['examples'], extras?: Partial<GrammarItem>): GrammarItem {
  return {
    id: itemId(level, title),
    title,
    level,
    explanation,
    examples,
    ...extras,
  };
}

function buildLibrary(): any {
  const A0: GrammarSection[] = [
    {
      title: 'Core sentences & questions (A0)',
      items: [
        mk(
          'A0',
          'Verb position in statements (Position 2)',
          'In German statements, the conjugated verb is in position 2. You may put a time/place expression in position 1, but the verb remains second.',
          [
            { de: 'Heute lerne ich Deutsch.', en: 'Today I learn German.' },
            { de: 'In Berlin wohne ich.', en: 'In Berlin I live.' },
          ],
          {
            keywords: ['word order', 'position 2', 'V2'],
            notes: ['If something is in position 1, the subject often moves after the verb.'],
          }
        ),
        mk(
          'A0',
          'Yes/No questions',
          'Yes/No questions start with the verb (verb-first).',
          [
            { de: 'Kommst du aus Berlin?', en: 'Are you from Berlin?' },
            { de: 'Hast du Zeit?', en: 'Do you have time?' },
          ],
          { keywords: ['questions', 'verb-first'] }
        ),
        mk(
          'A0',
          'W-questions (Wer/Was/Wo/Wann/Wie)',
          'W-question word is in position 1, verb stays in position 2.',
          [
            { de: 'Wie heißt du?', en: 'What is your name?' },
            { de: 'Wo wohnst du?', en: 'Where do you live?' },
          ],
          { keywords: ['questions', 'w-fragen'] }
        ),
      ],
    },
    {
      title: 'Time & numbers (A0)',
      items: [
        mk(
          'A0',
          'Telling the time (formal and informal)',
          'Formal contexts often use 24-hour time. Informal everyday German uses halb/viertel/nach/vor patterns.',
          [
            { de: 'Der Zug kommt um 14 Uhr 30.', en: 'The train arrives at 14:30.' },
            { de: 'Es ist halb drei.', en: 'It is 2:30.' },
            { de: 'Es ist Viertel nach drei.', en: 'It is 3:15.' },
          ],
          {
            keywords: ['time', 'uhr', 'halb', 'viertel', 'nach', 'vor'],
            common_errors: ['Confusing “halb drei” (2:30) with “three thirty”.'],
          }
        ),
      ],
    },
    {
      title: 'Basics: articles, pronouns, negation (A0)',
      items: [
        mk(
          'A0',
          'Definite articles (der/die/das) + gender (intro)',
          'Every noun has a grammatical gender (der = masculine, die = feminine, das = neuter). The article is part of the word and should be learned together with the noun.',
          [
            { de: 'der Tisch', en: 'the table' },
            { de: 'die Lampe', en: 'the lamp' },
            { de: 'das Buch', en: 'the book' },
          ],
          {
            keywords: ['articles', 'gender', 'der die das'],
            notes: ['Plural is usually “die” for all genders: die Tische / die Lampen / die Bücher.'],
          }
        ),
        mk(
          'A0',
          'Personal pronouns (ich/du/er/sie/es/wir/ihr/Sie)',
          'Personal pronouns replace the subject. “Sie” (capital S) is the formal “you”.',
          [
            { de: 'Ich bin neu hier.', en: 'I am new here.' },
            { de: 'Woher kommst du?', en: 'Where are you from?' },
            { de: 'Sprechen Sie Deutsch?', en: 'Do you speak German? (formal)' },
          ],
          {
            keywords: ['pronouns', 'formal', 'Sie'],
            common_errors: ['Mixing up “sie” (she/they) with “Sie” (formal you).'],
          }
        ),
        mk(
          'A0',
          'A quick “mini-dialog” pattern',
          'A0 goal: manage micro-conversations (greetings, name, origin, simple question). Use short sentences and repeat key patterns.',
          [
            { de: 'Hallo! Ich heiße Sam.', en: 'Hello! My name is Sam.' },
            { de: 'Woher kommst du?', en: 'Where are you from?' },
            { de: 'Ich komme aus Kanada.', en: 'I come from Canada.' },
          ],
          {
            keywords: ['communication', 'patterns'],
            notes: ['You can swap words (name/country/city) without changing grammar.'],
          }
        ),
        mk(
          'A0',
          'Negation: nicht vs kein (very basic)',
          'Use “kein” to negate nouns with an indefinite article (ein/eine): “kein Kaffee”. Use “nicht” to negate verbs/adjectives/definite nouns.',
          [
            { de: 'Ich habe keinen Kaffee.', en: 'I have no coffee.' },
            { de: 'Ich komme heute nicht.', en: 'I am not coming today.' },
          ],
          {
            keywords: ['negation', 'nicht', 'kein'],
            notes: ['At A0, focus on meaning. Precise word position can be refined later.'],
          }
        ),
      ],
    },
  ];

  const A1: GrammarSection[] = [
    {
      title: 'Verbs & sentence structure (A1)',
      items: [
        mk(
          'A1',
          'Present tense (Präsens) regular verbs',
          'Conjugate regular verbs with endings: -e, -st, -t, -en, -t, -en. Verb position is still 2 in statements.',
          [
            { de: 'Ich lerne Deutsch.', en: 'I learn German.' },
            { de: 'Du arbeitest heute.', en: 'You work today.' },
          ],
          { keywords: ['präsens', 'conjugation'] }
        ),
        mk(
          'A1',
          'Separable verbs (trennbare Verben)',
          'In main clauses, the prefix goes to the end: “Ich stehe … auf.” In subordinate clauses it stays together.',
          [
            { de: 'Ich stehe um 7 Uhr auf.', en: 'I get up at 7.' },
            { de: 'Ich bleibe zu Hause, weil ich früh aufstehe.', en: 'I stay home because I get up early.' },
          ],
          { keywords: ['verbs', 'separable'] }
        ),
        mk(
          'A1',
          'Modal verbs (können/müssen/wollen/dürfen/sollen/möchten)',
          'Modal verb is in position 2; the other verb goes to the end in infinitive (sentence bracket).',
          [
            { de: 'Ich kann heute nicht kommen.', en: 'I can’t come today.' },
            { de: 'Wir müssen lernen.', en: 'We must study.' },
          ],
          { keywords: ['modal verbs', 'satzklammer'] }
        ),
      ],
    },
    {
      title: 'Articles, cases, and negation (A1)',
      items: [
        mk(
          'A1',
          'Accusative case (Akkusativ) basics',
          'Definite articles in accusative: den (m.), die (f.), das (n.). Indefinite: einen/eine/ein.',
          [
            { de: 'Ich sehe den Mann.', en: 'I see the man.' },
            { de: 'Ich kaufe einen Apfel.', en: 'I buy an apple.' },
          ],
          { keywords: ['akkusativ', 'articles'] }
        ),
        mk(
          'A1',
          'Negation: nicht vs kein',
          'Use “kein” to negate nouns with an indefinite article. Use “nicht” for verbs/adjectives/definite nouns.',
          [
            { de: 'Ich habe kein Auto.', en: 'I have no car.' },
            { de: 'Ich komme heute nicht.', en: 'I am not coming today.' },
          ],
          { keywords: ['negation', 'nicht', 'kein'] }
        ),
      ],
    },
  ];

  const A2: GrammarSection[] = [
    {
      title: 'Past & narration (A2)',
      items: [
        mk(
          'A2',
          'Perfekt with haben/sein',
          'Auxiliary in position 2 + Partizip II at the end. Many movement/state-change verbs use “sein”.',
          [
            { de: 'Ich habe gearbeitet.', en: 'I worked.' },
            { de: 'Wir sind nach Hause gegangen.', en: 'We went home.' },
          ],
          {
            keywords: ['perfekt', 'past'],
            notes: ['In spoken German, Perfekt is often preferred for past events.'],
          }
        ),
        mk(
          'A2',
          'Partizip II: common patterns (quick guide)',
          'Many verbs form Partizip II with ge-…-t (arbeiten → gearbeitet). Many irregular verbs use ge-…-en (gehen → gegangen). Separable verbs: aufstehen → aufgestanden.',
          [
            { de: 'machen → gemacht', en: 'to do → done' },
            { de: 'sehen → gesehen', en: 'to see → seen' },
            { de: 'gehen → gegangen', en: 'to go → gone' },
          ],
          {
            keywords: ['partizip ii', 'verbs'],
            common_errors: ['Forgetting “ge-” when it is required.'],
          }
        ),
        mk(
          'A2',
          'Präteritum of sein/haben (very common)',
          'Even in spoken German, “sein” and “haben” often appear in Präteritum: war / hatte.',
          [
            { de: 'Ich war gestern zu Hause.', en: 'I was at home yesterday.' },
            { de: 'Wir hatten keine Zeit.', en: 'We had no time.' },
          ],
          { keywords: ['präteritum', 'sein', 'haben'] }
        ),
      ],
    },
    {
      title: 'Cases & prepositions (A2)',
      items: [
        mk(
          'A2',
          'Dative case (Dativ) basics',
          'Dative articles: dem/der/dem; plural: den (+n). Common dative verbs: helfen, danken, gefallen.',
          [
            { de: 'Ich helfe dir.', en: 'I help you.' },
            { de: 'Das gefällt mir.', en: 'I like that.' },
          ],
          {
            keywords: ['dativ', 'case'],
            tables: [
              {
                title: 'Dative articles (singular)',
                headers: ['Gender', 'Definite article'],
                rows: [
                  ['Masculine', 'dem'],
                  ['Feminine', 'der'],
                  ['Neuter', 'dem'],
                ],
              },
            ],
          }
        ),
        mk(
          'A2',
          'Two-way prepositions (Wechselpräpositionen)',
          'Use accusative with movement (wohin?) and dative with location (wo?): in, an, auf, unter, über, vor, hinter, neben, zwischen.',
          [
            { de: 'Ich stelle die Tasse auf den Tisch.', en: 'I put the cup on the table.' },
            { de: 'Die Tasse steht auf dem Tisch.', en: 'The cup is on the table.' },
          ],
          {
            keywords: ['prepositions', 'akkusativ', 'dativ'],
            notes: ['Ask: Wo? (location → dative) / Wohin? (direction → accusative).'],
          }
        ),
        mk(
          'A2',
          'Two objects: dative + accusative',
          'Many verbs take two objects. A practical rule: person (dative) + thing (accusative).',
          [
            { de: 'Ich gebe dem Mann den Ball.', en: 'I give the man the ball.' },
            { de: 'Sie erklärt mir die Aufgabe.', en: 'She explains the task to me.' },
          ],
          {
            keywords: ['cases', 'dative', 'accusative'],
            common_errors: ['Mixing up case after pronouns (mir/mich).'],
          }
        ),
      ],
    },
    {
      title: 'Sentence building (A2)',
      items: [
        mk(
          'A2',
          'Subordinate clauses with weil/dass/wenn',
          'In subordinate clauses, the conjugated verb goes to the end.',
          [
            { de: 'Ich bleibe zu Hause, weil ich krank bin.', en: 'I stay at home because I am sick.' },
            { de: 'Ich hoffe, dass du kommst.', en: 'I hope that you come.' },
          ],
          {
            keywords: ['nebensatz', 'weil', 'dass', 'wenn'],
            notes: ['Verb-final is the key change to practice.'],
          }
        ),
        mk(
          'A2',
          'Wenn vs als (time clauses)',
          'Use “wenn” for repeated actions or future; use “als” for one-time events in the past.',
          [
            { de: 'Wenn ich Zeit habe, lerne ich.', en: 'When(ever) I have time, I study.' },
            { de: 'Als ich klein war, wohnte ich in Berlin.', en: 'When I was small, I lived in Berlin.' },
          ],
          { keywords: ['wenn', 'als', 'time clauses'] }
        ),
        mk(
          'A2',
          'weil vs deshalb (reason in two styles)',
          '“weil” introduces a subordinate clause (verb at end). “deshalb” starts a main clause and keeps verb in position 2.',
          [
            { de: 'Ich bin müde, weil ich wenig geschlafen habe.', en: 'I am tired because I slept little.' },
            { de: 'Ich habe wenig geschlafen. Deshalb bin ich müde.', en: "I slept little. That's why I'm tired." },
          ],
          { keywords: ['weil', 'deshalb', 'connectors'] }
        ),
      ],
    },
    {
      title: 'Descriptions & comparisons (A2)',
      items: [
        mk(
          'A2',
          'Comparatives: so … wie / -er als',
          'Equality: “so … wie”. Comparison: adjective + “-er” + “als”.',
          [
            { de: 'Er ist so groß wie ich.', en: 'He is as tall as me.' },
            { de: 'Sie ist älter als er.', en: 'She is older than him.' },
          ],
          {
            keywords: ['comparatives', 'adjectives'],
            common_errors: ['Using “wie” instead of “als” in comparisons: *größer wie* (incorrect).'],
          }
        ),
        mk(
          'A2',
          'Superlative: am …-sten / der/die/das …-ste',
          'Predicative superlative: “am schönsten”. Attributive: “der schönste Tag”.',
          [
            { de: 'Das ist am wichtigsten.', en: 'That is the most important.' },
            { de: 'Das ist der beste Film.', en: 'That is the best movie.' },
          ],
          { keywords: ['superlative', 'adjectives'] }
        ),
        mk(
          'A2',
          'Reflexive verbs (sich) (intro)',
          'Some verbs use a reflexive pronoun: sich freuen, sich waschen. The reflexive pronoun changes with person.',
          [
            { de: 'Ich freue mich.', en: 'I am happy / I look forward.' },
            { de: 'Du wäschst dich.', en: 'You wash yourself.' },
          ],
          {
            keywords: ['reflexive', 'pronouns'],
            notes: ['A2 focus: common everyday reflexive verbs.'],
          }
        ),
      ],
    },
  ];

  const B1: GrammarSection[] = [
    {
      title: 'Complex sentences & style (B1)',
      items: [
        mk(
          'B1',
          'Connectors: obwohl / damit / trotzdem',
          'Use connectors to express contrast, purpose and concession. Subordinate clauses push the verb to the end.',
          [
            { de: 'Ich gehe, obwohl ich müde bin.', en: 'I go although I am tired.' },
            { de: 'Ich lerne, damit ich die Prüfung bestehe.', en: 'I study so that I pass the exam.' },
          ],
          { keywords: ['connectors', 'obwohl', 'damit', 'trotzdem'] }
        ),
        mk(
          'B1',
          'Word order: subordinate clause first',
          'If a subordinate clause comes first, the main clause starts with the verb: “Weil …, komme ich …”.',
          [
            { de: 'Weil ich arbeiten muss, komme ich später.', en: 'Because I have to work, I come later.' },
            { de: 'Obwohl es regnet, gehen wir spazieren.', en: 'Although it is raining, we go for a walk.' },
          ],
          { keywords: ['word order', 'nebensatz'] }
        ),
        mk(
          'B1',
          'Relative clauses (Relativsätze)',
          'Relative clauses describe a noun. Verb goes to the end; pronoun depends on gender and case.',
          [
            { de: 'Das ist der Mann, der hier arbeitet.', en: 'That is the man who works here.' },
            { de: 'Das ist die Frau, die in Berlin wohnt.', en: 'That is the woman who lives in Berlin.' },
          ],
          { keywords: ['relativsatz', 'relative pronouns'] }
        ),
        mk(
          'B1',
          'Relative pronouns in cases (Akk./Dat.)',
          'Relative pronouns take the case of their role inside the relative clause: den (Akk.), dem (Dat.), etc.',
          [
            { de: 'Das ist der Film, den ich mag.', en: 'That is the movie that I like.' },
            { de: 'Das ist der Mann, dem ich helfe.', en: 'That is the man whom I help.' },
          ],
          { keywords: ['relative pronouns', 'cases'] }
        ),
      ],
    },
    {
      title: 'Politeness & hypotheticals (B1)',
      items: [
        mk(
          'B1',
          'Konjunktiv II for politeness (Könnten Sie…?)',
          'Use Konjunktiv II to sound polite and less direct in requests.',
          [
            { de: 'Könnten Sie mir helfen?', en: 'Could you help me?' },
            { de: 'Ich hätte gern einen Termin.', en: 'I would like an appointment.' },
          ],
          { keywords: ['konjunktiv ii', 'politeness'] }
        ),
        mk(
          'B1',
          'Wishes with wäre/hätte',
          'Use “wäre” and “hätte” to express wishes and hypotheticals: “Ich wäre gern …”, “Ich hätte gern …”.',
          [
            { de: 'Ich wäre gern in Deutschland.', en: 'I would like to be in Germany.' },
            { de: 'Ich hätte gern einen Kaffee.', en: 'I would like a coffee.' },
          ],
          { keywords: ['konjunktiv ii', 'wishes'] }
        ),
      ],
    },
    {
      title: 'Structures you meet a lot (B1)',
      items: [
        mk(
          'B1',
          'Passive voice (Passiv) basics',
          'Passive focuses on the action: werden + Partizip II. Optionally add the agent with “von”.',
          [
            { de: 'Das Haus wird gebaut.', en: 'The house is being built.' },
            { de: 'Der Brief wird von Maria geschrieben.', en: 'The letter is written by Maria.' },
          ],
          {
            keywords: ['passive', 'werden'],
            notes: ['B1 focus: Präsens passive. Later you can extend to Präteritum/Perfekt passive.'],
          }
        ),
        mk(
          'B1',
          'Passive tenses (overview)',
          'Präsens: wird + Partizip II. Präteritum: wurde + Partizip II. Perfekt: ist/hat + Partizip II + worden.',
          [
            { de: 'Der Brief wird geschrieben.', en: 'The letter is written.' },
            { de: 'Der Brief wurde geschrieben.', en: 'The letter was written.' },
          ],
          {
            keywords: ['passive', 'tenses'],
            notes: ['Start with Präsens/Präteritum first; Perfekt passive appears more in formal writing.'],
          }
        ),
        mk(
          'B1',
          'Genitive (Genitiv) overview + common patterns',
          'Genitive shows possession/relationship: “das Auto meines Vaters”. It is also used after some prepositions (wegen/trotz/während).',
          [
            { de: 'Das ist das Auto meines Vaters.', en: 'That is my father’s car.' },
            { de: 'Wegen des Wetters bleiben wir zu Hause.', en: 'Because of the weather we stay home.' },
          ],
          {
            keywords: ['genitive', 'prepositions'],
            common_errors: ['Overusing genitive in speech; in everyday German dative is often used, but learn the standard form.'],
          }
        ),
        mk(
          'B1',
          'Adjective endings (quick structured view)',
          'Adjective endings depend on article type (der-words vs ein-words vs no article) and case. A practical approach is to learn common chunks first.',
          [
            { de: 'ein guter Kaffee', en: 'a good coffee' },
            { de: 'der gute Kaffee', en: 'the good coffee' },
            { de: 'mit gutem Kaffee', en: 'with good coffee' },
          ],
          {
            keywords: ['adjective endings', 'declension'],
            notes: ['Start with nominative/accusative chunks; add dative later.'],
            tables: [
              {
                title: 'Mini table (singular, nominative/accusative)',
                headers: ['Case', 'der-words (masc.)', 'ein-words (masc.)'],
                rows: [
                  ['Nominative', 'der gute Mann', 'ein guter Mann'],
                  ['Accusative', 'den guten Mann', 'einen guten Mann'],
                ],
              },
            ],
          }
        ),
      ],
    },
  ];

  return {
    language: 'German',
    version: 'cefr-a0-b1-2',
    sections: {
      a0: A0,
      a1: A1,
      a2: A2,
      b1: B1,
    },
  };
}

async function run() {
  await connectToDatabase(env.MONGODB_URI);

  const slug = 'german';
  const content = buildLibrary();

  await GrammarModel.updateOne(
    { slug },
    {
      $set: {
        slug,
        language: 'German',
        content,
      },
    },
    { upsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`✅ Grammar library upserted: slug=${slug} (sections: A0/A1/A2/B1)`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
