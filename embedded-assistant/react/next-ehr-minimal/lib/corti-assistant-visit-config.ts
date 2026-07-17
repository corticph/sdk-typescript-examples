import { getConsultationTemplate } from "@/lib/consultation-templates";
import type {
  Fact,
  InlineTemplate,
  InlineTemplateLabel,
} from "@/lib/corti-assistant-embedded-payloads";
import type {
  CortiStandardSectionFamily,
  CortiStandardSectionIds,
} from "@/lib/corti-standard-sections";
import type { ConsultationType, PatientSummary, RecordEntryType } from "@/lib/ehr-types";

const SYNC_SCHEMA_VERSION = "next-ehr-minimal-v1";
const FACT_TEXT_LIMIT = 100;
const CHECKLIST_QUESTIONS_PER_SECTION = 2;
const CHEAT_FACTS_PER_VISIT = 20;

type OutputSchema = Record<string, unknown>;

type OutputSchemaField = {
  key: string;
  description: string;
  value: OutputSchema;
};

export type CortiAssistantChecklistItem = {
  id: string;
  title: string;
  questions: string[];
};

export type CortiAssistantVisitConfig = {
  templateLabel: string;
  patientFacts: Fact[];
  cheatFacts: Fact[];
  inlineTemplate: InlineTemplate;
  checklistItems: CortiAssistantChecklistItem[];
};

type VisitSectionDefinition = {
  id: string;
  heading: string;
  standardSectionFamily?: CortiStandardSectionFamily;
  overrideInheritedContentPrompt?: boolean;
  overrideInheritedWritingStylePrompt?: boolean;
  syncTarget: string;
  formFields: string[];
  recordEntryType?: RecordEntryType;
  contentPrompt: string;
  writingStylePrompt?: string;
  outputSchema: OutputSchema;
  defaultQuestions: string[];
  questionsByConsultationType?: Partial<Record<ConsultationType, string[]>>;
  include?: (consultationType: ConsultationType) => boolean;
};

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function labels(
  entries: Record<string, string | number | null | undefined>,
): InlineTemplateLabel[] {
  return Object.entries(entries).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return [];
    }

    return [{ key, value: String(value) }];
  });
}

function stringNode(description: string): OutputSchema {
  return {
    type: "string",
    default: "Not recorded",
    description,
  };
}

function patternedStringNode(description: string, pattern: string): OutputSchema {
  return {
    type: "string",
    description,
    pattern,
  };
}

function enumNode(description: string, values: string[]): OutputSchema {
  return {
    type: "string",
    enum: values,
    description,
  };
}

function numberNode(description: string, minimum: number, maximum: number): OutputSchema {
  return {
    type: "number",
    default: 0,
    minimum: 0,
    maximum,
    description: `${description} Use 0 when not recorded. Expected clinical range: ${minimum}-${maximum}.`,
  };
}

function field(key: string, description: string, value: OutputSchema): OutputSchemaField {
  return { key, description, value };
}

function objectSchema(
  description: string,
  fields: OutputSchemaField[],
  fieldFormat = "{key}: {value}\n",
): OutputSchema {
  return {
    type: "object",
    description,
    fieldFormat,
    fields,
  };
}

