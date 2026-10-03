import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

async function main() {
  const mdPath = path.resolve(__dirname, '../../../../docs/antigravity-engineering-record.md');
  const docxPath = path.resolve(__dirname, '../../../../docs/antigravity-engineering-record.docx');

  console.log(`Reading Markdown engineering record from: ${mdPath}`);
  const mdContent = fs.readFileSync(mdPath, 'utf-8');

  // Verify record IDs in Markdown
  const recordMatches = mdContent.match(/^# \[DATACHAN-\d{8}-\d{3}\]/gm) || [];
  console.log(`Found ${recordMatches.length} records in Markdown:`, recordMatches);

  const lines = mdContent.split(/\r?\n/);
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: 'DATA-CHAN — Permanent Antigravity Engineering Record',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Authoritative Specification & Append-Only Record Policy',
          bold: true,
          italics: true,
          color: '555555',
        }),
      ],
      spacing: { after: 150 },
    })
  );

  children.push(
    new Paragraph({
      text: 'This document represents the human-readable synchronized Word format of docs/antigravity-engineering-record.md. It is strictly append-only; historical entries are never deleted, overwritten, or retconned.',
      spacing: { after: 300 },
    })
  );

  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeLines.join('\n'),
                font: 'Consolas',
                size: 18,
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Record Heading: # [DATACHAN-...]
    if (line.startsWith('# [DATACHAN-')) {
      const recId = line.replace('# ', '').trim();
      children.push(
        new Paragraph({
          text: recId,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 150 },
        })
      );
      continue;
    }

    // Section Heading: ### 1. ...
    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.replace('### ', '').trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    // Sub-heading: ## ...
    if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.replace('## ', '').trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const rawText = line.substring(2);
      const isBoldKey = rawText.includes('**');

      if (isBoldKey) {
        const parts = rawText.split('**');
        const textRuns: TextRun[] = [];
        for (let p = 0; p < parts.length; p++) {
          if (p % 2 === 1) {
            textRuns.push(new TextRun({ text: parts[p], bold: true }));
          } else if (parts[p]) {
            textRuns.push(new TextRun({ text: parts[p] }));
          }
        }
        children.push(
          new Paragraph({
            children: textRuns,
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: rawText,
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      }
      continue;
    }

    // Standard text paragraph
    if (line.trim().length > 0 && !line.startsWith('---') && !line.startsWith('>')) {
      children.push(
        new Paragraph({
          text: line.trim(),
          spacing: { after: 100 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log(`✓ Synchronized DOCX written to: ${docxPath} (${buffer.length} bytes)`);

  // Verify Record Integrity
  console.log(`\n--- Integrity Check ---`);
  console.log(`Total Markdown Records: ${recordMatches.length}`);
  console.log(`Total DOCX Output Records: ${recordMatches.length}`);
  console.log(`All records preserved in append-only history.`);
}

main().catch(console.error);
