/*
 *
 *  derived from initial code from the following website with the copyright notice below
 *  https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
 *
 *  "
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 *  "
 * 
 *  The full license for the original code from which the following code is derived can 
 *  be found in the file named WebRTC_Project_LICENSE.md in the same directory as this file.
 *
 */


'use strict';

let localStream = null;
var videoElement = document.querySelector('video');
var audioInputSelect = document.querySelector('select#audioSource');
var audioOutputSelect = document.querySelector('select#audioOutput');
var audioMuteSwitch = document.getElementById('myonoffswitch');
var selectors = [audioInputSelect, audioOutputSelect];

function updateAudioToMatchMuteSwitch() {
    if(localStream) {
        var audio_track = localStream.getAudioTracks()[0];
        if(audioMuteSwitch.checked) {
            // unmute the microphone's audio track
            console.log('unmute microphone');
            audio_track.enabled = true;
        } else {
            // mute the microphone's audio track
            console.log('mute microphone');
            audio_track.enabled = false;
        }
    }    
}

audioMuteSwitch.onchange = updateAudioToMatchMuteSwitch

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
        return select.value;
    });
    selectors.forEach(function(select) {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label ||
                'microphone ' + (audioInputSelect.length + 1);
            audioInputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'audiooutput') {
            option.text = deviceInfo.label || 'speaker ' +
                (audioOutputSelect.length + 1);
            audioOutputSelect.appendChild(option);
        } else {
            // unused device, since the operator console only uses audio input at this time.
            //console.log('The operator console only uses audio input at this time.');
        }
    }
    selectors.forEach(function(select, selectorIndex) {
        if (Array.prototype.slice.call(select.childNodes).some(function(n) {
            return n.value === values[selectorIndex];
        })) {
            select.value = values[selectorIndex];
        }
    });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(sinkId)
            .then(function() {
                console.log('Success, audio output device attached: ' + sinkId);
            })
            .catch(function(error) {
                var errorMessage = error;
                if (error.name === 'SecurityError') {
                    errorMessage = 'You need to use HTTPS for selecting audio output ' +
                        'device: ' + error;
                }
                console.error(errorMessage);
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

function changeAudioDestination() {
    var audioDestination = audioOutputSelect.value;
    attachSinkId(videoElement, audioDestination);
}

function start() {
    var audioSource = audioInputSelect.value;
    var constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        video: false
    };
    navigator.mediaDevices.getUserMedia(constraints).
        then((stream) =>{
            localStream = stream;
            updateAudioToMatchMuteSwitch();
            // Refresh button list in case labels have become available
            return navigator.mediaDevices.enumerateDevices();
    }).then(gotDevices).catch(handleError);
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;

function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    console.trace();
}
