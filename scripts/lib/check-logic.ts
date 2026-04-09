import { getI18nKeyField, isObjectRecord, isTranslatableField } from "./openapi-i18n.js"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type CheckBaseValidationState = {
  errors: string[]
  keyOwners: Map<string, string>
}

export function collectBaseKeys(
  node: JsonValue,
  sourcePath: string[],
  state: CheckBaseValidationState,
): void {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) {
      collectBaseKeys(item, [...sourcePath, String(index)], state)
    }
    return
  }

  if (!isObjectRecord(node)) {
    return
  }

  for (const [field, value] of Object.entries(node)) {
    if (isTranslatableField(field)) {
      const keyField = getI18nKeyField(field)
      const location = [...sourcePath, field].join(".")
      const keyValue = keyField ? node[keyField] : undefined

      if (typeof value !== "string") {
        state.errors.push(`Campo traducible sin valor string en base: ${location}`)
      } else if (typeof keyValue !== "string" || keyValue.length === 0) {
        state.errors.push(`Falta ${keyField} para el campo ${location}`)
      } else {
        const previousLocation = state.keyOwners.get(keyValue)
        if (previousLocation && previousLocation !== location) {
          state.errors.push(
            `Clave duplicada en base: "${keyValue}" usada en ${previousLocation} y ${location}`,
          )
        } else {
          state.keyOwners.set(keyValue, location)
        }
      }
    }

    collectBaseKeys(value, [...sourcePath, field], state)
  }
}

export function findMissingTranslations(
  dictionary: Record<string, unknown>,
  expectedKeys: string[],
): string[] {
  const missingKeys: string[] = []

  for (const key of expectedKeys) {
    const value = dictionary[key]

    if (typeof value !== "string" || value.trim().length === 0) {
      missingKeys.push(key)
    }
  }

  return missingKeys
}
