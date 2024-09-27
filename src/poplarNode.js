import { makeDataObject } from "./dataTools.js";
import { makePipelineObject, addPort, addConnection, addBox } from "./pipelineTools.js";
import {getCID, sortObjectKeys} from './cidtools.js';
import {graphFromPipeline} from './graphTools.js';
import { getComponent } from './utilities.js';

export class PoplarNode {
    constructor({ storeDataGetCID = async () => {}, 
    getDataFromCID = async () => {},
    defaultAuthor = {id: null, method: null},
    defaultLicense = ""
    } = {}) {
        this.storeDataGetCID = storeDataGetCID;
        this.getDataFromCID = getDataFromCID;
        this.defaultAuthor = defaultAuthor;
        this.defaultLicense = defaultLicense;
    }

    async pipelineToPipelinePlusCID (pipeline, store) {

        const toReturnString = JSON.stringify(sortObjectKeys(pipeline));
        let toReturn = {pipeline};

        // Store the pipeline if store is true
        if (store){
            console.log('Storing the pipeline');
            try{
                toReturn.cid = await this.storeDataGetCID(toReturnString, 'application/json');
                console.log(`For storing pipeline ${pipeline.name}, got CID ${toReturn.cid}`);
                return toReturn;
            } catch (error) {
                console.error("Error storing data object:", error);
                throw error;
            }
        } else {
            toReturn.cid = await getCID(toReturnString);
            return toReturn;
        }
      
      }

    // Returns node version
    protocol_version(){
        return {major: 2, minor: 0, patch: 0, branch: 'main', previous: []};
    }

    // Returns array of supported versions
    supportedVersions(){
        return [
            {major: 2, minor: 0, patch: 0, branch: 'main', previous: []}
        ];
    }

    // Makes a data object, defaulting to values from this node
    makeDataObject ( {dataInfo, baseObject, increment, previous, store = true } ) {

        // Send values from this node
        const nodeValues = {
            storeDataGetCID: this.storeDataGetCID,
            getDataFromCID: this.getDataFromCID,
            defaultAuthor: this.defaultAuthor,
            defaultLicense: this.defaultLicense
        }
        try {
            // Make the data object
            const toReturn = makeDataObject({ dataInfo, baseObject, increment, previous, store }, nodeValues);
            return toReturn;
        } catch (error) {
            console.error("Error creating data object:", error);
            throw error;
        }
    }

    // Makes a pipeline object, defaulting to values from this node
    async makePipelineObject ( {pipelineInfo, baseObject, increment, previous, store = true } ) {

        // Send values from this node
        const nodeValues = {
            storeDataGetCID: this.storeDataGetCID,
            getDataFromCID: this.getDataFromCID,
            defaultAuthor: this.defaultAuthor,
            defaultLicense: this.defaultLicense
        }
        try {
            // Make the data object
            const toReturn = await makePipelineObject({ pipelineInfo, baseObject, increment, previous }, nodeValues);
            return await this.pipelineToPipelinePlusCID(toReturn, store);
        } catch (error) {
            console.error("Error creating pipeline object:", error);
            throw error;
        }
    }

    async addPort ({ pipeline, path, id_suffix, name, type, store = true }) {
        try { 
            const nodeParams = {getDataFromCID: this.getDataFromCID, storeDataGetCID: this.storeDataGetCID};
            const pipelineWithPort = await addPort({pipeline, path, id_suffix, name, type}, nodeParams);
            let toReturn = await this.pipelineToPipelinePlusCID(pipelineWithPort.pipeline, store);
            toReturn.path = pipelineWithPort.path;
            return toReturn;
        } catch (error) {
            console.error("Error adding port:", error);
            throw error;
        }
    }

    async addConnection ({ pipeline, from, to, name, data, store = true, 
        clearOrphanedInputsAndOutputs = false, existingConnection }) {
        try { 
            const toReturn = await addConnection({ pipeline, from, to, name, data, store, 
                clearOrphanedInputsAndOutputs, existingConnection }, 
                {getDataFromCID: this.getDataFromCID});
            const pipelineWithCID = await this.pipelineToPipelinePlusCID(toReturn, store);
            return pipelineWithCID;
        } catch (error) {
            console.error("Error adding connection:", error);
            throw error;
        }
    }

    async addBox ({ pipeline, functionToAdd, CIDtoAdd, store = true }) {
        try { 
            const toReturn = await addBox({ pipeline, functionToAdd, CIDtoAdd });
            return await this.pipelineToPipelinePlusCID(toReturn, store);
        } catch (error) {
            console.error("Error adding function:", error);
            throw error;
        }
    }

    async graphFromPipeline (pipeline, depth) {
        try {
            return graphFromPipeline(pipeline, depth, this.getDataFromCID);
        } catch (error) {
            console.error("Error creating graph from pipeline:", error);
            throw error;
        }
    }

    async getComponent({ pipeline, path, returnCID=false }) {
        try {
            return getComponent({pipeline, path, returnCID, getDataFromCID:this.getDataFromCID});
        } catch (error) {
            console.error("Error finding the component", error);
            throw error;
        }
    }
    

  }
  