import { describe, expect, it } from "vitest"
import {
  computeTokenPath,
  createUniqueKey,
  mergeLocaleEntries,
  readExistingKey,
  registerKeyUsage,
  sanitizeSegment,
  syncNode,
  type SyncState,
} from "../lib/sync-logic.js"

// ---------------------------------------------------------------------------
// sanitizeSegment
// ---------------------------------------------------------------------------

describe("sanitizeSegment", () => {
  it("lowercases and trims", () => {
    expect(sanitizeSegment("  Title  ")).toBe("title")
    expect(sanitizeSegment("INFO")).toBe("info")
  })

  it("replaces non-alphanumeric runs with underscores", () => {
    expect(sanitizeSegment("pet-store")).toBe("pet_store")
    expect(sanitizeSegment("foo bar")).toBe("foo_bar")
    expect(sanitizeSegment("a.b.c")).toBe("a_b_c")
  })

  it("strips leading and trailing underscores", () => {
    expect(sanitizeSegment("_pet_")).toBe("pet")
    expect(sanitizeSegment("-pet-")).toBe("pet")
  })

  it("handles OpenAPI path segments like /pets/{id}", () => {
    // "/pets/{id}" → replaceAll("/","_") → "_pets_{id}"
    // non-alphanumeric runs collapse to single "_", then strip leading/trailing
    const segment = "/pets/{id}".replaceAll("/", "_")
    expect(sanitizeSegment(segment)).toBe("pets_id")
    expect(sanitizeSegment(segment)).toSatisfy((v: string) => !v.startsWith("_"))
  })

  it("returns 'value' for a segment that collapses to empty", () => {
    expect(sanitizeSegment("")).toBe("value")
    expect(sanitizeSegment("___")).toBe("value")
    expect(sanitizeSegment("---")).toBe("value")
  })
})

// ---------------------------------------------------------------------------
// registerKeyUsage
// ---------------------------------------------------------------------------

describe("registerKeyUsage", () => {
  it("registers a key the first time", () => {
    const usedKeys = new Map<string, string>()
    registerKeyUsage("info.title", "info.title", usedKeys)
    expect(usedKeys.get("info.title")).toBe("info.title")
  })

  it("allows re-registering the same key at the same location", () => {
    const usedKeys = new Map<string, string>()
    registerKeyUsage("info.title", "info.title", usedKeys)
    expect(() =>
      registerKeyUsage("info.title", "info.title", usedKeys),
    ).not.toThrow()
  })

  it("throws when the same key is used at a different location", () => {
    const usedKeys = new Map<string, string>()
    registerKeyUsage("info.title", "info.title", usedKeys)
    expect(() =>
      registerKeyUsage("info.title", "other.title", usedKeys),
    ).toThrow(/ya estaba asignada/)
  })
})

// ---------------------------------------------------------------------------
// createUniqueKey
// ---------------------------------------------------------------------------

describe("createUniqueKey", () => {
  it("creates a key from token segments", () => {
    const usedKeys = new Map<string, string>()
    const key = createUniqueKey(["info", "title"], "info.title", usedKeys)
    expect(key).toBe("info.title")
  })

  it("adds .2 suffix when base key is already used", () => {
    const usedKeys = new Map<string, string>()
    usedKeys.set("info.title", "info.title")
    const key = createUniqueKey(["info", "title"], "other.title", usedKeys)
    expect(key).toBe("info.title.2")
  })

  it("increments suffix until a free key is found", () => {
    const usedKeys = new Map<string, string>()
    usedKeys.set("info.title", "loc1")
    usedKeys.set("info.title.2", "loc2")
    const key = createUniqueKey(["info", "title"], "loc3", usedKeys)
    expect(key).toBe("info.title.3")
  })

  it("uses 'value.value' when all tokens sanitize to 'value' fallback", () => {
    // sanitizeSegment never returns "" — it returns "value" as fallback,
    // so baseKey can only be "" (and thus "root") when rawTokens is empty
    const usedKeys = new Map<string, string>()
    const key = createUniqueKey(["---", "___"], "some.loc", usedKeys)
    expect(key).toBe("value.value")
  })

  it("uses 'root' when rawTokens is empty", () => {
    const usedKeys = new Map<string, string>()
    const key = createUniqueKey([], "some.loc", usedKeys)
    expect(key).toBe("root")
  })

  it("sanitizes each token segment", () => {
    const usedKeys = new Map<string, string>()
    const key = createUniqueKey(["Info", "TITLE"], "Info.TITLE", usedKeys)
    expect(key).toBe("info.title")
  })
})

