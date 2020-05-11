const LOGGING = true;
const WAIT_FOR_FOCUS = 200;
const WAIT_FOR_BUTTON = 200;
const WAIT_FOR_SAVE = 1000;

function log(message, ...optionalParams) {
    if (LOGGING) {
        console.log('BAN LIST IMPORTER: ' + message, ...optionalParams)
    }
}

function runBan(text) {
    log("Ban instruction recieved");
    var words = text.split(',');
    log(words);

    var index = 0;
    var max = words.length;

    var ticker = setInterval(function () {
        var word = words[index];
        log('Adding: ', word);
        addWord(word);
        index = index + 1;
        if (index >= max) {
            clearInterval(ticker);
        }
    }, WAIT_FOR_SAVE);
};

function addWord(word) {
    document.activeElement.blur();
    let inputBox = document.querySelectorAll('[data-a-target="add-term-input"]')[0].firstChild;
    inputBox.focus();
    setTimeout(() => {
        inputBox.value = word;
        log('Waiting for button....');
        document.activeElement.blur();
        waitForAndClickButton();
    }, WAIT_FOR_FOCUS)
}

function waitForAndClickButton() {
    setTimeout(function () {
        log("Button should be here...")
        let button = document.querySelectorAll('[data-a-target="add-term"]')[0];
        if (button) {
            log("It is...")
            button.click();
        } else {
            log("It is not, waiting again...")
            waitForAndClickButton() // keep waiting until button appears..
        }
    }, WAIT_FOR_BUTTON);
}


window.onload = function () {
    log('onLoad')
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            log('got a message', request)
            if (request.message == 'ban') {
                runBan(request.banWords);
            }
        }
    );
};
