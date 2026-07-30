# Design Philosophy

## Core Principles

### 1. Data Density Without Clutter
Every pixel has purpose. We prioritize information density, but organize it through progressive disclosure — show the signal, hide the noise until needed.

**Implementation:**
- Compact typography (Inter, 13-14px base for data)
- Collapsible sidebar sections
- Expandable rows in tables
- "Show more" for raw numbers (default shows trend + sparkline)
- Empty states that educate, not decorate

### 2. Actionable Scores Over Raw Numbers
Raw data is noise. Opportunity Scores (0-100) are signal. Every metric presented should answer "What should I do about this?"

**Score System:**
```
┌─────────────────────────────────────────────┐
│  Opportunity Score   78/100  ▲ +5 this week │
│  ┌──────────────────────────────────────────┐│
│  │  What's working:                         ││
│  │  ✓ "react tutorial" keyword rising 340% ││
│  │  ✓ Thumbnail contrast above niche avg   ││
│  │  ✗ Title CTR below benchmark            ││
│  │  💡 Suggested action: Optimize title    ││
│  │     for "react tutorial 2026"            ││
│  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 3. Glassmorphic Aesthetic
Premium, modern, and distinct from the competition. The glass effect conveys depth and hierarchy without heavy borders.

**Design Tokens:**
```css
/* Tailwind config extensions */
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.10);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
--glass-blur: 12px;

/* Dark variant */
.dark {
  --glass-bg: rgba(0, 0, 0, 0.30);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  --glass-blur: 16px;
}
```

**Component Pattern:**
```tsx
<GlassCard className="p-4 rounded-xl backdrop-blur-xl bg-glass-bg border border-glass-border shadow-glass">
  <CardHeader>
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Estimated Revenue
    </CardTitle>
    <MetricValue value={1240} format="currency" change={12.5} />
  </CardHeader>
</GlassCard>
```

### 4. Command-First Navigation
Power users should never touch a mouse for common actions. The K-Bar (Cmd+K) is the primary navigation method.

**K-Bar commands:**
```
⌘K ──────────────────────────────────
  ▶ Jump to...                    [Navigate]
     Dashboard | Analytics | Keywords | Content Calendar
  
  ▶ Generate...                   [AI Actions]
     Title variants | Description | Script | Tags
  
  ▶ Analyze...                    [Analysis]
     Thumbnail | Competition | Keyword | Video SEO
  
  ▶ Export...                     [Data]
     CSV | PDF | JSON
  
  ▶ Quick actions...              [Commands]
     Sync channel | Generate report | Schedule upload
```

### 5. Real-Time by Default
Stale data is useless. The dashboard should feel alive — metrics update as data flows in.

**Data Freshness:**
- Analytics dashboard: SSE-backed, auto-updates on sync
- Sync progress: WebSocket push for current sync status
- Keyword rankings: Last known position + trend arrow
- Notifications: Toast on milestone, AI completion, errors

### 6. Privacy as a Feature
Self-hosted means zero data leaves user control. The UI should reinforce this trust.

**UI Signals:**
- "Processing locally" badge on local AI tasks
- Data residency indicator (which server, which region)
- Clear data retention controls in settings
- "Export all my data" button (GDPR-style)
- Audit log viewer

### 7. Mobile-Responsive Core
While the primary target is desktop (YouTube creators work on laptops), the overview dashboards should be usable on tablets and large phones.

**Breakpoints:**
- 1400px+: Full layout with 3-column panels
- 1024px-1400px: 2-column panels
- 768px-1024px: Single column, compact sidebar
- <768px: Mobile navigation, stacked KPIs

## Color Palette

```css
/* Light mode */
--bg: #FAFBFC;
--glass-bg: rgba(255,255,255,0.6);
--accent: #6366F1;        /* Indigo */
--accent-soft: #EEF2FF;
--success: #10B981;       /* Emerald */
--warning: #F59E0B;       /* Amber */
--danger: #EF4444;        /* Red */
--text: #0F172A;
--text-muted: #64748B;

/* Dark mode */
--bg: #0B0E14;
--glass-bg: rgba(15,23,42,0.6);
--accent: #818CF8;        /* Lighter indigo */
--accent-soft: #1E1B4B;
--text: #F1F5F9;
--text-muted: #94A3B8;
```

## Typography

- **Headings:** Inter (sans-serif), medium weight
- **Data/Metrics:** JetBrains Mono (monospace), tabular numbers
- **Body:** Inter, 14px (desktop) / 16px (mobile)
- **Small:** Inter, 12px (metadata, captions)

## Animation Principles (Framer Motion)

```typescript
// Page transitions: fade + slide (200ms, ease-out)
// Chart animations: spring (stiffness: 100, damping: 30)
// Hover states: scale(1.02) with quick duration (150ms)
// List enters: staggered children with opacity + y offset
// Toast/notifications: slide in from right + fade (300ms)
// Modal: backdrop blur fade + scale (250ms)
```

- Purposeful, not decorative: animations communicate hierarchy and state changes
- Reduced motion: respect `prefers-reduced-motion`
- Staggered list entries (max 300ms delay)
- No infinite animations (except loading skeleton pulses)
