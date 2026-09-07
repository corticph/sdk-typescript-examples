import type { CortiEmbeddedEvent } from "@corti/embedded-web/react";
import type { ConsultationFormFieldUpdates } from "@/lib/consultation-form-store";
import { updateConsultationFormFields } from "@/lib/consultation-form-store";
import { getCortiSoapFormField } from "@/lib/corti-soap-template";

const DOCUMENT_SYNC_EVENT = "document.synced";

type SyncedDocumentSection = {
  key?: string;
  text?: string | null;
};

type SyncedDocumentPayload = {
  document?: {
    sections?: SyncedDocumentSection[] | null;
  } | null;
};

function normalizeSectionText(value: string | null | undefined) {
  const text = value?.trim();
  return text && text !== "Not recorded" ? text : null;
}

export function mapCortiSoapDocumentToEhrFields(
  payload: unknown,
): ConsultationFormFieldUpdates {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {};
  }

  const sections = (payload as SyncedDocumentPayload).document?.sections;
  if (!Array.isArray(sections)) {
    return {};
  }

  return sections.reduce<ConsultationFormFieldUpdates>((fields, section) => {
    const formField = section.key ? getCortiSoapFormField(section.key) : undefined;
    const value = normalizeSectionText(section.text);

    if (formField && value) {
      fields[formField] = value;
    }

    return fields;
  }, {});
}

export function syncCortiSoapDocumentToEhr(event: CortiEmbeddedEvent) {
  if (event.detail.name !== DOCUMENT_SYNC_EVENT) {
    return false;
  }

  const fields = mapCortiSoapDocumentToEhrFields(event.detail.payload);
  updateConsultationFormFields(fields);
  return true;
}
