import { getI18nKeyField, isI18nKeyField, isObjectRecord, isTranslatableField, type I18nKeyField } from "./openapi-i18n.js"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type LocaleDictionary = Record<string, string>

export type SyncStats = {
  createdKeys: number
  reusedKeys: number
  translatedFields: number
}

export type SyncState = {
  localeEntries: Map<string, string>
  usedKeys: Map<string, string>
  stats: SyncStats
}

export function syncNode(
  sourceNode: JsonValue,
  previousBaseNode: unknown,
  tokenPath: string[],
  sourcePath: string[],
  state: SyncState,
): JsonValue {
  if (Array.isArray(sourceNode)) {
    const previousArray = Array.isArray(previousBaseNode) ? previousBaseNode : []

    return sourceNode.map((item, index) =>
      syncNode(
        item,
        previousArray[index],
        [...tokenPath, String(index)],
        [...sourcePath, String(index)],
        state,
      ),
    )
  }

  if (!isObjectRecord(sourceNode)) {
    return sourceNode
  }

  const previousBaseObject = isObjectRecord(previousBaseNode)
    ? previousBaseNode
    : undefined

  const nextObject: Record<string, JsonValue> = {}

  for (const [field, value] of Object.entries(sourceNode)) {
    if (isTranslatableField(field) && typeof value === "string") {
      const keyField = getI18nKeyField(field)

      if (!keyField) {
        throw new Error(`No hay mapping i18n para el campo ${field}`)
      }

      const location = [...sourcePath, field].join(".")
      const reusedKey = readExistingKey(previousBaseObject, keyField)
      const finalKey =
        reusedKey ??
        createUniqueKey([...tokenPath, field], location, state.usedKeys)

      registerKeyUsage(finalKey, location, state.usedKeys)

      nextObject[field] = value
      nextObject[keyField] = finalKey
      state.localeEntries.set(finalKey, value)
      state.stats.translatedFields += 1

      if (reusedKey) {
        state.stats.reusedKeys += 1
      } else {
        state.stats.createdKeys += 1
      }

      continue
    }

    nextObject[field] = syncNode(
      value,
      previousBaseObject?.[field],
      computeTokenPath(tokenPath, sourcePath, field),
      [...sourcePath, field],
      state,
    )
  }

  return nextObject
}

export function mergeLocaleEntries(
  sourceEntries: Record<string, string>,
  previousEntries: LocaleDictionary | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sourceEntries).map(([key]) => [
      key,
      previousEntries?.[key] ?? "",
    ]),
  )
}

export function readExistingKey(
  previousBaseObject: Record<string, unknown> | undefined,
  keyField: I18nKeyField,
): string | undefined {
  const value = previousBaseObject?.[keyField]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export function computeTokenPath(
  tokenPath: string[],
  sourcePath: string[],
  field: string,
): string[] {
  if (field === "paths") {
    return tokenPath
  }

  const parentField = sourcePath[sourcePath.length - 1]

  if (parentField === "paths") {
    return [...tokenPath, sanitizeSegment(field.replaceAll("/", "_"))]
  }

  return [...tokenPath, sanitizeSegment(field)]
}

export function createUniqueKey(
  rawTokens: string[],
  location: string,
  usedKeys: Map<string, string>,
): string {
  const baseKey = rawTokens
    .map((token) => sanitizeSegment(token))
    .filter(Boolean)
    .join(".")

  const normalizedBaseKey = baseKey || "root"

  if (!usedKeys.has(normalizedBaseKey)) {
    return normalizedBaseKey
  }

  let suffix = 2

  while (usedKeys.has(`${normalizedBaseKey}.${suffix}`)) {
    suffix += 1
  }

  const fallbackKey = `${normalizedBaseKey}.${suffix}`
  registerKeyUsage(fallbackKey, location, usedKeys)
  return fallbackKey
}

export function registerKeyUsage(
  key: string,
  location: string,
  usedKeys: Map<string, string>,
) {
  const previousLocation = usedKeys.get(key)

  if (previousLocation && previousLocation !== location) {
    throw new Error(
      `La clave i18n "${key}" ya estaba asignada a "${previousLocation}" y no puede reutilizarse en "${location}"`,
    )
  }

  usedKeys.set(key, location)
}

export function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "value"
}
