import { describe, expect, it } from "vitest"
import {
  localizeNode,
  type BuildStats,
  type JsonValue,
} from "../lib/build-logic.js"

function makeStats(): BuildStats {
  return { translatedFields: 0, fallbackFields: 0 }
}

// ---------------------------------------------------------------------------
// Primitives and arrays
// ---------------------------------------------------------------------------

describe("localizeNode — primitives", () => {
  it("returns strings unchanged", () => {
    expect(localizeNode("hello", {}, makeStats())).toBe("hello")
  })

  it("returns numbers unchanged", () => {
    expect(localizeNode(42, {}, makeStats())).toBe(42)
  })

  it("returns null unchanged", () => {
    expect(localizeNode(null, {}, makeStats())).toBeNull()
  })

  it("returns booleans unchanged", () => {
    expect(localizeNode(true, {}, makeStats())).toBe(true)
  })

  it("processes array elements recursively", () => {
    const node: JsonValue = [
      { description: "Item A", "x-i18n-key-description": "items.0.description" },
      { description: "Item B", "x-i18n-key-description": "items.1.description" },
    ]
    const dict = {
      "items.0.description": "Elemento A",
      "items.1.description": "Elemento B",
    }
    const stats = makeStats()
    const result = localizeNode(node, dict, stats) as Array<Record<string, unknown>>

    expect(result[0].description).toBe("Elemento A")
    expect(result[1].description).toBe("Elemento B")
    expect(stats.translatedFields).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// x-i18n-key-* field removal
// ---------------------------------------------------------------------------

describe("localizeNode — removes x-i18n-key-* fields", () => {
  it("omits x-i18n-key-title from output", () => {
    const node: JsonValue = { title: "Swagger Petstore", "x-i18n-key-title": "info.title" }
    const result = localizeNode(node, { "info.title": "Tienda de mascotas" }, makeStats()) as Record<string, unknown>
    expect(result["x-i18n-key-title"]).toBeUndefined()
    expect(result.title).toBe("Tienda de mascotas")
  })

  it("omits x-i18n-key-description from output", () => {
    const node: JsonValue = {
      description: "A sample API",
      "x-i18n-key-description": "info.description",
    }
    const result = localizeNode(
      node,
      { "info.description": "Una API de ejemplo" },
      makeStats(),
    ) as Record<string, unknown>
    expect(result["x-i18n-key-description"]).toBeUndefined()
  })

  it("omits x-i18n-key-summary from output", () => {
    const node: JsonValue = { summary: "Create pet", "x-i18n-key-summary": "op.summary" }
    const result = localizeNode(
      node,
      { "op.summary": "Crear mascota" },
      makeStats(),
    ) as Record<string, unknown>
    expect(result["x-i18n-key-summary"]).toBeUndefined()
    expect(result.summary).toBe("Crear mascota")
  })
})

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

describe("localizeNode — translation", () => {
  it("translates description when key exists in dictionary", () => {
    const node: JsonValue = {
      description: "Returns all pets",
      "x-i18n-key-description": "pets.get.description",
    }
    const stats = makeStats()
    const result = localizeNode(
      node,
      { "pets.get.description": "Devuelve todas las mascotas" },
      stats,
    ) as Record<string, unknown>

    expect(result.description).toBe("Devuelve todas las mascotas")
    expect(stats.translatedFields).toBe(1)
    expect(stats.fallbackFields).toBe(0)
  })

  it("translates title", () => {
    const node: JsonValue = {
      title: "Swagger Petstore",
      "x-i18n-key-title": "info.title",
    }
    const result = localizeNode(
      node,
      { "info.title": "Tienda de mascotas" },
      makeStats(),
    ) as Record<string, unknown>
    expect(result.title).toBe("Tienda de mascotas")
  })

  it("translates summary", () => {
    const node: JsonValue = {
      summary: "Add a new pet",
      "x-i18n-key-summary": "op.summary",
    }
    const result = localizeNode(
      node,
      { "op.summary": "Añadir una mascota" },
      makeStats(),
    ) as Record<string, unknown>
    expect(result.summary).toBe("Añadir una mascota")
  })
})

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

describe("localizeNode — fallback", () => {
  it("uses source value as fallback when key not in dictionary", () => {
    const node: JsonValue = {
      description: "Returns all pets",
      "x-i18n-key-description": "pets.get.description",
    }
    const stats = makeStats()
    const result = localizeNode(node, {}, stats) as Record<string, unknown>

    expect(result.description).toBe("Returns all pets")
    expect(stats.fallbackFields).toBe(1)
    expect(stats.translatedFields).toBe(0)
  })

  it("counts fallbacks separately from translations", () => {
    const node: JsonValue = {
      description: "D",
      "x-i18n-key-description": "k.description",
      title: "T",
      "x-i18n-key-title": "k.title",
    }
    const stats = makeStats()
    localizeNode(node, { "k.title": "T traducido" }, stats)

    expect(stats.translatedFields).toBe(1)
    expect(stats.fallbackFields).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Full Petstore base spec
// ---------------------------------------------------------------------------

describe("localizeNode — full Petstore base spec", () => {
  const baseSpec: JsonValue = {
    openapi: "3.0.0",
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
          },
        },
        post: {
          description: "Creates a new pet",
          "x-i18n-key-description": "pets.post.description",
          requestBody: {
            description: "Pet to add",
            "x-i18n-key-description": "pets.post.requestbody.description",
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
          description: "Deletes a pet",
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

  const spanishDict: Record<string, string> = {
    "info.title": "Tienda de mascotas",
    "info.description": "Una API de ejemplo",
    "pets.get.description": "Devuelve todas las mascotas",
    "pets.get.parameters.0.description": "etiquetas para filtrar",
    "pets.get.responses.200.description": "respuesta de mascota",
    "pets.post.description": "Crea una nueva mascota",
    "pets.post.requestbody.description": "Mascota para añadir",
    "pets_id.get.description": "Devuelve una mascota por ID",
    "pets_id.get.parameters.0.description": "ID de la mascota",
    "pets_id.get.responses.200.description": "respuesta de mascota",
    "pets_id.delete.description": "Elimina una mascota",
    "pets_id.delete.responses.204.description": "mascota eliminada",
  }

  it("translates all fields and leaves no x-i18n-key-* fields", () => {
    const stats = makeStats()
    const result = localizeNode(baseSpec, spanishDict, stats) as Record<string, unknown>

    const info = result.info as Record<string, unknown>
    expect(info.title).toBe("Tienda de mascotas")
    expect(info["x-i18n-key-title"]).toBeUndefined()

    const paths = result.paths as Record<string, Record<string, unknown>>
    const petsGet = paths["/pets"].get as Record<string, unknown>
    expect(petsGet.description).toBe("Devuelve todas las mascotas")
    expect(petsGet["x-i18n-key-description"]).toBeUndefined()
  })

  it("translates nested parameter descriptions", () => {
    const stats = makeStats()
    const result = localizeNode(baseSpec, spanishDict, stats) as Record<string, unknown>
    const paths = result.paths as Record<string, Record<string, unknown>>
    const params = (paths["/pets"].get as Record<string, unknown>).parameters as Array<Record<string, unknown>>
    expect(params[0].description).toBe("etiquetas para filtrar")
    expect(params[0]["x-i18n-key-description"]).toBeUndefined()
  })

  it("translates /pets/{id} delete response", () => {
    const stats = makeStats()
    const result = localizeNode(baseSpec, spanishDict, stats) as Record<string, unknown>
    const paths = result.paths as Record<string, Record<string, unknown>>
    const del = paths["/pets/{id}"].delete as Record<string, unknown>
    const responses = del.responses as Record<string, Record<string, unknown>>
    expect(responses["204"].description).toBe("mascota eliminada")
  })

  it("counts all translated and zero fallback fields with full dict", () => {
    const stats = makeStats()
    localizeNode(baseSpec, spanishDict, stats)
    expect(stats.translatedFields).toBeGreaterThan(0)
    expect(stats.fallbackFields).toBe(0)
  })

  it("counts fallbacks when dictionary is empty", () => {
    const stats = makeStats()
    localizeNode(baseSpec, {}, stats)
    expect(stats.fallbackFields).toBeGreaterThan(0)
    expect(stats.translatedFields).toBe(0)
  })
})
