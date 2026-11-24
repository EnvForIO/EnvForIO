/** Regression cases for Rust minimum checks, without invoking Cargo. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkRustVersion } from './check-rust-version.js'

function metadata(rustVersion, dependencies = []) {
  return {
    packages: [
      { id: 'root', name: 'envforio', rust_version: rustVersion },
      ...dependencies.map((rustVersion, i) => ({
        id: `dependency-${i}`,
        name: `dependency-${i}`,
        version: '1.0.0',
        rust_version: rustVersion,
      })),
    ],
    resolve: { root: 'root' },
  }
}

test('accepts older, equal and unspecified dependency requirements', () => {
  assert.match(
    checkRustVersion(metadata('1.95', ['1.9', '1.90', '1.95.0', null])),
    /Rust 1\.95 meets/
  )
})

test('reports every dependency exceeding the declared minimum', () => {
  assert.throws(
    () => checkRustVersion(metadata('1.82', ['1.90', '1.95'])),
    error => {
      assert.match(error.message, /envforio declares Rust 1\.82/)
      assert.match(error.message, /dependency-0 1\.0\.0 requires Rust 1\.90/)
      assert.match(error.message, /dependency-1 1\.0\.0 requires Rust 1\.95/)
      return true
    }
  )
})

test('compares minor and patch versions numerically', () => {
  assert.throws(() => checkRustVersion(metadata('1.9', ['1.10'])))
  assert.throws(() => checkRustVersion(metadata('1.95', ['1.95.1'])))
  assert.doesNotThrow(() => checkRustVersion(metadata('1.100', ['1.99'])))
})

test('requires an explicit root package Rust minimum', () => {
  assert.throws(() => checkRustVersion(metadata(null)), /must declare/)
  const virtualWorkspace = metadata('1.95')
  virtualWorkspace.resolve.root = null
  assert.throws(() => checkRustVersion(virtualWorkspace), /must declare/)
})
