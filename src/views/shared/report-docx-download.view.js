export function renderReportDocxDownloadScript() {
  return String.raw`
        function reportTimestamp(date = new Date()) {
          const pad = (value) => String(value).padStart(2, '0');
          return String(date.getFullYear())
            + pad(date.getMonth() + 1)
            + pad(date.getDate())
            + '-'
            + pad(date.getHours())
            + pad(date.getMinutes());
        }

        function reportFileName() {
          const timestamp = reportTimestamp();
          const pattern = interaction.outputFileNamePattern || '<agent-id>-report-<timestamp>.docx';
          const safeName = pattern
            .replaceAll('<agent-id>', agentId)
            .replaceAll('<timestamp>', timestamp)
            .replace(/[^a-zA-Z0-9._-]/g, '-');
          const withoutLegacyMarkdown = safeName.replace(/\.(md|markdown)$/i, '');
          const withoutExtension = withoutLegacyMarkdown.replace(/\.[^.]+$/i, '');
          return withoutExtension + '.docx';
        }

        function escapeXml(value) {
          return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&apos;');
        }

        function cleanInlineMarkdown(value) {
          return String(value || '')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
            .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
            .replace(/\x60([^\x60]+)\x60/g, '$1')
            .trim();
        }

        function paragraphXml(text, style = '') {
          const styleXml = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
          const lines = String(text || '').split('\n');
          const runs = lines.map((line, index) => {
            const breakXml = index > 0 ? '<w:br/>' : '';
            return '<w:r>' + breakXml + '<w:t xml:space="preserve">' + escapeXml(line) + '</w:t></w:r>';
          }).join('');
          return '<w:p>' + styleXml + runs + '</w:p>';
        }

        function markdownToDocumentParagraphs(markdown) {
          const paragraphs = [];
          const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
          let buffer = [];

          function flushBuffer() {
            const text = cleanInlineMarkdown(buffer.join(' '));
            if (text) paragraphs.push(paragraphXml(text));
            buffer = [];
          }

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              flushBuffer();
              continue;
            }

            const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
            if (heading) {
              flushBuffer();
              const style = heading[1].length === 1 ? 'Heading1' : heading[1].length === 2 ? 'Heading2' : 'Heading3';
              paragraphs.push(paragraphXml(cleanInlineMarkdown(heading[2]), style));
              continue;
            }

            const listItem = trimmed.match(/^[-*]\s+(.+)$/);
            if (listItem) {
              flushBuffer();
              paragraphs.push(paragraphXml('• ' + cleanInlineMarkdown(listItem[1])));
              continue;
            }

            buffer.push(trimmed);
          }

          flushBuffer();
          return paragraphs.join('');
        }

        function docxDocumentXml(markdown) {
          const body = markdownToDocumentParagraphs(markdown);
          return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            + '<w:body>'
            + body
            + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
            + '</w:body></w:document>';
        }

        function docxStylesXml() {
          return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            + '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>'
            + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>'
            + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
            + '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>'
            + '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>'
            + '</w:styles>';
        }

        function zipDateParts(date = new Date()) {
          return {
            time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
            date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
          };
        }

        function crc32(bytes) {
          const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, index) => {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) {
              value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
            }
            return value >>> 0;
          }));
          let crc = 0xFFFFFFFF;
          for (const byte of bytes) {
            crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
          }
          return (crc ^ 0xFFFFFFFF) >>> 0;
        }

        function makeHeader(size) {
          return new Uint8Array(size);
        }

        function setUint16(bytes, offset, value) {
          bytes[offset] = value & 0xFF;
          bytes[offset + 1] = (value >>> 8) & 0xFF;
        }

        function setUint32(bytes, offset, value) {
          bytes[offset] = value & 0xFF;
          bytes[offset + 1] = (value >>> 8) & 0xFF;
          bytes[offset + 2] = (value >>> 16) & 0xFF;
          bytes[offset + 3] = (value >>> 24) & 0xFF;
        }

        function createZipBlob(files, mimeType) {
          const encoder = new TextEncoder();
          const chunks = [];
          const centralDirectory = [];
          const { time, date } = zipDateParts();
          let offset = 0;

          for (const [path, content] of Object.entries(files)) {
            const nameBytes = encoder.encode(path);
            const dataBytes = encoder.encode(content);
            const crc = crc32(dataBytes);
            const localHeader = makeHeader(30);
            setUint32(localHeader, 0, 0x04034b50);
            setUint16(localHeader, 4, 20);
            setUint16(localHeader, 8, 0);
            setUint16(localHeader, 10, time);
            setUint16(localHeader, 12, date);
            setUint32(localHeader, 14, crc);
            setUint32(localHeader, 18, dataBytes.length);
            setUint32(localHeader, 22, dataBytes.length);
            setUint16(localHeader, 26, nameBytes.length);
            chunks.push(localHeader, nameBytes, dataBytes);

            const centralHeader = makeHeader(46);
            setUint32(centralHeader, 0, 0x02014b50);
            setUint16(centralHeader, 4, 20);
            setUint16(centralHeader, 6, 20);
            setUint16(centralHeader, 10, 0);
            setUint16(centralHeader, 12, time);
            setUint16(centralHeader, 14, date);
            setUint32(centralHeader, 16, crc);
            setUint32(centralHeader, 20, dataBytes.length);
            setUint32(centralHeader, 24, dataBytes.length);
            setUint16(centralHeader, 28, nameBytes.length);
            setUint32(centralHeader, 42, offset);
            centralDirectory.push(centralHeader, nameBytes);
            offset += localHeader.length + nameBytes.length + dataBytes.length;
          }

          const centralDirectorySize = centralDirectory.reduce((sum, item) => sum + item.length, 0);
          const endRecord = makeHeader(22);
          setUint32(endRecord, 0, 0x06054b50);
          setUint16(endRecord, 8, Object.keys(files).length);
          setUint16(endRecord, 10, Object.keys(files).length);
          setUint32(endRecord, 12, centralDirectorySize);
          setUint32(endRecord, 16, offset);

          return new Blob([...chunks, ...centralDirectory, endRecord], { type: mimeType });
        }

        function buildReportDocxBlob(result) {
          const markdown = buildReportMarkdown(result);
          const files = {
            '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
            '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
            'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
            'word/document.xml': docxDocumentXml(markdown),
            'word/styles.xml': docxStylesXml()
          };
          return createZipBlob(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        }
`;
}
