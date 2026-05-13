'use strict';

const LOG_PREFIX = 'Ban List Importer:';
const ADD_SETTLE_DELAY = 500;
const BETWEEN_TERMS_DELAY = 1200;
const PRIVACY_WAIT_TIMEOUT = 3000;
const WAIT_TIMEOUT = 10000;

let isImporting = false;

function log(message, ...optionalParams) {
    console.log(LOG_PREFIX, message, ...optionalParams);
}

function warn(message, ...optionalParams) {
    console.warn(LOG_PREFIX, message, ...optionalParams);
}

function describeElement(element) {
    if (!element) {
        return null;
    }

    return {
        tag: element.tagName ? element.tagName.toLowerCase() : null,
        ariaLabel: element.getAttribute('aria-label'),
        dataTarget: element.getAttribute('data-a-target'),
        className: typeof element.className === 'string' ? element.className : null,
        text: normalizeText(element.textContent).slice(0, 120)
    };
}

function sleep(ms) {
    return new Promise(function(resolve) {
        window.setTimeout(resolve, ms);
    });
}

function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function parseTerms(text) {
    return text
        .split(/[\n,]/)
        .map(function(word) {
            return word.trim();
        })
        .filter(Boolean);
}

function isVisible(element) {
    if (!element) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none';
}

function getMain() {
    return document.querySelector('main') || document.body;
}

function getBlockedTermsInput() {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find(function(candidate) {
        return normalizeText(candidate.textContent).toLowerCase() === 'search for a term to block';
    });

    if (label && label.htmlFor) {
        const labelledInput = document.getElementById(label.htmlFor);
        if (labelledInput) {
            log('Found blocked terms input by label.', describeElement(labelledInput));
            return labelledInput;
        }
    }

    const fallbackInput = getMain().querySelector('input[placeholder="Enter words or phrases"][data-a-target="tw-input"]') ||
        getMain().querySelector('input[aria-describedby="add-term-input__tip"]') ||
        getMain().querySelector('input[type="search"][data-a-target="tw-input"]');

    if (fallbackInput) {
        log('Found blocked terms input by fallback selector.', describeElement(fallbackInput));
    }

    return fallbackInput;
}

function setReactInputValue(input, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(input, 'value') &&
        Object.getOwnPropertyDescriptor(input, 'value').set;
    const prototype = Object.getPrototypeOf(input);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value') &&
        Object.getOwnPropertyDescriptor(prototype, 'value').set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(input, value);
    } else if (valueSetter) {
        valueSetter.call(input, value);
    } else {
        input.value = value;
    }

    input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value
    }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function pressKey(element, key, code, keyCode) {
    ['keydown', 'keypress', 'keyup'].forEach(function(type) {
        element.dispatchEvent(new KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            key: key,
            code: code,
            keyCode: keyCode,
            which: keyCode
        }));
    });
}

function pressEnter(input) {
    pressKey(input, 'Enter', 'Enter', 13);
}

function getExistingTerms() {
    return Array.from(getMain().querySelectorAll('.chat-term [title], table tbody th [title], table tbody th p'))
        .map(function(element) {
            return normalizeText(element.getAttribute('title') || element.textContent).toLowerCase();
        })
        .filter(Boolean);
}

function isTermPresent(term) {
    return getExistingTerms().includes(term.toLowerCase());
}

function getElementLabel(element) {
    return normalizeText(
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent
    );
}

function normalizePrivacy(privacy) {
    return privacy === 'private' ? 'private' : 'public';
}

function getCurrentPrivacy(button) {
    return /\bprivate\b/i.test(getElementLabel(button)) ? 'private' : 'public';
}

function getLivePrivacyButton(fallbackButton) {
    return getPrivacyButton() || fallbackButton;
}

function getLivePrivacy(button) {
    const liveButton = getLivePrivacyButton(button);

    return liveButton ? getCurrentPrivacy(liveButton) : null;
}

function clickInteractiveElement(element) {
    const target = element.closest('button, [role="option"], [role="menuitem"], [role="button"], [data-a-target="tw-core-button"]') ||
        element;

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(function(type) {
        target.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window
        }));
    });
    target.click();
}

function hasNearbyPrivacyLabel(element) {
    let current = element;

    for (let depth = 0; current && depth < 5; depth += 1) {
        if (/\bprivacy\b/i.test(normalizeText(current.textContent))) {
            return true;
        }

        current = current.parentElement;
    }

    return false;
}

