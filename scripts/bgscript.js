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
  eml = eml.split(/\n\n/)[0];
  reg = /([A-Z]{1}[A-Za-z\-\_ \t]{1,20}):(.*)/g;
  obj = {}
  while ((array = reg.exec(eml)) !== null) {
    obj[array[1].trim().toLowerCase()] = array[2].trim();
  }
  //detect filename 
  filename = eml.match(/fIlename=(.*)/i);
  if (filename) {
    obj.filename = filename[1].replace(/"|'/g, '');
  }
  Object.keys(obj).map( el => {
    obj[el] = obj[el].match(/\^%[a-z]*\%$/) ? "" : obj[el];
  });
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
*
* Add Attachements on email
*
*/

function addAttachment(tabId, attachements)
{
  attachements.map( attachment => {
    var file = null, bstr, n, u8arr;

    try {
      bstr = atob(attachment.body.trim()); 
      n = bstr.length;
      u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
    } catch (err) {
      u8arr= attachment.body.trim();
    }
    
    file = new File([u8arr], attachment.header.filename, {
      type: attachment.header['content-type'],
    });
    browser.compose.addAttachment(tabId, {file:file});
  });
}

/*
*
*
* Extrat all parts from email (main contents, attachments, ....)
*
*/
function extractMultipartContent(contents, header) {
  let body, contentType, boundary = header['content-type'].match(/boundary=(.*)/), 
        attachments = [],
        bodyParts = contents.split(boundary ? '--'+boundary[1] : /zertyuhgfdfghjgfdfghgf/);
        bodyParts.map( tmpContents  => {
          let tmp = tmpContents.split(/\n\n/),
              tmpHeader = extractHeader(tmp[0]);
        if (!tmpHeader['content-type']) return null;
          tmp.shift();
          tmpBody = tmp.join("\n\n");
          if (tmpHeader['content-disposition'] && 
              tmpHeader['content-disposition'].indexOf('attachment') != -1) {
                return attachments.push({header: tmpHeader, body: tmpBody});
          }
            
            contentType = tmpHeader['content-type'];
            body = tmpBody;
        });
      return {
          attachements  : attachments,
          body          : body,
          contentType   : contentType

      };
}

/*
*
* Make new Email from eml file
*
*/
function showFileContent(contents)
{
  let attachments = [], tmp, body = {};
      header   = extractHeader(contents);
  contents = contents.split(/\n\n/);
  contents.shift();
  contents = contents.join("\n\n");
  contents = emlFormatDecode(contents).replace(/<\n/g, '<');
  body.subject =  emlFormatDecode(header['subject'])
                  .replace(/\=\?UTF-8\?Q\?(.*?)\?\=/g, '$1');
  body.to = header['to']
  // If multipart
  if (typeof header['content-type'] != 'undefined' &&
             header['content-type'].match(/multipart.*?boundary/)) {
    tmp = extractMultipartContent(contents, header);
    contents = tmp.body;
    header['content-type'] = tmp.contentType;
    attachments = tmp.attachements;
  }
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
      addAttachment(tab.id, attachments);

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
