import { getI18nKeyField, isI18nKeyField, isObjectRecord, isTranslatableField } from "./openapi-i18n.js"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type LocaleDictionary = Record<string, string>

export type BuildStats = {
  translatedFields: number
  fallbackFields: number
}

export function localizeNode(
  node: JsonValue,
  dictionary: LocaleDictionary,
  stats: BuildStats,
): JsonValue {
  if (Array.isArray(node)) {
    return node.map((item) => localizeNode(item, dictionary, stats))
  }

  if (!isObjectRecord(node)) {
    return node
  }

  const nextObject: Record<string, JsonValue> = {}

  for (const [field, value] of Object.entries(node)) {
    if (isI18nKeyField(field)) {
      continue
    }

    if (isTranslatableField(field) && typeof value === "string") {
      const keyField = getI18nKeyField(field)
      const key = keyField ? node[keyField] : undefined

      if (typeof key === "string") {
        const translatedValue = dictionary[key]

        if (typeof translatedValue === "string") {
          nextObject[field] = translatedValue
          stats.translatedFields += 1
        } else {
          nextObject[field] = value
          stats.fallbackFields += 1
        }

        continue
      }
    }

    nextObject[field] = localizeNode(value, dictionary, stats)
  }

  return nextObject
}
