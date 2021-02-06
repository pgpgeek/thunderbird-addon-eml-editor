class ComposeManager {
  async getTabId() {
    let tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return tabs[0].id;
  }

  async sendMessage(message) {
    let tabId = await this.getTabId();
    browser.runtime.sendMessage({ tabId, message });
  }

  async getAttachments() {
    let tabId = await this.getTabId();
    let details = await browser.compose.listAttachments(tabId);
    return details;
  }

  async getTextCompose() {
    let tabId = await this.getTabId();
    let details = await browser.compose.getComposeDetails(tabId);
    return details;
  }

  openSelectFile() {
    this.sendMessage({ open_file : true });
  }

  saveEMLFile(contents) {
    this.sendMessage({ save_file : true, file_contents: contents });
  }
};
