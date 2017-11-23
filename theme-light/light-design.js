module.exports = function(Plugin, paths) {
    const config = {
        id: "light-design",
        name: "Светлая тема",
        version: "1.1.0",
        author: "VLADOS776",
        category: ["Тема"],
        'min-version': '1.6.0'
    }
    
    const fs = require('fs'),
          path = require('path'),
          stylesPath = path.join(paths.dir, 'style', 'main.css');
    
    Plugin.newPlugin(config, {
        mount: function() {
            jQuery('head').append(`<link rel="stylesheet" href="${stylesPath}" id='light-theme'>`);
        },
        demount: function() {
            jQuery('#light-theme').remove();
        }
    })
}