// ---------------------------------------------------------------------------
// readExistingKey
// ---------------------------------------------------------------------------

describe("readExistingKey", () => {
  it("returns the existing key when present and non-empty", () => {
    const obj = { "x-i18n-key-title": "info.title" }
    expect(readExistingKey(obj, "x-i18n-key-title")).toBe("info.title")
  })

  it("returns undefined when the key field is absent", () => {
    expect(readExistingKey({}, "x-i18n-key-title")).toBeUndefined()
  })

  it("returns undefined when the key value is an empty string", () => {
    const obj = { "x-i18n-key-title": "" }
    expect(readExistingKey(obj, "x-i18n-key-title")).toBeUndefined()
  })

  it("returns undefined when previousBaseObject is undefined", () => {
    expect(readExistingKey(undefined, "x-i18n-key-title")).toBeUndefined()
  })

  it("returns undefined when the value is not a string", () => {
    const obj = { "x-i18n-key-title": 42 }
    expect(readExistingKey(obj, "x-i18n-key-title")).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// computeTokenPath
// ---------------------------------------------------------------------------

describe("computeTokenPath", () => {
  it("returns unchanged tokenPath when field is 'paths'", () => {
    const result = computeTokenPath(["root"], ["openapi", "info"], "paths")
    expect(result).toEqual(["root"])
  })

  it("sanitizes a path route segment when parent is 'paths'", () => {
    const result = computeTokenPath([], ["paths"], "/pets")
    expect(result).toEqual(["pets"])
  })

  it("sanitizes path parameter segment {id} when parent is 'paths'", () => {
    // "/pets/{id}" → replaceAll("/","_") → "_pets_{id}" → sanitize → "pets_id"
    const result = computeTokenPath([], ["paths"], "/pets/{id}")
    expect(result).toEqual(["pets_id"])
  })

  it("appends sanitized field for regular object fields", () => {
    const result = computeTokenPath(["pets"], ["paths", "/pets"], "get")
    expect(result).toEqual(["pets", "get"])
  })

  it("appends sanitized field for response codes", () => {
    const result = computeTokenPath(
      ["pets", "get"],
      ["paths", "/pets", "get", "responses"],
      "200",
    )
    expect(result).toEqual(["pets", "get", "200"])
  })
})

// ---------------------------------------------------------------------------
// mergeLocaleEntries
// ---------------------------------------------------------------------------

describe("mergeLocaleEntries", () => {
  it("preserves existing translations", () => {
    const source = { "info.title": "Swagger Petstore" }
    const previous = { "info.title": "Tienda de mascotas" }
    const result = mergeLocaleEntries(source, previous)
    expect(result["info.title"]).toBe("Tienda de mascotas")
  })

  it("initializes new keys to empty string when no previous entry", () => {
    const source = { "new.key": "New value" }
    const result = mergeLocaleEntries(source, undefined)
    expect(result["new.key"]).toBe("")
  })

  it("initializes to empty string for keys absent from previous locale", () => {
    const source = { "info.title": "T", "pets.get.description": "D" }
    const previous = { "info.title": "Título" }
    const result = mergeLocaleEntries(source, previous)
    expect(result["info.title"]).toBe("Título")
    expect(result["pets.get.description"]).toBe("")
  })

  it("removes orphan keys present only in previous locale", () => {
    const source = { "info.title": "T" }
    const previous = { "info.title": "Título", "old.key": "viejo" }
    const result = mergeLocaleEntries(source, previous)
    expect(Object.keys(result)).toEqual(["info.title"])
  })
})

// ---------------------------------------------------------------------------
// syncNode — Petstore-like fixtures
// ---------------------------------------------------------------------------

function makeSyncState(): SyncState {
  return {
    localeEntries: new Map(),
    usedKeys: new Map(),
    stats: { createdKeys: 0, reusedKeys: 0, translatedFields: 0 },
  }
}

describe("syncNode — primitives and arrays", () => {
  it("returns primitives unchanged", () => {
    const state = makeSyncState()
    expect(syncNode("hello", undefined, [], [], state)).toBe("hello")
    expect(syncNode(42, undefined, [], [], state)).toBe(42)
    expect(syncNode(null, undefined, [], [], state)).toBeNull()
    expect(syncNode(true, undefined, [], [], state)).toBe(true)
  })

  it("processes arrays element by element", () => {
    const state = makeSyncState()
    const result = syncNode(["a", "b"], undefined, [], [], state)
    expect(result).toEqual(["a", "b"])
  })
})

describe("syncNode — info object (title + description)", () => {
  it("adds x-i18n-key-title to info.title", () => {
    const state = makeSyncState()
    const result = syncNode(
      { title: "Swagger Petstore" },
      undefined,
      ["info"],
      ["info"],
      state,
    ) as Record<string, unknown>

    expect(result.title).toBe("Swagger Petstore")
    expect(result["x-i18n-key-title"]).toBe("info.title")
  })

  it("adds x-i18n-key-description to info.description", () => {
    const state = makeSyncState()
    const result = syncNode(
      { description: "A sample API" },
      undefined,
      ["info"],
      ["info"],
      state,
    ) as Record<string, unknown>

    expect(result["x-i18n-key-description"]).toBe("info.description")
    expect(state.localeEntries.get("info.description")).toBe("A sample API")
  })

  it("tracks stats correctly for new keys", () => {
    const state = makeSyncState()
    syncNode(
      { title: "T", description: "D" },
      undefined,
      ["info"],
      ["info"],
      state,
    )
    expect(state.stats.translatedFields).toBe(2)
    expect(state.stats.createdKeys).toBe(2)
    expect(state.stats.reusedKeys).toBe(0)
  })
})

describe("syncNode — reuses existing keys from base", () => {
  it("reuses existing key from previousBaseObject", () => {
    const state = makeSyncState()
    const previous = {
      title: "Swagger Petstore",
      "x-i18n-key-title": "info.title",
    }
    syncNode({ title: "Swagger Petstore" }, previous, ["info"], ["info"], state)
    expect(state.stats.reusedKeys).toBe(1)
    expect(state.stats.createdKeys).toBe(0)
  })
})

describe("syncNode — paths /pets (GET with parameters and responses)", () => {
  const petsGetSource = {
    description: "Returns all pets from the system",
    operationId: "findPets",
    parameters: [
      { name: "tags", in: "query", description: "tags to filter by" },
      { name: "limit", in: "query", description: "maximum number of results" },
    ],
    responses: {
      "200": { description: "pet response" },
      default: { description: "unexpected error" },
    },
  }

  it("attaches x-i18n-key-description to the GET operation", () => {
    const state = makeSyncState()
    const result = syncNode(
      petsGetSource,
      undefined,
      ["pets", "get"],
      ["paths", "/pets", "get"],
      state,
    ) as Record<string, unknown>

    expect(result["x-i18n-key-description"]).toBe("pets.get.description")
  })

  it("attaches x-i18n-key-description to each parameter", () => {
    const state = makeSyncState()
    const result = syncNode(
      petsGetSource,
      undefined,
      ["pets", "get"],
      ["paths", "/pets", "get"],
      state,
    ) as Record<string, unknown>

    const parameters = result.parameters as Array<Record<string, unknown>>
    expect(parameters[0]["x-i18n-key-description"]).toBe(
      "pets.get.parameters.0.description",
    )
    expect(parameters[1]["x-i18n-key-description"]).toBe(
      "pets.get.parameters.1.description",
    )
  })

  it("attaches x-i18n-key-description to each response", () => {
    const state = makeSyncState()
    const result = syncNode(
      petsGetSource,
      undefined,
      ["pets", "get"],
      ["paths", "/pets", "get"],
      state,
    ) as Record<string, unknown>

    const responses = result.responses as Record<string, Record<string, unknown>>
    expect(responses["200"]["x-i18n-key-description"]).toBe(
      "pets.get.responses.200.description",
    )
    expect(responses.default["x-i18n-key-description"]).toBe(
      "pets.get.responses.default.description",
    )
  })

  it("registers all keys in localeEntries", () => {
    const state = makeSyncState()
    syncNode(
      petsGetSource,
      undefined,
      ["pets", "get"],
      ["paths", "/pets", "get"],
      state,
    )
    expect(state.localeEntries.has("pets.get.description")).toBe(true)
    expect(state.localeEntries.has("pets.get.parameters.0.description")).toBe(true)
    expect(state.localeEntries.has("pets.get.parameters.1.description")).toBe(true)
    expect(state.localeEntries.has("pets.get.responses.200.description")).toBe(true)
    expect(state.localeEntries.has("pets.get.responses.default.description")).toBe(true)
  })
})

describe("syncNode — paths /pets (POST with requestBody)", () => {
  const petsPostSource = {
    description: "Creates a new pet in the store",
    operationId: "addPet",
    requestBody: {
      description: "Pet to add to the store",
      required: true,
    },
    responses: {
      "200": { description: "pet response" },
      default: { description: "unexpected error" },
    },
  }

  it("attaches x-i18n-key-description to the requestBody", () => {
    const state = makeSyncState()
    const result = syncNode(
      petsPostSource,
      undefined,
      ["pets", "post"],
      ["paths", "/pets", "post"],
      state,
    ) as Record<string, unknown>

    const requestBody = result.requestBody as Record<string, unknown>
    expect(requestBody["x-i18n-key-description"]).toBe(
      "pets.post.requestbody.description",
    )
  })
})

describe("syncNode — paths /pets/{id} (GET + DELETE)", () => {
  const petsIdGetSource = {
    description: "Returns a user based on a single ID",
    parameters: [{ name: "id", in: "path", description: "ID of pet to fetch" }],
    responses: {
      "200": { description: "pet response" },
      default: { description: "unexpected error" },
    },
  }

  const petsIdDeleteSource = {
    description: "deletes a single pet based on the ID supplied",
    parameters: [{ name: "id", in: "path", description: "ID of pet to delete" }],
    responses: {
      "204": { description: "pet deleted" },
      default: { description: "unexpected error" },
    },
  }

  it("generates correct key prefix for /pets/{id} GET", () => {
    const state = makeSyncState()
    syncNode(
      petsIdGetSource,
      undefined,
      ["pets_id", "get"],
      ["paths", "/pets/{id}", "get"],
      state,
    )
    expect(state.localeEntries.has("pets_id.get.description")).toBe(true)
  })

  it("generates correct key prefix for /pets/{id} DELETE", () => {
    const state = makeSyncState()
    syncNode(
      petsIdDeleteSource,
      undefined,
      ["pets_id", "delete"],
      ["paths", "/pets/{id}", "delete"],
      state,
    )
    expect(state.localeEntries.has("pets_id.delete.description")).toBe(true)
    expect(
      state.localeEntries.has("pets_id.delete.responses.204.description"),
    ).toBe(true)
  })
})

describe("syncNode — full Petstore info block", () => {
  const infoSource = {
    title: "Swagger Petstore",
    description:
      "A sample API that uses a petstore as an example to demonstrate features in the OpenAPI 3.0 specification",
    termsOfService: "http://swagger.io/terms/",
    contact: { name: "Swagger API Team", email: "apiteam@swagger.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0.html" },
  }

  it("adds keys for title and description only", () => {
    const state = makeSyncState()
    const result = syncNode(
      infoSource,
      undefined,
      ["info"],
      ["info"],
      state,
    ) as Record<string, unknown>

    expect(result["x-i18n-key-title"]).toBe("info.title")
    expect(result["x-i18n-key-description"]).toBe("info.description")
    expect(result["x-i18n-key-termsofservice"]).toBeUndefined()
    expect(result["x-i18n-key-contact"]).toBeUndefined()
  })

  it("preserves non-translatable fields untouched", () => {
    const state = makeSyncState()
    const result = syncNode(
      infoSource,
      undefined,
      ["info"],
      ["info"],
      state,
    ) as Record<string, unknown>

    expect(result.termsOfService).toBe("http://swagger.io/terms/")
    expect(result.contact).toEqual(infoSource.contact)
    expect(result.license).toEqual(infoSource.license)
  })
})
