import path from 'path';
import fs from 'fs';

function updateVersion({ version, increment, branch, previous } ) {

    if (!increment) { increment = 'major' };
    if (!branch) { branch = 'main' };
    if (!previous) { previous = [] };  
    if (!version) { version = {} };
    if (!version.major) { version.major = 0 };
    if (!version.minor) { version.minor = 0 };
    if (!version.patch) { version.patch = 0 };

    // Check and update the version based on the increment
    switch (increment) {
      case 'major':
        version.major += 1;
        version.minor = 0;
        version.patch = 0;
        break;
      case 'minor':
        version.minor += 1;
        version.patch = 0;
        break;
      case 'patch':
        version.patch += 1;
        break;
      default:
        throw new Error('Invalid increment. Must be "major", "minor", or "patch".');
    }
  
    // Update the branch if branch is provided
    if (branch !== null) {
      version.branch = branch;
    }
  
    // Set previous versions
    version.previous = previous;
  
    return version;
  }

  function sameVersion(version1, version2) {
    // Check if both inputs are objects
    if (typeof version1 !== 'object' || version1 === null || typeof version2 !== 'object' || version2 === null) {
      throw new Error('Both inputs must be objects');
    }
  
    // Compare major, minor, patch, and branch
    return version1.major === version2.major &&
           version1.minor === version2.minor &&
           version1.patch === version2.patch &&
           version1.branch === version2.branch;
  }

export { updateVersion, sameVersion };