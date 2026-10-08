# Prechart v12

Built on Prechart v11 + v11.2 (Oct 2 emails). No patient data in any file here.

| File | What it is | Where it goes |
|---|---|---|
| `v12_cprs_templates.txt` | 13 CPRS personal templates: NP base, FU base, 11 region exams | CPRS > Templates > My Templates (replace the v11.2 ones, add CHIRO EXAM HIP) |
| `v12_instruction_edits.txt` | 5 edits to the Prechart Project instructions | Claude Project custom instructions |
| `v12_ddx_library.txt` | Region differential library | Append to the end of PROJECT_KNOWLEDGE_v11.md |
| `Ortho_Neuro_ROM_Reference.docx` | Evidence-based ortho/neuro tests and ROM norms | Talk handout and desk reference |
| `build_reference.js` | Script that regenerates the .docx | Only if the reference is edited |

## Install (about 25 minutes)

1. Prechart Project: apply Edits A through E from `v12_instruction_edits.txt`, change the title to v12, save.
2. Project knowledge: paste `v12_ddx_library.txt` at the end of the knowledge file.
3. CPRS: overwrite each CHIRO template with the v12 text. Add one new template: CHIRO EXAM HIP. The old LUMBOPELVIC template becomes CHIRO EXAM LUMBAR SI (hip moved out).
4. Smoke test with a pretend worksheet (example below). Start a fresh Project chat first.

## Daily flow

**New patient**
1. Header template, then NP BASE, then region exam(s) at the `>> INSERT` line. Delete the `>>` line.
2. History: type terms after each LOSTWAR label. Use the patient's own words once, plus one specific function limit. Those two lines are what make the note sound like this patient.
3. Exam: every line is pre-filled `-`. Change a positive to `+` and add detail after it. Delete what you did not do.
4. Plan: already standard. Edit only to change it.
5. Save without signing. Copy from the `np` line down, then paste into a fresh Prechart chat. Paste the output over the worksheet and sign.

**Follow-up**
1. FU BASE. Fill severity, % improvement, palpation and fixations (or `same`), time. Leave `LOSTWAR change` blank if nothing changed.
2. Copy from `fu` down, paste into Prechart, paste the prior note under it.

## Example (pretend patient)

```
np CHIRO NEW PATIENT
CC: low back and R leg pain
Location: R low back, R buttock
Onset: 3 wk ago lifting mulch
Severity (NPRS now/best/worst): 6/3/8
Timing: worse AM and after sitting
Worsening: sitting >20 min, bending
Alleviating: walking, lying supine
Radiating: R post thigh to calf
Patient's words: "toothache in my butt"
Function (task, limit): sitting limited to 20 min, cannot drive to work without stopping
...
ROM Flex 35ep Ext 25 LatR 25 LatL 20p RotR 30 RotL 30
SLR R + 45 deg post thigh to calf L -
Slump R + L -
...
Dx: R lumbar radiculopathy
DDx:
```

v12 then prints, among other things:
- `Goal: 50% improvement in overall symptoms within 6 to 8 visits, including sitting tolerance beyond 20 minutes`
- `Reasoning: Lifting onset with right posterior leg pain to the calf and positive right SLR at 45 deg and slump support a right lumbar radiculopathy limiting sitting to 20 minutes.`
- `Differential: SI joint pain, less likely given negative distraction and thigh thrust; lumbar spinal stenosis, less likely given relief with walking; cauda equina syndrome, less likely given denied saddle anesthesia and bowel or bladder change.`
- Chat: `Differential drafted from documented findings; confirm before signing.`

If the Dx side had been typed as L, v12 prints the dx as stated but adds a chat line: `CHECK: Dx side (left) conflicts with positive findings (right).`
