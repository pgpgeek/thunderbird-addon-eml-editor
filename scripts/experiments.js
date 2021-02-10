/* globals ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { MimeParser } = ChromeUtils.import("resource:///modules/mimeParser.jsm");

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

            let stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                            .createInstance(Ci.nsIFileInputStream);
            stream.init(fp.file, -1, 0, 0);
            let sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
              Ci.nsIScriptableInputStream
            );
            sis.init(stream);
            let streamData = "";
            try {
              while (sis.available() > 0) {
                // Read 4K chunks, we only want the headers.
                streamData += sis.read(Math.min(4096, sis.available()));
                if (streamData.search(/\r?\n\r?\n/) > 0) break;
              }
            } catch (e) {}
            sis.close();

            let headers = MimeParser.extractHeaders(streamData);

            let fileURL = fp.fileURL.mutate().setQuery("type=application/x-message-display").finalize();
            let msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"]
                              .createInstance(Ci.nsIMsgWindow);
            MailServices.compose.OpenComposeWindow(null, {}, fileURL.spec,
              Ci.nsIMsgCompType.Draft,
              Ci.nsIMsgCompFormat.Default, null, headers.get("from"), msgWindow);
          });
        },
      },
    };
  }
};
