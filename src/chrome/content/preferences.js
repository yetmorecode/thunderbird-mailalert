
var MailAlertPreferences = {
	splitEntries : ',',
	splitData : '|',
		
	getPreferencesService : function () {
		var preferences = Components.classes["@mozilla.org/preferences-service;1"]
					  .getService(Components.interfaces.nsIPrefService).getBranch("extensions.mailalert.");
	    preferences.QueryInterface(Components.interfaces.nsIPrefBranch);
	    
	    return preferences;
	},
		
	updateBlacklist : function () {
		var pref = this.getPreferencesService();
		var list = pref.getCharPref('blacklist');
		var bl = document.getElementById('blacklist');
		while (bl.childNodes.length > 0) {
			var child = bl.childNodes[0];
			bl.removeChild(child);
		}
		
		var lh = document.createElement('listhead');
		var lhh = document.createElement('listheader');
		lhh.setAttribute('label', 'Account > Folder');
		lh.appendChild(lhh);
		bl.appendChild(lh);
		
		var lcs = document.createElement('listcols');
		var lc = document.createElement('listcol');
		lc.setAttribute('flex', '1');
		lcs.appendChild(lc);
		bl.appendChild(lcs);
		
		if (list.length == 0) {
			return;
		}
		
		var entries = list.split(this.splitEntries);
		for (i = 0; i < entries.length; i++) {
			var data = entries[i].split(this.splitData);
			
			var li = document.createElement('listitem');
			var lc = document.createElement('listcell');
			lc.setAttribute('label', data[1] + " > " + data[2]);
			
			li.appendChild(lc);
			bl.appendChild(li);
		}
	},

	addBlacklistEntry : function (folder) {
		var pref = this.getPreferencesService();
		var list = pref.getCharPref('blacklist');
		if (list.length > 0) {
			var entries = list.split(this.splitEntries);
		} else {
			var entries = [];
		}
		
		var value = folder.URI + this.splitData + folder.rootFolder.prettiestName + this.splitData + folder.prettiestName;
		for (i = 0; i < entries.length; i++) {
			if (entries[i] == value) {
				return;
			}
		}
		
		entries.push(value);
		pref.setCharPref('blacklist', entries.join(this.splitEntries));
		this.updateBlacklist();
	},

	removeBlacklistEntry : function (button, listitem) {
		var bl = document.getElementById('blacklist');
		
		var cell = bl.currentItem.firstChild;
		var tokens = cell.getAttribute('label').split(' > ');
		var root = tokens[0];
		var folder = tokens[1];
		
		var pref = this.getPreferencesService();
		var list = pref.getCharPref('blacklist');
		if (list.length > 0) {
			var entries = list.split(this.splitEntries);
		} else {
			var entries = [];
		}
		
		var newEntries = [];
		for (i = 0; i < entries.length; i++) {
			var data = entries[i].split(this.splitData);
			
			if (data[1] == root && data[2] == folder) {
				continue;
			}
			
			newEntries.push(entries[i]);
		}
		
		pref.setCharPref('blacklist', newEntries.join(this.splitEntries));
		this.updateBlacklist();
	}		
}
