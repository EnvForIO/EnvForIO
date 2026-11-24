/**
 * Check the declared Rust minimum against locked dependency metadata.
 * Run with npm run rust:version:check. This checks every resolved platform,
 * not compilation or dependencies that omit their rust-version declaration.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

function compareVersions(left, right) {
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export function checkRustVersion(metadata) {
  const root = metadata.packages.find(pkg => pkg.id === metadata.resolve?.root)
  if (!root?.rust_version) {
    throw new Error('The root package must declare rust-version in Cargo.toml.')
  }

  const incompatible = metadata.packages.filter(
    pkg =>
      pkg.id !== root.id &&
      pkg.rust_version &&
      compareVersions(pkg.rust_version, root.rust_version) > 0
  )
  if (incompatible.length > 0) {
    const details = incompatible.map(
      pkg => `  ${pkg.name} ${pkg.version} requires Rust ${pkg.rust_version}`
    )
    throw new Error(
      `${root.name} declares Rust ${root.rust_version}, but locked dependencies require a newer version:\n` +
        details.join('\n') +
        '\nUpdate rust-version or choose compatible dependency versions.'
    )
  }
  return `Rust ${root.rust_version} meets all declared locked dependency requirements.`
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const metadata = execFileSync(
      'cargo',
      ['metadata', '--format-version', '1', '--locked'],
      {
        cwd: fileURLToPath(new URL('../src-tauri/', import.meta.url)),
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    )
    console.log(checkRustVersion(JSON.parse(metadata)))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
