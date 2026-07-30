import type { YouTubeVideoData } from './youtube-fetcher.js'

export interface ThumbnailResult {
  score: number
  brightness: number
  contrast: number
  saturation: number
  faceDetected: boolean
  textDetected: boolean
  textRatio: number
  dominantColors: { hex: string; percentage: number; name: string }[]
  suggestions: string[]
}

const COLOR_NAMES: Record<string, string> = {
  '#FF0000': 'Red', '#FF4500': 'Orange Red', '#FF8C00': 'Dark Orange',
  '#FFD700': 'Gold', '#FFFF00': 'Yellow', '#ADFF2F': 'Green Yellow',
  '#00FF00': 'Lime', '#00CED1': 'Dark Turquoise', '#00BFFF': 'Deep Sky Blue',
  '#0000FF': 'Blue', '#8A2BE2': 'Blue Violet', '#FF00FF': 'Magenta',
  '#FF1493': 'Deep Pink', '#FFFFFF': 'White', '#000000': 'Black',
  '#808080': 'Gray', '#A0522D': 'Sienna', '#8B4513': 'Saddle Brown',
  '#2F4F4F': 'Dark Slate Gray', '#00FA9A': 'Medium Spring Green',
}

export class ThumbnailAnalyzer {
  async analyze(video: YouTubeVideoData): Promise<ThumbnailResult> {
    const imageUrl = video.thumbnailHighUrl || video.thumbnailUrl
    const suggestions: string[] = []

    let brightness = 50
    let contrast = 0.4
    let saturation = 0.5
    let faceDetected = false
    let textDetected = false
    let textRatio = 0
    let dominantColors: ThumbnailResult['dominantColors'] = []

    if (imageUrl) {
      try {
        const analysis = await this.analyzeImage(imageUrl)
        brightness = analysis.brightness
        contrast = analysis.contrast
        saturation = analysis.saturation
        faceDetected = analysis.faceDetected
        textDetected = analysis.textDetected
        textRatio = analysis.textRatio
        dominantColors = analysis.dominantColors
      } catch {
        // Fall back to heuristic if image fetch fails
      }
    }

    // Generate suggestions based on metrics
    if (brightness < 30) suggestions.push('Thumbnail is too dark. Increase brightness for better visibility in dark mode.')
    else if (brightness < 45) suggestions.push('Slightly dark. Consider brightening the thumbnail for more impact.')
    if (brightness > 85) suggestions.push('Thumbnail is very bright. May wash out on white backgrounds.')

    if (contrast < 0.3) suggestions.push('Low contrast detected. Increase contrast to make the subject pop.')
    else if (contrast > 0.7) suggestions.push('Good contrast level.')

    if (saturation < 0.3) suggestions.push('Colors are muted. Consider increasing saturation for more visual impact.')
    else if (saturation > 0.7) suggestions.push('Vibrant colors — this helps thumbnails stand out in the sidebar.')

    if (!faceDetected) suggestions.push('No face detected. Thumbnails with faces (especially expressive ones) typically get higher CTR.')
    if (!textDetected) suggestions.push('No text detected. Adding 2-5 words of large, bold text can boost CTR.')
    else if (textRatio > 0.3) suggestions.push('Text covers a large portion of the thumbnail. Reduce text size or move it to one side.')

    if (dominantColors.length > 0) {
      const topColor = dominantColors[0]
      if (topColor && (topColor.hex === '#000000' || topColor.hex === '#FFFFFF')) {
        suggestions.push(`Dominant color is ${topColor.name}. Consider using a more vibrant accent color.`)
      }
    }

    // Heuristic score
    let score = 50
    if (brightness > 30 && brightness < 85) score += 10
    if (contrast > 0.35) score += 10
    if (saturation > 0.4) score += 5
    if (faceDetected) score += 15
    if (textDetected && textRatio < 0.25) score += 10
    if (dominantColors.length >= 3) score += 5
    if (dominantColors.some(c => c.name === 'Red' || c.name === 'Yellow' || c.name === 'Blue')) score += 5

    score = Math.min(Math.max(score, 0), 100)

    return { score, brightness, contrast, saturation, faceDetected, textDetected, textRatio, dominantColors, suggestions }
  }

