// Builds Ortho_Neuro_ROM_Reference.docx. Run: node build_reference.js
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, PageOrientation, HeadingLevel, Footer, PageNumber,
  BorderStyle, LevelFormat,
} = require('docx');

const INK = '1F2A33', TEAL = '1D5C63', PALE = 'E8F1F2', RULE = 'B8C7CA', NOTE = '5B6B73';
const FONT = 'Calibri';
const W = 14400; // landscape letter, 0.5in margins

// ---------- helpers ----------
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 17, bold: o.bold, italics: o.italics, color: o.color || INK });
const para = (text, o = {}) => new Paragraph({
  spacing: { before: o.before || 0, after: o.after ?? 60 },
  alignment: o.align,
  children: Array.isArray(text) ? text : [run(text, o)],
});
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 2 } },
  children: [new TextRun({ text, font: FONT, size: 28, bold: true, color: TEAL })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 140, after: 60 },
  children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: INK })],
});
const bullet = (text) => new Paragraph({
  numbering: { reference: 'dots', level: 0 }, spacing: { after: 30 },
  children: Array.isArray(text) ? text : [run(text)],
});

const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, width, o = {}) {
  const lines = String(text).split('|');
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children: lines.map((l) => new Paragraph({
      alignment: o.align, spacing: { after: 0 },
      children: [run(l, { bold: o.bold, color: o.color, size: o.size || 16, italics: o.italics })],
    })),
  });
}
function table(cols, header, rows, o = {}) {
  const center = o.center || [];
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cols,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, cols[i], { bold: true, fill: TEAL, color: 'FFFFFF', align: center.includes(i) ? AlignmentType.CENTER : undefined })) }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((c, i) => cell(c, cols[i], {
          fill: ri % 2 ? PALE : undefined,
          align: center.includes(i) ? AlignmentType.CENTER : undefined,
          bold: i === 0, color: i === cols.length - 1 && o.noteCol ? NOTE : undefined,
          italics: i === cols.length - 1 && o.noteCol,
        })),
      })),
    ],
  });
}

// ---------- test tables ----------
// Test | How / positive | Target | Sn | Sp | +LR | -LR | Source | Note
const TCOLS = [1900, 3900, 1900, 750, 750, 750, 750, 2100, 1600];
const THEAD = ['Test', 'How / positive', 'Target condition', 'Sn', 'Sp', '+LR', '-LR', 'Source', 'Use'];
const testTable = (rows) => table(TCOLS, THEAD, rows, { center: [3, 4, 5, 6], noteCol: true });
const cluster = (title, text) => new Paragraph({
  spacing: { before: 60, after: 60 },
  shading: { type: ShadingType.CLEAR, fill: PALE, color: 'auto' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: TEAL, space: 6 } },
  children: [run(title + '  ', { bold: true, color: TEAL }), run(text)],
});