const visitSectionDefinitions: readonly VisitSectionDefinition[] = [
  {
    id: "subjective",
    heading: "Subjective",
    standardSectionFamily: "corti-subjective",
    syncTarget: "consultation.subjective",
    formFields: ["subjective"],
    recordEntryType: "history",
    contentPrompt:
      "Capture the patient-reported reason for visit, symptom history, concerns, relevant background, and context. Exclude objective findings, diagnoses, and plan items.",
    writingStylePrompt: "Concise clinical prose, suitable for a primary-care EHR note.",
    outputSchema: objectSchema("Subjective note fields for the host EHR.", [
      field(
        "subjective",
        "Patient-reported symptoms, concerns, relevant history, and context.",
        stringNode("Use Not recorded only when no subjective history was discussed."),
      ),
    ]),
    defaultQuestions: [
      "What brought the patient in today?",
      "When did it start, and how has it changed?",
      "What relevant history or concern should be captured?",
    ],
    questionsByConsultationType: {
      "annual-checkup": [
        "Any new concerns since the last review?",
        "Any lifestyle, family history, or screening updates?",
      ],
      "lab-test": [
        "What symptom, risk, or monitoring need prompted the test?",
        "What result or outcome is the patient expecting?",
      ],
      vaccination: [
        "Any contraindications, allergies, or previous vaccine reactions?",
        "Does the patient understand the reason for immunization?",
      ],
      prenatal: [
        "Any maternal symptoms, fetal movement concerns, or antenatal risks?",
        "Any change since the previous antenatal contact?",
      ],
      "medication-review": [
        "Which medicines are being reviewed and why?",
        "Any adherence issues, side effects, or patient concerns?",
      ],
    },
  },
  {
    id: "objective-findings",
    heading: "Objective findings",
    standardSectionFamily: "corti-objective",
    overrideInheritedContentPrompt: true,
    syncTarget: "consultation.objective.findings",
    formFields: ["objective"],
    recordEntryType: "examination",
    contentPrompt:
      "Capture only examination findings and clinician-observed objective details. Exclude advice, follow-up, prescriptions, investigations, referrals, planned actions, outcomes, vital signs, and body metrics, which have dedicated sections.",
    writingStylePrompt: "Use terse clinical phrasing. Do not invent findings or plan items.",
    outputSchema: objectSchema("Objective examination findings for the host EHR.", [
      field(
        "objective",
        "Clinician-observed examination findings and objective details.",
        stringNode("Use Not recorded only when no objective findings were documented."),
      ),
    ]),
    defaultQuestions: [
      "What did you observe or examine?",
      "Were there positive and negative findings worth recording?",
    ],
  },
  {
    id: "vitals",
    heading: "Vitals",
    standardSectionFamily: "corti-vital-signs",
    syncTarget: "consultation.objective.vitals",
    formFields: ["bloodPressure", "heartRate", "temperatureC"],
    recordEntryType: "vitals",
    contentPrompt:
      "Extract vital signs recorded during this consultation. Use only values explicitly stated or measured.",
    writingStylePrompt: "Render as stable key-value lines for EHR synchronization.",
    outputSchema: objectSchema(
      "Structured vital signs for the host EHR.",
      [
        field(
          "bloodPressure",
          "Blood pressure in systolic/diastolic format, for example 124/78. Use Not recorded if absent.",
          patternedStringNode(
            "Blood pressure as systolic/diastolic. Leave empty if not recorded.",
            "^\\d{2,3}/\\d{2,3}$",
          ),
        ),
        field(
          "heartRate",
          "Heart rate in beats per minute.",
          numberNode("Heart rate bpm.", 40, 180),
        ),
        field(
          "temperatureC",
          "Temperature in degrees Celsius.",
          numberNode("Temperature C.", 34, 42),
        ),
      ],
      "bloodPressure={bloodPressure}\nheartRate={heartRate}\ntemperatureC={temperatureC}\n",
    ),
    defaultQuestions: [
      "Was blood pressure measured?",
      "Was heart rate measured?",
      "Was temperature measured?",
    ],
    questionsByConsultationType: {
      "annual-checkup": ["Capture routine observations before moving on."],
      prenatal: ["Are maternal observations available alongside fetal measures?"],
    },
  },
  {
    id: "body-metrics",
    heading: "Body metrics",
    syncTarget: "consultation.objective.bodyMetrics",
    formFields: ["heightCm", "weightKg", "bmi"],
    recordEntryType: "body-metrics",
    contentPrompt:
      "Extract body measurements recorded during the visit. Use only values explicitly stated or measured.",
    writingStylePrompt: "Render as stable key-value lines for EHR synchronization.",
    outputSchema: objectSchema(
      "Structured body measurements for the host EHR.",
      [
        field("heightCm", "Height in centimetres.", numberNode("Height cm.", 40, 230)),
        field("weightKg", "Weight in kilograms.", numberNode("Weight kg.", 1, 350)),
        field("bmi", "Body mass index.", numberNode("BMI.", 5, 80)),
      ],
      "heightCm={heightCm}\nweightKg={weightKg}\nbmi={bmi}\n",
    ),
    defaultQuestions: [
      "Was height recorded?",
      "Was weight recorded?",
      "Should BMI be calculated or documented?",
    ],
    questionsByConsultationType: {
      "annual-checkup": ["Capture height, weight, and BMI for preventive review."],
      prenatal: ["Is weight relevant to this antenatal review?"],
    },
  },
  {
    id: "assessment",
    heading: "Assessment",
    standardSectionFamily: "corti-assessment",
    syncTarget: "consultation.assessment",
    formFields: ["assessment"],
    recordEntryType: "diagnosis",
    contentPrompt:
      "Summarize the working diagnosis, differential, clinical impression, and interpretation of findings.",
    writingStylePrompt: "Brief clinical reasoning, no plan items unless needed for context.",
    outputSchema: objectSchema("Assessment fields for the host EHR.", [
      field(
        "assessment",
        "Clinical impression, differential diagnosis, or diagnostic assessment.",
        stringNode("Use Not recorded only when no assessment was discussed."),
      ),
    ]),
    defaultQuestions: [
      "What is the working diagnosis or impression?",
      "What alternatives or uncertainty should be noted?",
    ],
    questionsByConsultationType: {
      "lab-test": ["What clinical question should the investigation answer?"],
      vaccination: ["Is the patient eligible for the vaccine today?"],
      "medication-review": ["What medication-related problem or risk was identified?"],
    },
  },
  {
    id: "plan",
    heading: "Plan",
    standardSectionFamily: "corti-plan",
    syncTarget: "consultation.plan",
    formFields: ["plan"],
    recordEntryType: "care-plan",
    contentPrompt:
      "Capture advice, follow-up, safety-netting, prescriptions, investigations, referrals, and planned actions. Exclude examination findings and objective measurements.",
    writingStylePrompt: "Action-oriented, concise, and suitable for a primary-care EHR plan field.",
    outputSchema: objectSchema("Plan fields for the host EHR.", [
      field(
        "plan",
        "Advice, safety-netting, follow-up, and planned actions.",
        stringNode("Use Not recorded only when no plan was discussed."),
      ),
    ]),
    defaultQuestions: [
      "What advice or treatment was agreed?",
      "What follow-up or safety-netting is needed?",
    ],
    questionsByConsultationType: {
      "annual-checkup": ["Any screening, lifestyle, or prevention actions?"],
      "lab-test": ["What happens after the test is ordered or resulted?"],
      vaccination: ["What aftercare or follow-up advice was given?"],
      prenatal: ["What antenatal follow-up or escalation plan is needed?"],
      "medication-review": ["What medicine changes, monitoring, or review interval was agreed?"],
    },
  },
  {
    id: "diagnostic-tests",
    heading: "Diagnostic tests ordered",
    standardSectionFamily: "corti-diagnostic-tests-ordered",
    syncTarget: "consultation.orders.diagnosticTests",
    formFields: ["testName", "testReason"],
    recordEntryType: "test-order",
    contentPrompt:
      "Capture diagnostic tests ordered or performed at this visit and the clinical reason for each test.",
    writingStylePrompt: "Render as stable key-value lines for EHR synchronization.",
    outputSchema: objectSchema(
      "Structured diagnostic test order data for the host EHR.",
      [
        field(
          "testName",
          "Name of the diagnostic test ordered or performed.",
          stringNode("Test name."),
        ),
        field(
          "testReason",
          "Clinical reason or question for the test.",
          stringNode("Test reason."),
        ),
      ],
      "testName={testName}\ntestReason={testReason}\n",
    ),
    defaultQuestions: [
      "Was a diagnostic test ordered or performed?",
      "What clinical reason should be attached to it?",
    ],
    questionsByConsultationType: {
      "annual-checkup": ["Are routine screening or monitoring tests needed?"],
      "lab-test": [
        "Which test is required and why?",
        "Is this ordered, performed, or awaiting result?",
      ],
      prenatal: ["Are any antenatal investigations needed?"],
    },
  },
  {
    id: "vaccination",
    heading: "Vaccination",
    standardSectionFamily: "corti-immunizations",
    syncTarget: "consultation.procedures.vaccination",
    formFields: ["vaccine", "vaccineDose", "vaccineSite", "vaccineBatch", "vaccineStatus"],
    recordEntryType: "vaccination",
    contentPrompt:
      "Capture vaccination details discussed or administered at this visit. Use only explicitly stated values.",
    writingStylePrompt: "Render as stable key-value lines for EHR synchronization.",
    outputSchema: objectSchema(
      "Structured vaccination data for the host EHR.",
      [
        field("vaccine", "Vaccine name.", stringNode("Vaccine name.")),
        field("vaccineDose", "Dose administered or planned.", stringNode("Dose.")),
        field("vaccineSite", "Administration site.", stringNode("Site.")),
        field("vaccineBatch", "Batch or lot number.", stringNode("Batch.")),
        field(
          "vaccineStatus",
          "Vaccination status matching the EHR select field.",
          enumNode("Vaccination status.", ["administered", "planned", "declined"]),
        ),
      ],
      "vaccine={vaccine}\nvaccineDose={vaccineDose}\nvaccineSite={vaccineSite}\nvaccineBatch={vaccineBatch}\nvaccineStatus={vaccineStatus}\n",
    ),
    defaultQuestions: [
      "Was a vaccine administered, planned, or declined?",
      "Do dose, site, and batch need to be recorded?",
    ],
    questionsByConsultationType: {
      vaccination: [
        "Confirm vaccine name, dose, site, and batch.",
        "Was consent given and status recorded?",
      ],
      prenatal: ["Were antenatal immunizations discussed or given?"],
    },
  },
  {
    id: "maternity",
    heading: "Maternity",
    syncTarget: "consultation.prenatal.maternity",
    formFields: ["gestationWeeks", "fetalHeartRate", "fundalHeightCm", "maternityNotes"],
    recordEntryType: "maternity",
    contentPrompt:
      "Capture antenatal observations, gestation, fetal heart rate, fundal height, fetal movement, concerns, and follow-up.",
    writingStylePrompt: "Render numeric antenatal measurements as stable key-value lines.",
    outputSchema: objectSchema(
      "Structured prenatal data for the host EHR.",
      [
        field("gestationWeeks", "Gestation in weeks.", numberNode("Gestation weeks.", 4, 43)),
        field(
          "fetalHeartRate",
          "Fetal heart rate in beats per minute.",
          numberNode("Fetal heart rate bpm.", 80, 220),
        ),
        field(
          "fundalHeightCm",
          "Fundal height in centimetres.",
          numberNode("Fundal height cm.", 8, 50),
        ),
        field(
          "maternityNotes",
          "Antenatal observations, concerns, fetal movement, or follow-up.",
          stringNode("Maternity notes."),
        ),
      ],
      "gestationWeeks={gestationWeeks}\nfetalHeartRate={fetalHeartRate}\nfundalHeightCm={fundalHeightCm}\nmaternityNotes={maternityNotes}\n",
    ),
    defaultQuestions: [
      "What is the gestation?",
      "Was fetal heart rate or fundal height measured?",
      "Any fetal movement concerns or antenatal follow-up?",
    ],
    include: (consultationType) => consultationType === "prenatal",
  },
  {
    id: "outcome",
    heading: "Outcome",
    syncTarget: "consultation.outcome",
    formFields: ["outcomeType", "outcomeDetails"],
    contentPrompt:
      "Capture the final visit outcome: advice only, prescription, or referral, with details when relevant.",
    writingStylePrompt: "Render as stable key-value lines for EHR synchronization.",
    outputSchema: objectSchema(
      "Structured outcome data for the host EHR.",
      [
        field(
          "outcomeType",
          "Outcome type matching the EHR select field.",
          enumNode("Outcome type.", ["none", "prescription", "referral"]),
        ),
        field(
          "outcomeDetails",
          "Medication, referral destination, or summary of advice only.",
          stringNode("Outcome details."),
        ),
      ],
      "outcomeType={outcomeType}\noutcomeDetails={outcomeDetails}\n",
    ),
    defaultQuestions: [
      "Is the outcome advice only, a prescription, or a referral?",
      "What details are needed for the selected outcome?",
    ],
    questionsByConsultationType: {
      "medication-review": ["If prescribing, what medicine and instructions should sync?"],
      "lab-test": ["Is the outcome only the test order, or is follow-up advice needed?"],
      vaccination: ["Should the outcome document administered, planned, or declined vaccination?"],
    },
  },
];

