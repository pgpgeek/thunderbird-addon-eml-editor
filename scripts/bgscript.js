// Copied from jsmime.js.
function stringToTypedArray(buffer) {
  var typedarray = new Uint8Array(buffer.length);
  for (var i = 0; i < buffer.length; i++) {
    typedarray[i] = buffer.charCodeAt(i);
  }
  return typedarray;
}

function rawUTF8toJS (s) {
  return new TextDecoder("utf-8").decode(stringToTypedArray(s));
}

function quoted_printable_decode(str) { // eslint-disable-line camelcase
  if (!str) return str;
  //       discuss at: https://locutus.io/php/quoted_printable_decode/
  //      original by: Ole Vrijenhoek
  //      bugfixed by: Brett Zamir (https://brett-zamir.me)
  //      bugfixed by: Theriault (https://github.com/Theriault)
  // reimplemented by: Theriault (https://github.com/Theriault)
  //      improved by: Brett Zamir (https://brett-zamir.me)
  //        example 1: quoted_printable_decode('a=3Db=3Dc')
  //        returns 1: 'a=b=c'
  //        example 2: quoted_printable_decode('abc  =20\r\n123  =20\r\n')
  //        returns 2: 'abc   \r\n123   \r\n'
  //        example 3: quoted_printable_decode('012345678901234567890123456789012345678901234567890123456789012345678901234=\r\n56789')
  //        returns 3: '01234567890123456789012345678901234567890123456789012345678901234567890123456789'
  //        example 4: quoted_printable_decode("Lorem ipsum dolor sit amet=23, consectetur adipisicing elit")
  //        returns 4: 'Lorem ipsum dolor sit amet#, consectetur adipisicing elit'
  // Decodes all equal signs followed by two hex digits
  const RFC2045Decode1 = /=\r?\n/gm;
  // the RFC states against decoding lower case encodings, but following apparent PHP behavior
  const RFC2045Decode2IN = /=([0-9A-F]{2})/gim;
  // RFC2045Decode2IN = /=([0-9A-F]{2})/gm,
  const RFC2045Decode2OUT = function (sMatch, sHex) {
    return String.fromCharCode(parseInt(sHex, 16))
  };
  return str.replace(RFC2045Decode1, '')
    .replace(RFC2045Decode2IN, RFC2045Decode2OUT);
}

