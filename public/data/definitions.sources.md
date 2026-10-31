# Flash Match definition seed

The 35 original definitions in `definitions.json` are newly written short descriptions, linked to the imported AQA GCSE specification point IDs. A further 1,278 entries from the user-supplied `data/definition-bank-source.json` are available for Flash Match, Memory Grid and Definition Quiz.

The supplied file uses a separate set of specification IDs, including IDs that collide with different Memmara concepts. `scripts/import-definition-bank.mjs` normalises subject IDs and maps only strong term matches to Memmara curriculum points. Those mapped entries produce standard multiple-choice questions for Daily Mix and Speed Select. Unmapped entries remain usable in definition minigames; `data/definition-import-report.json` lists the entries needing curriculum mapping before Daily Mix import. Do not treat the source ID as a verified Memmara specification link.

Reference material:

- [AQA GCSE Biology 8461: Cell biology](https://www.aqa.org.uk/subjects/biology/gcse/biology-8461/specification/subject-content/cell-biology)
- [AQA GCSE Physics 8463: Energy](https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification/subject-content/energy)
- [PMT AQA GCSE Biology: Cell Biology definitions](https://pmt.physicsandmathstutor.com/download/Biology/GCSE/Notes/AQA/1-Cell-Biology/Definitions.pdf)

Future imports should keep the author-written definition, a valid `specification_point_id`, curriculum version, source references, and subject review status together. Do not paste exam board or PMT wording into the app library.
