import type {
  ConsultationFormFieldName,
  ConsultationFormFieldUpdates,
} from "@/lib/consultation-form-store";
import { isConsultationFormFieldName } from "@/lib/consultation-form-store";

type LabelRecord = Record<string, string>;

type SyncedDocumentSection = {
  text?: string | null;
  structuredOutput?: unknown;
  labels?: LabelRecord | Array<{ key: string; value: string }> | null;
};

type SyncedDocumentPayload = {
  document?: {
    sections?: SyncedDocumentSection[] | null;
  } | null;
};

const FIELD_ALIASES: Partial<Record<ConsultationFormFieldName, string[]>> = {
  assessment: ["assessment"],
  bloodPressure: ["bloodPressure"],
  bmi: ["bmi"],
  fetalHeartRate: ["fetalHeartRate", "fetalHeartRateBpm"],
  fundalHeightCm: ["fundalHeightCm"],
  gestationWeeks: ["gestationWeeks"],
  heartRate: ["heartRate", "heartRateBpm"],
  heightCm: ["heightCm"],
  maternityNotes: ["maternityNotes", "notes"],
  objective: ["objective"],
  outcomeDetails: ["outcomeDetails"],
  outcomeType: ["outcomeType"],
  plan: ["plan"],
  subjective: ["subjective"],
  temperatureC: ["temperatureC"],
  testName: ["testName"],
  testReason: ["testReason"],
  vaccine: ["vaccine"],
  vaccineBatch: ["vaccineBatch", "batch"],
  vaccineDose: ["vaccineDose", "dose"],
  vaccineSite: ["vaccineSite", "site"],
  vaccineStatus: ["vaccineStatus", "status"],
  weightKg: ["weightKg"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLabels(labels: SyncedDocumentSection["labels"]): LabelRecord {
  if (!labels) {
    return {};
  }

  if (Array.isArray(labels)) {
    return Object.fromEntries(labels.map((label) => [label.key, label.value]));
  }

  return labels;
}

function parseFormFields(labels: LabelRecord): ConsultationFormFieldName[] {
  return (labels["ehr.formFields"] ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(isConsultationFormFieldName)
    .filter(Boolean);
}

function normalizeFieldValue(value: unknown): string | null {
  if (value === null || value === undefined || value === 0) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== "Not recorded" ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getExpectedFieldKeys(formFields: ConsultationFormFieldName[]) {
  return formFields.flatMap((fieldName) => FIELD_ALIASES[fieldName] ?? [fieldName]);
}

function normalizeStructuredText(value: string, expectedKeys: string[]) {
  return expectedKeys.reduce(
    (text, key) => {
      const escapedKey = escapeRegExp(key);

      return text.replace(new RegExp(`\\s*\\\\\\s*(?=${escapedKey}\\s*[=:])`, "g"), "\n");
    },
    value
      .replace(/\r\n/g, "\n")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n"),
  );
}

function parseStructuredTextFields(
  text: string,
  formFields: ConsultationFormFieldName[],
): ConsultationFormFieldUpdates {
  const keyToFieldName = new Map(
    formFields.flatMap((fieldName) =>
      (FIELD_ALIASES[fieldName] ?? [fieldName]).map((key) => [key, fieldName] as const),
    ),
  );
  const expectedKeys = [...keyToFieldName.keys()];

  if (expectedKeys.length === 0) {
    return {};
  }

  const normalizedText = normalizeStructuredText(text, expectedKeys);
  const keyPattern = expectedKeys
    .toSorted((first, second) => second.length - first.length)
    .map(escapeRegExp)
    .join("|");
  const matches = [
    ...normalizedText.matchAll(new RegExp(`(?:^|\\n)\\s*(${keyPattern})\\s*[=:]\\s*`, "g")),
  ];

  return matches.reduce<ConsultationFormFieldUpdates>((fields, match, index) => {
    const matchedKey = match[1];
    const fieldName = matchedKey ? keyToFieldName.get(matchedKey) : undefined;
    const nextMatch = matches[index + 1];
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = nextMatch?.index ?? normalizedText.length;
    const value = normalizeFieldValue(normalizedText.slice(valueStart, valueEnd));

    if (fieldName && value) {
      fields[fieldName] = value;
    }

    return fields;
  }, {});
}

function getStructuredTextCandidates(section: SyncedDocumentSection): string[] {
  const candidates: string[] = [];

  if (typeof section.structuredOutput === "string") {
    candidates.push(section.structuredOutput);
  }

  if (isRecord(section.structuredOutput)) {
    for (const value of Object.values(section.structuredOutput)) {
      if (typeof value === "string") {
        candidates.push(value);
      }
    }
  }

  if (typeof section.text === "string") {
    candidates.push(section.text);
  }

  return candidates;
}

function getStructuredTextFields(
  section: SyncedDocumentSection,
  formFields: ConsultationFormFieldName[],
): ConsultationFormFieldUpdates {
  return getStructuredTextCandidates(section).reduce<ConsultationFormFieldUpdates>(
    (fields, candidate) => ({ ...fields, ...parseStructuredTextFields(candidate, formFields) }),
    {},
  );
}

function isStructuredTextBlock(value: string, formFields: ConsultationFormFieldName[]) {
  const expectedKeys = getExpectedFieldKeys(formFields);

  return expectedKeys.some((key) => {
    const escapedKey = escapeRegExp(key);

    return new RegExp(`(?:^|\\n|\\\\)\\s*${escapedKey}\\s*[=:]`).test(value);
  });
}

function getStructuredFieldValue(
  fieldName: ConsultationFormFieldName,
  structuredOutput: unknown,
  formFields: ConsultationFormFieldName[],
): string | null {
  if (!isRecord(structuredOutput)) {
    return null;
  }

  for (const key of FIELD_ALIASES[fieldName] ?? [fieldName]) {
    const value = normalizeFieldValue(structuredOutput[key]);
    if (value && !isStructuredTextBlock(value, formFields)) {
      return value;
    }
  }

  return null;
}

function getFallbackSectionValue(section: SyncedDocumentSection): string | null {
  const structuredOutput = normalizeFieldValue(section.structuredOutput);
  return structuredOutput ?? normalizeFieldValue(section.text);
}

export function buildConsultationFormPrefillFields(payload: unknown): ConsultationFormFieldUpdates {
  if (!isRecord(payload)) {
    return {};
  }

  const sections = (payload as SyncedDocumentPayload).document?.sections;
  if (!Array.isArray(sections)) {
    return {};
  }

  return sections.reduce<ConsultationFormFieldUpdates>((fields, section) => {
    const formFields = parseFormFields(normalizeLabels(section.labels));

    if (formFields.length === 0) {
      return fields;
    }

    const structuredTextFields = getStructuredTextFields(section, formFields);

    for (const fieldName of formFields) {
      const value =
        structuredTextFields[fieldName] ??
        getStructuredFieldValue(fieldName, section.structuredOutput, formFields) ??
        (formFields.length === 1 ? getFallbackSectionValue(section) : null);

      if (value) {
        fields[fieldName] = value;
      }
    }

    return fields;
  }, {});
}
