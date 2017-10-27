module.exports = function(Plugin, paths) {
    const config = {
        id: "light-design",
        name: "Светлая тема",
        version: "1.0.0",
        author: "VLADOS776"
    }
    
    const fs = require('fs'),
          path = require('path'),
          stylesPath = path.join(paths.dir, 'style', 'main.css');
    
    Plugin.newPlugin(config, {
        init: function() {
            jQuery('head').append(`<link rel="stylesheet" href="${stylesPath}">`);
        }
    })
}