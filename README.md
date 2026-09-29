# Resume Studio

A vanilla HTML, CSS and JavaScript resume builder using the supplied Coforge style, with editable sections, nested subsections, images, alignment and A4 pagination. No framework, installation, account, backend or external CDN is required.

## Run

Open `index.html` in a modern browser, or serve this folder for consistent local draft storage:

```sh
cd /Volumes/m4_xssd/projects/resume-builder
python3 -m http.server 8765
```

Visit http://localhost:8765. The first launch displays the reference resume's sample content. **Start fresh** clears all sections; **Undo** restores the previous structure. Replace the personal sample in `sample-data.js` before publishing a public site.

## Content editing

- **Add section** opens presets for personal details, summary, skills, projects, experience, education, certifications, languages, images or a custom section. Add the same preset multiple times if needed.
- Expand any section to rename it, move it up/down, remove it, hide its heading or start it on a new page.
- **Text alignment** controls the section's body; **Heading alignment** independently controls its title. Both support left, center, right and justified text.
- Expand a content block to edit its label and text, override its alignment, move it or remove it. `Inherit` follows its parent section/subsection.
- Use **Content to add → Add content** inside any section or subsection to add paragraphs, table rows, bullet lists, personal details, headlines, images or grouped subsections. Each bullet is a separate input line. Subsections can contain another level of subsections.
- A project is a subsection containing freely editable rows and a responsibility list. Any field can be added, removed or renamed.
- **Undo** restores up to 12 structural changes (add/remove/reorder, image upload/clear, import, reset). It is not a per-keystroke text undo. Standard text-field keyboard undo still works while editing.

## Images

Use **Add section → Image / portfolio**, or add an **Image** block inside any section/subsection. The default personal section includes a **Passport photo** block.

Upload JPG, PNG or WebP files up to 5 MB. Images are resized locally to at most 1200 pixels on the longest edge and stored as JPEG data in the draft. Transparent areas use a white background. Controls set the caption, left/center/right position, width, height and either whole-image fit or crop-to-fill.

The first passport image sits beside the opening personal fields (or above them when centered). Its size is limited to 65 × 75 mm. Other images flow with the content and can be up to 170 × 180 mm. Remove the image block to remove the placeholder as well.

## Layout and PDF

The **Layout & alignment** tab adjusts body font size, line spacing, section spacing, table label width and whether the Coforge wordmark appears. The page remains A4 with the reference's colors and table style. The desktop editor and preview scroll independently.

**Download PDF → Continue to PDF export** opens the browser print dialog. Select **Save as PDF**, **A4**, **100%** scale, and disable browser headers and footers. Only resume pages print. This is a browser-assisted PDF download, not a silent one-click download. Mobile browsers may expose PDF through Print or Share.

Text remains selectable. Long paragraphs and table content continue onto new pages without shrinking the font. Images keep their chosen box dimensions and move together to the next page when needed. Very long profile fields fall back to normal flow if they cannot fit together with the photograph.

The font, wordmark and pagination approximate the original PDF; they are not pixel-identical. Original inline bold formatting is not reproduced, though paragraphs can be bolded. Add an official logo asset and licensed font if exact brand fidelity is required.

## Saving and compatibility

Changes save to localStorage in the current browser and origin. Existing version-1 drafts are migrated automatically into editable sections. Their original storage entry remains untouched. Version-1 exported JSON also imports successfully.

**Export draft** downloads version-2 JSON including sections, nested blocks, images and layout settings. **Import draft** validates and restores this format. Use exports for backups, especially for image-heavy resumes; if browser storage is full or unavailable, the save status tells you to export. Clearing browser data, private browsing or using a different origin can remove or isolate drafts.

Limits: 40 sections, 600 total blocks, 200 blocks per group, two nested subsection levels, 50,000 characters per content field, and 20 MB per imported draft. Image inputs and imported data are validated; content renders as text rather than executable HTML.

## Source and hosting

- `index.html`: editor panels, section picker, preview container and export dialog.
- `styles.css`: editor UI, Coforge-based A4 styling and print rules.
- `sample-data.js`: reference sample and version-1 defaults, loaded before the application.
- `app.js`: versioned data model, migration/validation, controls, local saving, image handling and pagination.

Host these four files on any static host. Add a backend only for accounts, cross-device saving, or a direct PDF endpoint. A direct endpoint can validate the submitted data, render the same template in headless Chromium, and return `page.pdf({format:'A4', printBackground:true, preferCSSPageSize:true})` with an attachment response. That endpoint is not included.

`verify-v2.cjs` is the current development browser check and uses the bundled Playwright runtime on this machine. `verify.cjs` is the historical version-1 check. Neither is needed for hosting. The `tmp/` directory contains local screenshots and must not be published.

The content/layout separation was informed by the public workflow described at https://flowcv.com/; this application does not connect to FlowCV or use its code.
