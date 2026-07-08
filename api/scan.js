// Vercel Serverless Function for /api/scan endpoint
// Bypasses CORS and runs Groq AI & Vision analysis secure server-side in production.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { url, user_email, email_notifications, previous_scan } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const groqApiKey = process.env.VITE_GROQ_API_KEY;
    const resendApiKey = process.env.VITE_RESEND_API_KEY;

    if (!groqApiKey) {
      throw new Error('VITE_GROQ_API_KEY is not configured on the server.');
    }

    // 1. Fetch raw HTML
    const targetResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!targetResponse.ok) {
      throw new Error(`Failed to fetch website HTML. Status: ${targetResponse.status}`);
    }

    const html = await targetResponse.text();

    // 2. Extract key content via regexes
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
                      html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Headings
    const h1s = [];
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    let match;
    while ((match = h1Regex.exec(html)) !== null) {
      h1s.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    const h2s = [];
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    while ((match = h2Regex.exec(html)) !== null) {
      h2s.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    const h3s = [];
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    while ((match = h3Regex.exec(html)) !== null) {
      h3s.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    // Image URLs
    const rawImages = [];
    const imgRegex = /<img[^>]*src=["']([\s\S]*?)["']/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      rawImages.push(match[1].trim());
    }

    console.log(`[SiteDoctor+ Debug] Extracted Raw Image URLs:`, rawImages);

    // Resolve image URLs to absolute URLs & filter invalid ones
    const resolvedImages = [];
    for (const imgUrl of rawImages) {
      try {
        if (imgUrl.startsWith('data:')) {
          continue;
        }
        const absUrl = new URL(imgUrl, url).href;
        resolvedImages.push(absUrl);
      } catch (_) {
        // Skip
      }
    }

    console.log(`[SiteDoctor+ Debug] Resolved Absolute Image URLs:`, resolvedImages);

    const uniqueImages = Array.from(new Set(resolvedImages)).slice(0, 3);

    // Visible body text (reasonably truncated to avoid token limits)
    const cleanBody = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const truncatedBody = cleanBody.substring(0, 4000);

    // 3. Send text to Groq API
    const groqPrompt = `
You are an expert web audit tool analyzing a website's content for SEO health and content trustworthiness.
Analyze the following extracted page details:
- URL: ${url}
- Title: ${title}
- Meta Description: ${description}
- H1 Headings: ${h1s.slice(0, 5).join(', ')}
- H2 Headings: ${h2s.slice(0, 10).join(', ')}
- H3 Headings: ${h3s.slice(0, 10).join(', ')}
- Image Count: ${uniqueImages.length}
- Body Text Sample: ${truncatedBody}

You MUST evaluate the site across exactly these 6 fixed SEO categories:
1. Meta Tags (Checks if title tag and meta description exist, are the right length, and accurately describe the page)
2. Headings Structure (Checks if H1/H2/H3 are used properly and logically to organize content)
3. Page Speed (Checks for signs of slow-loading elements like large unoptimized images, render-blocking scripts, etc.)
4. Mobile-Friendliness (Checks for a viewport meta tag and responsive indicators in the HTML)
5. Content Quality (Checks if content is relevant, sufficiently detailed, and not thin or duplicate)
6. Image Alt Text (Checks if images have descriptive alt attributes for accessibility and SEO)

Return a STRICT JSON object with the following structure. Do NOT wrap it in markdown code blocks (\`\`\`json), and do NOT add any conversational prefix or suffix. Return ONLY the JSON object.

Every category MUST be included in the "seo_categories" array. If a category has no issues, mark its status as "Good", and provide an explanation like "Excellent setup, no issues detected." and a fix_suggestion like "None required.".

{
  "seo_score": 85,
  "seo_categories": [
    {
      "category_name": "Meta Tags",
      "status": "Needs Improvement",
      "explanation": "The page title exists but the description meta tag is missing.",
      "fix_suggestion": "Add a descriptive meta description tag between 150-160 characters."
    },
    {
      "category_name": "Headings Structure",
      "status": "Good",
      "explanation": "Headings follow a logical nested order with a single H1 tag.",
      "fix_suggestion": "None required."
    },
    {
      "category_name": "Page Speed",
      "status": "Good",
      "explanation": "No heavy assets or large scripts are blocking initial render.",
      "fix_suggestion": "None required."
    },
    {
      "category_name": "Mobile-Friendliness",
      "status": "Good",
      "explanation": "Responsive meta viewport is properly defined.",
      "fix_suggestion": "None required."
    },
    {
      "category_name": "Content Quality",
      "status": "Good",
      "explanation": "Content depth and word count are appropriate for the topic.",
      "fix_suggestion": "None required."
    },
    {
      "category_name": "Image Alt Text",
      "status": "Good",
      "explanation": "All detected images have descriptive alt text tags.",
      "fix_suggestion": "None required."
    }
  ],
  "trust_score": 75,
  "trust_flags": [
    { "flag": "Title of the credibility flag", "explanation": "Why this flag was raised, e.g. lack of author bio, copy reads like generic AI text" }
  ]
}
`;

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
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API returned an error: ${groqResponse.status} - ${errorText}`);
    }

    const groqResultJson = await groqResponse.json();
    const parsedAudit = JSON.parse(groqResultJson.choices[0].message.content.trim());

    const prepareLocalImageBase64 = async (imgUrl) => {
      try {
        const urlObj = new URL(imgUrl);
        const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname) || 
                        urlObj.hostname.startsWith('192.168.') || 
                        urlObj.hostname.startsWith('10.') || 
                        urlObj.hostname.startsWith('172.');

        if (isLocal) {
          console.log(`[SiteDoctor+ Debug] Fetching local image for base64 encoding: ${imgUrl}`);
          const res = await fetch(imgUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch local image. Status: ${res.status}`);
          }
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          console.log(`[SiteDoctor+ Debug] Successfully converted local image to base64 (size: ${buffer.length} bytes)`);
          return `data:${contentType};base64,${base64}`;
        }
      } catch (err) {
        console.error(`[SiteDoctor+ Debug] Local base64 conversion failed for ${imgUrl}:`, err.message);
      }
      return imgUrl;
    };

    // 4. Run Groq Vision analysis in parallel for the collected images
    console.log(`[SiteDoctor+ Debug] Starting Vision analysis loop for:`, uniqueImages);
    const visionPromises = uniqueImages.map(async (imageUrl) => {
      // 4a. Validate URL protocol
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        console.log(`[SiteDoctor+ Debug] Skipping image ${imageUrl}: invalid URL protocol`);
        return {
          image_url: imageUrl,
          looks_like_stock_photo: false,
          reasoning: 'skipped - invalid URL',
          quality_flag: 'broken',
          relevance_note: 'Could not load',
        };
      }

      // 4b. Validate image format/extension
      let pathname = '';
      try {
        pathname = new URL(imageUrl).pathname.toLowerCase();
      } catch (_) {
        pathname = imageUrl.toLowerCase();
      }

      const hasValidExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => pathname.endsWith(ext));
      if (!hasValidExtension) {
        console.log(`[SiteDoctor+ Debug] Skipping image ${imageUrl}: unsupported format`);
        return {
          image_url: imageUrl,
          looks_like_stock_photo: false,
          reasoning: 'skipped - unsupported format',
          quality_flag: 'broken',
          relevance_note: 'Could not load',
        };
      }

      // Resolve local url to base64 to ensure Groq can read it
      const payloadUrl = await prepareLocalImageBase64(imageUrl);

      try {
        const payload = {
          model: 'llama-3.2-11b-vision-preview',
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
        };

        console.log(`[SiteDoctor+ Debug] Sending Groq Vision request payload for image: ${imageUrl} (payloadUrl is ${payloadUrl.startsWith('data:') ? 'base64' : 'public url'})`);

        const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!visionResponse.ok) {
          let errMsg = `Vision model failed. Status: ${visionResponse.status}`;
          try {
            const errorData = await visionResponse.json();
            if (errorData?.error?.message) {
              errMsg = errorData.error.message;
            }
          } catch (_) {
            try {
              const text = await visionResponse.text();
              if (text) errMsg = text.substring(0, 150);
            } catch (__) {}
          }
          console.error(`[SiteDoctor+ Debug] Groq Vision API Error! Status: ${visionResponse.status}\nDetails:\n`, errMsg);
          throw new Error(errMsg);
        }

        const visionResultJson = await visionResponse.json();
        const parsedVision = JSON.parse(visionResultJson.choices[0].message.content.trim());

        return {
          image_url: imageUrl,
          looks_like_stock_photo: !!parsedVision.looks_like_stock_photo,
          reasoning: parsedVision.reasoning || parsedVision.looks_like_stock_photo_reasoning || '',
          quality_flag: parsedVision.quality_flag || 'normal',
          relevance_note: parsedVision.relevance_note || '',
        };
      } catch (vErr) {
        return {
          image_url: imageUrl,
          looks_like_stock_photo: false,
          reasoning: `Analysis failed: ${vErr.message || 'Error fetching or parsing image.'}`,
          quality_flag: 'broken',
          relevance_note: 'Could not load',
        };
      }
    });

    const imageFlags = await Promise.all(visionPromises);

    // Calculate combined score
    const seoScore = parsedAudit.seo_score || 0;
    const trustScore = parsedAudit.trust_score || 0;
    const combinedScore = Math.round((seoScore * 0.4) + (trustScore * 0.6));

    const finalResult = {
      seo_score: seoScore,
      trust_score: trustScore,
      combined_score: combinedScore,
      seo_report: {
        categories: parsedAudit.seo_categories || [],
      },
      trust_report: {
        flags: parsedAudit.trust_flags || [],
      },
      image_flags: imageFlags,
    };

    // Send HTTP Response
    res.status(200).json(finalResult);

    // 5. Asynchronously trigger Resend Email Notifications (if configured)
    if (email_notifications && user_email && resendApiKey && resendApiKey !== 'your-resend-key-placeholder') {
      try {
        const issuesList = [];
        if (parsedAudit.seo_categories && parsedAudit.seo_categories.length > 0) {
          parsedAudit.seo_categories
            .filter(c => c.status !== 'Good')
            .slice(0, 1)
            .forEach((cat) => {
              issuesList.push(`<strong>SEO Audit Warning (${cat.category_name} - ${cat.status}):</strong> ${cat.explanation} <em>Fix: ${cat.fix_suggestion}</em>`);
            });
        }
        if (parsedAudit.trust_flags && parsedAudit.trust_flags.length > 0) {
          parsedAudit.trust_flags.slice(0, 1).forEach((flg) => {
            issuesList.push(`<strong>Content Trust Alert:</strong> ${flg.flag}. <em>Explanation: ${flg.explanation}</em>`);
          });
        }
        if (issuesList.length === 0) {
          issuesList.push('No critical issues found. Your website is in clean health!');
        }
        const topIssuesHtml = issuesList.map(iss => `<li style="margin-bottom: 12px;">${iss}</li>`).join('');

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
`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'SiteDoctor+ <onboarding@resend.dev>',
            to: [user_email],
            subject: `[SiteDoctor+] Scan Complete for ${url}`,
            html: email1Html,
          }),
        });

        // Score Drop logic
        if (previous_scan && typeof previous_scan.combined_score === 'number') {
          const dropAmount = previous_scan.combined_score - combinedScore;
          if (dropAmount >= 10) {
            const newIssuesList = [];
            if (parsedAudit.seo_categories && parsedAudit.seo_categories.length > 0) {
              parsedAudit.seo_categories
                .filter(c => c.status !== 'Good')
                .slice(0, 2)
                .forEach((cat) => {
                  newIssuesList.push(`<strong>SEO Audit Warning (${cat.category_name} - ${cat.status}):</strong> ${cat.explanation} <em>Fix: ${cat.fix_suggestion}</em>`);
                });
            }
            if (parsedAudit.trust_flags && parsedAudit.trust_flags.length > 0) {
              parsedAudit.trust_flags.slice(0, 2).forEach((flg) => {
                newIssuesList.push(`<strong>Content Trust Alert:</strong> ${flg.flag}. <em>Explanation: ${flg.explanation}</em>`);
              });
            }
            const newIssuesHtml = newIssuesList.map(iss => `<li style="margin-bottom: 12px;">${iss}</li>`).join('');

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
`;

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: 'SiteDoctor+ <onboarding@resend.dev>',
                to: [user_email],
                subject: `[ALERT] ⚠️ Score Drop detected for ${url}`,
                html: email2Html,
              }),
            });
          }
        }
      } catch (_) {
        // Silently log/skip resend errors
      }
    }

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Scan failed.' });
  }
}
