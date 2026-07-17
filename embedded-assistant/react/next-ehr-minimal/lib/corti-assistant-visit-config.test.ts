import { describe, expect, it } from "vitest";
import { buildCortiAssistantVisitConfig } from "@/lib/corti-assistant-visit-config";
import { consultationTypes, type PatientSummary } from "@/lib/ehr-types";

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
  it.each(consultationTypes)("builds 20 visit-specific cheat facts for %s", (consultationType) => {
    const config = buildCortiAssistantVisitConfig({
      consultationType,
      patient,
      reason: "Planned review",
    });

    expect(config.cheatFacts).toHaveLength(20);
    expect(config.cheatFacts.every((fact) => fact.group === "other")).toBe(true);
    expect(config.cheatFacts.every((fact) => fact.text.length > 0)).toBe(true);
  });

  it("keeps cheat facts specific to the visit type", () => {
    const generalGpFacts = buildCortiAssistantVisitConfig({
      consultationType: "general-gp",
      patient,
      reason: "Cough",
    }).cheatFacts;
    const prenatalFacts = buildCortiAssistantVisitConfig({
      consultationType: "prenatal",
      patient,
      reason: "Antenatal review",
    }).cheatFacts;

    expect(prenatalFacts).not.toEqual(generalGpFacts);
    expect(prenatalFacts.map((fact) => fact.text).join("\n")).toContain("Fetal");
  });

  it("attaches inherited standard section IDs when available", () => {
    const config = buildCortiAssistantVisitConfig({
      consultationType: "general-gp",
      patient,
      reason: "Cough",
      standardSectionIds: {
        "corti-subjective": "11111111-2222-4333-8444-555555555555",
        "corti-plan": "22222222-2222-4333-8444-555555555555",
      },
    });

    expect(config.inlineTemplate.generation.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          heading: "Subjective",
          inheritFromId: "11111111-2222-4333-8444-555555555555",
          instructions: {
            contentPrompt: expect.stringContaining("Capture the patient-reported reason"),
          },
        }),
        expect.objectContaining({
          heading: "Plan",
          inheritFromId: "22222222-2222-4333-8444-555555555555",
          instructions: {
            contentPrompt: expect.stringContaining("Capture advice"),
          },
        }),
      ]),
    );
  });

  it("only overrides inherited prompts when the standard section is too broad", () => {
    const objectiveStandardId = "33333333-2222-4333-8444-555555555555";
    const config = buildCortiAssistantVisitConfig({
      consultationType: "general-gp",
      patient,
      reason: "Cough",
      standardSectionIds: {
        "corti-objective": objectiveStandardId,
      },
    });
    const objectiveSection = config.inlineTemplate.generation.sections.find(
      (section) => section.heading === "Objective findings",
    );

    expect(objectiveSection).toEqual(
      expect.objectContaining({
        inheritFromId: objectiveStandardId,
        instructions: {
          contentPrompt: expect.stringContaining("Exclude advice"),
        },
      }),
    );
  });
});
