
MailAlertWindow = {
	showAll : false,
	
	mouseIn : false,
	
	getService : function (component, iface) {
		var cmp = Components.classes[component];
		
		if (iface == null) {
			// Try to get wrappedJSObject
			return cmp.getService().wrappedJSObject;
		} else {
			return cmp.getService(Components.interfaces[iface]);
		}
	},

    onLoadWindow : function () {
		Components.utils.import("resource:///modules/MailUtils.js");
    	var alertservice = this.getService('@eigenco.de/mailalertservice;1');
 		var messages = alertservice.getMessages();
 		
 		var preferences = this.getService("@mozilla.org/preferences-service;1", "nsIPrefService").getBranch("extensions.mailalert.");
	    preferences.QueryInterface(Components.interfaces.nsIPrefBranch);
 		
 		var title_no = document.getElementById('titleNoNew');
 		var title_one = document.getElementById('titleOneNew');
 		var title_multiple = document.getElementById('titleMultipleNew');
 		var title_count = document.getElementById('titleNumMails');
 		if (messages.length > 0) {
 			var l = messages.length;
 			
 			if (l == 0) {
				title_no.setAttribute('hidden', false);
				title_one.setAttribute('hidden', true);
				title_count.setAttribute('hidden', true);
				title_multiple.setAttribute('hidden', true);
 			} else if (l == 1) {
 				title_no.setAttribute('hidden', true);
				title_one.setAttribute('hidden', false);
				title_count.setAttribute('hidden', true);
				title_multiple.setAttribute('hidden', true);
 			} else {
 				title_no.setAttribute('hidden', true);
				title_one.setAttribute('hidden', true);
				title_count.setAttribute('hidden', false);
				title_count.setAttribute('value', '' + l);
				title_multiple.setAttribute('hidden', false);
 			}
 			
 			var limit;
 			if (preferences.getBoolPref('messages.enable_limit')) {
 				limit = preferences.getIntPref('messages.limit');
 				
 				if (limit > messages.length) {
 					limit = messages.length;
 				}
 			} else {
 				limit = messages.length;
 			}
 			
 			var list = document.getElementById('mailEntryList');
 	 		for (i = messages.length - 1; i >= messages.length - limit; i--) {
 	 			var entry = this.buildMailEntry(messages[i]);
 	 			list.appendChild(entry);
 	 		}
 	 		
 	 		var showMore = document.getElementById('btnMore');
 			var more_one = document.getElementById('titleOneMore');
 			var more_multiple = document.getElementById('titleMultipleMore');
 			var more_count = document.getElementById('titleCountMore');
 	 		if (messages.length > limit) { 	 			
 	 			var list = document.getElementById('mailMoreList');
 	 	 		for (i = messages.length - limit - 1; i >= 0; i--) {
 	 	 			var entry = this.buildMailEntry(messages[i]);
 	 	 			list.appendChild(entry);
 	 	 		}
 	 			
 	 	 		if (messages.length == limit + 1) {
 	 				more_one.setAttribute('hidden', false);
 	 				more_multiple.setAttribute('hidden', true);
 	 				more_count.setAttribute('hidden', true);
 	 			} else {
 	 				more_one.setAttribute('hidden', true);
 	 				more_multiple.setAttribute('hidden', false);
 	 				more_count.setAttribute('value', '' + (messages.length - limit));
 	 				more_count.setAttribute('hidden', false);
 	 			}
 	 	 		showMore.setAttribute('hidden', false);
 	 		} else {
 	 			showMore.setAttribute('hidden', true);
 	 		}
 		}
 		
 		MailAlertWindow.recalculateSize();
 		
	    if (preferences.getBoolPref('close_after_timeout')) {
	    	var timeout = preferences.getIntPref('close_timeout');
	    	if (timeout > 0) {
	    		timeout = timeout * 1000;
	    	} else {
	    		timeout = 5000;
	    	}
	    	
	    	var timer = this.getService('@mozilla.org/timer;1', 'nsITimer');
	    	timer.initWithCallback({
	    		notify: function close() {
		 			if (MailAlertWindow && MailAlertWindow.mouseIn) {
		 				// Try again later as long as the mouse is over the window
		 				timer.initWithCallback({
		 					notify: close
		 				}, 250, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		 			} else {
		 				window.close();
		 			}
		 		}	    		
	    	}, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	    }
	    
	    // Keep track of mouse position to defer close timer when hovering the window
	    window.addEventListener('mouseover', function () {
	    	MailAlertWindow.mouseIn = true;
	    });
	    
	    window.addEventListener('mouseout', function () {
	    	MailAlertWindow.mouseIn = false;
	    });
    },
    
    recalculateSize : function () {
    	var preferences = this.getService("@mozilla.org/preferences-service;1", "nsIPrefService").getBranch("extensions.mailalert.");
	    preferences.QueryInterface(Components.interfaces.nsIPrefBranch);
 		
	    var mailBox = document.getBoxObjectFor(document.getElementById('mailContainer'));
	    var imageBox = document.getBoxObjectFor(document.getElementById('imgThunderbird'));
	    var scr = window.screen;
	    var borderWidth = 2;
 		
	    var position = preferences.getCharPref('screen_position');
 		position = position.split('-');
 		var vertical = position[0];
 		var horizontal = position[1];
 		
 		var width = mailBox.width + imageBox.width;
 		var height = mailBox.height;
 		
 		var x, y;
 		if (vertical == 'top') {
 			y = scr.availTop;
 		} else {
 			y = scr.availTop + scr.availHeight - height - 2*borderWidth;
 		}
 		
 		if (horizontal == 'right') {
 			x = scr.availLeft + scr.availWidth - width - 2*borderWidth;
 		} else if (horizontal == 'center') {
 			x = scr.availLeft + (scr.availWidth - width - 2*borderWidth) / 2;
 		} else {
 			x = scr.availLeft;	
 		}
 		
 		window.resizeTo(width + 2*borderWidth, height + 2*borderWidth);
 		window.moveTo(x, y);
    },
    
    showPreferences : function() {
    	window.open("chrome://mailalert/content/preferences.xul", "_blank", "chrome,dialog=yes");
    },
    
    acknowledgeMessages : function () {
    	var alertservice = this.getService('@eigenco.de/mailalertservice;1');
 		alertservice.acknowledgeAllMessages();
 		
    	this.closeWindow();
    },
    
    getMessageBody : function (aMessageHeader) {
    	var messenger = Components.classes["@mozilla.org/messenger;1"]
   	                    .createInstance(Components.interfaces.nsIMessenger);
   		var listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
   	                    .createInstance(Components.interfaces.nsISyncStreamListener);
   		var uri = aMessageHeader.folder.getUriForMsg(aMessageHeader);
   		messenger.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");
   	  
   		var folder = aMessageHeader.folder;
   		return folder.getMsgTextFromStream(
   			listener.inputStream,
   	        aMessageHeader.Charset,
   	        65536,
   	        32768,
   	        false,
   	        true,
   	        {}
   		);	
    },
    
    toggleShowAll : function () {
		var container = document.getElementById("mailMoreContainer");
    	
    	if (MailAlertWindow.showAll) {
    		container.style.display = "none";
    	} else {
    		container.style.display = "block";
    	}
    	MailAlertWindow.recalculateSize();
    	MailAlertWindow.showAll = !MailAlertWindow.showAll;
    },

	buildMailEntry : function (header) {
		var me = this;
		
    	var preferences = me.getService("@mozilla.org/preferences-service;1", "nsIPrefService").getBranch("extensions.mailalert.");
	    preferences.QueryInterface(Components.interfaces.nsIPrefBranch);
    	
		var row = document.createElement('row');
		row.setAttribute('class', 'mailEntry');
		row.addEventListener('click', function() {
			MailUtils.displayMessageInFolderTab(header);
		    var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		    	.getService(Components.interfaces.nsIWindowMediator);
		    var messageWindow = windowMediator.getMostRecentWindow("mail:3pane");
		    if (messageWindow) {
		    	me.closeWindow();
		    	messageWindow.focus();
		    } else {
		    	var console = Components.classes["@mozilla.org/consoleservice;1"].
		    	getService(Components.interfaces.nsIConsoleService);
		    	
		    	console.logStringMessage('mailalert: Could not locate main window after item was clicked');
		    }
		}, false);
		
		if (preferences.getBoolPref('show_time') ||
			preferences.getBoolPref('show_date')	
		) {
			var format = '';
			if (preferences.getBoolPref('show_date')) {
				format += '%a, %d.%m.%Y  ';
			}
			
			if (preferences.getBoolPref('show_time')) {
				format += '%H:%M';
			}
			
			var date = new Date(header.date / 1000);
			var ts = document.createElement('label');
			ts.setAttribute('value', date.toLocaleFormat(format));
			ts.setAttribute('class', 'mailEntryTimestamp');
			row.appendChild(ts);
		}
		
		if (preferences.getBoolPref('show_star')) {
			var starred = document.createElement('image');
			var state = header.isFlagged ? 'active' : 'inactive';
			starred.setAttribute('class', 'mailEntryStarred ' + state);
			starred.addEventListener('click', function(event) {
				header.markFlagged(!header.isFlagged);
				
				var state = header.isFlagged ? 'active' : 'inactive';
				starred.setAttribute('class', 'mailEntryStarred ' + state);
				
				event.stopPropagation();
			}, false);
			var box = document.createElement('vbox');
			var spacer = document.createElement('spacer');
			spacer.setAttribute('flex', '1');
			box.appendChild(starred);
			box.appendChild(spacer);
			
			row.appendChild(box);
		}
		
		var vbox = document.createElement('vbox');
		var hbox = document.createElement('hbox');
		
		if (preferences.getBoolPref('show_subject')) {
			var text = header.mime2DecodedSubject != '' ? header.mime2DecodedSubject : '(no subject)';
			if (header.flags & Components.interfaces.nsMsgMessageFlags.HasRe) {
				text = "Re: " + text;
			}
			
			var subject = document.createElement('description');
			subject.setAttribute('value', text);
			subject.setAttribute('crop', 'end');
			subject.setAttribute('class', 'mailEntrySubject');
			hbox.appendChild(subject);
		}
		
		if (preferences.getBoolPref('show_sender')) {
			var author = document.createElement('description');
			var authorName = header.mime2DecodedAuthor;
			var match, text;
			if (/^.* <.*>$/.test(authorName) == true) {
				match = /(.*) <.*>/.exec(authorName);
				text = match[1];
			} else if (/^<.*>$/.test(authorName) == true) {
				match = /<(.*)>/.exec(authorName);
				text = match[1];
			} else {
				text = authorName;
			}
			
			if (/^".*"$/.test(text) == true) {
				text = text.substr(1, text.length - 2);
			}
			
			author.setAttribute('value', text);
			author.setAttribute('crop', 'end');
			author.setAttribute('class', 'mailEntrySender');
			hbox.appendChild(author);
		}
		
		vbox.appendChild(hbox);
		
		if (preferences.getBoolPref('show_preview')) {
			var preview = document.createElement('description');
			preview.setAttribute('crop', 'end');
			preview.setAttribute('class', 'mailEntryPreview');
			preview.setAttribute('value', this.getMessageBody(header));
			vbox.appendChild(preview);
		}
		
		if (preferences.getBoolPref('show_folder')) {
			var foldername = document.createElement('description');
			foldername.setAttribute('value', header.folder.prettiestName);
			vbox.appendChild(foldername);
		}
		
		row.appendChild(vbox);
		
		return row;
	},
	
	closeWindow : function () {
		window.close();
	},
	
	dec : function (number) {
		if (number < 10) {
			return "0" + number;
		} else {
			return "" + number;
		}
	}
}