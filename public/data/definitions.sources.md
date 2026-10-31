# Flash Match definition seed

The 35 original definitions in `definitions.json` are newly written short descriptions, linked to the imported AQA GCSE specification point IDs. A further 1,278 entries from the user-supplied `data/definition-bank-source.json` are available for Flash Match, Memory Grid and Definition Quiz.

The revised supplied file uses subject-prefixed AQA-style references. Memmara's curriculum uses its own point IDs, so `scripts/import-definition-bank.mjs` normalises subject IDs, translates exact curriculum references first, and then accepts strong term matches. Mapped entries produce standard multiple-choice questions for Daily Mix and Speed Select. Unmapped entries remain usable in definition minigames; `data/definition-import-report.json` lists entries needing a reviewed crosswalk before Daily Mix import. Keep the supplied reference as `source_specification_point_id` rather than treating it as a Memmara point ID.

Reference material:

- [AQA GCSE Biology 8461: Cell biology](https://www.aqa.org.uk/subjects/biology/gcse/biology-8461/specification/subject-content/cell-biology)
- [AQA GCSE Physics 8463: Energy](https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification/subject-content/energy)
- [PMT AQA GCSE Biology: Cell Biology definitions](https://pmt.physicsandmathstutor.com/download/Biology/GCSE/Notes/AQA/1-Cell-Biology/Definitions.pdf)

Future imports should keep the author-written definition, a valid `specification_point_id`, curriculum version, source references, and subject review status together. Do not paste exam board or PMT wording into the app library.
