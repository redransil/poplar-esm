function getStyle(id) {
    let style = 'normal';
    if (id.includes('_globalInput')) {style = 'globalInput'};
    if (id.includes('_globalOutput')) {style = 'globalOutput'};
    return style;
}

async function graphFromPipeline(pipeline, depth, getDataFromCID) {
    const nodes = [];
    const links = [];
  
    // Helper function to ensure unique link index
    function getLinkIndex(fromId, toId, initLinks) {
      return initLinks.filter(link => link.source === fromId && link.target === toId).length;
    }
  
    // Helper function to get full path for nodes
    function getNodeFullPath(id, type) {
      return `${pipeline.id}.${type}.${id}`;
    }
  
    // Add node for inputs
    pipeline.inputs.forEach(input => {
      nodes.push({
        id: getNodeFullPath(input.id, 'inputs'),
        label: input.name,
        style: getStyle(input.id)
      });
    });
  
    // Add node for outputs
    pipeline.outputs.forEach(output => {
      nodes.push({
        id: getNodeFullPath(output.id, 'outputs'),
        label: output.name,
        style: getStyle(output.id)
      });
    });
  
    // Add node for boxes, using async to retrieve CID data
    for (const cid of pipeline.boxes) {
      try {
        const boxData = await getDataFromCID(cid);
        nodes.push({
          id: getNodeFullPath(boxData.id, 'boxes'),
          label: boxData.name,
          style: getStyle(boxData.id)
        });
      } catch (error) {
        console.error(`Error fetching data for CID: ${cid}`, error);
      }
    }
  
    // Add links for connections
    pipeline.connections.forEach(connection => {
      let fromId = connection.from;
      let toId = connection.to;

      // // For this version we're only graphing the top-level nodes and links; truncate deeper structure
      console.log(`fromId initial: ${fromId}`)
      const fromSplit = fromId.split('.');
      console.log(`From split: `)
      console.log(fromSplit);
      fromId = fromSplit.slice(0,3).join('.');
      console.log(`Joined: ${fromId}`)
      const toSplit = toId.split('.');
      toId = toSplit.slice(0,3).join('.');
      
      const label = connection.name || 'Connection';
  
      links.push({
        source: fromId,
        target: toId,
        label: label,
        id: `${pipeline.id}.connections.${connection.id}`,
        points: [], // Initialize the points array
        index: getLinkIndex(fromId, toId, links) // Ensure a unique index for this link
      });
    });
  
    return { nodes, links };
  }
  
  export { graphFromPipeline };