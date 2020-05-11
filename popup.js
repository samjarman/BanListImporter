'use strict';

function click(e) {
    var banListString = document.getElementById('ban-content').value;

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        console.log(tabs);
        chrome.tabs.sendMessage(tabs[0].id, {
            message: 'ban',
            banWords: banListString
        });
        window.close();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('ban-button')
    button.addEventListener('click', click);
});
