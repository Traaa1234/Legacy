import type { ChapterSlug } from '@/lib/chapters';

export interface StarterPrompt {
  chapter: ChapterSlug;
  order_in_chapter: number;
  question_text: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  // Early Childhood (8)
  { chapter: 'early_childhood', order_in_chapter: 1, question_text: 'What did your childhood bedroom look like?' },
  { chapter: 'early_childhood', order_in_chapter: 2, question_text: 'Who were you closest to as a small child, and what did you do together?' },
  { chapter: 'early_childhood', order_in_chapter: 3, question_text: 'What was your favorite meal at home growing up, and who made it?' },
  { chapter: 'early_childhood', order_in_chapter: 4, question_text: 'Tell me about the neighborhood you grew up in.' },
  { chapter: 'early_childhood', order_in_chapter: 5, question_text: 'What games or toys did you love most before you started school?' },
  { chapter: 'early_childhood', order_in_chapter: 6, question_text: 'What is the earliest memory you can clearly recall?' },
  { chapter: 'early_childhood', order_in_chapter: 7, question_text: 'Did you have any pets? Tell me about one of them.' },
  { chapter: 'early_childhood', order_in_chapter: 8, question_text: 'What sounds or smells from your childhood do you still remember?' },

  // School Years (7)
  { chapter: 'school_years', order_in_chapter: 1, question_text: 'What was your first day of school like?' },
  { chapter: 'school_years', order_in_chapter: 2, question_text: 'Who was your favorite teacher, and why?' },
  { chapter: 'school_years', order_in_chapter: 3, question_text: 'Tell me about a friend you made in school.' },
  { chapter: 'school_years', order_in_chapter: 4, question_text: 'What did you do for fun after school?' },
  { chapter: 'school_years', order_in_chapter: 5, question_text: 'Was there a subject that came easily to you, or one that gave you trouble?' },
  { chapter: 'school_years', order_in_chapter: 6, question_text: 'What did you imagine you would be when you grew up?' },
  { chapter: 'school_years', order_in_chapter: 7, question_text: 'Did you take part in any clubs, sports, or performances?' },

  // Young Adulthood (6)
  { chapter: 'young_adulthood', order_in_chapter: 1, question_text: 'When did you first feel like an adult, and why?' },
  { chapter: 'young_adulthood', order_in_chapter: 2, question_text: 'Tell me about your first job.' },
  { chapter: 'young_adulthood', order_in_chapter: 3, question_text: 'What was the first place you lived on your own?' },
  { chapter: 'young_adulthood', order_in_chapter: 4, question_text: 'Did you travel anywhere meaningful in your twenties? Tell me about it.' },
  { chapter: 'young_adulthood', order_in_chapter: 5, question_text: 'Who shaped the way you saw the world during this time?' },
  { chapter: 'young_adulthood', order_in_chapter: 6, question_text: 'What did you believe deeply at that age that you see differently now?' },

  // Building a Family (6)
  { chapter: 'building_a_family', order_in_chapter: 1, question_text: 'How did you meet your spouse or partner?' },
  { chapter: 'building_a_family', order_in_chapter: 2, question_text: 'Tell me about the day your first child was born.' },
  { chapter: 'building_a_family', order_in_chapter: 3, question_text: 'What was the home you raised your family in like?' },
  { chapter: 'building_a_family', order_in_chapter: 4, question_text: 'What family traditions did you pass along, or start?' },
  { chapter: 'building_a_family', order_in_chapter: 5, question_text: 'Tell me about a holiday or gathering you remember warmly.' },
  { chapter: 'building_a_family', order_in_chapter: 6, question_text: 'What do you hope your children remember about growing up?' },

  // Career & Work (6)
  { chapter: 'career_and_work', order_in_chapter: 1, question_text: 'How did you find your way into the work you ended up doing?' },
  { chapter: 'career_and_work', order_in_chapter: 2, question_text: 'Who was a mentor or coworker who shaped you?' },
  { chapter: 'career_and_work', order_in_chapter: 3, question_text: 'What was a project or accomplishment you are most proud of?' },
  { chapter: 'career_and_work', order_in_chapter: 4, question_text: 'Tell me about a difficult time at work and how you got through it.' },
  { chapter: 'career_and_work', order_in_chapter: 5, question_text: 'What did your typical workday look like during the busiest years?' },
  { chapter: 'career_and_work', order_in_chapter: 6, question_text: 'When you retired or stepped away, how did that feel?' },

  // Reflections & Wisdom (5)
  { chapter: 'reflections_wisdom', order_in_chapter: 1, question_text: 'What is the best advice you have ever received?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 2, question_text: 'Looking back, what are you most grateful for?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 3, question_text: 'What do you wish you had known at 25?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 4, question_text: 'How would you describe what makes a good life, in your own words?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 5, question_text: 'What do you hope future generations of your family hold onto?' },

  // Memorable Stories on Your Mind (6)
  { chapter: 'memorable_stories', order_in_chapter: 1, question_text: 'Tell me a story you love telling — one you have told many times.' },
  { chapter: 'memorable_stories', order_in_chapter: 2, question_text: 'What is the funniest thing that ever happened to you?' },
  { chapter: 'memorable_stories', order_in_chapter: 3, question_text: 'Tell me about a time you took a risk that paid off.' },
  { chapter: 'memorable_stories', order_in_chapter: 4, question_text: 'Tell me about a stranger who changed your day or your life.' },
  { chapter: 'memorable_stories', order_in_chapter: 5, question_text: 'Was there a moment when you knew everything was about to change?' },
  { chapter: 'memorable_stories', order_in_chapter: 6, question_text: 'What is a story you have never told before but want recorded?' },

  // Information, Knowledge & Practical Skills (6)
  { chapter: 'practical_skills', order_in_chapter: 1, question_text: 'What is a recipe you make from memory? Walk me through it.' },
  { chapter: 'practical_skills', order_in_chapter: 2, question_text: 'What is a household repair or fix you taught yourself?' },
  { chapter: 'practical_skills', order_in_chapter: 3, question_text: 'What financial advice would you pass to someone starting out?' },
  { chapter: 'practical_skills', order_in_chapter: 4, question_text: 'What is a skill from your trade that you wish you could teach?' },
  { chapter: 'practical_skills', order_in_chapter: 5, question_text: 'How did you handle a major decision you faced alone?' },
  { chapter: 'practical_skills', order_in_chapter: 6, question_text: 'What is something simple but important that people forget to do?' },
];

// Sanity check at module load — total must be 50
if (STARTER_PROMPTS.length !== 50) {
  throw new Error(
    `STARTER_PROMPTS must have 50 entries; found ${STARTER_PROMPTS.length}`,
  );
}
