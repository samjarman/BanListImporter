'use strict';

function setStatus(message) {
    var status = document.getElementById('status');
    if (status) {
        status.textContent = message;
    }
}

function handleChromeError() {
    if (chrome.runtime.lastError) {
        setStatus('Open the Twitch blocked terms page, then try again.');
        return true;
    }

    return false;
}

function click(e) {
    e.preventDefault();

    var button = document.getElementById('ban-button');
    var banListString = document.getElementById('ban-content').value;
    var privacyInput = document.querySelector('input[name="term-privacy"]:checked');
    var termPrivacy = privacyInput ? privacyInput.value : 'public';

    if (!banListString.trim()) {
        setStatus('Enter at least one term.');
        return;
    }

    button.disabled = true;
    setStatus('Sending terms to Twitch...');

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (handleChromeError() || !tabs.length) {
            button.disabled = false;
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
            message: 'ban',
            banWords: banListString,
            termPrivacy: termPrivacy
        }, function(response) {
            if (handleChromeError()) {
                button.disabled = false;
                return;
            }

            if (response && response.ok) {
                setStatus('Import started. Keep this Twitch tab open.');
                window.setTimeout(function() {
                    window.close();
                }, 900);
                return;
            }

            setStatus(response && response.error ? response.error : 'Could not start the import.');
            button.disabled = false;
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById('ban-button');
    button.addEventListener('click', click);
});
