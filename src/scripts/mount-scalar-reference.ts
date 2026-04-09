import { createApiReference } from "@scalar/api-reference"
import { BRANDING_CONFIG } from "../config/branding"

const SUN_SVG = `<svg class="scalar-theme-pill__sun" width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`
const MOON_SVG = `<svg class="scalar-theme-pill__moon" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`

type ScalarUiText = {
  activateDarkMode: string
  activateLightMode: string
  all: string
  allQueryParameters: string
  authentication: string
  body: string
  brandName: string
  brandTagline: string
  closeClient: string
  closeMenu: string
  codeSnippet: string
  cookies: string
  copyUrl: string
  headers: string
  introduction: string
  key: string
  models: string
  noBody: string
  none: string
  openGroup: string
  openMenu: string
  openSearch: string
  query: string
  queryParameters: string
  requestBody: string
  response: string
  search: string
  searchPlaceholder: string
  searchResults: string
  select: string
  selectApi: string
  send: string
  sendRequest: string
  server: string
  showSidebar: string
  showSchema: string
  value: string
  variables: string
}

type SerializedLanguageDocument = {
  code: string
  label: string
  routeLabel: string
  specUrl: string
  siteTitle: string
  scalarUiText: ScalarUiText
}

const mountNode = document.getElementById("api-reference")

function setLanguageTransitionOverlay(isActive: boolean): Promise<void> {
  const overlay = document.querySelector(".scalar-language-transition-overlay")
  if (!(overlay instanceof HTMLElement)) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const onEnd = () => {
      overlay.removeEventListener("transitionend", onEnd)
      window.clearTimeout(safetyTimer)
      resolve()
    }
    const safetyTimer = window.setTimeout(onEnd, 600)
    overlay.addEventListener("transitionend", onEnd)

    if (isActive) {
      overlay.dataset.active = "true"
    } else {
      delete overlay.dataset.active
    }
  })
}

