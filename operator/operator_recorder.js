
'use strict';

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
// BEGIN
// initial recording code from mediarecorder open source code licensed with Apache 2.0
// https://github.com/samdutton/simpl/tree/gh-pages/mediarecorder

var mediaRecorder;
var recordStream;
var recordedBlobs;
var recordCommandLog;
var recordSensorLog;
var recordFileName;

var mimeType = 'video/webm; codecs=vp9';
//var mimeType = 'video/webm; codecs=vp8';
//var mimeType = 'video/webm; codecs=h264'; //results in sped up video
//var mimeType = 'video/webm';

var recordButton = document.querySelector('button#record');
var downloadButton = document.querySelector('button#download');


recordButton.onclick = toggleRecording;
downloadButton.onclick = download;

///////////////////
// If the audio track from the robot is unavailable, the typical
// approach fails, resulting in a video that shows just a couple of
// frames. If the audio track is unavailable, this hack works,
// successfully recording video without sound. For now, I'm going to
// be optimistic and keep it off to simplify things. In the future
// dynamically enabling this in the event of audio problems might be
// worthwhile.
//

var use_canvas_drawing_hack = false;

// attempt to fix things by rendering and capturing a new video stream
// waste of comptuation and nasty hack, but maybe it will help? (This worked!)
// This only records the visuals not the audio

var saveTextElement = document.createElement('a');
var recordOn = false;
var rDim;
var recordFps;
var recordCanvas;
var recordContext;

if (use_canvas_drawing_hack) {
    //    rDim = {w: 1920, h:1080}
    rDim = {w: videoDimensions.w, h: videoDimensions.h}
    recordFps = 30;
    recordCanvas = document.createElement('canvas');
    recordCanvas.width = rDim.w;
    recordCanvas.height = rDim.h;
    recordContext = recordCanvas.getContext('2d');
    recordContext.fillStyle="black";
    recordContext.fillRect(0, 0, rDim.w, rDim.h);
    recordStream = recordCanvas.captureStream(recordFps);
}
    
function drawVideoToRecord() {
    recordContext.drawImage(panTiltCameraVideo,
			    0, 0, rDim.w, rDim.h,
			    0, 0, rDim.w, rDim.h);
    if (recordOn) {
	requestAnimationFrame(drawVideoToRecord);
    }
}
///////////////////

function addToCommandLog( entry ) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
    var timestamp = Date.now();
    recordCommandLog.push( { timestamp: timestamp, entry: entry } );
}

function addToSensorLog( entry ) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
    var timestamp = Date.now();
    recordSensorLog.push( { timestamp: timestamp, entry: entry } );
}

function addToLogs(logs, entry) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
    var timestamp = Date.now();
    for (const l of logs) {
	l.push( { timestamp: timestamp, entry: entry } );
    }
}

function addDatesToLogs(logs) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
    var d = new Date();
    var timestamp = d.getTime();
    var humanReadableTime = d.toString();
    var jsonTime = d.toJSON();
    for (const l of logs) {
	l.push( { timestamp: timestamp, entry: humanReadableTime } );
	l.push( { timestamp: timestamp, entry: jsonTime } );
    }
}



// saveText from
// https://reformatcode.com/code/angularjs/write-an-object-to-an-json-file-using-angular
function saveText(text, filename){
    saveTextElement.setAttribute('href', 'data:text/plain;charset=utf-u,'+encodeURIComponent(text));
    saveTextElement.setAttribute('download', filename);
    saveTextElement.click()
}

function saveLogs() {
    console.log('Attempting to save JSON files of the recorded logs.');
    console.log('recordCommandLog = ');
    console.log(recordCommandLog);
    console.log('recordSensorLog = ');
    console.log(recordSensorLog);
    
    saveText( JSON.stringify(recordCommandLog),
	      recordFileName + '_command_log' + '.json');

    saveText( JSON.stringify(recordSensorLog),
	      recordFileName + '_sensor_log' + '.json');
}

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function handleStop(event) {
    console.log('Recorder stopped: ', event);
}

function toggleRecording() {
    if (recordButton.textContent === 'Start Recording') {
        startRecording();
    } else {
        stopRecording();
        recordButton.textContent = 'Start Recording';
        downloadButton.disabled = false;
    }
}

function checkMimeTypes() {
    ///////////////
    // initial code from
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported
    var types = ['video/webm', 
		 'audio/webm',
		 'video/webm; codecs=vp9',
		 'video/webm; codecs=vp8',
		 'video/mp4',
		 'video/webm; codecs=daala', 
		 'video/webm; codecs=h264', 
		 'audio/webm; codecs=opus', 
		 'video/mpeg'];

    console.log('***********************************************');
    console.log('Checking available MIME types for MediaRecorder');
    for (var i in types) { 
	console.log( 'Is ' + types[i] + ' supported? ' + (MediaRecorder.isTypeSupported(types[i]) ? 'Maybe' : 'No')); 
    }
    console.log('***********************************************');
    
    ///////////////
}

