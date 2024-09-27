import { replaceFields, generateID, getComponent } from './utilities.js';
import {updateVersion} from './versions.js';
import {getCID, sortObjectKeys} from './cidtools.js';

// Makes a pipeline object and returns it
// Arguments
    // pipelineInfo must have the same structure as a pipelineObject but can have missing fields
    // baseObject argument is assumed to be the previous version of the pipelineObject, and contains default values for fields
    // increment is major / minor / patch
    // previous is an array of CIDs of previous versions of the dataObject
    // store is a bool that indicates whether the dataObject should be stored in the node collection
async function makePipelineObject ( {pipelineInfo, baseObject, increment, branch, previous }, nodeParams = {}) {

    // Get passed values or defaults
    const { defaultAuthor = { id: null, method: null }, 
        defaultLicense = "" } = nodeParams;
    if (!branch) { branch = "main" };
    if(!increment) { increment = 'major' };
    if(!previous) { previous = [] };

    // Make a default object with the same structure as a dataObject
    const defaultPipelineObject = {
        name: "New Pipeline",
        description: "",
        id: "",
        inputs: [],
        outputs: [],
        boxes: [],
        connections: [],
        script: "",
        version: {
            major: 0,
            minor: 0,
            patch: 0,
            branch: "main",
            previous: []
        },
        time_created: Date.now(),
        preview: "",
        preview_size: 0,
        preview_type: "application/octet-stream",
        author: defaultAuthor,
        license: defaultLicense,
        msg_type:  "pipeline",
        protocol: "poplar",
        protocol_version: {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}
    }

    // Overrride values using the base object
    const defaultPlusBase = replaceFields(defaultPipelineObject, baseObject);

    // Overrride values using the dataInfo
    const defaultPlusBasePlusDataInfo = replaceFields(defaultPlusBase, pipelineInfo);

    // In determining the version, we either want to use the version from dataInfo directly, update
    // the base version, or default to version 1.0.0
    // Branch and previous come from the arguments, but can be overridden by dataInfo
    let finalVersionObject = {major: 1, minor: 0, patch: 0, branch: branch, previous: previous};
    if (baseObject && baseObject.version){
        finalVersionObject = updateVersion( {version: baseObject.version, increment, branch, previous } );
        };
    if (pipelineInfo && pipelineInfo.version) {
        finalVersionObject = pipelineInfo.version;
        if (!pipelineInfo.version.major) { finalVersionObject.major = 1 };
    };

    // Verify that specific fields have the correct values
    const verifiedFields = {
        version : finalVersionObject,
        id: generateID('pl', defaultPlusBasePlusDataInfo.name, []),
        time_created: Date.now(),
        msg_type:  "pipeline",
        protocol: "poplar",
        protocol_version: {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}
    }   
    let toReturn = replaceFields(defaultPlusBasePlusDataInfo, verifiedFields);

    // If previous is present, need to overwrite not add to previous
    if (previous && previous.length > 0) {
        toReturn.version.previous = previous;
    }

    return toReturn;

}

// Adds a port to a pipeline at the given path
// Runs recursively if the path is within a box
async function addPort ({ pipeline, path, id_suffix, name, type, store }, nodeParams = {}) {

    console.log(`Adding port at path ${path}`)
    console.log(`In pipeline ${JSON.stringify(pipeline)}`)

    // Set up variables for adding the port
    const splitPath = path.split('.');
    const pipelineDeepCopy = JSON.parse(JSON.stringify(pipeline));
    let toReturn = {};
    let newPortID = "";
    let newPortPath = "";
    if (!id_suffix) { id_suffix = '' };

    // If the path is not in this pipeline, return
    if ( splitPath[0] !== pipeline.id ) {
        throw new Error('Path does not start with pipeline ID');
    }

    // If the path is to the inputs for this pipeline
    if (splitPath.length === 2 && splitPath[1] === 'inputs') {
        const domain = pipeline.inputs.reduce ((acc, elem) => [...acc, elem.id], []);
        newPortID = generateID('pt', name, domain) + id_suffix;
        toReturn = replaceFields(pipelineDeepCopy, {inputs: [...pipelineDeepCopy.inputs, {id:newPortID, name, type}]});
        newPortPath = pipeline.id + ".inputs." + newPortID;
    }

    // If the path is to the outputs for this pipeline
    if (splitPath.length === 2 && splitPath[1] === 'outputs') {
        const domain = pipeline.outputs.reduce ((acc, elem) => [...acc, elem.id], []);
        newPortID = generateID('pt', name, domain) + id_suffix;
        toReturn = replaceFields(pipelineDeepCopy, {outputs: [...pipelineDeepCopy.outputs, {id:newPortID, name, type}]});
        newPortPath = pipeline.id + ".outputs." + newPortID;
    }

    // If the path is to a sub-pipeline, then run recursively
        // to add the port inside the box. Afterwards, replace
        // the box in the top pipeline with the new result.
    if (splitPath.length > 2 && splitPath[1] === 'boxes') {

        // Run recursively to get the new box and path
        const subPipelineReturn = await getComponent({pipeline: pipelineDeepCopy, 
            path: splitPath.slice(0, 3).join('.'),
            getDataFromCID: nodeParams.getDataFromCID, returnCID: true});
        const subPipeline = subPipelineReturn.data;
        const recursiveResult = await addPort({ 
            pipeline: subPipeline, 
            path: splitPath.slice(2).join('.'), 
            id_suffix, name, type, store:true }, nodeParams);
        console.log(recursiveResult);
        newPortPath = splitPath[0]+'.'+splitPath[1]+'.'+recursiveResult.path;

        // Replace the original box with the new one, and store it
        // It is necessary to store this otherwise the data strucuture will be irrecoverable
        let newBoxCID = await nodeParams.storeDataGetCID(JSON.stringify(sortObjectKeys(recursiveResult.pipeline)));
            
        toReturn = replaceFields(pipelineDeepCopy, {
            boxes: [...pipelineDeepCopy.boxes.filter(elem => elem !== subPipelineReturn.cid), newBoxCID]
        });

    }

    // Get the CID and return it
    let toReturnPackage = {pipeline: toReturn}
    console.log('Returning from addPort:')
    console.log(toReturnPackage)
    toReturnPackage.path = newPortPath;
    return toReturnPackage;

}

