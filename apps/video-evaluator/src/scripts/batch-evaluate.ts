#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

interface BatchItem {
  url: string
  label?: string
}

interface BatchResult {
  url: string
  label: string
  overallScore: number
  seoScore: number
  thumbnailScore: number
  keywordScore: number
  error?: string
}

async function main() {
  const args = process.argv.slice(2)
  const inputFile = args[0]
  const outputFile = args[1] || 'batch-results.json'

  if (!inputFile) {
    console.error('Usage: tsx src/scripts/batch-evaluate.ts <urls-file> [output-file]')
    console.error('  urls-file: JSON array of { url, label? } or plain text file (one URL per line)')
    process.exit(1)
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY environment variable is required.')
    process.exit(1)
  }

  const raw = await readFile(inputFile, 'utf-8')
  let items: BatchItem[]

  try {
    items = JSON.parse(raw) as BatchItem[]
  } catch {
    items = raw.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'))
      .map(url => ({ url, label: url }))
  }

  console.log(`\n  CreatorOS Batch Evaluator`)
  console.log(`  Loading ${items.length} URLs from ${inputFile}`)
  console.log('')

  const { EvalRunner } = await import('../runner.js')
  const { formatJSON } = await import('../formatters/json.js')
  const runner = new EvalRunner(apiKey)

  const results: BatchResult[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const label = item.label || item.url
    process.stdout.write(`  [${i + 1}/${items.length}] ${truncate(label, 50)}... `)

    try {
      const result = await runner.evaluate(item.url)
      const json = formatJSON(result)
      results.push({
        url: item.url,
        label,
        overallScore: json.scores.overall,
        seoScore: json.scores.seo,
        thumbnailScore: json.scores.thumbnail,
        keywordScore: json.scores.keywordOpportunity,
      })
      process.stdout.write(`Score: ${json.scores.overall}\n`)
    } catch (err) {
      results.push({ url: item.url, label, overallScore: 0, seoScore: 0, thumbnailScore: 0, keywordScore: 0, error: (err as Error).message })
      process.stdout.write(`ERROR: ${(err as Error).message}\n`)
    }
  }

  results.sort((a, b) => b.overallScore - a.overallScore)

  await writeFile(outputFile, JSON.stringify({ summary: { total: results.length, avgScore: Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length), topScore: results[0]?.overallScore ?? 0 }, results }, null, 2))
  console.log(`\n  Results written to ${outputFile}`)
  console.log(`  Average score: ${Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)}/100`)
  console.log(`  Top video: ${results[0]?.label} — ${results[0]?.overallScore}/100`)
  console.log('')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

main().catch(console.error)
