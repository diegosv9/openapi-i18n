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

type LanguageConfigInput = {
  code: string
  label: string
  siteTitle: string
  subtitle: string
  description: string
  ctaLabel: string
  scalarUiText: ScalarUiText
}

const defineLanguage = <const T extends LanguageConfigInput>(language: T) => ({
  ...language,
  htmlLang: language.code,
  routeLabel: language.code.toUpperCase(),
})

export const SOURCE_LOCALE_CODE = "en" as const

export const LANGUAGE_METADATA = [
  defineLanguage({
    code: "es",
    label: "Espanol",
    siteTitle: "API del servicio",
    subtitle: "Referencia de API en castellano",
    description:
      "Una unica app Astro consume el spec generado para el idioma activo sin duplicar layouts ni componentes.",
    ctaLabel: "Abrir referencia",
    scalarUiText: {
      activateDarkMode: "Activar modo oscuro",
      activateLightMode: "Activar modo claro",
      all: "Todo",
      allQueryParameters: "Todos los parametros de query",
      authentication: "Autenticacion",
      body: "Cuerpo",
      brandName: "Brand",
      brandTagline: "Logo provisional",
      closeClient: "Cerrar cliente",
      closeMenu: "Cerrar menu",
      codeSnippet: "Codigo de ejemplo",
      cookies: "Cookies",
      copyUrl: "Copiar URL",
      headers: "Cabeceras",
      introduction: "Introduccion",
      key: "Clave",
      models: "Modelos",
      noBody: "Sin cuerpo",
      none: "Ninguno",
      openGroup: "Abrir grupo",
      openMenu: "Abrir menu",
      openSearch: "Abrir buscador",
      query: "Query",
      queryParameters: "Parametros de query",
      requestBody: "Cuerpo de la peticion",
      response: "Respuesta",
      search: "Buscar",
      searchPlaceholder: "Buscar en la referencia",
      searchResults: "Resultados de busqueda",
      select: "Seleccionar",
      selectApi: "Seleccionar API",
      send: "Enviar",
      sendRequest: "Enviar peticion",
      server: "Servidor",
      showSidebar: "Mostrar barra lateral",
      showSchema: "Mostrar schema",
      value: "Valor",
      variables: "Variables",
    },
  }),
  defineLanguage({
    code: "gl",
    label: "Galego",
    siteTitle: "API do servizo",
    subtitle: "Referencia da API en galego",
    description:
      "Unha unica app Astro consume a especificacion xerada para o idioma activo sen duplicar layouts nin compoñentes.",
    ctaLabel: "Abrir referencia",
    scalarUiText: {
      activateDarkMode: "Activar modo escuro",
      activateLightMode: "Activar modo claro",
      all: "Todo",
      allQueryParameters: "Todos os parametros de query",
      authentication: "Autenticacion",
      body: "Corpo",
      brandName: "Brand",
      brandTagline: "Logo provisional",
      closeClient: "Pechar cliente",
      closeMenu: "Pechar menu",
      codeSnippet: "Codigo de exemplo",
      cookies: "Cookies",
      copyUrl: "Copiar URL",
      headers: "Cabeceiras",
      introduction: "Introducion",
      key: "Clave",
      models: "Modelos",
      noBody: "Sen corpo",
      none: "Ningun",
      openGroup: "Abrir grupo",
      openMenu: "Abrir menu",
      openSearch: "Abrir buscador",
      query: "Query",
      queryParameters: "Parametros de query",
      requestBody: "Corpo da peticion",
      response: "Resposta",
      search: "Buscar",
      searchPlaceholder: "Buscar na referencia",
      searchResults: "Resultados da busca",
      select: "Seleccionar",
      selectApi: "Seleccionar API",
      send: "Enviar",
      sendRequest: "Enviar peticion",
      server: "Servidor",
      showSidebar: "Mostrar barra lateral",
      showSchema: "Mostrar schema",
      value: "Valor",
      variables: "Variables",
    },
  }),
  defineLanguage({
    code: "en",
    label: "English",
    siteTitle: "Service API",
    subtitle: "English API reference",
    description:
      "The Astro frontend stays shared while the rendered OpenAPI spec changes with the active language.",
    ctaLabel: "Open reference",
    scalarUiText: {
      activateDarkMode: "Enable dark mode",
      activateLightMode: "Enable light mode",
      all: "All",
      allQueryParameters: "All Query Parameters",
      authentication: "Authentication",
      body: "Body",
      brandName: "Brand",
      brandTagline: "Temporary logo",
      closeClient: "Close Client",
      closeMenu: "Close menu",
      codeSnippet: "Code Snippet",
      cookies: "Cookies",
      copyUrl: "Copy URL",
      headers: "Headers",
      introduction: "Introduction",
      key: "Key",
      models: "Models",
      noBody: "No Body",
      none: "None",
      openGroup: "Open Group",
      openMenu: "Open menu",
      openSearch: "Open search",
      query: "Query",
      queryParameters: "Query Parameters",
      requestBody: "Request Body",
      response: "Response",
      search: "Search",
      searchPlaceholder: "Search the reference",
      searchResults: "Search results",
      select: "Select",
      selectApi: "Select API",
      send: "Send",
      sendRequest: "Send Request",
      server: "Server",
      showSidebar: "Show sidebar",
      showSchema: "Show Schema",
      value: "Value",
      variables: "Variables",
    },
  }),
] as const