const CERVICAL = [
  ['Spurling A', 'Seated; side bend to symptomatic side with about 7 kg overpressure. + reproduces arm symptoms', 'Cervical radiculopathy', '0.50', '0.86', '3.5', '0.58', 'Wainner 2003 Spine (12544957)', 'Rule in. Tong 2002: 0.30 / 0.93'],
  ['Distraction', 'Supine; distract head about 14 kg. + relieves arm symptoms', 'Cervical radiculopathy', '0.44', '0.90', '4.4', '0.62', 'Wainner 2003 (12544957)', 'Rule in'],
  ['ULTT A (median)', 'Supine; scapular depression, shoulder abd 110, ER, supination, wrist and finger ext, elbow ext, then neck side bend. + reproduces symptoms, side difference in elbow ext over 10 deg, or symptoms change with neck side bend', 'Cervical radiculopathy', '0.97', '0.22', '1.3', '0.12', 'Wainner 2003 (12544957)', 'Rule out'],
  ['Shoulder abduction relief', 'Patient rests hand on head. + relieves arm symptoms', 'Cervical radiculopathy', '0.17 to 0.50', '0.80 to 0.92', 'var', 'var', 'Viikari-Juntura 1989 Spine (2711240)', 'Rule in; variable'],
  ['Valsalva', 'Bear down. + reproduces neck or arm pain', 'Cervical radiculopathy', '0.22', '0.94', '3.5', '0.83', 'Wainner 2003 (12544957)', 'Limited data'],
  ['Hoffmann', 'Flick distal phalanx of middle finger. + thumb and index flexion', 'Cervical myelopathy', 'var', 'var', '2.2', '0.63', 'Fogarty 2018 Spine SR (29668564)', 'Small shift alone'],
  ['Babinski', 'Stroke lateral sole. + great toe extension, toes fan', 'Cervical myelopathy', '0.33', '0.92', '4.0', '0.7', 'Cook 2009 JOSPT (19252263)', 'Rule in'],
  ['Inverted supinator', 'Tap brachioradialis tendon. + finger flexion with reduced BR reflex', 'Cervical myelopathy', '0.61', 'n/e', 'n/e', 'n/e', 'Cook 2011 JMPT SR (21899892)', 'Cluster item'],
  ['Lhermitte', 'Neck flexion. + electric sensation down spine or limbs', 'Myelopathy (also MS)', 'low', 'high', 'n/e', 'n/e', 'Cook 2011 (21899892)', 'Limited data'],
  ['Flexion rotation test', 'Supine, neck fully flexed, rotate each way. + rotation under 32 deg or 10 deg less than other side', 'C1-2 cervicogenic headache', '0.91', '0.90', '9.1', '0.10', 'Ogince 2007 Man Ther (17112768)', 'Case-control; likely optimistic'],
  ['Sharp-Purser', 'Seated, slight flexion; stabilize C2, push forehead posterior. + clunk or symptom relief', 'Atlantoaxial instability', '0.69', '0.96', '17', '0.32', 'Uitvlugt 1988 Arthritis Rheum (3395385)', 'RA patients only'],
];
const THORACIC = [
  ['Adams forward bend', 'Standing forward bend; observe for rib hump', 'Scoliosis (Cobb 10 deg or more)', '0.84', '0.93', '12.9', '0.17', 'Karachalios 1999 Spine (10586455)', 'Screening; not sole tool'],
];
const LUMBAR = [
  ['Straight leg raise', 'Supine, passive hip flexion with knee straight. + reproduces leg pain below knee, about 30 to 70 deg', 'Disc herniation with radiculopathy', '0.92', '0.28', '1.3', '0.29', 'van der Windt 2010 Cochrane (20166095)', 'Rule out; surgical samples'],
  ['Crossed SLR', 'SLR on the uninvolved leg. + reproduces symptoms in the involved leg', 'Disc herniation', '0.28', '0.90', '2.8', '0.80', 'van der Windt 2010 (20166095)', 'Rule in'],
  ['Slump', 'Seated slump, neck flexion, knee extension, dorsiflexion. + reproduces symptoms, eased by neck extension', 'Disc herniation (MRI)', '0.84', '0.83', '4.9', '0.19', 'Majlesi 2008 J Clin Rheumatol (18391677)', 'Case-control; small'],
  ['Femoral nerve stretch', 'Prone, passive knee flexion. + anterior thigh pain', 'L2 to L4 root impingement', 'n/e', '1.00', 'high', 'n/e', 'Suri 2011 Spine (20543768)', 'Rule in; one study'],
  ['Kemp', 'Extension with rotation. + local or radiating pain', 'Facet joint pain', 'poor', 'poor', 'n/a', 'n/a', 'Stuber 2014 JCCA SR (25202153)', 'Not recommended'],
  ['Prone instability', 'Prone over table edge; PA pressure with feet down then lifted. + pain eases when legs lifted', 'Stabilization responders', 'n/e', 'n/e', 'n/e', 'n/e', 'Stolz 2019 SR (31733430)', 'Limited; reliability inconsistent'],
];
const SIJ = [
  ['SI distraction', 'Supine; posterolateral pressure on both ASIS', 'SIJ pain (block reference)', '0.60', '0.81', '3.2', '0.49', 'Laslett 2005 Man Ther (16038856)', 'Cluster item'],
  ['Thigh thrust', 'Supine, hip flexed 90; axial load through femur', 'SIJ pain', '0.88', '0.69', '2.8', '0.18', 'Laslett 2005', 'Most sensitive item'],
  ['SI compression', 'Side lying; downward pressure on iliac crest', 'SIJ pain', '0.69', '0.69', '2.2', '0.46', 'Laslett 2005', 'Cluster item'],
  ['Sacral thrust', 'Prone; PA pressure on sacrum', 'SIJ pain', '0.63', '0.75', '2.5', '0.50', 'Laslett 2005', 'Cluster item'],
  ['Gaenslen', 'Supine at table edge; one hip hyperextended, other flexed', 'SIJ pain', '0.50 to 0.53', '0.71 to 0.77', '1.8 to 2.2', '0.65', 'Laslett 2005', 'Weakest item'],
  ['FABER (for SIJ)', 'Figure 4, overpressure on knee. + buttock pain', 'SIJ pain', '0.69', '0.16', '0.8', '1.9', 'Dreyfuss 1996 Spine (8961447)', 'Not useful for SIJ'],
];
const HIP = [
  ['FADIR', 'Supine; hip flexion 90, adduction, IR. + groin pain', 'FAI / labral tear', '0.94 to 0.99', 'low', '~1', 'low', 'Reiman 2015 BJSM SR (25515771)', 'Rule out only'],
  ['FABER (for hip)', 'Figure 4, overpressure. + groin pain', 'Intra-articular hip pain', '0.82', 'low', 'n/e', 'n/e', 'Maslowski 2010 PM&R (20359681)', 'Screen; low Sp'],
  ['Scour', 'Hip flexed and adducted; axial load through arc. + groin or lateral hip pain', 'Hip OA (cluster item)', 'n/e', 'n/e', 'n/e', 'n/e', 'Sutlive 2008 JOSPT (18758047)', 'Use in cluster'],
  ['Log roll', 'Supine; passive IR and ER of straight leg. + groin pain or click', 'Intra-articular hip', 'n/e', 'n/e', 'n/e', 'n/e', 'No accuracy studies', 'Screen only'],
  ['Single leg stance 30 s', 'Stand on affected leg 30 s. + lateral hip pain', 'Gluteal tendinopathy (MRI)', '0.19 to 1.00', '0.97 to 1.00', '~12', 'var', 'Grimaldi 2017 BJSM (27633027); Lequesne 2008', 'Rule in'],
  ['Resisted external derotation', 'Supine, hip 90/90 in ER; resist return to neutral. + lateral hip pain', 'Gluteal tendinopathy', '0.88', '0.97', '32.6', '0.12', 'Lequesne 2008 Arthritis Rheum (18240186)', 'Small study'],
  ['Greater trochanter palpation', '+ reproduces lateral hip pain', 'Gluteal tendinopathy (MRI)', '0.80', '0.47', '1.5', '0.43', 'Grimaldi 2017 (27633027)', 'Rule out'],
];
const SHOULDER = [
  ['Painful arc', 'Active abduction. + pain between 60 and 120 deg', 'Subacromial pain', '0.53', '0.76', '2.2', '0.62', 'Hegedus 2012 BJSM MA (22773322)', 'Cluster item'],
  ['Hawkins Kennedy', 'Shoulder and elbow 90 flexion; passive IR. + pain', 'Subacromial pain', '0.79', '0.59', '1.9', '0.36', 'Hegedus 2012 (22773322)', 'Cluster item'],
  ['Neer', 'Passive full flexion with IR. + pain', 'Subacromial pain', '0.72', '0.60', '1.8', '0.47', 'Hegedus 2012 (22773322)', 'Weak alone'],
  ['Empty can (Jobe)', 'Abd 90 in scapular plane, thumbs down; resist. + weakness (not pain)', 'Supraspinatus tear', '0.77', 'var', 'n/e', 'n/e', 'Ladermann 2020 KSSTA MA (32725446); Itoi 1999', 'Grade on weakness'],
  ['Drop arm', 'Lower arm slowly from 90 abd. + arm drops or cannot control', 'Full thickness RC tear', '0.35', '0.88', '2.9', '0.74', 'Park 2005 JBJS (15995110)', 'Rule in'],
  ['ER lag sign', 'Elbow 90, arm passively near full ER; patient holds. + lag', 'Full thickness supra / infraspinatus tear', '0.46 to 0.70', '0.94 to 0.98', '7.2', 'n/e', 'Hermans 2013 JAMA SR (23982370)', 'Rule in'],
  ['Lift off', 'Hand behind back; lift away. + unable', 'Subscapularis tear', '0.18', '1.00', 'high', '0.82', 'Barth 2006 Arthroscopy (17027405)', 'Positive only in large tears'],
  ['Belly press', 'Press hand into abdomen, elbow forward. + elbow drops back', 'Subscapularis tear', '0.40', '0.98', '19', '0.61', 'Barth 2006 (17027405)', 'Bear hug: 0.60 / 0.92'],
  ['Apprehension', 'Supine, 90 abd, ER. + apprehension (not pain)', 'Anterior instability', '0.72', '0.96', '20.2', '0.29', 'Farber 2006 JBJS (16818971)', 'Rule in'],
  ['Relocation', 'Posterior pressure on humeral head during apprehension. + apprehension relieved', 'Anterior instability', '0.81', '0.92', '10.4', '0.21', 'Farber 2006 (16818971)', 'Rule in'],
  ['Surprise (release)', 'Release the relocation pressure. + apprehension returns', 'Anterior instability', '0.64', '0.99', '58', '0.37', 'Lo 2004 AJSM (14977651)', 'Best single test'],
  ['Cross body adduction', 'Horizontal adduction to end range. + AC pain', 'AC joint lesion', '0.77', '0.79', '3.7', '0.29', 'Chronopoulos 2004 AJSM (15090381)', 'Rule in'],
  ['AC joint palpation', '+ reproduces familiar pain', 'AC joint pain', '0.96', 'low', '~1.1', '~0.4', 'Walton 2004 JBJS (15069148)', 'Rule out'],
  ['Speed', 'Resist forward flexion, elbow ext, supinated. + bicipital pain', 'SLAP lesion', '0.32', '0.61', '0.8', '1.1', 'Hegedus 2008 BJSM MA (17720798)', 'Not diagnostic'],
  ["O'Brien", 'Flex 90, adduct 10, IR; resist, repeat in ER', 'SLAP / AC', 'SLAP 0.67; AC 0.41', 'SLAP 0.37; AC 0.95', 'n/a', 'n/a', 'Hegedus 2012; Chronopoulos 2004', 'Not diagnostic for SLAP'],
];
const ELBOW = [
  ['Cozen', 'Resist wrist extension with elbow extended, forearm pronated. + lateral elbow pain', 'Lateral epicondylalgia', '0.97', 'n/e', 'n/e', 'n/e', 'Factor 2023 Medicina (37374364)', 'No controls'],
  ['Mill', 'Passive wrist flexion, pronation, elbow extension. + lateral pain', 'Lateral epicondylalgia', '0.87', 'n/e', 'n/e', 'n/e', 'Factor 2023 (37374364)', 'No controls'],
  ['Elbow flexion + pressure', 'Full elbow flexion with pressure over cubital tunnel, 30 s. + ulnar paresthesia', 'Cubital tunnel syndrome', '0.91', 'high', 'n/e', 'n/e', 'Novak 1994 J Hand Surg (7806810)', 'Most sensitive'],
  ['Elbow flexion test', 'Full elbow flexion with wrist extension, 60 s', 'Cubital tunnel syndrome', '0.75 (60 s)', 'high', 'n/e', 'n/e', 'Novak 1994 (7806810)', '0.32 at 30 s'],
  ['Tinel, cubital tunnel', 'Tap ulnar nerve in groove. + distal tingling', 'Cubital tunnel syndrome', '0.70', 'high', 'n/e', 'n/e', 'Novak 1994 (7806810)', ''],
  ['Elbow extension test', 'After trauma: full active extension. + unable', 'Elbow fracture', '0.97', '0.49', '1.9', '0.03 adult', 'Appelboam 2008 BMJ (19066257)', 'Rule out; n = 1740'],
  ['Hook test', 'Elbow 90, supinated; hook distal biceps tendon laterally. + cannot hook', 'Distal biceps rupture', '1.00', '1.00', 'high', '0', "O'Driscoll 2007 AJSM (17687121)", 'Small, single surgeon'],
  ['Moving valgus stress', 'Valgus with rapid extension from full flexion. + pain 70 to 120 deg', 'UCL insufficiency', '1.00', '0.75', '4.0', '0', "O'Driscoll 2005 AJSM (15701609)", 'Small sample'],
];
const WRIST = [
  ['Phalen', 'Full wrist flexion 60 s. + median paresthesia', 'Carpal tunnel syndrome', '0.68', '0.73', '2.5', '0.44', 'MacDermid & Wessel 2004 J Hand Ther (15162113)', ''],
  ['Tinel, carpal tunnel', 'Tap median nerve at wrist', 'Carpal tunnel syndrome', '0.50', '0.77', '2.2', '0.65', 'MacDermid & Wessel 2004', ''],
  ['Carpal compression (Durkan)', 'Thumb pressure over carpal tunnel 30 s', 'Carpal tunnel syndrome', '0.64', '0.83', '3.8', '0.43', 'MacDermid & Wessel 2004', 'Best single test'],
  ['WHAT test', 'Wrist hyperflexion and abduction of thumb; resist abduction. + pain', 'De Quervain', '0.99', '0.29', '1.4', '0.03', 'Goubau 2014 J Hand Surg Eur (23340762)', 'Rule out'],
  ['Eichhoff ("Finkelstein")', 'Thumb in fist, ulnar deviate. + radial wrist pain', 'De Quervain', '0.89', '0.14', '~1.0', '~0.8', 'Goubau 2014 (23340762)', 'Commonly called Finkelstein'],
  ['Anatomic snuffbox tenderness', 'Palpate snuffbox after a fall', 'Scaphoid fracture', '0.93', 'var', '~1.1', '0.15', 'Mallee 2014 J Hand Surg SR (25091335); Carpenter 2014', 'Rule out only'],
  ['CMC grind', 'Axial load and rotate thumb metacarpal. + pain or crepitus', 'Thumb CMC OA', '0.13 to 0.64', '0.91 to 1.00', 'var', 'var', 'Sela 2019 J Hand Ther (29150383)', 'Negative does not rule out'],
  ['Watson scaphoid shift', 'Thumb pressure on scaphoid tubercle while moving ulnar to radial dev. + clunk or pain', 'Scapholunate injury', '0.50 to 0.69', '0.62 to 0.66', '1.6 to 2.0', '0.5 to 0.6', 'Schmauss 2022 J Clin Med (36362552)', 'Weak'],
];
const KNEE = [
  ['Lachman', 'Knee 20 to 30 flexion; anterior tibial translation. + excess translation, soft end feel', 'ACL tear', '0.81 to 0.85', '0.85 to 0.94', '5 to 14', '0.16 to 0.22', 'Benjaminse 2006 JOSPT MA (16715828); Sokal 2022 KSSTA', 'Best rule out'],
  ['Anterior drawer', 'Knee 90; anterior pull', 'ACL tear', '0.83 to 0.92', '0.85 to 0.91', 'var', 'var', 'Benjaminse 2006; Sokal 2022 (35150292)', 'Weak in acute knee'],
  ['Pivot shift', 'Valgus and IR from extension into flexion. + reduction clunk', 'ACL tear', '0.24 to 0.55', '0.94 to 0.98', '9 to 12', '0.5 to 0.8', 'Benjaminse 2006; Sokal 2022', 'Rule in'],
  ['Lever sign (Lelli)', 'Fist under proximal calf; press distal thigh. + heel does not rise', 'ACL tear', '0.79', '0.92', '9.9', '0.23', 'Hesmerg 2024 Knee MA (38310817)', 'Variable across MAs'],
  ['Posterior drawer', 'Knee 90; posterior push', 'PCL tear', '0.90', '0.99', '90', '0.10', 'Rubinstein 1994 AJSM (7943523)', 'Whole exam; best single test'],
  ['McMurray', 'Flexion to extension with rotation. + click with pain', 'Meniscal tear', '0.70', '0.71', '2.4', '0.42', 'Hegedus 2007 JOSPT MA (17939613)', 'Weak alone'],
  ['Joint line tenderness', '+ tender joint line', 'Meniscal tear', '0.63', '0.77', '2.7', '0.48', 'Hegedus 2007 (17939613)', 'Weak alone'],
  ['Thessaly 20 deg', 'Single leg stance, knee 20, rotate 3 times. + joint line pain or locking', 'Meniscal tear', '0.64', '0.53', '1.4', '0.68', 'Goossens 2015 JOSPT (25420009)', 'Not useful in large study'],
  ['Valgus stress 30 deg', 'Valgus at 30 flexion. + pain or laxity', 'MCL lesion', 'pain 0.78', 'pain 0.67', '2.3', 'n/e', 'Kastelein 2008 Am J Med (18954845)', 'Primary care'],
  ['Clarke / patellar grind', 'Compress patella, quad contraction. + pain', 'Patellofemoral', '0.39', '0.67', '1.2', '0.91', 'Doberstein 2008 J Athl Train (18345345)', 'Discontinue'],
];
const ANKLE = [
  ['Anterior drawer', 'Stabilize tibia; draw heel forward. + excess translation', 'ATFL injury', '0.54', '0.87', '4.2', '0.53', 'Netterstrom-Wedin 2021 Sports Health MA (34286639)', 'Rule in'],
  ['ATFL palpation', '+ tenderness over ATFL', 'ATFL injury', '0.95 to 1.00', 'low', 'n/e', 'low', 'Netterstrom-Wedin 2021', 'Rule out'],
  ['Delayed exam, day 4 to 5', 'Swelling, hematoma, ATFL tenderness, anterior drawer combined', 'Lateral ligament rupture', '0.96', '0.84', '6.0', '0.05', 'van Dijk 1996 JBJS Br (8951015)', 'Whole exam'],
  ['Talar tilt', 'Inversion stress, ankle neutral. + excess tilt', 'CFL injury', 'n/e', 'high', 'n/e', 'n/e', 'Netterstrom-Wedin 2021', 'Rule in; limited'],
  ['Squeeze test', 'Compress tibia and fibula at mid calf. + distal pain', 'Syndesmosis injury', '0.26', '0.88', '2.2', '0.84', 'Sman 2015 BJSM (24255766)', 'Weak'],
  ['ER stress (Kleiger)', 'Knee 90; dorsiflex and externally rotate foot. + syndesmosis pain', 'Syndesmosis injury', '0.71', '0.63', '1.9', '0.46', 'Sman 2015 (24255766)', 'AITFL tenderness Sn 0.92'],
  ['Thompson', 'Prone; squeeze calf. + no plantarflexion', 'Achilles rupture', '0.96', '0.93', '13.7', '0.04', 'Maffulli 1998 AJSM (9548122)', 'Rule in and out'],
  ['Windlass (weight bearing)', 'Standing; passive great toe extension. + heel pain', 'Plantar fasciitis', '0.32', '1.00', 'high', '0.68', 'De Garceau 2003 Foot Ankle Int (12793489)', 'Rule in'],
];
const TMJ = [
  ['DC/TMD myalgia', 'Familiar pain with masseter or temporalis palpation or jaw movement', 'TMD myalgia', '0.90', '0.99', '90', '0.10', 'Schiffman 2014 J Oral Facial Pain (24482784)', 'Criteria set'],
  ['DC/TMD arthralgia', 'Familiar pain with TMJ palpation or movement', 'TMJ arthralgia', '0.89', '0.98', '44.5', '0.11', 'Schiffman 2014', 'Criteria set'],
  ['Disc displacement without reduction, limited opening', 'Locking history plus assisted opening under 40 mm', 'DDwoR', '0.80', '0.97', '27', '0.21', 'Schiffman 2014', ''],
  ['Disc displacement with reduction', 'Reproducible click on opening and closing', 'DDwR', '0.34', '0.92', '4.3', '0.72', 'Schiffman 2014', 'Imaging needed to confirm'],
];

