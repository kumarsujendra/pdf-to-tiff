var pdftoimage = require('pdftoimage');
var file = 'sample.pdf';
 
// Returns a Promise
pdftoimage(file, {
  format: 'tiff',  // png, jpeg, tiff or svg, defaults to png
  prefix: 'img',  // prefix for each image except svg, defaults to input filename
  outdir: 'out'   // path to output directory, defaults to current directory
})
.then(function(){
  console.log('Conversion done');
})
.catch(function(err){
  console.log(err);
});