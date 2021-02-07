/* globals ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Implements the functions defined in the experiments section of schema.json.
var EmlEditor = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      EmlEditor: {
        async getFrom() {
          let win = Services.wm.getMostRecentWindow("msgcompose");
          return win ? win.gMsgCompose.compFields.from : null;
        },
        async getPrio() {
          let win = Services.wm.getMostRecentWindow("msgcompose");
          return win ? win.gMsgCompose.compFields.priority : null;
        },
      },
    };
  }
};
