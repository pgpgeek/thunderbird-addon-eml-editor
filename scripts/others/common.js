class ComposeManager {
  async getTabId()
  {
    let tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return tabs[0].id;
  }
  sendMessage(message)
  {
    this.getTabId().then(tabId => {
      browser.runtime.sendMessage({
        tabId,
        message
      });
    });
  }
  getTextCompose()
  {
    return new Promise((res, err) => {
      this.getTabId().then(tabId => {
        browser.compose.getComposeDetails(tabId).then(async (details) => {
           res(details);
        }).catch(err);
      });
    });
  }
  openSelectFile()
  {
    let message = { open_file : true };
    this.getTabId().then(tabId => {
      browser.runtime.sendMessage({ tabId, message });
    });
  }
  saveEMLFile(contents) {
    let message = { save_file : true, file_contents: contents };
    this.getTabId().then(tabId => {
      browser.runtime.sendMessage({ tabId, message });
    });
  }
};