export const TRANSLATABLE_FIELDS = [
  {
    field: "title",
    keyField: "x-i18n-key-title",
  },
  {
    field: "summary",
    keyField: "x-i18n-key-summary",
  },
  {
    field: "description",
    keyField: "x-i18n-key-description",
  },
] as const

export type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number]["field"]
export type I18nKeyField = (typeof TRANSLATABLE_FIELDS)[number]["keyField"]

const TRANSLATABLE_FIELD_MAP = new Map<string, I18nKeyField>(
  TRANSLATABLE_FIELDS.map(({ field, keyField }) => [field, keyField]),
)

const I18N_KEY_FIELD_SET = new Set<string>(
  TRANSLATABLE_FIELDS.map(({ keyField }) => keyField),
)

export function getI18nKeyField(
  field: string,
): I18nKeyField | undefined {
  return TRANSLATABLE_FIELD_MAP.get(field) as I18nKeyField | undefined
}

export function isTranslatableField(
  field: string,
): field is TranslatableField {
  return TRANSLATABLE_FIELD_MAP.has(field)
}

export function isI18nKeyField(field: string): field is I18nKeyField {
  return I18N_KEY_FIELD_SET.has(field as I18nKeyField)
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
