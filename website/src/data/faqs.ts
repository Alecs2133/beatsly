export interface Faq {
  id: string;
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    id: 'free',
    q: 'Is Beats.ly really free?',
    a: 'Yes! The Free tier gives you 3 download credits per day and full access to the local library manager. You can use it forever at no cost.',
  },
  {
    id: 'credits',
    q: 'What is a "credit"?',
    a: 'Credits are used to download sounds from the cloud. Each sound costs 1 credit. Free users get 3 per day. Ultimate members have unlimited downloads with no credit system.',
  },
  {
    id: 'ai-generator',
    q: 'How does the AI Generator work?',
    a: 'You describe the sound you need (e.g. "heavy 808 bass at 140 BPM") and our AI generates a unique, royalty-free audio sample in seconds.',
  },
  {
    id: 'platforms',
    q: 'What platforms are supported?',
    a: 'Beats.ly is available for Windows 10/11 (x64) and macOS (Apple Silicon). An Intel Mac build is coming soon.',
  },
  {
    id: 'data-safety',
    q: 'Is my data safe?',
    a: 'All your data is stored securely on Supabase with Row Level Security. We never share your data with third parties.',
  },
];

export const findFaq = (id: string): Faq =>
  FAQS.find((f) => f.id === id) ?? FAQS[0];
