const sharp = require('sharp');

async function run() {
  const input = 'src/assets/logo.png';
  
  // First, we trim the transparent borders to get the precise content box
  const { data, info } = await sharp(input)
    .trim()
    .toBuffer({ resolveWithObject: true });
    
  // Since the logo is horizontal and the symbol is on the left,
  // we extract a square starting from the left using the height of the content.
  const symbolSize = info.height;
  
  await sharp(data)
    .extract({ left: 0, top: 0, width: symbolSize + 5, height: symbolSize }) // adding a tiny buffer just in case
    .resize(192, 192, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .toFile('src/assets/favicon.png');
    
  console.log('Favicon generado con exito usando sharp!');
}

run().catch(console.error);
