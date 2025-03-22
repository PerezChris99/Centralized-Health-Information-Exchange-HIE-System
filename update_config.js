/**
 * This script updates any references from frontend to public in project configuration files
 * Run with Node.js after moving the files: node update_config.js
 */

const fs = require('fs');
const path = require('path');

// Function to recursively find configuration files
function findConfigFiles(directory, fileList = []) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      findConfigFiles(filePath, fileList);
    } else if (
      file === 'package.json' || 
      file.endsWith('.config.js') || 
      file.endsWith('.json')
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update references in a file
function updateReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains references to frontend folder
    if (content.includes('frontend')) {
      // Replace frontend with public in the content
      const updatedContent = content.replace(/frontend/g, 'public');
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated references in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Main execution
const projectRoot = process.cwd();
const configFiles = findConfigFiles(projectRoot);

console.log(`Found ${configFiles.length} configuration files to check`);
configFiles.forEach(updateReferences);
console.log('Finished updating references from frontend to public');
