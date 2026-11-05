import sharp from 'sharp';
export async function processPartImage(input:Buffer):Promise<Buffer>{
 const image=sharp(input,{limitInputPixels:20000000,animated:false});
 const metadata=await image.metadata();
 if(!['jpeg','png','webp'].includes(metadata.format||'')||(metadata.pages||1)>1)throw Error('INVALID_IMAGE');
 return image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
}
