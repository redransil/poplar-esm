// pipelineTests.mjs

import assert from 'assert';
import { PoplarNode } from '../index.js'; // Adjust the import path if necessary

describe('Poplar Node Pipeline Tests', function() {

  let pn;
  let poplarVersion;
  let dataObject;
  let newDataObject;

  // Initialize the Poplar Node before running tests
  before(async function() {
      // Create a Poplar Node instance
      pn = new PoplarNode();

      // Ensure that pn is defined
      assert.ok(pn, 'Poplar Node (pn) is not defined');

      // Get the version
      poplarVersion = pn.protocol_version();

      // Make a data object
      const dataInfo = {
        name: "My Data",
        description: "This is my data",
        version:{previous : ['datainfoprev']} 
        };
      const dataObjectResult = await pn.makeDataObject({ dataInfo });
      dataObject = dataObjectResult.data;

      const prevVersion = {
        name: "Previous Data",
        description: "This was my data",
        dataset_cid: "bahw...",
        metadata: {key: "value0"},
        version:{previous : ['prevVersionPrev']} 
        };
      const newDataObjectResult = await pn.makeDataObject({ dataInfo, baseObject: prevVersion, 
        previous: ['Direct prev', 'other direct prev'] });
      newDataObject = newDataObjectResult.data;
      console.log(newDataObject);
  });

  it('should create a Poplar Node instance', function() {
    assert.ok(pn, 'Poplar Node (pn) is not defined');
  });

  it('should have the correct poplarVersion object regardless of key order', function() {
    const expectedVersion = {major: 2, minor: 0, patch: 0, branch: 'main', previous: []};
    assert.deepStrictEqual( poplarVersion, expectedVersion, 
      'poplarVersion does not match the expected version');
  });

  it('data object should be defined', function() {
    assert.ok(dataObject, 'Data Object not created');
  });

  it('data object should be version 1', function() {
    const expectedVersion = {major: 1, minor: 0, patch: 0, branch: 'main', previous: ['datainfoprev']};
    assert.deepStrictEqual( dataObject.version, expectedVersion, 
      'data object does not match the expected version');
  });

  it('data object should be version 1', function() {
    const expectedVersion = {major: 1, minor: 0, patch: 0, branch: 'main', previous: ['datainfoprev']};
    assert.deepStrictEqual( dataObject.version, expectedVersion, 
      'data object does not match the expected version');
  });

  it('base data object should be default', function() {
    assert.strictEqual( newDataObject.dataset_cid, "bahw...", 
      'base object not serving as default');
  });

  it('direct previous should add to other info', function() {
    const expectedVersion = {major: 1, minor: 0, patch: 0, branch: 'main', previous: ['Direct prev', 'other direct prev']};
    assert.deepStrictEqual( newDataObject.version, expectedVersion, 
      'data object does not match the expected version');
  });

});
