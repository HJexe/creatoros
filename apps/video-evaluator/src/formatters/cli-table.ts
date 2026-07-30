import type { VideoEvalResult } from '../runner.js'

export function formatCLI(result: VideoEvalResult): string {
  const lines: string[] = []

  // Header
  lines.push('')
  lines.push('╔══════════════════════════════════════════════════════════════╗')
  lines.push('║              CreatorOS — Video Evaluation Report           ║')
  lines.push('╚══════════════════════════════════════════════════════════════╝')
  lines.push('')

  // Summary
  const scoreColor = result.overallScore >= 70 ? '✓' : result.overallScore >= 50 ? '~' : '✗'
  lines.push(`  ${scoreColor}  OVERALL OPPORTUNITY SCORE: ${result.overallScore}/100`)
  lines.push(`     Analysis completed in ${result.duration}ms`)
  lines.push(`     ${result.timestamp}`)
  lines.push('')

  // Video info
  if (result.video) {
    const v = result.video
    lines.push('  ┌─ Video ──────────────────────────────────────────────────┐')
    lines.push(`  │  Title:      ${truncate(v.title, 60)}`)
    lines.push(`  │  Channel:    ${v.channelTitle}`)
    lines.push(`  │  Duration:   ${v.duration}  |  Views: ${fmtNum(v.viewCount)}  |  Likes: ${fmtNum(v.likeCount)}`)
    lines.push(`  │  Published:  ${v.publishedAt.slice(0, 10)}`)
    lines.push(`  │  Tags:       ${(v.tags ?? []).slice(0, 5).join(', ')}`)
    lines.push('  └──────────────────────────────────────────────────────────┘')
    lines.push('')
  }

  // SEO Score
  lines.push('  ┌─ SEO Analysis ────────────────────────────────────────────┐')
  lines.push(`  │  SCORE: ${result.seo.score}/100 ${bar(result.seo.score)}`)
  lines.push('  ├─ Details ─────────────────────────────────────────────────┤')
  for (const d of result.seo.details.slice(0, 8)) {
    const icon = d.status === 'pass' ? '✓' : d.status === 'warn' ? '~' : '✗'
    lines.push(`  │  ${icon} ${padEnd(d.message, 62)}`)
  }
  if (result.seo.suggestions.length > 0) {
    lines.push('  ├─ Suggestions ─────────────────────────────────────────────┤')
    for (const s of result.seo.suggestions.slice(0, 3)) {
      lines.push(`  │  → ${truncate(s, 62)}`)
    }
  }
  lines.push('  └──────────────────────────────────────────────────────────┘')
  lines.push('')

  // Thumbnail
  lines.push('  ┌─ Thumbnail Analysis ──────────────────────────────────────┐')
  lines.push(`  │  SCORE: ${result.thumbnail.score}/100 ${bar(result.thumbnail.score)}`)
  lines.push(`  │  Brightness: ${Math.round(result.thumbnail.brightness)}%  |  Contrast: ${result.thumbnail.contrast}  |  Saturation: ${result.thumbnail.saturation}`)
  lines.push(`  │  Face: ${result.thumbnail.faceDetected ? '✓ Detected' : '✗ Not detected'}  |  Text: ${result.thumbnail.textDetected ? `✓ (${Math.round(result.thumbnail.textRatio * 100)}% of frame)` : '✗ Not detected'}`)
  if (result.thumbnail.dominantColors.length > 0) {
    const colors = result.thumbnail.dominantColors.slice(0, 4).map(c => c.name).join(', ')
    lines.push(`  │  Colors: ${colors}`)
  }
  if (result.thumbnail.suggestions.length > 0) {
    lines.push('  ├─ Suggestions ─────────────────────────────────────────────┤')
    for (const s of result.thumbnail.suggestions.slice(0, 3)) {
      lines.push(`  │  → ${truncate(s, 62)}`)
    }
  }
  lines.push('  └──────────────────────────────────────────────────────────┘')
  lines.push('')

  // Keywords
  lines.push('  ┌─ Keyword Intelligence ────────────────────────────────────┐')
  lines.push(`  │  Opportunity: ${result.keywords.opportunityScore}/100 ${bar(result.keywords.opportunityScore)}`)
  lines.push(`  │  Niche:       ${result.keywords.clusterName ?? 'General'}`)
  lines.push(`  │  Est. Volume: ${fmtNum(result.keywords.searchVolumeEstimate)}/mo  |  Difficulty: ${result.keywords.difficultyEstimate}%`)
  if (result.keywords.extractedKeywords.length > 0) {
    lines.push('  ├─ Top Keywords ────────────────────────────────────────────┤')
    lines.push('  │  #  Term                          Relevance  Difficulty  │')
    for (let i = 0; i < Math.min(result.keywords.extractedKeywords.length, 8); i++) {
      const kw = result.keywords.extractedKeywords[i]!
      lines.push(`  │  ${String(i + 1).padStart(2)}  ${padEnd(kw.term, 30)} ${String(kw.relevance).padStart(5)}    ${String(kw.difficulty).padStart(5)}       │`)
    }
  }
  lines.push('  └──────────────────────────────────────────────────────────┘')
  lines.push('')

  // AI Suggestions
  if (result.ai) {
    lines.push('  ┌─ AI Suggestions ─────────────────────────────────────────┐')
    lines.push('  ├─ Title Variants ─────────────────────────────────────────┤')
    for (const t of result.ai.titles.slice(0, 5)) {
      lines.push(`  │  • ${truncate(t.title, 62)}`)
    }
    lines.push('  ├─ Suggested Tags ─────────────────────────────────────────┤')
    const tagsStr = result.ai.tags.slice(0, 10).join(', ')
    lines.push(`  │  ${truncate(tagsStr, 62)}`)
    if (result.ai.analysis) {
      lines.push('  ├─ Analysis ──────────────────────────────────────────────┤')
      const shortAnalysis = result.ai.analysis.split('\n').slice(0, 3).join(' | ')
      lines.push(`  │  ${truncate(shortAnalysis, 62)}`)
    }
    lines.push('  └──────────────────────────────────────────────────────────┘')
    lines.push('')
  }

  lines.push('  ──────────────────────────────────────────────────────────')
  lines.push('  CreatorOS — Open-source YouTube Growth Toolkit')
  lines.push('  https://github.com/creatoros/creatoros')
  lines.push('')

  return lines.join('\n')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 3) + '...'
}

function padEnd(s: string, len: number): string {
  return (s + ' '.repeat(len)).slice(0, len)
}

function bar(score: number): string {
  const filled = Math.round(score / 10)
  return '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']'
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
