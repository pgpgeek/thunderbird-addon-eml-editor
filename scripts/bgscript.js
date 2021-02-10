/*
*
* Save EML File
*
*/
function saveEMLFile(contents) {
  let data = new Blob([contents], {type: 'text/html'});
  let url  = window.URL.createObjectURL(data);
  let item = {
    filename: "file.eml",
    saveAs: true,
    url: url
  };
  browser.downloads.download(item);
}

/*
*
* Wait for EML file to open or to save
*
*/
browser.runtime.onMessage.addListener(async message => {
  if (message.message.save_file){
    saveEMLFile(message.message.file_contents);
  }
  if (message.message.open_file) {
    browser.EmlEditor.openEML();
  }
});
