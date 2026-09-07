import type { ConsultationFormFieldName } from "@/lib/consultation-form-store";

export const CORTI_SOAP_TEMPLATE_ID = "f901c06a-70db-59f6-8d0a-0a4bef4b8c77";

export const CORTI_SOAP_SECTIONS = [
  {
    id: "30391bb8-2bd5-528c-98d5-808c0bc4a717",
    title: "Subjective",
    formField: "subjective",
    questions: ["Any new concerns since the last review?", "Any relevant history updates?"],
  },
  {
    id: "9d06b8c9-6757-52d1-ab7b-791f155fabbc",
    title: "Objective",
    formField: "objective",
    questions: ["Were routine observations recorded?", "Any examination findings?"],
  },
  {
    id: "7c1af3f7-6574-50dc-bcd9-efdae057db57",
    title: "Assessment",
    formField: "assessment",
    questions: ["What is the clinical assessment?", "Any preventive risks identified?"],
  },
  {
    id: "362ada95-ac25-56b9-b792-000de66e1b35",
    title: "Actions and Plan",
    formField: "plan",
    questions: ["What follow-up is needed?", "Any screening or lifestyle actions?"],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  formField: ConsultationFormFieldName;
  questions: readonly string[];
}[];

export function getCortiSoapFormField(sectionId: string) {
  return CORTI_SOAP_SECTIONS.find((section) => section.id === sectionId)?.formField;
}