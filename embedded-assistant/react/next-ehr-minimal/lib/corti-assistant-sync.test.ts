import { describe, expect, it } from "vitest";
import { buildConsultationFormPrefillFields } from "@/lib/corti-assistant-sync";

describe("corti assistant document sync", () => {
  it("splits output schema key-value text across the expected form fields", () => {
    const fields = buildConsultationFormPrefillFields({
      document: {
        sections: [
          {
            labels: [{ key: "ehr.formFields", value: "outcomeType,outcomeDetails" }],
            structuredOutput: "outcomeType=referral\noutcomeDetails=Urgent antenatal assessment\n",
          },
        ],
      },
    });

    expect(fields).toEqual({
      outcomeType: "referral",
      outcomeDetails: "Urgent antenatal assessment",
    });
  });

  it("does not write a whole key-value block into a single form field", () => {
    const fields = buildConsultationFormPrefillFields({
      document: {
        sections: [
          {
            labels: [{ key: "ehr.formFields", value: "outcomeType,outcomeDetails" }],
            structuredOutput: {
              outcomeType: "outcomeType=prescription \\ outcomeDetails=Folic acid",
            },
          },
        ],
      },
    });

    expect(fields).toEqual({
      outcomeType: "prescription",
      outcomeDetails: "Folic acid",
    });
  });

  it("keeps single-field sections on their matching form field", () => {
    const fields = buildConsultationFormPrefillFields({
      document: {
        sections: [
          {
            labels: [{ key: "ehr.formFields", value: "plan" }],
            structuredOutput: { plan: "Follow up in two weeks" },
          },
          {
            labels: [{ key: "ehr.formFields", value: "objective" }],
            structuredOutput: { objective: "Fundal height appropriate for gestation" },
          },
        ],
      },
    });

    expect(fields).toEqual({
      plan: "Follow up in two weeks",
      objective: "Fundal height appropriate for gestation",
    });
  });
});
