import { describe, expect, it } from 'vitest';

import type {
  LLMRequest,
  LLMResponse,
} from '../src/adapters';

import { runFormat } from '../src/generate';

import type {
  Canonical,
  Span,
} from '@ps154/shared';

type FakeRouter = {
  calls: number;
  requests: LLMRequest[];
  call: (
    request: LLMRequest
  ) => Promise<LLMResponse>;
};

const canonical: Canonical = {
  title:
    'Credential-phishing campaign against power distribution utilities',

  severity: {
    value: 'high',
    source_refs: ['span_1'],
  },

  entities: [],

  events: [
    {
      summary:
        'Sensors recorded indicators consistent with a possible phishing campaign.',
      when: '14 to 17 September 2026',
      source_refs: ['span_1'],
    },
  ],

  affected_systems: [],

  indicators: [],

  key_facts: [
    {
      text:
        'Sensors at 37 organisations recorded indicators consistent with a possible phishing campaign.',
      status: 'inference',
      source_refs: ['span_1'],
    },
    {
      text:
        'The remaining organisations were potentially exposed but show no evidence of successful access.',
      status: 'fact',
      source_refs: ['span_2'],
    },
  ],

  recommendations: [
    {
      text:
        'Reset VPN credentials for all affected users.',
      source_refs: ['span_3'],
    },
  ],
};

const spans: Span[] = [
  {
    span_id: 'span_1',
    text:
      'Between 14 and 17 September 2026, sensors at 37 organisations in the power distribution sector recorded indicators consistent with a possible phishing campaign.',
    start_offset: 0,
    end_offset: 150,
  },

  {
    span_id: 'span_2',
    text:
      'The remaining organisations were potentially exposed but show no evidence of successful access.',
    start_offset: 151,
    end_offset: 240,
  },

  {
    span_id: 'span_3',
    text:
      'Reset VPN credentials for all users at affected organisations.',
    start_offset: 241,
    end_offset: 310,
  },
];

const config = {
  audience:
    'senior government officials',

  tone: 'formal' as const,

  detail: 'medium' as const,

  language: 'en' as const,
};

function createFakeRouter(
  mode: 'clean' | 'revision'
): FakeRouter {
  return {
    calls: 0,

    requests: [],

    async call(
      request: LLMRequest
    ) {
      this.calls++;

      this.requests.push(request);

      /*
       * --------------------------------------------------
       * AC-17 HARD LIMIT
       * --------------------------------------------------
       *
       * The pipeline is allowed:
       *
       *   Call 1 → initial generation
       *   Call 2 → one targeted revision
       *
       * Any third generation call is a test failure.
       */
      if (this.calls > 2) {
        throw new Error(
          'AC-17 FAILED: third generation call attempted'
        );
      }

      /*
       * --------------------------------------------------
       * FIRST GENERATION
       * --------------------------------------------------
       */
      if (this.calls === 1) {
        /*
         * ----------------------------------------------
         * CLEAN CASE
         *
         * First draft is already valid and grounded.
         * Expected calls = 1.
         * ----------------------------------------------
         */
        if (mode === 'clean') {
          return {
            text: JSON.stringify({
              hook: {
                text:
                  '37 organisations recorded indicators consistent with a possible phishing campaign.',

                source_refs: [
                  'span_1',
                ],

                status:
                  'inference',
              },

              body: [
                {
                  text:
                    'Reset VPN credentials for all affected users.',

                  source_refs: [
                    'span_3',
                  ],

                  status:
                    'fact',
                },

                {
                  text:
                    'The remaining organisations were potentially exposed.',

                  source_refs: [
                    'span_2',
                  ],

                  status:
                    'inference',
                },
              ],

              hashtags: [
                '#CyberSecurity',
              ],
            }),

            provider: 'cloud',

            model: 'fake-model',

            latency_ms: 1,
          };
        }

        /*
         * ----------------------------------------------
         * REVISION CASE
         *
         * Deliberately corrupt 37 → 42.
         *
         * The cited span still contains 37, so the
         * identifier verifier must detect the mismatch.
         *
         * Expected:
         *
         *   Call 1 → bad draft
         *   Call 2 → targeted revision
         * ----------------------------------------------
         */
        return {
          text: JSON.stringify({
            hook: {
              text:
                '42 organisations recorded indicators consistent with a possible phishing campaign.',

              source_refs: [
                'span_1',
              ],

              status:
                'inference',
            },

            body: [
              {
                text:
                  'Reset VPN credentials for all affected users.',

                source_refs: [
                  'span_3',
                ],

                status:
                  'fact',
              },

              {
                text:
                  'The remaining organisations were potentially exposed.',

                source_refs: [
                  'span_2',
                ],

                status:
                  'inference',
              },
            ],

            hashtags: [
              '#CyberSecurity',
            ],
          }),

          provider: 'cloud',

          model: 'fake-model',

          latency_ms: 1,
        };
      }

      /*
       * --------------------------------------------------
       * SECOND GENERATION
       * --------------------------------------------------
       *
       * This is the ONE targeted revision.
       *
       * The verifier should have identified c1 as
       * problematic because 42 does not occur in span_1.
       *
       * The revision restores the original 37.
       */
      return {
        text: JSON.stringify({
          revisions: [
            {
              id: 'c1',

              text:
                '37 organisations recorded indicators consistent with a possible phishing campaign.',

              source_refs: [
                'span_1',
              ],

              status:
                'inference',
            },
          ],
        }),

        provider: 'cloud',

        model: 'fake-model',

        latency_ms: 1,
      };
    },
  };
}

