function runBan(text) {
	var words = text.split(',');
	
	var index = 0;
	var max = words.length;

	var ticker = setInterval(function (){ 
		var word = words[index];
		addWord(word);
		index = index + 1;
		if (index >= max) {
			clearInterval(ticker);
		}
	}, 700);
};

function addWord(word) {
	document.activeElement.blur();
	document.querySelectorAll('[data-a-target="add-term-input"]')[0].firstChild.focus();
	document.querySelectorAll('[data-a-target="add-term-input"]')[0].firstChild.value = word;

	setTimeout(function(){
		document.activeElement.blur()
		document.querySelectorAll('[data-a-target="add-term"]')[0].click();
	}, 300);
}


window.onload = function() {
	chrome.runtime.onMessage.addListener(
	  function(request, sender, sendResponse) {
	    if (request.message == 'ban'){
	      runBan(request.banWords);
	    }
	});
};