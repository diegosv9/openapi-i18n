import { describe, expect, it } from "vitest"
import {
  getI18nKeyField,
  isI18nKeyField,
  isObjectRecord,
  isTranslatableField,
  TRANSLATABLE_FIELDS,
} from "../../lib/openapi-i18n.js"

describe("TRANSLATABLE_FIELDS", () => {
  it("includes title, summary, and description entries", () => {
    const fields = TRANSLATABLE_FIELDS.map((f) => f.field)
    expect(fields).toContain("title")
    expect(fields).toContain("summary")
    expect(fields).toContain("description")
  })

  it("maps each field to its x-i18n-key-* counterpart", () => {
    const mapping = Object.fromEntries(
      TRANSLATABLE_FIELDS.map(({ field, keyField }) => [field, keyField]),
    )
    expect(mapping.title).toBe("x-i18n-key-title")
    expect(mapping.summary).toBe("x-i18n-key-summary")
    expect(mapping.description).toBe("x-i18n-key-description")
  })
})

describe("getI18nKeyField", () => {
  it("returns x-i18n-key-title for 'title'", () => {
    expect(getI18nKeyField("title")).toBe("x-i18n-key-title")
  })

  it("returns x-i18n-key-summary for 'summary'", () => {
    expect(getI18nKeyField("summary")).toBe("x-i18n-key-summary")
  })

  it("returns x-i18n-key-description for 'description'", () => {
    expect(getI18nKeyField("description")).toBe("x-i18n-key-description")
  })

  it("returns undefined for non-translatable fields", () => {
    expect(getI18nKeyField("operationId")).toBeUndefined()
    expect(getI18nKeyField("schema")).toBeUndefined()
    expect(getI18nKeyField("")).toBeUndefined()
    expect(getI18nKeyField("x-i18n-key-title")).toBeUndefined()
  })
})

describe("isTranslatableField", () => {
  it("returns true for all translatable field names", () => {
    expect(isTranslatableField("title")).toBe(true)
    expect(isTranslatableField("summary")).toBe(true)
    expect(isTranslatableField("description")).toBe(true)
  })

  it("returns false for non-translatable fields", () => {
    expect(isTranslatableField("operationId")).toBe(false)
    expect(isTranslatableField("in")).toBe(false)
    expect(isTranslatableField("required")).toBe(false)
    expect(isTranslatableField("schema")).toBe(false)
    expect(isTranslatableField("x-i18n-key-description")).toBe(false)
    expect(isTranslatableField("")).toBe(false)
  })
})

describe("isI18nKeyField", () => {
  it("returns true for all x-i18n-key-* fields", () => {
    expect(isI18nKeyField("x-i18n-key-title")).toBe(true)
    expect(isI18nKeyField("x-i18n-key-summary")).toBe(true)
    expect(isI18nKeyField("x-i18n-key-description")).toBe(true)
  })

  it("returns false for translatable field names", () => {
    expect(isI18nKeyField("title")).toBe(false)
    expect(isI18nKeyField("description")).toBe(false)
    expect(isI18nKeyField("summary")).toBe(false)
  })

  it("returns false for arbitrary field names", () => {
    expect(isI18nKeyField("operationId")).toBe(false)
    expect(isI18nKeyField("x-custom")).toBe(false)
    expect(isI18nKeyField("")).toBe(false)
  })
})

describe("isObjectRecord", () => {
  it("returns true for plain objects", () => {
    expect(isObjectRecord({})).toBe(true)
    expect(isObjectRecord({ key: "value" })).toBe(true)
    expect(isObjectRecord({ nested: { a: 1 } })).toBe(true)
  })

  it("returns false for arrays", () => {
    expect(isObjectRecord([])).toBe(false)
    expect(isObjectRecord([1, 2, 3])).toBe(false)
  })

  it("returns false for null", () => {
    expect(isObjectRecord(null)).toBe(false)
  })

  it("returns false for primitives", () => {
    expect(isObjectRecord("string")).toBe(false)
    expect(isObjectRecord(42)).toBe(false)
    expect(isObjectRecord(true)).toBe(false)
    expect(isObjectRecord(undefined)).toBe(false)
  })
})