describe(
  'pipeline generation budget',
  () => {
    /*
     * --------------------------------------------------
     * TEST 1
     * --------------------------------------------------
     *
     * A clean first draft should never trigger revision.
     *
     * Generation calls:
     *
     *   1. Initial generation
     *   STOP
     */
    it(
      'uses exactly one generation call when the first draft passes',
      async () => {
        const router =
          createFakeRouter(
            'clean'
          );

        const result =
          await runFormat(
            router as any,
            {
              canonical,

              spans,

              format:
                'linkedin_post',

              config,

              classification:
                'public',
            }
          );

        expect(
          result.verification
            .passed
        ).toBe(true);

        expect(
          result.verification
            .revised
        ).toBe(false);

        expect(
          router.calls
        ).toBe(1);
      }
    );

    /*
     * --------------------------------------------------
     * TEST 2
     * --------------------------------------------------
     *
     * The first draft contains 42 instead of 37.
     *
     * The verifier should detect the identifier problem.
     *
     * The pipeline gets exactly ONE revision call.
     *
     * Generation calls:
     *
     *   1. Bad initial generation
     *   2. Targeted revision
     *   STOP
     */
    it(
      'uses exactly two generation calls when revision is required',
      async () => {
        const router =
          createFakeRouter(
            'revision'
          );

        const result =
          await runFormat(
            router as any,
            {
              canonical,

              spans,

              format:
                'linkedin_post',

              config,

              classification:
                'public',
            }
          );

        expect(
          router.calls
        ).toBe(2);

        expect(
          result.verification
            .revised
        ).toBe(true);

        expect(
          result.verification
            .passed
        ).toBe(true);

        const artifact =
          result.artifact as {
            hook: {
              text: string;
            };
          };

        expect(
          artifact.hook.text
        ).toBe(
          '37 organisations recorded indicators consistent with a possible phishing campaign.'
        );
      }
    );

    /*
     * --------------------------------------------------
     * TEST 3 — AC-17
     * --------------------------------------------------
     *
     * The fake router throws immediately if the pipeline
     * attempts a third model call.
     *
     * Therefore, if runFormat() completes successfully,
     * we have proven that it did not make a third call.
     */
    it(
      'never makes a third generation call',
      async () => {
        const router =
          createFakeRouter(
            'revision'
          );

        await runFormat(
          router as any,
          {
            canonical,

            spans,

            format:
              'linkedin_post',

            config,

            classification:
              'public',
          }
        );

        /*
         * Reaching this assertion means the fake router
         * never threw the AC-17 error.
         */
        expect(
          router.calls
        ).toBe(2);

        expect(
          router.calls
        ).not.toBeGreaterThan(
          2
        );
      }
    );
  }
);