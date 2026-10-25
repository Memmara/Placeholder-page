# AQA GCSE Geography 8035 bank: import audit

Imported 22 October 2026 from the user's ZIP archive. The original question-bank JSON is preserved unchanged in `data/geography-source.json`. `work/import-geography.mjs` is a repeatable adapter; it replaces Geography records only. The archive's Python and SQL files were treated as reference material, not executed.

| Check | Result |
| --- | ---: |
| Questions imported | 544 |
| Specification-point records | 61 |
| Questions per point | 5–10 |
| Duplicate question IDs | 0 |
| Missing point mappings | 0 |
| Criteria whose marks differ from the question total | 0 |
| Active questions across five subjects | 3,208 |

The bank contains 463 short answers, 23 multiple-choice questions, 17 calculations and 41 extended responses. The multiple-choice options and answer keys were converted into Memmara's selectable format. Curriculum records preserve the AQA reference, topic, subtopic, paper context and optional-unit choice.

Geography's optional content is selected in the study profile: one of hot deserts or cold environments, two of coasts/rivers/glacial landscapes, and one of food/water/energy. A valid choice exposes 51 of the 61 point records. Daily Mix, Speed Select, topic practice and automatic Year 9–11 plans respect those choices.

## Marking behaviour

Memmara's Geography checker credits the authored full answer, exact credited single-mark examples, valid multiple-choice selections and clear numeric alternatives. It rejects exact responses in the bank's non-credit examples. Other free-form wording goes to the existing mark-scheme review screen, where the learner can correct or contest the initial check. Extended responses always go to review: their level is a holistic judgement, and the app shows level descriptors, caps and any separate SPaG prompt.

The ZIP includes a larger Python text matcher and a report of its own tests. That matcher was **not** ported or executed in Memmara. Its reported accuracy must not be attributed to this app's conservative checker. A check using each supplied answer produced 503 automatic correct results and 41 reviews for the extended responses; none of the 75 supplied explicit non-credit responses received automatic credit. These checks establish format and rule behaviour, not examiner validation.

The source identifies itself as `0.9.0-draft` and says question-level wording and marking have not been verified against every past paper. Paper 3 issue-evaluation questions refer to an older illustrative pre-release scenario, so they are skills practice rather than this year's live resource booklet. The bank should receive teacher review before it is presented as examiner-verified.