if (mountNode instanceof HTMLElement) {
  const scalarRoot = mountNode.closest(".scalar-root")
  const serializedDocuments = mountNode.dataset.documents

  if (serializedDocuments) {
    const documents = JSON.parse(serializedDocuments) as SerializedLanguageDocument[]

    const languageCodes = new Set(documents.map((language) => language.code))
    const queryLanguage = new URL(window.location.href).searchParams.get("lang")
    const persistedLanguage = window.sessionStorage.getItem(
      "scalar-selected-language",
    )
    const requestedLanguage =
      (queryLanguage && languageCodes.has(queryLanguage) ? queryLanguage : null) ??
      (persistedLanguage && languageCodes.has(persistedLanguage)
        ? persistedLanguage
        : null) ??
      documents[0]?.code

    const syncLanguageState = (
      languageCode: string,
      historyMode: "push" | "replace",
    ) => {
      const nextUrl = new URL(window.location.href)
      nextUrl.pathname = "/api"
      nextUrl.searchParams.set("lang", languageCode)
      if (historyMode === "push") {
        window.history.pushState({}, "", nextUrl)
      } else {
        window.history.replaceState({}, "", nextUrl)
      }
      window.sessionStorage.setItem("scalar-selected-language", languageCode)
      document.documentElement.lang = languageCode
    }

    if (requestedLanguage) {
      syncLanguageState(requestedLanguage, "replace")
    }

    let activeLanguage = requestedLanguage
    const specCache = new Map<string, string>()
    const specRequests = new Map<string, Promise<string | null>>()
    const getDocumentForLanguage = (languageCode: string | null | undefined) =>
      documents.find((document) => document.code === languageCode) ?? documents[0]
    const getUiTextForLanguage = (languageCode: string | null | undefined) =>
      getDocumentForLanguage(languageCode)?.scalarUiText ?? documents[0]?.scalarUiText

    const preloadDocumentSpec = async (languageCode: string) => {
      const cachedSpec = specCache.get(languageCode)
      if (cachedSpec) {
        return cachedSpec
      }

      const pendingRequest = specRequests.get(languageCode)
      if (pendingRequest) {
        return pendingRequest
      }

      const activeDocument = getDocumentForLanguage(languageCode)
      if (!activeDocument) {
        return null
      }

      const request = window
        .fetch(activeDocument.specUrl)
        .then(async (response) => {
          if (!response.ok) {
            return null
          }

          const specContent = await response.text()
          specCache.set(activeDocument.code, specContent)
          return specContent
        })
        .catch(() => null)
        .finally(() => {
          specRequests.delete(languageCode)
        })

      specRequests.set(languageCode, request)
      return request
    }

    const buildScalarConfiguration = (languageCode: string | null | undefined) => {
      const activeDocument = getDocumentForLanguage(languageCode)

      if (!activeDocument) {
        return null
      }

      const specContent = specCache.get(activeDocument.code)

      return {
        title: activeDocument.routeLabel,
        slug: activeDocument.code,
        ...(specContent
          ? {
              content: specContent,
            }
          : {
              url: activeDocument.specUrl,
            }),
        theme: "default",
        layout: "modern",
        searchHotKey: "k",
        showDeveloperTools: "never",
        documentDownloadType: "none",
        hiddenClients: true,
        hideClientButton: true,
        agent: {
          disabled: true,
          hideAddApi: true,
        },
        mcp: {
          disabled: true,
        },
        metaData: {
          title: activeDocument.siteTitle,
        },
      }
    }

    const initialConfiguration = buildScalarConfiguration(activeLanguage)

    if (initialConfiguration) {
      const scalarInstance = createApiReference(mountNode, initialConfiguration)
      let transitionToken = 0
      const stopUiPatchObserver = observeScalarUiTranslations(() =>
        getUiTextForLanguage(activeLanguage),
      )

      const lockPageScroll = () => {
        const scrollY = window.scrollY
        const scrollbarWidth =
          window.innerWidth - document.documentElement.clientWidth

        document.documentElement.classList.add("scalar-language-transition-lock")
        document.body.classList.add("scalar-language-transition-lock")
        document.body.style.top = `-${scrollY}px`
        document.body.style.paddingRight =
          scrollbarWidth > 0 ? `${scrollbarWidth}px` : ""
        return scrollY
      }

      const unlockPageScroll = (scrollY: number) => {
        document.documentElement.classList.remove("scalar-language-transition-lock")
        document.body.classList.remove("scalar-language-transition-lock")
        document.body.style.top = ""
        document.body.style.paddingRight = ""
        window.scrollTo({ top: scrollY, left: 0, behavior: "instant" })
      }

      const runLanguageTransition = async (update: () => Promise<void>) => {
        transitionToken += 1
        const currentToken = transitionToken
        const scrollY = lockPageScroll()

        if (scalarRoot instanceof HTMLElement) {
          scalarRoot.classList.add("scalar-root--language-transition")
        }

        // Wait for the overlay to become fully opaque before updating content
        await setLanguageTransitionOverlay(true)
        await update()
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)))
        await new Promise((resolve) => window.setTimeout(resolve, 320))

        if (
          currentToken === transitionToken &&
          scalarRoot instanceof HTMLElement
        ) {
          scalarRoot.classList.remove("scalar-root--language-transition")
        }

        if (currentToken === transitionToken) {
          setLanguageTransitionOverlay(false)
          unlockPageScroll(scrollY)
        }
      }

      const updateLanguage = async (
        languageCode: string,
        historyMode: "push" | "replace",
      ) => {
        await runLanguageTransition(async () => {
          await preloadDocumentSpec(languageCode)
          const nextConfiguration = buildScalarConfiguration(languageCode)

          if (!nextConfiguration) {
            return
          }

          activeLanguage = languageCode
          syncLanguageState(languageCode, historyMode)
          scalarInstance.updateConfiguration(nextConfiguration)
          scheduleChromeMount(
            documents,
            activeLanguage,
            updateLanguage,
            getUiTextForLanguage(activeLanguage),
          )
        })
      }

      window.addEventListener("popstate", () => {
        const nextLanguage = new URL(window.location.href).searchParams.get("lang")
        const resolvedLanguage =
          (nextLanguage && languageCodes.has(nextLanguage) ? nextLanguage : null) ??
          documents[0]?.code

        if (!resolvedLanguage || resolvedLanguage === activeLanguage) {
          return
        }

        updateLanguage(resolvedLanguage, "replace")
      })

      documents.forEach((document) => {
        void preloadDocumentSpec(document.code)
      })

      scheduleChromeMount(
        documents,
        activeLanguage,
        updateLanguage,
        getUiTextForLanguage(activeLanguage),
      )

      window.addEventListener("beforeunload", () => {
        stopUiPatchObserver()
      })
    }
  }
}

