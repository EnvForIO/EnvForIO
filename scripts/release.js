#!/usr/bin/env node
// Release helper. main is protected, so a release takes two steps:
//
//   npm run release:prepare v0.2.0   bump the version on a release/v0.2.0
//                                    branch and push it for a pull request
//   npm run release:tag v0.2.0       after the pull request is merged, tag
//                                    main and push the tag, which starts
//                                    .github/workflows/release.yml
//
// See docs/developer/releases.md.

import fs from 'fs'
import { execSync } from 'child_process'
import readline from 'readline'

const VERSION_FILES = [
  'package.json',
  'package-lock.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
  'src-tauri/tauri.conf.json',
]

function run(command) {
  execSync(command, { stdio: 'inherit' })
}

function read(command) {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await new Promise(resolve => rl.question(question, resolve))
  rl.close()
  return ['y', 'yes'].includes(answer.trim().toLowerCase())
}

// Both steps start from an up-to-date, clean main.
function requireCleanMain() {
  if (read('git rev-parse --abbrev-ref HEAD') !== 'main') {
    fail('Switch to main first: git switch main')
  }
  const status = read('git status --porcelain')
  if (status) fail(`The working tree has uncommitted changes:\n${status}`)
  console.log('Fetching origin...')
  run('git fetch --quiet origin main --tags')
  run('git merge --quiet --ff-only origin/main')
}

function requireNewTag(tag) {
  const local = read(`git tag --list ${tag}`)
  const remote = read(`git ls-remote --tags origin refs/tags/${tag}`)
  if (local || remote) fail(`${tag} already exists.`)
}

function setVersion(version) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  console.log(`Version ${pkg.version} -> ${version}`)
  pkg.version = version
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')

  // The first `version = "..."` in Cargo.toml is the one under [package].
  const cargoPath = 'src-tauri/Cargo.toml'
  const cargo = fs.readFileSync(cargoPath, 'utf8')
  fs.writeFileSync(
    cargoPath,
    cargo.replace(/version = "[^"]*"/, `version = "${version}"`)
  )

  const confPath = 'src-tauri/tauri.conf.json'
  const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
  conf.version = version
  fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n')

  // Refresh the lock files: npm for package-lock.json, cargo for Cargo.lock.
  run('npm install --silent')
  run('cargo check --quiet --manifest-path src-tauri/Cargo.toml')
}

function compareUrl(branch) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  return `${pkg.homepage}/compare/main...${branch}?expand=1`
}

async function prepare(version, tag) {
  requireCleanMain()
  requireNewTag(tag)
  const branch = `release/${tag}`

  console.log('\nRunning npm run check:all...')
  run('npm run check:all')

  run(`git switch --quiet -c ${branch}`)
  setVersion(version)
  run(`git add -- ${VERSION_FILES.join(' ')}`)
  run(`git commit --quiet -m "chore: release ${tag}"`)
  console.log(`\nCommitted the version bump on ${branch}.`)

  if (await confirm(`Push ${branch} to origin? (y/N) `)) {
    run(`git push --quiet -u origin ${branch}`)
    console.log(`\nOpen the pull request: ${compareUrl(branch)}`)
  } else {
    console.log(`\nPush it later: git push -u origin ${branch}`)
  }
  console.log(`Once it is merged: npm run release:tag ${tag}`)
}

async function tagRelease(version, tag) {
  requireCleanMain()
  requireNewTag(tag)

  const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'))
  if (conf.version !== version) {
    fail(
      `main is at version ${conf.version}, not ${version}. ` +
        `Merge the release/${tag} pull request first.`
    )
  }

  const commit = read('git log -1 --format="%h %s"')
  if (!(await confirm(`Tag ${commit} as ${tag} and push the tag? (y/N) `))) {
    return
  }
  run(`git tag -a ${tag} -m "EnvForIO ${tag}"`)
  run(`git push --quiet origin ${tag}`)
  console.log(
    `\nPushed ${tag}. The release workflow is building the installers;` +
      ' the draft appears under Releases. Check it, then publish it.'
  )
}

const [command, input] = process.argv.slice(2)
if (
  !['prepare', 'tag'].includes(command) ||
  !/^v?\d+\.\d+\.\d+$/.test(input ?? '')
) {
  fail(
    'Usage: npm run release:prepare v0.2.0\n' +
      '       npm run release:tag v0.2.0'
  )
}
const version = input.replace(/^v/, '')
const tag = `v${version}`

try {
  if (command === 'prepare') await prepare(version, tag)
  else await tagRelease(version, tag)
} catch (error) {
  fail(`Release step failed: ${error.message}`)
}
