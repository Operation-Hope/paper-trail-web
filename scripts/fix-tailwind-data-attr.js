#!/usr/bin/env node
/* eslint-env node */

import { readFileSync, writeFileSync } from 'fs'
import { readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function findFiles(dir, extensions, fileList = []) {
  const files = readdirSync(dir)

  files.forEach((file) => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('dist')) {
      findFiles(filePath, extensions, fileList)
    } else if (stat.isFile() && extensions.includes(extname(file))) {
      fileList.push(filePath)
    }
  })

  return fileList
}

function fixDataAttrSyntax(content) {
  // Replace data-[attr]: with data-attr: (only for simple attribute names, not attribute-value pairs)
  // This regex matches data-[attr]: where attr doesn't contain = and converts it to data-attr:
  return content.replace(/data-\[([^=\]]+)\]:/g, 'data-$1:')
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const fixed = fixDataAttrSyntax(content)

  if (content !== fixed) {
    writeFileSync(filePath, fixed, 'utf-8')
    console.log(`Fixed: ${filePath}`)
    return true
  }
  return false
}

function main() {
  const srcDir = join(__dirname, '..', 'src')
  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const files = findFiles(srcDir, extensions)

  let fixedCount = 0
  files.forEach((file) => {
    if (processFile(file)) {
      fixedCount++
    }
  })

  console.log(`\nFixed ${fixedCount} file(s)`)
}

main()

