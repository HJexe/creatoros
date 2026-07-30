#!/usr/bin/env node
import { Command } from 'commander'
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFile } from 'fs/promises'
import { EvalRunner } from './runner.js'
import { formatCLI } from './formatters/cli-table.js'
import { formatJSON } from './formatters/json.js'
import { formatHTML } from './formatters/html-report.js'
import { EvalOptionsSchema } from './validators.js'

config({ path: resolve(process.cwd(), '.env') })

const program = new Command()

program
  .name('cos-eval')
  .description('CreatorOS Video Evaluator — Analyze any YouTube video or channel URL')
  .version('0.1.0')

program
  .argument('<url>', 'YouTube URL, video ID, channel ID, or @handle')
  .option('-f, --format <type>', 'Output format: cli, json, html', 'cli')
  .option('-o, --output <file>', 'Write output to file')
  .option('--ai-provider <provider>', 'AI provider: openai, anthropic, google, ollama, none', 'none')
  .option('--verbose', 'Show detailed debug info', false)
  .action(async (url, opts) => {
    const options = EvalOptionsSchema.parse({ target: url, ...opts })
    const start = performance.now()

    try {
      console.error('CreatorOS Video Evaluator v0.1.0')
      console.error('')

      const apiKey = process.env.YOUTUBE_API_KEY
      if (!apiKey) {
        console.error('Error: YOUTUBE_API_KEY environment variable is required.')
        console.error('')
        console.error('  1. Go to https://console.cloud.google.com/apis/credentials')
        console.error('  2. Create an API key with YouTube Data API v3 enabled')
        console.error('  3. Set it in your .env file or export it:')
        console.error('     export YOUTUBE_API_KEY=your_key_here')
        console.error('')
        process.exit(1)
      }

      if (options.verbose) {
        console.error(`  Target:    ${options.target}`)
        console.error(`  Format:    ${options.format}`)
        console.error(`  AI:        ${options.aiProvider}`)
        console.error(`  API Key:   ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)
        console.error('')
      }

      console.error('  Fetching video data from YouTube...')
      const runner = new EvalRunner(apiKey, options.aiProvider)
      const result = await runner.evaluate(options.target)

      const elapsed = Math.round(performance.now() - start)

      if (options.format === 'json') {
        const output = JSON.stringify(formatJSON(result), null, 2)
        if (options.output) {
          await writeFile(options.output, output)
          console.error(`  Written to ${options.output}`)
        } else {
          console.log(output)
        }
      } else if (options.format === 'html') {
        const output = formatHTML(result)
        if (options.output) {
          await writeFile(options.output, output)
          console.error(`  Report written to ${options.output}`)
        } else {
          const tmpFile = `/tmp/creatoros-report-${Date.now()}.html`
          await writeFile(tmpFile, output)
          console.error(`  Report written to ${tmpFile}`)
          console.error(`  Open in browser: file://${tmpFile}`)
        }
      } else {
        console.log(formatCLI(result))
      }

      console.error(`  Total time: ${(elapsed / 1000).toFixed(1)}s (API: ${result.duration}ms)`)
      console.error('')

    } catch (err) {
      console.error('')
      console.error(`  Error: ${(err as Error).message}`)
      console.error('')
      process.exit(1)
    }
  })

program.parse(process.argv)