function getPrivacyButton() {
    const activeBalloon = Array.from(document.querySelectorAll('.tw-balloon, [role="dialog"]'))
        .find(function(element) {
            const text = normalizeText(element.textContent);

            return isVisible(element) &&
                /\badd term to blocked terms\b/i.test(text) &&
                /\bprivacy\b/i.test(text);
        });

    if (activeBalloon) {
        const button = activeBalloon.querySelector('.tw-select-button, button[aria-expanded]');
        if (button && isVisible(button)) {
            log('Found privacy selector in add-term popover.', {
                currentPrivacy: getCurrentPrivacy(button),
                button: describeElement(button)
            });
            return button;
        }
    }

    const fallbackButton = Array.from(document.querySelectorAll('button, [role="button"]'))
        .find(function(element) {
            const label = getElementLabel(element);

            return isVisible(element) &&
                /^(public|private)$/i.test(label) &&
                hasNearbyPrivacyLabel(element);
        });

    if (fallbackButton) {
        log('Found privacy selector by fallback search.', {
            currentPrivacy: getCurrentPrivacy(fallbackButton),
            button: describeElement(fallbackButton)
        });
    }

    return fallbackButton;
}

function findPrivacyOption(privacy) {
    const desired = normalizePrivacy(privacy);
    const optionContainers = Array.from(document.querySelectorAll('.ReactModal__Content .tw-balloon, .tw-dialog-layer .tw-balloon, [data-popper-placement] .tw-balloon'))
        .filter(function(element) {
            const text = normalizeText(element.textContent).toLowerCase();

            return isVisible(element) &&
                /\bpublic\b/.test(text) &&
                /\bprivate\b/.test(text) &&
                !/\badd term to blocked terms\b/.test(text);
        });

    for (const container of optionContainers) {
        const option = Array.from(container.querySelectorAll('button, [role="option"], [role="menuitem"], [role="button"]'))
            .find(function(element) {
                return isVisible(element) &&
                    normalizeText(element.textContent).toLowerCase() === desired;
            });

        if (option) {
            log('Found privacy option in Twitch dropdown modal.', {
                desired,
                option: describeElement(option),
                container: describeElement(container)
            });
            return option;
        }
    }

    const fallbackOption = Array.from(document.querySelectorAll('[role="option"], button, [role="menuitem"], [data-a-target="tw-core-button-label-text"], p'))
        .find(function(element) {
            const label = getElementLabel(element).toLowerCase();

            return isVisible(element) &&
                !element.closest('.tw-select-button') &&
                (label === desired || label.startsWith(`${desired} `));
        });

    if (fallbackOption) {
        log('Found privacy option by fallback search.', {
            desired,
            option: describeElement(fallbackOption)
        });
    }

    return fallbackOption;
}

async function waitForPrivacyValue(button, desired) {
    const start = Date.now();

    while (Date.now() - start < PRIVACY_WAIT_TIMEOUT) {
        const currentPrivacy = getLivePrivacy(button);

        log('Checking privacy value.', {
            desired,
            currentPrivacy
        });

        if (currentPrivacy === desired) {
            return true;
        }

        await sleep(100);
    }

    return false;
}

async function waitForPrivacyButton() {
    const start = Date.now();

    while (Date.now() - start < PRIVACY_WAIT_TIMEOUT) {
        const button = getPrivacyButton();
        if (button) {
            return button;
        }

        await sleep(100);
    }

    return null;
}

