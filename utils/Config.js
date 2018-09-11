const fs= require('fs');
const path = require('path');
const config = JSON.parse(
    fs.readFileSync(path.resolve(
        './',
        'config.json'
    )));
module.exports =config;
