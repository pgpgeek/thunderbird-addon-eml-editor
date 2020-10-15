const QEncodeRegex = /(=[A-F0-9]{2})((=[A-F0-9]{2})?)((=[A-F0-9]{2})?)/g;

/*
* Q-Decoder -> Revert a Q encoded string 
* like =ED=EC=A0 to real human readable string
* Return a string
*
*/
function qDecode(e)
{
  try { 
      char = decodeURIComponent(e.replace(/\=/g, '%')); 
  } 
  catch(e) {
      char = String.fromCharCode(parseInt(e.toString().replace(/\=/g,''), 16));
  }
  return char;
}
/*
*
* Extract EML Header part
* Return Object Header
*
*/
function extractHeader(eml)
{
  reg = /([A-Z]{1}[A-Za-z\-\_]{1,20}):(.*)/g;
  obj = {}
  while ((array = reg.exec(eml)) !== null) {
    obj[array[1].toLowerCase()] = array[2].trim();
  }
  return obj;
};

/*
*
* Format Q-encoded String to human Readable
* Return string
*
*/
function emlFormatDecode(text)
{
  return text
          .replace(/\=(\r\r|\n\n|\r\n|\n|\r)/g,'')
          .replace(QEncodeRegex, qDecode);
  
}

/*
*
* Make new Email from eml file
*
*/
function showFileContent(contents)
{
  header   = extractHeader(contents), body = {};
  contents = contents.split(contents.match(/MIME-Version: .*/)[0])[1];
  contents = emlFormatDecode(contents).replace(/<\n/g, '<');
  body.subject =  emlFormatDecode(header['subject'])
                  .replace(/\=\?UTF-8\?Q\?(.*?)\?\=/g, '$1');
  body.to = header['to']
  if (typeof header['content-type'] != 'undefined' &&
             header['content-type'].match(/html/))
  {
    body.body = contents;
    body.isPlainText = false;
  }
  else
  {
    body.plainTextBody = contents;
    body.isPlainText = true;
  }
  browser.compose.beginNew().then(tab => {
    browser.compose.setComposeDetails(tab.id, body);
    });
}

/*
*
* Save EML File
*
*/
function saveEMLFile(contents)
{
  var data = new Blob([contents], {type: 'text/html'}),
      url  = window.URL.createObjectURL(data);
    let item = {
      filename: "file.eml",
      saveAs: true,
      url: url
    };
  browser.downloads.download(item);
}

/*
*
* Wait for EML file ...
* to open or to save
*/
browser.runtime.onMessage.addListener(async message => {
  if (message.message.save_file){
    saveEMLFile(message.message.file_contents);
  }
  if (message.message.open_file){
    let input = document.createElement('input'), header;
    input.type = 'file';
    input.accept = '.eml';
    input.onchange = e => {
      let file    = e.target.files[0],
          reader  = new FileReader();
      if (!file) return;
      reader.onload = function(e)
      {
        showFileContent(e.target.result);
      }
      reader.readAsText(file);
    }
    input.click();
    return;
  }
});


//https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download