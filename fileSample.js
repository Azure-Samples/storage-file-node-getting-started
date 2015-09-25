//----------------------------------------------------------------------------------
// Microsoft Developer & Platform Evangelism
//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, 
// EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES 
// OF MERCHANTABILITY AND/OR FITNESS FOR A PARTICULAR PURPOSE.
//----------------------------------------------------------------------------------
// The example companies, organizations, products, domain names,
// e-mail addresses, logos, people, places, and events depicted
// herein are fictitious.  No association with any real company,
// organization, product, domain name, email address, logo, person,
// places, or events is intended or should be inferred.
//----------------------------------------------------------------------------------

/**
* Azure Storage File Sample - Demonstrate how to use the File Storage service.
* File storage stores unstructured data such as text, binary data, documents or media files.
* Files can be accessed from anywhere in the world via HTTP or HTTPS.
*
* Documentation References: 
* - What is a Storage Account - http://azure.microsoft.com/en-us/documentation/articles/storage-whatis-account/
* - Getting Started with File - https://azure.microsoft.com/en-us/documentation/articles/storage-dotnet-how-to-use-files/
* - File Service Concepts - http://msdn.microsoft.com/en-us/library/dd179376.aspx 
* - File Service REST API - https://msdn.microsoft.com/en-us/library/dn167006.aspx
* - File Service Node API - http://azure.github.io/azure-storage-node/FileService.html
* - Delegating Access with Shared Access Signatures - http://azure.microsoft.com/en-us/documentation/articles/storage-dotnet-shared-access-signature-part-1/
*/

var fs = require('fs');
var util = require('util');
var guid = require('node-uuid');
var crypto = require('crypto');
var storage = require('azure-storage');

runFileSamples();

function runFileSamples() {
  /**
   * Instructions: This sample can be run using either the Azure Storage Emulator that installs as part of this SDK - or by  
   * updating the app.Config file with your connection string.
   * 
   * To run the sample using the Storage Service
   *      Open the app.config file and comment out the connection string for the emulator ("ueDevelopmentStorage":true) and
   *      set the connection string for the storage service.
   */   
  console.log('\nAzure Storage File Sample\n');
  
  var current = 0;
  var scenarios = [
    {
      scenario: basicStorageFileOperations,
      message: 'Basic File Sample Completed\n'
    }];
  
  var callback = function (error) {
    if (error) {
      throw error;
    } else {
      console.log(scenarios[current].message); 
      
      current++;
      if (current < scenarios.length) {
        scenarios[current].scenario(callback);
      }
    }
  };
   
  scenarios[current].scenario(callback);
}

/**
* File basics.
* @ignore
* 
* @param {errorOrResult}        callback                         The callback function.
*/
function basicStorageFileOperations(callback) {
  // Create a file client for interacting with the file service from connection string
  // How to create a storage connection string - http://msdn.microsoft.com/en-us/library/azure/ee758697.aspx
  var fileService = storage.createFileService(readConfig().connectionString);

  var imageToUpload = "HelloWorld.png";
  var shareName = "demofileshare-" + guid.v1();
  var directoryName = "demofiledirectory";
  var fileName = "demobfile-" + imageToUpload;
  
  console.log('Basic File Sample');
  
  // Create a share for organizing files within the storage account.
  console.log('1. Creating file share');
  fileService.createShareIfNotExists(shareName, function (error) {
    if (error) {
      callback(error);
    } else {      
      // Create a directory under the root directory
      console.log('2. Creating a directory under the root directory');
      fileService.createDirectoryIfNotExists(shareName, directoryName, function (error) {
        if (error) {
          callback(error);
        } else {
          // Create a directory under the just created directory
          var nextDirectoryName = directoryName + '/' + directoryName + '01';         
          fileService.createDirectoryIfNotExists(shareName, nextDirectoryName, function (error) {
            if (error) {
              callback(error);
            } else {
              // Uploading a local file to the directory created above
              console.log('3. Uploading a file to directory');
              fileService.createFileFromLocalFile(shareName, directoryName, fileName, imageToUpload, function (error) {
                if (error) {
                  callback(error);
                } else {
                  // List all files/directories under the root directory
                  console.log('4. List files/directories in root directory');
                  listFilesAndDirectories(fileService, shareName, directoryName, null, null, function (error, results) {
                    if (error) {
                      callback(error);
                    } else {
                      for (var i = 0; i < results.files.length; i++) {
                        console.log(util.format('   - %s (type: file)'), results.files[i].name);
                      }
                      for (var j = 0; j < results.directories.length; j++) {
                        console.log(util.format('   - %s (type: directory)'), results.directories[j].name);
                      }
                      
                      // Download the uploaded file to your file system
                      console.log('5. Download the uploaded file to your file system');
                      var downloadedImageName = util.format('CopyOf%s', imageToUpload);
                      fileService.getFileToLocalFile(shareName, directoryName, fileName, downloadedImageName, function (error) {
                        if (error) {
                          callback(error);
                        } else {
                          // Clean up after the demo
                          console.log('6. Delete file');
                          fileService.deleteFileIfExists(shareName, directoryName, fileName, function (error) {
                            try { fs.unlinkSync(downloadedImageName); } catch (e) { }
                            if (error) {
                              callback(error);
                            } else {
                              console.log('7. Delete file share');
                              fileService.deleteShareIfExists(shareName, function (error) {
                                callback(error);
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
}

/**
* Lists file in the share.
* @ignore
*
* @param {FileService}        fileService                         The file service client.
* @param {string}             share                               The share name.
* @param {object}             token                               A continuation token returned by a previous listing operation. 
*                                                                 Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                           The request options.
* @param {int}                [options.maxResults]                Specifies the maximum number of directories to return per call to Azure ServiceClient. 
*                                                                 This does NOT affect list size returned by this function. (maximum: 5000)
* @param {LocationMode}       [options.locationMode]              Specifies the location mode used to decide which location the request should be sent to. 
*                                                                 Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]       The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]  The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                 The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                 execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]           A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]         Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                 The default value is false.
* @param {errorOrResult}      callback                            `error` will contain information
*                                                                 if an error occurs; otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                 `entries`  gives a list of directories and the `continuationToken` is used for the next listing operation.
*                                                                 `response` will contain information related to this operation.
*/
function listFilesAndDirectories(fileService, share, directory, token, options, callback) {
  var items = { files: [], directories: []};
  
  fileService.listFilesAndDirectoriesSegmented(share, directory, token, options, function(error, result) {
    items.files.push.apply(items.files, result.entries.files);
    items.directories.push.apply(items.directories, result.entries.directories);

    var token = result.continuationToken;
    if (token) {
      console.log('   Received a page of results. There are ' + result.entries.length + ' items on this page.');
      listFilesAndDirectories(fileService, share, directory, token, options, callback);
    } else {
      console.log('   Completed listing. There are ' + items.files.length + ' files and ' + items.directories.length + ' directories.' );
      callback(null, items);
    }
  });
}

/**
* Reads the configurations.
* @ignore
*
* @return {Object}
*/
function readConfig() {
  return JSON.parse(fs.readFileSync('app.config', 'utf8'));
}
