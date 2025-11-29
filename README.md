# NotebookLM YouTube Links Batch Import

Batch-import multiple YouTube video links into Google NotebookLM in one go.  
Instead of adding each video manually, this userscript provides a simple interface where you paste a list of YouTube URLs and let the script add them as sources automatically.

> Inspired by the Greasy Fork script ["NotebookLM YouTube Links Batch Import Assistant"](https://greasyfork.org/en/scripts/553062-notebooklm-youtube-links-batch-import-assistant) by jeffers3n.

---

## Features

- Batch import of YouTube links  
  Paste many YouTube URLs (one per line) and import them into NotebookLM with a single action.

- Automatic deduplication  
  Duplicate links in your list are removed before importing, reducing clutter in your notebook.

- Smart NotebookLM integration  
  Works with the "Add sources" dialog in NotebookLM and can handle the window that auto-opens when creating a new notebook.

- Progress and error feedback  
  Shows which link is being processed and warns you if a specific URL cannot be added.

---

## Requirements

- A modern desktop browser (Chrome, Edge, Firefox, etc.)
- A user script manager extension, for example:
  - Tampermonkey
  - Violentmonkey
  - Greasemonkey (on Firefox)

---

## Installation

1. Install a user script manager extension:
   - Chrome / Edge: Tampermonkey or Violentmonkey
   - Firefox: Tampermonkey, Violentmonkey, or Greasemonkey
2. Clone or download this repository
3. In your user script manager:

   * Create a new script, then paste the contents of the `notebooklm-yt-import.js` file from this repository
     **hoặc**
   * Use the "Import from file" or "Install from URL" feature and point it to the raw `notebooklm-yt-import.js` file on GitHub.
4. Save the script and ensure it is enabled.
5. Make sure the script is allowed to run on `https://notebooklm.google.com/*` or `https://*.google.com/*` depending on your match rules.

---

## Usage

1. Open Google NotebookLM and go to the notebook where you want to add YouTube sources.
2. Open the NotebookLM "Add sources" dialog as usual.
3. Use the UI provided by this script (for example, a floating button or popup panel, depending on your implementation).
4. Paste a list of YouTube links into the textarea, one URL per line, such as:

   ```
   https://www.youtube.com/watch?v=AAAAAAAAAAA
   https://www.youtube.com/watch?v=BBBBBBBBBBB
   https://youtu.be/CCCCCCCCCCC
   ```
5. Click the "Import" or "Start" button.
6. Wait while the script:

   * Cleans up and deduplicates the list
   * Sequentially submits each link to NotebookLM
   * Shows progress and any error messages
7. When finished, review the imported sources in your notebook.

---

## Supported URL formats

The script is typically designed to handle common YouTube URL formats, for example:

* `https://www.youtube.com/watch?v=VIDEO_ID`
* `https://youtu.be/VIDEO_ID`
* URLs with additional parameters such as `&t=123s`

If your version supports additional formats or filters (playlists, shorts, etc.), document them here.

---

## Limitations and notes

* This tool depends on the current HTML structure and behavior of NotebookLM.
  If Google changes the NotebookLM UI, the script may need to be updated.
* Network issues or temporary NotebookLM errors can cause certain links to fail.
  Check the on-screen messages for any failed items and try again.
* The script does not download or cache any video content; it only sends URLs to NotebookLM as sources.

---

## Development

1. Clone this repository
2. Edit the main userscript file `notebooklm-youtube-batch-import.user.js`
3. Load the script in your user script manager from the local file or copy-paste the updated content.
4. Open NotebookLM and test the changes in your browser.

---

## License

This project is released under the MIT License.
See the `LICENSE.txt` file for details.

---

## Acknowledgements

* Google NotebookLM, for providing the platform this tool automates.
* The original Greasy Fork script
  ["NotebookLM YouTube Links Batch Import Assistant"](https://greasyfork.org/en/scripts/553062-notebooklm-youtube-links-batch-import-assistant) by jeffers3n, which inspired this version.
