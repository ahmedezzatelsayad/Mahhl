import ZAI from 'z-ai-web-dev-sdk';
try {
  const zai = await ZAI.create();
  const r = await zai.functions.invoke('reader', { url: 'https://baymard.com/blog/homepage-carousel-usability' });
  console.log(JSON.stringify(r).slice(0, 5000));
} catch (e) {
  console.log('READER-ERR:', e.message?.slice(0, 200));
}
