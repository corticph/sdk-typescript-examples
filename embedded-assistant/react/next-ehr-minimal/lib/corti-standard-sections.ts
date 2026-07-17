import { getCortiRopcToken, getCortiServerConfig } from "@/lib/corti-server-auth";

export const cortiStandardSectionFamilies = [
  "corti-assessment",
  "corti-diagnostic-tests-ordered",
  "corti-immunizations",
  "corti-objective",
  "corti-plan",
  "corti-subjective",
  "corti-vital-signs",
] as const;

export type CortiStandardSectionFamily = (typeof cortiStandardSectionFamilies)[number];
export type CortiStandardSectionIds = Partial<Record<CortiStandardSectionFamily, string>>;

type GuidedLabel = {
  key: string;
  value: string;
};

type GuidedSectionListItem = {
  id: string;
  labels?: GuidedLabel[];
  languages?: string[];
  regions?: string[];
  specialties?: string[];
  deletedAt?: string | null;
};

let standardSectionIdsPromise: Promise<CortiStandardSectionIds> | null = null;

function getLabelValue(section: GuidedSectionListItem, key: string) {
  return section.labels?.find((label) => label.key === key)?.value;
}

function getSectionPreference(section: GuidedSectionListItem) {
  const hasGenericLanguage = section.languages?.some((language) => language === "en") ?? false;
  const hasRegion = (section.regions?.length ?? 0) > 0;
  const hasSpecialty = (section.specialties?.length ?? 0) > 0;

  return (hasGenericLanguage ? 0 : 1) + (hasRegion ? 2 : 0) + (hasSpecialty ? 2 : 0);
}

async function fetchCortiStandardSectionIds(): Promise<CortiStandardSectionIds> {
  const { environment, tenantName } = getCortiServerConfig();
  const tokenResponse = await getCortiRopcToken();
  const url = new URL(`https://api.${environment}.corti.app/v2/documents/sections/`);

  url.searchParams.set("source", "corti");
  url.searchParams.set("published", "true");
  url.searchParams.append("lang", "en");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
      "Tenant-Name": tenantName,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Corti standard sections: ${response.status}`);
  }

  const sections = (await response.json()) as unknown;
  if (!Array.isArray(sections)) {
    throw new Error("Failed to load Corti standard sections: invalid response");
  }

  return cortiStandardSectionFamilies.reduce<CortiStandardSectionIds>((sectionIds, family) => {
    const matchingSection = sections
      .filter((section): section is GuidedSectionListItem => {
        return (
          typeof section === "object" &&
          section !== null &&
          !Array.isArray(section) &&
          typeof (section as GuidedSectionListItem).id === "string" &&
          !(section as GuidedSectionListItem).deletedAt &&
          getLabelValue(section as GuidedSectionListItem, "family") === family
        );
      })
      .toSorted((first, second) => getSectionPreference(first) - getSectionPreference(second))[0];

    return matchingSection ? { ...sectionIds, [family]: matchingSection.id } : sectionIds;
  }, {});
}

export async function getCortiStandardSectionIds() {
  standardSectionIdsPromise ??= fetchCortiStandardSectionIds().catch((error: unknown) => {
    console.warn(
      "Corti standard sections could not be loaded; using fully inline sections.",
      error,
    );
    return {};
  });

  return standardSectionIdsPromise;
}