function startRecording() {
    if(remoteStream) {
	
	recordOn = true;

	if(use_canvas_drawing_hack) {
	    // use hack of drawing video in a new canvas and capturing it
	    drawVideoToRecord();
	    // attempt to record audio, too... (this worked!)
	    var recordAudio = remoteStream.getAudioTracks()[0];
	    if (recordAudio) {
		recordStream.addTrack(recordAudio);
	    }
	} else {
	    // keep it simple
	    // maybe this will work someday?
     	    recordStream = remoteStream;
	    //
	}

	checkMimeTypes();

	var options = {
	    mimeType : mimeType
	}
	
	// see if making a copy of the remote stream helps (didn't work)
	// see if making a copy and deleting the audio tracks helps (didn't work)0
	// recordStream = new MediaStream(remoteStream);
	// for (let a of recordStream.getAudioTracks()) {
        //     recordStream.removeTrack(a);
	// }
	// same type of attempt with different details (didn't work)
	//recordStream = new MediaStream(remoteStream.getVideoTracks());
	
	// see if getting the stream from the html video display helps (didn't work)
	// recordStream = remoteVideo.srcObject;

	// try capturing a new stream from the html display (didn't work)
	// recordStream = remoteVideo.captureStream();

	
	// var options = {
        //     audioBitsPerSecond : 128000,
        //     videoBitsPerSecond : 2500000,
        //     mimeType : 'video/mp4'
	// }
		
	// var options = {
        //     audioBitsPerSecond : 128000,
        //     videoBitsPerSecond : 2500000,
	//     ignoreMutedMedia: true,
	//     mimeType : mimeType
	// }

	//for (let a of displayStream.getAudioTracks()) {
        //    displayStream.removeTrack(a);
        //}

	
	// var options = {
	//     bitsPerSecond: 100000,
	//     mimeType : mimeType
	// }
		
        //var options = {mimeType: 'video/webm', bitsPerSecond: bitsPerSecond};

	recordCommandLog = [];
	recordSensorLog = [];
        recordedBlobs = [];
        try {
            mediaRecorder = new MediaRecorder(recordStream, options);
	    
        } catch (e0) {
            console.log('Unable to create MediaRecorder with options Object: ', e0);
        }
	
        console.log('Created MediaRecorder', mediaRecorder);
	console.log('with options', options);
        recordButton.textContent = 'Stop Recording';
        downloadButton.disabled = true;
        mediaRecorder.onstop = handleStop;
        mediaRecorder.ondataavailable = handleDataAvailable;
        //mediaRecorder.start(10); // collect as 10ms chunks of data
	var d = new Date();
	recordFileName = 'operator_recording_' + d.toISOString();
	addDatesToLogs([recordCommandLog, recordSensorLog]);
	if (requestedRobot) {
	    addToLogs([recordCommandLog, recordSensorLog],
		      {requestedRobot: requestedRobot});
	}
	addToLogs([recordCommandLog, recordSensorLog],
		  'Just before the start of recording');
	mediaRecorder.start(1000); // collect as 1s chunks of data
	addToLogs([recordCommandLog, recordSensorLog],
		  'Just after the start of recording');
	//mediaRecorder.start(); // collect as one big blob
        console.log('MediaRecorder started', mediaRecorder);
    } else {
        console.log('remoteStream is not yet defined, so recording can not begin.');
    }
}

function stopRecording() {
    addToLogs([recordCommandLog, recordSensorLog],
	      'Just before the end of recording.');
    mediaRecorder.stop();
    addToLogs([recordCommandLog, recordSensorLog],
	      'Just after the end of recording');
    addDatesToLogs([recordCommandLog, recordSensorLog]);
    recordOn = false;
    console.log('Recorded Blobs: ', recordedBlobs);
}

function download() {

    saveLogs();
    
    if (recordedBlobs.length > 1) {
	console.log('More than one blob was captured, so combining them into a single blob prior to saving a file.');
	var blob = new Blob(recordedBlobs, {type: mimeType});
    } else {
	console.log('Only a single blob was captured, so using it directly.');
	var blob = recordedBlobs[0];
    }

    console.log('Blob.size = ' + blob.size);
    console.log('Blob.type = ' + blob.type);
    
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    //a.download = 'test.webm';
    a.download = recordFileName + '.webm';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
	//saveLog(); // attempt to save the JSON log after the video saving has been cleaned up
    }, 100);
}

// initial recording code from mediarecorder open source code
// END
////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////