function scheduleChromeMount(
  documents: SerializedLanguageDocument[],
  activeLanguage: string | undefined,
  updateLanguage: (
    languageCode: string,
    historyMode: "push" | "replace",
  ) => Promise<void>,
  uiText: ScalarUiText | undefined,
) {
  let attempts = 0

  const mountChrome = () => {
    mountSidebarChrome(uiText)
    mountReferenceHeaderControls(documents, activeLanguage, updateLanguage, uiText)
    scrubScalarBranding()
    applyScalarUiTranslations(uiText)

    attempts += 1

    const hasSidebar = document.querySelector(".scalar-sidebar-brandbar")
    const hasHeader = document.querySelector(".scalar-reference-header")
    const hasLanguageSwitch = document.querySelector(
      ".scalar-language-switch__button",
    )
    const hasThemeToggle = document.querySelector(
      ".scalar-header-theme-toggle button",
    )

    if (
      attempts < 30 &&
      (!hasSidebar || !hasHeader || !hasLanguageSwitch || !hasThemeToggle)
    ) {
      window.requestAnimationFrame(mountChrome)
    }
  }

  mountChrome()
}

function mountSidebarChrome(uiText: ScalarUiText | undefined) {
  const sidebar = document.querySelector(".t-doc__sidebar")

  if (!(sidebar instanceof HTMLElement)) {
    return
  }

  const documentSelector = sidebar.querySelector(".document-selector")
  if (documentSelector instanceof HTMLElement) {
    documentSelector.remove()
  }

  let header = sidebar.querySelector(".scalar-sidebar-brandbar")

  if (!(header instanceof HTMLElement)) {
    const hasThemeLogos =
      Boolean(BRANDING_CONFIG.lightLogoSrc) || Boolean(BRANDING_CONFIG.darkLogoSrc)
    const lightLogoSrc =
      BRANDING_CONFIG.lightLogoSrc || BRANDING_CONFIG.darkLogoSrc || ""
    const darkLogoSrc =
      BRANDING_CONFIG.darkLogoSrc || BRANDING_CONFIG.lightLogoSrc || ""

    header = document.createElement("div")
    header.className = "scalar-sidebar-brandbar"
    header.innerHTML = `
      <div class="scalar-sidebar-brand">
        <div class="scalar-sidebar-brand__mark" data-has-logo="${String(hasThemeLogos)}">
          <img
            class="scalar-sidebar-brand__logo scalar-sidebar-brand__logo--light"
            src="${escapeHtmlAttribute(lightLogoSrc)}"
            alt=""
            loading="eager"
            decoding="async"
          />
          <img
            class="scalar-sidebar-brand__logo scalar-sidebar-brand__logo--dark"
            src="${escapeHtmlAttribute(darkLogoSrc)}"
            alt=""
            loading="eager"
            decoding="async"
          />
          <span class="scalar-sidebar-brand__fallback">${BRANDING_CONFIG.monogram}</span>
        </div>
        <div class="scalar-sidebar-brand__copy">
          <strong></strong>
          <span></span>
        </div>
      </div>
    `

    const searchBlock = sidebar.querySelector(".my-2")
    if (searchBlock instanceof HTMLElement) {
      sidebar.insertBefore(header, searchBlock)
    } else {
      sidebar.prepend(header)
    }
  }

  const brandMark = header.querySelector(".scalar-sidebar-brand__mark")
  const brandName = header.querySelector(".scalar-sidebar-brand__copy strong")
  const brandTagline = header.querySelector(".scalar-sidebar-brand__copy span")
  const lightLogo = header.querySelector(".scalar-sidebar-brand__logo--light")
  const darkLogo = header.querySelector(".scalar-sidebar-brand__logo--dark")

  const hasThemeLogos =
    Boolean(BRANDING_CONFIG.lightLogoSrc) || Boolean(BRANDING_CONFIG.darkLogoSrc)
  const lightLogoSrc = BRANDING_CONFIG.lightLogoSrc || BRANDING_CONFIG.darkLogoSrc || ""
  const darkLogoSrc = BRANDING_CONFIG.darkLogoSrc || BRANDING_CONFIG.lightLogoSrc || ""

  if (brandMark instanceof HTMLElement) {
    brandMark.dataset.hasLogo = String(hasThemeLogos)
  }

  if (brandName instanceof HTMLElement) {
    brandName.textContent = uiText?.brandName ?? "Brand"
  }

  if (brandTagline instanceof HTMLElement) {
    brandTagline.textContent = uiText?.brandTagline ?? "Logo placeholder"
  }

  if (lightLogo instanceof HTMLImageElement) {
    lightLogo.src = lightLogoSrc
    lightLogo.alt = uiText?.brandName ?? "Brand"
  }

  if (darkLogo instanceof HTMLImageElement) {
    darkLogo.src = darkLogoSrc
    darkLogo.alt = uiText?.brandName ?? "Brand"
  }
}

