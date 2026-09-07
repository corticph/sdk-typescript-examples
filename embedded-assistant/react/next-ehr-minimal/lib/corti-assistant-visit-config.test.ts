import { describe, expect, it } from "vitest";
import { buildCortiAssistantVisitConfig } from "@/lib/corti-assistant-visit-config";
import { CORTI_SOAP_SECTIONS, CORTI_SOAP_TEMPLATE_ID } from "@/lib/corti-soap-template";
import type { PatientSummary } from "@/lib/ehr-types";

const patient: PatientSummary = {
  id: 1,
  fullName: "Alex Morgan",
  dob: "1988-03-14",
  age: 38,
  sex: "female",
  phone: "020 7946 0000",
  email: "alex@example.test",
  address: "1 Harbour Road",
  nhsNumber: "485 777 3456",
  allergies: "Penicillin",
  chronicConditions: "Asthma",
  lastRecordAt: null,
  nextAppointmentAt: null,
};

describe("corti assistant visit config", () => {
  it("uses the fixed schema-driven SOAP template and sections", () => {
    const config = buildCortiAssistantVisitConfig({
      patient,
      reason: "Annual checkup",
    });

    expect(config.templateId).toBe(CORTI_SOAP_TEMPLATE_ID);
    expect(config.templateLabel).toBe("SOAP Note");
    expect(config.checklistItems.map((item) => item.id)).toEqual(
      CORTI_SOAP_SECTIONS.map((section) => section.id),
    );
  });

  it("builds the annual-checkup demo facts", () => {
    const config = buildCortiAssistantVisitConfig({
      patient,
      reason: "Annual checkup",
    });

    expect(config.cheatFacts).toHaveLength(20);
    expect(config.cheatFacts.every((fact) => fact.group === "other")).toBe(true);
  });
});
