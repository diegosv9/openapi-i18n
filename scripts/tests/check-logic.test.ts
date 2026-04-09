import { describe, expect, it } from "vitest"
import {
  collectBaseKeys,
  findMissingTranslations,
  type CheckBaseValidationState,
  type JsonValue,
} from "../lib/check-logic.js"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeState(): CheckBaseValidationState {
  return { errors: [], keyOwners: new Map() }
}

/** Minimal valid base spec */
const infoBase: JsonValue = {
  info: {
    title: "Swagger Petstore",
    "x-i18n-key-title": "info.title",
    description: "A sample API",
    "x-i18n-key-description": "info.description",
  },
}

/** Full Petstore-like base document */
const fullBase: JsonValue = {
  info: {
    title: "Swagger Petstore",
    "x-i18n-key-title": "info.title",
    description: "A sample API",
    "x-i18n-key-description": "info.description",
  },
  paths: {
    "/pets": {
      get: {
        description: "Returns all pets",
        "x-i18n-key-description": "pets.get.description",
        parameters: [
          {
            name: "tags",
            description: "tags to filter by",
            "x-i18n-key-description": "pets.get.parameters.0.description",
          },
        ],
        responses: {
          "200": {
            description: "pet response",
            "x-i18n-key-description": "pets.get.responses.200.description",
          },
          default: {
            description: "unexpected error",
            "x-i18n-key-description": "pets.get.responses.default.description",
          },
        },
      },
      post: {
        description: "Creates a new pet",
        "x-i18n-key-description": "pets.post.description",
        requestBody: {
          description: "Pet to add",
          "x-i18n-key-description": "pets.post.requestbody.description",
        },
        responses: {
          "200": {
            description: "pet response",
            "x-i18n-key-description": "pets.post.responses.200.description",
          },
          default: {
            description: "unexpected error",
            "x-i18n-key-description": "pets.post.responses.default.description",
          },
        },
      },
    },
    "/pets/{id}": {
      get: {
        description: "Returns a pet by ID",
        "x-i18n-key-description": "pets_id.get.description",
        parameters: [
          {
            name: "id",
            description: "ID of pet to fetch",
            "x-i18n-key-description": "pets_id.get.parameters.0.description",
          },
        ],
        responses: {
          "200": {
            description: "pet response",
            "x-i18n-key-description": "pets_id.get.responses.200.description",
          },
          default: {
            description: "unexpected error",
            "x-i18n-key-description": "pets_id.get.responses.default.description",
          },
        },
      },
      delete: {
        description: "Deletes a pet by ID",
        "x-i18n-key-description": "pets_id.delete.description",
        parameters: [
          {
            name: "id",
            description: "ID of pet to delete",
            "x-i18n-key-description": "pets_id.delete.parameters.0.description",
          },
        ],
        responses: {
          "204": {
            description: "pet deleted",
            "x-i18n-key-description": "pets_id.delete.responses.204.description",
          },
          default: {
            description: "unexpected error",
            "x-i18n-key-description": "pets_id.delete.responses.default.description",
          },
        },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// collectBaseKeys
// ---------------------------------------------------------------------------

describe("collectBaseKeys — info block", () => {
  it("collects title and description keys without errors", () => {
    const state = makeState()
    collectBaseKeys(infoBase, [], state)
    expect(state.errors).toHaveLength(0)
    expect(state.keyOwners.has("info.title")).toBe(true)
    expect(state.keyOwners.has("info.description")).toBe(true)
  })
})

describe("collectBaseKeys — full Petstore paths", () => {
  it("collects all keys without errors", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    expect(state.errors).toHaveLength(0)
  })

  it("collects GET description key", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    expect(state.keyOwners.has("pets.get.description")).toBe(true)
  })

  it("collects POST requestBody description key", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    expect(state.keyOwners.has("pets.post.requestbody.description")).toBe(true)
  })

  it("collects /pets/{id} delete keys", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    expect(state.keyOwners.has("pets_id.delete.description")).toBe(true)
    expect(state.keyOwners.has("pets_id.delete.responses.204.description")).toBe(true)
  })

  it("handles arrays inside parameters", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    expect(state.keyOwners.has("pets.get.parameters.0.description")).toBe(true)
    expect(state.keyOwners.has("pets_id.get.parameters.0.description")).toBe(true)
  })
})