function mountReferenceHeaderControls(
  documents: SerializedLanguageDocument[],
  activeLanguage: string | undefined,
  updateLanguage: (
    languageCode: string,
    historyMode: "push" | "replace",
  ) => Promise<void>,
  uiText: ScalarUiText | undefined,
) {
  const referenceContainer = document.querySelector(
    ".references-rendered .narrow-references-container",
  )
  const themeToggle = document.querySelector(".darklight-reference")
  const originalFooterContainer = themeToggle?.parentElement

  if (
    !(referenceContainer instanceof HTMLElement) ||
    !(themeToggle instanceof HTMLElement)
  ) {
    return
  }

  let header = referenceContainer.querySelector(".scalar-reference-header")
  if (!(header instanceof HTMLElement)) {
    header = document.createElement("div")
    header.className = "scalar-reference-header"
    referenceContainer.prepend(header)
  }

  let controls = header.querySelector(".scalar-header-controls")

  if (!(controls instanceof HTMLElement)) {
    controls = document.createElement("div")
    controls.className = "scalar-header-controls"
    header.appendChild(controls)
  }

  let languageSwitch = controls.querySelector(".scalar-language-switch")
  if (!(languageSwitch instanceof HTMLElement)) {
    languageSwitch = document.createElement("div")
    languageSwitch.className = "scalar-language-switch"
    controls.appendChild(languageSwitch)
  }

  // Keep Scalar's toggle in the DOM (Vue needs it) but hide it visually
  if (themeToggle.parentElement !== controls) {
    controls.insertBefore(themeToggle, languageSwitch)
  }
  sanitizeThemeToggle(themeToggle)
  themeToggle.classList.add("scalar-header-theme-toggle")

  // Replace Scalar's toggle with our custom pill
  renderThemePill(controls, themeToggle, languageSwitch, uiText)
  renderLanguageSwitch(languageSwitch, documents, activeLanguage, updateLanguage)

  if (
    originalFooterContainer instanceof HTMLElement &&
    originalFooterContainer !== controls &&
    originalFooterContainer.childElementCount === 0
  ) {
    originalFooterContainer.style.display = "none"
  }
}

function renderThemePill(
  controls: HTMLElement,
  scalarToggle: HTMLElement,
  beforeEl: HTMLElement,
  uiText: ScalarUiText | undefined,
) {
  const syncPillState = (pill: HTMLElement) => {
    const isDark = document.body.classList.contains("dark-mode")
    pill.setAttribute("data-dark", String(isDark))
    pill.setAttribute("aria-pressed", String(isDark))
    pill.setAttribute(
      "aria-label",
      isDark
        ? (uiText?.activateLightMode ?? "Activar modo claro")
        : (uiText?.activateDarkMode ?? "Activar modo oscuro"),
    )
  }

  const existingPill = controls.querySelector(".scalar-theme-pill")
  if (existingPill instanceof HTMLElement) {
    syncPillState(existingPill)
    return
  }

  const isDark = document.body.classList.contains("dark-mode")

  const pill = document.createElement("button")
  pill.type = "button"
  pill.className = "scalar-theme-pill"
  pill.setAttribute("data-dark", String(isDark))
  pill.setAttribute("aria-pressed", String(isDark))
  pill.innerHTML = `<span class="scalar-theme-pill__thumb">${SUN_SVG}${MOON_SVG}</span>`
  syncPillState(pill)

  pill.addEventListener("click", () => {
    const scalarBtn = scalarToggle.querySelector("button")
    if (scalarBtn instanceof HTMLButtonElement) {
      scalarBtn.click()
    }
  })

  const observer = new MutationObserver(() => {
    syncPillState(pill)
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })

  controls.insertBefore(pill, beforeEl)
}

