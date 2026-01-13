import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main(){
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
    ? path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
    : path.resolve(new URL('..', import.meta.url).pathname, 'keys/drive-sa-key.json');

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

  if(!fs.existsSync(keyPath)){
    console.error('Service account key file not found at', keyPath);
    console.error('Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE in server/.env to the relative path of the JSON key file.');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://drive.google.com/drive/folders/1lMnNIS1DJxWdZO-QqxyR2Xk0coIOiI0n?usp=drive_link']
  });

  const drive = google.drive({ version: 'v3', auth });

  // test file — make sure there is an uploads/test-upload.jpg
  const localFile = path.resolve(process.cwd(), 'uploads', 'test-upload.jpg');
  if(!fs.existsSync(localFile)){
    console.error('Put a small test image at', localFile, 'then run this script again.');
    console.error('You can create uploads/ and copy a file named test-upload.jpg there.');
    process.exit(1);
  }

  try{
    const res = await drive.files.create({
      requestBody: {
        name: 'test-upload-' + Date.now() + path.extname(localFile),
        parents: folderId ? [folderId] : undefined
      },
      media: {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(localFile)
      }
    });

    const fileId = res.data.id;
    // optional: make public
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });

    const info = await drive.files.get({ fileId, fields: 'id,webViewLink,webContentLink' });
    console.log('Upload successful:', info.data);
  }catch(err){
    console.error('Upload failed:', err.message || err);
    process.exit(1);
  }
}

main();
