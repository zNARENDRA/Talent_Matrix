import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Reports Generation & RFC-4180 CSV Export', () => {
  function formatCSVRow(fields: (string | number | boolean | null | undefined)[]): string {
    return fields
      .map((field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
  }

  it('correctly escapes quotes and commas in CSV export rows', () => {
    const row = formatCSVRow(['STU1001', 'Aarav, Sharma', 'Tech "Corp", Inc.', 45.5, 'super_dream']);
    assert.strictEqual(row, '"STU1001","Aarav, Sharma","Tech ""Corp"", Inc.","45.5","super_dream"');
  });

  it('generates proper placement report CSV header and structure', () => {
    const headers = ['Offer ID', 'Student Name', 'Student ID', 'Department', 'GPA', 'Company', 'Role', 'Package (LPA)', 'Offer Tier', 'Status'];
    const sampleRecord = ['off-1', 'Priya Patel', 'STU1020', 'CSE', 9.2, 'Google', 'Software Engineer', 42, 'super_dream', 'accepted'];

    const csv = [formatCSVRow(headers), formatCSVRow(sampleRecord)].join('\r\n');
    const lines = csv.split('\r\n');

    assert.strictEqual(lines.length, 2);
    assert(lines[0].includes('"Offer ID"'));
    assert(lines[1].includes('"Google"'));
    assert(lines[1].includes('"42"'));
  });
});
