import { getI18nKeyField, isObjectRecord, isTranslatableField } from "./openapi-i18n.js"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type LocaleDictionary = Record<string, string>

export type BaseValidationState = {
  errors: string[]
  keysByLocation: Map<string, string>
  keyOwners: Map<string, string>
}

export function collectBaseKeys(
  node: JsonValue,
  sourcePath: string[],
  state: BaseValidationState,
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
        state.keysByLocation.set(location, keyValue)

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

export function validateLocale(
  localeCode: string,
  dictionary: LocaleDictionary,
  expectedKeys: Set<string>,
): string[] {
  const issues: string[] = []
  const localeKeys = new Set(Object.keys(dictionary))

  for (const expectedKey of expectedKeys) {
    if (!localeKeys.has(expectedKey)) {
      issues.push(`Locale ${localeCode}: falta la clave "${expectedKey}"`)
    }
  }

  for (const localeKey of localeKeys) {
    if (!expectedKeys.has(localeKey)) {
      issues.push(`Locale ${localeCode}: clave huerfana "${localeKey}"`)
    }
  }

  return issues
}
