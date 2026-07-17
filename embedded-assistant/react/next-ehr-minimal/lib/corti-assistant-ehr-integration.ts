import type {
  CortiEmbeddedEvent,
  CortiEmbeddedReactRef,
  UseCortiEmbeddedApiResult,
} from "@corti/embedded-web/react";

import type { CortiAssistantInteractionData } from "@/components/corti-assistant-types";
import type {
  InlineTemplate,
  SetInteractionOptionsPayload,
} from "@/lib/corti-assistant-embedded-payloads";
import { buildConsultationFormPrefillFields } from "@/lib/corti-assistant-sync";
import type { CortiAssistantVisitConfig } from "@/lib/corti-assistant-visit-config";
import { updateConsultationFormFields } from "@/lib/consultation-form-store";

const INTERACTION_LOADED_TIMEOUT_MS = 20_000;
const DOCUMENT_SYNC_EVENT_NAME = "document.synced";

type CortiAssistantAuthPayload = Parameters<UseCortiEmbeddedApiResult["auth"]>[0];

type ConnectCortiAssistantToEhrParams = {
  api: UseCortiEmbeddedApiResult;
  authData: CortiAssistantAuthPayload;
  corti: CortiEmbeddedReactRef;
  interactionData: CortiAssistantInteractionData;
  visitConfig: CortiAssistantVisitConfig;
  onStatusChange?: (message: string) => void;
};

type HandleCortiAssistantEventForEhrParams = {
  corti: CortiEmbeddedReactRef;
  event: CortiEmbeddedEvent;
  onDocumentSynced?: () => void;
};

const FALLBACK_INTERACTION_OPTIONS: SetInteractionOptionsPayload = {
  mode: {
    fallback: "in-person",
    options: ["in-person", "virtual"],
  },
  documents: {
    actions: {
      sync: true,
    },
    allowedLanguages: ["en"],
  },
};

export const CORTI_ASSISTANT_RECOVERY_MESSAGE =
  "Assistant is taking longer than expected to load. Check your connection, then try again.";

export function getCortiAssistantErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function connectCortiAssistantToEhr({
  api,
  authData,
  corti,
  interactionData,
  onStatusChange,
  visitConfig,
}: ConnectCortiAssistantToEhrParams) {
  corti.hide();

  onStatusChange?.("Authenticating...");
  await api.auth(authData);

  onStatusChange?.("Configuring documentation...");
  await configureAssistantForEhr(api, visitConfig);

  onStatusChange?.("Creating interaction...");
  const interaction = await api.createInteraction(interactionData);

  onStatusChange?.("Adding patient context...");
  await api.addFacts(visitConfig.patientFacts);

  onStatusChange?.("Starting session...");
  await waitForInteractionLoaded(corti, () => api.navigate({ path: `/session/${interaction.id}` }));

  corti.show();

  return interaction;
}

export function handleCortiAssistantEventForEhr({
  corti,
  event,
  onDocumentSynced,
}: HandleCortiAssistantEventForEhrParams) {
  if (event.detail.name !== DOCUMENT_SYNC_EVENT_NAME) {
    return false;
  }

  const fields = buildConsultationFormPrefillFields(event.detail.payload);

  if (Object.keys(fields).length > 0) {
    updateConsultationFormFields(fields);
  }

  corti.hide();
  onDocumentSynced?.();
  return true;
}

function isUnsupportedAdvancedOptionsError(error: unknown) {
  const message = getCortiAssistantErrorMessage(error);

  return (
    message.includes("Invalid setInteractionOptions payload") &&
    (message.includes("templates.defaultTemplate.behaviour") ||
      message.includes("templates.defaultTemplate.template.source"))
  );
}

function waitForInteractionLoaded(
  corti: CortiEmbeddedReactRef,
  startNavigation: () => Promise<void>,
) {
  return new Promise<void>((resolve, reject) => {
    let isSettled = false;

    function cleanup() {
      clearTimeout(timeoutId);
      corti.removeEventListener("interaction.loaded", handleLoaded);
    }

    const settle = (complete: () => void) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      complete();
    };

    const fail = (error: unknown) => {
      settle(() => reject(error));
    };

    function handleLoaded() {
      settle(() => resolve());
    }

    corti.addEventListener("interaction.loaded", handleLoaded, { once: true });

    const timeoutId = setTimeout(() => {
      fail(new Error(CORTI_ASSISTANT_RECOVERY_MESSAGE));
    }, INTERACTION_LOADED_TIMEOUT_MS);

    void Promise.resolve().then(startNavigation).catch(fail);
  });
}

async function configureAssistantForEhr(
  api: UseCortiEmbeddedApiResult,
  visitConfig: CortiAssistantVisitConfig,
) {
  const interactionOptions = buildInteractionOptions(visitConfig.inlineTemplate);

  await api.configureApp({
    ui: {
      interactionTitle: false,
      aiChat: true,
      documentFeedback: true,
      navigation: false,
    },
  });

  try {
    await api.setInteractionOptions(interactionOptions);
  } catch (error) {
    if (!isUnsupportedAdvancedOptionsError(error)) {
      throw error;
    }

    console.warn(
      "Advanced inline document options are not supported by this Assistant environment. Falling back to basic sync configuration.",
    );
    await api.setInteractionOptions(FALLBACK_INTERACTION_OPTIONS);
  }
}

function buildInteractionOptions(inlineTemplate: InlineTemplate): SetInteractionOptionsPayload {
  return {
    mode: {
      fallback: "in-person",
      options: ["in-person", "virtual"],
    },
    templates: {
      sources: {
        personal: { enabled: false },
        standard: { enabled: false },
        project: { enabled: false },
        inline: {
          enabled: true,
          templates: [inlineTemplate],
        },
      },
      defaultTemplate: {
        behaviour: "force-first-document",
        template: {
          source: "inline",
          id: inlineTemplate.id ?? inlineTemplate.name,
        },
        allowUserSelection: false,
      },
    },
    documents: {
      actions: {
        sync: true,
      },
      allowedLanguages: ["en"],
    },
  };
}
