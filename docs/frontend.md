# Frontend y rutas

## App Astro

La publicacion se hace con una sola app `Astro`. No existe una app separada por idioma ni un proceso paralelo de `Scalar CLI`.

Configuracion base:

- `astro.config.mjs` fija el servidor de desarrollo en el puerto `4321`.

## Rutas

### `/`

`src/pages/index.astro` redirige directamente a `/api`.

### `/api`

`src/pages/api.astro` renderiza el layout principal y monta `ScalarReference`.

### `/<lang>/api`

`src/pages/[lang]/api.astro` genera rutas estaticas para los idiomas declarados en `src/lib/i18n.ts` y redirige a `/api?lang=<lang>`.

## Idiomas de UI

Los idiomas disponibles se declaran en `src/lib/i18n.ts`.

Cada definicion incluye:

- `code`
- `label`
- `htmlLang`
- `routeLabel`
- `specUrl`
- textos auxiliares de la UI

El `specUrl` debe apuntar a un archivo existente en `public/openapi/`.

## Integracion con Scalar

La integracion principal se reparte entre:

- `src/components/ScalarReference.astro`
- `src/scripts/mount-scalar-reference.ts`

Responsabilidades:

- cargar `@scalar/api-reference`
- aplicar la configuracion visual del contenedor
- sincronizar el idioma activo con la URL
- personalizar controles del header
- ocultar branding que no encaja con la UI del proyecto

## Desarrollo local

```bash
pnpm dev
```

Ese comando ejecuta primero `pnpm build:all` y luego arranca `astro dev`.

Por tanto, si el pipeline i18n falla, la app no arranca.

## Build de produccion

```bash
pnpm build
```

Ese comando:

1. vuelve a generar y validar los specs localizados
2. ejecuta `astro build`

Para probar la build generada:

```bash
pnpm preview
```