// Adds a new connection, or overwrites an existing one
async function addConnection ({ pipeline, from, to, name, data, 
    clearOrphanedInputsAndOutputs, existingConnection }, nodeParams = {}) {

    console.log(`Adding connection from: ${from}`)
    // Set up variables for adding the connection
    if (existingConnection){
        if (!from && existingConnection.from) {from = existingConnection.from};
        if (!to && existingConnection.to) {to = existingConnection.to};
        if (!name && existingConnection.name) {name = existingConnection.name};
        if (!name) {name = ''};
        if (!data && existingConnection.data) {data = existingConnection.data};
    }
    console.log(`Adding connection from: ${from}`)

    // Set up variables for the new connection
    const newConnectionArg = {from, to, name, data,
        id : (existingConnection?.id ?? generateID('cn', name, pipeline.connections)),
        msg_type : 'connection',
        protocol : "poplar",
        protocol_version : {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}};

    console.log('new connection arg:')
    console.log(newConnectionArg)

    const fromSplit = newConnectionArg.from.split('.');
    const toSplit = newConnectionArg.to.split('.');
    let toReturn = JSON.parse(JSON.stringify(pipeline));
    const getDataFromCID = nodeParams.getDataFromCID || null;

    // Check that both ports are in the pipeline
    const fromPortReturn = await getComponent({ pipeline, path: newConnectionArg.from, getDataFromCID });
    const fromPort = fromPortReturn.data;
    const toPortReturn = await getComponent({ pipeline, path: newConnectionArg.to, getDataFromCID });
    const toPort = toPortReturn.data;
    if (!fromPort) { throw new Error('From port not found'); }
    if (!toPort) { throw new Error('To port not found'); } 

    // If both from and to are in the base pipeline
    // if (fromSplit.length === 3 && toSplit.length === 3) {

        // Track connections we are deleting
        let deletedConnections = toReturn.connections.filter(elem => elem.id === newConnectionArg.id);

        // If there is an existing connection provided, we are replacing it because
        // the old and new connections can't have the same id
        toReturn.connections = toReturn.connections.filter(elem => elem.id !== newConnectionArg.id);

        // We've checked for the existence of from and to ports, checked that the
        // ports are in the base pipeline or global inputs/outputs for a box,
        // and removed old connections. Now add the new one
        toReturn.connections.push(newConnectionArg);

        // If clearOrphanedInputsAndOutputs then check deleted connections for orphaned ports
        console.log('deleted connections:')
        console.log(deletedConnections)
        if (clearOrphanedInputsAndOutputs) {
            deletedConnections.forEach( elem => {
                const nodesWithDeletedConnections = [elem.from, elem.to];
                console.log('nodes with deleted connections:')
                console.log(nodesWithDeletedConnections)
                nodesWithDeletedConnections.forEach ( nodePath => {
                    const nodePathSplit = nodePath.split('.');
                    const nodePathId = nodePathSplit[nodePathSplit.length-1]
                    const isOrphan = getNodeConnectivity({pipeline: toReturn, nodeID: nodePathId}).isOrphan;
                    if (isOrphan && nodePathSplit[1] === 'inputs' ){
                        console.log(`deleting input ${nodePathId}`)
                        toReturn.inputs = toReturn.inputs.filter(node => node.id !== nodePathId);
                    }
                    if (isOrphan && nodePathSplit[1] === 'outputs' ){
                        console.log(`deleting output ${nodePathId}`)
                        toReturn.outputs = toReturn.outputs.filter(node => node.id !== nodePathId);
                    }
                })
            });
        }
    
    // Return the pipeline with the new connection
    return toReturn;

}

// Checks whether a node has any connections going to or from it in the top-level pipeline
function getNodeConnectivity ({pipeline, nodeID}){
    let connectionsTo = [];
    let connectionsFrom = [];
    let isOrphan = false;

    connectionsTo = pipeline.connections.filter(connection =>  {
        const connectionToSplit = connection.to.split('.');
        return connectionToSplit.pop() === nodeID});
    connectionsFrom = pipeline.connections.filter(connection =>  {
        const connectionFromSplit = connection.from.split('.');
        return connectionFromSplit.pop() === nodeID});
    if (connectionsTo.length == 0 && connectionsFrom == 0) { isOrphan = true };  
    
    return {nodeID, connectionsTo, connectionsFrom, isOrphan};
  };

async function addBox ({ pipeline, functionToAdd, CIDtoAdd }) {

    // Set up variables for adding the port
    if (!pipeline || !pipeline.id || !pipeline.boxes || !functionToAdd || !functionToAdd.id || !CIDtoAdd ) {
        throw new Error('Invalid input');
    }
    let toReturn = JSON.parse(JSON.stringify(pipeline));
    
    // Check whether the box id conflicts with other boxes currently in pipeline
    if ( toReturn.boxes.map(box => box.id).includes(functionToAdd.id) ) {
        throw new Error('Box id already exists in pipeline');
    }

    // Add the box to the pipeline, and return
    toReturn.boxes.push(CIDtoAdd);
    return toReturn;
}

export { makePipelineObject, addPort, addConnection, addBox, getNodeConnectivity };