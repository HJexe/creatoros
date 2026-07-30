import type { VideoEvalResult } from '../runner.js'

export function formatHTML(result: VideoEvalResult): string {
  const v = result.video
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CreatorOS Report — ${escapeHtml(v?.title ?? 'Video Analysis')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: #0B0E14; color: #F1F5F9; padding: 40px 20px; }
  .container { max-width: 900px; margin: 0 auto; }
  .header { text-align: center; padding: 32px; margin-bottom: 32px; background: rgba(15,23,42,0.6); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); }
  .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
  .header .score { font-size: 64px; font-weight: 700; color: ${scoreColor(result.overallScore)}; }
  .header .meta { color: #94A3B8; font-size: 14px; margin-top: 8px; }
  .card { background: rgba(15,23,42,0.6); backdrop-filter: blur(12px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); padding: 24px; margin-bottom: 20px; }
  .card h2 { font-size: 16px; font-weight: 600; color: #818CF8; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .metric { padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; }
  .metric .label { font-size: 12px; color: #94A3B8; margin-bottom: 4px; }
  .metric .value { font-size: 20px; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .badge-pass { background: rgba(16,185,129,0.2); color: #10B981; }
  .badge-warn { background: rgba(245,158,11,0.2); color: #F59E0B; }
  .badge-fail { background: rgba(239,68,68,0.2); color: #EF4444; }
  .detail-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
  .suggestions { margin-top: 12px; }
  .suggestions li { font-size: 13px; color: #CBD5E1; padding: 4px 0; margin-left: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #94A3B8; font-weight: 500; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  td { padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .color-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; vertical-align: middle; margin-right: 4px; }
  .progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 4px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
  .footer { text-align: center; color: #64748B; font-size: 12px; padding: 32px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>CreatorOS Video Report</h1>
    <div class="score">${result.overallScore}<span style="font-size:24px;color:#94A3B8">/100</span></div>
    <div style="font-size:14px;color:#94A3B8;margin-top:4px">Overall Opportunity Score</div>
    <div class="meta">${v?.title ?? 'N/A'} — ${result.duration}ms — ${new Date(result.timestamp).toLocaleString()}</div>
  </div>

  ${v ? `
  <div class="card">
    <h2>Video Info</h2>
    <div class="grid-2">
      <div class="metric"><div class="label">Views</div><div class="value">${fmtNum(v.viewCount)}</div></div>
      <div class="metric"><div class="label">Likes</div><div class="value">${fmtNum(v.likeCount)}</div></div>
      <div class="metric"><div class="label">Duration</div><div class="value">${v.duration}</div></div>
      <div class="metric"><div class="label">Published</div><div class="value">${v.publishedAt.slice(0,10)}</div></div>
    </div>
  </div>` : ''}

  <div class="card">
    <h2>SEO Analysis — ${result.seo.score}/100</h2>
    <div class="progress-bar"><div class="progress-fill" style="width:${result.seo.score}%;background:${scoreColor(result.seo.score)}"></div></div>
    ${result.seo.details.map(d => `
    <div class="detail-row">
      <span class="badge badge-${d.status}">${d.status === 'pass' ? 'PASS' : d.status === 'warn' ? 'WARN' : 'FAIL'}</span>
      <span style="flex:1">${escapeHtml(d.message)}</span>
    </div>`).join('')}
    ${result.seo.suggestions.length > 0 ? `
    <div class="suggestions">
      <h3 style="font-size:13px;color:#F59E0B;margin-bottom:4px">Suggestions</h3>
      <ul>${result.seo.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>` : ''}
  </div>

  <div class="card">
    <h2>Thumbnail Analysis — ${result.thumbnail.score}/100</h2>
    <div class="progress-bar"><div class="progress-fill" style="width:${result.thumbnail.score}%;background:${scoreColor(result.thumbnail.score)}"></div></div>
    <div class="grid-2" style="margin-top:12px">
      <div class="metric"><div class="label">Brightness</div><div class="value">${Math.round(result.thumbnail.brightness)}%</div></div>
      <div class="metric"><div class="label">Contrast</div><div class="value">${result.thumbnail.contrast}</div></div>
      <div class="metric"><div class="label">Face</div><div class="value">${result.thumbnail.faceDetected ? 'Detected' : 'Not detected'}</div></div>
      <div class="metric"><div class="label">Text</div><div class="value">${result.thumbnail.textDetected ? `${Math.round(result.thumbnail.textRatio * 100)}%` : 'None'}</div></div>
    </div>
    ${result.thumbnail.dominantColors.length > 0 ? `
    <div style="margin-top:12px">
      <div style="font-size:12px;color:#94A3B8;margin-bottom:4px">Dominant Colors</div>
      ${result.thumbnail.dominantColors.map(c => `<span class="color-swatch" style="background:${c.hex}"></span><span style="font-size:12px">${c.name} (${c.percentage}%)</span> `).join('')}
    </div>` : ''}
    ${result.thumbnail.suggestions.length > 0 ? `
    <div class="suggestions">
      <ul>${result.thumbnail.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>` : ''}
  </div>

  <div class="card">
    <h2>Keyword Intelligence — ${result.keywords.opportunityScore}/100</h2>
    <div class="progress-bar"><div class="progress-fill" style="width:${result.keywords.opportunityScore}%;background:${scoreColor(result.keywords.opportunityScore)}"></div></div>
    <div class="grid-2" style="margin-top:12px">
      <div class="metric"><div class="label">Niche</div><div class="value">${result.keywords.clusterName ?? 'General'}</div></div>
      <div class="metric"><div class="label">Est. Volume</div><div class="value">${fmtNum(result.keywords.searchVolumeEstimate)}/mo</div></div>
      <div class="metric"><div class="label">Difficulty</div><div class="value">${result.keywords.difficultyEstimate}%</div></div>
      <div class="metric"><div class="label">Suggested Tags</div><div class="value">${result.keywords.suggestedTags.length}</div></div>
    </div>
    ${result.keywords.extractedKeywords.length > 0 ? `
    <table style="margin-top:12px">
      <tr><th>#</th><th>Keyword</th><th>Relevance</th><th>Difficulty</th></tr>
      ${result.keywords.extractedKeywords.slice(0, 10).map((kw, i) => `
      <tr>
        <td style="color:#94A3B8">${i + 1}</td>
        <td>${escapeHtml(kw.term)}</td>
        <td><span class="badge badge-${kw.relevance > 60 ? 'pass' : 'warn'}">${kw.relevance}</span></td>
        <td><span class="badge badge-${kw.difficulty < 40 ? 'pass' : kw.difficulty < 70 ? 'warn' : 'fail'}">${kw.difficulty}</span></td>
      </tr>`).join('')}
    </table>` : ''}
  </div>

  ${result.ai ? `
  <div class="card">
    <h2>AI Title Suggestions</h2>
    <ol style="margin-top:8px">
      ${result.ai.titles.slice(0, 5).map(t => `<li style="padding:6px 0;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05)">${escapeHtml(t.title)}</li>`).join('')}
    </ol>
    <div style="margin-top:12px">
      <div style="font-size:12px;color:#94A3B8;margin-bottom:4px">Suggested Tags</div>
      <div style="font-size:13px">${result.ai.tags.slice(0, 15).map(t => `<span style="display:inline-block;padding:2px 8px;margin:2px;background:rgba(99,102,241,0.2);border-radius:4px;font-size:12px">${escapeHtml(t)}</span>`).join('')}</div>
    </div>
  </div>` : ''}

  <div class="footer">
    Generated by CreatorOS — Open-source YouTube Growth Toolkit<br>
    <a href="https://github.com/creatoros/creatoros" style="color:#818CF8">github.com/creatoros/creatoros</a>
  </div>
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function scoreColor(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
