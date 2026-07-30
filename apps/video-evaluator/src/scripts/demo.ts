#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const DEMO_URLS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/jNQXAC9IVRw',
]

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.log('\n  No YOUTUBE_API_KEY found. Running in offline demo mode.\n')
    await runOfflineDemo()
    return
  }

  console.log('\n  CreatorOS — Demo Mode')
  console.log(`  YouTube API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)
  console.log('')

  const { EvalRunner } = await import('../runner.js')
  const { formatCLI } = await import('../formatters/cli-table.js')
  const runner = new EvalRunner(apiKey)

  for (const url of DEMO_URLS) {
    console.log(`\n  Evaluating: ${url}`)
    console.log('  ─'.repeat(30))
    try {
      const result = await runner.evaluate(url)
      console.log(formatCLI(result))
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`)
    }
  }
}

async function runOfflineDemo() {
  console.log(formatOfflineReport())
}

function formatOfflineReport(): string {
  return `
╔══════════════════════════════════════════════════════════════╗
║              CreatorOS — Demo Report (Offline)              ║
╚══════════════════════════════════════════════════════════════╝

  To run a full analysis:
  1. Get a YouTube Data API key from https://console.cloud.google.com
  2. Create a .env file with: YOUTUBE_API_KEY=your_key
  3. Run: pnpm --filter @creatoros/video-evaluator eval "https://youtube.com/watch?v=VIDEO_ID"

  Example URLs to test:
  • https://www.youtube.com/watch?v=dQw4w9WgXcQ
  • https://youtu.be/jNQXAC9IVRw
  • https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw
  • @mkbhd

  Options:
  --format json     Structured JSON output
  --format html     Beautiful HTML report
  --output file     Write to file
  --ai-provider     openai | anthropic | google | ollama

  Examples:
  pnpm cos-eval "https://youtu.be/dQw4w9WgXcQ"
  pnpm cos-eval "https://youtube.com/watch?v=jNQXAC9IVRw" --format html --output report.html
  pnpm cos-eval "@mkbhd" --ai-provider openai
`
}

main().catch(console.error)
