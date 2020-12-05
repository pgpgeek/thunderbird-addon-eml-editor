const EMLHeaderFileTemplate = 
`X-Unsent: 1
To: %to%
Cc: %cc%
Subject: %subject%
Content-Type: multipart/mixed; boundary=--boundary_text_string
MIME-Version: 1.0

----boundary_text_string
Content-Type: text/html; charset=UTF-8

%body%

%attachments%

----boundary_text_string--
`;

const EMLAttachements = 
`
----boundary_text_string
Content-Type: application/octet-stream;;
Content-Disposition: attachment;
        filename="%filename%"
Content-Transfer-Encoding: base64

%binary_data%

`;

function formatEmail(contents, attachements)
{
  let to      = contents.to .length >= 1  ? contents.to.join(', ')  : '',
      cc      = contents.cc .length >= 1  ? contents.cc.join(', ')  : '',
      subject = contents.to .length >= 1  ? contents.subject : '',
      fileContents = EMLHeaderFileTemplate;
  attachements = attachements ? attachements : "";
  fileContents  = fileContents.replace(/%to%/,      to);
  fileContents  = fileContents.replace(/%cc%/,      cc);
  fileContents  = fileContents.replace(/%subject%/, subject);
  fileContents  = fileContents.replace(/%body%/,    contents.body);

  fileContents  = fileContents.replace(/%attachments%/,    attachements);
  return fileContents;
}


async function getFileAttachementsDatas(file)
{
  let nfile = await file.getFile();
  return await (function(nfile) {
    return new Promise((res2) => {
      reader  = new FileReader();
      reader.addEventListener("load", function () {
        let result = this.result,
            fileType = result ? result.match(/data:(.*?);base64/) : null;
        res2({
            file: nfile,
            type : fileType ? fileType[1] : "text/html",
            contents: !result || result.indexOf(',') == -1 ? "error": result.split(',')[1]
          });
      }, false);
      reader.readAsDataURL(nfile);
    });
  })(nfile);
}


function formatAttachements(mailerCommon)
{
  return new Promise(async (res, err) => {
    files = await mailerCommon.getAttachments();
    files_list = files.map( file => getFileAttachementsDatas(file));
    files = await Promise.all(files_list);
    console.log(files);
    res(files.map(file => {
      let filename     = file.file.name,
          filetype     = file.type,
          binary_data  = file.contents,
          fileContents = EMLAttachements;

      fileContents  = fileContents.replace(/%filename%/,     filename);
      fileContents  = fileContents.replace(/%filetype%/,     filetype);
      fileContents  = fileContents.replace(/%binary_data%/,  binary_data);
      return fileContents;
    }).join("\n"));
  });
}



mailerCommon = new ComposeManager();
mailerCommon.getTextCompose().then(async (email) => {
  let message = null,
      attachements = null;
  attachements = await formatAttachements(mailerCommon);
  message = message = formatEmail(email, attachements);
  mailerCommon.saveEMLFile(message);

});