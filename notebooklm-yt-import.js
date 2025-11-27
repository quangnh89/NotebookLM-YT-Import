// ==UserScript==
// @name         NotebookLM YouTube Links Batch Import
// @version      2025-11-27
// @description  Batch import multiple YouTube links into Google NotebookLM efficiently. Intelligently handles various scenarios, including the auto-opened window on new notebooks. Supports deduplication and auto-close on success.
// @match        https://notebooklm.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notebooklm.google.com
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        // Timing constants (in milliseconds)
        TIMING: {
            INIT_DELAY: 3000,
            POLL_INTERVAL: 200,
            POLL_INTERVAL_SLOW: 500,
            INPUT_DELAY: 500,
            INPUT_SETTLE: 1500,
            POST_ACTION_DELAY: 1000,
            AUTO_CLOSE_DELAY: 3000,
            DUPLICATE_WARNING_DELAY: 3000,
        },
        // Timeout constants (in milliseconds)
        TIMEOUT: {
            ELEMENT_WAIT: 15000,
            DIALOG_CLOSE: 30000,
            SPINNER_WAIT: 90000,
            INPUT_WAIT: 5000,
        },
        // Selectors
        SELECTORS: {
            ADD_SOURCE_BTN: 'button[mattooltip="Add source"]',
            SOURCE_DIALOG: 'mat-dialog-container:has(mat-chip)',
            CHIP: 'mat-chip',
            URL_DIALOG: 'mat-dialog-container:has(input[id^="mat-input-"])',
            URL_INPUT: 'input[id^="mat-input-"]',
            DIALOG_CONTAINER: 'mat-dialog-container',
            SPINNER: 'mat-spinner[role="progressbar"]',
            BUTTON: 'button',
        },
        // UI Element IDs
        IDS: {
            FLOAT_BUTTON: 'batch-importer-btn',
            MODAL_BACKDROP: 'importer-modal-backdrop',
            MODAL_CONTENT: 'importer-modal-content',
            TEXTAREA: 'importer-textarea-links',
            STATUS: 'importer-status',
            BUTTONS_CONTAINER: 'importer-modal-buttons',
            START_BUTTON: 'importer-start-btn',
        },
        // Text content
        TEXT: {
            YOUTUBE: 'YouTube',
            INSERT: 'Insert',
            CANCEL: 'Cancel',
            CLOSE: 'Close',
        },
    };

    // ==================== STYLES ====================
    const STYLES = `
        #${CONFIG.IDS.FLOAT_BUTTON} {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #1a73e8;
            color: white;
            border-radius: 50%;
            border: none;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            font-size: 28px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        #${CONFIG.IDS.FLOAT_BUTTON}:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        #${CONFIG.IDS.MODAL_BACKDROP} {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #${CONFIG.IDS.MODAL_CONTENT} {
            background-color: #fff;
            color: #333;
            padding: 25px;
            border-radius: 10px;
            width: 600px;
            max-width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        body.dark-theme #${CONFIG.IDS.MODAL_CONTENT} {
            background-color: #282828;
            color: #efefef;
        }

        #${CONFIG.IDS.MODAL_CONTENT} h2 {
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }

        body.dark-theme #${CONFIG.IDS.MODAL_CONTENT} h2 {
            border-bottom-color: #555;
        }

        #${CONFIG.IDS.MODAL_CONTENT} textarea {
            width: 100%;
            height: 250px;
            margin: 15px 0;
            padding: 10px;
            background-color: #f9f9f9;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-family: monospace;
            resize: vertical;
            box-sizing: border-box;
        }

        body.dark-theme #${CONFIG.IDS.MODAL_CONTENT} textarea {
            background-color: #1e1e1e;
            color: #ccc;
            border-color: #555;
        }

        #${CONFIG.IDS.BUTTONS_CONTAINER} {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        #${CONFIG.IDS.BUTTONS_CONTAINER} button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background-color: #e0e0e0;
            color: #333;
            transition: background-color 0.2s;
        }

        body.dark-theme #${CONFIG.IDS.BUTTONS_CONTAINER} button {
            background-color: #444;
            color: #fff;
        }

        #${CONFIG.IDS.BUTTONS_CONTAINER} button:hover:not(:disabled) {
            background-color: #d0d0d0;
        }

        body.dark-theme #${CONFIG.IDS.BUTTONS_CONTAINER} button:hover:not(:disabled) {
            background-color: #555;
        }

        #${CONFIG.IDS.START_BUTTON} {
            background-color: #1a73e8 !important;
            color: white !important;
        }

        #${CONFIG.IDS.START_BUTTON}:hover:not(:disabled) {
            background-color: #1557b0 !important;
        }

        #${CONFIG.IDS.BUTTONS_CONTAINER} button:disabled {
            background-color: #ccc !important;
            cursor: not-allowed;
            opacity: 0.7;
        }

        body.dark-theme #${CONFIG.IDS.BUTTONS_CONTAINER} button:disabled {
            background-color: #555 !important;
        }

        #${CONFIG.IDS.STATUS} {
            margin-top: 15px;
            font-size: 0.9em;
            min-height: 40px;
            word-break: break-word;
            white-space: pre-wrap;
        }
    `;

    // ==================== STATE ====================
    const state = {
        isProcessing: false,
    };

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Creates a promise that resolves after specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Waits for an element to appear and be visible in the DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Maximum wait time in milliseconds
     * @param {Document|Element} rootNode - Root node to search from
     * @returns {Promise<Element>}
     * @throws {Error} If element not found within timeout
     */
    const waitForElement = async (
        selector,
        timeout = CONFIG.TIMEOUT.ELEMENT_WAIT,
        rootNode = document
    ) => {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = rootNode.querySelector(selector);
            if (element && element.offsetParent !== null) {
                return element;
            }
            await sleep(CONFIG.TIMING.POLL_INTERVAL);
        }

        throw new Error(`Timed out waiting for element: "${selector}"`);
    };

    /**
     * Waits for an element to disappear from the DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Maximum wait time in milliseconds
     * @param {Document|Element} rootNode - Root node to search from
     * @returns {Promise<boolean>} True if element disappeared, false if timeout
     */
    const waitForElementToDisappear = async (
        selector,
        timeout = CONFIG.TIMEOUT.SPINNER_WAIT,
        rootNode = document
    ) => {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (!rootNode.querySelector(selector)) {
                return true;
            }
            await sleep(CONFIG.TIMING.POLL_INTERVAL_SLOW);
        }

        return false;
    };

    /**
     * Creates a DOM element with specified attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {(string|Element)[]} children - Child elements or text content
     * @returns {Element}
     */
    const createElement = (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element[key] = value;
            }
        });

        children.forEach((child) => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                element.appendChild(child);
            }
        });

        return element;
    };

    /**
     * Creates a colored status message element
     * @param {string} message - Status message
     * @param {string} color - CSS color value
     * @returns {HTMLSpanElement}
     */
    const createStatusMessage = (message, color = 'inherit') => {
        return createElement('span', { style: { color } }, [message]);
    };

    /**
     * Finds a button by its text content
     * @param {Element} container - Container to search within
     * @param {string} text - Text to search for (case-insensitive)
     * @returns {Element|undefined}
     */
    const findButtonByText = (container, text) => {
        return Array.from(container.querySelectorAll(CONFIG.SELECTORS.BUTTON)).find((btn) =>
            btn.textContent.trim().toLowerCase().includes(text.toLowerCase())
        );
    };

    /**
     * Closes all open dialogs
     * @returns {Promise<void>}
     */
    const closeAllDialogs = async () => {
        const dialogs = document.querySelectorAll(CONFIG.SELECTORS.DIALOG_CONTAINER);

        dialogs.forEach((dialog) => {
            const closeBtn = findButtonByText(dialog, CONFIG.TEXT.CANCEL) ||
                             findButtonByText(dialog, CONFIG.TEXT.CLOSE);
            if (closeBtn) {
                closeBtn.click();
            }
        });

        await sleep(CONFIG.TIMING.POST_ACTION_DELAY);
    };

    // ==================== LINK PROCESSING ====================

    /**
     * Processes and deduplicates links from raw input
     * @param {string} rawText - Raw text with links separated by newlines
     * @returns {{ links: string[], duplicatesRemoved: number }}
     */
    const processLinks = (rawText) => {
        const rawLinks = rawText
            .split('\n')
            .map((link) => link.trim())
            .filter((link) => link.length > 0);

        const uniqueLinks = [...new Set(rawLinks)];

        return {
            links: uniqueLinks,
            duplicatesRemoved: rawLinks.length - uniqueLinks.length,
        };
    };

    /**
     * Opens the source dialog if not already open
     * @returns {Promise<Element>} The source dialog element
     */
    const ensureSourceDialogOpen = async () => {
        let sourceDialog = document.querySelector(CONFIG.SELECTORS.SOURCE_DIALOG);

        if (sourceDialog && sourceDialog.offsetParent !== null) {
            console.log('Source dialog already open, using it directly.');
            return sourceDialog;
        }

        const addSourceBtn = await waitForElement(CONFIG.SELECTORS.ADD_SOURCE_BTN);
        addSourceBtn.click();

        return await waitForElement(CONFIG.SELECTORS.SOURCE_DIALOG);
    };

    /**
     * Selects the YouTube chip in the source dialog
     * @param {Element} sourceDialog - The source dialog element
     * @returns {Promise<void>}
     */
    const selectYouTubeSource = async (sourceDialog) => {
        const chips = Array.from(sourceDialog.querySelectorAll(CONFIG.SELECTORS.CHIP));
        const youtubeChip = chips.find((chip) =>
            chip.textContent.trim().includes(CONFIG.TEXT.YOUTUBE)
        );

        if (!youtubeChip) {
            throw new Error("Unable to find 'YouTube' chip button");
        }

        youtubeChip.click();
        await sleep(CONFIG.TIMING.INPUT_DELAY);
    };

    /**
     * Enters URL and submits
     * @param {string} url - YouTube URL to insert
     * @returns {Promise<void>}
     */
    const submitUrl = async (url) => {
        const urlDialog = await waitForElement(CONFIG.SELECTORS.URL_DIALOG);
        const urlInput = await waitForElement(
            CONFIG.SELECTORS.URL_INPUT,
            CONFIG.TIMEOUT.INPUT_WAIT,
            urlDialog
        );

        // Set input value and trigger input event
        urlInput.value = url;
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(CONFIG.TIMING.INPUT_SETTLE);

        // Find and click insert button
        const insertBtn = findButtonByText(urlDialog, CONFIG.TEXT.INSERT);

        if (!insertBtn || insertBtn.disabled) {
            throw new Error('The "Insert" button is unavailable.');
        }

        insertBtn.click();
    };

    /**
     * Waits for the import to complete
     * @returns {Promise<void>}
     */
    const waitForImportComplete = async () => {
        await waitForElementToDisappear(
            CONFIG.SELECTORS.DIALOG_CONTAINER,
            CONFIG.TIMEOUT.DIALOG_CLOSE
        );
        await waitForElementToDisappear(
            CONFIG.SELECTORS.SPINNER,
            CONFIG.TIMEOUT.SPINNER_WAIT
        );
        await sleep(CONFIG.TIMING.POST_ACTION_DELAY);
    };

    /**
     * Adds a single YouTube link
     * @param {string} url - YouTube URL
     * @param {HTMLElement} statusDiv - Status display element
     * @returns {Promise<boolean>} Success status
     */
    const addSingleLink = async (url, statusDiv) => {
        try {
            const sourceDialog = await ensureSourceDialogOpen();
            await selectYouTubeSource(sourceDialog);
            await submitUrl(url);

            statusDiv.textContent += '\n → Processing...';
            await waitForImportComplete();

            return true;
        } catch (error) {
            console.error('Error adding link:', error);

            statusDiv.textContent += `\n`;
            statusDiv.appendChild(createStatusMessage(`Error: ${error.message}`, 'red'));

            await closeAllDialogs();
            return false;
        }
    };

    // ==================== UI COMPONENTS ====================

    /**
     * Creates the modal UI
     * @returns {{ backdrop: Element, closeModal: Function, elements: Object }}
     */
    const createModal = () => {
        const backdrop = createElement('div', { id: CONFIG.IDS.MODAL_BACKDROP });

        const modal = createElement('div', { id: CONFIG.IDS.MODAL_CONTENT });

        const title = createElement('h2', {}, ['Batch Import Sources']);

        const description = createElement('p', {}, [
            'Paste the list of YouTube links below, one link per line.',
        ]);

        const textarea = createElement('textarea', {
            id: CONFIG.IDS.TEXTAREA,
            placeholder: 'https://www.youtube.com/watch?v=...\nhttps://www.youtube.com/watch?v=...',
        });

        const statusDiv = createElement('div', { id: CONFIG.IDS.STATUS });

        const closeBtn = createElement('button', { textContent: 'Close' });
        const startBtn = createElement('button', {
            id: CONFIG.IDS.START_BUTTON,
            textContent: 'Start Import',
        });

        const buttonsContainer = createElement(
            'div',
            { id: CONFIG.IDS.BUTTONS_CONTAINER },
            [closeBtn, startBtn]
        );

        modal.append(title, description, textarea, statusDiv, buttonsContainer);
        backdrop.appendChild(modal);

        const closeModal = () => {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
        };

        // Event handlers
        closeBtn.onclick = closeModal;

        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                if (state.isProcessing) {
                    alert('Import is still running. Please wait until it finishes.');
                    return;
                }
                closeModal();
            }
        };

        return {
            backdrop,
            closeModal,
            elements: {
                textarea,
                statusDiv,
                closeBtn,
                startBtn,
            },
        };
    };

    /**
     * Sets the enabled state of modal controls
     * @param {Object} elements - Modal elements
     * @param {boolean} enabled - Whether controls should be enabled
     */
    const setControlsEnabled = (elements, enabled) => {
        elements.startBtn.disabled = !enabled;
        elements.closeBtn.disabled = !enabled;
        elements.textarea.disabled = !enabled;
    };

    /**
     * Handles the import process
     * @param {Object} elements - Modal elements
     * @param {Function} closeModal - Function to close the modal
     */
    const handleImport = async (elements, closeModal) => {
        const { textarea, statusDiv, startBtn, closeBtn } = elements;

        if (state.isProcessing) {
            statusDiv.textContent = 'Please wait for the current import to complete.';
            return;
        }

        const { links, duplicatesRemoved } = processLinks(textarea.value);

        // Validate links
        if (links.length === 0) {
            statusDiv.textContent = 'Error: The list of links cannot be empty!';
            return;
        }

        // Show duplicate warning
        if (duplicatesRemoved > 0) {
            statusDiv.textContent = '';
            statusDiv.appendChild(
                createStatusMessage(
                    `Warning: ${duplicatesRemoved} duplicate link(s) removed.`,
                    'orange'
                )
            );
            await sleep(CONFIG.TIMING.DUPLICATE_WARNING_DELAY);
        }

        // Start processing
        state.isProcessing = true;
        setControlsEnabled(elements, false);

        let successCount = 0;
        let userStopped = false;

        for (let i = 0; i < links.length; i++) {
            const currentLink = links[i];
            statusDiv.textContent = `[${i + 1}/${links.length}] Processing:\n${currentLink}`;

            const success = await addSingleLink(currentLink, statusDiv);

            if (success) {
                successCount++;
            } else {
                const shouldContinue = confirm(
                    `Error processing link ${i + 1}. Continue with remaining links?`
                );

                if (!shouldContinue) {
                    statusDiv.textContent = `Stopped by user. ${successCount} link(s) imported.`;
                    userStopped = true;
                    break;
                }
            }
        }

        // Handle completion
        if (!userStopped) {
            statusDiv.textContent = `Complete! ${successCount}/${links.length} link(s) imported.`;

            if (successCount === links.length && links.length > 0) {
                statusDiv.textContent += '\nClosing in 3 seconds...';
                await sleep(CONFIG.TIMING.AUTO_CLOSE_DELAY);
                closeModal();
            } else {
                setControlsEnabled(elements, true);
            }
        } else {
            setControlsEnabled(elements, true);
        }

        state.isProcessing = false;
    };

    /**
     * Creates and attaches the floating button
     */
    const createFloatingButton = () => {
        if (document.getElementById(CONFIG.IDS.FLOAT_BUTTON)) {
            return;
        }

        const floatButton = createElement('button', {
            id: CONFIG.IDS.FLOAT_BUTTON,
            title: 'Batch Import YouTube Links',
            textContent: '+',
        });

        floatButton.onclick = () => {
            if (document.getElementById(CONFIG.IDS.MODAL_BACKDROP)) {
                return;
            }

            const { backdrop, closeModal, elements } = createModal();
            document.body.appendChild(backdrop);

            elements.startBtn.onclick = () => handleImport(elements, closeModal);
        };

        document.body.appendChild(floatButton);
        console.log('NotebookLM Batch Import Assistant initialized.');
    };

    // ==================== INITIALIZATION ====================

    /**
     * Initializes the userscript
     */
    const init = () => {
        GM_addStyle(STYLES);
        setTimeout(createFloatingButton, CONFIG.TIMING.INIT_DELAY);
    };

    // Start the script
    init();
})();