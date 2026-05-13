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

  // === ADDITIONAL PROMPTS (added 2026-05-13 for bank expansion) ===

  // Early Childhood — adds 4 (was 8)
  { chapter: 'early_childhood', order_in_chapter: 9,  question_text: 'What was your favorite hiding spot as a child, and what did you do there?' },
  { chapter: 'early_childhood', order_in_chapter: 10, question_text: 'Was there a holiday or birthday that stands out from when you were little?' },
  { chapter: 'early_childhood', order_in_chapter: 11, question_text: 'What did Sunday afternoons feel like at your house?' },
  { chapter: 'early_childhood', order_in_chapter: 12, question_text: 'Who in your extended family did you look up to, and why?' },

  // School Years — adds 4 (was 7)
  { chapter: 'school_years', order_in_chapter: 8,  question_text: 'What was the most embarrassing thing that ever happened to you at school?' },
  { chapter: 'school_years', order_in_chapter: 9,  question_text: 'Tell me about a teacher who saw something in you that you didn\'t see in yourself.' },
  { chapter: 'school_years', order_in_chapter: 10, question_text: 'What book or movie from your school years stayed with you?' },
  { chapter: 'school_years', order_in_chapter: 11, question_text: 'Was there a time you got in trouble that you can laugh about now?' },

  // Young Adulthood — adds 4 (was 6)
  { chapter: 'young_adulthood', order_in_chapter: 7,  question_text: 'Tell me about the first really big purchase you ever made.' },
  { chapter: 'young_adulthood', order_in_chapter: 8,  question_text: 'Who broke your heart, or whose heart did you break? What did you learn?' },
  { chapter: 'young_adulthood', order_in_chapter: 9,  question_text: 'What music shaped you in those years?' },
  { chapter: 'young_adulthood', order_in_chapter: 10, question_text: 'Was there a turning point when you started to see your parents as people?' },

  // Building a Family — adds 4 (was 6)
  { chapter: 'building_a_family', order_in_chapter: 7,  question_text: 'What was the hardest decision you and your partner made together?' },
  { chapter: 'building_a_family', order_in_chapter: 8,  question_text: 'Tell me about a time your family pulled together during something difficult.' },
  { chapter: 'building_a_family', order_in_chapter: 9,  question_text: 'What did your home smell like on an ordinary weekday?' },
  { chapter: 'building_a_family', order_in_chapter: 10, question_text: 'Was there a piece of advice your parents gave you that you passed on?' },

  // Career & Work — adds 4 (was 6)
  { chapter: 'career_and_work', order_in_chapter: 7,  question_text: 'Tell me about a customer, client, or colleague you still think about.' },
  { chapter: 'career_and_work', order_in_chapter: 8,  question_text: 'What did you learn about yourself in your first leadership role?' },
  { chapter: 'career_and_work', order_in_chapter: 9,  question_text: 'Was there a job you took for the wrong reasons that turned out right?' },
  { chapter: 'career_and_work', order_in_chapter: 10, question_text: 'Tell me about a time you had to start over professionally.' },

  // Reflections & Wisdom — adds 4 (was 5)
  { chapter: 'reflections_wisdom', order_in_chapter: 6,  question_text: 'What habit took you the longest to break, and how did you finally do it?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 7,  question_text: 'When have you felt the most yourself?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 8,  question_text: 'What is one thing you forgive yourself for, looking back?' },
  { chapter: 'reflections_wisdom', order_in_chapter: 9,  question_text: 'How has your idea of success changed over your lifetime?' },

  // Memorable Stories on Your Mind — adds 4 (was 6)
  { chapter: 'memorable_stories', order_in_chapter: 7,  question_text: 'Tell me about a small kindness that meant the world to you.' },
  { chapter: 'memorable_stories', order_in_chapter: 8,  question_text: 'What is a coincidence that still feels meaningful?' },
  { chapter: 'memorable_stories', order_in_chapter: 9,  question_text: 'Tell me about a place that felt like it belonged to you.' },
  { chapter: 'memorable_stories', order_in_chapter: 10, question_text: 'Was there a conversation that changed how you saw someone?' },

  // Information, Knowledge & Practical Skills — adds 4 (was 6)
  { chapter: 'practical_skills', order_in_chapter: 7,  question_text: 'What is something you know how to do that almost no one else in your family does?' },
  { chapter: 'practical_skills', order_in_chapter: 8,  question_text: 'Tell me your best tip for dealing with a difficult person.' },
  { chapter: 'practical_skills', order_in_chapter: 9,  question_text: 'What rule of thumb has saved you the most over the years?' },
  { chapter: 'practical_skills', order_in_chapter: 10, question_text: 'What is one thing you wish schools had taught you?' },
];

// Sanity check at module load — total must be at least 50
if (STARTER_PROMPTS.length < 50) {
  throw new Error(
    `STARTER_PROMPTS should have at least 50 entries; found ${STARTER_PROMPTS.length}`,
  );
}
