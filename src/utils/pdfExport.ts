import { jsPDF } from 'jspdf'

interface ImageFlag {
  image_url: string
  looks_like_stock_photo: boolean
  reasoning: string
  quality_flag: string
  relevance_note: string
}

interface Scan {
  id: string
  site_id: string
  seo_score: number | null
  trust_score: number | null
  combined_score: number | null
  seo_report: {
    categories: Array<{
      category_name: string
      status: string
      explanation: string
      fix_suggestion: string
      priority?: string
    }>
    quick_wins?: string[]
    top_keywords?: Array<{ keyword: string; frequency: number; relevance: string }>
  } | null
  trust_report: {
    flags?: Array<{
      flag: string
      explanation: string
      priority?: string
      excerpt?: string | null
      reasoning?: string | null
    }>
    business_context?: {
      what_is_this_domain_about?: string
      industry_niche?: string
      target_audience?: string
      content_tone?: string
    } | null
    content_strengths?: string[]
    content_weaknesses?: string[]
    trust_sub_scores?: {
      topical_relevance?: number
      subject_expertise?: number
      credibility?: number
    } | null
    content_freshness?: {
      score?: number
      assessment?: string
      signals?: string[]
    } | null
  } | null
  image_flags: ImageFlag[] | null
  scanned_at: string
}

const getGrade = (score: number | null | undefined): { letter: string; color: [number, number, number] } => {
  if (score === null || score === undefined) return { letter: '-', color: [100, 116, 139] };
  if (score >= 90) return { letter: 'A+', color: [16, 185, 129] };
  if (score >= 80) return { letter: 'A', color: [16, 185, 129] };
  if (score >= 70) return { letter: 'B', color: [245, 158, 11] };
  if (score >= 60) return { letter: 'C', color: [245, 158, 11] };
  if (score >= 50) return { letter: 'D', color: [239, 68, 68] };
  return { letter: 'F', color: [239, 68, 68] };
};

