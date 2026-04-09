import { describe, expect, it } from "vitest"
import {
  collectBaseKeys,
  validateLocale,
  type BaseValidationState,
  type JsonValue,
} from "../lib/validate-logic.js"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeState(): BaseValidationState {
  return {
    errors: [],
    keysByLocation: new Map(),
    keyOwners: new Map(),
  }
}

/** Minimal valid base spec (info.title + info.description) */
const infoBase: JsonValue = {
  info: {
    title: "Swagger Petstore",
    "x-i18n-key-title": "info.title",
    description: "A sample API",
    "x-i18n-key-description": "info.description",
  },
}

/** Single path with a GET operation */
const petsGetBase: JsonValue = {
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
        },
      },
      delete: {
        description: "Deletes a pet by ID",
        "x-i18n-key-description": "pets_id.delete.description",
        responses: {
          "204": {
            description: "pet deleted",
            "x-i18n-key-description": "pets_id.delete.responses.204.description",
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
  it("collects title and description keys", () => {
    const state = makeState()
    collectBaseKeys(infoBase, [], state)
    expect(state.keyOwners.has("info.title")).toBe(true)
    expect(state.keyOwners.has("info.description")).toBe(true)
    expect(state.errors).toHaveLength(0)
  })

  it("maps location to key correctly", () => {
    const state = makeState()
    collectBaseKeys(infoBase, [], state)
    expect(state.keysByLocation.get("info.title")).toBe("info.title")
    expect(state.keysByLocation.get("info.description")).toBe("info.description")
  })
})

describe("collectBaseKeys — full Petstore paths", () => {
  it("collects all keys without errors", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.errors).toHaveLength(0)
    expect(state.keyOwners.size).toBeGreaterThan(0)
  })

  it("collects GET description key", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.keyOwners.has("pets.get.description")).toBe(true)
  })

  it("collects parameter description keys", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.keyOwners.has("pets.get.parameters.0.description")).toBe(true)
  })

  it("collects response description keys", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.keyOwners.has("pets.get.responses.200.description")).toBe(true)
    expect(state.keyOwners.has("pets.get.responses.default.description")).toBe(true)
  })

  it("collects requestBody description key", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.keyOwners.has("pets.post.requestbody.description")).toBe(true)
  })

  it("collects /pets/{id} keys", () => {
    const state = makeState()
    collectBaseKeys(petsGetBase, [], state)
    expect(state.keyOwners.has("pets_id.get.description")).toBe(true)
    expect(state.keyOwners.has("pets_id.delete.description")).toBe(true)
    expect(state.keyOwners.has("pets_id.delete.responses.204.description")).toBe(true)
  })
})

describe("collectBaseKeys — error cases", () => {
  it("reports error when translatable field value is not a string", () => {
    const state = makeState()
    const badBase: JsonValue = {
      info: { description: 42 as unknown as string, "x-i18n-key-description": "info.description" },
    }
    collectBaseKeys(badBase, [], state)
    expect(state.errors.some((e) => e.includes("info.description"))).toBe(true)
  })

  it("reports error when x-i18n-key-* field is missing", () => {
    const state = makeState()
    const badBase: JsonValue = { info: { description: "Some desc" } }
    collectBaseKeys(badBase, [], state)
    expect(state.errors.some((e) => e.includes("x-i18n-key-description"))).toBe(true)
  })

  it("reports error when x-i18n-key-* field is an empty string", () => {
    const state = makeState()
    const badBase: JsonValue = {
      info: { description: "Some desc", "x-i18n-key-description": "" },
    }
    collectBaseKeys(badBase, [], state)
    expect(state.errors.some((e) => e.includes("x-i18n-key-description"))).toBe(true)
  })

  it("reports duplicate key error when two locations share a key", () => {
    const state = makeState()
    const duplicateBase: JsonValue = {
      a: { description: "First", "x-i18n-key-description": "shared.key" },
      b: { description: "Second", "x-i18n-key-description": "shared.key" },
    }
    collectBaseKeys(duplicateBase, [], state)
    expect(state.errors.some((e) => e.includes("shared.key"))).toBe(true)
  })

  it("handles arrays by recursing into each element", () => {
    const state = makeState()
    const arrayBase: JsonValue = {
      items: [
        { description: "Item 1", "x-i18n-key-description": "items.0.description" },
        { description: "Item 2", "x-i18n-key-description": "items.1.description" },
      ],
    }
    collectBaseKeys(arrayBase, [], state)
    expect(state.errors).toHaveLength(0)
    expect(state.keyOwners.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// validateLocale
// ---------------------------------------------------------------------------

describe("validateLocale", () => {
  const expectedKeys = new Set(["info.title", "info.description", "pets.get.description"])

  it("returns no issues when locale is complete and has no orphans", () => {
    const dictionary = {
      "info.title": "Swagger Petstore",
      "info.description": "A sample API",
      "pets.get.description": "Returns all pets",
    }
    expect(validateLocale("es", dictionary, expectedKeys)).toHaveLength(0)
  })

  it("reports a missing key", () => {
    const dictionary = {
      "info.title": "Swagger Petstore",
      "info.description": "A sample API",
    }
    const issues = validateLocale("es", dictionary, expectedKeys)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatch(/pets\.get\.description/)
    expect(issues[0]).toContain("es")
  })

  it("reports multiple missing keys", () => {
    const dictionary = { "info.title": "Swagger Petstore" }
    const issues = validateLocale("gl", dictionary, expectedKeys)
    expect(issues).toHaveLength(2)
  })

  it("reports orphan keys not present in expected set", () => {
    const dictionary = {
      "info.title": "Swagger Petstore",
      "info.description": "A sample API",
      "pets.get.description": "Returns all pets",
      "orphan.key": "extra",
    }
    const issues = validateLocale("en", dictionary, expectedKeys)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatch(/orphan\.key/)
  })

  it("reports both missing and orphan keys", () => {
    const dictionary = {
      "info.title": "T",
      "orphan.key": "extra",
    }
    const issues = validateLocale("es", dictionary, expectedKeys)
    const missing = issues.filter((i) => i.includes("falta"))
    const orphan = issues.filter((i) => i.includes("huerfana"))
    expect(missing.length).toBeGreaterThan(0)
    expect(orphan.length).toBeGreaterThan(0)
  })

  it("works with an empty expected set and an empty dictionary", () => {
    expect(validateLocale("en", {}, new Set())).toHaveLength(0)
  })
})
