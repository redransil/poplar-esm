import { replaceFields } from './utilities.js';
import {updateVersion} from './versions.js';
import {getCID, sortObjectKeys} from './cidtools.js';

// Makes a data object and returns it
// Arguments
    // dataInfo must have the same structure as a dataObject but can have missing fields
    // baseObject argument is assumed to be the previous version of the dataObject, and contains default values for fields
    // increment is major / minor / patch
    // previous is an array of CIDs of previous versions of the dataObject
    // store is a bool that indicates whether the dataObject should be stored in the node collection
async function makeDataObject ( {dataInfo, baseObject, increment, branch, previous, store }, nodeParams = {}) {

    // Get passed values or defaults
    const { defaultAuthor = { id: null, method: null }, 
        defaultLicense = "" } = nodeParams;
    if (!branch) { branch = "main" };
    if(!increment) { increment = 'major' };
    if(!previous) { previous = [] };

    // Make a default object with the same structure as a dataObject
    const defaultDataObject = {
        name: "New Dataset",
        description: "",
        dataset_cid: "",
        metadata: {},
        version: {
            major: 0,
            minor: 0,
            patch: 0,
            branch: "main",
            previous: []
        },
        time_created: Date.now(),
        file_size: 0,
        type: "application/octet-stream",
        preview: "",
        preview_size: 0,
        preview_type: "application/octet-stream",
        author: defaultAuthor,
        license: defaultLicense,
        msg_type:  "data",
        protocol: "poplar",
        protocol_version: {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}
    }

    // Overrride values using the base object
    const defaultPlusBase = replaceFields(defaultDataObject, baseObject);

    // Overrride values using the dataInfo
    const defaultPlusBasePlusDataInfo = replaceFields(defaultPlusBase, dataInfo);

    // In determining the version, we either want to use the version from dataInfo directly, update
    // the base version, or default to version 1.0.0
    // Branch and previous come from the arguments, but can be overridden by dataInfo
    let finalVersionObject = {major: 1, minor: 0, patch: 0, branch: branch, previous: previous};
    if (baseObject && baseObject.version){
        finalVersionObject = updateVersion( {version: baseObject.version, increment, branch, previous } );
        };
    if (dataInfo && dataInfo.version) {
        finalVersionObject = dataInfo.version;
        if (!dataInfo.version.major) { finalVersionObject.major = 1 };
    };

    // Verify that specific fields have the correct values
    const verifiedFields = {
        version : finalVersionObject,
        time_created: Date.now(),
        msg_type:  "data",
        protocol: "poplar",
        protocol_version: {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}
    }   
    let toReturn = replaceFields(defaultPlusBasePlusDataInfo, verifiedFields);

    // If previous is present, need to overwrite not add to previous
    if (previous && previous.length > 0) {
        toReturn.version.previous = previous;
    }

     // Sort keys and make a CID
     const toReturnString = JSON.stringify(sortObjectKeys(toReturn));
     let finalCID = await getCID(toReturnString);

    // Store the dataObject if store is true
    if (store){
        console.log('Storing the data object');
        try{
            finalCID = await nodeParams.storeDataGetCID(toReturnString, 'application/json');
            console.log(`For storing data object ${toReturn.name}, got CID ${finalCID}`);
        } catch (error) {
            console.error("Error storing data object:", error);
            throw error;
        }
    }
 
    return {data: toReturn, cid: finalCID };

}

export { makeDataObject };