export function exportToPDF(siteName: string, url: string, scan: Scan) {
  // Initialize A4 portrait PDF (595.28 x 841.89 points)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const margin = 40;
  const contentWidth = 515; // 595 - 80
  let y = 60;

  // Page Break and Y Positioning Helpers
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 780) {
      doc.addPage();
      y = 60;
    }
  };

  const drawSeparator = (color: [number, number, number] = [226, 232, 240], spacingBefore = 10, spacingAfter = 15) => {
    y += spacingBefore;
    checkPageBreak(5);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + contentWidth, y);
    y += spacingAfter;
  };

  const writeWrappedText = (text: string, fontSize: number, fontStyle: string, color: [number, number, number] | null = null, spacing = 4) => {
    doc.setFont('Helvetica', fontStyle);
    doc.setFontSize(fontSize);
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(51, 65, 85); // slate-700

    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize + spacing);
      doc.text(line, margin, y);
      y += fontSize + spacing;
    });
  };

  // 1. HEADER SECTION
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136); // Teal-600 logo color
  doc.text('SiteDoctor+', margin, y);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('AUTOMATED WEBSITE AUDIT REPORT', margin + 350, y - 2, { align: 'right' });
  y += 18;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(siteName || 'Website Scan', margin, y);
  y += 16;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246); // Blue-500 for URL
  doc.textWithLink(url, margin, y, { url });
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Scanned: ${new Date(scan.scanned_at).toLocaleString()}`, margin + 515, y, { align: 'right' });
  
  drawSeparator([13, 148, 136], 12, 20); // Teal separator

  // 2. SCORES & GRADES SECTION
  checkPageBreak(75);
  const blockWidth = 155;
  const blockHeight = 55;
  const blockGap = 25;

  const drawScoreBlock = (startX: number, label: string, score: number | null) => {
    // Light Card Panel
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.rect(startX, y, blockWidth, blockHeight, 'FD');

    // Label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, startX + 12, y + 18);

    // Score Value
    const scoreVal = score !== null ? `${score}%` : 'N/A';
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(scoreVal, startX + 12, y + 42);

    // Grade Capsule Badge
    if (score !== null) {
      const grade = getGrade(score);
      
      // Capsule background
      doc.setFillColor(grade.color[0], grade.color[1], grade.color[2]);
      doc.roundedRect(startX + blockWidth - 45, y + 14, 32, 16, 3, 3, 'F');
      
      // Grade letter text
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(grade.letter, startX + blockWidth - 29, y + 25, { align: 'center' });
    }
  };

  drawScoreBlock(margin, 'SEO SCORE', scan.seo_score);
  drawScoreBlock(margin + blockWidth + blockGap, 'TRUST SCORE', scan.trust_score);
  drawScoreBlock(margin + (blockWidth + blockGap) * 2, 'HEALTH INDEX', scan.combined_score);
  y += blockHeight + 25;

  // 3. ACTIONABLE IMPROVEMENT TASKS (PRIORITIZED)
  const suggestions: Array<{ type: string; title: string; fix: string; priority: 'High' | 'Medium' | 'Low' }> = [];
  
  if (scan.seo_report?.categories) {
    scan.seo_report.categories.forEach(cat => {
      if (cat.status === 'Needs Improvement' || cat.status === 'Critical') {
        suggestions.push({
          type: 'SEO',
          title: `${cat.category_name}: ${cat.explanation}`,
          fix: cat.fix_suggestion,
          priority: cat.status === 'Critical' ? 'High' : 'Medium'
        });
      }
    });
  }

  if (scan.trust_report?.flags) {
    scan.trust_report.flags.forEach(flg => {
      suggestions.push({
        type: 'Trust',
        title: flg.flag,
        fix: flg.explanation || 'Improve site trust indicator.',
        priority: flg.priority as any || 'Medium'
      });
    });
  }

  if (scan.image_flags) {
    scan.image_flags.forEach((img) => {
      const displayUrl = img.image_url.length > 40 ? img.image_url.substring(0, 40) + '...' : img.image_url;
      if (img.quality_flag === 'broken') {
        suggestions.push({
          type: 'Image',
          title: `Image failed to load: ${displayUrl}`,
          fix: 'Replace this asset with a valid URL.',
          priority: 'High'
        });
      }
      if (img.looks_like_stock_photo) {
        suggestions.push({
          type: 'Image',
          title: `Stock Photo: ${displayUrl}`,
          fix: 'Replace with custom, authentic imagery to boost user trust.',
          priority: 'Medium'
        });
      }
    });
  }

  // Sort: High -> Medium -> Low
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  suggestions.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  if (suggestions.length > 0) {
    writeWrappedText('Recommended Improvement Tasks', 13, 'bold', [15, 23, 42], 8);
    y += 4;

    suggestions.forEach((s) => {
      checkPageBreak(40);
      
      const priorityColor: [number, number, number] = s.priority === 'High' ? [239, 68, 68] : s.priority === 'Medium' ? [245, 158, 11] : [100, 116, 139];

      // Bullet point layout
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.text(`[${s.priority}]`, margin, y);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(`${s.type} - ${s.title}`, contentWidth - 65);
      doc.text(titleLines, margin + 55, y);
      y += (titleLines.length * 11) + 2;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const fixLines = doc.splitTextToSize(`Fix: ${s.fix}`, contentWidth - 65);
      doc.text(fixLines, margin + 55, y);
      y += (fixLines.length * 11) + 12;
    });
    drawSeparator();
  }

  // 4. FULL SEO REPORT breakdown
  if (scan.seo_report?.categories) {
    writeWrappedText('Full SEO Report Breakdown', 13, 'bold', [15, 23, 42], 12);

    scan.seo_report.categories.forEach(cat => {
      checkPageBreak(65);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(cat.category_name, margin, y);

      const statusColor: [number, number, number] = cat.status.toLowerCase() === 'good' ? [16, 185, 129] : cat.status.toLowerCase() === 'critical' ? [239, 68, 68] : [245, 158, 11];
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(cat.status.toUpperCase(), margin + 350, y);
      y += 14;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const explLines = doc.splitTextToSize(cat.explanation, contentWidth);
      doc.text(explLines, margin, y);
      y += (explLines.length * 11) + 2;

      if (cat.fix_suggestion && cat.fix_suggestion !== 'None required.') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(13, 148, 136); // Teal-600 recommendation label
        doc.text('Recommended Action:', margin, y);
        y += 11;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const fixLines = doc.splitTextToSize(cat.fix_suggestion, contentWidth);
        doc.text(fixLines, margin, y);
        y += (fixLines.length * 11);
      }

      y += 18; // spacing after category block
    });
    drawSeparator();
  }

  // 5. FULL TRUST REPORT breakdown
  writeWrappedText('Full Trust & Credibility Report', 13, 'bold', [15, 23, 42], 12);
  
  const flags = scan.trust_report?.flags || [];
  if (flags.length === 0 || (flags.length === 1 && flags[0].flag === 'No flags raised')) {
    writeWrappedText('No credibility flags raised. Site copywriting parameters demonstrate excellent authenticity, factual clarity, and alignment with entity standards.', 9.5, 'normal', [71, 85, 105], 15);
  } else {
    flags.forEach(flg => {
      checkPageBreak(50);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(flg.flag, margin, y);

      const pColor: [number, number, number] = flg.priority === 'High' ? [239, 68, 68] : flg.priority === 'Medium' ? [245, 158, 11] : [100, 116, 139];
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(pColor[0], pColor[1], pColor[2]);
      doc.text(`[${flg.priority || 'Medium'} Impact]`, margin + 350, y);
      y += 14;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(flg.explanation, contentWidth);
      doc.text(descLines, margin, y);
      y += (descLines.length * 11) + 4;

      if (flg.excerpt) {
        checkPageBreak(30);
        doc.setFillColor(248, 250, 252);
        const quotedLines = doc.splitTextToSize(`"${flg.excerpt}"`, contentWidth - 24);
        const excerptHeight = (quotedLines.length * 11) + 14;
        
        doc.rect(margin, y, contentWidth, excerptHeight, 'F');
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(quotedLines, margin + 12, y + 12);
        y += excerptHeight + 8;
      }
      y += 10;
    });
  }
  drawSeparator();

  // 6. IMAGE ANALYSIS
  if (scan.image_flags && scan.image_flags.length > 0) {
    writeWrappedText('Image Asset Integrity Logs', 13, 'bold', [15, 23, 42], 12);
    
    scan.image_flags.forEach(img => {
      checkPageBreak(50);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      
      const displayUrl = img.image_url.length > 55 ? img.image_url.substring(0, 55) + '...' : img.image_url;
      doc.text(`Asset: ${displayUrl}`, margin, y);
      y += 13;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      
      const stats = `Looks like stock: ${img.looks_like_stock_photo ? 'Yes' : 'No'} | Quality Flag: ${img.quality_flag}`;
      doc.text(stats, margin, y);
      y += 13;

      if (img.reasoning) {
        const reasoningLines = doc.splitTextToSize(`Analysis note: ${img.reasoning}`, contentWidth);
        doc.text(reasoningLines, margin, y);
        y += (reasoningLines.length * 11);
      }
      
      y += 14;
    });
    drawSeparator();
  }

  // 7. BUSINESS CONTEXT
  const ctx = scan.trust_report?.business_context;
  if (ctx?.what_is_this_domain_about) {
    writeWrappedText('Domain Business Context', 13, 'bold', [15, 23, 42], 12);
    writeWrappedText(ctx.what_is_this_domain_about, 9, 'normal', [71, 85, 105], 13);
    const tags = [ctx.industry_niche, ctx.target_audience, ctx.content_tone].filter(Boolean) as string[];
    if (tags.length > 0) {
      y += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(13, 148, 136);
      doc.text(tags.join('  ·  '), margin, y);
      y += 16;
    }
    drawSeparator();
  }

  // 8. TRUST SUB-METRICS
  const sub = scan.trust_report?.trust_sub_scores;
  if (sub) {
    checkPageBreak(80);
    writeWrappedText('Trust Sub-Metrics', 13, 'bold', [15, 23, 42], 10);
    const subMetrics = [
      { label: 'Topical Relevance', value: sub.topical_relevance || 0, color: [16, 185, 129] as [number, number, number] },
      { label: 'Subject Expertise',  value: sub.subject_expertise || 0, color: [59, 130, 246] as [number, number, number] },
      { label: 'Credibility',         value: sub.credibility || 0,      color: [245, 158, 11] as [number, number, number] },
    ];
    subMetrics.forEach(m => {
      checkPageBreak(24);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(m.label, margin, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`${m.value}/100`, margin + contentWidth, y, { align: 'right' });
      y += 11;
      // Bar track
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 5, 'F');
      // Bar fill
      doc.setFillColor(m.color[0], m.color[1], m.color[2]);
      doc.rect(margin, y, (m.value / 100) * contentWidth, 5, 'F');
      y += 12;
    });
    drawSeparator();
  }

  // 9. CONTENT FRESHNESS
  const freshness = scan.trust_report?.content_freshness;
  if (freshness) {
    checkPageBreak(60);
    writeWrappedText('Content Freshness', 13, 'bold', [15, 23, 42], 8);
    const fScore = freshness.score || 0;
    const fColor: [number, number, number] = fScore >= 70 ? [16, 185, 129] : fScore >= 40 ? [245, 158, 11] : [239, 68, 68];
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(fColor[0], fColor[1], fColor[2]);
    doc.text(`${fScore}`, margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('/ 100', margin + 28, y);
    y += 14;
    if (freshness.assessment) {
      writeWrappedText(freshness.assessment, 9, 'normal', [71, 85, 105], 12);
    }
    (freshness.signals || []).forEach(sig => {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`• ${sig}`, margin + 8, y);
      y += 12;
    });
    drawSeparator();
  }

  // 10. CONTENT STRENGTHS & WEAKNESSES
  const strengths = scan.trust_report?.content_strengths || [];
  const weaknesses = scan.trust_report?.content_weaknesses || [];
  if (strengths.length > 0 || weaknesses.length > 0) {
    checkPageBreak(50);
    writeWrappedText('Content Strengths & Weaknesses', 13, 'bold', [15, 23, 42], 10);
    if (strengths.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text('Strengths', margin, y);
      y += 12;
      strengths.forEach(s => {
        checkPageBreak(14);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(`✓  ${s}`, contentWidth - 10);
        doc.text(lines, margin + 8, y);
        y += lines.length * 11 + 2;
      });
      y += 4;
    }
    if (weaknesses.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(239, 68, 68);
      doc.text('Weaknesses', margin, y);
      y += 12;
      weaknesses.forEach(w => {
        checkPageBreak(14);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(`✗  ${w}`, contentWidth - 10);
        doc.text(lines, margin + 8, y);
        y += lines.length * 11 + 2;
      });
    }
    drawSeparator();
  }

  // 11. QUICK WINS
  const quickWins = scan.seo_report?.quick_wins || [];
  if (quickWins.length > 0) {
    checkPageBreak(50);
    writeWrappedText('Quick Wins', 13, 'bold', [15, 23, 42], 10);
    quickWins.forEach((win, i) => {
      checkPageBreak(20);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(`${i + 1}. ${win}`, contentWidth - 10);
      doc.text(lines, margin + 8, y);
      y += lines.length * 11 + 4;
    });
    drawSeparator();
  }

  // 12. TOP KEYWORDS
  const keywords = scan.seo_report?.top_keywords || [];
  if (keywords.length > 0) {
    checkPageBreak(60);
    writeWrappedText('Top Keywords', 13, 'bold', [15, 23, 42], 10);
    // Table header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('#', margin, y);
    doc.text('Keyword', margin + 20, y);
    doc.text('Freq', margin + 250, y);
    doc.text('Relevance', margin + 340, y);
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;
    keywords.forEach((kw, i) => {
      checkPageBreak(16);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${i + 1}`, margin, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.text(kw.keyword, margin + 20, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${kw.frequency}x`, margin + 250, y);
      const relColor: [number, number, number] =
        kw.relevance?.toLowerCase() === 'high' ? [16, 185, 129] :
        kw.relevance?.toLowerCase() === 'medium' ? [245, 158, 11] : [100, 116, 139];
      doc.setTextColor(relColor[0], relColor[1], relColor[2]);
      doc.text(kw.relevance || 'Low', margin + 340, y);
      y += 14;
    });
    drawSeparator();
  }

  // 13. FOOTERS & PAGE NUMBERS (Draw globally on all pages)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    
    // Bottom border line
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(margin, 810, margin + contentWidth, 810);
    
    doc.text(`Generated by SiteDoctor+ | Automated SEO, Trust, and Quality Integrity Analysis`, margin, 824);
    doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth, 824, { align: 'right' });
  }

  // 8. SAVE FILE
  const sanitizedNickname = (siteName || 'Site').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const formattedDate = new Date(scan.scanned_at).toISOString().split('T')[0];
  const filename = `SiteDoctor-Report-${sanitizedNickname}-${formattedDate}.pdf`;
  doc.save(filename);
}