describe("collectBaseKeys — error detection", () => {
  it("reports error when translatable field value is not a string", () => {
    const state = makeState()
    const bad: JsonValue = {
      info: { description: 99 as unknown as string, "x-i18n-key-description": "info.description" },
    }
    collectBaseKeys(bad, [], state)
    expect(state.errors.some((e) => e.includes("info.description"))).toBe(true)
  })

  it("reports error when x-i18n-key-* is missing", () => {
    const state = makeState()
    const bad: JsonValue = { info: { description: "Some desc" } }
    collectBaseKeys(bad, [], state)
    expect(state.errors.length).toBeGreaterThan(0)
  })

  it("reports error when x-i18n-key-* is empty string", () => {
    const state = makeState()
    const bad: JsonValue = {
      info: { description: "Desc", "x-i18n-key-description": "" },
    }
    collectBaseKeys(bad, [], state)
    expect(state.errors.length).toBeGreaterThan(0)
  })

  it("reports duplicate key error", () => {
    const state = makeState()
    const dup: JsonValue = {
      a: { description: "First", "x-i18n-key-description": "dup.key" },
      b: { description: "Second", "x-i18n-key-description": "dup.key" },
    }
    collectBaseKeys(dup, [], state)
    expect(state.errors.some((e) => e.includes("dup.key"))).toBe(true)
  })

  it("skips non-object, non-array leaf nodes without error", () => {
    const state = makeState()
    collectBaseKeys("a string value" as unknown as JsonValue, [], state)
    expect(state.errors).toHaveLength(0)
    expect(state.keyOwners.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// findMissingTranslations
// ---------------------------------------------------------------------------

describe("findMissingTranslations", () => {
  const allKeys = ["info.title", "info.description", "pets.get.description"]

  it("returns empty array when all keys are translated", () => {
    const dict = {
      "info.title": "Tienda de mascotas",
      "info.description": "Una API de ejemplo",
      "pets.get.description": "Devuelve todas las mascotas",
    }
    expect(findMissingTranslations(dict, allKeys)).toHaveLength(0)
  })

  it("reports keys absent from the dictionary", () => {
    const dict = { "info.title": "T" }
    const missing = findMissingTranslations(dict, allKeys)
    expect(missing).toContain("info.description")
    expect(missing).toContain("pets.get.description")
  })

  it("reports keys present but with empty string value", () => {
    const dict = { "info.title": "T", "info.description": "", "pets.get.description": "D" }
    const missing = findMissingTranslations(dict, allKeys)
    expect(missing).toContain("info.description")
    expect(missing).not.toContain("info.title")
  })

  it("reports keys with whitespace-only value as missing", () => {
    const dict = { "info.title": "   ", "info.description": "D", "pets.get.description": "D" }
    const missing = findMissingTranslations(dict, allKeys)
    expect(missing).toContain("info.title")
  })

  it("reports keys with non-string value as missing", () => {
    const dict: Record<string, unknown> = {
      "info.title": 42,
      "info.description": "D",
      "pets.get.description": "D",
    }
    const missing = findMissingTranslations(dict, allKeys)
    expect(missing).toContain("info.title")
  })

  it("returns all keys as missing when dictionary is empty", () => {
    const missing = findMissingTranslations({}, allKeys)
    expect(missing).toEqual(allKeys)
  })

  it("returns empty array when expected keys list is empty", () => {
    const dict = { "info.title": "T" }
    expect(findMissingTranslations(dict, [])).toHaveLength(0)
  })

  it("covers full Petstore key set with complete translation", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    const keys = [...state.keyOwners.keys()]
    const fullDict = Object.fromEntries(keys.map((k) => [k, `translated: ${k}`]))
    expect(findMissingTranslations(fullDict, keys)).toHaveLength(0)
  })

  it("detects all missing keys in full Petstore set with empty dict", () => {
    const state = makeState()
    collectBaseKeys(fullBase, [], state)
    const keys = [...state.keyOwners.keys()]
    const missing = findMissingTranslations({}, keys)
    expect(missing).toHaveLength(keys.length)
  })
})
