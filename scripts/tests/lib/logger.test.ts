import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  logDetail,
  logError,
  logErrorItem,
  logHeader,
  logItem,
  logSuccess,
  logWarn,
} from "../../lib/logger.js"

describe("logger (NO_COLOR)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    process.env.NO_COLOR = "1"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.NO_COLOR
  })

  it("logHeader calls console.log with the title text", () => {
    logHeader("Sincronizando i18n")
    expect(console.log).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.log).mock.calls[0] as [string]
    expect(output).toContain("Sincronizando i18n")
    expect(output).not.toMatch(/\x1b\[/)
  })

  it("logSuccess calls console.log with the message", () => {
    logSuccess("Completado")
    expect(console.log).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.log).mock.calls[0] as [string]
    expect(output).toContain("Completado")
    expect(output).not.toMatch(/\x1b\[/)
  })

  it("logError calls console.error with the message", () => {
    logError("Algo falló")
    expect(console.error).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.error).mock.calls[0] as [string]
    expect(output).toContain("Algo falló")
    expect(output).not.toMatch(/\x1b\[/)
  })

  it("logWarn calls console.warn with the message", () => {
    logWarn("Advertencia")
    expect(console.warn).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.warn).mock.calls[0] as [string]
    expect(output).toContain("Advertencia")
    expect(output).not.toMatch(/\x1b\[/)
  })

  it("logDetail calls console.log with label and value", () => {
    logDetail("Base", "/path/to/file.yaml")
    expect(console.log).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.log).mock.calls[0] as [string]
    expect(output).toContain("Base")
    expect(output).toContain("/path/to/file.yaml")
  })

  it("logItem calls console.log with the message", () => {
    logItem("un elemento")
    expect(console.log).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.log).mock.calls[0] as [string]
    expect(output).toContain("un elemento")
  })

  it("logErrorItem calls console.error with the message", () => {
    logErrorItem("un error")
    expect(console.error).toHaveBeenCalledOnce()
    const [output] = vi.mocked(console.error).mock.calls[0] as [string]
    expect(output).toContain("un error")
  })
})
