import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { HttpError } from '../lib/httpErrors';
import { UserModel } from '../models/User';
import { AttemptModel } from '../models/Attempt';
import { WordModel } from '../models/Word';
import { DictionaryCacheModel } from '../models/DictionaryCache';
import { calculateLevelFromXp, getLevelUpPayload } from '../lib/gamification';

const gamesRouter = Router();

type DictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string; synonyms?: string[]; antonyms?: string[] }>;
  }>;
  sourceUrls?: string[];
};

const fallbackWordsWithArticles = [
  { word: 'Apfel', article: 'der', translation: 'apple' },
  { word: 'Hund', article: 'der', translation: 'dog' },
  { word: 'Banane', article: 'die', translation: 'banana' },
  { word: 'Katze', article: 'die', translation: 'cat' },
  { word: 'Brot', article: 'das', translation: 'bread' },
  { word: 'Wasser', article: 'das', translation: 'water' },
];

const WORD_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60;
const wordLookupCache = new Map<string, { expiresAt: number; value: any }>();

async function fetchJsonWithTimeout<T>(url: string, ms: number): Promise<{ ok: boolean; status: number; json: () => Promise<T> }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    return res as any;
  } finally {
    clearTimeout(t);
  }
}

function normalizeWordKey(word: string) {
  return word.trim().toLowerCase();
}

async function getCachedDictionaryWord(word: string) {
  const key = normalizeWordKey(word);
  const existing = await DictionaryCacheModel.findOne({ lang: 'de', normalized: key });
  return existing;
}

async function upsertCachedDictionaryWord(word: string, data: { phonetic: string | null; audioUrl: string | null; meanings: any[]; sourceUrls: string[] }) {
  const key = normalizeWordKey(word);
  await DictionaryCacheModel.updateOne(
    { lang: 'de', normalized: key },
    {
      $set: {
        lang: 'de',
        word,
        normalized: key,
        phonetic: data.phonetic,
        audioUrl: data.audioUrl,
        meanings: data.meanings,
        sourceUrls: data.sourceUrls,
      },
    },
    { upsert: true }
  );
}

async function getWordInfoForGames(word: string) {
  const cachedDb = await getCachedDictionaryWord(word);
  if (cachedDb) {
    return {
      word: cachedDb.word,
      phonetic: cachedDb.phonetic ?? null,
      audioUrl: cachedDb.audioUrl ?? null,
      meanings: (cachedDb.meanings as any[]) ?? [],
    };
  }

  const entries = await fetchGermanDictionaryEntries(word);
  const phonetic = pickPhoneticText(entries);
  const audioUrl = pickAudioUrl(entries);
  const meanings = (entries ?? []).flatMap((e) =>
    (e.meanings ?? []).map((m) => ({
      partOfSpeech: m.partOfSpeech ?? null,
      definitions: (m.definitions ?? [])
        .map((d) => ({
          definition: d.definition ?? null,
          example: d.example ?? null,
        }))
        .filter((d) => d.definition),
    }))
  );
  const sourceUrls = Array.from(new Set((entries ?? []).flatMap((e) => e.sourceUrls ?? [])));

  await upsertCachedDictionaryWord(word, { phonetic, audioUrl, meanings, sourceUrls });

  return { word, phonetic, audioUrl, meanings };
}

