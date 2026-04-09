import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import YAML from "yaml"

import {
  LANGUAGE_METADATA,
  SOURCE_LOCALE_CODE,
} from "../src/config/languages.ts"
import { isObjectRecord } from "./lib/openapi-i18n.js"
import { logDetail, logError, logHeader, logSuccess } from "./lib/logger.js"
import {
  mergeLocaleEntries,
  syncNode,
  type JsonValue,
  type LocaleDictionary,
  type SyncState,
} from "./lib/sync-logic.js"

const PROJECT_ROOT = process.cwd()
const SOURCE_PATH = path.join(PROJECT_ROOT, "openapi/source/openapi.source.yaml")
const BASE_PATH = path.join(PROJECT_ROOT, "openapi/base/openapi.base.yaml")
const LOCALES_DIR = path.join(PROJECT_ROOT, "openapi/locales")

async function main() {
  logHeader("Sincronizando i18n")

  const sourceDocument = await readYamlFile(SOURCE_PATH)
  const previousBaseDocument = await readOptionalYamlFile(BASE_PATH)

  if (!isObjectRecord(sourceDocument)) {
    throw new Error("El spec fuente debe ser un objeto YAML en la raiz")
  }

  const state: SyncState = {
    localeEntries: new Map<string, string>(),
    usedKeys: new Map<string, string>(),
    stats: {
      createdKeys: 0,
      reusedKeys: 0,
      translatedFields: 0,
    },
  }

  const nextBaseDocument = syncNode(
    sourceDocument,
    previousBaseDocument,
    [],
    [],
    state,
  )

  await mkdir(path.dirname(BASE_PATH), { recursive: true })
  await mkdir(LOCALES_DIR, { recursive: true })

  await writeFile(
    BASE_PATH,
    `${YAML.stringify(nextBaseDocument, { lineWidth: 0 })}`,
    "utf8",
  )

  const sortedLocaleEntries = Object.fromEntries(
    [...state.localeEntries.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  )

  await syncConfiguredLocales(sortedLocaleEntries)

  logSuccess("Sincronización completada")
  logDetail("Base", BASE_PATH)
  logDetail("Locales sincronizados", String(LANGUAGE_METADATA.length))
  logDetail("Locale fuente actualizado", getLocalePath(SOURCE_LOCALE_CODE))
  logDetail("Campos traducibles", String(state.stats.translatedFields))
  logDetail("Claves reutilizadas", String(state.stats.reusedKeys))
  logDetail("Claves nuevas", String(state.stats.createdKeys))
}

async function syncConfiguredLocales(
  sourceEntries: Record<string, string>,
): Promise<void> {
  for (const language of LANGUAGE_METADATA) {
    const localePath = getLocalePath(language.code)
    const previousEntries =
      language.code === SOURCE_LOCALE_CODE
        ? undefined
        : await readOptionalLocaleFile(localePath)
    const nextEntries =
      language.code === SOURCE_LOCALE_CODE
        ? sourceEntries
        : mergeLocaleEntries(sourceEntries, previousEntries)

    await writeFile(
      localePath,
      `${JSON.stringify(nextEntries, null, 2)}\n`,
      "utf8",
    )
  }
}

function getLocalePath(localeCode: string): string {
  return path.join(LOCALES_DIR, `${localeCode}.json`)
}

async function readYamlFile(filePath: string): Promise<JsonValue> {
  const rawContents = await readFile(filePath, "utf8")
  return YAML.parse(rawContents) as JsonValue
}

async function readOptionalYamlFile(filePath: string): Promise<JsonValue | undefined> {
  try {
    return await readYamlFile(filePath)
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined
    }

    throw error
  }
}

async function readOptionalLocaleFile(
  filePath: string,
): Promise<LocaleDictionary | undefined> {
  try {
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
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined
    }

    throw error
  }
}

function isNodeError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return error instanceof Error
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  logError(`Error inesperado: ${message}`)
  process.exit(1)
})
