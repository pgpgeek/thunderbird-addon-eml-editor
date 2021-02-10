/* globals ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

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
        openEML() {
          let win = Services.wm.getMostRecentWindow("mail:3pane");
          if (!win) return;
          let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
          fp.init(
            win,
            "EML File",
            Ci.nsIFilePicker.modeOpen
          );

          fp.appendFilter("EML", "*.eml");

          fp.open(rv => {
            if (rv != Ci.nsIFilePicker.returnOK) {
              return;
            }
            let msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"]
                              .createInstance(Ci.nsIMsgWindow);

            // Parameters need more work here to select correct identity/From.
            let fileURL = fp.fileURL.mutate().setQuery("type=application/x-message-display").finalize();
            MailServices.compose.OpenComposeWindow(null, {}, fileURL.spec,
              Ci.nsIMsgCompType.Draft,
              Ci.nsIMsgCompFormat.Default, null, null, msgWindow);
          });
        },
      },
    };
  }
};
