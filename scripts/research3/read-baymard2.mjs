import ZAI from 'z-ai-web-dev-sdk';
const zai = await ZAI.create();
try {
  const r = await zai.functions.invoke('web_reader', { url: 'https://baymard.com/blog/homepage-carousel-usability' });
  console.log(JSON.stringify(r).slice(0, 6000));
} catch (e) {
  console.log('ERR1:', e.message?.slice(0, 120));
  try {
    const r2 = await zai.functions.invoke('extract_web_content', { url: 'https://baymard.com/blog/homepage-carousel-usability' });
    console.log(JSON.stringify(r2).slice(0, 6000));
  } catch (e2) {
    console.log('ERR2:', e2.message?.slice(0, 120));
  }
}