function getSectionsForConsultation(consultationType: ConsultationType) {
  return visitSectionDefinitions.filter((section) => section.include?.(consultationType) ?? true);
}

function buildPatientFacts(patient: PatientSummary, reason: string): Fact[] {
  return [
    `Patient: ${patient.fullName}`,
    `Date of birth: ${patient.dob}`,
    `Age: ${patient.age} yrs`,
    `Gender: ${patient.sex}`,
    `Chronic conditions: ${patient.chronicConditions}`,
    `Allergies: ${patient.allergies}`,
    `Reason for visit: ${reason}`,
  ].map((text) => ({
    text: truncate(text, FACT_TEXT_LIMIT),
    group: "other",
  }));
}

type CheatFactContext = {
  patient: PatientSummary;
  reason: string;
};

const cheatFactTextByConsultationType = {
  "general-gp": ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "Symptoms began four days ago and are gradually improving.",
    "Main symptoms are dry cough, sore throat, blocked nose, and fatigue.",
    "No chest pain, shortness of breath, haemoptysis, or confusion.",
    "No fever measured at home; appetite and oral fluids are maintained.",
    "Asthma is stable; no recent reliever overuse or night waking.",
    "No new medication allergies; existing allergies reviewed.",
    "Patient is worried about a chest infection and asks if antibiotics are needed.",
    "Observed comfortable at rest, speaking full sentences, no respiratory distress.",
    "Chest is clear on auscultation with no wheeze or focal crackles.",
    "Throat mildly erythematous without exudate; cervical nodes not enlarged.",
    "Blood pressure 124/78, heart rate 82 bpm, temperature 36.8 C.",
    "Height 172 cm, weight 76 kg, BMI 25.7.",
    "Assessment is likely viral upper respiratory tract infection.",
    "No red flags or clinical indication for antibiotics today.",
    "Plan is fluids, rest, paracetamol as needed, and saline nasal spray.",
    "Safety net: seek urgent help for breathlessness, chest pain, or persistent fever.",
    "No diagnostic test ordered today.",
    "No vaccination administered or planned during this visit.",
    "Outcome is advice only; follow up if symptoms worsen or persist beyond ten days.",
  ],
  "annual-checkup": ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "No new acute symptoms, chest pain, breathlessness, weight loss, or bowel changes.",
    "Sleep and mood are stable; patient reports moderate work stress.",
    "Exercises by brisk walking three times weekly for about thirty minutes.",
    "Diet is mixed; patient wants to reduce salt and late evening snacks.",
    "Alcohol is within recommended limits; patient does not smoke.",
    "Family history includes hypertension in father and type 2 diabetes in mother.",
    "Screening is up to date except routine blood tests due this month.",
    "Observed well, alert, comfortable, and independently mobile.",
    "Cardiorespiratory examination normal; no ankle oedema.",
    "Blood pressure 132/84, heart rate 74 bpm, temperature 36.6 C.",
    "Height 168 cm, weight 82 kg, BMI 29.1.",
    "Assessment is preventive review with raised cardiometabolic risk.",
    "Plan is lifestyle advice on salt reduction, activity, weight, and sleep routine.",
    "Order HbA1c, lipid profile, renal function, and liver function tests.",
    "Reason for tests is annual cardiometabolic screening and risk stratification.",
    "No vaccine administered today; influenza vaccine discussed for autumn clinic.",
    "Patient understands when results will be available and prefers portal message.",
    "Outcome is advice only with results review after blood tests return.",
    "Follow up in three months if blood pressure or blood results are abnormal.",
  ],
  "lab-test": ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "Primary concern is increased thirst and tiredness for six weeks.",
    "No weight loss, vomiting, abdominal pain, confusion, or acute visual symptoms.",
    "Patient has family history of type 2 diabetes in mother.",
    "No current steroid use and no recent acute infection.",
    "No physical examination performed; consultation focused on investigation request.",
    "Observed well, hydrated, and comfortable while discussing symptoms.",
    "Blood pressure 128/80, heart rate 76 bpm, temperature 36.7 C.",
    "Height 170 cm, weight 88 kg, BMI 30.4.",
    "Assessment is possible dysglycaemia requiring blood test confirmation.",
    "Differential includes diabetes, anaemia, thyroid disease, and poor sleep.",
    "Order HbA1c, fasting glucose, FBC, TSH, renal profile, and urine ACR.",
    "Reason for tests is thirst, fatigue, raised BMI, and family history of diabetes.",
    "Patient will attend phlebotomy tomorrow morning after overnight fast.",
    "Plan is portal message with results within three working days.",
    "Safety net: seek same-day care for vomiting, confusion, or severe dehydration.",
    "No vaccination administered or planned during this visit.",
    "No prescription issued today while awaiting diagnostic results.",
    "Outcome is advice only; follow-up appointment if HbA1c is abnormal.",
    "Patient agrees to avoid sugary drinks while waiting for results.",
  ],
  vaccination: ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "Patient feels well today with no fever or acute illness.",
    "No previous severe vaccine reaction or egg allergy reported.",
    "Reason for immunization and expected side effects were explained.",
    "Patient gave verbal consent after opportunity for questions.",
    "Observed well, alert, and comfortable before vaccination.",
    "Injection site skin intact with no local infection.",
    "Blood pressure not required; heart rate 72 bpm, temperature 36.5 C.",
    "Assessment is eligible for vaccination today with no contraindications.",
    "Vaccine administered: seasonal influenza quadrivalent vaccine.",
    "Dose administered: 0.5 mL intramuscular injection.",
    "Administration site: left deltoid.",
    "Batch number recorded as FLU26-A14.",
    "Vaccination status is administered.",
    "No diagnostic test ordered today.",
    "Plan is to remain in clinic briefly and report immediate adverse symptoms.",
    "Aftercare advice: expect mild arm soreness, use paracetamol if needed.",
    "Safety net: seek help for rash, breathing difficulty, or facial swelling.",
    "Outcome is advice only with vaccination documented as completed.",
    "Next routine vaccination review due at next seasonal campaign.",
  ],
  prenatal: ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "Gestation is 28 weeks by confirmed dating scan.",
    "Fetal movements are normal and unchanged from usual pattern.",
    "No vaginal bleeding, fluid loss, severe headache, visual symptoms, or epigastric pain.",
    "Mild ankle swelling at end of day improves with rest.",
    "No contractions; patient reports intermittent low back ache only.",
    "Previous antenatal bloods were normal and rhesus status is documented.",
    "Observed comfortable, well perfused, and not breathless at rest.",
    "Blood pressure 118/72, heart rate 88 bpm, temperature 36.7 C.",
    "Weight 73 kg, height 165 cm, BMI 26.8.",
    "Fundal height is 28 cm, appropriate for gestation.",
    "Fetal heart rate is 144 bpm on handheld Doppler.",
    "Urine dip was negative for protein, glucose, nitrites, and ketones.",
    "Assessment is routine antenatal review with reassuring maternal and fetal findings.",
    "Plan is routine midwife follow-up at 31 weeks and continue antenatal vitamins.",
    "Safety net: call maternity triage for reduced movements, bleeding, severe pain, or headache.",
    "Order routine 28-week bloods: FBC and antibody screen.",
    "Pertussis vaccine was discussed and patient plans to receive it at next visit.",
    "Outcome is advice only; no prescription or referral needed today.",
    "Patient understands fetal movement advice and when to seek urgent review.",
  ],
  "medication-review": ({ patient, reason }: CheatFactContext) => [
    `${patient.fullName} attends for ${reason.toLowerCase()}.`,
    "Review focuses on ramipril started six weeks ago for hypertension.",
    "Patient takes medication every morning and has missed one dose this month.",
    "No dizziness, collapse, ankle swelling, cough, or facial swelling.",
    "Home blood pressure readings average 132/78 over the past two weeks.",
    "Patient wants to know whether long-term treatment is still needed.",
    "Renal function and potassium were normal on monitoring bloods last week.",
    "Observed well, comfortable, and not clinically dehydrated.",
    "Blood pressure 130/76, heart rate 70 bpm, temperature 36.6 C.",
    "Height 174 cm, weight 84 kg, BMI 27.7.",
    "Assessment is hypertension improved and ramipril tolerated.",
    "No adverse effects or monitoring concerns identified today.",
    "Plan is continue ramipril 5 mg once daily.",
    "Prescription renewed for 56 tablets with usual dosing instructions.",
    "Advise home blood pressure diary twice weekly for the next month.",
    "Safety net: report dizziness, swelling, persistent cough, or pregnancy possibility.",
    "No diagnostic test ordered today because recent renal monitoring is normal.",
    "No vaccination administered or planned during this review.",
    "Outcome type is prescription with ramipril renewal details.",
    "Follow up medication review in six months unless blood pressure rises.",
  ],
} satisfies Record<ConsultationType, (context: CheatFactContext) => string[]>;

