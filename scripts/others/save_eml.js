const EMLHeaderFileTemplate =
`Content-Type: multipart/mixed; boundary=--boundary_text_string
X-Unsent: 1
MIME-Version: 1.0

----boundary_text_string
Content-Type: %content_type%; charset=UTF-8

%body%

%attachments%

----boundary_text_string--
`;

const EMLAttachments =
`
----boundary_text_string
Content-Type: %filetype%;
Content-Disposition: attachment;
        filename="%filename%"
Content-Transfer-Encoding: base64

%binary_data%

`;

function formatEmail(contents, attachments) {
  let to      = contents.to.length >= 1 ? contents.to.join(", ")  : "";
  let cc      = contents.cc.length >= 1 ? contents.cc.join(", ")  : "";
  let subject = contents.subject.length >= 1 ? contents.subject : "";
  let fileContents = EMLHeaderFileTemplate;
  if (contents.to.length >= 1) fileContents = `To: ${contents.to}\n` + fileContents;
  if (contents.cc.length >= 1) fileContents = `Cc: ${contents.cc}\n` + fileContents;
  if (contents.bcc.length >= 1) fileContents = `Bcc: ${contents.bcc}\n` + fileContents;
  if (contents.subject) fileContents = `Subject: ${contents.subject}\n` + fileContents;
  if (contents.from) fileContents = `From: ${contents.from}\n` + fileContents;
  if (contents.priority) fileContents = `X-Priority: ${contents.priority}\n` + fileContents;
  if (contents.isPlainText) {
    fileContents = fileContents.replace("%content_type%", "text/plain");
    fileContents = fileContents.replace("%body%", contents.plainTextBody);
  } else {
    fileContents = fileContents.replace("%content_type%", "text/html");
    fileContents = fileContents.replace("%body%", contents.body);
  }
  attachments = attachments ? attachments : "";
  fileContents  = fileContents.replace("%attachments%", attachments);
  return fileContents;
}


async function getFileAttachmentData(file) {
  let nfile = await file.getFile();
  return new Promise(function(resolve) {
    let reader = new FileReader();
    reader.addEventListener("load", function () {
      let result = reader.result;
      let fileType = result ? result.match(/data:(.*?);base64/) : null;
      resolve({
          filename: file.name,
          type:     fileType ? fileType[1] : "application/octet-stream",
          contents: !result || result.indexOf(",") == -1 ? "error": result.split(",")[1]
        });
    });
    reader.readAsDataURL(nfile);
  });
}

function chunkSubstr(str, size) {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks.join("\n");
}

async function formatAttachments(attachments) {
  files_list = attachments.map(file => getFileAttachmentData(file));
  files = await Promise.all(files_list);
  return files.map(file => {
    let filename     = file.filename,
        filetype     = file.type,
        binary_data  = chunkSubstr(file.contents, 72),
        fileContents = EMLAttachments;

    fileContents = fileContents.replace("%filename%",    filename);
    fileContents = fileContents.replace("%filetype%",    filetype);
    fileContents = fileContents.replace("%binary_data%", binary_data);
    return fileContents;
  }).join("\n");
}

async function save() {
  let cm = new ComposeManager();

  let email = await cm.getTextCompose();
  email.from = await browser.EmlEditor.getFrom();
  email.priority = await browser.EmlEditor.getPrio();

  let attachments = await cm.getAttachments();
  let attachmentData = await formatAttachments(attachments);
  let message = formatEmail(email, attachmentData);

  cm.saveEMLFile(message);
}

// This is called from the pop-up menu behind the button.
save();
