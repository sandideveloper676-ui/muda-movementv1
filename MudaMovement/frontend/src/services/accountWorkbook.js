import { strToU8, zipSync } from 'fflate'

export function formatAccountDate(createdAt) {
  return createdAt
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(createdAt))
    : '—'
}

function escapeXml(value) {
  const text = Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.codePointAt(0)
      return code === 0x9
        || code === 0xA
        || code === 0xD
        || (code >= 0x20 && code <= 0xD7FF)
        || (code >= 0xE000 && code <= 0xFFFD)
        || (code >= 0x10000 && code <= 0x10FFFF)
    })
    .join('')

  return text.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    })[character])
}

export function createAccountWorkbook(accounts) {
  const headers = ['Nama', 'Email', 'Telepon/WA', 'Peran', 'Tanggal daftar']
  const rows = [
    headers,
    ...accounts.map((account) => [
      account.name,
      account.email,
      account.phone,
      account.role,
      formatAccountDate(account.createdAt),
    ]),
  ]
  const columns = ['A', 'B', 'C', 'D', 'E']
  const worksheetRows = rows.map((row, rowIndex) => (
    `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => (
      `<c r="${columns[columnIndex]}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
    )).join('')}</row>`
  )).join('')
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:E${rows.length}"/>
  <cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="32" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="14" customWidth="1"/><col min="5" max="5" width="20" customWidth="1"/></cols>
  <sheetData>${worksheetRows}</sheetData>
  <autoFilter ref="A1:E${rows.length}"/>
</worksheet>`

  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Direktori akun" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    'xl/worksheets/sheet1.xml': worksheet,
  }

  return zipSync(Object.fromEntries(
    Object.entries(files).map(([path, contents]) => [path, strToU8(contents)]),
  ))
}
