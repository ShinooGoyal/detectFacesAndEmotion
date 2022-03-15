'use strict';

const gm = require('gm').subClass({imageMagick: true});
const path = require('path');
const fs = require('fs');
const PImage = require('pureimage');
async function detectFacesGCS(bucketName, fileName) {
  // [START vision_face_detection_gcs]
  // Imports the Google Cloud client libraries
  const vision = require('@google-cloud/vision');

  // Creates a client
  const client = new vision.ImageAnnotatorClient();

  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // const bucketName = 'Bucket where the file resides, e.g. my-bucket';
  // const fileName = 'Path to file within bucket, e.g. path/to/image.png';

  // Performs face detection on the gcs file
  const [result] = await client.faceDetection(`gs://${bucketName}/${fileName}`);
  const faces = result.faceAnnotations;

  const {Storage} = require('@google-cloud/storage');
  const storage = new Storage();
  const file = storage.bucket(bucketName).file(fileName);

  const tempLocalPath = `out.png`;

  // Download file from bucket.
  try {
    await file.download({destination: tempLocalPath});

    console.log(`Downloaded ${fileName} to ${tempLocalPath}.`);
  } catch (err) {
    console.log(`File download failed: ${err}`);
  }

  // Open the original image
  const stream = fs.createReadStream(tempLocalPath);
  let promise;
  if (tempLocalPath.toLowerCase().match(/\.jpg$/)) {
    promise = PImage.decodeJPEGFromStream(stream);
  } else if (tempLocalPath.toLowerCase().match(/\.png$/)) {
    promise = PImage.decodePNGFromStream(stream);
  } else {
    throw new Error(`Unknown filename extension ${tempLocalPath}`);
  }
  const img = await promise;
  const context = img.getContext('2d');
  context.drawImage(img, 0, 0, img.width, img.height, 0, 0);
  // Now draw boxes around all the faces
  context.strokeStyle = 'rgba(0,255,0,0.8)';
  context.lineWidth = '5';

  faces.forEach((face, i) => {
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

    if(face.joyLikelihood == 'VERY_LIKELY' || face.joyLikelihood == 'LIKELY') {
      expression+="Joy "
    } else if(face.angerLikelihood == 'VERY_LIKELY' || face.angerLikelihood == 'LIKELY') {
      expression+="Angry "
    } else if(face.sorrowLikelihood == 'VERY_LIKELY' || face.sorrowLikelihood == 'LIKELY') {
      expression+="Sad "
    } else if(face.surpriseLikelihood == 'VERY_LIKELY' || face.surpriseLikelihood == 'LIKELY') {
      expression+="Surprised "
    }
  });

  console.log(`Emotions are: ${expression}`)
  // Write the result to a file
  console.log(`Writing to file ${tempLocalPath}`);
  const writeStream = fs.createWriteStream(tempLocalPath);
  await PImage.encodePNGToStream(img, writeStream);
}

const args = process.argv.slice(2);
detectFacesGCS(...args).catch(console.error);
