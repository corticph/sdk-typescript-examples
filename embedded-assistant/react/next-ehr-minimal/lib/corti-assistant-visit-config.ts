import type { Fact } from "@corti/embedded-web";
import { CORTI_SOAP_SECTIONS, CORTI_SOAP_TEMPLATE_ID } from "@/lib/corti-soap-template";
import type { PatientSummary } from "@/lib/ehr-types";

const FACT_TEXT_LIMIT = 100;

export type CortiAssistantChecklistItem = {
  id: string;
  title: string;
  questions: string[];
};

export type CortiAssistantVisitConfig = {
  templateId: string;
  templateLabel: string;
  patientFacts: Fact[];
  cheatFacts: Fact[];
  checklistItems: CortiAssistantChecklistItem[];
};

function truncate(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= FACT_TEXT_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, FACT_TEXT_LIMIT - 3).trimEnd()}...`;
}

function toFacts(values: string[]): Fact[] {
  return values.map((text) => ({ text: truncate(text), group: "other" }));
}

function buildPatientFacts(patient: PatientSummary, reason: string) {
  return toFacts([
    `Patient: ${patient.fullName}`,
    `Date of birth: ${patient.dob}`,
    `Age: ${patient.age} yrs`,
    `Gender: ${patient.sex}`,
    `Chronic conditions: ${patient.chronicConditions}`,
    `Allergies: ${patient.allergies}`,
    `Reason for visit: ${reason}`,
  ]);
}

function buildAnnualCheckupFacts(patient: PatientSummary, reason: string) {
  return toFacts([
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
  ]);
}

export function buildCortiAssistantVisitConfig({
  patient,
  reason,
}: {
  patient: PatientSummary;
  reason: string;
}): CortiAssistantVisitConfig {
  return {
    templateId: CORTI_SOAP_TEMPLATE_ID,
    templateLabel: "SOAP Note",
    patientFacts: buildPatientFacts(patient, reason),
    cheatFacts: buildAnnualCheckupFacts(patient, reason),
    checklistItems: CORTI_SOAP_SECTIONS.map((section) => ({
      id: section.id,
      title: section.title,
      questions: [...section.questions],
    })),
  };
}
