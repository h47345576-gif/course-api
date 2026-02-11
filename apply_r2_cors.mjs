
import { AwsClient } from 'aws4fetch';

const R2_ACCESS_KEY_ID = "d2464e43b8a29a98322196938b1cb0c2";
const R2_SECRET_ACCESS_KEY = "74ef701e8b7dff9a2b123fbcc478d4cd42cdeeccc16d0b1d0848acbeda4016f3";
const R2_ACCOUNT_ID = "286c7f13bb8e7953094ec6a56911a578";
const R2_BUCKET_NAME = "pr1-assets";

const r2 = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
});

const corsXml = `
<CORSConfiguration>
 <CORSRule>
   <AllowedOrigin>*</AllowedOrigin>
   <AllowedMethod>PUT</AllowedMethod>
   <AllowedMethod>GET</AllowedMethod>
   <AllowedMethod>POST</AllowedMethod>
   <AllowedMethod>HEAD</AllowedMethod>
   <AllowedHeader>*</AllowedHeader>
   <ExposeHeader>ETag</ExposeHeader>
   <MaxAgeSeconds>3000</MaxAgeSeconds>
 </CORSRule>
</CORSConfiguration>
`.trim();


async function getCors() {
    console.log('Fetching current CORS config...');
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/?cors`;
    try {
        const response = await r2.fetch(endpoint, { method: 'GET' });
        if (response.ok) {
            console.log('Current CORS:', await response.text());
        } else {
            console.log('No CORS config found or error:', response.status);
        }
    } catch (e) {
        console.error('Error fetching CORS:', e);
    }
}

async function applyCors() {
    console.log('Applying CORS to bucket:', R2_BUCKET_NAME);
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/?cors`;

    try {
        const response = await r2.fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/xml',
            },
            body: corsXml
        });

        if (response.ok) {
            console.log('✅ CORS configuration applied successfully!');
            await getCors(); // Verify
        } else {
            console.error('❌ Failed to apply CORS:', response.status, response.statusText);
            console.error(await response.text());
        }
    } catch (error) {
        console.error('Error applying CORS:', error);
    }
}

// Run
await getCors();
await applyCors();
