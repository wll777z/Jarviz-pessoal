export function validateImage(value) {
  if(typeof value!=='string' || value.length>2000000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value))throw new Error('Use JPEG de tamanho limitado, gerado pela prévia de imagem.');
  const bytes=Buffer.from(value.split(',')[1],'base64');
  if(bytes[0]!==255 || bytes[1]!==216)throw new Error('JPEG inválido.');
  let offset=2;
  while(offset+4<bytes.length){
    if(bytes[offset]!==255){offset++;continue;}
    const marker=bytes[offset+1];offset+=2;if(marker===0xDA||marker===0xD9)break;
    const length=bytes.readUInt16BE(offset);if(length<2 || offset+length>bytes.length)break;
    if([0xC0,0xC1,0xC2].includes(marker)){
      if(length<8)break;const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);
      if(!width||!height||width>1600||height>1600)throw new Error('A captura deve ter no máximo 1600 pixels por dimensão.');
      return {width,height};
    }offset+=length;
  }
  throw new Error('JPEG sem dimensões suportadas.');
}
