import type {
  Canonical,
  Config,
  Span,
} from '@ps154/shared';

export const source = [
  'Severity: HIGH.',
  '37 organisations were potentially exposed.',
  'Reset VPN credentials for all users at affected organisations.',
].join('\n');

export const spans: Span[] =
  source
    .split(/\r?\n/)
    .map((text, index) => ({
      span_id: `span_${index + 1}`,
      text,
      start_offset: 0,
      end_offset: text.length,
    }));

export const canonical: Canonical = {
  title:
    'Phishing campaign against power utilities',

  severity: {
    value: 'high',
    source_refs: ['span_1'],
  },

  entities: [],
  events: [],
  affected_systems: [],
  indicators: [],
  key_facts: [],
  recommendations: [],
};

export const config: Config = {
  audience: 'General public',
  tone: 'formal',
  detail: 'medium',
  language: 'en',
};

export const cleanPost = {
  hook: {
    text:
      '37 organisations were potentially exposed.',
    source_refs: ['span_2'],
    status: 'inference' as const,
  },

  body: [
    {
      text: 'Here is what to do.',
      source_refs: [],
      status: 'framing' as const,
    },
    {
      text:
        'Reset VPN credentials for all affected users.',
      source_refs: ['span_3'],
      status: 'fact' as const,
    },
  ],

  hashtags: ['#CyberSecurity'],
};

export const wrongPost = {
  ...cleanPost,

  hook: {
    text: '42 organisations were exposed.',
    source_refs: ['span_2'],
    status: 'fact' as const,
  },
};