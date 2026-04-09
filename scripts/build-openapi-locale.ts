import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import YAML from "yaml"

import { LANGUAGE_METADATA } from "../src/config/languages.ts"
import { isObjectRecord } from "./lib/openapi-i18n.js"
import { logDetail, logError, logHeader, logSuccess } from "./lib/logger.js"
import {
  localizeNode,
  type BuildStats,
  type JsonValue,
  type LocaleDictionary,
} from "./lib/build-logic.js"

const PROJECT_ROOT = process.cwd()
const BASE_PATH = path.join(PROJECT_ROOT, "openapi/base/openapi.base.yaml")
const LOCALES_DIR = path.join(PROJECT_ROOT, "openapi/locales")
const DIST_DIR = path.join(PROJECT_ROOT, "openapi/dist")
const PUBLIC_OPENAPI_DIR = path.join(PROJECT_ROOT, "public/openapi")

async function main() {
  logHeader("Generando locales OpenAPI")

  const baseDocument = await readYamlFile(BASE_PATH)

  if (!isObjectRecord(baseDocument)) {
    throw new Error("El spec base debe ser un objeto YAML en la raiz")
  }

  await mkdir(DIST_DIR, { recursive: true })
  await mkdir(PUBLIC_OPENAPI_DIR, { recursive: true })

  for (const language of LANGUAGE_METADATA) {
    const localeCode = language.code
    const dictionary = await readLocaleFile(
      path.join(LOCALES_DIR, `${localeCode}.json`),
    )
    const stats: BuildStats = {
      translatedFields: 0,
      fallbackFields: 0,
    }

    const localizedDocument = localizeNode(baseDocument, dictionary, stats)
    const outputPath = path.join(DIST_DIR, `openapi-${localeCode}.yaml`)

    await writeFile(
      outputPath,
      `${YAML.stringify(localizedDocument, { lineWidth: 0 })}`,
      "utf8",
    )

    await writeFile(
      path.join(PUBLIC_OPENAPI_DIR, `openapi-${localeCode}.yaml`),
      `${YAML.stringify(localizedDocument, { lineWidth: 0 })}`,
      "utf8",
    )

    logSuccess(`Locale generado: ${localeCode}`)
    logDetail("Archivo", outputPath)
    logDetail("Campos traducidos", String(stats.translatedFields))
    logDetail("Fallbacks usados", String(stats.fallbackFields))
  }
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
