import type { Fact } from "@corti/embedded-web";

type DefaultMode = "virtual" | "in-person";

export type { Fact };

export interface InteractionModeOptions {
  fallback?: DefaultMode;
  options: DefaultMode[];
}

export interface SpokenLanguageOptions {
  fallback?: string;
  options?: string[];
}

export interface InlineTemplateLabel {
  key: string;
  value: string;
}

export interface InlineTemplateSectionInstructions {
  contentPrompt?: string;
  writingStylePrompt?: string;
  miscPrompt?: string;
}

export interface InlineTemplateSection {
  inheritFromId?: string;
  heading: string;
  labels?: InlineTemplateLabel[];
  instructions: InlineTemplateSectionInstructions;
  outputSchema?: Record<string, unknown>;
}

export interface InlineTemplate {
  id?: string;
  name: string;
  labels?: InlineTemplateLabel[];
  generation: {
    instructions: {
      prompt: string;
    };
    sections: InlineTemplateSection[];
  };
}

export interface InteractionTemplateReference {
  source: "standard" | "project" | "inline";
  id: string;
}

export interface DefaultInteractionTemplateOptions {
  behaviour?: "fallback" | "force-first-document";
  template?: InteractionTemplateReference;
  allowUserSelection?: boolean;
}

export interface PersonalTemplateSectionFieldConfig {
  visible?: boolean;
  editable?: boolean;
}

export interface PersonalTemplateSectionFields {
  heading?: { editable?: boolean };
  description?: { editable?: boolean };
  contentPrompt?: PersonalTemplateSectionFieldConfig;
  writingStylePrompt?: PersonalTemplateSectionFieldConfig;
  miscPrompt?: PersonalTemplateSectionFieldConfig;
  outputSchema?: PersonalTemplateSectionFieldConfig;
}

export interface InteractionTemplateSources {
  personal?: {
    enabled?: boolean;
    sectionFields?: PersonalTemplateSectionFields;
  };
  standard?: {
    enabled?: boolean;
    include?: {
      regions?: string[];
      families?: string[];
    };
  };
  project?: {
    enabled?: boolean;
    include?: {
      ids?: string[];
    };
    exclude?: {
      ids?: string[];
    };
  };
  inline?: {
    enabled?: boolean;
    templates?: InlineTemplate[];
  };
}

export interface InteractionTemplateOptions {
  sources?: InteractionTemplateSources;
  defaultTemplate?: DefaultInteractionTemplateOptions;
}

export interface InteractionDocumentOptions {
  actions?: {
    sync?: boolean;
  };
  allowedLanguages?: string[];
  maxGenerated?: number | "unlimited";
}

export interface SetInteractionOptionsPayload {
  mode?: InteractionModeOptions;
  spokenLanguage?: SpokenLanguageOptions;
  templates?: InteractionTemplateOptions;
  documents?: InteractionDocumentOptions;
}
