var fs      = require('fs');
var path    = require('path');
var pdf2img = require('pdf2img');
const {exec} = require("child_process");

var source_file   = 'sample.pdf';

var tempDir = '';
if(process.env.APP_ENV != 'local') {  
    tempDir = '/tmp/';
} else {
    tempDir = 'tmp/';
}

tempDir = 'tmp';
 
console.log(tempDir);
 
pdf2img.setOptions({
  type: 'tiff',                                // png or jpg, default jpg
  size: 1024,                                 // default 1024
  density: 600,                               // default 600
  outputdir: tempDir, // output folder, default null (if null given, then it will create folder name same as file name)
  outputname: 'sample',                         // output file name, dafault null (if null given, then it will create image name same as input name)
  page: null                                  // convert selected page, default null (if null given, then it will convert all pages)
});
 
pdf2img.convert(source_file, function(err, info) {
  if (err){ 
	console.log(err)
  } else { 
	console.log(info);
	//fs.unlinkSync(file_name);	
	
	let source_file_path = tempDir + '/sample.tiff';
	let target_file_name = tempDir;		
	exec(`convert ${target_file_name}/* ${source_file_path}`, (error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);			

	});
	
	
  }
  
});

/*
multipageTiff = async (req) => {
	try {
		let file_name = req.body.name + "_" + currentTime + '.tiff';
		let source_file_path = tempDir + file_name;
		let target_file_name = tempDir;

		exec(`convert ${target_file_name}/* ${source_file_path}`, (error, stdout, stderr) => {
			if (error) {
				console.log(`error: ${error.message}`);
				return;
			}
			if (stderr) {
				console.log(`stderr: ${stderr}`);
				return;
			}
			console.log(`stdout: ${stdout}`);
			return uploadFileFromBuffer(source_file_path, req.body.appId, 'mtif', file_name);

		});
		return '';
	} catch (err) {

		return '';
		console.log(err, "catch error");
	}
}
*/

