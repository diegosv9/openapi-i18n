import type { CoverageResults } from "monocart-coverage-reports"

export default {
  name: "openapi-i18n coverage",
  outputDir: "./coverage",
  reports: ["v8", "console-details", "html"],
  lcov: true,
  onEnd: (results: CoverageResults) => {
    console.log(`Coverage report: ${results.reportPath}`)
  },
}
