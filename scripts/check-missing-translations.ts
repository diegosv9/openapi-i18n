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
  logItem,
  logSuccess,
} from "./lib/logger.js"
import {
  collectBaseKeys,
  findMissingTranslations,
  type CheckBaseValidationState,
  type JsonValue,
} from "./lib/check-logic.js"

const PROJECT_ROOT = process.cwd()
const BASE_PATH = path.join(PROJECT_ROOT, "openapi/base/openapi.base.yaml")
const LOCALES_DIR = path.join(PROJECT_ROOT, "openapi/locales")

async function main() {
  logHeader("Comprobando traducciones")

  const baseDocument = await readYamlFile(BASE_PATH)

  if (!isObjectRecord(baseDocument)) {
    throw new Error("El spec base debe ser un objeto YAML en la raiz")
  }

  const baseState: CheckBaseValidationState = {
    errors: [],
    keyOwners: new Map<string, string>(),
  }

  collectBaseKeys(baseDocument, [], baseState)

  if (baseState.errors.length > 0) {
    logError(
      `No se puede revisar traducciones — ${baseState.errors.length} ${baseState.errors.length === 1 ? "error en la base" : "errores en la base"}`,
    )
    for (const issue of baseState.errors) {
      logErrorItem(issue)
    }
    process.exitCode = 1
    return
  }

  const expectedKeys = [...baseState.keyOwners.keys()].sort((left, right) =>
    left.localeCompare(right),
  )
  const reportLines: string[] = []
  let hasMissingTranslations = false

  for (const language of LANGUAGE_METADATA) {
    const localeCode = language.code
    const localePath = path.join(LOCALES_DIR, `${localeCode}.json`)
    const dictionary = await readLocaleFile(localePath)
    const missingKeys = findMissingTranslations(dictionary, expectedKeys)

    if (missingKeys.length === 0) {
      continue
    }

    hasMissingTranslations = true
    reportLines.push(`Locale ${localeCode}: ${missingKeys.length} claves sin traduccion`)

    for (const key of missingKeys) {
      reportLines.push(`- ${key}`)
    }
  }

  if (!hasMissingTranslations) {
    logSuccess("Sin traducciones pendientes")
    logDetail("Base", BASE_PATH)
    logDetail("Claves revisadas", String(expectedKeys.length))
    logDetail("Locales revisados", String(LANGUAGE_METADATA.length))
    return
  }

  logError("Traducciones pendientes")
  for (const line of reportLines) {
    if (line.startsWith("-")) {
      logErrorItem(line.slice(2))
    } else {
      logItem(line)
    }
  }
  process.exitCode = 1
}

function readLocaleFile(filePath: string): Promise<Record<string, unknown>> {
  return readJsonObject(filePath, "locale")
}

function readYamlFile(filePath: string): Promise<JsonValue> {
  return readStructuredFile(filePath, "yaml")
}

async function readStructuredFile(
  filePath: string,
  format: "json" | "yaml",
): Promise<JsonValue> {
  const rawContents = await readFile(filePath, "utf8")
  return format === "json"
    ? (JSON.parse(rawContents) as JsonValue)
    : (YAML.parse(rawContents) as JsonValue)
}

async function readJsonObject(
  filePath: string,
  label: string,
): Promise<Record<string, unknown>> {
  const parsed = await readStructuredFile(filePath, "json")

  if (!isObjectRecord(parsed)) {
    throw new Error(`El ${label} ${filePath} debe contener un objeto JSON`)
  }

  return parsed
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  logError(`Error inesperado: ${message}`)
  process.exit(1)
})
