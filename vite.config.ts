import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = env.VITE_GROQ_API_KEY || ''
  const resendApiKey = env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || ''

  return {
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/scan', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            let body = ''
            req.on('data', chunk => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const { url, user_email, email_notifications, previous_scan } = JSON.parse(body)
                if (!url) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'URL is required' }))
                  return
                }

                // 1. Fetch raw HTML
                let targetResponse;
                try {
                  targetResponse = await fetch(url, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                  })
                } catch (fetchErr: any) {
                  console.error(`[SiteDoctor+ Debug] Fetch request failed for URL ${url}:`, fetchErr.message);
                  throw new Error("Could not fetch this site's content")
                }

                if (!targetResponse.ok) {
                  console.error(`[SiteDoctor+ Debug] Fetch returned non-ok status: ${targetResponse.status} for URL ${url}`);
                  throw new Error("Could not fetch this site's content")
                }

                const html = await targetResponse.text()
                if (!html || html.trim().length === 0) {
                  console.error(`[SiteDoctor+ Debug] Fetch returned empty HTML for URL ${url}`);
                  throw new Error("Could not fetch this site's content")
                }

                // 2. Extract key content via regexes
                const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
                const title = titleMatch ? titleMatch[1].trim() : ''

                const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
                                  html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
                const description = descMatch ? descMatch[1].trim() : ''

                // Headings
                const h1s: string[] = []
                const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi
                let match
                while ((match = h1Regex.exec(html)) !== null) {
                  h1s.push(match[1].replace(/<[^>]*>/g, '').trim())
                }

                const h2s: string[] = []
                const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
                while ((match = h2Regex.exec(html)) !== null) {
                  h2s.push(match[1].replace(/<[^>]*>/g, '').trim())
                }

                const h3s: string[] = []
                const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi
                while ((match = h3Regex.exec(html)) !== null) {
                  h3s.push(match[1].replace(/<[^>]*>/g, '').trim())
                }

                // Technical SEO extraction checks
                const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
                                       html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
                const hasCanonical = !!canonicalMatch

                const ogRegex = /<meta[^>]*property=["']og:[^"']+["']/gi
                let ogCount = 0
                while (ogRegex.exec(html) !== null) {
                  ogCount++
                }

                const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["']/i) || html.match(/<link[^>]*href=["'][^"']*favicon[^"']*["']/i)
                const hasFavicon = !!faviconMatch

                const hasSchema = html.includes('type="application/ld+json"') || html.includes("type='application/ld+json'")

                // Extract and resolve image URLs
                const rawImages: string[] = []
                
                // Match <img tags
                const imgTagRegex = /<img([^>]+)>/gi
                let tagMatch
                while ((tagMatch = imgTagRegex.exec(html)) !== null) {
                  const attrsText = tagMatch[1]
                  
                  // Try data-src, data-lazy-src, src, or srcset
                  const dataSrcMatch = /data-src=["']?([^"'\s>]+)["']?/i.exec(attrsText)
                  if (dataSrcMatch) {
                    rawImages.push(dataSrcMatch[1].trim())
                    continue
                  }
                  
                  const dataLazySrcMatch = /data-lazy-src=["']?([^"'\s>]+)["']?/i.exec(attrsText)
                  if (dataLazySrcMatch) {
                    rawImages.push(dataLazySrcMatch[1].trim())
                    continue
                  }
                  
                  const srcMatch = /src=["']?([^"'\s>]+)["']?/i.exec(attrsText)
                  if (srcMatch) {
                    rawImages.push(srcMatch[1].trim())
                    continue
                  }

                  const srcsetMatch = /srcset=["']?([^"'\s>]+)["']?/i.exec(attrsText)
                  if (srcsetMatch) {
                    const firstUrl = srcsetMatch[1].split(',')[0].trim().split(/\s+/)[0]
                    if (firstUrl) {
                      rawImages.push(firstUrl)
                    }
                  }
                }

                // Fallback: extract background images from url(...) definitions if no images found
                if (rawImages.length === 0) {
                  const bgRegex = /url\(["']?([^"'\)]+)["']?\)/gi
                  let bgMatch
                  while ((bgMatch = bgRegex.exec(html)) !== null && rawImages.length < 5) {
                    rawImages.push(bgMatch[1].trim())
                  }
                }

                console.log(`[SiteDoctor+ Debug] Extracted Raw Image URLs:`, rawImages)

                // Resolve image URLs to absolute URLs & filter invalid ones
                const resolvedImages: string[] = []
                const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
                
                for (const imgUrl of rawImages) {
                  try {
                    if (imgUrl.startsWith('data:')) {
                      // Allow base64 raster images
                      if (imgUrl.startsWith('data:image/jpeg') || imgUrl.startsWith('data:image/png') || imgUrl.startsWith('data:image/webp') || imgUrl.startsWith('data:image/gif')) {
                        resolvedImages.push(imgUrl)
                      }
                      continue
                    }
                    
                    const absUrl = new URL(imgUrl, url).href
                    
                    // Filter: only allow HTTP/HTTPS protocol
                    if (!absUrl.startsWith('http://') && !absUrl.startsWith('https://')) {
                      continue
                    }

                    // Filter: only allow raster image extensions
                    let pathname = ''
                    try {
                      pathname = new URL(absUrl).pathname.toLowerCase()
                    } catch (_) {
                      pathname = absUrl.toLowerCase()
                    }

                    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext))
                    if (hasValidExtension) {
                      resolvedImages.push(absUrl)
                    }
                  } catch (_) {
                    // Skip if invalid url resolution
                  }
                }

                console.log(`[SiteDoctor+ Debug] Resolved Raster Absolute Image URLs:`, resolvedImages)

                // Take unique images to prevent scanning duplicates
                const uniqueImages = Array.from(new Set(resolvedImages)).slice(0, 3)

                // Visible body text (reasonably truncated to avoid token limits)
                const cleanBody = html
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()

                const truncatedBody = cleanBody.substring(0, 4000)

                // 3. Send text to Groq API
                if (!groqApiKey || groqApiKey === 'your-groq-key-placeholder') {
                  throw new Error('Groq API Key is not configured on the server. Please check your .env file.')
                }

                 const groqPrompt = `
You are an expert web audit tool analyzing a website's content for SEO health and content trustworthiness.
Analyze the following extracted page details:
- URL: ${url}
- URL Scheme: ${url.startsWith('https://') ? 'HTTPS (Secure)' : 'HTTP (Insecure)'}
- Title: ${title}
- Meta Description: ${description}
- H1 Headings: ${h1s.slice(0, 5).join(', ')}
- H2 Headings: ${h2s.slice(0, 10).join(', ')}
- H3 Headings: ${h3s.slice(0, 10).join(', ')}
- Canonical Tag Present: ${hasCanonical ? 'Yes' : 'No'}
- Open Graph Tags Found: ${ogCount}
- Favicon Found: ${hasFavicon ? 'Yes' : 'No'}
- Structured Data (JSON-LD) Found: ${hasSchema ? 'Yes' : 'No'}
- Image Count: ${uniqueImages.length}
- Body Text Sample: ${truncatedBody}

You MUST evaluate the site across exactly these 8 fixed SEO categories:
1. Meta Tags (Checks if title tag and meta description exist, are the right length, and accurately describe the page)
2. Headings Structure (Checks if H1/H2/H3 are used properly and logically to organize content)
3. Page Speed (Checks for signs of slow-loading elements like large unoptimized images, render-blocking scripts, etc.)
4. Mobile-Friendliness (Checks for a viewport meta tag and responsive indicators in the HTML)
5. Content Quality (Checks if content is relevant, sufficiently detailed, and not thin or duplicate)
6. Image Alt Text (Checks if images have descriptive alt attributes for accessibility and SEO)
7. Server & Security (Checks if the site is using HTTPS secure protocol based on the URL scheme, and other visible security elements)
8. Advanced SEO (Checks for technical signals detectable from HTML such as canonical tags, Open Graph meta tags, structured data/schema markup, or a favicon)

Return a STRICT JSON object with the following structure. Do NOT wrap it in markdown code blocks (\`\`\`json), and do NOT add any conversational prefix or suffix. Return ONLY the JSON object.

Every category MUST be included in the "seo_categories" array. If a category has no issues, mark its status as "Good", provide an explanation like "Excellent setup, no issues detected.", a fix_suggestion like "None required.", and a priority of "Low".

For any category with status "Needs Improvement" or "Critical", or any Trust flag, determine a priority ("High", "Medium", or "Low") based on its SEO or trust impact:
- "High": Crucial ranking/trust factors (e.g. missing title/meta description, missing secure protocols, no contact info).
- "Medium": Significant factors (e.g. missing alt text, slow loading elements, duplicate/thin copy).
- "Low": Minor details (e.g. heading order nesting, unoptimized minor meta tags).

If the trust flag is "Potential AI-Generated Content", you MUST also include:
- "excerpt": the exact sentence or phrase (1-2 sentences max) from the scraped body text that triggered the flag.
- "reasoning": why this specific text seems AI-generated (e.g. "generic phrasing with no specific details", "repetitive sentence structure").
- For other flags, set "excerpt" and "reasoning" to null.

Calculate three trust sub-scores (0-100 each):
- "topical_relevance": how aligned the content is with the domain topic (0-100).
- "subject_expertise": how authoritative, clear, and expert the writing tone is (0-100).
- "credibility": how trustworthy, factually secure, and free of deception the copy is (0-100).
The overall trust_score MUST be the mathematical average of these three sub-scores.

Calculate a content freshness score (0-100) based on copyright year, date references, and currency of the writing, and output positive signals list (e.g. "Recent copyright notice found", "Timestamps detected").

Extract 5-8 top keywords/phrases with frequency and check if present in title, description, or headings.

Provide 1-3 quick wins (fastest, easiest fixes the user could do right now, e.g. adding a favicon or meta description, separate from full suggestions).

Provide business context about the domain.

{
  "seo_score": 85,
  "seo_categories": [
    {
      "category_name": "Meta Tags",
      "status": "Needs Improvement",
      "explanation": "The page title exists but the description meta tag is missing.",
      "fix_suggestion": "Add a descriptive meta description tag between 150-160 characters.",
      "priority": "High"
    },
    {
      "category_name": "Headings Structure",
      "status": "Good",
      "explanation": "Headings follow a logical nested order with a single H1 tag.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Page Speed",
      "status": "Good",
      "explanation": "No heavy assets or large scripts are blocking initial render.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Mobile-Friendliness",
      "status": "Good",
      "explanation": "Responsive meta viewport is properly defined.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Content Quality",
      "status": "Good",
      "explanation": "Content depth and word count are appropriate for the topic.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Image Alt Text",
      "status": "Good",
      "explanation": "All detected images have descriptive alt text tags.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Server & Security",
      "status": "Good",
      "explanation": "Excellent setup, no issues detected. Site is served securely over HTTPS.",
      "fix_suggestion": "None required.",
      "priority": "Low"
    },
    {
      "category_name": "Advanced SEO",
      "status": "Needs Improvement",
      "explanation": "Social Open Graph tags and Schema structured data are missing.",
      "fix_suggestion": "Add og:title/og:description tags and json-ld schema markup to improve indexability.",
      "priority": "Medium"
    }
  ],
  "trust_score": 75,
  "trust_sub_scores": {
    "topical_relevance": 80,
    "subject_expertise": 70,
    "credibility": 75
  },
  "content_freshness": {
    "score": 90,
    "positive_signals": ["Recent 2026 copyright notice found", "Timestamps detected in text"]
  },
  "business_context": {
    "what_is_this_domain_about": "A professional AI-powered website auditor and SEO trust scanning tool.",
    "industry_niche": "SaaS / SEO Audit / web credibility",
    "target_audience": "Webmasters, website owners, and marketing professionals."
  },
  "content_strengths": [
    "Clear structure and well-defined headings",
    "Original and engaging introduction text"
  ],
  "content_weaknesses": [
    "Some images lack alt descriptions",
    "Limited depth on pricing information"
  ],
  "quick_wins": [
    "Add a canonical tag to the home page.",
    "Add descriptive alt text to the hero banner image."
  ],
  "top_keywords": [
    {
      "keyword": "seo audit",
      "frequency": 8,
      "in_title": true,
      "in_meta": true,
      "in_headings": true
    }
  ],
  "trust_flags": [
    { 
      "flag": "Potential AI-Generated Content", 
      "explanation": "Why this flag was raised, e.g. lack of author bio, copy reads like generic AI text",
      "priority": "Medium",
      "excerpt": "Specific sentence or phrase from the body text that triggered the flag (1-2 sentences max) or null.",
      "reasoning": "Reason why this specific text seems AI-generated or null."
    }
  ]
}
`

                // Log RIGHT BEFORE the Groq AI API call
                console.log(`[SiteDoctor+ Debug] Scanning URL: ${url}`);
                console.log(`[SiteDoctor+ Debug] Scraped Content Sent to Groq:
                  - Title: "${title}"
                  - Meta Description: "${description}"
                  - H1 Headings: ${JSON.stringify(h1s)}
                  - H2 Headings: ${JSON.stringify(h2s)}
                  - H3 Headings: ${JSON.stringify(h3s)}
                  - Body Text Length: ${truncatedBody.length}
                  - Body Text Sample (first 200 chars): "${truncatedBody.substring(0, 200)}..."`);

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`,
                  },
                  body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    response_format: { type: 'json_object' },
                    messages: [
                      {
                        role: 'system',
                        content: 'You are a web auditor that always returns analysis in strict JSON format.',
                      },
                      {
                        role: 'user',
                        content: groqPrompt,
                      },
                    ],
                    temperature: 0.1,
                  }),
                })

                if (!groqResponse.ok) {
                  const errorText = await groqResponse.text()
                  console.error(`[SiteDoctor+ Debug] Groq API returned HTTP error: ${groqResponse.status} - ${errorText}`);
                  throw new Error("Analysis failed, please try again")
                }

                const groqResultJson = (await groqResponse.json()) as any
                const rawContent = groqResultJson.choices[0].message.content.trim()

                // Log RIGHT AFTER the Groq AI API call
                console.log(`[SiteDoctor+ Debug] Raw Groq AI Response for ${url}:`, rawContent);

                // Parse the inner JSON with strict error handling and logging
                let parsedAudit: any;
                try {
                  parsedAudit = JSON.parse(rawContent)
                  console.log(`[SiteDoctor+ Debug] JSON.parse() succeeded for ${url}`);
                  if (!parsedAudit || typeof parsedAudit.seo_score !== 'number' || typeof parsedAudit.trust_score !== 'number') {
                    throw new Error("Missing required 'seo_score' or 'trust_score' fields in AI JSON response.")
                  }
                } catch (parseErr: any) {
                  console.error(`[SiteDoctor+ Debug] JSON.parse() failed or missing fields for ${url}: ${parseErr.message}`);
                  console.error(`[SiteDoctor+ Debug] Raw content was: ${rawContent}`);
                  throw new Error("Analysis failed, please try again")
                }

                const prepareLocalImageBase64 = async (imgUrl: string) => {
                  try {
                    const urlObj = new URL(imgUrl)
                    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname) || 
                                    urlObj.hostname.startsWith('192.168.') || 
                                    urlObj.hostname.startsWith('10.') || 
                                    urlObj.hostname.startsWith('172.')

                    if (isLocal) {
                      console.log(`[SiteDoctor+ Debug] Fetching local image for base64 encoding: ${imgUrl}`)
                      const res = await fetch(imgUrl)
                      if (!res.ok) {
                        throw new Error(`Failed to fetch local image. Status: ${res.status}`)
                      }
                      const arrayBuffer = await res.arrayBuffer()
                      const buffer = Buffer.from(arrayBuffer)
                      const base64 = buffer.toString('base64')
                      const contentType = res.headers.get('content-type') || 'image/jpeg'
                      console.log(`[SiteDoctor+ Debug] Successfully converted local image to base64 (size: ${buffer.length} bytes)`)
                      return `data:${contentType};base64,${base64}`
                    }
                  } catch (err: any) {
                    console.error(`[SiteDoctor+ Debug] Local base64 conversion failed for ${imgUrl}:`, err.message)
                  }
                  return imgUrl
                }

                // 4. Run Groq Vision analysis in parallel for the collected images
                console.log(`[SiteDoctor+ Debug] Starting Vision analysis loop for:`, uniqueImages)
                const visionPromises = uniqueImages.map(async (imageUrl) => {
                  // 4a. Validate URL protocol
                  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                    console.log(`[SiteDoctor+ Debug] Skipping image ${imageUrl}: invalid URL protocol`)
                    return {
                      image_url: imageUrl,
                      looks_like_stock_photo: false,
                      reasoning: 'skipped - invalid URL',
                      quality_flag: 'broken',
                      relevance_note: 'Could not load',
                    }
                  }

                  // 4b. Validate image format/extension
                  let pathname = ''
                  try {
                    pathname = new URL(imageUrl).pathname.toLowerCase()
                  } catch (_) {
                    pathname = imageUrl.toLowerCase()
                  }

                  const hasValidExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => pathname.endsWith(ext))
                  if (!hasValidExtension) {
                    console.log(`[SiteDoctor+ Debug] Skipping image ${imageUrl}: unsupported format`)
                    return {
                      image_url: imageUrl,
                      looks_like_stock_photo: false,
                      reasoning: 'skipped - unsupported format',
                      quality_flag: 'broken',
                      relevance_note: 'Could not load',
                    }
                  }

                  // Resolve local url to base64 to ensure Groq can read it
                  const payloadUrl = await prepareLocalImageBase64(imageUrl)

                  try {
                    const payload = {
                      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                      response_format: { type: 'json_object' },
                      messages: [
                        {
                          role: 'user',
                          content: [
                            {
                              type: 'text',
                              text: 'Analyze this image and return a STRICT JSON object containing: "looks_like_stock_photo" (boolean), "reasoning" (string), "quality_flag" (string, one of: "broken", "low-resolution", "placeholder", "normal"), and "relevance_note" (string). Return ONLY the raw JSON object, without code fences or wrappers.',
                            },
                            {
                              type: 'image_url',
                              image_url: {
                                url: payloadUrl,
                              },
                            },
                          ],
                        },
                      ],
                      temperature: 0.1,
                    }

                    console.log(`[SiteDoctor+ Debug] Sending Groq Vision request payload for image: ${imageUrl} (payloadUrl is ${payloadUrl.startsWith('data:') ? 'base64' : 'public url'})`)

                    const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqApiKey}`,
                      },
                      body: JSON.stringify(payload),
                    })

                    if (!visionResponse.ok) {
                      let errMsg = `Vision model failed. Status: ${visionResponse.status}`
                      try {
                        const errorData = await visionResponse.json() as any
                        if (errorData?.error?.message) {
                          errMsg = errorData.error.message
                        }
                      } catch (_) {
                        try {
                          const text = await visionResponse.text()
                          if (text) errMsg = text.substring(0, 150)
                        } catch (__) {}
                      }
                      console.error(`[SiteDoctor+ Debug] Groq Vision API Error! Status: ${visionResponse.status}\nDetails:\n`, errMsg)
                      throw new Error(errMsg)
                    }

                    const visionResultJson = (await visionResponse.json()) as any
                    const parsedVision = JSON.parse(visionResultJson.choices[0].message.content.trim())

                    return {
                      image_url: imageUrl,
                      looks_like_stock_photo: !!parsedVision.looks_like_stock_photo,
                      reasoning: parsedVision.reasoning || parsedVision.looks_like_stock_photo_reasoning || '',
                      quality_flag: parsedVision.quality_flag || 'normal',
                      relevance_note: parsedVision.relevance_note || '',
                    }
                  } catch (vErr: any) {
                    return {
                      image_url: imageUrl,
                      looks_like_stock_photo: false,
                      reasoning: `Analysis failed: ${vErr.message || 'Error fetching or parsing image.'}`,
                      quality_flag: 'broken',
                      relevance_note: 'Could not load',
                    }
                  }
                })

                const imageFlags = await Promise.all(visionPromises)

                // Calculate combined score
                const seoScore = parsedAudit.seo_score || 0
                
                // overall trust_score becomes the average of topical_relevance, subject_expertise, and credibility
                let trustScore = parsedAudit.trust_score || 0
                if (parsedAudit.trust_sub_scores) {
                  const sub = parsedAudit.trust_sub_scores
                  const totalSub = (sub.topical_relevance || 0) + (sub.subject_expertise || 0) + (sub.credibility || 0)
                  trustScore = Math.round(totalSub / 3)
                }
                const combinedScore = Math.round((seoScore * 0.4) + (trustScore * 0.6))

                const finalResult = {
                  seo_score: seoScore,
                  trust_score: trustScore,
                  combined_score: combinedScore,
                  seo_report: {
                    categories: parsedAudit.seo_categories || [],
                    quick_wins: parsedAudit.quick_wins || [],
                    top_keywords: parsedAudit.top_keywords || [],
                  },
                  trust_report: {
                    flags: parsedAudit.trust_flags || [],
                    business_context: parsedAudit.business_context || null,
                    content_strengths: parsedAudit.content_strengths || [],
                    content_weaknesses: parsedAudit.content_weaknesses || [],
                    trust_sub_scores: parsedAudit.trust_sub_scores || null,
                    content_freshness: parsedAudit.content_freshness || null,
                  },
                  image_flags: imageFlags,
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(finalResult))

                // Asynchronously trigger Resend Email Notifications
                console.log(`[SiteDoctor+ Debug] Attempting to trigger email notifications...
                   - user_email: "${user_email}"
                   - email_notifications preference: ${email_notifications} (type: ${typeof email_notifications})
                   - resendApiKey present: ${!!resendApiKey} (length: ${resendApiKey?.length || 0})`)

                if (email_notifications && user_email && resendApiKey && resendApiKey !== 'your-resend-key-placeholder') {
                  // Send Email #1: Scan Complete
                  try {
                    const issuesList: string[] = []
                    if (parsedAudit.seo_issues && parsedAudit.seo_issues.length > 0) {
                      parsedAudit.seo_issues.slice(0, 1).forEach((iss: any) => {
                        issuesList.push(`<strong>SEO Issue (${iss.severity}):</strong> ${iss.issue}. <em>Fix: ${iss.fix_suggestion}</em>`)
                      })
                    }
                    if (parsedAudit.trust_flags && parsedAudit.trust_flags.length > 0) {
                      parsedAudit.trust_flags.slice(0, 1).forEach((flg: any) => {
                        issuesList.push(`<strong>Content Trust Alert:</strong> ${flg.flag}. <em>Explanation: ${flg.explanation}</em>`)
                      })
                    }
                    if (issuesList.length === 0) {
                      issuesList.push('No critical issues found. Your website is in clean health!')
                    }
                    const topIssuesHtml = issuesList.map(iss => `<li style="margin-bottom: 12px;">${iss}</li>`).join('')

                    const email1Html = `
<div style="font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10b981; margin-bottom: 8px;">Site Scan Complete</h2>
  <p style="color: #94a3b8; font-size: 14px;">SiteDoctor+ has finished scanning your website.</p>
  
  <div style="background-color: #1e293b; padding: 20px; border-radius: 6px; margin: 24px 0; border: 1px solid #334155;">
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #cbd5e1;">Target URL: <a href="${url}" style="color: #38bdf8; text-decoration: none;">${url}</a></p>
    
    <table style="width: 100%; border-collapse: collapse; text-align: center;">
      <tr>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">SEO Score</div>
          <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-top: 4px;">${seoScore}</div>
        </td>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Trust Score</div>
          <div style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-top: 4px;">${trustScore}</div>
        </td>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Combined Index</div>
          <div style="font-size: 24px; font-weight: bold; color: #38bdf8; margin-top: 4px;">${combinedScore}</div>
        </td>
      </tr>
    </table>
  </div>
  
  <h3 style="color: #cbd5e1; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 24px;">Top Flags & Issues</h3>
  <ul style="padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
    ${topIssuesHtml}
  </ul>
  
  <div style="margin-top: 32px; text-align: center;">
    <a href="http://localhost:5173/dashboard" style="background-color: #10b981; color: #020617; font-weight: bold; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View Dashboard</a>
  </div>
</div>
`

                    const recipientEmail = user_email === 'swaraakini27@gmail.com' ? user_email : 'swaraakini27@gmail.com'
                    console.log(`[SiteDoctor+ Debug] Sending "Scan Complete" email via Resend to ${recipientEmail} (scanned user: ${user_email})...`)
                    const email1Res = await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendApiKey}`,
                      },
                      body: JSON.stringify({
                        from: 'SiteDoctor+ <onboarding@resend.dev>',
                        to: [recipientEmail],
                        subject: `[SiteDoctor+] Scan Complete for ${url}`,
                        html: email1Html,
                      }),
                    })

                    const responseText = await email1Res.text()
                    console.log(`[SiteDoctor+ Debug] Resend API "Scan Complete" response status: ${email1Res.status}\nBody:`, responseText)

                    if (!email1Res.ok) {
                      console.error('Failed to send Scan Complete email:', responseText)
                    } else {
                      console.log('Scan Complete email sent successfully.')
                    }
                  } catch (mailErr) {
                    console.error('Error sending Scan Complete email:', mailErr)
                  }

                  // Send Email #2: Score Drop Alert (if applicable)
                  if (previous_scan && typeof previous_scan.combined_score === 'number') {
                    const dropAmount = previous_scan.combined_score - combinedScore
                    if (dropAmount >= 10) {
                      try {
                        const newIssuesList: string[] = []
                        if (parsedAudit.seo_issues && parsedAudit.seo_issues.length > 0) {
                          parsedAudit.seo_issues.slice(0, 2).forEach((iss: any) => {
                            newIssuesList.push(`<strong>SEO Issue (${iss.severity}):</strong> ${iss.issue}. <em>Fix: ${iss.fix_suggestion}</em>`)
                          })
                        }
                        if (parsedAudit.trust_flags && parsedAudit.trust_flags.length > 0) {
                          parsedAudit.trust_flags.slice(0, 2).forEach((flg: any) => {
                            newIssuesList.push(`<strong>Content Trust Alert:</strong> ${flg.flag}. <em>Explanation: ${flg.explanation}</em>`)
                          })
                        }
                        const newIssuesHtml = newIssuesList.map(iss => `<li style="margin-bottom: 12px;">${iss}</li>`).join('')

                        const email2Html = `
<div style="font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444;">
  <h2 style="color: #ef4444; margin-bottom: 8px;">⚠️ Health Score Drop Alert</h2>
  <p style="color: #cbd5e1; font-size: 14px;">We detected a significant drop in the health and credibility rating of your website.</p>
  
  <div style="background-color: #1e293b; padding: 20px; border-radius: 6px; margin: 24px 0; border: 1px solid #334155;">
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: bold; color: #cbd5e1;">Target URL: <a href="${url}" style="color: #38bdf8; text-decoration: none;">${url}</a></p>
    
    <table style="width: 100%; border-collapse: collapse; text-align: center;">
      <tr>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">Previous Score</div>
          <div style="font-size: 24px; font-weight: bold; color: #cbd5e1; margin-top: 4px;">${previous_scan.combined_score}</div>
        </td>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">New Score</div>
          <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-top: 4px;">${combinedScore}</div>
        </td>
        <td style="padding: 8px; border: 1px solid #334155; background-color: #0f172a; width: 33%;">
          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">Score Drop</div>
          <div style="font-size: 24px; font-weight: bold; color: #ef4444; margin-top: 4px;">-${dropAmount}</div>
        </td>
      </tr>
    </table>
  </div>
  
  <h3 style="color: #cbd5e1; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 24px;">New Flags & Issues Identified</h3>
  <ul style="padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
    ${newIssuesHtml}
  </ul>
  
  <div style="margin-top: 32px; text-align: center;">
    <a href="http://localhost:5173/dashboard" style="background-color: #ef4444; color: #ffffff; font-weight: bold; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Investigate Issues</a>
  </div>
</div>
`

                        const recipientEmail2 = user_email === 'swaraakini27@gmail.com' ? user_email : 'swaraakini27@gmail.com'
                        console.log(`[SiteDoctor+ Debug] Sending "Score Drop Alert" email via Resend to ${recipientEmail2} (scanned user: ${user_email})...`)
                        
                        const email2Res = await fetch('https://api.resend.com/emails', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${resendApiKey}`,
                          },
                          body: JSON.stringify({
                            from: 'SiteDoctor+ <onboarding@resend.dev>',
                            to: [recipientEmail2],
                            subject: `[ALERT] ⚠️ Score Drop detected for ${url}`,
                            html: email2Html,
                          }),
                        })

                        const responseText2 = await email2Res.text()
                        console.log(`[SiteDoctor+ Debug] Resend API "Score Drop Alert" response status: ${email2Res.status}\nBody:`, responseText2)

                        if (!email2Res.ok) {
                          console.error('Failed to send Score Drop email:', responseText2)
                        } else {
                          console.log('Score Drop email sent successfully.')
                        }
                      } catch (mailErr) {
                        console.error('Error sending Score Drop email:', mailErr)
                      }
                    }
                  }
                }
              } catch (err: any) {
                console.error(`[SiteDoctor+ Debug] Scan failed! No fallback score will be used. Error details:`, err.message);
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message || 'Scan failed.' }))
              }
            })
          })
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
