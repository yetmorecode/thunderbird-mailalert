Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function MailAlertService() { 	
	this.wrappedJSObject = this;
	
	// Listen to new incoming emails
	var notificationService = this.getService("@mozilla.org/messenger/msgnotificationservice;1", "nsIMsgFolderNotificationService");
	var alertService = this;
	notificationService.addListener({
	    msgAdded : function(header) {
			// Propose the new message to the alert service. 
			// If it passes the alert filter, the alert service fires a "alert" event
	        alertService.proposeMessage(header);
		},
		
		msgsClassified : function (headers, isJunk, isTrait) {
			if (!isJunk) {
				//alertService.proposeMessages(headers);
			}
		}
	}, notificationService.msgAdded | notificationService.msgsClassified); 
	
	// Listen on the notification-icon clicks in the systray
	var observerService = this.getService("@mozilla.org/observer-service;1", "nsIObserverService");
	observerService.addObserver({
		observe :  function (subject, topic, data) {
			if (data == "click") {
				alertService.notifyAlert();
			}
			
			if (data == "dblclick") {
				var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
				mainWindow.focus();
			}
		}
	}, "notification-icon", false);
	
	// Show notification icon in systray on "alert" event
	var nis = this.getService("@eigenco.de/notificationiconservice;1", "iNotificationIconService");
	this.addAlertListener(function() {
        nis.showNotificationIcon();	
	})
}

/**
 * MailAlert service provides a simple notification service for arriving messages
 * that should be shown in notifications.
 * 
 * The service listens for new arriving mail, filters them according to the blacklist,
 * junk, spam, etc. and then informs all registered listeners of this service
 * that new mail has arrived.
 * 
 * The service keeps track of all arriving messages until they get acknowleged.
 */
MailAlertService.prototype = {
  classDescription: "Mailalert service component",
  classID:          Components.ID("{05fe59c1-723f-475e-b836-9688838ad3fc}"),
  contractID:       "@eigenco.de/mailalertservice;1",
  QueryInterface: XPCOMUtils.generateQI(),
  
  /**
   * List of new messages
   */
  messages : [],
  
  /**
   * Determines whether new messages exist
   */
  newMessages : false,
  
  /**
   * Listeners to alert when new messages arrive
   */
  listeners : [],
  
  /**
   * Gets a service either by interface or wrappedJSObject
   */
  getService : function (component, iface) {
		cmp = Components.classes[component];
		
		if (iface == null) {
			// Try to get wrappedJSObject
			return cmp.getService().wrappedJSObject;
		} else {
			return cmp.getService(Components.interfaces[iface]);
		}
  },

  /**
   * Adds a new listener to inform when new messages arrive
   */
  addAlertListener : function(callback) {
      this.listeners.push(callback);
  },

  /**
   * Acknowledges all new messages and empties the list of new messages
   */
  acknowledgeAllMessages : function () {
	  // Remove invalid messages
	  this.cleanupMessages();
	  
	  // Remove "new" flag from messages 
	  for (i = 0; i < this.messages.length; i++) {
		  if (!this.messages[i].isRead) {
			  // This should be properly done through nsIMsgDatabase interface instead
			  // Kind of works for now
			  this.messages[i].markRead(true);
			  this.messages[i].markRead(false);
		  }
	  }
	  
	  // Clear internal list of new messages
	  this.messages = [];
	  
	  // Hide the notification icon in the systray
	  var nis = this.getService("@eigenco.de/notificationiconservice;1", "iNotificationIconService");
	  nis.hideNotificationIcon();
  },
  
  /**
   * Notify all listeners that new messages arrived
   */
  notifyAlert : function() {
	  // Don not notify if this is a bogus alert, i.e. no new messages available
	  if (this.getMessageCount() == 0) {
		  return;
	  }
	  
	  // Call all registered listeners
	  for(i = 0; i < this.listeners.length; i++) {
		  cb = this.listeners[i];
		  cb();
	  }
  },
  
  /**
   * Proposes a nsIMsgHdr to the service
   * 
   * Regarding the blacklist the message can be rejected or accepted
   */
  proposeMessage : function (msgHdr) {		  
      // Reject proposed message for those standard folders
	  var ff = Components.interfaces.nsMsgFolderFlags;
	  if (msgHdr.folder.flags & (ff.Trash | ff.SentMail | ff.Drafts | ff.Archive | ff.Junk)) {
          return;
	  }
	  
      // Reject blacklist of folders
	  preferences = this.getService("@mozilla.org/preferences-service;1", "nsIPrefService").getBranch("extensions.mailalert.");
	  preferences.QueryInterface(Components.interfaces.nsIPrefBranch);
	  blacklist = preferences.getCharPref('blacklist');
	  // Blacklist is a comma seperated list of folder entries
	  blacklist = blacklist.split(',');
	  
	  for (i = 0; i < blacklist.length; i++) {
		  // Each folder entry is separated by | into the below shown data.
		  // Unfortunately there is no proper folder id to store. See Bug #671205
		  entry = blacklist[i].split('|');
		  
		  if (msgHdr.folder.URI == entry[0] &&
		      msgHdr.folder.rootFolder.prettiestName == entry[1] &&
			  msgHdr.folder.prettiestName == entry[2]
		  ) {
		      return;
		  }  
	  }
	  
	  this.messages.push(msgHdr);
	  this.notifyAlert();
  },
  
  /**
   * Cleans messages up by removing no longer existing messages
   */
  cleanupMessages : function() {
	  // Remove messages that no longer exist (i.e. deleted ones)
	  var msgs = [];
	  for (i = 0; i < this.messages.length; i++) {
		  if (this.messages[i].date != 0) {
			  msgs.push(this.messages[i]);
		  }
	  }
	  
	  this.messages = msgs;
  },
  
  /**
   * Gets a list of unacknowledged messages
   */
  getMessages : function() {
	  this.cleanupMessages();
	  
	  return this.messages;
  },
  
  /**
   * Gets the number of unacknowleged messages available
   */
  getMessageCount : function () {
	  var messages = this.getMessages();
	  
	  return messages.length;
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([MailAlertService]);