// ---------- neuro ----------
const NCOLS = [900, 4600, 4300, 4600];
const NEURO = [
  ['C5', 'Lateral arm (deltoid patch)', 'Shoulder abduction, elbow flexion', 'Biceps'],
  ['C6', 'Lateral forearm, thumb, index', 'Wrist extension, elbow flexion', 'Brachioradialis (also biceps)'],
  ['C7', 'Middle finger', 'Elbow extension, wrist flexion', 'Triceps'],
  ['C8', 'Ring and little finger, medial forearm', 'Finger flexion', 'None reliable'],
  ['T1', 'Medial arm', 'Finger abduction', 'None'],
  ['L2', 'Anterior upper thigh', 'Hip flexion', 'None'],
  ['L3', 'Anterior lower thigh, medial knee', 'Knee extension', 'Patellar (L2 to L4)'],
  ['L4', 'Medial leg, medial malleolus', 'Ankle dorsiflexion', 'Patellar'],
  ['L5', 'Lateral leg, dorsum of foot, great toe', 'Great toe extension, hip abduction', 'None reliable (medial hamstring)'],
  ['S1', 'Lateral foot, sole, little toe', 'Ankle plantarflexion and eversion', 'Achilles'],
];

// ---------- ROM ----------
const RCOLS = [2400, 3200, 1700, 7100];
const ROM = [
  ['Cervical', 'Flexion', '50', 'AMA Guides 5th, inclinometry. AAOS lists 45'],
  ['', 'Extension', '60', 'AMA 5th. AAOS lists 45'],
  ['', 'Lateral flexion (each)', '45', 'AMA 5th and AAOS agree'],
  ['', 'Rotation (each)', '80', 'AMA 5th. AAOS lists 60; declines with age'],
  ['Thoracic', 'Rotation (each)', '30 to 35', 'AMA 5th lists 30. Flexion and extension not well standardized; record full or limited'],
  ['Lumbar', 'Flexion (true lumbar)', '60', 'AMA 5th, inclinometry, sacral motion subtracted'],
  ['', 'Extension', '25', 'AMA 5th'],
  ['', 'Lateral flexion (each)', '25', 'AMA 5th'],
  ['', 'Rotation (each)', 'about 30', 'Clinical convention only. AMA 5th does not rate lumbar rotation'],
  ['Shoulder', 'Flexion', '180', 'AAOS'],
  ['', 'Extension', '60', 'AAOS'],
  ['', 'Abduction', '180', 'AAOS'],
  ['', 'External rotation (90 abd)', '90', 'AAOS'],
  ['', 'Internal rotation (90 abd)', '70', 'AAOS'],
  ['Elbow / forearm', 'Flexion', '150', 'AAOS'],
  ['', 'Extension', '0', 'AAOS; up to 5 to 10 hyperextension can be normal'],
  ['', 'Pronation', '80', 'AAOS'],
  ['', 'Supination', '80', 'AAOS'],
  ['Wrist', 'Flexion', '80', 'AAOS'],
  ['', 'Extension', '70', 'AAOS'],
  ['', 'Radial deviation', '20', 'AAOS'],
  ['', 'Ulnar deviation', '30', 'AAOS'],
  ['Fingers', 'MCP flexion', '90', 'AAOS'],
  ['', 'PIP flexion', '100', 'AAOS'],
  ['', 'DIP flexion', '90', 'AAOS'],
  ['Thumb', 'CMC abduction', '70', 'AAOS'],
  ['', 'MCP flexion', '50', 'AAOS'],
  ['', 'IP flexion', '80', 'AAOS'],
  ['Hip', 'Flexion', '120', 'AAOS'],
  ['', 'Extension', '30', 'AAOS (some sources list 10 to 20)'],
  ['', 'Abduction', '45', 'AAOS'],
  ['', 'Adduction', '30', 'AAOS'],
  ['', 'Internal rotation', '45', 'AAOS. IR 25 or less is a Sutlive hip OA cluster item'],
  ['', 'External rotation', '45', 'AAOS'],
  ['Knee', 'Flexion', '135', 'AAOS (135 to 150 reported)'],
  ['', 'Extension', '0', 'AAOS'],
  ['Ankle', 'Dorsiflexion', '20', 'AAOS'],
  ['', 'Plantarflexion', '50', 'AAOS'],
  ['', 'Inversion', '35', 'AAOS'],
  ['', 'Eversion', '15', 'AAOS'],
  ['Great toe (1st MTP)', 'Extension', '70', 'AAOS'],
  ['', 'Flexion', '45', 'AAOS'],
  ['TMJ', 'Maximum opening', '40 mm or more', 'DC/TMD: assisted opening under 40 mm = limited'],
  ['', 'Lateral excursion (each)', 'about 8 to 12 mm', 'Typical textbook value'],
  ['', 'Protrusion', 'about 7 to 10 mm', 'Typical textbook value'],
];

