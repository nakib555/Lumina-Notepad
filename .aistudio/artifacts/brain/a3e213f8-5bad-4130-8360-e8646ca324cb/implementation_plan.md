# Master Engineering Specification: Professional PDF Printing & Document Alignment

## 1. Objective

### Purpose & Problem Statement
Currently, exporting or printing notes to PDF (via browser `window.print()` and Capacitor native `Printer.printHtml`) suffers from alignment and layout inconsistencies:
1. **Title Misalignment & Form Control Artifacts**: The note title is rendered inside a `<TextareaAutosize>` which in print mode retains browser form control margins, irregular line-height clipping, caret artifacts, or inconsistent baseline alignment.
2. **Missing Document Header Structure**: Printed output lacks a polished editorial header containing the document title, creation/last-modified date, and folder path with a clean divider rule.
3. **Table & Overflow Clipping**: Tables and preformatted code blocks can overflow the page margin, suffer from awkward column wrapping, or have missing border segments across page splits.
4. **Heading & Element Page Breaks**: Headings (`h1`–`h6`), math formulas, sketches, checklists, and callout blocks can be awkwardly sliced horizontally across page boundaries without proper `break-inside: avoid` and `break-after: avoid` rules.
5. **Native Export Discrepancy**: The native Capacitor print HTML generator in `use-editor-export.ts` uses inline CSS that diverges from web print styles (missing user-selected typography like Poppins, Sutonny, Inter, Lora, JetBrains Mono, different table border styles, and no unified header).

### Expected Result & Business Value
Transform printed and exported PDF notes into publication-grade, beautifully formatted documents with:
- Dedicated, semantic print header with title, subtle formatted date, and folder metadata.
- Auto-fitted, evenly balanced table columns with crisp borders and header shading.
- Clean code blocks with syntax highlighting preservation, line-wrapping, and avoidance of awkward page splits.
- Strict typography baseline alignment matching the user's chosen font family and size across both web print and native Capacitor print exports.
- Standard A4/Letter margins (15mm) with zero UI clutter (navbars, toolbars, sidebars, buttons completely hidden).

### Acceptance Criteria
- [ ] In print preview / PDF export, the note title renders as an authentic typography heading (no textarea borders, outlines, or baseline glitches).
- [ ] A subtle, professional metadata header is displayed directly beneath the title showing: Last edited / created date, folder path (if categorized), and a hairline divider.
- [ ] All UI chrome (navigation bar, sidebar, floating action buttons, formatting toolbars, symbols dock, sandbox sidebars, copy menus) are 100% hidden in print.
- [ ] Tables automatically fit 100% of the printable width, with centered/left-aligned cells, consistent border-collapse (`#cbd5e1`), and clean padding.
- [ ] Headings (`h1` through `h6`) never appear orphaned at the bottom of a page (`break-after: avoid`).
- [ ] Math expressions (KaTeX), inline sketches/images, blockquotes, and checklist items do not get cut across page boundaries.
- [ ] Capacitor native print (`use-editor-export.ts`) renders identical styling and typography to browser print.

---

## 2. Existing System Analysis

### Verified Facts
1. **Global Print CSS (`src/index.css`)**:
   - Contains `@media print` rules with `@page { size: auto; margin: 12mm 15mm 12mm 15mm; }`.
   - Forces `.print\:hidden` on toolbars, but the title container in `components/editor.tsx` (lines 487-494) uses `<TextareaAutosize>` with print utilities (`print:text-black print:text-left print:text-2xl sm:print:text-3xl`). Textarea form elements behave unpredictably in print drivers (rendering inner scroll gutters, line-height offset, or incomplete text wrapping).
2. **Editor Layout (`components/editor.tsx`)**:
   - Main container has `print:block print:h-auto` and inner container has `print:overflow-visible print:bg-white print:text-black print:p-0 print:m-0`.
   - Lacks a dedicated print-only header block for document metadata (date, folder).
3. **Editor Area (`components/editor/editor-area.tsx`)**:
   - Renders contenteditable div.
   - Contains table wrappers `<div className="overflow-x-auto w-full table-wrapper ...">`. In print, `overflow-x-auto` can cause content clipping or horizontal scroll shadows in Chromium print engines.
4. **Export Hook (`components/editor/use-editor-export.ts`)**:
   - Handles `exportNote("pdf")`:
     - On native platforms, calls `Printer.printHtml({ content })` where `content` is generated via custom HTML template.
     - On web, calls `window.print()`.
   - The native HTML template has hardcoded styling that lacks the current font family, table styling parity, and note metadata.

### Missing Information & Verified Constraints
- User answered key preferences:
  - Header: Clean title with subtle date and folder subheader.
  - Wide tables & code blocks: Auto-fit page width with balanced column sizing.
  - Margins: Standard A4 and Letter with balanced 15mm margins.

---

## 3. Architecture Design

### Component Architecture & Data Flow
1. **Print Header Component / Element (`components/editor.tsx`)**:
   - Add a print-only header rendered right above the editor body:
     - Title: Rendered as an `<h1>` element (with `hidden print:block print:text-3xl print:font-bold print:tracking-tight print:mb-2 print:text-neutral-900`). The `<TextareaAutosize>` receives `print:hidden` so that pure semantic HTML text is used by the print renderer.
     - Subheader: Displays formatted last modified/created date (e.g. `format(note.updatedAt, "MMMM d, yyyy 'at' h:mm a")`) and folder path (if note belongs to a folder) separated by a clean middle dot (`·`).
     - Divider: A hairline rule (`print:border-b print:border-neutral-200 print:pb-3 print:mb-4`).
