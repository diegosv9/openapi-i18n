# Arquitectura

## Resumen

El repositorio separa claramente tres capas:

1. Fuente OpenAPI editable.
2. Pipeline de internacionalizacion.
3. Frontend de publicacion.

## Fuente y artefactos

### `openapi/source/openapi.source.yaml`

Es el spec fuente editado a mano. Debe seguir siendo legible y no contiene extensiones `x-i18n-key-*`.

### `openapi/base/openapi.base.yaml`

Es una version derivada del spec fuente. Conserva los textos fallback originales y anade las claves `x-i18n-key-title`, `x-i18n-key-summary` y `x-i18n-key-description`.

### `openapi/locales/*.json`

Cada archivo contiene un diccionario plano `clave -> texto traducido`.

### `openapi/dist/*.yaml`

Specs finales por idioma generados por `scripts/build-openapi-locale.ts`.

### `public/openapi/*.yaml`

Copia de los specs generados para que `Astro` los sirva como archivos estaticos.

## Scripts

### `scripts/sync-openapi-i18n.ts`

- Lee el spec fuente.
- Reutiliza claves existentes del spec base cuando puede.
- Genera claves nuevas cuando aparecen campos traducibles nuevos.
- Escribe la base sincronizada.
- Regenera `openapi/locales/en.json` con el texto fuente.

### `scripts/validate-i18n.ts`

- Recorre la base.
- Comprueba que cada campo traducible tenga su `x-i18n-key-*`.
- Detecta claves duplicadas en la base.
- Comprueba claves faltantes y huerfanas en cada locale.

### `scripts/build-openapi-locale.ts`

- Lee la base.
- Sustituye cada clave por su traduccion si existe.
- Usa el fallback del spec base cuando falta una traduccion.
- Genera un YAML final por idioma en `openapi/dist/`.
- Copia esos YAML a `public/openapi/`.

## Frontend

La app vive en `src/` y no genera un frontend distinto por idioma. La UI es unica y cambia de spec segun el idioma activo.

- `src/pages/api.astro`: entrada principal de la referencia.
- `src/components/ScalarReference.astro`: monta la referencia de `Scalar`.
- `src/lib/i18n.ts`: define idiomas, labels y `specUrl`.
- `src/pages/[lang]/api.astro`: redirecciona `/es/api` y `/en/api` a `/api?lang=...`.

## Campos traducibles soportados

Los scripts solo procesan estos campos:

- `title`
- `summary`
- `description`

El mapping se define en `scripts/lib/openapi-i18n.ts`.