async function setPrivacy(privacy) {
    const desired = normalizePrivacy(privacy);
    let button = await waitForPrivacyButton();

    if (!button) {
        if (desired === 'public') {
            warn('Privacy selector not found; continuing because requested privacy is public.');
            return;
        }

        warn('Privacy selector not found for requested privacy.', { desired });
        throw new Error('Could not find the Twitch privacy selector.');
    }

    if (getCurrentPrivacy(button) === desired) {
        log('Privacy already selected.', { desired });
        return;
    }

    log('Opening privacy selector.', {
        desired,
        currentPrivacy: getCurrentPrivacy(button),
        button: describeElement(button)
    });
    clickInteractiveElement(button);

    const start = Date.now();
    while (Date.now() - start < PRIVACY_WAIT_TIMEOUT) {
        const option = findPrivacyOption(desired);
        if (option) {
            log('Selecting privacy option.', {
                desired,
                option: describeElement(option)
            });
            clickInteractiveElement(option);
            if (await waitForPrivacyValue(button, desired)) {
                log('Privacy selection confirmed.', { desired });
                return;
            }

            warn('Clicked privacy option but selector value did not update yet.', {
                desired,
                currentPrivacy: getLivePrivacy(button)
            });
        }

        await sleep(100);
    }

    warn('Privacy option click path failed; trying keyboard fallback.', {
        desired,
        currentPrivacy: getLivePrivacy(button)
    });
    button = getLivePrivacyButton(button);
    button.focus();
    clickInteractiveElement(button);
    await sleep(100);

    if (desired === 'private') {
        pressKey(button, 'ArrowDown', 'ArrowDown', 40);
    } else {
        pressKey(button, 'Home', 'Home', 36);
    }
    pressKey(button, 'Enter', 'Enter', 13);

    if (await waitForPrivacyValue(button, desired)) {
        log('Privacy selection confirmed after keyboard fallback.', { desired });
        return;
    }

    warn('Could not select requested privacy.', {
        desired,
        currentPrivacy: getLivePrivacy(button),
        button: describeElement(button)
    });
    throw new Error(`Could not select ${desired} privacy in Twitch.`);
}

function findActionButton(term) {
    const normalizedTerm = term.toLowerCase();
    const ignored = /delete|edit|search|help|notification|navigation|collapse|thread/i;

    return Array.from(getMain().querySelectorAll('button, [role="button"], [role="option"]'))
        .find(function(element) {
            const label = getElementLabel(element);
            const lowerLabel = label.toLowerCase();

            return isVisible(element) &&
                !element.disabled &&
                !ignored.test(label) &&
                (
                    /^(add|block|save|confirm)\b/i.test(label) ||
                    (lowerLabel.includes(normalizedTerm) && /add|block/i.test(label))
                );
        });
}

async function waitForImportReady() {
    const start = Date.now();

    while (Date.now() - start < WAIT_TIMEOUT) {
        const input = getBlockedTermsInput();
        if (input && isVisible(input)) {
            log('Import target is ready.', describeElement(input));
            return input;
        }

        await sleep(250);
    }

    warn('Could not find the Twitch blocked terms input before timeout.');
    throw new Error('Could not find the Twitch blocked terms input.');
}

async function addWord(word, privacy) {
    const input = await waitForImportReady();

    if (isTermPresent(word)) {
        log('Skipping existing term', word);
        return;
    }

    log('Adding term.', { word, privacy: normalizePrivacy(privacy) });
    input.scrollIntoView({ block: 'center' });
    input.focus();
    setReactInputValue(input, '');
    setReactInputValue(input, word);
    log('Term entered into Twitch input.', { word });

    await sleep(ADD_SETTLE_DELAY);
    await setPrivacy(privacy);

    const button = findActionButton(word);
    if (button) {
        log('Clicking Twitch add action.', {
            word,
            button: describeElement(button)
        });
        button.click();
    } else {
        warn('Could not find Twitch add action button; pressing Enter as fallback.', { word });
        pressEnter(input);
    }

    await sleep(BETWEEN_TERMS_DELAY);
}

async function runBan(text, privacy) {
    if (isImporting) {
        warn('Import request rejected because another import is running.');
        throw new Error('An import is already running.');
    }

    const words = parseTerms(text);
    if (!words.length) {
        warn('Import request rejected because no terms were provided.');
        throw new Error('No ban terms were provided.');
    }

    isImporting = true;
    log('Starting import.', { words, privacy: normalizePrivacy(privacy) });

    try {
        for (const word of words) {
            await addWord(word, privacy);
        }
        log('Import complete.');
    } finally {
        isImporting = false;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request || request.message !== 'ban') {
        return false;
    }

    log('Received import request from popup.', {
        privacy: normalizePrivacy(request.termPrivacy),
        termCount: parseTerms(request.banWords || '').length
    });

    if (isImporting) {
        warn('Popup import request rejected because another import is running.');
        sendResponse({ ok: false, error: 'An import is already running.' });
        return false;
    }

    if (!parseTerms(request.banWords).length) {
        warn('Popup import request rejected because no terms were provided.');
        sendResponse({ ok: false, error: 'No ban terms were provided.' });
        return false;
    }

    runBan(request.banWords, request.termPrivacy)
        .catch(function(error) {
            console.error(LOG_PREFIX, error);
        });

    log('Popup import request accepted.');
    sendResponse({ ok: true });
    return false;
});
