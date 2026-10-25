# Maths multiple-choice import

- Imported source: `data/maths-mcq-source.json`
- Imported records: 500 single-select questions
- Source concepts: 116
- Destination: the existing AQA GCSE Mathematics (8300) course
- Existing written Maths questions are retained.
- Memmara IDs use `AQA8300-MCQ-0001` through `AQA8300-MCQ-0500`.
- The source concept ID remains on each record as `sourceSpecificationPointId`; `specification_point_id` is converted to the applicable AQA 8300 reference.
- `foundation_higher_easy` remains unchanged, `foundation_higher_medium` becomes `foundation_higher_standard`, and `higher_hard` becomes `higher_only_standard`.
- The supplied answer keys, option feedback, model answers, mark schemes and misconceptions are retained. Misconceptions are exposed through Memmara's feedback structure.
- Re-import with `node work/import-maths-mcq.mjs`. The import replaces only questions whose IDs start with `AQA8300-MCQ-`.
