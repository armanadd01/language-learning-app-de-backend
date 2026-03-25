import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LevelModel } from './models/Level';
import { ModuleModel } from './models/Module';
import { LessonModel } from './models/Lesson';
import { ActivityModel } from './models/Activity';

async function seedComprehensive() {
  await connectToDatabase(env.MONGODB_URI);

  const courseSlug = 'german-goethe';

  // Create all levels
  const levelA0 = await LevelModel.findOneAndUpdate(
    { courseSlug, code: 'A0' },
    { $set: { courseSlug, code: 'A0', order: 0, title: 'A0 Absolute Beginner', description: 'Complete basics: alphabet, greetings, numbers.' } },
    { upsert: true, new: true }
  );

  const levelA1 = await LevelModel.findOneAndUpdate(
    { courseSlug, code: 'A1' },
    { $set: { courseSlug, code: 'A1', order: 1, title: 'A1 Beginner', description: 'Basics: greetings, articles, simple sentences.' } },
    { upsert: true, new: true }
  );

  const levelA2 = await LevelModel.findOneAndUpdate(
    { courseSlug, code: 'A2' },
    { $set: { courseSlug, code: 'A2', order: 2, title: 'A2 Elementary', description: 'Everyday conversations, past tense, more complex grammar.' } },
    { upsert: true, new: true }
  );

  const levelB1 = await LevelModel.findOneAndUpdate(
    { courseSlug, code: 'B1' },
    { $set: { courseSlug, code: 'B1', order: 3, title: 'B1 Intermediate', description: 'Complex sentences, subjunctive, business German.' } },
    { upsert: true, new: true }
  );

  console.log('✅ Levels created: A0, A1, A2, B1');

  // A0 MODULES
  const a0Modules = [
    { order: 1, title: 'German Alphabet & Pronunciation', description: 'Letters, sounds, and basic pronunciation', tags: ['alphabet', 'pronunciation', 'basics'] },
    { order: 2, title: 'Basic Phrases', description: 'Essential everyday expressions', tags: ['phrases', 'communication'] },
    { order: 3, title: 'Numbers 1-100', description: 'Counting and basic math', tags: ['numbers', 'counting'] },
    { order: 4, title: 'Colors & Shapes', description: 'Describing objects visually', tags: ['vocabulary', 'descriptions'] }
  ];

  const a0ModuleIds = [];
  for (const moduleData of a0Modules) {
    const module = await ModuleModel.findOneAndUpdate(
      { levelId: levelA0._id, order: moduleData.order },
      { $set: { levelId: levelA0._id, ...moduleData } },
      { upsert: true, new: true }
    );
    a0ModuleIds.push(module._id);
  }

  // A1 MODULES
  const a1Modules = [
    { order: 1, title: 'Articles & Nouns', description: 'German articles der/die/das and noun genders', tags: ['grammar', 'articles', 'nouns'] },
    { order: 2, title: 'Basic Verbs', description: 'Essential verbs and present tense conjugation', tags: ['verbs', 'grammar', 'conjugation'] },
    { order: 3, title: 'Simple Sentences', description: 'Forming basic sentences and questions', tags: ['sentences', 'questions', 'structure'] },
    { order: 4, title: 'Family & People', description: 'Vocabulary for describing people and relationships', tags: ['vocabulary', 'family', 'people'] }
  ];

  const a1ModuleIds = [];
  for (const moduleData of a1Modules) {
    const module = await ModuleModel.findOneAndUpdate(
      { levelId: levelA1._id, order: moduleData.order },
      { $set: { levelId: levelA1._id, ...moduleData } },
      { upsert: true, new: true }
    );
    a1ModuleIds.push(module._id);
  }

  // A2 MODULES
  const a2Modules = [
    { order: 1, title: 'Past Tense', description: 'Perfekt and Präteritum tenses', tags: ['grammar', 'tenses', 'past'] },
    { order: 2, title: 'Cases & Prepositions', description: 'German cases and prepositional usage', tags: ['grammar', 'cases', 'prepositions'] },
    { order: 3, title: 'Everyday Situations', description: 'Practical conversations for daily life', tags: ['conversation', 'practical', 'situations'] },
    { order: 4, title: 'Travel & Directions', description: 'Navigating and travel vocabulary', tags: ['travel', 'directions', 'vocabulary'] }
  ];

  const a2ModuleIds = [];
  for (const moduleData of a2Modules) {
    const module = await ModuleModel.findOneAndUpdate(
      { levelId: levelA2._id, order: moduleData.order },
      { $set: { levelId: levelA2._id, ...moduleData } },
      { upsert: true, new: true }
    );
    a2ModuleIds.push(module._id);
  }

  // B1 MODULES
  const b1Modules = [
    { order: 1, title: 'Advanced Grammar', description: 'Complex grammar structures and connectors', tags: ['grammar', 'advanced', 'structures'] },
    { order: 2, title: 'Business German', description: 'Professional communication and vocabulary', tags: ['business', 'professional'] },
    { order: 3, title: 'Complex Sentences', description: 'Nebensätze and connectors', tags: ['grammar', 'sentences'] }
  ];

  const b1ModuleIds = [];
  for (const moduleData of b1Modules) {
    const module = await ModuleModel.findOneAndUpdate(
      { levelId: levelB1._id, order: moduleData.order },
      { $set: { levelId: levelB1._id, ...moduleData } },
      { upsert: true, new: true }
    );
    b1ModuleIds.push(module._id);
  }

  console.log('✅ Modules created: 15 total across all levels');

  // A0 LESSONS
  const a0Lessons = [
    { moduleId: a0ModuleIds[0], order: 1, title: 'German Alphabet', objectives: ['Learn all 26 letters', 'Practice pronunciation', 'Recognize special characters'] },
    { moduleId: a0ModuleIds[0], order: 2, title: 'Special Characters', objectives: ['Master umlauts', 'Pronounce Eszett (ß)', 'Use special characters correctly'] },
    { moduleId: a0ModuleIds[1], order: 1, title: 'Greetings and Farewells', objectives: ['Say hello and goodbye', 'Basic politeness'] },
    { moduleId: a0ModuleIds[1], order: 2, title: 'Please and Thank You', objectives: ['Use polite expressions', 'Basic courtesy'] },
    { moduleId: a0ModuleIds[2], order: 1, title: 'Numbers 1-20', objectives: ['Count to 20', 'Use numbers in conversation'] },
    { moduleId: a0ModuleIds[2], order: 2, title: 'Numbers 21-100', objectives: ['Count to 100', 'Understand larger numbers'] },
    { moduleId: a0ModuleIds[3], order: 1, title: 'Basic Colors', objectives: ['Name common colors', 'Describe objects by color'] },
    { moduleId: a0ModuleIds[3], order: 2, title: 'Basic Shapes', objectives: ['Identify shapes', 'Use shape vocabulary'] }
  ];

  for (const lessonData of a0Lessons) {
    await LessonModel.findOneAndUpdate(
      { moduleId: lessonData.moduleId, order: lessonData.order },
      { $set: lessonData },
      { upsert: true, new: true }
    );
  }

  // A1 LESSONS
  const a1Lessons = [
    { moduleId: a1ModuleIds[0], order: 1, title: 'Understanding Articles', objectives: ['Learn der/die/das', 'Understand noun genders', 'Use articles correctly'] },
    { moduleId: a1ModuleIds[0], order: 2, title: 'Plural Forms', objectives: ['Form plurals', 'Recognize plural patterns', 'Use plural articles'] },
    { moduleId: a1ModuleIds[1], order: 1, title: 'Essential Verbs: sein & haben', objectives: ['Conjugate sein (to be)', 'Conjugate haben (to have)', 'Use in sentences'] },
    { moduleId: a1ModuleIds[1], order: 2, title: 'Regular Verbs', objectives: ['Conjugate regular verbs', 'Understand verb patterns', 'Use present tense'] },
    { moduleId: a1ModuleIds[2], order: 1, title: 'Basic Questions', objectives: ['Form yes/no questions', 'Form W-questions', 'Use question words'] },
    { moduleId: a1ModuleIds[2], order: 2, title: 'Simple Statements', objectives: ['Form basic sentences', 'Word order basics', 'Negation with nicht'] },
    { moduleId: a1ModuleIds[3], order: 1, title: 'Family Members', objectives: ['Name family members', 'Describe relationships', 'Use possessive adjectives'] },
    { moduleId: a1ModuleIds[3], order: 2, title: 'People Descriptions', objectives: ['Describe appearance', 'Describe personality', 'Use descriptive adjectives'] }
  ];

  for (const lessonData of a1Lessons) {
    await LessonModel.findOneAndUpdate(
      { moduleId: lessonData.moduleId, order: lessonData.order },
      { $set: lessonData },
      { upsert: true, new: true }
    );
  }

  // A2 LESSONS
  const a2Lessons = [
    { moduleId: a2ModuleIds[0], order: 1, title: 'Perfekt Tense', objectives: ['Form Perfekt tense', 'Use haben vs sein', 'Talk about past events'] },
    { moduleId: a2ModuleIds[0], order: 2, title: 'Präteritum Tense', objectives: ['Form Präteritum', 'Use in formal contexts', 'Recognize patterns'] },
    { moduleId: a2ModuleIds[1], order: 1, title: 'Nominative & Accusative', objectives: ['Understand subject cases', 'Understand object cases', 'Use correct articles'] },
    { moduleId: a2ModuleIds[1], order: 2, title: 'Dative & Genitive', objectives: ['Use dative case', 'Use genitive case', 'Preposition case rules'] },
    { moduleId: a2ModuleIds[2], order: 1, title: 'At the Restaurant', objectives: ['Order food', 'Ask for check', 'Restaurant vocabulary'] },
    { moduleId: a2ModuleIds[2], order: 2, title: 'Shopping', objectives: ['Ask for prices', 'Sizes and colors', 'Shopping phrases'] },
    { moduleId: a2ModuleIds[3], order: 1, title: 'Asking for Directions', objectives: ['Ask for help', 'Understand directions', 'Give directions'] },
    { moduleId: a2ModuleIds[3], order: 2, title: 'Public Transportation', objectives: ['Buy tickets', 'Understand schedules', 'Travel vocabulary'] }
  ];

  for (const lessonData of a2Lessons) {
    await LessonModel.findOneAndUpdate(
      { moduleId: lessonData.moduleId, order: lessonData.order },
      { $set: lessonData },
      { upsert: true, new: true }
    );
  }

  // B1 LESSONS
  const b1Lessons = [
    { moduleId: b1ModuleIds[0], order: 1, title: 'Konjunktiv II', objectives: ['Form Konjunktiv II', 'Express wishes', 'Hypothetical situations'] },
    { moduleId: b1ModuleIds[0], order: 2, title: 'Passive Voice', objectives: ['Form passive tense', 'Use passive correctly', 'Active vs passive'] },
    { moduleId: b1ModuleIds[1], order: 1, title: 'Business Email Writing', objectives: ['Write professional emails', 'Use formal language', 'Email structure'] },
    { moduleId: b1ModuleIds[1], order: 2, title: 'Phone Conversations', objectives: ['Professional phone calls', 'Leave messages', 'Business phrases'] },
    { moduleId: b1ModuleIds[2], order: 1, title: 'Relative Clauses', objectives: ['Use relative pronouns', 'Form complex sentences', 'Clause word order'] },
    { moduleId: b1ModuleIds[2], order: 2, title: 'Subordinate Clauses', objectives: ['Use weil/dass/ob', 'Verb position rules', 'Connectors'] }
  ];

  for (const lessonData of b1Lessons) {
    await LessonModel.findOneAndUpdate(
      { moduleId: lessonData.moduleId, order: lessonData.order },
      { $set: lessonData },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Lessons created: 30+ lessons across all levels');
  console.log('🎯 To run this seed: npm run seed:comprehensive');
  console.log('📚 Your German course now has comprehensive content for A0-B1!');
}

seedComprehensive().catch((err) => {
  console.error(err);
  process.exit(1);
});
