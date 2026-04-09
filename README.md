# openapi-i18n

Repositorio de ejemplo para generar y publicar una referencia OpenAPI multidioma con una unica app `Astro` y `Scalar`.

## Que hace este repositorio

El flujo parte de un spec fuente en `openapi/source/openapi.source.yaml`. A partir de ese archivo:

1. `sync:i18n` genera o actualiza `openapi/base/openapi.base.yaml` y reconstruye el locale fuente `openapi/locales/en.json`.
2. `validate:i18n` comprueba que la base y todos los locales tengan claves consistentes.
3. `build:i18n` genera un spec final por idioma en `openapi/dist/` y lo copia a `public/openapi/`.
4. La app `Astro` consume esos YAML generados y renderiza una unica referencia con selector interno de idioma.

## Requisitos

- Node.js
- pnpm 10

## Instalacion

```bash
pnpm install
```

## Comandos principales

```bash
pnpm sync:i18n
pnpm validate:i18n
pnpm build:i18n
pnpm build:all
pnpm dev
pnpm build
pnpm preview
```

## Tests

Los scripts del pipeline tienen tests unitarios exhaustivos con Vitest y cobertura visual con Monocart.

```bash
pnpm test             # ejecuta todos los tests una vez
pnpm test:watch       # modo watch para desarrollo
pnpm test:coverage    # tests con informe de cobertura Monocart (HTML en coverage/)
pnpm test:coverage:serve  # servidor local para abrir el informe generado
```

Los tests cubren la lógica pura de cada script (`sync-logic`, `validate-logic`, `build-logic`, `check-logic`) y las librerías auxiliares (`openapi-i18n`, `logger`) con fixtures que replican la especificación Petstore completa.

## Estructura

```txt
openapi/
  source/     # spec OpenAPI editado a mano
  base/       # spec base con x-i18n-key-*
  locales/    # diccionarios JSON por idioma
  dist/       # YAML generados por idioma

public/openapi/  # specs publicados por Astro
scripts/         # pipeline de sincronizacion, validacion y build
src/             # frontend Astro + integracion con Scalar
docs/            # documentacion tecnica del repositorio
```

## Flujo recomendado

Cuando cambies el spec fuente:

```bash
pnpm sync:i18n
pnpm validate:i18n
pnpm build:i18n
```

Cuando cambies el frontend:

```bash
pnpm dev
```

## Documentacion adicional

- [Arquitectura](docs/architecture.md)
- [Pipeline i18n](docs/i18n-workflow.md)
- [Frontend y rutas](docs/frontend.md)