2. **Unified Print Stylesheet Enhancements (`src/index.css`)**:
   - Update `@page` definition to:
     ```css
     @page {
       size: A4 portrait;
       margin: 15mm;
     }
     ```
   - Professional table formatting:
     ```css
     @media print {
       table {
         width: 100% !important;
         max-width: 100% !important;
         table-layout: auto !important;
         border-collapse: collapse !important;
         break-inside: avoid !important;
       }
       th, td {
         border: 1px solid #cbd5e1 !important;
         padding: 6px 10px !important;
         font-size: 0.9em !important;
         text-align: left !important;
         vertical-align: top !important;
         word-break: break-word !important;
       }
       th {
         background-color: #f8fafc !important;
         font-weight: 600 !important;
         -webkit-print-color-adjust: exact !important;
         print-color-adjust: exact !important;
       }
     }
     ```
   - Code blocks & Preformatting:
     ```css
     @media print {
       pre, code {
         white-space: pre-wrap !important;
         word-break: break-all !important;
         break-inside: avoid !important;
         font-family: var(--font-jetbrains), monospace !important;
         background-color: #f8fafc !important;
         border: 1px solid #e2e8f0 !important;
         border-radius: 4px !important;
         padding: 8px 12px !important;
       }
     }
     ```
   - Orphan prevention & Break controls:
     ```css
     @media print {
       h1, h2, h3, h4, h5, h6 {
         break-after: avoid !important;
         page-break-after: avoid !important;
         break-inside: avoid !important;
         color: #0f172a !important;
       }
       blockquote {
         break-inside: avoid !important;
         border-left: 3px solid #94a3b8 !important;
         padding-left: 12px !important;
         margin-left: 0 !important;
         color: #475569 !important;
         font-style: italic !important;
       }
       img, svg, .sketch-container, .katex-display {
         break-inside: avoid !important;
         max-width: 100% !important;
       }
     }
     ```
3. **Parity in Native Print Template (`components/editor/use-editor-export.ts`)**:
   - Align the HTML generation in `use-editor-export.ts` so that when `Printer.printHtml` is invoked on mobile/native devices, it includes the same CSS rules, metadata header, and font-family settings.

---

## 4. Implementation Breakdown

### Phase 1: CSS Print Rules & Margins Optimization (`src/index.css`)
- Configure `@page` to `size: A4 portrait; margin: 15mm;`.
- Enhance `@media print` rules to ensure strict alignment, zero overflow clipping, proper table formatting, and break-inside/break-after avoidance.
- Enforce exact color rendering (`-webkit-print-color-adjust: exact`).

### Phase 2: Editor Print Title & Metadata Subheader (`components/editor.tsx`)
- Hide the interactive `<TextareaAutosize>` during print using `print:hidden`.
- Render a semantic `<h1>` title specifically for print.
- Add the metadata row (`hidden print:flex items-center gap-2 text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-200`) showing the note's date and folder name.

### Phase 3: Table and Wrapper Fixes (`components/editor/editor-area.tsx`)
- Ensure table containers (`.table-wrapper`) have `print:overflow-visible print:w-full print:m-0` so tables expand to full page width cleanly.
- Ensure task lists and checkboxes maintain vertical alignment in print (`align-middle`, clean spacing).

### Phase 4: Native Export Parity (`components/editor/use-editor-export.ts`)
- Update `exportNote("pdf")` native HTML template to inject matching styles and metadata header.

---

## 5. Responsive & Cross-Device Strategy

### Desktop Experience
- `window.print()` / PDF export preview opens instantly with 15mm margins, clear title, metadata, crisp typography, and full-width tables.
- No sidebar, topbar, or bottom toolbar visible.

### Tablet & Mobile Experience
- On mobile browsers (Safari iOS, Chrome Android), printing or saving as PDF formats standard A4/Letter pages without horizontal scrolling or font shrinkage.
- In native Capacitor runtime, the `Printer.printHtml` call produces identical styling to the desktop web preview.

---

## 6. Accessibility & Quality Gates

- **Accessibility**: Using semantic `<h1>`, `<header>`, `<table>`, `<th>`, and `<blockquote>` ensures screen readers and PDF accessibility engines (Adobe Acrobat Accessibility checker, PDF/UA) recognize heading structure, tables, and document metadata.
- **Color Contrast**: All print text uses high-contrast neutral-900 / neutral-700 on pure white background, ensuring WCAG AAA print legibility.
- **Security**: No user inputs are rendered unsafely; HTML entities in title and content are properly handled by React.

---

## 7. Execution Checklist

1. [ ] Update `src/index.css` with professional `@page` dimensions (15mm) and robust `@media print` rules.
2. [ ] Modify `components/editor.tsx` to replace the textarea with semantic print elements and include the date/folder metadata header.
3. [ ] Verify `.table-wrapper` and elements in `components/editor/editor-area.tsx` allow 100% width and avoid page split artifacts.
4. [ ] Synchronize native Capacitor print template in `components/editor/use-editor-export.ts`.
5. [ ] Run `compile_applet` and verify zero TypeScript or build errors.
6. [ ] Wait 10 seconds post-build and check console for runtime errors.
