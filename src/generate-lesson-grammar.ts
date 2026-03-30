import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LessonModel } from './models/Lesson';
import { ModuleModel } from './models/Module';
import { LevelModel } from './models/Level';

type GrammarRule = {
  id: string;
  title: string;
  explanation: string;
  examples: Array<{ de: string; en?: string }>;
  tags: string[];
};

function slugifyId(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function mkRule(lessonExternalId: string, title: string, explanation: string, examples: GrammarRule['examples'], tags: string[]): GrammarRule {
  return {
    id: `g_${lessonExternalId}_${slugifyId(title)}`.slice(0, 64),
    title,
    explanation,
    examples,
    tags,
  };
}

function rulesForLesson(levelCode: string, lessonOrder: number): Array<Omit<GrammarRule, 'id'> & { id?: string }> {
  // We map your 6-lesson pattern to a set of standard CEFR-appropriate grammar focuses.
  // lessonOrder: 1 Core language, 2 Grammar1, 3 Grammar2, 4 Input, 5 Output, 6 Review

  const baseTags = [levelCode.toLowerCase(), 'generated'];

  if (levelCode === 'A0') {
    if (lessonOrder === 1) {
      return [
        {
          title: 'Basic sentences: “Das ist …” / “Ich bin …”',
          explanation:
            'Use simple statements to introduce people and objects. Word order is usually Subject–Verb–Object. German verbs take position 2 in statements.',
          examples: [
            { de: 'Das ist Anna.', en: 'This is Anna.' },
            { de: 'Ich bin Amir.', en: 'I am Amir.' },
            { de: 'Das ist ein Buch.', en: 'This is a book.' },
          ],
          tags: [...baseTags, 'word_order', 'sentences'],
        },
        {
          title: 'Verb position (Position 2) in statements',
          explanation:
            'In German statements the conjugated verb is in position 2. You can put time or place on position 1, but the verb stays second.',
          examples: [
            { de: 'Heute lerne ich Deutsch.', en: 'Today I learn German.' },
            { de: 'In Berlin wohne ich.', en: 'In Berlin I live.' },
            { de: 'Am Abend habe ich Zeit.', en: 'In the evening I have time.' },
          ],
          tags: [...baseTags, 'word_order'],
        },
        {
          title: 'Introducing yourself (name, origin, residence)',
          explanation:
            'Useful mini-patterns: “Ich heiße …”, “Ich komme aus …”, “Ich wohne in …”. These patterns support fast A0 communication.',
          examples: [
            { de: 'Ich heiße Lina.', en: 'My name is Lina.' },
            { de: 'Ich komme aus Indien.', en: 'I come from India.' },
            { de: 'Ich wohne in München.', en: 'I live in Munich.' },
          ],
          tags: [...baseTags, 'communication'],
        },
      ];
    }
    if (lessonOrder === 2) {
      return [
        {
          title: 'W-questions: Wer/Was/Wo/Woher/Wohin/Wann',
          explanation:
            'In W-questions the question word is position 1 and the verb stays in position 2: “Wo wohnst du?”',
          examples: [
            { de: 'Wie heißt du?', en: 'What is your name?' },
            { de: 'Wo wohnst du?', en: 'Where do you live?' },
            { de: 'Wann beginnt der Kurs?', en: 'When does the course start?' },
          ],
          tags: [...baseTags, 'questions'],
        },
        {
          title: 'Yes/No questions',
          explanation: 'Yes/No questions start with the verb: “Kommst du aus Berlin?”',
          examples: [
            { de: 'Kommst du aus Berlin?', en: 'Are you from Berlin?' },
            { de: 'Hast du Zeit?', en: 'Do you have time?' },
          ],
          tags: [...baseTags, 'questions'],
        },
        {
          title: 'Answers (ja / nein / doch)',
          explanation:
            'Use “doch” to contradict a negative question or statement. Example: “Kommst du nicht?” – “Doch!”',
          examples: [
            { de: 'Kommst du heute?', en: 'Are you coming today?' },
            { de: 'Ja, ich komme.', en: 'Yes, I am coming.' },
            { de: 'Kommst du heute nicht?', en: 'Are you not coming today?' },
            { de: 'Doch, ich komme!', en: 'Yes (actually), I am coming!' },
          ],
          tags: [...baseTags, 'questions'],
        },
      ];
    }
    if (lessonOrder === 3) {
      return [
        {
          title: 'Numbers & time basics',
          explanation:
            'Numbers are often used with time, prices and phone numbers. Time phrases: “Wie spät ist es?” / “Es ist … Uhr.” / “um … Uhr”.',
          examples: [
            { de: 'Es ist 8 Uhr.', en: 'It is 8 o’clock.' },
            { de: 'Wir treffen uns um 18 Uhr.', en: 'We meet at 18:00.' },
          ],
          tags: [...baseTags, 'numbers', 'time'],
        },
        {
          title: 'Informal time (halb, Viertel, nach, vor)',
          explanation:
            'In everyday German you often say times like: “halb drei” (2:30), “Viertel nach drei” (3:15), “zehn vor vier” (3:50).',
          examples: [
            { de: 'Es ist halb drei.', en: 'It is 2:30.' },
            { de: 'Es ist Viertel nach drei.', en: 'It is 3:15.' },
            { de: 'Es ist zehn vor vier.', en: 'It is 3:50.' },
          ],
          tags: [...baseTags, 'time'],
        },
        {
          title: 'Formal time (24-hour time)',
          explanation:
            'In formal contexts (train, schedules) use 24-hour time: 14:30 = “vierzehn Uhr dreißig”.',
          examples: [
            { de: 'Der Zug kommt um 14 Uhr 30.', en: 'The train arrives at 14:30.' },
            { de: 'Der Termin ist um 9 Uhr 15.', en: 'The appointment is at 9:15.' },
          ],
          tags: [...baseTags, 'time'],
        },
      ];
    }
    if (lessonOrder === 4) {
      return [
        {
          title: 'Word order with time/place',
          explanation:
            'A helpful order in German is: Time – Manner – Place (TMP), especially in simple statements.',
          examples: [
            { de: 'Am Abend lerne ich Deutsch zu Hause.', en: 'In the evening I learn German at home.' },
            { de: 'Heute gehe ich in die Stadt.', en: 'Today I go to the city.' },
          ],
          tags: [...baseTags, 'word_order'],
        },
        {
          title: 'Common question patterns for daily life',
          explanation:
            'Build simple questions for information: “Wo ist …?”, “Wie viel kostet …?”, “Wann …?”. Keep the verb in position 2.',
          examples: [
            { de: 'Wo ist die Toilette?', en: 'Where is the toilet?' },
            { de: 'Wie viel kostet das?', en: 'How much does that cost?' },
            { de: 'Wann beginnt der Film?', en: 'When does the movie start?' },
          ],
          tags: [...baseTags, 'questions'],
        },
        {
          title: 'Negation: nicht vs kein (very basic)',
          explanation:
            'Use “kein” to negate nouns with an indefinite article: “Ich habe kein Auto.” Use “nicht” for verbs/adjectives/definite nouns: “Ich komme nicht.”',
          examples: [
            { de: 'Ich habe kein Auto.', en: 'I have no car.' },
            { de: 'Ich komme nicht.', en: 'I am not coming.' },
            { de: 'Das ist nicht gut.', en: 'That is not good.' },
          ],
          tags: [...baseTags, 'negation'],
        },
      ];
    }
    if (lessonOrder === 5) {
      return [
        {
          title: 'Polite phrases & requests',
          explanation:
            'Use “bitte” and polite patterns for requests. A0-level polite patterns include “Bitte …” and simple “Können Sie …?”.',
          examples: [
            { de: 'Bitte langsam.', en: 'Please (speak) slowly.' },
            { de: 'Können Sie das wiederholen?', en: 'Can you repeat that?' },
          ],
          tags: [...baseTags, 'politeness'],
        },
        {
          title: 'Imperative (basic): Komm! Kommt! Kommen Sie!',
          explanation:
            'Imperative is used for instructions. Informal singular uses the verb stem: “Komm!”. Informal plural: “Kommt!”. Formal: “Kommen Sie!”.',
          examples: [
            { de: 'Komm bitte!', en: 'Come, please!' },
            { de: 'Kommt rein!', en: 'Come in!' },
            { de: 'Kommen Sie bitte hierher.', en: 'Please come here.' },
          ],
          tags: [...baseTags, 'imperative'],
        },
        {
          title: 'Classroom phrases',
          explanation:
            'Core phrases help you manage learning: “Ich verstehe nicht.” “Wie sagt man …?” “Was bedeutet …?”.',
          examples: [
            { de: 'Ich verstehe nicht.', en: "I don't understand." },
            { de: 'Wie sagt man das auf Deutsch?', en: 'How do you say that in German?' },
            { de: 'Was bedeutet das?', en: 'What does that mean?' },
          ],
          tags: [...baseTags, 'communication'],
        },
      ];
    }
    return [
      {
        title: 'Review: core sentence patterns',
        explanation: 'Review basic statements, questions and common classroom phrases.',
        examples: [
          { de: 'Wie heißt du?', en: 'What is your name?' },
          { de: 'Ich bin …', en: 'I am …' },
          { de: 'Kommst du aus …?', en: 'Are you from …?' },
        ],
        tags: [...baseTags, 'review'],
      },
      {
        title: 'Review checklist (A0)',
        explanation:
          'Can you: (1) introduce yourself, (2) ask 3 W-questions, (3) say a time, (4) make a polite request?',
        examples: [
          { de: 'Ich heiße … und ich komme aus …', en: 'My name is … and I come from …' },
          { de: 'Wie spät ist es?', en: 'What time is it?' },
        ],
        tags: [...baseTags, 'review'],
      },
    ];
  }

  if (levelCode === 'A1') {
    if (lessonOrder === 1) {
      return [
        {
          title: 'Präsens (present tense) & verb position',
          explanation:
            'In statements the conjugated verb is in position 2. Conjugate regular verbs with endings: -e, -st, -t, -en, -t, -en.',
          examples: [
            { de: 'Ich lerne Deutsch.', en: 'I learn German.' },
            { de: 'Du wohnst in Berlin.', en: 'You live in Berlin.' },
            { de: 'Wir arbeiten heute.', en: 'We work today.' },
          ],
          tags: [...baseTags, 'present', 'word_order'],
        },
        {
          title: 'Sein & haben (A1 essentials)',
          explanation:
            '“sein” and “haben” are irregular and very frequent. Learn the forms: ich bin / du bist / er ist; ich habe / du hast / er hat.',
          examples: [
            { de: 'Ich bin müde.', en: 'I am tired.' },
            { de: 'Hast du Zeit?', en: 'Do you have time?' },
            { de: 'Wir haben heute Unterricht.', en: 'We have class today.' },
          ],
          tags: [...baseTags, 'verbs'],
        },
        {
          title: 'Negation in A1: nicht / kein',
          explanation:
            'Use “kein” to negate nouns with an indefinite article (ein/eine): “Ich habe keinen Hund.” Use “nicht” for verbs/adjectives/definite nouns.',
          examples: [
            { de: 'Ich habe keinen Bruder.', en: 'I have no brother.' },
            { de: 'Ich komme heute nicht.', en: 'I am not coming today.' },
            { de: 'Das ist nicht teuer.', en: 'That is not expensive.' },
          ],
          tags: [...baseTags, 'negation'],
        },
      ];
    }
    if (lessonOrder === 2) {
      return [
        {
          title: 'W-Fragen & question formation',
          explanation:
            'W-question word first, verb in position 2. Yes/No questions: verb first. Learn question words for everyday contexts.',
          examples: [
            { de: 'Was machst du?', en: 'What are you doing?' },
            { de: 'Wann kommst du?', en: 'When are you coming?' },
            { de: 'Hast du Zeit?', en: 'Do you have time?' },
          ],
          tags: [...baseTags, 'questions'],
        },
        {
          title: 'Word order in statements (Time–Manner–Place)',
          explanation:
            'In A1 it helps to build sentences with TMP: time first, then manner, then place. The verb remains in position 2.',
          examples: [
            { de: 'Am Montag arbeite ich in der Stadt.', en: 'On Monday I work in the city.' },
            { de: 'Heute fahre ich mit dem Bus zur Arbeit.', en: 'Today I go to work by bus.' },
          ],
          tags: [...baseTags, 'word_order'],
        },
        {
          title: 'Polite questions with Sie',
          explanation:
            'In formal situations use “Sie” and the corresponding verb form (3rd person plural): “Wo wohnen Sie?”',
          examples: [
            { de: 'Wie heißen Sie?', en: 'What is your name? (formal)' },
            { de: 'Sprechen Sie Englisch?', en: 'Do you speak English?' },
          ],
          tags: [...baseTags, 'politeness'],
        },
      ];
    }
    if (lessonOrder === 3) {
      return [
        {
          title: 'Articles & basic cases (Akkusativ intro)',
          explanation:
            'Definite articles: der/die/das. In the accusative: den (masc.), die (fem.), das (neut.). Indefinite: einen/eine/ein.',
          examples: [
            { de: 'Ich habe einen Hund.', en: 'I have a dog.' },
            { de: 'Ich sehe den Mann.', en: 'I see the man.' },
            { de: 'Ich kaufe das Brot.', en: 'I buy the bread.' },
          ],
          tags: [...baseTags, 'articles', 'case'],
        },
        {
          title: 'Possessives (mein/dein/sein/ihr/unser/euer)',
          explanation:
            'Possessives behave like “ein-words” and change with gender/case: “mein Vater”, “meine Mutter”, “mein Kind”, “meinen Vater” (Akk.).',
          examples: [
            { de: 'Das ist mein Bruder.', en: 'That is my brother.' },
            { de: 'Ich sehe meine Schwester.', en: 'I see my sister.' },
          ],
          tags: [...baseTags, 'pronouns'],
        },
        {
          title: 'Common accusative prepositions (für/ohne)',
          explanation:
            'Prepositions like “für” and “ohne” take the accusative: “für den Mann”, “ohne meine Tasche”.',
          examples: [
            { de: 'Ich kaufe das für meinen Freund.', en: 'I buy that for my friend.' },
            { de: 'Ich gehe ohne meinen Bruder.', en: 'I go without my brother.' },
          ],
          tags: [...baseTags, 'prepositions', 'case'],
        },
      ];
    }
    if (lessonOrder === 4) {
      return [
        {
          title: 'Separable verbs (trennbare Verben)',
          explanation:
            'In the present tense, the prefix goes to the end: “Ich stehe um 7 Uhr auf.” In subordinate clauses it stays together.',
          examples: [
            { de: 'Ich stehe um 7 Uhr auf.', en: 'I get up at 7.' },
            { de: 'Wir kaufen im Supermarkt ein.', en: 'We shop at the supermarket.' },
          ],
          tags: [...baseTags, 'verbs'],
        },
        {
          title: 'Modal verbs + separable verbs',
          explanation:
            'With modals the separable prefix stays attached to the infinitive at the end: “Ich muss morgen einkaufen.”',
          examples: [
            { de: 'Ich muss morgen einkaufen.', en: 'I have to shop tomorrow.' },
            { de: 'Wir wollen heute aufstehen.', en: 'We want to get up today.' },
          ],
          tags: [...baseTags, 'verbs', 'modal_verbs'],
        },
        {
          title: 'Subordinate clause preview: weil',
          explanation:
            'In clauses with “weil”, the verb goes to the end: “Ich bleibe zu Hause, weil ich krank bin.”',
          examples: [
            { de: 'Ich komme nicht, weil ich arbeite.', en: "I'm not coming because I work." },
          ],
          tags: [...baseTags, 'subordinate_clauses'],
        },
      ];
    }
    if (lessonOrder === 5) {
      return [
        {
          title: 'Modal verbs: können, müssen, wollen, dürfen, sollen, möchten',
          explanation:
            'Modal verb is in position 2; the main verb goes to the end in infinitive: “Ich kann heute kommen.”',
          examples: [
            { de: 'Ich kann heute nicht kommen.', en: 'I can’t come today.' },
            { de: 'Wir müssen lernen.', en: 'We must study.' },
            { de: 'Möchtest du einen Kaffee?', en: 'Would you like a coffee?' },
          ],
          tags: [...baseTags, 'modal_verbs'],
        },
        {
          title: 'Imperative (A1): advice and instructions',
          explanation:
            'Imperatives are common in everyday situations and instructions: “Komm!”, “Kommen Sie bitte!”. Add “bitte” to be polite.',
          examples: [
            { de: 'Nimm bitte Platz.', en: 'Please take a seat.' },
            { de: 'Mach die Tür zu!', en: 'Close the door!' },
            { de: 'Kommen Sie bitte rein.', en: 'Please come in.' },
          ],
          tags: [...baseTags, 'imperative'],
        },
        {
          title: 'Sentence bracket (Satzklammer) – simple',
          explanation:
            'With two verb parts, the conjugated part is position 2 and the other part goes to the end (infinitive/participle/prefix).',
          examples: [
            { de: 'Ich will heute einkaufen.', en: 'I want to shop today.' },
            { de: 'Ich stehe um 7 Uhr auf.', en: 'I get up at 7.' },
          ],
          tags: [...baseTags, 'word_order'],
        },
      ];
    }
    return [
      {
        title: 'Review: Präsens + questions + basic cases',
        explanation: 'Review the core grammar: verb position, question formation, articles and the accusative.',
        examples: [
          { de: 'Was machst du heute?', en: 'What are you doing today?' },
          { de: 'Ich kaufe einen Apfel.', en: 'I buy an apple.' },
        ],
        tags: [...baseTags, 'review'],
      },
      {
        title: 'Review: verbs & sentence bracket',
        explanation: 'Check you can use separable verbs and modal verbs in correct word order.',
        examples: [
          { de: 'Ich muss heute arbeiten.', en: 'I have to work today.' },
          { de: 'Ich kaufe im Supermarkt ein.', en: 'I shop at the supermarket.' },
        ],
        tags: [...baseTags, 'review', 'word_order'],
      },
    ];
  }

  if (levelCode === 'A2') {
    if (lessonOrder === 1) {
      return [
        {
          title: 'Perfekt (present perfect) with haben/sein',
          explanation:
            'Many past actions in spoken German use Perfekt: auxiliary (haben/sein) in position 2 + Partizip II at the end.',
          examples: [
            { de: 'Ich habe gearbeitet.', en: 'I worked / have worked.' },
            { de: 'Wir sind nach Hause gegangen.', en: 'We went home.' },
          ],
          tags: [...baseTags, 'past'],
        },
        {
          title: 'Partizip II patterns (quick guide)',
          explanation:
            'Many verbs form Partizip II with ge-…-t (arbeiten → gearbeitet). Many irregular verbs use ge-…-en (gehen → gegangen). Separable verbs: aufstehen → aufgestanden.',
          examples: [
            { de: 'machen → gemacht', en: 'to do → done' },
            { de: 'gehen → gegangen', en: 'to go → gone' },
            { de: 'aufstehen → aufgestanden', en: 'to get up → gotten up' },
          ],
          tags: [...baseTags, 'past', 'verbs'],
        },
        {
          title: 'Time expressions in the past',
          explanation:
            'Use time words to place actions: gestern, letzte Woche, vor zwei Tagen. They often go early in the sentence.',
          examples: [
            { de: 'Gestern habe ich gelernt.', en: 'Yesterday I studied.' },
            { de: 'Vor zwei Tagen sind wir angekommen.', en: 'We arrived two days ago.' },
          ],
          tags: [...baseTags, 'past', 'word_order'],
        },
      ];
    }
    if (lessonOrder === 2) {
      return [
        {
          title: 'Dativ basics & common dative verbs',
          explanation:
            'Some verbs take dative: helfen, danken, gefallen. Articles in dative: dem/der/dem, plural: den (+n).',
          examples: [
            { de: 'Ich helfe dir.', en: 'I help you.' },
            { de: 'Das gefällt mir.', en: 'I like that.' },
          ],
          tags: [...baseTags, 'case', 'dative'],
        },
        {
          title: 'Dative with “mit” and “bei”',
          explanation:
            'Some common prepositions always take dative: mit, bei, nach, aus, von, zu. Example: “mit dem Bus”, “bei meiner Freundin”.',
          examples: [
            { de: 'Ich fahre mit dem Bus.', en: 'I go by bus.' },
            { de: 'Ich bin bei meiner Freundin.', en: 'I am at my friend’s place.' },
          ],
          tags: [...baseTags, 'prepositions', 'dative'],
        },
        {
          title: 'Two objects: Dativ + Akkusativ',
          explanation:
            'Some verbs take two objects: “Ich gebe dem Mann (Dat.) den Ball (Akk.)”. Usually dative = person, accusative = thing.',
          examples: [
            { de: 'Ich gebe meiner Mutter ein Geschenk.', en: 'I give my mother a gift.' },
            { de: 'Er zeigt dem Kind das Buch.', en: 'He shows the child the book.' },
          ],
          tags: [...baseTags, 'case'],
        },
      ];
    }
    if (lessonOrder === 3) {
      return [
        {
          title: 'Prepositions with accusative/dative',
          explanation:
            'Learn common prepositions: für (Akk.), mit/bei/nach/aus (Dat.). Two-way prepositions depend on movement vs location.',
          examples: [
            { de: 'Ich gehe in die Schule. (movement)', en: 'I go to school.' },
            { de: 'Ich bin in der Schule. (location)', en: 'I am at school.' },
          ],
          tags: [...baseTags, 'prepositions'],
        },
        {
          title: 'Two-way prepositions (Wechselpräpositionen)',
          explanation:
            'Use accusative with movement/direction (wohin?), dative with location (wo?): in, an, auf, unter, über, vor, hinter, neben, zwischen.',
          examples: [
            { de: 'Ich stelle die Flasche auf den Tisch. (Akk.)', en: 'I put the bottle on the table.' },
            { de: 'Die Flasche steht auf dem Tisch. (Dat.)', en: 'The bottle is on the table.' },
          ],
          tags: [...baseTags, 'prepositions', 'case'],
        },
        {
          title: 'Where? Where to?',
          explanation:
            'Practice “Wo?” (location) vs “Wohin?” (direction). This helps choose dative vs accusative with two-way prepositions.',
          examples: [
            { de: 'Wo bist du? – In der Küche.', en: 'Where are you? – In the kitchen.' },
            { de: 'Wohin gehst du? – In die Küche.', en: 'Where are you going? – Into the kitchen.' },
          ],
          tags: [...baseTags, 'questions', 'case'],
        },
      ];
    }
    if (lessonOrder === 4) {
      return [
        {
          title: 'Comparisons: so … wie / -er als',
          explanation:
            'Equality: “so … wie”. Comparison: adjective + “-er” + “als”.',
          examples: [
            { de: 'Er ist so groß wie ich.', en: 'He is as tall as me.' },
            { de: 'Sie ist älter als er.', en: 'She is older than him.' },
          ],
          tags: [...baseTags, 'adjectives'],
        },
        {
          title: 'Superlative (am …-sten / der/die/das …-ste)',
          explanation:
            'Predicative: “am schönsten”. Attributive: “der schönste Tag”, “die beste Idee”.',
          examples: [
            { de: 'Das ist am wichtigsten.', en: 'That is the most important.' },
            { de: 'Heute ist der beste Tag!', en: 'Today is the best day!' },
          ],
          tags: [...baseTags, 'adjectives'],
        },
        {
          title: 'Comparisons with “als” vs “wie”',
          explanation:
            'Use “wie” for equality and “als” for comparison: “so … wie” vs “-er als”.',
          examples: [
            { de: 'Ich bin so schnell wie du.', en: 'I am as fast as you.' },
            { de: 'Ich bin schneller als du.', en: 'I am faster than you.' },
          ],
          tags: [...baseTags, 'comparisons'],
        },
      ];
    }
    if (lessonOrder === 5) {
      return [
        {
          title: 'Subordinate clauses with weil/dass/wenn',
          explanation:
            'In subordinate clauses, the conjugated verb goes to the end: “Ich bleibe zu Hause, weil ich krank bin.”',
          examples: [
            { de: 'Ich lerne Deutsch, weil ich in Deutschland arbeite.', en: 'I learn German because I work in Germany.' },
            { de: 'Ich hoffe, dass du kommst.', en: 'I hope that you come.' },
          ],
          tags: [...baseTags, 'subordinate_clauses'],
        },
        {
          title: 'Wenn vs als (time clauses)',
          explanation:
            'Use “wenn” for repeated actions or future; use “als” for one-time events in the past.',
          examples: [
            { de: 'Wenn ich Zeit habe, lerne ich.', en: 'When(ever) I have time, I study.' },
            { de: 'Als ich klein war, wohnte ich in Berlin.', en: 'When I was small, I lived in Berlin.' },
          ],
          tags: [...baseTags, 'subordinate_clauses', 'time'],
        },
        {
          title: 'Because / therefore: weil / deshalb',
          explanation:
            '“weil” introduces a subordinate clause (verb at end). “deshalb” starts a main clause and keeps verb in position 2.',
          examples: [
            { de: 'Ich bin müde, weil ich wenig geschlafen habe.', en: 'I am tired because I slept little.' },
            { de: 'Ich habe wenig geschlafen. Deshalb bin ich müde.', en: "I slept little. That's why I'm tired." },
          ],
          tags: [...baseTags, 'connectors'],
        },
      ];
    }
    return [
      {
        title: 'Review: past + cases + subordinate clauses',
        explanation: 'Review Perfekt, dative/accusative and basic subordinate clauses.',
        examples: [
          { de: 'Ich habe einen Freund besucht.', en: 'I visited a friend.' },
          { de: 'Ich helfe meiner Mutter.', en: 'I help my mother.' },
        ],
        tags: [...baseTags, 'review'],
      },
      {
        title: 'Review: prepositions & cases',
        explanation:
          'Check: “mit dem” (Dat.), “für den” (Akk.), “in die” (movement), “in der” (location).',
        examples: [
          { de: 'Ich gehe in die Schule.', en: 'I go to school.' },
          { de: 'Ich bin in der Schule.', en: 'I am at school.' },
        ],
        tags: [...baseTags, 'review', 'case'],
      },
    ];
  }

  // B1
  if (lessonOrder === 1) {
    return [
      {
        title: 'Nebensätze & connectors (weil, obwohl, damit)',
        explanation:
          'At B1 you expand sentence structure with connectors. Verb goes to the end in subordinate clauses.',
        examples: [
          { de: 'Ich gehe trotzdem, obwohl ich müde bin.', en: 'I go anyway although I am tired.' },
          { de: 'Ich lerne, damit ich die Prüfung bestehe.', en: 'I study so that I pass the exam.' },
        ],
        tags: [...baseTags, 'subordinate_clauses'],
      },
      {
        title: 'Word order: subordinate clause + main clause',
        explanation:
          'If a subordinate clause comes first, the main clause starts with the verb: “Weil ich arbeiten muss, komme ich später.”',
        examples: [
          { de: 'Weil ich arbeiten muss, komme ich später.', en: 'Because I have to work, I come later.' },
          { de: 'Obwohl es regnet, gehen wir spazieren.', en: 'Although it is raining, we go for a walk.' },
        ],
        tags: [...baseTags, 'word_order'],
      },
      {
        title: 'Connector meanings (quick map)',
        explanation:
          'weil = because, obwohl = although, damit = so that, trotzdem = nevertheless. Learn meaning + clause type.',
        examples: [
          { de: 'Ich lerne, damit ich besser spreche.', en: 'I study so that I speak better.' },
        ],
        tags: [...baseTags, 'connectors'],
      },
    ];
  }
  if (lessonOrder === 2) {
    return [
      {
        title: 'Relativsätze (relative clauses)',
        explanation:
          'Relative pronouns (der/die/das) agree with the noun; the verb goes to the end of the relative clause.',
        examples: [
          { de: 'Das ist der Mann, der hier arbeitet.', en: 'That is the man who works here.' },
          { de: 'Das ist die Frau, die in Berlin wohnt.', en: 'That is the woman who lives in Berlin.' },
        ],
        tags: [...baseTags, 'relative_clauses'],
      },
      {
        title: 'Relative pronouns in cases (Akk./Dat.)',
        explanation:
          'Relative pronouns take case depending on their role in the clause: den (Akk.), dem (Dat.) etc.',
        examples: [
          { de: 'Das ist der Film, den ich mag.', en: 'That is the movie that I like.' },
          { de: 'Das ist der Mann, dem ich helfe.', en: 'That is the man whom I help.' },
        ],
        tags: [...baseTags, 'relative_clauses', 'case'],
      },
      {
        title: 'Prepositions + relative pronouns',
        explanation:
          'With prepositions you keep the preposition and use the correct pronoun: “mit dem”, “für den”, “in der”.',
        examples: [
          { de: 'Das ist die Frau, mit der ich arbeite.', en: 'That is the woman I work with.' },
          { de: 'Das ist der Ort, an dem ich wohne.', en: 'That is the place where I live.' },
        ],
        tags: [...baseTags, 'relative_clauses', 'prepositions'],
      },
    ];
  }
  if (lessonOrder === 3) {
    return [
      {
        title: 'Passive voice (Passiv) basics',
        explanation:
          'Passive focuses on the action: “Das Haus wird gebaut.” Agent can be added with “von”.',
        examples: [
          { de: 'Das Essen wird gekocht.', en: 'The food is being cooked.' },
          { de: 'Der Brief wird von Maria geschrieben.', en: 'The letter is written by Maria.' },
        ],
        tags: [...baseTags, 'passive'],
      },
      {
        title: 'Passive in different tenses (overview)',
        explanation:
          'Präsens: wird + Partizip II. Präteritum: wurde + Partizip II. Perfekt: ist/hat + Partizip II + worden.',
        examples: [
          { de: 'Der Brief wird geschrieben.', en: 'The letter is written.' },
          { de: 'Der Brief wurde geschrieben.', en: 'The letter was written.' },
        ],
        tags: [...baseTags, 'passive', 'tenses'],
      },
      {
        title: 'Passive vs active focus',
        explanation:
          'Active focuses on who does it. Passive focuses on what happens. Use passive for processes and formal style.',
        examples: [
          { de: 'Man baut das Haus. (aktiv)', en: 'They build the house.' },
          { de: 'Das Haus wird gebaut. (passiv)', en: 'The house is being built.' },
        ],
        tags: [...baseTags, 'style'],
      },
    ];
  }
  if (lessonOrder === 4) {
    return [
      {
        title: 'Konjunktiv II for polite requests & wishes',
        explanation:
          'Use Konjunktiv II to be polite: “Könnten Sie …?” and for wishes: “Ich hätte gern …”.',
        examples: [
          { de: 'Könnten Sie mir helfen?', en: 'Could you help me?' },
          { de: 'Ich hätte gern einen Termin.', en: 'I would like an appointment.' },
        ],
        tags: [...baseTags, 'konjunktiv_ii'],
      },
      {
        title: 'Wishes with “wäre” / “hätte”',
        explanation:
          'Use “wäre” and “hätte” for wishes and hypothetical statements: “Ich wäre gern …”, “Ich hätte gern …”.',
        examples: [
          { de: 'Ich wäre gern in Deutschland.', en: 'I would like to be in Germany.' },
          { de: 'Ich hätte gern einen Kaffee.', en: 'I would like a coffee.' },
        ],
        tags: [...baseTags, 'konjunktiv_ii'],
      },
      {
        title: 'Politeness level: direct vs polite',
        explanation:
          'Compare direct requests (“Geben Sie mir …”) with polite Konjunktiv II (“Könnten Sie mir … geben?”).',
        examples: [
          { de: 'Geben Sie mir bitte das Formular.', en: 'Please give me the form.' },
          { de: 'Könnten Sie mir bitte das Formular geben?', en: 'Could you please give me the form?' },
        ],
        tags: [...baseTags, 'politeness'],
      },
    ];
  }
  if (lessonOrder === 5) {
    return [
      {
        title: 'N-declension (weak nouns) + Genitiv intro',
        explanation:
          'Some masculine nouns add -(e)n in all cases except nominative: “der Student – den Studenten”. Genitive often shows possession: “das Auto meines Vaters”.',
        examples: [
          { de: 'Ich sehe den Studenten.', en: 'I see the student.' },
          { de: 'Das ist das Auto meines Vaters.', en: 'That is my father’s car.' },
        ],
        tags: [...baseTags, 'cases'],
      },
      {
        title: 'Genitive prepositions (wegen/trotz/während)',
        explanation:
          'At B1 you often meet genitive prepositions: wegen (because of), trotz (despite), während (during). In everyday speech dative is also common, but learn the standard form.',
        examples: [
          { de: 'Wegen des Wetters bleiben wir zu Hause.', en: 'Because of the weather we stay home.' },
          { de: 'Trotz des Regens gehen wir raus.', en: 'Despite the rain we go out.' },
        ],
        tags: [...baseTags, 'genitive', 'prepositions'],
      },
      {
        title: 'Adjective endings (intro reminder)',
        explanation:
          'Adjective endings depend on article/case: “ein guter Mann”, “den guten Mann”. Focus on patterns rather than memorizing everything at once.',
        examples: [
          { de: 'Das ist ein guter Plan.', en: 'That is a good plan.' },
          { de: 'Ich finde den guten Plan.', en: 'I like the good plan.' },
        ],
        tags: [...baseTags, 'adjectives'],
      },
    ];
  }

  return [
    {
      title: 'Review: complex sentences',
      explanation: 'Review connectors, relative clauses, and polite Konjunktiv II structures.',
      examples: [
        { de: 'Ich bleibe zu Hause, weil ich arbeiten muss.', en: 'I stay home because I have to work.' },
        { de: 'Das ist der Film, den ich empfohlen habe.', en: 'That is the movie that I recommended.' },
      ],
      tags: [...baseTags, 'review'],
    },
    {
      title: 'Review checklist (B1)',
      explanation:
        'Can you: (1) build a subordinate clause, (2) use a relative clause in Akk./Dat., (3) make a polite request with Konjunktiv II?',
      examples: [
        { de: 'Weil ich krank bin, bleibe ich zu Hause.', en: 'Because I am sick, I stay home.' },
        { de: 'Das ist der Mann, dem ich geholfen habe.', en: 'That is the man whom I helped.' },
      ],
      tags: [...baseTags, 'review'],
    },
  ];
}

async function run() {
  await connectToDatabase(env.MONGODB_URI);

  const lessons = await LessonModel.find({}).select('_id externalId moduleId order');

  let patched = 0;
  let skippedNoExternalId = 0;
  let skippedNoLevel = 0;

  for (const lesson of lessons) {
    const externalId = (lesson as any).externalId as string | undefined;
    if (!externalId) {
      skippedNoExternalId += 1;
      continue;
    }

    const module = await ModuleModel.findById((lesson as any).moduleId);
    if (!module) {
      skippedNoLevel += 1;
      continue;
    }

    const level = await LevelModel.findById((module as any).levelId);
    if (!level) {
      skippedNoLevel += 1;
      continue;
    }

    const levelCode = String((level as any).code || '').toUpperCase();
    const order = Number((lesson as any).order || 1);

    const rawRules = rulesForLesson(levelCode, order);
    const rules: GrammarRule[] = rawRules.map((r) => mkRule(externalId, r.title, r.explanation, r.examples, r.tags));

    await LessonModel.updateOne({ _id: lesson._id }, { $set: { grammarRules: rules } });
    patched += 1;
  }

  console.log(`✅ Generated grammarRules for lessons: ${patched}`);
  console.log(`ℹ️  Skipped lessons without externalId: ${skippedNoExternalId}`);
  console.log(`ℹ️  Skipped lessons missing module/level: ${skippedNoLevel}`);
  console.log('🎉 Grammar generation complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
