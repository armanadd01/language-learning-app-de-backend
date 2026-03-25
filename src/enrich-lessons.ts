import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LessonModel, LessonContentBlock } from './models/Lesson';
import { WordModel } from './models/Word';

type LessonTemplate = {
  objectives?: string[];
  blocks: LessonContentBlock[];
};

const templates: Record<string, LessonTemplate> = {
  'German Alphabet': {
    blocks: [
      { type: 'text', text: 'German uses the same 26 letters as English, plus ä, ö, ü and ß. Focus on clear vowel sounds and consonants like ch.' },
      { type: 'tip', text: 'Tip: A, E, I, O, U are usually pure vowels in German. Practice slowly and keep the sound steady.' },
      { type: 'example', de: 'A wie Anton', en: 'A like in Anton' },
      { type: 'example', de: 'B wie Berta', en: 'B like in Berta' },
      { type: 'example', de: 'C wie Cäsar', en: 'C like in Caesar' },
      { type: 'example', de: 'D wie Dora', en: 'D like in Dora' },
    ],
  },
  'Special Characters': {
    blocks: [
      { type: 'text', text: 'German has special characters: ä, ö, ü (umlauts) and ß (Eszett). They change pronunciation and sometimes meaning.' },
      { type: 'tip', text: 'Rule: ä/ö/ü are pronounced with rounded lips. ß is pronounced like a sharp “s” (ss).' },
      { type: 'example', de: 'Äpfel', en: 'apples' },
      { type: 'example', de: 'Öl', en: 'oil' },
      { type: 'example', de: 'über', en: 'over / above' },
      { type: 'example', de: 'Straße', en: 'street' },
    ],
  },
  'Understanding Articles': {
    blocks: [
      { type: 'text', text: 'German nouns have grammatical gender: masculine (der), feminine (die), neuter (das). Articles must match the noun.' },
      { type: 'tip', text: 'Rule: Learn nouns together with their article (e.g., der Tisch). There is no 100% rule, but patterns help.' },
      { type: 'example', de: 'der Tisch', en: 'the table' },
      { type: 'example', de: 'die Lampe', en: 'the lamp' },
      { type: 'example', de: 'das Buch', en: 'the book' },
      { type: 'example', de: 'Das ist ein Tisch.', en: 'That is a table.' },
    ],
  },
  'Plural Forms': {
    blocks: [
      { type: 'text', text: 'German plurals can change the ending and sometimes the vowel (Umlaut). You must learn plural forms with nouns.' },
      { type: 'tip', text: 'Plural patterns: -e, -er, -n/-en, -s, or no ending. Often the article becomes “die” in plural.' },
      { type: 'example', de: 'der Apfel → die Äpfel', en: 'the apple → the apples' },
      { type: 'example', de: 'die Lampe → die Lampen', en: 'the lamp → the lamps' },
      { type: 'example', de: 'das Buch → die Bücher', en: 'the book → the books' },
      { type: 'example', de: 'der Computer → die Computer', en: 'the computer → the computers' },
    ],
  },
  'Essential Verbs: sein & haben': {
    blocks: [
      { type: 'text', text: '“sein” (to be) and “haben” (to have) are the most important verbs. They are irregular and used constantly.' },
      { type: 'tip', text: 'ich: bin | habe\ndu: bist | hast\ner/sie/es: ist | hat\nwir: sind | haben\nihr: seid | habt\nsie/Sie: sind | haben' },
      { type: 'example', de: 'Ich bin müde.', en: 'I am tired.' },
      { type: 'example', de: 'Du bist hier.', en: 'You are here.' },
      { type: 'example', de: 'Wir haben Zeit.', en: 'We have time.' },
      { type: 'example', de: 'Sie hat ein Buch.', en: 'She has a book.' },
    ],
  },
  'Regular Verbs': {
    blocks: [
      { type: 'text', text: 'Regular verbs in German follow consistent endings in the present tense. Start with the infinitive (machen, lernen, spielen).' },
      { type: 'tip', text: 'Endings: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en' },
      { type: 'example', de: 'Ich lerne Deutsch.', en: 'I learn German.' },
      { type: 'example', de: 'Du spielst Fußball.', en: 'You play soccer.' },
      { type: 'example', de: 'Er macht Hausaufgaben.', en: 'He does homework.' },
      { type: 'example', de: 'Wir arbeiten heute.', en: 'We work today.' },
    ],
  },
  'Basic Questions': {
    blocks: [
      { type: 'text', text: 'You can form yes/no questions by putting the verb first. W-questions use question words like wer/was/wo/wann/warum.' },
      { type: 'tip', text: 'Yes/No: Verb + Subject + … (Kommst du?)\nW-question: W-word + Verb + Subject + … (Wo wohnst du?)' },
      { type: 'example', de: 'Kommst du aus Deutschland?', en: 'Are you from Germany?' },
      { type: 'example', de: 'Wo wohnst du?', en: 'Where do you live?' },
      { type: 'example', de: 'Was machst du?', en: 'What are you doing?' },
      { type: 'example', de: 'Warum lernst du Deutsch?', en: 'Why are you learning German?' },
    ],
  },
  'Simple Statements': {
    blocks: [
      { type: 'text', text: 'Basic statements usually follow Subject + Verb + Object. Time/manner/place can move, but the verb stays in position 2.' },
      { type: 'tip', text: 'Rule: In main clauses, the conjugated verb is in position 2.' },
      { type: 'example', de: 'Ich lerne Deutsch.', en: 'I learn German.' },
      { type: 'example', de: 'Heute lerne ich Deutsch.', en: 'Today I learn German.' },
      { type: 'example', de: 'Ich komme aus Indien.', en: 'I come from India.' },
      { type: 'example', de: 'Ich spreche nicht Englisch.', en: 'I do not speak English.' },
    ],
  },
};

async function sampleWords(count: number) {
  const docs = await WordModel.aggregate([{ $sample: { size: count } }, { $project: { _id: 0, word: 1 } }]);
  return docs.map((d: any) => d.word).filter(Boolean) as string[];
}

function fallbackBlocks(title: string, words: string[]): LessonContentBlock[] {
  const picked = words.slice(0, 6);
  return [
    { type: 'text', text: `Lesson: ${title}. Study the key points and practice with the vocabulary below.` },
    { type: 'tip', text: 'Tip: Repeat each example out loud, then create 2 new sentences using the same pattern.' },
    ...picked.map((w) => ({ type: 'example', de: w } as LessonContentBlock)),
  ];
}

async function main() {
  await connectToDatabase(env.MONGODB_URI);

  const lessons = await LessonModel.find({}).sort({ updatedAt: -1 });
  const hasWords = (await WordModel.estimatedDocumentCount()) > 0;

  for (const lesson of lessons) {
    const title = lesson.title;
    const currentBlocks = (lesson.contentBlocks ?? []) as LessonContentBlock[];
    const isEmpty = !currentBlocks.length;

    const t = templates[title];

    if (!t && !isEmpty) continue;

    let blocks: LessonContentBlock[];
    if (t) {
      blocks = t.blocks;
    } else {
      const words = hasWords ? await sampleWords(8) : [];
      blocks = fallbackBlocks(title, words);
    }

    const objectives = t?.objectives ?? lesson.objectives;

    await LessonModel.updateOne(
      { _id: lesson._id },
      {
        $set: {
          objectives,
          contentBlocks: blocks,
        },
      }
    );

    // eslint-disable-next-line no-console
    console.log(`Updated lesson: ${title}`);
  }

  // eslint-disable-next-line no-console
  console.log('Done enriching lessons');
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