function renderLanguageSwitch(
  container: HTMLElement,
  documents: SerializedLanguageDocument[],
  activeLanguage: string | undefined,
  updateLanguage: (
    languageCode: string,
    historyMode: "push" | "replace",
  ) => Promise<void>,
) {
  container.replaceChildren(
    ...documents.map((languageDocument) => {
      const button = window.document.createElement("button")
      button.type = "button"
      button.className = "scalar-language-switch__button"
      button.textContent = languageDocument.routeLabel
      button.dataset.lang = languageDocument.code

      if (languageDocument.code === activeLanguage) {
        button.dataset.active = "true"
        button.setAttribute("aria-current", "true")
      }

      button.addEventListener("click", () => {
        if (languageDocument.code === activeLanguage) {
          return
        }

        updateLanguage(languageDocument.code, "push")
      })

      return button
    }),
  )
}

function observeScalarUiTranslations(
  getUiText: () => ScalarUiText | undefined,
): () => void {
  let frameId = 0
  let warmupRuns = 0

  const applyPatch = () => {
    frameId = 0
    applyScalarUiTranslations(getUiText())
  }

  const schedulePatch = () => {
    if (frameId !== 0) {
      return
    }

    frameId = window.requestAnimationFrame(applyPatch)
  }

  const observer = new MutationObserver(schedulePatch)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["aria-label", "aria-placeholder", "placeholder", "title"],
  })

  schedulePatch()
  const warmupTimer = window.setInterval(() => {
    applyPatch()
    warmupRuns += 1
    if (warmupRuns >= 40) {
      window.clearInterval(warmupTimer)
    }
  }, 250)

  return () => {
    observer.disconnect()
    window.clearInterval(warmupTimer)
    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId)
    }
  }
}

function applyScalarUiTranslations(uiText: ScalarUiText | undefined) {
  if (!uiText) {
    return
  }

  const textReplacements = getScalarTextReplacements(uiText)

  for (const element of Array.from(document.querySelectorAll(".sidebar-search-placeholder"))) {
    if (element instanceof HTMLElement) {
      element.textContent = uiText.search
    }
  }

  for (const input of Array.from(document.querySelectorAll("input[role='combobox']"))) {
    if (!(input instanceof HTMLInputElement)) {
      continue
    }

    input.placeholder = uiText.searchPlaceholder
    input.setAttribute("aria-label", uiText.searchPlaceholder)
  }

  for (const helperText of Array.from(document.querySelectorAll(".sr-only"))) {
    if (!(helperText instanceof HTMLElement)) {
      continue
    }

    if (helperText.textContent?.trim() === "Open Search") {
      helperText.textContent = uiText.openSearch
    }
  }

  for (const element of Array.from(
    document.querySelectorAll("[aria-label], [aria-placeholder], [placeholder], [title]"),
  )) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    replaceAttributeValue(element, "aria-label", textReplacements)
    replaceAttributeValue(element, "aria-placeholder", textReplacements)
    replaceAttributeValue(element, "placeholder", textReplacements)
    replaceAttributeValue(element, "title", textReplacements)
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  while (walker.nextNode()) {
    if (walker.currentNode instanceof Text) {
      textNodes.push(walker.currentNode)
    }
  }

  for (const textNode of textNodes) {
    replaceTextNodeValue(textNode, textReplacements)
  }

  for (const element of Array.from(
    document.querySelectorAll("button, label, span, div, h1, h2, h3, h4, p"),
  )) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    replaceElementTextNodes(element, textReplacements)
  }
}

