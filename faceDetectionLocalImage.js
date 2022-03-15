// Copyright 2016 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START vision_face_detection_tutorial_imports]
// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GCLOUD_PROJECT environment variable. See
// https://googlecloudplatform.github.io/gcloud-node/#/docs/google-cloud/latest/guides/authentication
const vision = require('@google-cloud/vision');
// [END vision_face_detection_tutorial_imports]
// [START vision_face_detection_tutorial_client]
// Creates a client
const client = new vision.ImageAnnotatorClient();

const fs = require('fs');
// [END vision_face_detection_tutorial_client]

/**
 * Uses the Vision API to detect faces in the given file.
 */
// [START vision_face_detection_tutorial_send_request]
async function detectFaces(inputFile) {
  // Make a call to the Vision API to detect the faces
  const request = {image: {source: {filename: inputFile}}};
  const results = await client.faceDetection(request);
  const faces = results[0].faceAnnotations;
  const numFaces = faces.length;
  console.log(`Found ${numFaces} face${numFaces === 1 ? '' : 's'}.`);
  return faces;
}
// [END vision_face_detection_tutorial_send_request]

/**
 * Draws a polygon around the faces, then saves to outputFile.
 */
// [START vision_face_detection_tutorial_process_response]
async function highlightFaces(inputFile, faces, outputFile, PImage) {
  // Open the original image
  const stream = fs.createReadStream(inputFile);
  let promise;
  if (inputFile.toLowerCase().match(/\.jpg$/)) {
    promise = PImage.decodeJPEGFromStream(stream);
  } else if (inputFile.toLowerCase().match(/\.png$/)) {
    promise = PImage.decodePNGFromStream(stream);
  } else {
    throw new Error(`Unknown filename extension ${inputFile}`);
  }
  const img = await promise;
  const context = img.getContext('2d');
  context.drawImage(img, 0, 0, img.width, img.height, 0, 0);

  // Now draw boxes around all the faces
  context.strokeStyle = 'rgba(0,255,0,0.8)';
  context.lineWidth = '5';

  var expression = ""
  faces.forEach(face => {
    context.beginPath();
    let origX = 0;
    let origY = 0;
    face.boundingPoly.vertices.forEach((bounds, i) => {
      if (i === 0) {
        origX = bounds.x;
        origY = bounds.y;
        context.moveTo(bounds.x, bounds.y);
      } else {
        context.lineTo(bounds.x, bounds.y);
      }
    });
    context.lineTo(origX, origY);
    context.stroke();
    if(face.joyLikelihood == 'VERY_LIKELY' || face.joyLikelihood == 'LIKELY' || face.joyLikelihood == 'POSSIBLE') {
        expression+="Joy "
    } else if(face.angerLikelihood == 'VERY_LIKELY' || face.angerLikelihood == 'LIKELY' || face.angerLikelihood == 'POSSIBLE') {
      expression+="Angry "
    } else if(face.sorrowLikelihood == 'VERY_LIKELY' || face.sorrowLikelihood == 'LIKELY' || face.sorrowLikelihood == 'POSSIBLE') {
      expression+="Sad "
    } else if(face.surpriseLikelihood == 'VERY_LIKELY' || face.surpriseLikelihood == 'LIKELY' || face.surpriseLikelihood == 'POSSIBLE') {
      expression+="Surprised "
    }
  });
  console.log(`Emotions are: ${expression}`)
  // Write the result to a file
  console.log(`Writing to file ${outputFile}`);
  const writeStream = fs.createWriteStream(outputFile);
  await PImage.encodePNGToStream(img, writeStream);
}
// [END vision_face_detection_tutorial_process_response]

// Run the example
// [START vision_face_detection_tutorial_run_application]
async function main(inputFile) {
  const PImage = require('pureimage');
  const outputFile = 'out.png';
  const faces = await detectFaces(inputFile);
  console.log('Highlighting...');
  await highlightFaces(inputFile, faces, outputFile, PImage);
  console.log('Finished!');
}
// [END vision_face_detection_tutorial_run_application]

const args = process.argv.slice(2);
main(...args).catch(console.error);
