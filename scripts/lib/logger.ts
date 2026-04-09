const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const BLUE = "\x1b[34m"

const hasColor =
  process.env.NO_COLOR == null &&
  (process.stdout.isTTY === true || process.stderr.isTTY === true)

function fmt(text: string, ...codes: string[]): string {
  return hasColor ? `${codes.join("")}${text}${RESET}` : text
}

export function logHeader(title: string): void {
  console.log(fmt(`\n◆ ${title}`, BOLD, BLUE))
}

export function logSuccess(message: string): void {
  console.log(fmt(`✔ ${message}`, BOLD, GREEN))
}

export function logError(message: string): void {
  console.error(fmt(`✖ ${message}`, BOLD, RED))
}

export function logWarn(message: string): void {
  console.warn(fmt(`⚠ ${message}`, YELLOW))
}

export function logDetail(label: string, value: string): void {
  console.log(`  ${fmt(label, DIM)}  ${value}`)
}

export function logItem(message: string): void {
  console.log(fmt(`  · ${message}`, DIM))
}

export function logErrorItem(message: string): void {
  console.error(fmt(`  · ${message}`, RED))
}
