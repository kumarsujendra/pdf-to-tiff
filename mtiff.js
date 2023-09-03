var pdf2img = require('pdf2img');
const rimraf = require('rimraf');
const axios = require('axios');
const documentModel = require('../models/document');
const {
	exec
} = require("child_process");
const fs = require('fs');

const currentTime = Date.now();
var tempDir = '';
console.log(tempDir,"tempDir");
if(process.env.APP_ENV != 'local') {  
    tempDir = '/tmp/';
} else {
    //tempDir = process.env.TMP_PATH
    tempDir = 'tmp/';
}


// function to generate pdf from html
htmlToPdf = async (req) => {
	try {
		let file_name = req.body.name + "_" + currentTime + '.pdf';
		let source_file_path = tempDir + file_name;
	
		let requestPayload = { "content": req.body.content, 'style': req.body.style, 'margin': req.body.margin };

		var requestConfig = {
			'maxContentLength': Infinity,
			'maxBodyLength': Infinity
		};
		var doc = await axios.post(`${process.env.SERVICE_DOCUMENT}/api/v2/doc/generatePdf`, requestPayload, requestConfig);
		if (doc && doc.data.data) {
			var pdfData = Buffer.from(doc.data.data, 'base64');
			fs.writeFileSync(source_file_path, pdfData);
			if (req.body.type == 'aof')
				await uploadFileFromBuffer(source_file_path, req.body.appId, 'registration_doc', file_name);
	
			return pdfToTiff(req);
		}
		return '';
			
	} catch (err) {
		
		console.log(err, "catch error");
		return '';
		//return helper.getErrorResponse(req, res);
	}
}

pdfToTiff = async (req) => {
	try {
		var input = tempDir + req.body.name + "_" + currentTime + '.pdf';
		console.log(input, "input");
		pdf2img.setOptions({
			type: 'tiff', // png or jpg, default jpg
			size: 1024, // default 1024
			density: 600, // default 600
			outputdir: tempDir, // output folder, default null (if null given, then it will create folder name same as file name)
			outputname: req.body.name + "_" + currentTime, // output file name, dafault null (if null given, then it will create image name same as input name)
			page: null, // convert selected page, default null (if null given, then it will convert all pages)
		});

		await pdf2img.convert(input, function (err, info) {
			if (err) console.log(err)
			else {
				console.log(info);
				//  const imagesPath = info.message.map((i)=>{ return i.path});
				fs.unlinkSync(input);

				return multipageTiff(req);
			}
		});
		return '';
	} catch (err) {

		console.log(err, "catch error");
		return '';
		//return helper.getErrorResponse(req, res);
	}
}

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


uploadFileFromBuffer = async (source_file_path, app_id, docParentKey = '', filename) => {
	try {
		var masterData = await getMasterKeys(docParentKey);
		let streamData = '';

		// Create a readable stream
		let readableStream = fs.createReadStream(source_file_path);

		// Set the encoding to be utf8. 
		readableStream.setEncoding('base64');

		// Handle stream events --> data, end,
		readableStream.on('data', function (chunk) {
			streamData += chunk;
		});

		readableStream.on('end', async function () {
			//	console.log(masterData,"masterData");
			console.log(masterData.data[0].id, "masterData._id");
			console.log(masterData.data[0].parent_key, "masterData.parent_key");
			var requestPayload = {
				'data': streamData,
				'doc_type_id': masterData.data[0].id,
				'filename': filename
			};
			var requestConfig = {
				'maxContentLength': Infinity,
				'maxBodyLength': Infinity
			};
			//	console.log("Buffer", Buffer.from(data, 'base64'));l
			//	var requestPayload = {'data': Buffer.from(data, 'base64'), 'doc_type_id': doc_type_id, 'filename': filename};
			if (masterData.data[0].parent_key)
				requestPayload.doc_type_key = masterData.data[0].parent_key;
			var doc = await axios.post(`${process.env.SERVICE_DOCUMENT}/api/v2/doc/data_upload`, requestPayload, requestConfig);

			let app_res = await getAdminDetails();
			if (app_res.code == 200) {
				//appending extra fields to request body
				let backend_user_id = app_res.data[0]['id'];
				//end of appending extra fields to request body
				if (doc && doc.data.data) {
					console.log(doc.data.data, 'doc::');
					let reultData = await documentModel.create({
						app_id: app_id,
						doc_type_id: masterData.data[0].id,
						doc_id: doc.data.data.doc_id,
						backend_user_id: backend_user_id,
						parent_key: masterData.data[0].parent_key
					});
					console.log(reultData, "reultData");
					return doc.data.data;
				}
			} else {
				return '';
				console.log('Admin not found !');
			}
		});
		return '';
	} catch (error) {
		//console.log(error.response.data,'catch error::');
		console.log('catch error::', error);
		return '';
	}
}


getMasterKeys = async (file) => {
	try {
		let app_res = await axios.get(`${process.env.SERVICE_MASTER}/v1/document_type?key=${file}`);
		//	console.log(app_res.data);
		return app_res.data;
	} catch (error) {
		//	console.log("getMasterKeys::", error);
		return error.response.data;
	}
}

getAdminDetails = async () => {
	try {
		let app_res = await axios.get(process.env.SERVICE_USER + '/api/backend/v1/users?role_slug=admin');
		return app_res.data;
	} catch (error) {
		//	console.log("getAdminDetails::", error);
		return error.response.data;
	}
}

/**
 * Generate Tiff from HTML
 */
exports.generateTiff = async (req, res, next) => {
	try {
		rimraf(tempDir + '/*', function () {
			console.log('done');
		});

		await htmlToPdf(req);
		res.json({
			data: "Done"
		});
		//	return helper.createSuccessResponse(req, res, httpStatus.OK, result);
	} catch (error) {
		console.log(error, "error");
		//next(error);
	}

}