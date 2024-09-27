

// Replaces fields in a previous version with new information, iff newInfo has the same fields
// Is recursive and requires the inputs to have corresponding structure
function replaceFields(previousVersion, newInfo) {
    // Create a deep copy of previousVersion
    let newVersion = JSON.parse(JSON.stringify(previousVersion));
  
    // Recursive function to update the fields
    function recursiveReplace(prevObj, newObj) {
      for (const key in newObj) {
        if (newObj.hasOwnProperty(key)) {
          // If the value is an object and the key exists in both objects, recurse
          if (typeof newObj[key] === 'object' && newObj[key] !== null && prevObj.hasOwnProperty(key)) {
            recursiveReplace(prevObj[key], newObj[key]);
          } else {
            // Otherwise, replace the value
            prevObj[key] = newObj[key];
          }
        }
      }
    }
  
    // Perform the replacement
    recursiveReplace(newVersion, newInfo);
  
    return newVersion;
  }

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

function processString(input) {
    // Remove special characters, numbers, spaces, and vowels, then convert to lower case
    const cleanedString = input.replace(/[^a-zA-Z]/g, '') // Remove non-letter characters
                                .toLowerCase()            // Convert to lower case
                                .replace(/[aeiou]/g, ''); // Remove vowels

    // Return the first 5 characters
    return cleanedString.substring(0, 5);
  };

function generateID(prefix, name, domain) {

    // If domain is an array of strings, do nothing. Otherwise build the domain
    if (Array.isArray(domain)) {
        if (domain.every(item => typeof item === 'string')) {
            // domain is already an array of strings
        } else if (domain.every(item => typeof item === 'object' && item !== null && 'id' in item)) {
            // domain is an array of objects with 'id' keys
            domain = domain.map(item => item.id);
        } else {
            // domain is neither an array of strings nor an array of objects with 'id' keys
            throw new Error('Invalid domain format');
        }
    } else {
        throw new Error('Domain is not an array');
    }
  

    // Use the helper function to sanitize the name
    const sanitizedString = processString(name);

    // Shorten the sanitized string to a maximum of 8 characters
    const shortenedSanitizedString = sanitizedString.substring(0, 8);

    let newID;

    do {
        // Generate a random string of 8 characters
        const randomString = generateRandomString(8);

        // Construct the new ID using the specified formula
        newID = '#' + prefix + '_' + shortenedSanitizedString + '_' + randomString;
    } while (domain.includes(newID)); // Continue looping if the ID already exists in the domain

    // Return the unique ID
    return newID;
  }

// Returns the component (or array) if it is retrievable, otherwise returns null
// If a getDataFromCID function is supplied, uses it to retrieve components from CIDs
async function getComponent({ pipeline, path, getDataFromCID, returnCID = false }) {
  const elems = path.split('.');

  // If returnCID is true, return the CID with the component
  let cidToReturn = '';
  
  // Check if the first element matches pipeline.id
  if (elems[0] !== pipeline.id) {
      return null;
  }

  let current = pipeline;

  // Iterate through the path elements starting from the second element
  for (let i = 1; i < elems.length; i++) {

      if ( !path ) { return null };

      const elem = elems[i];

      if (Array.isArray(current)) {
          if (Array.isArray(current)) {
            // Check if current contains objects or strings (CIDs)
            if (typeof current[0] === 'object' && current[0] !== null) {
              // Case 1: current is an array of objects, use existing logic
              current = current.find(item => item.id === elem);
              if (!current) {
                return null;
              }
            } else if (typeof current[0] === 'string') {
              // Case 2: current is an array of CIDs (strings)
              for (let cid of current) {
                try {
                  const obj = await getDataFromCID(cid);
                  if (obj.id === elem) {
                    current = obj;
                    cidToReturn = cid;
                    break;
                  }
                } catch (error) {
                  console.error(`Error fetching data for CID ${cid}:`, error);
                }
              }
              if (!current || current.id !== elem) {
                return null;
              }
            }
          }
      } else if (current && typeof current === 'object') {
          // If current is an object, check if the key exists
          if (elem in current) {
              current = current[elem];
          } else {
              return null;
          }
      } else {
          // If current is neither an object nor an array, path is invalid
          return null;
      }
  }

  return {data: current, cid: cidToReturn};
}

export { replaceFields, generateRandomString, processString, generateID, getComponent };