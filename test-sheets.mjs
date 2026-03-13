import { sheets_v4 } from '@googleapis/sheets';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';

const envContent = readFileSync('/Users/tokumasatoshi/Documents/Cursor/cs-dashboard/.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.*)"$/s);
  if (match) envVars[match[1]] = match[2];
});

const email = envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = envVars.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const spreadsheetId = envVars.GOOGLE_SPREADSHEET_ID;

console.log('Email:', JSON.stringify(email));
console.log('SpreadsheetID:', JSON.stringify(spreadsheetId));
console.log('Key starts with:', rawKey?.substring(0, 40));
console.log('Key length:', rawKey?.length);
console.log('Email has trailing \\n:', email?.endsWith('\\n'));
console.log('SpreadsheetID has trailing \\n:', spreadsheetId?.endsWith('\\n'));

const cleanEmail = email?.replace(/\\n$/, '');
const cleanSpreadsheetId = spreadsheetId?.replace(/\\n$/, '');
const key = rawKey?.replace(/\\n/g, '\n');

console.log('\nCleaned Email:', JSON.stringify(cleanEmail));
console.log('Cleaned SpreadsheetID:', JSON.stringify(cleanSpreadsheetId));

try {
  const auth = new GoogleAuth({
    credentials: {
      client_email: cleanEmail,
      private_key: key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheetsClient = new sheets_v4.Sheets({ auth });

  const response = await sheetsClient.spreadsheets.values.batchGet({
    spreadsheetId: cleanSpreadsheetId,
    ranges: ['_META!A:B'],
  });

  console.log('\nSUCCESS! Meta data:', JSON.stringify(response.data.valueRanges?.[0]?.values));
} catch (error) {
  console.error('\nERROR:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data));
  }
}