// ---------- references ----------
const REFS = [
  'Appelboam A, et al. BMJ 2008;337:a2428. PMID 19066257',
  'Bachmann LM, et al. Ottawa ankle rules. BMJ 2003;326:417. PMID 12595378',
  'Bachmann LM, et al. Ottawa knee rule. Ann Intern Med 2004;140:121. PMID 14734335',
  'Barth JR, et al. Arthroscopy 2006;22:1076. PMID 17027405',
  'Benjaminse A, et al. J Orthop Sports Phys Ther 2006;36:267. PMID 16715828',
  'Chronopoulos E, et al. Am J Sports Med 2004;32:655. PMID 15090381',
  'Cook C, et al. J Orthop Sports Phys Ther 2009;39:172. PMID 19252263',
  'Cook C, et al. J Man Manip Ther 2010;18:175. PMID 22131790',
  'Cook C, et al. Physiother Res Int 2011;16:170. PMID 21077266',
  'Cook C, et al. J Manipulative Physiol Ther 2011. PMID 21899892',
  'Carpenter CR, et al. Acad Emerg Med 2014. PMID 24673666',
  'Doberstein ST, et al. J Athl Train 2008;43:190. PMID 18345345',
  'Factor S, et al. Medicina 2023;59:1159. PMID 37374364',
  'De Garceau D, et al. Foot Ankle Int 2003;24:251. PMID 12793489',
  'Do TP, et al. SNNOOP10. Neurology 2019;92:134. PMID 30587518',
  'Dreyfuss P, et al. Spine 1996;21:2594. PMID 8961447',
  'Farber AJ, et al. J Bone Joint Surg Am 2006;88:1467. PMID 16818971',
  'Fogarty A, et al. Spine 2018. PMID 29668564',
  'Goossens P, et al. J Orthop Sports Phys Ther 2015;45:18. PMID 25420009',
  'Goubau JF, et al. J Hand Surg Eur 2014;39:286. PMID 23340762',
  'Grimaldi A, et al. Br J Sports Med 2017;51:519. PMID 27633027',
  'Hallett M. NINDS myotatic reflex scale. Neurology 1993;43:2723',
  'Hegedus EJ, et al. Br J Sports Med 2008;42:80. PMID 17720798',
  'Hegedus EJ, et al. Br J Sports Med 2012;46:964. PMID 22773322',
  'Hegedus EJ, et al. J Orthop Sports Phys Ther 2007;37:541. PMID 17939613',
  'Hermans J, et al. JAMA 2013;310:837. PMID 23982370',
  'Hesmerg MK, et al. Knee 2024;47:81. PMID 38310817',
  'Itoi E, et al. Am J Sports Med 1999;27:65. PMID 9934421',
  'Jaeschke R, et al. Users guides: diagnostic tests. JAMA 1994;271:703. PMID 8309035',
  'Karachalios T, et al. Spine 1999;24:2318. PMID 10586455',
  'Kastelein M, et al. Am J Med 2008;121:982. PMID 18954845',
  'Ladermann A, et al. Knee Surg Sports Traumatol Arthrosc 2021;29:2118. PMID 32725446',
  'Laslett M, et al. Man Ther 2005;10:207. PMID 16038856',
  'Lequesne M, et al. Arthritis Rheum 2008;59:241. PMID 18240186',
  'Lo IK, et al. Am J Sports Med 2004;32:301. PMID 14977651',
  'MacDermid JC, Wessel J. J Hand Ther 2004;17:309. PMID 15162113',
  'Maffulli N. Am J Sports Med 1998;26:266. PMID 9548122',
  'Majlesi J, et al. J Clin Rheumatol 2008;14:87. PMID 18391677',
  'Mallee WH, et al. J Hand Surg Am 2014;39:1683. PMID 25091335',
  'Maslowski E, et al. PM R 2010;2:174. PMID 20359681',
  'Netterstrom-Wedin F, et al. Sports Health 2022;14:336. PMID 34286639',
  'Novak CB, et al. J Hand Surg Am 1994;19:817. PMID 7806810',
  "O'Driscoll SW, et al. Am J Sports Med 2005;33:231. PMID 15701609",
  "O'Driscoll SW, et al. Am J Sports Med 2007;35:1865. PMID 17687121",
  'Ogince M, et al. Man Ther 2007;12:256. PMID 17112768',
  'Parvizi J, et al. J Hand Surg Br 1998. PMID 9665518',
  'Park HB, et al. J Bone Joint Surg Am 2005;87:1446. PMID 15995110',
  'Reiman MP, et al. Br J Sports Med 2015;49:811. PMID 25515771',
  'Rubinstein RA, et al. Am J Sports Med 1994;22:550. PMID 7943523',
  'Schiffman E, et al. DC/TMD. J Oral Facial Pain Headache 2014;28:6. PMID 24482784',
  'Sman AD, et al. Br J Sports Med 2015;49:323. PMID 24255766',
  'Sokal PA, et al. Knee Surg Sports Traumatol Arthrosc 2022. PMID 35150292',
  'Soucie JM, et al. Range of motion normative values. Haemophilia 2011;17:500',
  'Sela Y, et al. J Hand Ther 2019;32:35. PMID 29150383',
  'Schmauss D, et al. J Clin Med 2022;11:6322. PMID 36362552',
  'Stolz M, et al. Prone instability test review, 2019. PMID 31733430',
  'Stiell IG, et al. Canadian C-spine rule. N Engl J Med 2003;349:2510. PMID 14695411',
  'Stuber K, et al. J Can Chiropr Assoc 2014;58:258. PMID 25202153',
  'Suri P, et al. Lumbar stenosis. JAMA 2010;304:2628. PMID 21156951',
  'Suri P, et al. Spine 2011;36:63. PMID 20543768',
  'Sutlive TG, et al. J Orthop Sports Phys Ther 2008;38:542. PMID 18758047',
  'Tong HC, et al. Spine 2002;27:156. PMID 11805661',
  'Uitvlugt G, Indenbaum S. Arthritis Rheum 1988;31:918. PMID 3395385',
  'van Dijk CN, et al. J Bone Joint Surg Br 1996;78:958. PMID 8951015',
  'van der Windt DA, et al. Cochrane Database Syst Rev 2010;CD007431. PMID 20166095',
  'Viikari-Juntura E, et al. Spine 1989;14:253. PMID 2711240',
  'Wainner RS, et al. Spine 2003;28:52. PMID 12544957',
  'Wainner RS, et al. Arch Phys Med Rehabil 2005;86:609. PMID 15827908',
  'Walton J, et al. J Bone Joint Surg Am 2004;86:807. PMID 15069148',
  'Range of motion: American Academy of Orthopaedic Surgeons, Joint Motion: Method of Measuring and Recording (1965); Greene WB, Heckman JD, The Clinical Measurement of Joint Motion (AAOS 1994); AMA Guides to the Evaluation of Permanent Impairment, 5th ed (2000).',
];

