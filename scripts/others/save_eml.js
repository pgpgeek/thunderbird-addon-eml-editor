const EMLHeaderFile = 
`X-Unsent: 1
To: %to%
Cc: %cc%
Subject: %subject%
Content-Type: text/html; charset=UTF-8
MIME-Version: 1.0

%body%`;

function formatEmail(contents)
{
  let to      = contents.to .length >= 1  ? contents.to.join(', ')  : '',
      cc      = contents.cc .length >= 1  ? contents.cc.join(', ')  : '',
      subject = contents.to .length >= 1  ? contents.subject : '',
      fileContents = EMLHeaderFile;
  fileContents  = fileContents.replace(/%to%/,      to);
  fileContents  = fileContents.replace(/%cc%/,      cc);
  fileContents  = fileContents.replace(/%subject%/, subject);
  fileContents  = fileContents.replace(/%body%/,    contents.body);
  return fileContents;
}

// https://stackoverflow.com/questions/54120017/is-there-a-way-to-add-attachments-to-an-eml-file-created-in-javascript-or-other

x = new ComposeManager();

// New Feature - Attachments
x.getAttachments().then(files => files.map( file =>
  file.getFile().then( ((fileData, nfile) => {
    var reader  = new FileReader();
    reader.addEventListener("load", function () {
      console.log(fileData, reader.result);
    }, false);
    reader.readAsBinaryString(nfile);
  }).bind(null, file))
));


x.getTextCompose().then(email => x.saveEMLFile(formatEmail(email)))