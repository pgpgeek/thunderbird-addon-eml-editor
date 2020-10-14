class ComposeManager {
  async getTabId() {
    let tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return tabs[0].id;
  }
  sendMessage(message) {
    this.getTabId().then(tabId => {
      browser.runtime.sendMessage({
        tabId,
        message
      });
    });
  }
  openSelectFile() {
    let message = { open_file : true };
    this.getTabId().then(tabId => {
      browser.runtime.sendMessage({ tabId, message });
    });
  }
};


x = new ComposeManager();
x.openSelectFile();