async function sampleWordsFromLibrary(count: number): Promise<string[]> {
  const docs = await WordModel.aggregate([{ $match: { lang: 'de' } }, { $sample: { size: count } }, { $project: { _id: 0, word: 1 } }]);
  return docs.map((d: any) => d.word).filter(Boolean);
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function levelUpFromUser(user: any, previousXpTotal: number, xpEarned: number) {
  const prevLevel = Number.isFinite(user?.stats?.level) ? Number(user.stats.level) : calculateLevelFromXp(previousXpTotal);
  const newXpTotal = (Number.isFinite(user?.stats?.xpTotal) ? Number(user.stats.xpTotal) : previousXpTotal) + xpEarned;
  const newLevel = calculateLevelFromXp(newXpTotal);
  user.stats.level = newLevel;
  user.stats.xpTotal = newXpTotal;
  return getLevelUpPayload({ previousXpTotal, newXpTotal, previousLevel: prevLevel, newLevel });
}

async function fetchGermanDictionaryEntries(word: string): Promise<DictionaryEntry[]> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/de/${encodeURIComponent(word)}`;
  let res: any;
  try {
    res = await fetchJsonWithTimeout(url, 3500);
  } catch {
    return [];
  }

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    throw new HttpError(502, `Dictionary provider error (HTTP ${res.status})`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new HttpError(502, 'Invalid dictionary provider response');
  }

  return data as DictionaryEntry[];
}

function pickAudioUrl(entries: DictionaryEntry[]) {
  for (const entry of entries) {
    for (const ph of entry.phonetics ?? []) {
      if (typeof ph?.audio === 'string' && ph.audio.trim().length > 0) return ph.audio;
    }
  }
  return null;
}

function pickPhoneticText(entries: DictionaryEntry[]) {
  for (const entry of entries) {
    if (typeof entry.phonetic === 'string' && entry.phonetic.trim().length > 0) return entry.phonetic;
    for (const ph of entry.phonetics ?? []) {
      if (typeof ph?.text === 'string' && ph.text.trim().length > 0) return ph.text;
    }
  }
  return null;
}

gamesRouter.get('/catalog', requireAuth, async (_req, res, next) => {
  try {
    res.json({
      games: [
        {
          id: 'find-article',
          title: 'Find the Article',
          description: 'Master Der, Die, Das! Assign the correct gender to common German nouns.',
          category: 'Grammar',
          level: 'Beginner',
          xp: 50,
          href: '/games/find-article',
        },
        {
          id: 'sentence-builder',
          title: 'Sentence Builder',
          description: 'Drag and drop words to form grammatically correct German sentences.',
          category: 'Syntax',
          level: 'Intermediate',
          xp: 100,
          href: '/games/sentence-builder',
        },
        {
          id: 'word-meaning',
          title: 'Word Meaning Match',
          description: 'Connect German words with their correct definitions.',
          category: 'Vocabulary',
          level: 'Beginner',
          xp: 75,
          href: '/games/word-meaning',
        },
        {
          id: 'grammar-correction',
          title: 'Grammar Correction',
          description: 'Spot the mistake in German sentences and choose the corrected version.',
          category: 'Grammar',
          level: 'Advanced',
          xp: 120,
          href: '/games/grammar-correction',
        },
        {
          id: 'listening-practice',
          title: 'Listening Practice',
          description: 'Listen to a word and pick the correct spelling.',
          category: 'Listening',
          level: 'Intermediate',
          xp: 150,
          href: '/games/listening-practice',
        },
        {
          id: 'timed-quiz',
          title: 'Timed Quiz',
          description: 'Answer as many questions as you can before time runs out.',
          category: 'Grammar',
          level: 'Intermediate',
          xp: 200,
          href: '/games/timed-quiz',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

const sentenceBank: Array<{ sentence: string; translation: string }> = [
  { sentence: 'Ich lerne Deutsch.', translation: 'I am learning German.' },
  { sentence: 'Heute gehe ich zur Schule.', translation: 'Today I go to school.' },
  { sentence: 'Wir trinken Wasser.', translation: 'We drink water.' },
  { sentence: 'Er hat ein Buch.', translation: 'He has a book.' },
  { sentence: 'Sie ist sehr freundlich.', translation: 'She is very friendly.' },
];

gamesRouter.get('/sentence-builder', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(3).max(10).default(5).parse(req.query.count);
    const selected = shuffle(sentenceBank).slice(0, Math.min(count, sentenceBank.length));

    const items = selected.map((s, idx) => {
      const words = s.sentence.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean);
      return {
        id: idx,
        translation: s.translation,
        shuffled: shuffle(words),
        correct: words,
      };
    });

    res.json({
      game: {
        type: 'sentence_builder',
        title: 'Sentence Builder',
        description: 'Arrange the words to form a correct German sentence.',
        xpPerCorrect: 20,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.post('/sentence-builder/submit', requireAuth, async (req, res, next) => {
  try {
    const { answers } = z
      .object({
        answers: z.array(
          z.object({
            index: z.number().int().min(0),
            arranged: z.array(z.string().min(1)).min(1),
            correct: z.array(z.string().min(1)).min(1),
          })
        ),
      })
      .parse(req.body);

    let correctCount = 0;
    for (const a of answers) {
      const arranged = a.arranged.join(' ').trim();
      const correct = a.correct.join(' ').trim();
      if (arranged.toLowerCase() === correct.toLowerCase()) correctCount += 1;
    }

    const total = answers.length;
    const xpEarned = correctCount * 20;
    const userId = (req as any).user.id;

    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { answers },
      result: { correctCount, total, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;

    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }
      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: { correctCount, total, xpEarned, message: `You earned ${xpEarned} XP!` },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.get('/word-meaning', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(4).max(10).default(6).parse(req.query.count);

    const startedAt = Date.now();
    const timeBudgetMs = 4500;
    const maxLookups = 18;

    const fallbackDefinitionByWord = new Map<string, string>();
    for (const it of fallbackWordsWithArticles) {
      if (it.word && it.translation) fallbackDefinitionByWord.set(it.word, it.translation);
    }

    const infos = [] as Array<{ word: string; definition: string }>;

    // 1) Prefer dictionary cache words first (this grows over time and avoids repeating the tiny fallback list)
    const cached = await DictionaryCacheModel.aggregate([
      {
        $match: {
          lang: 'de',
          'meanings.0.definitions.0.definition': { $exists: true },
        },
      },
      { $sample: { size: Math.max(20, count * 8) } },
      {
        $project: {
          _id: 0,
          word: 1,
          meanings: 1,
        },
      },
    ]);

    for (const doc of cached) {
      if (infos.length >= count) break;
      const w = String(doc?.word ?? '').trim();
      if (!w) continue;
      const def = doc?.meanings?.[0]?.definitions?.[0]?.definition ?? null;
      if (!def) continue;
      if (infos.find((i) => i.word === w)) continue;
      infos.push({ word: w, definition: String(def) });
    }

    // 2) Fill remaining by sampling from your 1.6M Word library and caching dictionary results on-demand
    if (infos.length < count) {
      const words = await sampleWordsFromLibrary(Math.max(50, count * 25)).catch(() => []);
      let lookups = 0;
      for (const w of shuffle(words)) {
        if (infos.length >= count) break;
        if (lookups >= maxLookups) break;
        if (Date.now() - startedAt > timeBudgetMs) break;
        if (!w) continue;
        if (infos.find((i) => i.word === w)) continue;

        try {
          lookups += 1;
          const info = await getWordInfoForGames(w);
          const def = info.meanings?.[0]?.definitions?.[0]?.definition ?? null;
          if (def) {
            infos.push({ word: w, definition: String(def) });
            continue;
          }
        } catch {
          // ignore
        }
      }
    }

    // 3) Last resort fallback definitions (small list)
    if (infos.length < 4) {
      const padded = shuffle(fallbackWordsWithArticles)
        .map((it) => ({ word: it.word, definition: it.translation }))
        .filter((x) => x.word && x.definition);

      for (const p of padded) {
        if (infos.find((i) => i.word === p.word)) continue;
        infos.push(p);
        if (infos.length >= 4) break;
      }
    }

    if (infos.length < 4) throw new HttpError(502, 'Not enough dictionary data to build game');

    const allDefinitions = Array.from(new Set(infos.map((i) => i.definition)));
    const items = infos.slice(0, count).map((i, idx) => {
      const distractors = shuffle(allDefinitions.filter((d) => d !== i.definition)).slice(0, 3);
      const options = shuffle([i.definition, ...distractors]).slice(0, 4);
      return { index: idx, word: i.word, options, correct: i.definition };
    });

    res.json({
      game: {
        type: 'word_meaning',
        title: 'Word Meaning Match',
        description: 'Match each word to the correct definition.',
        xpPerCorrect: 15,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.post('/word-meaning/submit', requireAuth, async (req, res, next) => {
  try {
    const { selections } = z
      .object({ selections: z.array(z.object({ index: z.number().int().min(0), answer: z.string().min(1), correct: z.string().min(1) })) })
      .parse(req.body);

    let correctCount = 0;
    for (const s of selections) if (s.answer === s.correct) correctCount += 1;
    const total = selections.length;
    const xpEarned = correctCount * 15;

    const userId = (req as any).user.id;
    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { selections },
      result: { correctCount, total, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;
    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }
      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: { correctCount, total, xpEarned, message: `You earned ${xpEarned} XP!` },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

const grammarCorrectionBank = [
  {
    wrong: 'Ich bin 20 Jahre alt.',
    correct: 'Ich bin 20 Jahre alt.',
    // Keep a few easy-to-spot errors
  },
  {
    wrong: 'Ich habe ein Katze.',
    correct: 'Ich habe eine Katze.',
  },
  {
    wrong: 'Er gehen nach Hause.',
    correct: 'Er geht nach Hause.',
  },
  {
    wrong: 'Wir ist müde.',
    correct: 'Wir sind müde.',
  },
];

gamesRouter.get('/grammar-correction', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(3).max(10).default(5).parse(req.query.count);
    const selected = shuffle(grammarCorrectionBank).slice(0, Math.min(count, grammarCorrectionBank.length));

    const items = selected.map((s, idx) => {
      const distractor = shuffle(grammarCorrectionBank.filter((x) => x.correct !== s.correct)).find(Boolean)?.correct ?? s.wrong;
      const options = shuffle([s.correct, distractor]);
      return { index: idx, sentence: s.wrong, options, correct: s.correct };
    });

    res.json({
      game: {
        type: 'grammar_correction',
        title: 'Grammar Correction',
        description: 'Pick the corrected sentence.',
        xpPerCorrect: 25,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.post('/grammar-correction/submit', requireAuth, async (req, res, next) => {
  try {
    const { selections } = z
      .object({ selections: z.array(z.object({ index: z.number().int().min(0), answer: z.string().min(1), correct: z.string().min(1) })) })
      .parse(req.body);

    let correctCount = 0;
    for (const s of selections) if (s.answer === s.correct) correctCount += 1;
    const total = selections.length;
    const xpEarned = correctCount * 25;

    const userId = (req as any).user.id;
    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { selections },
      result: { correctCount, total, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;
    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }
      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: { correctCount, total, xpEarned, message: `You earned ${xpEarned} XP!` },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.get('/listening-practice', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(3).max(10).default(5).parse(req.query.count);

    const words = await sampleWordsFromLibrary(Math.max(10, count * 3)).catch(() => []);
    const picked = words.length
      ? shuffle(words).slice(0, count)
      : shuffle(fallbackWordsWithArticles.map((w) => w.word)).slice(0, count);

    const items = [] as any[];
    for (let i = 0; i < picked.length; i += 1) {
      const w = picked[i];
      let info: Awaited<ReturnType<typeof getWordInfoForGames>> | null = null;
      try {
        info = await getWordInfoForGames(w);
      } catch {
        info = { word: w, phonetic: null, audioUrl: null, meanings: [] };
      }
      const distractors = shuffle(picked.filter((x) => x !== w)).slice(0, 3);
      const options = shuffle([w, ...distractors]);
      items.push({ index: i, word: w, audioUrl: info?.audioUrl ?? null, options, correct: w });
    }

    res.json({
      game: {
        type: 'listening_practice',
        title: 'Listening Practice',
        description: 'Listen and choose the correct word.',
        xpPerCorrect: 20,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.post('/listening-practice/submit', requireAuth, async (req, res, next) => {
  try {
    const { selections } = z
      .object({ selections: z.array(z.object({ index: z.number().int().min(0), answer: z.string().min(1), correct: z.string().min(1) })) })
      .parse(req.body);

    let correctCount = 0;
    for (const s of selections) if (s.answer === s.correct) correctCount += 1;
    const total = selections.length;
    const xpEarned = correctCount * 20;

    const userId = (req as any).user.id;
    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { selections },
      result: { correctCount, total, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;
    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }
      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: { correctCount, total, xpEarned, message: `You earned ${xpEarned} XP!` },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.get('/timed-quiz', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(5).max(20).default(10).parse(req.query.count);
    const bank = shuffle(fallbackWordsWithArticles).slice(0, Math.min(count, fallbackWordsWithArticles.length));
    const items = bank.map((it, idx) => ({
      index: idx,
      prompt: `Choose the article for “${it.word}”`,
      options: ['der', 'die', 'das'],
      correct: it.article,
    }));

    res.json({
      game: {
        type: 'timed_quiz',
        title: 'Timed Quiz',
        description: 'Quick-fire questions. Answer fast!',
        xpPerCorrect: 10,
        timeLimitSec: 60,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

gamesRouter.post('/timed-quiz/submit', requireAuth, async (req, res, next) => {
  try {
    const { selections } = z
      .object({ selections: z.array(z.object({ index: z.number().int().min(0), answer: z.string().min(1), correct: z.string().min(1) })) })
      .parse(req.body);

    let correctCount = 0;
    for (const s of selections) if (s.answer === s.correct) correctCount += 1;
    const total = selections.length;
    const xpEarned = correctCount * 10;

    const userId = (req as any).user.id;
    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { selections },
      result: { correctCount, total, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;
    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }
      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: { correctCount, total, xpEarned, message: `You earned ${xpEarned} XP!` },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// German words with their articles (seed data for the game)
const germanWordsWithArticles = [
  // Common nouns - der (masculine)
  { word: 'Apfel', article: 'der', translation: 'apple' },
  { word: 'Hund', article: 'der', translation: 'dog' },
  { word: 'Tisch', article: 'der', translation: 'table' },
  { word: 'Stuhl', article: 'der', translation: 'chair' },
  { word: 'Ball', article: 'der', translation: 'ball' },
  { word: 'Baum', article: 'der', translation: 'tree' },
  { word: 'Auto', article: 'der', translation: 'car' },
  { word: 'Computer', article: 'der', translation: 'computer' },
  { word: 'Löffel', article: 'der', translation: 'spoon' },
  { word: 'Kuchen', article: 'der', translation: 'cake' },
  { word: 'Fisch', article: 'der', translation: 'fish' },
  { word: 'Vogel', article: 'der', translation: 'bird' },
  { word: 'Berg', article: 'der', translation: 'mountain' },
  { word: 'Fluss', article: 'der', translation: 'river' },
  { word: 'See', article: 'der', translation: 'lake' },
  
  // Common nouns - die (feminine)
  { word: 'Banane', article: 'die', translation: 'banana' },
  { word: 'Katze', article: 'die', translation: 'cat' },
  { word: 'Tür', article: 'die', translation: 'door' },
  { word: 'Blume', article: 'die', translation: 'flower' },
  { word: 'Hand', article: 'die', translation: 'hand' },
  { word: 'Nase', article: 'die', translation: 'nose' },
  { word: 'Lampe', article: 'die', translation: 'lamp' },
  { word: 'Flasche', article: 'die', translation: 'bottle' },
  { word: 'Tasse', article: 'die', translation: 'cup' },
  { word: 'Uhr', article: 'die', translation: 'clock' },
  { word: 'Karte', article: 'die', translation: 'card' },
  { word: 'Musik', article: 'die', translation: 'music' },
  { word: 'Sonne', article: 'die', translation: 'sun' },
  { word: 'Nacht', article: 'die', translation: 'night' },
  { word: 'Zeitung', article: 'die', translation: 'newspaper' },
  
  // Common nouns - das (neuter)
  { word: 'Brot', article: 'das', translation: 'bread' },
  { word: 'Wasser', article: 'das', translation: 'water' },
  { word: 'Buch', article: 'das', translation: 'book' },
  { word: 'Kind', article: 'das', translation: 'child' },
  { word: 'Haus', article: 'das', translation: 'house' },
  { word: 'Fenster', article: 'das', translation: 'window' },
  { word: 'Mädchen', article: 'das', translation: 'girl' },
  { word: 'Messer', article: 'das', translation: 'knife' },
  { word: 'Schiff', article: 'das', translation: 'ship' },
  { word: 'Pferd', article: 'das', translation: 'horse' },
  { word: 'Schwein', article: 'das', translation: 'pig' },
  { word: 'Bein', article: 'das', translation: 'leg' },
  { word: 'Ohr', article: 'das', translation: 'ear' },
  { word: 'Auge', article: 'das', translation: 'eye' },
  { word: 'Herz', article: 'das', translation: 'heart' }
];

// Get a random set of words for the game
gamesRouter.get('/find-article', requireAuth, async (req, res, next) => {
  try {
    const count = z.number().int().min(5).max(20).default(10).parse(
      req.query.count ? parseInt(req.query.count as string) : 10
    );

    // Shuffle and select random words
    const shuffled = [...germanWordsWithArticles].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, count);

    // Format for frontend
    const gameData = selectedWords.map(item => ({
      word: item.word,
      translation: item.translation,
      options: ['der', 'die', 'das'],
      correct: item.article
    }));

    res.json({
      game: {
        type: 'find_article',
        title: 'Find the Article',
        description: 'Choose the correct German article (der/die/das) for each word',
        xpPerCorrect: 15,
        items: gameData
      }
    });
  } catch (err) {
    next(err);
  }
});

// Submit game results
gamesRouter.post('/find-article/submit', requireAuth, async (req, res, next) => {
  try {
    const { selections } = z.object({ 
      selections: z.array(z.object({ 
        index: z.number(), 
        answer: z.string().min(1).max(3),
        correct: z.string().min(1).max(3)
      }))
    }).parse(req.body);

    // Check each answer against the provided correct answer
    let correctCount = 0;
    selections.forEach((selection) => {
      if (selection.answer === selection.correct) {
        correctCount++;
      }
    });
    
    const totalItems = selections.length;
    const xpEarned = correctCount * 15; // 15 XP per correct answer
    
    let message = '';
    const percentage = (correctCount / totalItems) * 100;
    
    if (percentage === 100) {
      message = '🏆 Perfect! All answers correct!';
    } else if (percentage >= 80) {
      message = '🎉 Excellent work!';
    } else if (percentage >= 60) {
      message = '👍 Good job! Keep practicing!';
    } else {
      message = '💪 Keep practicing! You\'ll get better!';
    }

    const userId = (req as any).user.id;

    await AttemptModel.create({
      userId,
      activityId: null,
      answers: { selections },
      result: { correctCount, total: totalItems, xpEarned },
    } as any);

    const user = await UserModel.findById(userId);
    const previousXpTotal = user?.stats?.xpTotal ?? 0;
    let levelUp = null;
    if (user) {
      levelUp = levelUpFromUser(user, previousXpTotal, xpEarned);

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }

      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: {
        correctCount,
        total: totalItems,
        xpEarned,
        message: `${message} You earned ${xpEarned} XP!`,
      },
      ...(user ? { stats: user.stats } : {}),
      ...(levelUp ? { levelUp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// Get German word info from dictionary API (for future use)
gamesRouter.get('/word/:word', requireAuth, async (req, res, next) => {
  try {
    const { word } = z.object({ word: z.string().min(1) }).parse(req.params);

    const key = normalizeWordKey(word);
    const cached = wordLookupCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.value);
      return;
    }

    const local = germanWordsWithArticles.find((item) => item.word.toLowerCase() === key) ?? null;

    let entries: DictionaryEntry[] | null = null;
    try {
      entries = await fetchGermanDictionaryEntries(word);
    } catch (err) {
      if (err instanceof HttpError && err.status === 404 && !local) throw err;
      entries = null;
    }

    if (!entries && !local) {
      throw new HttpError(404, 'Word not found');
    }

    const response = {
      word: local?.word ?? entries?.[0]?.word ?? word,
      ...(local ? { article: local.article, translation: local.translation } : {}),
      ...(entries
        ? {
            phonetic: pickPhoneticText(entries),
            audioUrl: pickAudioUrl(entries),
            meanings: (entries ?? []).flatMap((e) =>
              (e.meanings ?? []).map((m) => ({
                partOfSpeech: m.partOfSpeech ?? null,
                definitions: (m.definitions ?? [])
                  .map((d) => ({
                    definition: d.definition ?? null,
                    example: d.example ?? null,
                  }))
                  .filter((d) => d.definition),
              }))
            ),
            sourceUrls: Array.from(new Set((entries ?? []).flatMap((e) => e.sourceUrls ?? []))),
          }
        : {
            phonetic: null,
            audioUrl: null,
            meanings: [],
            sourceUrls: [],
          }),
    };

    wordLookupCache.set(key, { expiresAt: Date.now() + WORD_LOOKUP_CACHE_TTL_MS, value: response });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default gamesRouter;