  private async analyzeImage(imageUrl: string): Promise<{
    brightness: number; contrast: number; saturation: number
    faceDetected: boolean; textDetected: boolean; textRatio: number
    dominantColors: ThumbnailResult['dominantColors']
  }> {
    // Fetch image and use sharp for pixel analysis (no OpenCV dependency needed)
    const res = await fetch(imageUrl)
    const buffer = Buffer.from(await res.arrayBuffer())

    let sharp: any
    try {
      sharp = (await import('sharp')).default
    } catch {
      // sharp not available, return defaults
      return {
        brightness: 50, contrast: 0.4, saturation: 0.5,
        faceDetected: false, textDetected: false, textRatio: 0,
        dominantColors: [],
      }
    }

    const { data, info } = await sharp(buffer)
      .resize(200, 112, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = new Uint8ClampedArray(data)
    const totalPixels = info.width * info.height

    // Compute brightness, contrast, saturation from RGB pixels
    let totalLuminance = 0
    let minLuminance = 255
    let maxLuminance = 0
    const colorBuckets: Map<string, { r: number; g: number; b: number; count: number }> = new Map()
    let edgeCount = 0
    let textEdgeCount = 0
    let facePixels = 0

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      totalLuminance += luminance
      minLuminance = Math.min(minLuminance, luminance)
      maxLuminance = Math.max(maxLuminance, luminance)

      // Color quantization for dominant colors
      const quantizedR = Math.round(r / 32) * 32
      const quantizedG = Math.round(g / 32) * 32
      const quantizedB = Math.round(b / 32) * 32
      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
      const existing = colorBuckets.get(colorKey)
      if (existing) {
        existing.count++
      } else {
        colorBuckets.set(colorKey, { r: quantizedR, g: quantizedG, b: quantizedB, count: 1 })
      }

      // Simple edge detection for text estimation
      if (i >= 4 && i < pixels.length - 4) {
        const prevLum = 0.299 * pixels[i - 4]! + 0.587 * pixels[i - 3]! + 0.114 * pixels[i - 2]!
        const diff = Math.abs(luminance - prevLum)
        if (diff > 30) {
          edgeCount++
          if (diff > 60) textEdgeCount++
        }
      }

      // Skin-tone detection for face estimation (simplified)
      if (r > 60 && g > 30 && b > 20 && r > g && r > b && (r - g) > 15 && r > 100) {
        facePixels++
      }
    }

    const avgLuminance = totalLuminance / (totalPixels || 1)
    const brightness = (avgLuminance / 255) * 100
    const contrast = (maxLuminance - minLuminance) / 255
    const faceRatio = facePixels / (totalPixels || 1)
    const textEdgeRatio = textEdgeCount / Math.max(edgeCount, 1)

    // Saturation estimate: average deviation from gray
    let totalSaturation = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      const gray = (r + g + b) / 3
      totalSaturation += Math.sqrt((r - gray) ** 2 + (g - gray) ** 2 + (b - gray) ** 2)
    }
    const saturation = Math.min((totalSaturation / (totalPixels || 1)) / 128, 1)

    // Dominant colors (top 5)
    const sortedColors = Array.from(colorBuckets.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([_, { r, g, b, count }]) => {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
        const name = COLOR_NAMES[hex] || this.nearestColorName(r, g, b)
        return { hex, percentage: Math.round((count / totalPixels) * 100), name }
      })

    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast * 100) / 100,
      saturation: Math.round(saturation * 100) / 100,
      faceDetected: faceRatio > 0.02,
      textDetected: textEdgeRatio > 0.15,
      textRatio: Math.min(textEdgeRatio, 0.5),
      dominantColors: sortedColors,
    }
  }

  private nearestColorName(r: number, g: number, b: number): string {
    let nearest = 'Unknown'
    let minDist = Infinity
    for (const [hex, name] of Object.entries(COLOR_NAMES)) {
      const cr = parseInt(hex.slice(1, 3), 16)
      const cg = parseInt(hex.slice(3, 5), 16)
      const cb = parseInt(hex.slice(5, 7), 16)
      const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
      if (dist < minDist) { minDist = dist; nearest = name }
    }
    return nearest
  }
}
