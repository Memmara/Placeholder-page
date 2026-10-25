# AQA GCSE Maths 8300 bank audit

Reviewed 22 October 2026. Source: `../../.codex-remote-attachments/01a15b74-a803-7fc1-a700-01b4f61bc647/3f8fff12-4b21-41bb-a0fd-d9f0117decce/1-aqa_gcse_maths_8300_question_bank.json`.

**Status: imported into student practice.** The supplied original is preserved unchanged in `data/maths-source.json`; `work/import-maths.mjs` converts it repeatably for the active app bank. Maths is available in subject selection, topic practice and Daily Mix. The active bank has 2,664 questions across four subjects, including all 564 Maths questions and 97 Maths curriculum points. The nine low-count references remain as supplied, as requested.

The adapter corrects the three floating-point targets and eight fraction questions whose rubric text named a decimal despite requiring a fractional final answer. It maps the source difficulty and tier values, preserves proof type, calculator requirements and Maths-specific criterion rules, and uses the existing after-submission review flow. The dedicated rule marker handles clear final answers, numeric forms, simplified fractions, ratios and simple multiple values. Proofs and uncertain responses go to mark-scheme review, where a student can correct or contest the result. Automatic Year 9–11 coverage now includes Maths specification points in Number, Algebra, Ratio, Geometry, Probability and Statistics order.

Targeted marker checks reject `6/16` for N10-001, `18/20` for N8-002 and `36/2` for S6-004; bare `12n` on proof A6-002 requires review; and the three corrected floating-point answers receive credit. All 2,664 questions pass the app's bank validator and the app builds. Of the 564 supplied Maths `answer` fields, 552 are automatically credited and 12 require working review. This does not constitute examiner verification of the Maths content. The source identifies itself as `0.9.0-draft` and states question-level marking has not been verified.

The findings below describe the original file and the pre-import checker; their identified import blockers have now been addressed as described above.

## Structural checks

| Check | Result |
| --- | ---: |
| Questions | 564 |
| Specification references | 97 |
| Duplicate question IDs | 0 |
| Duplicate question text after case/space normalisation | 0 |
| Questions with missing specification reference | 0 |
| Duplicate specification IDs | 0 |
| Missing question, answer, model answer or mark scheme | 0 |
| Question marks differing from self-check total | 0 |
| Criteria whose marks do not sum to the total | 0 |
| Broken criterion dependency references | 0 |
| Individual criteria | 1,010 |

The 97 references are N1–N16, A1–A25, R1–R16, G1–G25, P1–P9 and S1–S6. These are the six content families used in [AQA's current 8300 subject content](https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/specification/subject-content). This checks identifier coverage, not the accuracy of every question's mapping or answer.

## Original pre-import findings

1. **Three authored numeric rules contain binary floating-point artefacts but allow zero tolerance.** `AQA8300-N2-002` gives the correct answer `1.44`, while its rule stores `1.4400000000000002`. `AQA8300-R16-001` stores `540.8000000000001` for `£540.80`; `AQA8300-R16-002` stores `7369.499999999999` for `£7369.50`. The current rule marker marks `1.44` incorrect. Normalise these target values to exact decimal representations or use a carefully bounded tolerance.
2. **Nine specification references fall below the requested five questions per point:** N11, A16, A20, R15, G6, G8, G13 and P9 have four each; G23 has three. The remaining 88 have 5–10. Do not invent the missing questions during import.
3. **Current Maths marking would give false credit.** `AQA8300-N10-001` requires a fraction in simplest form, yet the current marker accepts `6/16` for `3/8`. `AQA8300-S6-004` explicitly rejects the unevaluated `36/2`, yet the marker accepts it for `18`. `AQA8300-A6-002` says a bare `12n` earns no marks because working is required, yet the marker returns `correct` for that bare response. The supplied bank includes `simplify_required`, `reject_unprocessed_fraction`, and working requirements that Memmara does not currently enforce.
4. **The file does not meet the current import contract.** `AQA8300-` question IDs are not recognised as Maths; 384 questions use difficulty values outside Memmara's four-value set; three use the unsupported `proof` question type; all 1,010 criteria omit `examples_are_exhaustive`, which the validator requires. The 97 point records also need Memmara subject, topic and subtopic IDs, names, tier values and sequencing.
5. **The marker lacks several Maths rule families.** The bank has 338 numeric, 69 expression, 53 multiple-values, 10 ratio, 8 inequality and 3 prime-factor criteria, plus 529 keyword criteria. Directly feeding the unadapted questions into the present marker yields `correct` for only 406 of the 564 supplied short `answer` fields, `review` for 157 and `incorrect` for one. It yields `review` for 305 of the 564 supplied model answers. These are compatibility results, not scores for students.
6. **The bank describes a different reveal sequence.** Its metadata asks students to tick criteria before revealing a model answer. Memmara currently lets students inspect the mark scheme and then correct or challenge a self-check. Keep the existing user-approved Memmara flow and adapt the repeated bank instructions if importing it.

The source identifies itself as `0.9.0-draft` and marks every question `conventions_sampled_from_3_mark_schemes_question_level_not_verified`. Its verification note says individual questions and accepted-answer lists were not verified against every past paper. A question-by-question examiner review remains necessary before presenting the bank as examiner-verified.

## Earlier integration plan and remaining improvement areas

1. Preserve the original JSON as the immutable source. Build a separate converter for `GCSE-MATHS` with deterministic topic/subtopic IDs and explicit difficulty/tier mapping. Keep Maths-specific metadata such as calculator status and required working.
2. Correct the three numeric targets in the converted copy. Use exact rational or decimal comparisons for fractions, money and percentages. Respect required form, simplification, units, processed answers and tolerances.
3. Add a constrained expression parser and dedicated handlers for values, inequalities, ratios and prime factors. Check working and dependencies for method marks. Unknown or ambiguous work must route to point-by-point review, with the existing student correction/challenge flow.
4. Run the bank's accepted and rejected examples through the Maths marker, including the three false-credit cases above and the three precision cases. Have an examiner inspect a representative sample and all automatic-credit exceptions.
5. Then add Maths to subject selection, session labels, automatic study plans, dashboards and the server's subject analytics. Preserve existing Biology, Chemistry and Physics data and saved progress.

## Scope of this audit

All records received structural checks; selected content and marking examples were inspected. This audit does not certify all 564 answers, curriculum alignments or rubric examples as mathematically correct.