// ---------- document ----------
const children = [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Orthopedic and Neurologic Exam Reference', font: FONT, size: 40, bold: true, color: TEAL })] }),
  para([run('Evidence-based tests, clusters, red flag screens, and normal ranges of motion', { size: 22, color: NOTE })], { after: 40 }),
  para([run('Prepared by Ti Pence, DC   |   October 2026', { size: 18, color: NOTE })], { after: 160 }),

  h1('How to read this'),
  bullet([run('Sn (sensitivity): ', { bold: true }), run('a high-Sn test that is negative helps rule a condition out (SnNOut).')]),
  bullet([run('Sp (specificity): ', { bold: true }), run('a high-Sp test that is positive helps rule a condition in (SpPIn).')]),
  bullet([run('Likelihood ratios: ', { bold: true }), run('+LR over 10 or -LR under 0.1 shifts probability a lot; 5 to 10 or 0.1 to 0.2 moderately; 2 to 5 or 0.2 to 0.5 a little; near 1 not at all (Jaeschke 1994).')]),
  bullet([run('Clusters beat single tests. ', { bold: true }), run('Most single orthopedic tests are weak. Use the clusters in the shaded boxes, and interpret every result against history and pretest probability.')]),
  bullet([run('Caveats: ', { bold: true }), run('n/e = not established. var = variable across studies. Many values come from small or case-control samples, which overstate accuracy, and most clusters are not externally validated. Check the source population before applying a number.')]),

  h1('Cervical spine'),
  testTable(CERVICAL),
  cluster('Wainner cervical radiculopathy cluster:', 'Spurling A, distraction, ULTT A, and rotation under 60 deg toward the involved side. 3 of 4 positive: +LR 6.1. 4 of 4: +LR 30.3 (wide CI). ULTT A negative argues against radiculopathy (Wainner 2003).'),
  cluster('Cook myelopathy cluster:', 'Gait deviation, Hoffmann, inverted supinator, Babinski, age over 45. 1 or fewer positive: -LR 0.18. 3 or more of 5: +LR 30.9 (Cook 2010). Not externally validated.'),
  cluster('Canadian C-spine rule (alert, stable trauma):', 'Image if any high risk factor: age 65 or older, dangerous mechanism, extremity paresthesias. If a low risk factor allows assessment and the patient can actively rotate 45 deg left and right, no imaging. Sn 0.99, -LR about 0.01 (Stiell 2003).'),

  h1('Thoracic spine'),
  testTable(THORACIC),

  h1('Lumbar spine'),
  testTable(LUMBAR),
  cluster('Lumbar spinal stenosis history:', 'No pain when seated +LR 7.4; symptoms improve bending forward +LR 6.4; bilateral buttock or leg pain +LR 6.3; wide-based gait +LR 13 (Suri 2010, JAMA Rational Clinical Exam). Cook cluster (bilateral symptoms, leg pain more than back pain, pain with walking or standing, relief with sitting, age over 48): 4 of 5 +LR 4.6; none present -LR 0.19 (Cook 2011).'),

  h1('Sacroiliac joint'),
  testTable(SIJ),
  cluster('Laslett SIJ cluster:', 'Distraction, thigh thrust, compression, sacral thrust, Gaenslen. 3 or more positive: Sn 0.94, Sp 0.78, +LR 4.3. Fewer than 3: -LR 0.08. If all provocation tests are negative, SIJ pain is unlikely. Start with distraction and thigh thrust; 2 of the first 4 positive gives Sn 0.88, Sp 0.78 (Laslett 2005).'),

  h1('Hip'),
  testTable(HIP),
  cluster('Sutlive hip OA cluster:', 'Squatting aggravates; active hip flexion causes lateral hip pain; scour with adduction causes lateral hip or groin pain; active hip extension painful; passive IR 25 deg or less. 4 of 5 positive: +LR 24.3 (Sutlive 2008, preliminary).'),

  h1('Shoulder'),
  testTable(SHOULDER),
  cluster('Park subacromial cluster:', 'Hawkins Kennedy, painful arc, and infraspinatus (resisted ER) weakness. All 3 positive: +LR 10.6; all 3 negative makes impingement unlikely (Park 2005).'),

  h1('Elbow'),
  testTable(ELBOW),

  h1('Wrist and hand'),
  testTable(WRIST),
  cluster('Wainner carpal tunnel cluster:', 'Shaking hands relieves symptoms, wrist ratio over 0.67, symptom severity scale over 1.9, diminished thumb pulp sensation, age over 45. 5 of 5 positive: +LR 18.3 (Wainner 2005).'),
  cluster('Scaphoid after a fall:', 'Snuffbox tenderness, scaphoid tubercle tenderness, and axial thumb compression combined within 24 hours: Sn 1.00, Sp 0.74 (Parvizi 1998). A negative snuffbox exam lowers probability (-LR 0.15) but treat clinically suspected fractures as fractures.'),

  h1('Knee'),
  testTable(KNEE),
  cluster('Ottawa knee rule:', 'X-ray if any: age 55 or older, isolated patellar tenderness, fibular head tenderness, cannot flex to 90 deg, cannot bear weight 4 steps immediately and at exam. Sn 0.99, -LR 0.05 (Bachmann 2004).'),

  h1('Ankle and foot'),
  testTable(ANKLE),
  cluster('Ottawa ankle and foot rules:', 'X-ray if malleolar zone pain plus bone tenderness at the posterior edge or tip of either malleolus (distal 6 cm), or midfoot pain plus tenderness at the base of the 5th metatarsal or navicular, or inability to bear weight 4 steps immediately and at exam. Sn about 0.98, -LR 0.08 (Bachmann 2003).'),

  h1('Temporomandibular joint'),
  testTable(TMJ),

  h1('Neurologic screen'),
  table(NCOLS, ['Level', 'Dermatome (sensation)', 'Myotome (strength)', 'Reflex'], NEURO),
  para('', { after: 60 }),
  table([2400, 12000], ['Reflex grade', 'Meaning (NINDS scale, Hallett 1993)'], [
    ['0', 'Absent'], ['1+', 'Trace, or present only with reinforcement'], ['2+', 'Normal (lower half of range)'], ['3+', 'Brisk (upper half of range)'], ['4+', 'Enhanced, with clonus'],
  ]),
  para('', { after: 60 }),
  cluster('Upper motor neuron signs:', 'Hoffmann, Babinski, inverted supinator, sustained clonus, hyperreflexia, wide-based or spastic gait, Lhermitte. Any new UMN sign changes the plan: refer.'),
  cluster('Strength grading (MRC):', '0 none, 1 flicker, 2 movement with gravity eliminated, 3 against gravity, 4 against some resistance, 5 normal.'),

  h1('Red flag screens'),
  cluster('Cauda equina:', 'Saddle anesthesia, new bladder or bowel dysfunction (retention or incontinence), bilateral or progressive leg weakness or sensory loss, sexual dysfunction. Same day emergency referral.'),
  cluster('Cervical artery (5 Ds and 3 Ns):', 'Dizziness, diplopia, dysarthria, dysphagia, drop attacks; nausea, numbness, nystagmus. Also new severe neck pain or headache unlike prior, ataxia, Horner signs. Provocation tests have poor validity; history matters most.'),
  cluster('Headache, SNNOOP10 (Do 2019):', 'Systemic symptoms including fever; Neoplasm history; Neurologic deficit or decreased consciousness; Onset sudden (thunderclap); Older age, onset after 65; Pattern change or recent new headache; Positional; Precipitated by sneezing, coughing, or exercise; Papilledema; Progressive or atypical; Pregnancy or puerperium; Painful eye with autonomic features; Posttraumatic; Pathology of the immune system such as HIV; Painkiller overuse or new drug at onset.'),
  cluster('Fracture, malignancy, infection:', 'Significant trauma, osteoporosis, long-term steroids, age over 50 with new pain, cancer history, unexplained weight loss, fever, IV drug use, immunosuppression, unrelenting night pain.'),

  h1('Normal ranges of motion (degrees)'),
  table(RCOLS, ['Region', 'Motion', 'Normal', 'Source and notes'], ROM, { center: [2] }),
  para([run('Norms are reference values, not targets. ROM falls with age and differs by sex; compare to the uninvolved side when one exists (Soucie 2011, CDC normative data). Spine values follow AMA Guides 5th inclinometry; extremity values follow AAOS.', { size: 16, italics: true, color: NOTE })], { before: 60 }),

  h1('References'),
  ...REFS.map((r) => para(r, { size: 15, after: 20 })),
];

const doc = new Document({
  creator: 'Ti Pence, DC',
  title: 'Orthopedic and Neurologic Exam Reference',
  styles: { default: { document: { run: { font: FONT, size: 18 } } } },
  numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      run('Ortho / Neuro / ROM Reference   |   Ti Pence, DC   |   page ', { size: 14, color: NOTE }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: NOTE }),
    ] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(__dirname + '/Ortho_Neuro_ROM_Reference.docx', b);
  console.log('wrote Ortho_Neuro_ROM_Reference.docx');
});