function getScalarTextReplacements(uiText: ScalarUiText): Record<string, string> {
  return {
    All: uiText.all,
    "All Query Parameters": uiText.allQueryParameters,
    Authentication: uiText.authentication,
    Body: uiText.body,
    "Close Client": uiText.closeClient,
    "Close Menu": uiText.closeMenu,
    "Code Snippet": uiText.codeSnippet,
    Cookies: uiText.cookies,
    "Copy URL": uiText.copyUrl,
    Headers: uiText.headers,
    Introduction: uiText.introduction,
    Key: uiText.key,
    Models: uiText.models,
    "No Body": uiText.noBody,
    None: uiText.none,
    "Open Group": uiText.openGroup,
    "Open Menu": uiText.openMenu,
    "Open Search": uiText.openSearch,
    Query: uiText.query,
    "Query Parameters": uiText.queryParameters,
    "Reference Search": uiText.searchPlaceholder,
    "Reference Search Results": uiText.searchResults,
    "Request Body": uiText.requestBody,
    Response: uiText.response,
    Search: uiText.search,
    Select: uiText.select,
    "Select API": uiText.selectApi,
    Send: uiText.send,
    "Send Request": uiText.sendRequest,
    Server: uiText.server,
    "Show Schema": uiText.showSchema,
    "Show sidebar": uiText.showSidebar,
    Value: uiText.value,
    Variables: uiText.variables,
  }
}

function replaceTextNodeValue(textNode: Text, replacements: Record<string, string>) {
  const source = textNode.textContent
  const trimmed = source?.trim()

  if (!source || !trimmed) {
    return
  }

  const replacement = replacements[trimmed]
  if (!replacement || replacement === trimmed) {
    return
  }

  const prefixLength = source.indexOf(trimmed)
  const prefix = source.slice(0, prefixLength)
  const suffix = source.slice(prefixLength + trimmed.length)
  textNode.textContent = `${prefix}${replacement}${suffix}`
}

function replaceAttributeValue(
  element: HTMLElement,
  attribute: string,
  replacements: Record<string, string>,
) {
  const currentValue = element.getAttribute(attribute)
  if (!currentValue) {
    return
  }

  const trimmed = currentValue.trim()
  const replacement = replacements[trimmed]
  if (!replacement || replacement === trimmed) {
    return
  }

  element.setAttribute(attribute, replacement)
}

function replaceElementTextNodes(
  element: HTMLElement,
  replacements: Record<string, string>,
) {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !(node instanceof Text)) {
      continue
    }

    replaceTextNodeValue(node, replacements)
  }
}

function escapeHtmlAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}

function sanitizeThemeToggle(themeToggle: HTMLElement) {
  for (const node of Array.from(themeToggle.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      node.remove()
      continue
    }

    if (!(node instanceof HTMLElement)) {
      continue
    }

    const hasToggleControl =
      node.matches("button") ||
      node.querySelector('button, [role="switch"], input[type="checkbox"]')

    if (!hasToggleControl) {
      node.remove()
    }
  }
}

function scrubScalarBranding() {
  const themeToggle = document.querySelector(".darklight-reference")
  if (themeToggle instanceof HTMLElement) {
    sanitizeThemeToggle(themeToggle)
  }

  for (const link of Array.from(document.querySelectorAll('a[href*="scalar.com"]'))) {
    if (!(link instanceof HTMLElement)) {
      continue
    }

    const withinThemeToggle = link.closest(".darklight-reference")

    if (withinThemeToggle instanceof HTMLElement) {
      link.remove()
      continue
    }

    const removableContainer =
      link.closest("[class*='footer']") ??
      link.parentElement

    if (removableContainer instanceof HTMLElement) {
      removableContainer.remove()
    } else {
      link.remove()
    }
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const brandedNodes: Text[] = []

  while (walker.nextNode()) {
    const currentNode = walker.currentNode
    if (
      currentNode instanceof Text &&
      currentNode.textContent?.trim() === "Powered by Scalar"
    ) {
      brandedNodes.push(currentNode)
    }
  }

  for (const textNode of brandedNodes) {
    const withinThemeToggle = textNode.parentElement?.closest(".darklight-reference")

    if (withinThemeToggle instanceof HTMLElement) {
      textNode.remove()
      continue
    }

    const removableContainer = textNode.parentElement

    if (removableContainer instanceof HTMLElement) {
      removableContainer.remove()
    } else {
      textNode.remove()
    }
  }
}
