const fs = require('fs');
const sharp = require('sharp');

async function run() {
  const input = 'src/assets/logo.png';
  const metadata = await sharp(input).metadata();
  
  // Extract just the alpha channel from the original image
  const alphaChannel = await sharp(input).extractChannel(3).toBuffer();

  await sharp({
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 3,
      background: '#0F5E59' // Nuevo verde oscuro
    }
  })
  .joinChannel(alphaChannel) // Adjuntar la transparencia original
  .png()
  .toFile('src/assets/logo_colored.png');
  console.log('Imagen tintada con exito');
}

run().catch(console.error);
