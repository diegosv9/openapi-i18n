import { readFile } from "node:fs/promises"
import path from "node:path"

import YAML from "yaml"

import { LANGUAGE_METADATA } from "../src/config/languages.ts"
import { isObjectRecord } from "./lib/openapi-i18n.js"
import {
  logDetail,
  logError,
  logErrorItem,
  logHeader,
  logSuccess,
} from "./lib/logger.js"
import {
  collectBaseKeys,
  validateLocale,
  type BaseValidationState,
  type JsonValue,
  type LocaleDictionary,
} from "./lib/validate-logic.js"

const PROJECT_ROOT = process.cwd()
const BASE_PATH = path.join(PROJECT_ROOT, "openapi/base/openapi.base.yaml")
const LOCALES_DIR = path.join(PROJECT_ROOT, "openapi/locales")

async function main() {
  logHeader("Validando i18n")

  const baseDocument = await readYamlFile(BASE_PATH)

  if (!isObjectRecord(baseDocument)) {
    throw new Error("El spec base debe ser un objeto YAML en la raiz")
  }

  const baseState: BaseValidationState = {
    errors: [],
    keysByLocation: new Map<string, string>(),
    keyOwners: new Map<string, string>(),
  }

  collectBaseKeys(baseDocument, [], baseState)

  const expectedKeys = new Set(baseState.keyOwners.keys())
  const localeIssues: string[] = []

  for (const language of LANGUAGE_METADATA) {
    const localeCode = language.code
    const localePath = path.join(LOCALES_DIR, `${localeCode}.json`)
    const dictionary = await readLocaleFile(localePath)
    const issues = validateLocale(localeCode, dictionary, expectedKeys)
    localeIssues.push(...issues)
  }

  const allIssues = [...baseState.errors, ...localeIssues]

  if (allIssues.length > 0) {
    logError(
      `Validación fallida — ${allIssues.length} ${allIssues.length === 1 ? "error" : "errores"}`,
    )
    for (const issue of allIssues) {
      logErrorItem(issue)
    }
    process.exitCode = 1
    return
  }

  logSuccess("Validación completada")
  logDetail("Base", BASE_PATH)
  logDetail("Claves esperadas", String(expectedKeys.size))
  logDetail("Locales validados", String(LANGUAGE_METADATA.length))
}

async function readYamlFile(filePath: string): Promise<JsonValue> {
  const rawContents = await readFile(filePath, "utf8")
  return YAML.parse(rawContents) as JsonValue
}

async function readLocaleFile(filePath: string): Promise<LocaleDictionary> {
  const rawContents = await readFile(filePath, "utf8")
  const parsed = JSON.parse(rawContents) as unknown

  if (!isObjectRecord(parsed)) {
    throw new Error(`El locale ${filePath} debe contener un objeto JSON`)
  }

  const dictionary: LocaleDictionary = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error(
        `La clave "${key}" en ${filePath} debe tener un valor string`,
      )
    }

    dictionary[key] = value
  }

  return dictionary
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  logError(`Error inesperado: ${message}`)
  process.exit(1)
})