function buildCheatFacts(
  consultationType: ConsultationType,
  patient: PatientSummary,
  reason: string,
): Fact[] {
  return cheatFactTextByConsultationType[consultationType]({ patient, reason })
    .slice(0, CHEAT_FACTS_PER_VISIT)
    .map((text) => ({
      text: truncate(text, FACT_TEXT_LIMIT),
      group: "other",
    }));
}

function buildSectionInstructions(section: VisitSectionDefinition, inheritFromId?: string) {
  if (inheritFromId) {
    return {
      contentPrompt: section.contentPrompt,
      ...(section.overrideInheritedWritingStylePrompt && section.writingStylePrompt
        ? { writingStylePrompt: section.writingStylePrompt }
        : {}),
    };
  }

  return {
    contentPrompt: section.contentPrompt,
    ...(section.writingStylePrompt ? { writingStylePrompt: section.writingStylePrompt } : {}),
  };
}

function buildInlineTemplate({
  appointmentId,
  consultationType,
  patient,
  reason,
  standardSectionIds = {},
}: {
  appointmentId?: number;
  consultationType: ConsultationType;
  patient: PatientSummary;
  reason: string;
  standardSectionIds?: CortiStandardSectionIds;
}): InlineTemplate {
  const template = getConsultationTemplate(consultationType);
  const sections = getSectionsForConsultation(consultationType);

  return {
    id: `harbour-${consultationType}-inline-sync-note`,
    name: `${template.label} EHR sync note`,
    labels: labels({
      "ehr.integration": "harbour-family-practice",
      "ehr.syncSchema": SYNC_SCHEMA_VERSION,
      "ehr.consultationType": consultationType,
      "ehr.patientId": patient.id,
      "ehr.appointmentId": appointmentId,
      "ehr.reason": truncate(reason, 80),
      "assistant.defaultBehaviour": "force-first-document",
    }),
    generation: {
      instructions: {
        prompt: `Generate a ${template.label.toLowerCase()} document for Harbour Family Practice. Use only the consultation evidence and patient background facts. Keep each section aligned to its output schema and labels so the host EHR can sync it safely.`,
      },
      sections: sections.map((section) => {
        const inheritFromId = section.standardSectionFamily
          ? standardSectionIds[section.standardSectionFamily]
          : undefined;
        const instructions = buildSectionInstructions(section, inheritFromId);

        return {
          ...(inheritFromId ? { inheritFromId } : {}),
          heading: section.heading,
          labels: labels({
            "ehr.sectionKey": section.id,
            "ehr.syncTarget": section.syncTarget,
            "ehr.formFields": section.formFields.join(","),
            "ehr.recordEntryType": section.recordEntryType,
            "ehr.consultationType": consultationType,
            "ehr.syncSchema": SYNC_SCHEMA_VERSION,
            "ehr.inheritedStandardFamily": section.standardSectionFamily,
          }),
          instructions,
          outputSchema: section.outputSchema,
        };
      }),
    },
  };
}

function buildChecklistItems(consultationType: ConsultationType): CortiAssistantChecklistItem[] {
  return getSectionsForConsultation(consultationType).map((section) => ({
    id: section.id,
    title: section.heading,
    questions: [
      ...(section.questionsByConsultationType?.[consultationType] ?? []),
      ...section.defaultQuestions,
    ].slice(0, CHECKLIST_QUESTIONS_PER_SECTION),
  }));
}

export function buildCortiAssistantVisitConfig({
  appointmentId,
  consultationType,
  patient,
  reason,
  standardSectionIds,
}: {
  appointmentId?: number;
  consultationType: ConsultationType;
  patient: PatientSummary;
  reason: string;
  standardSectionIds?: CortiStandardSectionIds;
}): CortiAssistantVisitConfig {
  const inlineTemplate = buildInlineTemplate({
    appointmentId,
    consultationType,
    patient,
    reason,
    standardSectionIds,
  });

  return {
    templateLabel: getConsultationTemplate(consultationType).label,
    patientFacts: buildPatientFacts(patient, reason),
    cheatFacts: buildCheatFacts(consultationType, patient, reason),
    inlineTemplate,
    checklistItems: buildChecklistItems(consultationType),
  };
}
