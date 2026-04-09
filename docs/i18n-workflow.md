# Pipeline i18n

## Flujo completo

```txt
openapi/source/openapi.source.yaml
  -> pnpm sync:i18n
openapi/base/openapi.base.yaml
  + openapi/locales/<lang>.json
  -> pnpm validate:i18n
locales validados
  -> pnpm check:i18n
traducciones revisadas
  -> pnpm build:i18n
openapi/dist/openapi-<lang>.yaml
  -> copia a public/openapi/
```

## 1. Sincronizacion

Ejecuta:

```bash
pnpm sync:i18n
```

Efecto:

- crea `openapi/base/openapi.base.yaml` si no existe
- conserva claves antiguas cuando el nodo ya estaba identificado
- genera claves nuevas a partir de la ruta estructural del nodo
- reconstruye todos los `openapi/locales/<lang>.json` configurados en `src/config/languages.ts`
- usa `en` como locale fuente y crea claves nuevas vacias en el resto de idiomas
- conserva las traducciones ya existentes cuando la clave sigue viva
- elimina claves huerfanas al regenerar cada locale configurado

## 2. Traduccion

Los idiomas disponibles se declaran en:

- `src/config/languages.ts`

Para cada idioma configurado existe un archivo:

- `openapi/locales/<lang>.json`

La convención actual es usar `en.json` como locale fuente sincronizado y mantener el resto de locales como traducciones sobre esa base.
El selector de idioma de la UI tambien se construye a partir de esta configuracion, asi que anadir o quitar idiomas ahi actualiza tanto el pipeline como el frontend.

## 3. Validacion

Ejecuta:

```bash
pnpm validate:i18n
```

Valida:

- claves faltantes en un locale
- claves huerfanas en un locale
- claves duplicadas en la base
- campos traducibles sin `x-i18n-key-*`

Si hay errores, el comando termina con exit code distinto de cero.

## 4. Check de traducciones pendientes

Ejecuta:

```bash
pnpm check:i18n
```

Valida:

- para cada locale configurado, recorre todas las claves esperadas desde `openapi/base/openapi.base.yaml`
- marca como pendiente cualquier clave ausente
- marca como pendiente cualquier clave cuyo valor no sea un string o sea un string vacio
- informa siempre indicando el locale al que pertenece cada clave

Este comando no compara traducciones con `en.json`.
Si hay pendientes, termina con exit code distinto de cero.

## 5. Build de specs localizados

Ejecuta:

```bash
pnpm build:i18n
```

Salida:

- `openapi/dist/openapi-es.yaml`
- `openapi/dist/openapi-en.yaml`
- copia equivalente en `public/openapi/`

Durante el build, si una clave no tiene traduccion en un locale, se mantiene el texto fallback de `openapi/base/openapi.base.yaml`.

## 6. Build completo

Para ejecutar todo el pipeline i18n en orden:

```bash
pnpm build:all
```

Ese script encadena:

1. `pnpm sync:i18n`
2. `pnpm validate:i18n`
3. `pnpm build:i18n`

## Anadir un idioma nuevo

1. Anade el idioma a `src/config/languages.ts` con su `code` y textos de UI.
2. Ejecuta `pnpm sync:i18n` para generar `openapi/locales/<lang>.json`.
3. Traduce los valores del locale generado. Las claves nuevas fuera de `en` se crean vacias.
4. Ejecuta `pnpm validate:i18n`.
5. Ejecuta `pnpm check:i18n`.
6. Ejecuta `pnpm build:i18n`.

## Tests unitarios

Cada script del pipeline tiene su lógica pura extraída en módulos bajo `scripts/lib/` y cubierta por tests exhaustivos en `scripts/tests/`.

```bash
pnpm test             # ejecuta todos los tests
pnpm test:watch       # modo watch
pnpm test:coverage    # tests + informe de cobertura Monocart (coverage/)
pnpm test:coverage:serve    # servidor local para visualizar coverage/index.html
```

| Módulo de tests | Qué cubre |
|---|---|
| `tests/lib/openapi-i18n.test.ts` | `getI18nKeyField`, `isTranslatableField`, `isI18nKeyField`, `isObjectRecord` |
| `tests/lib/logger.test.ts` | niveles de log, ausencia de ANSI con `NO_COLOR` |
| `tests/sync-logic.test.ts` | `sanitizeSegment`, `createUniqueKey`, `registerKeyUsage`, `computeTokenPath`, `mergeLocaleEntries`, `syncNode` con fixtures Petstore |
| `tests/validate-logic.test.ts` | `collectBaseKeys`, `validateLocale` |
| `tests/build-logic.test.ts` | `localizeNode` con spec Petstore completa |
| `tests/check-logic.test.ts` | `collectBaseKeys` (check), `findMissingTranslations` |

La cobertura supera el 99 % de statements y el 93 % de branches sobre `scripts/lib/*.ts`.
