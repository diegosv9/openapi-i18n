import { LANGUAGE_METADATA, SOURCE_LOCALE_CODE } from "../config/languages"

type LanguageMetadata = (typeof LANGUAGE_METADATA)[number]

export const LANGUAGES = LANGUAGE_METADATA.map((language) => ({
  ...language,
  specUrl: `/openapi/openapi-${language.code}.yaml`,
})) as ReadonlyArray<LanguageMetadata & { specUrl: string }>

export type LanguageCode = (typeof LANGUAGES)[number]["code"]
export type LanguageDefinition = (typeof LANGUAGES)[number]
export { SOURCE_LOCALE_CODE }

export function getLanguage(code: string): LanguageDefinition | undefined {
  return LANGUAGES.find((language) => language.code === code)
}