/*
*
* Extract EML Header part
* Return Object Header
*
*/
function extractHeader(eml) {
  eml = eml.split(/\r?\n\r?\n/)[0];
  eml = eml.replace(/\r?\n[ \t]/g, " ");  // Fix multiline headers.
  reg = /([A-Z]{1}[A-Za-z\-\_]*):(.*)/g;
  obj = {}
  while ((array = reg.exec(eml)) !== null) {
    obj[array[1].trim().toLowerCase()] = array[2].trim();
  }
  // Detect filename.
  filename = eml.match(/filename=(.*)/i);
  if (filename) {
    // Cater for filename in UTF-8.
    // RFC 2231 encoding currently not even detected :-(
    obj.filename = rawUTF8toJS(filename[1].replace(/"|'/g, ""));
  }
  // What was the following code meant to do?
  // Object.keys(obj).map(el => {
  //   obj[el] = obj[el].match(/\^%[a-z]*\%$/) ? "" : obj[el];
  // });
  return obj;
};

/*
*
* Add Attachments on email
*
*/
function addAttachment(tabId, attachments) {
  attachments.map(attachment => {
    let file, bstr, n, u8arr, tryB64 = true;

    bstr = attachment.body.replace(/( |\n|\t|\r)/g, "");

    // The following code will add missing = at the end of a
    // base64 encoded string. That shouldn't be necessary
    // but it also doesn't hurt.
    for (i = 0; i <= 2 && tryB64; i++) {
      try {
        bstr = atob(bstr); 
        n = bstr.length;
        u8arr = new Uint8Array(n);
        while(n--){
          u8arr[n] = bstr.charCodeAt(n);
        }
        tryB64 = false;
      } catch (err) {
        bstr += '=';
        u8arr = bstr;
      }
    }
    file = new File([u8arr], attachment.header.filename, {
      type: attachment.header['content-type'],
    });
    browser.compose.addAttachment(tabId, {file:file});
  });
}

/*
*
* Extract all parts from email (main contents, attachments, ....)
*
*/
function extractMultipartContent(contents, header) {
  let body, contentType;
  let boundary = header['content-type'].match(/boundary=(.*)/);
  let attachments = [];
  let bodyParts;
  if (boundary) {
    // Note that boundaries can be quoted, typically that's what
    // Thunderbird generates.
    bodyParts = contents.split("--" + boundary[1].replace(/"/g, ""));
  } else {
    bodyParts = [contents];
  }

  bodyParts.map(tmpContents => {
    let tmp = tmpContents.split(/\r?\n\r?\n/);
    let tmpHeader = extractHeader(tmp[0]);
    if (!tmpHeader['content-type']) return null;
    tmp.shift();
    tmpBody = tmp.join("\n\n");
    if (tmpHeader['content-disposition'] && 
        tmpHeader['content-disposition'].indexOf('attachment') != -1) {
      return attachments.push({header: tmpHeader, body: tmpBody});
    }

    // It wasn't an attachment, so record this as body with its content type.
    contentType = tmpHeader['content-type'];
    body = tmpBody;
  });

  return { attachments, body, contentType };
}

/*
*
* Make new Email from eml file
*
*/
function showFileContent(contents) {
  let attachments = [];
  let body = {};
  let header = extractHeader(contents);
  contents = contents.split(/\r?\n\r?\n/);
  contents.shift();
  contents = contents.join("\n\n");
  // Headers can be raw UTF-8, so decode.
  // Thunderbird will take care of RFC2047 tokens, so just leave them.
  if (header['subject']) body.subject = rawUTF8toJS(header['subject']);
  if (header['to']) body.to = rawUTF8toJS(header['to']);
  if (header['cc']) body.cc = rawUTF8toJS(header['cc']);
  if (header['bcc']) body.bcc = rawUTF8toJS(header['bcc']);

  // For multipart/* with a boundary, extract the attachments.
  // multipart/alternative or multipart/related aren't treated yet.
  if (header['content-type'] &&
      header['content-type'].match(/multipart.*?boundary/)) {
    let multipart = extractMultipartContent(contents, header);
    contents = multipart.body;
    header['content-type'] = multipart.contentType;
    attachments = multipart.attachments;
  }

  let charset = null;
  if (header['content-type']) {
    charset = header['content-type'].match(/charset=([a-z0-9\-\_]*)/i);
    if (charset) charset = charset[1];
  }

  if (header['content-transfer-encoding'] &&
      header['content-transfer-encoding'].match(/base64/)) {
    contents = atob(contents.replace(/\r?\n\r?\n/g, ""));
  }
  if (header['content-transfer-encoding'] &&
      header['content-transfer-encoding'].match(/quoted-printable/)) {
    contents = quoted_printable_decode(contents);
  }

  if (charset) {
    let bytes = stringToTypedArray(contents);
    contents = new TextDecoder(charset).decode(bytes);
  }

  // XXX TODO: Treat format=flowed.

  if (header['content-type'] &&
      header['content-type'].match(/html/)) {
    body.body = contents;
    body.isPlainText = false;
  } else {
    body.plainTextBody = contents;
    body.isPlainText = true;
  }

  // We should be able to go: browser.compose.beginNew(null, body)
  // But that inserts too many empty lines :-(
  browser.compose.beginNew(null, { isPlainText: body.isPlainText }).then(tab => {
    browser.compose.setComposeDetails(tab.id, body);
    addAttachment(tab.id, attachments);
 });
}

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
    let input = document.createElement('input'), header;
    input.type = 'file';
    input.accept = '.eml';
    input.onchange = e => {
      let file    = e.target.files[0],
          reader  = new FileReader();
      if (!file) return;
      reader.onload = function(e) {
        showFileContent(e.target.result);
      }
      reader.readAsBinaryString(file);
    }
    input.click();
    return;
  }
});
